#requires -Version 5.1
<#!
post_merge_routine.ps1

Purpose
- Git parity preflight (origin/main by default)
- Build-first gate (npm ci -> npm run build)
- Vercel production parity gate via /api/version
- Optional dev server start
#>

param(
  [switch]$SkipPull,
  [switch]$SkipClean,
  [switch]$SkipKillPorts,
  [switch]$SkipNpmCi,
  [switch]$SkipLint,
  [switch]$SkipBuild,
  [switch]$SkipDev,
  [switch]$ProdSmoke,
  [Alias('ParityGate')]
  [switch]$RequireVercelSameCommit,
  [switch]$SkipVercelParity,
  [switch]$SkipPush,
  [switch]$AllowPreviewHost,

  [Alias('VercelHost')]
  [string]$VercelProdUrlOrHost,
  [ValidateSet('production','preview','any')]
  [string]$VercelEnv = 'production',
  [int]$VercelMaxWaitSec = 0,
  [int]$VercelPollIntervalSec = 10,
  [int]$VercelParityRetries = 60,
  [ValidateSet('enforce','warn','off')]
  [string]$VercelParityMode = 'enforce',

  [int]$DevPort = 3000,
  [int[]]$KillPorts = @(3000,3001,3002),

  [string[]]$Expect = @(),
  [ValidateSet('code','all')]
  [string]$ExpectScope = 'code',
  [switch]$ExpectRegex
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor DarkGray
  Write-Host ("[post_merge_routine] {0}" -f $Title) -ForegroundColor Cyan
  Write-Host ("=" * 72) -ForegroundColor DarkGray
}

function Run([string]$Command, [string[]]$CmdArgs = @()) {
  $display = if ($CmdArgs.Count -gt 0) { "$Command $($CmdArgs -join ' ')" } else { $Command }
  Write-Host "Running: $display" -ForegroundColor DarkGray
  & $Command @CmdArgs
  if ($LASTEXITCODE -ne 0) { throw "Command failed (exit=${LASTEXITCODE}): $display" }
}

function Ensure-RepoRoot() {
  $root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
  Set-Location $root
  if (-not (Test-Path ".\package.json")) {
    throw "package.json not found. Run at repo root. Current: $root"
  }
  return (Get-Location).Path
}

function Get-GitValue([string[]]$Args, [string]$ErrorMessage) {
  $value = (& git @Args) 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
    throw $ErrorMessage
  }
  return ($value | Select-Object -First 1).Trim()
}

function Shorten-Text([string]$Text, [int]$MaxLen = 240) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return '' }
  $flat = ($Text -replace "[\r\n]+", ' ').Trim()
  if ($flat.Length -le $MaxLen) { return $flat }
  return ($flat.Substring(0, $MaxLen) + '...')
}

function Assert-ScriptParses([string]$ScriptPath) {
  $tokens = $null
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$tokens, [ref]$errors)
  if ($errors -and $errors.Count -gt 0) {
    $firstError = $errors | Select-Object -First 1
    throw ("PowerShell parser error in {0}: {1}" -f $ScriptPath, $firstError.Message)
  }
}

function Stop-Port([int]$Port) {
  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    try {
      $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
      if (-not $conns) { return }
      $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
      foreach ($pid in $pids) {
        if ($pid -and $pid -ne 0) {
          $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
          if ($p) {
            Write-Host "Killing PID=$pid on port=$Port ($($p.ProcessName))" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
          }
        }
      }
    } catch {}
    return
  }

  try {
    $lines = netstat -ano | Select-String -Pattern (":$Port\s") -ErrorAction SilentlyContinue
    foreach ($line in $lines) {
      $parts = ($line -replace "\s+", " ").Trim().Split(" ")
      if ($parts.Count -ge 5) {
        $pid = [int]$parts[-1]
        if ($pid -and $pid -ne 0) {
          $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
          if ($p) {
            Write-Host "Killing PID=$pid on port=$Port ($($p.ProcessName))" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
          }
        }
      }
    }
  } catch {}
}

function Test-GitOperationInProgress() {
  $gitDir = (& git rev-parse --git-dir) 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitDir)) { return $false }

  $ops = @(
    (Join-Path $gitDir 'MERGE_HEAD'),
    (Join-Path $gitDir 'rebase-apply'),
    (Join-Path $gitDir 'rebase-merge'),
    (Join-Path $gitDir 'CHERRY_PICK_HEAD'),
    (Join-Path $gitDir 'REVERT_HEAD')
  )
  foreach ($path in $ops) {
    if (Test-Path $path) { return $true }
  }
  return $false
}

function Resolve-UpstreamRef() {
  $upstream = (& git rev-parse --abbrev-ref --symbolic-full-name "@{u}") 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($upstream)) {
    return ($upstream | Select-Object -First 1).Trim()
  }
  return 'origin/main'
}

function Assert-NoConflictMarkers() {
  $paths = @('app','src','components','ops','post_merge_routine.ps1')
  $existingPaths = @()
  foreach ($path in $paths) {
    if (Test-Path ".\$path") { $existingPaths += $path }
  }

  if ($existingPaths.Count -eq 0) { return }

  $output = (& git grep -n -I -E -e '^<<<<<<<' -e '^=======$' -e '^>>>>>>>' -- @existingPaths) 2>$null
  $exitCode = $LASTEXITCODE

  if ($exitCode -eq 0) {
    Write-Host 'Conflict markers found:' -ForegroundColor Red
    foreach ($line in $output) {
      Write-Host $line -ForegroundColor Red
    }
    throw 'Conflict markers detected in code/script paths. Resolve them before rerunning .\post_merge_routine.ps1.'
  }

  if ($exitCode -eq 1) { return }

  throw "Conflict marker scan failed (git grep exit=$exitCode)."
}

function Ensure-CleanWorkingTree() {
  $dirty = (& git status --porcelain) 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect working tree (git status failed).'
  }

  if (-not [string]::IsNullOrWhiteSpace(($dirty -join "`n"))) {
    throw "Working tree is not clean. Commit or stash local changes before running .\post_merge_routine.ps1.`nTip: git status --short"
  }
}

function Get-AheadBehind([string]$UpstreamRef) {
  $countRaw = (& git rev-list --left-right --count "$UpstreamRef...HEAD") 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($countRaw)) {
    throw "Unable to compare local with '$UpstreamRef'."
  }

  $parts = ($countRaw -replace "\s+", ' ').Trim().Split(' ')
  if ($parts.Count -lt 2) {
    throw "Unable to parse ahead/behind count from git rev-list output '$countRaw'."
  }

  return @([int]$parts[0], [int]$parts[1])
}

function Ensure-GitRemoteParity([switch]$SkipAutoPush) {
  $branch = Get-GitValue -Args @('rev-parse','--abbrev-ref','HEAD') -ErrorMessage 'Unable to determine current branch.'
  $upstreamRef = Resolve-UpstreamRef

  $localSha = Get-GitValue -Args @('rev-parse','HEAD') -ErrorMessage 'Unable to determine local SHA via git rev-parse HEAD.'
  $originSha = Get-GitValue -Args @('rev-parse',$upstreamRef) -ErrorMessage "Unable to determine remote SHA for '$upstreamRef'."

  $pair = Get-AheadBehind -UpstreamRef $upstreamRef
  $behind = $pair[0]
  $ahead = $pair[1]

  if ($behind -gt 0 -and $ahead -gt 0) {
    throw ("Git parity failed: local diverged from {0} (behind={1}, ahead={2}). Fix with git pull --rebase, resolve conflicts, then rerun." -f $upstreamRef, $behind, $ahead)
  }

  if ($behind -gt 0) {
    throw ("Git parity failed: local is behind {0} by {1} commit(s). Run git pull --ff-only (or rebase), then rerun." -f $upstreamRef, $behind)
  }

  if ($ahead -gt 0) {
    if ($SkipAutoPush) {
      throw ("Git parity failed: local is ahead of {0} by {1} commit(s). Run git push, then rerun." -f $upstreamRef, $ahead)
    }

    if ($branch -ne 'main') {
      throw ("Auto-push blocked: current branch is '{0}'. Auto-push is allowed only on branch 'main'." -f $branch)
    }

    Write-Host ("Local is ahead of {0} by {1} commit(s); auto-pushing main..." -f $upstreamRef, $ahead) -ForegroundColor Yellow
    Run 'git' @('push','origin','main')
    Run 'git' @('fetch','--all','--prune')

    $originSha = Get-GitValue -Args @('rev-parse',$upstreamRef) -ErrorMessage "Unable to determine remote SHA for '$upstreamRef' after push."
    $pairAfter = Get-AheadBehind -UpstreamRef $upstreamRef
    if ($pairAfter[0] -ne 0 -or $pairAfter[1] -ne 0) {
      throw ("Auto-push completed but branch still not in parity with {0} (behind={1}, ahead={2})." -f $upstreamRef, $pairAfter[0], $pairAfter[1])
    }
  }

  $localSha = Get-GitValue -Args @('rev-parse','HEAD') -ErrorMessage 'Unable to read local HEAD after parity check.'
  $originSha = Get-GitValue -Args @('rev-parse',$upstreamRef) -ErrorMessage "Unable to read $upstreamRef after parity check."

  if ($localSha -ne $originSha) {
    throw ("Git parity failed unexpectedly: local={0}, remote={1}." -f $localSha, $originSha)
  }

  return [PSCustomObject]@{
    Branch = $branch
    UpstreamRef = $upstreamRef
    LocalSha = $localSha
    OriginSha = $originSha
  }
}

function Resolve-VercelProdHost([string]$ProvidedValue) {
  $target = ''

  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    $target = $ProvidedValue
  }

  $hostFilePath = '.\ops\vercel_prod_host.txt'
  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PROD_HOST)) {
    $target = $env:OSH_VERCEL_PROD_HOST
  }

  if ([string]::IsNullOrWhiteSpace($target) -and (Test-Path $hostFilePath)) {
    $line = Get-Content -Path $hostFilePath -TotalCount 1 -ErrorAction SilentlyContinue
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $target = $line
    }
  }

  if ([string]::IsNullOrWhiteSpace($target)) { return $null }

  $target = $target.Trim()
  $target = $target -replace '^https?://', ''
  $target = ($target -split '[/?#]', 2)[0]
  $target = $target.TrimEnd('/')

  if ($target -notmatch '^[A-Za-z0-9.-]+(:\d+)?$' -or $target -notmatch '[A-Za-z0-9.-]') {
    throw "Invalid Vercel production host '$target'."
  }

  return $target
}

function Invoke-VersionEndpoint([string]$ProdHost) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $timestamp = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $url = "https://$ProdHost/api/version?t=$timestamp"
  $response = Invoke-WebRequest -Uri $url -Method Get -Headers @{ 'Cache-Control'='no-cache'; 'Pragma'='no-cache' } -TimeoutSec 15 -ErrorAction Stop

  $body = $response.Content
  $json = $null
  if (-not [string]::IsNullOrWhiteSpace($body)) {
    try {
      $json = $body | ConvertFrom-Json
    } catch {
      throw "Unable to parse /api/version response JSON. Body=$((Shorten-Text $body 240))"
    }
  }

  return [PSCustomObject]@{
    StatusCode = [int]$response.StatusCode
    Json = $json
    Body = $body
    Url = $url
  }
}

function Get-WebExceptionStatusCode([System.Exception]$Exception) {
  if ($null -eq $Exception) { return $null }
  if ($Exception -is [System.Net.WebException] -and $Exception.Response) {
    try {
      return [int]([System.Net.HttpWebResponse]$Exception.Response).StatusCode
    } catch {}
  }
  if ($Exception.PSObject.Properties['Response'] -and $Exception.Response) {
    try {
      return [int]$Exception.Response.StatusCode
    } catch {}
  }
  return $null
}

function Assert-VersionRouteExistsInHead() {
  & git cat-file -e 'HEAD:app/api/version/route.ts' 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw 'Missing app/api/version/route.ts in HEAD commit. The route may exist only in your working tree. Please git add/commit/push this route, then rerun parity gate.'
  }
}

function Wait-VercelCommitParity([string]$ProdHost, [string]$LocalSha, [string]$ExpectedEnv, [switch]$AllowPreview, [int]$MaxWaitSec = 600, [int]$PollIntervalSec = 10) {
  $started = Get-Date
  $attempt = 0
  $safeIntervalSec = [Math]::Max(1, $PollIntervalSec)
  $maxAttempts = [Math]::Max(1, [int][Math]::Floor($MaxWaitSec / $safeIntervalSec) + 1)
  $lastStatusCode = $null
  $hadParsedCommitSha = $false
  $branchName = Get-GitValue -Args @('rev-parse','--abbrev-ref','HEAD') -ErrorMessage 'Unable to determine current branch for diagnostics.'

  $result = [PSCustomObject]@{
    CommitSha = ''
    VercelEnv = ''
    VercelUrl = ''
    GitRef = ''
    StatusCode = 0
  }

  while ($attempt -lt $maxAttempts) {
    $attempt++
    $elapsedSec = [int]((Get-Date) - $started).TotalSeconds

    try {
      $versionResponse = Invoke-VersionEndpoint -ProdHost $ProdHost
      $statusCode = $versionResponse.StatusCode
      $lastStatusCode = $statusCode
      $result.StatusCode = $statusCode

      if ($statusCode -eq 404) {
        Write-Host ("Attempt {0}/{1}: /api/version is 404 (endpoint missing on remote). This usually means Production deployment is still on an older commit or you are using the wrong domain/branch. Waiting {2}s..." -f $attempt, $maxAttempts, $safeIntervalSec) -ForegroundColor Yellow
        if ($attempt -lt $maxAttempts) {
          Start-Sleep -Seconds $safeIntervalSec
          continue
        }
        break
      }

      if ($statusCode -ne 200) {
        throw ("Unexpected status {0} from {1}." -f $statusCode, $versionResponse.Url)
      }

      $json = $versionResponse.Json
      $vercelSha = if ($json -and $json.commitSha) { [string]$json.commitSha } else { '' }
      $vercelEnvValue = if ($json -and $json.vercelEnv) { [string]$json.vercelEnv } else { '' }
      $vercelUrl = if ($json -and $json.vercelUrl) { [string]$json.vercelUrl } else { '' }
      $gitRef = if ($json -and $json.gitRef) { [string]$json.gitRef } else { '' }

      $result.CommitSha = $vercelSha
      $result.VercelEnv = $vercelEnvValue
      $result.VercelUrl = $vercelUrl
      $result.GitRef = $gitRef

      if (-not $AllowPreview -and $vercelEnvValue -eq 'preview') {
        throw "Host '$ProdHost' is preview (vercelEnv=preview). Use Production domain or rerun with -AllowPreviewHost."
      }

      if (-not [string]::IsNullOrWhiteSpace($vercelEnvValue) -and $vercelEnvValue -ne 'production') {
        Write-Host ("Host '$ProdHost' returned vercelEnv='$vercelEnvValue'. This may be a preview domain.") -ForegroundColor Yellow
        throw "Host '$ProdHost' is not production (vercelEnv=$vercelEnvValue)."
      }

      if ($ExpectedEnv -ne 'any' -and -not [string]::IsNullOrWhiteSpace($vercelEnvValue) -and $vercelEnvValue -ne $ExpectedEnv) {
        throw ("Vercel environment mismatch: expected={0} actual={1} host={2}." -f $ExpectedEnv, $vercelEnvValue, $ProdHost)
      }

      if ([string]::IsNullOrWhiteSpace($vercelSha) -or $vercelSha -eq 'unknown') {
        Write-Host ("/api/version returned commitSha='$vercelSha'. waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
        if ($attempt -lt $maxAttempts) {
          Start-Sleep -Seconds $safeIntervalSec
        }
        continue
      }

      $hadParsedCommitSha = $true

      if ($vercelSha -ne $LocalSha) {
        Write-Host ("Vercel commit mismatch: local=$LocalSha vercel=$vercelSha host=$ProdHost vercelEnv=$vercelEnvValue waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
        if ($attempt -lt $maxAttempts) {
          Start-Sleep -Seconds $safeIntervalSec
        }
        continue
      }

      Write-Host ("VERCEL == LOCAL ✅ ({0}) (vercelEnv={1})" -f $LocalSha, $vercelEnvValue) -ForegroundColor Green
      $result | Add-Member -NotePropertyName Success -NotePropertyValue $true -Force
      $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue '' -Force
      return $result
    } catch {
      $statusCode = Get-WebExceptionStatusCode -Exception $_.Exception
      if ($null -ne $statusCode) {
        $lastStatusCode = $statusCode
        $result.StatusCode = $statusCode
      }

      $responseBody = ''
      if ($_.Exception.PSObject.Properties['Response'] -and $_.Exception.Response) {
        try {
          $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
          $responseBody = $reader.ReadToEnd()
          $reader.Close()
        } catch {}
      }

      if ($statusCode -eq 404) {
        Write-Host ("Attempt {0}/{1}: /api/version is 404 (endpoint missing on remote). This usually means Production deployment is still on an older commit or you are using the wrong domain/branch. Waiting {2}s..." -f $attempt, $maxAttempts, $safeIntervalSec) -ForegroundColor Yellow
      } elseif (-not [string]::IsNullOrWhiteSpace($responseBody)) {
        $shortBody = Shorten-Text -Text $responseBody -MaxLen 160
        Write-Host ("Vercel parity probe retry: status=$statusCode detail=$shortBody waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
      } else {
        $shortMsg = Shorten-Text -Text $_.Exception.Message -MaxLen 240
        Write-Host ("Vercel parity probe retry: status=$statusCode detail=$shortMsg waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
      }

      if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds $safeIntervalSec
        continue
      }
    }
  }

  if ($lastStatusCode -eq 404) {
    $result | Add-Member -NotePropertyName Success -NotePropertyValue $false -Force
    $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue ("PRODUCTION ROUTE MISSING: /api/version returned 404 after {0} tries (host={1}, localSha={2}, branch={3}). Production currently does not serve this route. Check that app/api/version/route.ts exists in HEAD commit, verify Vercel Production deployment points to the expected commit, and confirm this host is your Production domain." -f $maxAttempts, $ProdHost, $LocalSha, $branchName) -Force
    return $result
  }

  if (-not $hadParsedCommitSha) {
    $result | Add-Member -NotePropertyName Success -NotePropertyValue $false -Force
    $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue ("VERCEL PARITY PROBE FAILED: unable to obtain a valid commitSha from /api/version after {0} tries (host={1}, localSha={2}, branch={3}, lastStatus={4})." -f $maxAttempts, $ProdHost, $LocalSha, $branchName, $lastStatusCode) -Force
    return $result
  }

  $result | Add-Member -NotePropertyName Success -NotePropertyValue $false -Force
  $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue ("VERCEL MISMATCH after {0} tries: host={1}, remoteSha={2}, localSha={3}, vercelEnv={4}" -f $maxAttempts, $ProdHost, $result.CommitSha, $LocalSha, $result.VercelEnv) -Force
  return $result
}

function Write-ParitySnapshot([string]$LocalSha, [string]$OriginSha, [string]$VercelSha, [string]$VercelEnvValue, [string]$ProdHost) {
  $snapshot = [ordered]@{
    timestamp = (Get-Date).ToString('o')
    localSha = $LocalSha
    originSha = $OriginSha
    vercelCommitSha = $VercelSha
    vercelEnv = $VercelEnvValue
    productionHost = $ProdHost
  }

  $opsDir = '.\ops'
  if (-not (Test-Path $opsDir)) {
    New-Item -ItemType Directory -Path $opsDir -Force | Out-Null
  }

  $snapshotPath = Join-Path $opsDir 'parity_snapshot_latest.json'
  ($snapshot | ConvertTo-Json -Depth 4) | Out-File -FilePath $snapshotPath -Encoding utf8
  Write-Host ("Saved parity snapshot: {0}" -f $snapshotPath) -ForegroundColor Green
}

Write-Section "Boot"
$repoRoot = Ensure-RepoRoot
Write-Host ("Time: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -ForegroundColor Gray
Write-Host ("Repo: {0}" -f $repoRoot) -ForegroundColor Gray

Assert-ScriptParses -ScriptPath (Join-Path $repoRoot "post_merge_routine.ps1")
Write-Host "PowerShell parser check: OK" -ForegroundColor Green

Write-Section "Git context"
$gitOk = $false
if (Get-Command git -ErrorAction SilentlyContinue) {
  $isRepo = (& git rev-parse --is-inside-work-tree) 2>$null
  if ($LASTEXITCODE -eq 0 -and $isRepo -eq 'true') { $gitOk = $true }
}

if (-not $gitOk) {
  throw 'git is required for this routine (not a git repo or git not found).'
}

$branch = (& git rev-parse --abbrev-ref HEAD) 2>$null
$commit = (& git rev-parse --short HEAD) 2>$null
$head = (& git log -1 --oneline) 2>$null
Write-Host ("Branch: {0}" -f $branch) -ForegroundColor Green
Write-Host ("Commit: {0}" -f $commit) -ForegroundColor Green
Write-Host ("Head:   {0}" -f $head) -ForegroundColor Green

Write-Section "Git preflight parity"
if (Test-GitOperationInProgress) {
  throw "Git operation in progress (merge/rebase/cherry-pick). Run git status, resolve or abort, then rerun .\post_merge_routine.ps1."
}

$unmerged = (& git diff --name-only --diff-filter=U) 2>$null
if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($unmerged -join "`n"))) {
  throw "Unmerged files detected. Run git status and resolve conflicts before rerunning .\post_merge_routine.ps1."
}

Assert-NoConflictMarkers
Ensure-CleanWorkingTree
Run 'git' @('fetch','--all','--prune')

if (-not $SkipPull) {
  $upstream = Resolve-UpstreamRef
  if (-not [string]::IsNullOrWhiteSpace($upstream)) {
    Run 'git' @('pull','--ff-only')
  }
} else {
  Write-Host 'SkipPull enabled.' -ForegroundColor DarkGray
}

Write-Host 'Preflight: OK' -ForegroundColor Green

Write-Section "Optional: feature fingerprint check"
if ($Expect.Count -gt 0) {
  $paths = @()
  switch ($ExpectScope) {
    'code' { $paths = @('app','src','components','ops') }
    'all'  { $paths = @() }
  }

  $existingExpectPaths = @()
  foreach ($path in $paths) {
    if (Test-Path ".\$path") { $existingExpectPaths += $path }
  }
  if ($ExpectScope -eq 'code' -and $existingExpectPaths.Count -eq 0) {
    throw 'EXPECT FAILED: code scope paths (app/src/components/ops) not found. Likely wrong branch/commit.'
  }

  foreach ($pat in $Expect) {
    if ([string]::IsNullOrWhiteSpace($pat)) { continue }
    $expectMode = if ($ExpectRegex) { 'regex' } else { 'fixed-string' }
    Write-Host ("Expect: {0} (scope={1}, mode={2})" -f $pat, $ExpectScope, $expectMode) -ForegroundColor Cyan

    $expectArgs = @('grep','-n')
    if (-not $ExpectRegex) { $expectArgs += '-F' }
    $expectArgs += '--'
    $expectArgs += $pat

    if ($ExpectScope -eq 'all') {
      & git @expectArgs | Out-Null
    } else {
      & git @expectArgs -- @existingExpectPaths | Out-Null
    }

    if ($LASTEXITCODE -ne 0) {
      throw "EXPECT FAILED: pattern '$pat' not found (scope=$ExpectScope, mode=$expectMode). Likely wrong branch/commit."
    }
  }
  Write-Host 'Expect check: OK' -ForegroundColor Green
} else {
  Write-Host 'Expect check: (skipped)' -ForegroundColor DarkGray
}

Write-Section "Clean build artifacts"
if ($SkipClean) {
  Write-Host 'SkipClean enabled.' -ForegroundColor DarkGray
} else {
  if (Test-Path '.\.next') {
    Write-Host 'Removing .next directory' -ForegroundColor Yellow
    Remove-Item -Recurse -Force '.\.next' -ErrorAction SilentlyContinue
  } else {
    Write-Host '.next not found (skip)' -ForegroundColor DarkGray
  }
}

Write-Section "Kill ports"
if ($SkipKillPorts) {
  Write-Host 'SkipKillPorts enabled.' -ForegroundColor DarkGray
} else {
  foreach ($port in $KillPorts) { Stop-Port -Port $port }
}

Write-Section "Install (npm ci)"
if (-not $SkipNpmCi) { Run 'npm' @('ci') }
else { Write-Host 'SkipNpmCi enabled.' -ForegroundColor DarkGray }

Write-Section "Lint (npm run lint)"
if ($SkipLint) {
  Write-Host 'SkipLint enabled.' -ForegroundColor DarkGray
} else {
  try {
    Run 'npm' @('run','lint')
    Write-Host 'LINT OK' -ForegroundColor Green
  } catch {
    throw 'Lint failed; fix before build/deploy'
  }
}

Write-Section "Build (npm run build)"
if (-not $SkipBuild) {
  Run 'npm' @('run','build')
  Write-Host 'BUILD OK' -ForegroundColor Green
} else {
  Write-Host 'SkipBuild enabled.' -ForegroundColor DarkGray
}

Write-Section "Vercel parity gate (Production == Local == origin/main)"
$runVercelParity = $false
if ($VercelParityMode -ne 'off' -and ((-not $SkipVercelParity) -or $RequireVercelSameCommit)) {
  $runVercelParity = $true
}
$finalLocalSha = ''
$finalOriginSha = ''
$finalVercelSha = ''
$finalVercelEnv = ''
$productionDomainHost = ''

if ($runVercelParity) {
  Assert-VersionRouteExistsInHead

  Ensure-CleanWorkingTree
  $parityState = Ensure-GitRemoteParity -SkipAutoPush:$SkipPush
  $finalLocalSha = $parityState.LocalSha
  $finalOriginSha = $parityState.OriginSha

  $productionDomainHost = Resolve-VercelProdHost -ProvidedValue $VercelProdUrlOrHost
  if ([string]::IsNullOrWhiteSpace($productionDomainHost)) {
    throw "Missing Vercel production host. Set OSH_VERCEL_PROD_HOST or ops/vercel_prod_host.txt (host only)."
  }

  $effectiveParityRetries = if (-not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PARITY_RETRIES)) { [int]$env:OSH_VERCEL_PARITY_RETRIES } else { $VercelParityRetries }
  $effectiveParityDelaySec = if (-not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PARITY_DELAY_SEC)) { [int]$env:OSH_VERCEL_PARITY_DELAY_SEC } else { $null }
  $effectivePollIntervalSec = if ($effectiveParityDelaySec -and $effectiveParityDelaySec -gt 0) { $effectiveParityDelaySec } else { $VercelPollIntervalSec }
  $effectiveMaxWaitSec = 0
  if ($VercelMaxWaitSec -and $VercelMaxWaitSec -gt 0) {
    $effectiveMaxWaitSec = $VercelMaxWaitSec
  } elseif ($effectiveParityRetries -and $effectiveParityRetries -gt 0) {
    $effectiveMaxWaitSec = [Math]::Max(1, ($effectivePollIntervalSec * ([Math]::Max(1, $effectiveParityRetries - 1))) + 1)
  } else {
    $effectiveMaxWaitSec = 600
  }

  $vercelState = Wait-VercelCommitParity -ProdHost $productionDomainHost -LocalSha $finalLocalSha -ExpectedEnv $VercelEnv -AllowPreview:$AllowPreviewHost -MaxWaitSec $effectiveMaxWaitSec -PollIntervalSec $effectivePollIntervalSec
  if (-not $vercelState.Success) {
    if ($VercelParityMode -eq 'warn') {
      Write-Host ("Vercel parity warning: {0}" -f $vercelState.FailureMessage) -ForegroundColor Yellow
    } else {
      throw $vercelState.FailureMessage
    }
  }
  $finalVercelSha = $vercelState.CommitSha
  $finalVercelEnv = $vercelState.VercelEnv

  Write-Host ("LOCAL SHA:  {0}" -f $finalLocalSha) -ForegroundColor Green
  Write-Host ("ORIGIN SHA: {0}" -f $finalOriginSha) -ForegroundColor Green
  Write-Host ("VERCEL SHA: {0}" -f $finalVercelSha) -ForegroundColor Green
  Write-Host ("VERCEL ENV: {0}" -f $finalVercelEnv) -ForegroundColor Green

  Write-ParitySnapshot -LocalSha $finalLocalSha -OriginSha $finalOriginSha -VercelSha $finalVercelSha -VercelEnvValue $finalVercelEnv -ProdHost $productionDomainHost
} else {
  if ($VercelParityMode -eq 'off') {
    Write-Host 'Vercel parity skipped (VercelParityMode=off).' -ForegroundColor Yellow
  } else {
    Write-Host 'SkipVercelParity enabled.' -ForegroundColor Yellow
  }
}

Write-Section "Runtime server"
if (-not $SkipDev) {
  if ($ProdSmoke) {
    Write-Host 'ProdSmoke approximates Vercel runtime; dev may differ.' -ForegroundColor Yellow
    Write-Host ("Starting prod smoke: npm run start -- -p {0}" -f $DevPort) -ForegroundColor Cyan
    Run 'npm' @('run','start','--','-p',"$DevPort")
  } else {
    Write-Host ("Starting dev: npm run dev -- --webpack -p {0}" -f $DevPort) -ForegroundColor Cyan
    Run 'npm' @('run','dev','--','--webpack','-p',"$DevPort")
  }
} else {
  Write-Host 'SkipDev enabled.' -ForegroundColor DarkGray
}

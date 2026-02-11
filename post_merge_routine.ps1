#requires -Version 5.1
<#
post_merge_routine.ps1 (universal single-file)

Purpose
- sync remote (ff-only) -> clean .next -> kill ports -> npm ci -> npm run build -> parity gate -> npm run dev -- --webpack -p 3000
- print branch/commit
- optional feature fingerprint check (-Expect) with scope (default: code = app/src)

Examples
  .\post_merge_routine.ps1
  .\post_merge_routine.ps1 -SkipDev
  .\post_merge_routine.ps1 -SkipVercelParity -SkipDev
  .\post_merge_routine.ps1 -Expect game_billing -SkipDev
  .\post_merge_routine.ps1 -Expect game_billing,"ゲーム課金" -ExpectScope code -SkipDev -SkipPull -SkipNpmCi -SkipBuild
#>

param(
  [switch]$SkipPull,
  [switch]$SkipNpmCi,
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
  [int]$VercelWaitTimeoutSec = 180,
  [int]$VercelPollIntervalSec = 5,

  [int]$DevPort = 3000,
  [int[]]$KillPorts = @(3000,3001,3002),

  [string[]]$Expect = @(),
  [ValidateSet('code','docs','all')]
  [string]$ExpectScope = 'code'
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

function TryRun([string]$Command, [string[]]$CmdArgs = @()) {
  $display = if ($CmdArgs.Count -gt 0) { "$Command $($CmdArgs -join ' ')" } else { $Command }
  Write-Host "Running: $display" -ForegroundColor DarkGray
  & $Command @CmdArgs
  return $LASTEXITCODE
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
    foreach ($l in $lines) {
      $parts = ($l -replace "\s+", " ").Trim().Split(" ")
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

function Ensure-GitRemoteParity([switch]$SkipAutoPush) {
  if (-not $gitOk) {
    throw "Vercel parity gate requires git repo context."
  }

  $branch = Get-GitValue -Args @('rev-parse','--abbrev-ref','HEAD') -ErrorMessage 'Unable to determine current branch.'
  $upstreamRef = Resolve-UpstreamRef
  $localSha = Get-GitValue -Args @('rev-parse','HEAD') -ErrorMessage 'Unable to determine local SHA via git rev-parse HEAD.'

  $originSha = (& git rev-parse $upstreamRef) 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($originSha)) {
    throw "Unable to determine remote SHA for '$upstreamRef'. Run git fetch origin and verify upstream."
  }
  $originSha = ($originSha | Select-Object -First 1).Trim()

  if ($localSha -eq $originSha) {
    Write-Host ("Git remote parity: OK ({0})" -f $localSha) -ForegroundColor Green
    return $localSha
  }

  $countRaw = (& git rev-list --left-right --count "$upstreamRef...HEAD") 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($countRaw)) {
    throw "Unable to compare local with '$upstreamRef'."
  }
  $parts = ($countRaw -replace "\s+", " ").Trim().Split(' ')
  if ($parts.Count -lt 2) {
    throw "Unable to parse ahead/behind count from git rev-list output '$countRaw'."
  }

  $behind = [int]$parts[0]
  $ahead = [int]$parts[1]
  if ($behind -gt 0) {
    throw ("Git parity failed: local diverged from {0} (behind={1}, ahead={2}). Resolve with git pull --rebase and fix conflicts, then rerun .\post_merge_routine.ps1." -f $upstreamRef, $behind, $ahead)
  }

  if ($ahead -gt 0) {
    if ($SkipAutoPush) {
      throw ("Git parity failed: local is ahead of {0} by {1} commit(s). Run git push, then rerun .\post_merge_routine.ps1." -f $upstreamRef, $ahead)
    }

    Write-Host ("Local is ahead of {0} by {1} commit(s); pushing..." -f $upstreamRef, $ahead) -ForegroundColor Yellow
    if ($upstreamRef -eq 'origin/main' -and $branch -eq 'main') {
      Run 'git' @('push','origin','main')
    } elseif ($upstreamRef -eq 'origin/main') {
      throw "No upstream configured for branch '$branch'. Set upstream or switch to main before auto-push."
    } else {
      Run 'git' @('push')
    }

    Run 'git' @('fetch','origin','--prune')
    $originShaAfter = Get-GitValue -Args @('rev-parse',$upstreamRef) -ErrorMessage "Unable to confirm remote SHA after push for '$upstreamRef'."
    if ($originShaAfter -ne $localSha) {
      throw ("Push completed but remote SHA still mismatched (local={0} remote={1})." -f $localSha, $originShaAfter)
    }

    Write-Host ("Git remote parity: OK after push ({0})" -f $localSha) -ForegroundColor Green
    return $localSha
  }

  throw ("Git parity failed unexpectedly: local={0}, remote={1}." -f $localSha, $originSha)
}

function Resolve-VercelProdHost([string]$ProvidedValue) {
  $hostFile = '.\ops\vercel_prod_host.txt'
  $sampleFile = '.\ops\vercel_prod_host.sample.txt'
  $target = ''

  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    $target = $ProvidedValue.Trim()
  }
  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PROD_HOST)) {
    $target = $env:OSH_VERCEL_PROD_HOST.Trim()
  }
  if ([string]::IsNullOrWhiteSpace($target) -and (Test-Path $hostFile)) {
    $line = Get-Content -Path $hostFile -TotalCount 1 -ErrorAction SilentlyContinue
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $target = $line.Trim()
    }
  }

  $setupHint = "Vercel → Project → Deployments → click latest Production (Current) deployment → Domains → copy stable production domain. Paste host only into ops/vercel_prod_host.txt (example: oshihapi-pushi-buy-diagnosis.vercel.app)."
  if ([string]::IsNullOrWhiteSpace($target)) {
    if ((Test-Path $sampleFile) -and (-not (Test-Path $hostFile))) {
      throw ("Missing Vercel production host. Run: Copy-Item .\ops\vercel_prod_host.sample.txt .\ops\vercel_prod_host.txt, edit first line, then rerun .\post_merge_routine.ps1. {0}" -f $setupHint)
    }
    throw ("Missing Vercel production host. Set OSH_VERCEL_PROD_HOST or ops/vercel_prod_host.txt. {0}" -f $setupHint)
  }

  if ($target -match 'https?://' -or $target.Contains('/')) {
    throw "Invalid Vercel host '$target'. Use host only (no https://, no path)."
  }

  $upper = $target.ToUpperInvariant()
  if ($target.Contains('<') -or $target.Contains('>') -or $upper.Contains('YOUR_PROD_HOST') -or $upper.Contains('PASTE_')) {
    throw ("Vercel host looks like placeholder: '$target'. {0}" -f $setupHint)
  }

  if ($target -notmatch '^[A-Za-z0-9.-]+$' -or $target -notmatch '\.') {
    throw "Invalid Vercel host '$target'. Expected host like your-project.vercel.app"
  }

  return $target
}

function Wait-VercelCommitParity([string]$TargetHost, [string]$LocalSha, [string]$ExpectedEnv, [switch]$AllowPreview, [int]$TimeoutSec = 180, [int]$PollIntervalSec = 5) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $lastError = ''
  $attempt = 0

  while ((Get-Date) -lt $deadline) {
    $attempt++
    $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $url = "https://$TargetHost/api/version?ts=$ts"

    try {
      $ver = Invoke-RestMethod -Uri $url -TimeoutSec 10 -Headers @{ 'Cache-Control'='no-cache'; 'Pragma'='no-cache' }
      $verSha = ''
      if ($null -ne $ver.commitSha) { $verSha = [string]$ver.commitSha }
      $verEnv = ''
      if ($null -ne $ver.vercelEnv) { $verEnv = [string]$ver.vercelEnv }
      $verDeploymentId = ''
      if ($null -ne $ver.deploymentId) { $verDeploymentId = [string]$ver.deploymentId }

      Write-Host ("Waiting for Vercel production to catch up… vercel={0} local={1} (env={2})" -f $verSha, $LocalSha, $verEnv) -ForegroundColor DarkGray

      if (-not $AllowPreview -and $verEnv -eq 'preview') {
        throw "Host '$TargetHost' is preview (vercelEnv=preview). Likely using preview hash domain. Use stable production domain or rerun with -AllowPreviewHost."
      }

      if ($ExpectedEnv -ne 'any' -and -not [string]::IsNullOrWhiteSpace($verEnv) -and $verEnv -ne $ExpectedEnv) {
        throw ("Vercel environment mismatch: expected={0} actual={1} host={2}." -f $ExpectedEnv, $verEnv, $TargetHost)
      }

      if (-not [string]::IsNullOrWhiteSpace($verSha) -and $verSha -ne 'unknown' -and $verSha -eq $LocalSha) {
        Write-Host "" 
        Write-Host ("VERCEL == LOCAL ✅ {0}" -f $LocalSha) -ForegroundColor Green
        Write-Host ("DeploymentId: {0}" -f $verDeploymentId) -ForegroundColor Green
        return
      }

      if ([string]::IsNullOrWhiteSpace($verSha) -or $verSha -eq 'unknown') {
        Write-Host 'Hint: /api/version commitSha is empty/unknown; still waiting (system env/runtime propagation may still be in progress).' -ForegroundColor Yellow
      }
    } catch {
      $lastError = $_.Exception.Message
      if ($attempt -eq 1) {
        throw ("Cannot reach https://{0}/api/version. Check domain and whether production deployment is live. Error: {1}" -f $TargetHost, $lastError)
      }
      Write-Host ("Retrying Vercel check after error: {0}" -f $lastError) -ForegroundColor Yellow
    }

    Start-Sleep -Seconds $PollIntervalSec
  }

  throw "Vercel still not on this commit. Open Vercel Deployments, ensure production deployment succeeded, or wait/redeploy, then rerun .\post_merge_routine.ps1."
}

Write-Section "Boot"
$repoRoot = Ensure-RepoRoot
Write-Host ("Time: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -ForegroundColor Gray
Write-Host ("Repo: {0}" -f $repoRoot) -ForegroundColor Gray

Write-Section "Git context"
$gitOk = $false
if (Get-Command git -ErrorAction SilentlyContinue) {
  $isRepo = (& git rev-parse --is-inside-work-tree) 2>$null
  if ($LASTEXITCODE -eq 0 -and $isRepo -eq 'true') { $gitOk = $true }
}

if ($gitOk) {
  $branch = (& git rev-parse --abbrev-ref HEAD) 2>$null
  $commit = (& git rev-parse --short HEAD) 2>$null
  $head = (& git log -1 --oneline) 2>$null
  Write-Host ("Branch: {0}" -f $branch) -ForegroundColor Green
  Write-Host ("Commit: {0}" -f $commit) -ForegroundColor Green
  Write-Host ("Head:   {0}" -f $head) -ForegroundColor Green
} else {
  Write-Host 'Warning: git not available or not a git repo.' -ForegroundColor Yellow
}

Write-Section "Git preflight guards"
if ($gitOk) {
  if (Test-GitOperationInProgress) {
    throw "Git operation in progress (merge/rebase/cherry-pick). Run git status, resolve or abort, then rerun .\post_merge_routine.ps1."
  }

  $unmerged = (& git diff --name-only --diff-filter=U) 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($unmerged -join "`n"))) {
    throw "Unmerged files detected. Run git status and resolve conflicts before rerunning .\post_merge_routine.ps1."
  }

  $dirty = (& git status --porcelain) 2>$null
  if (-not $SkipPull -and $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($dirty -join "`n"))) {
    Write-Host 'Warning: working tree has local changes and pull may fail. Commit or stash before running post_merge_routine.' -ForegroundColor Yellow
  } else {
    Write-Host 'Preflight: OK' -ForegroundColor Green
  }
} else {
  Write-Host 'Preflight skipped (not a git repo).' -ForegroundColor DarkGray
}

Write-Section "Optional: feature fingerprint check"
if ($Expect.Count -gt 0) {
  if (-not $gitOk) { throw '-Expect requires git repo.' }

  $paths = @()
  switch ($ExpectScope) {
    'code' { $paths = @('app','src') }
    'docs' { $paths = @('docs','SPEC.md','oshihapi_ops_windows.md','gpt_prompt_next_chat_latest.txt') }
    'all'  { $paths = @() }
  }

  foreach ($pat in $Expect) {
    if ([string]::IsNullOrWhiteSpace($pat)) { continue }
    Write-Host ("Expect: {0} (scope={1})" -f $pat, $ExpectScope) -ForegroundColor Cyan

    if ($paths.Count -gt 0) {
      & git grep -n -- "$pat" -- @paths | Out-Null
    } else {
      & git grep -n -- "$pat" | Out-Null
    }

    if ($LASTEXITCODE -ne 0) {
      throw "EXPECT FAILED: pattern '$pat' not found (scope=$ExpectScope). Likely wrong branch/commit."
    }
  }
  Write-Host 'Expect check: OK' -ForegroundColor Green
} else {
  Write-Host 'Expect check: (skipped)' -ForegroundColor DarkGray
}

Write-Section "Sync remote (ff-only)"
if (-not $SkipPull) {
  if ($gitOk) {
    TryRun 'git' @('fetch','--all','--prune') | Out-Null
    $up = (& git rev-parse --abbrev-ref --symbolic-full-name "@{u}") 2>$null
    if ($LASTEXITCODE -eq 0 -and $up) {
      Run 'git' @('pull','--ff-only')
    } else {
      Write-Host 'No upstream branch; skip git pull.' -ForegroundColor DarkGray
    }
  } else {
    Write-Host 'Skip git sync (not a repo).' -ForegroundColor DarkGray
  }
} else {
  Write-Host 'SkipPull enabled.' -ForegroundColor DarkGray
}

Write-Section "Clean build artifacts"
if (Test-Path '.\.next') {
  Write-Host 'Removing .next directory' -ForegroundColor Yellow
  Remove-Item -Recurse -Force '.\.next' -ErrorAction SilentlyContinue
} else {
  Write-Host '.next not found (skip)' -ForegroundColor DarkGray
}

Write-Section "Kill ports"
foreach ($p in $KillPorts) { Stop-Port -Port $p }

Write-Section "Install (npm ci)"
if (-not $SkipNpmCi) { Run 'npm' @('ci') }
else { Write-Host 'SkipNpmCi enabled.' -ForegroundColor DarkGray }

Write-Section "Build (npm run build)"
if (-not $SkipBuild) {
  Run 'npm' @('run','build')
  Write-Host 'BUILD OK' -ForegroundColor Green
} else {
  Write-Host 'SkipBuild enabled.' -ForegroundColor DarkGray
}

Write-Section "Vercel parity gate (Production == Local)"
$runVercelParity = (-not $SkipVercelParity) -or $RequireVercelSameCommit
if ($runVercelParity) {
  $localSha = Ensure-GitRemoteParity -SkipAutoPush:$SkipPush
  $vercelHost = Resolve-VercelProdHost -ProvidedValue $VercelProdUrlOrHost
  Wait-VercelCommitParity -TargetHost $vercelHost -LocalSha $localSha -ExpectedEnv $VercelEnv -AllowPreview:$AllowPreviewHost -TimeoutSec $VercelWaitTimeoutSec -PollIntervalSec $VercelPollIntervalSec
} else {
  Write-Host 'SkipVercelParity enabled.' -ForegroundColor Yellow
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

#requires -Version 5.1
<#
post_merge_routine.ps1 (universal single-file)

Purpose
- sync remote (ff-only) -> clean .next -> kill ports -> npm ci -> npm run build -> npm run dev -- --webpack -p 3000
- print branch/commit
- optional feature fingerprint check (-Expect) with scope (default: code = app/src)

Examples
  .\post_merge_routine.ps1
  .\post_merge_routine.ps1 -SkipDev
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
  [Alias('VercelHost')]
  [string]$VercelProdUrlOrHost,
  [ValidateSet('production','preview','any')]
  [string]$VercelEnv = 'any',

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

function Resolve-VercelProdUrl([string]$ProvidedValue) {
  $hostFile = ".\ops\vercel_prod_host.txt"
  $target = ""
  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    $target = $ProvidedValue.Trim()
  }

  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PROD_HOST)) {
    $target = $env:OSH_VERCEL_PROD_HOST.Trim()
  }

  if ([string]::IsNullOrWhiteSpace($target)) {
    if (Test-Path $hostFile) {
      $line = Get-Content -Path $hostFile -TotalCount 1 -ErrorAction SilentlyContinue
      if (-not [string]::IsNullOrWhiteSpace($line)) {
        $target = $line.Trim()
      }
    }
  }

  if ([string]::IsNullOrWhiteSpace($target)) {
    throw "Missing Vercel production host. Set -VercelHost (or -VercelProdUrlOrHost), OSH_VERCEL_PROD_HOST, or $hostFile."
  }

  $invalidTokens = @('http','/','<','>','PASTE','YOUR_','PROD_HOST')
  foreach ($tok in $invalidTokens) {
    if ($target.ToUpperInvariant().Contains($tok.ToUpperInvariant())) {
      throw "Invalid Vercel host '$target'. Use host only (example: your-project.vercel.app). Update $hostFile or pass -VercelHost."
    }
  }

  if ($target -notmatch '\.') {
    throw "Invalid Vercel host '$target'. Host must contain at least one dot (example: your-project.vercel.app). Update $hostFile or pass -VercelHost."
  }

  return $target
}

function Test-VercelSameCommit([string]$TargetHost, [string]$ExpectedVercelEnv) {
  if (-not $gitOk) {
    throw "-RequireVercelSameCommit requires git repo."
  }

  $localSha = (& git rev-parse HEAD) 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($localSha)) {
    throw "Unable to determine local commit SHA via git rev-parse HEAD."
  }
  $localSha = $localSha.Trim()

  $endpoint = "https://$TargetHost/api/version"
  Write-Host ("Checking Vercel commit: {0}" -f $endpoint) -ForegroundColor DarkGray
  $resp = $null
  $maxAttempts = 3
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      $resp = Invoke-RestMethod -Uri $endpoint -TimeoutSec 10
      break
    } catch {
      if ($attempt -ge $maxAttempts) {
        throw ("Failed to call {0}. Network/API error after {1} attempts: {2}" -f $endpoint, $maxAttempts, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 900
    }
  }

  $vercelSha = ""
  if ($null -ne $resp -and $null -ne $resp.commitSha) {
    $vercelSha = [string]$resp.commitSha
  }
  $vercelSha = $vercelSha.Trim()
  $vercelEnvResp = ""
  if ($null -ne $resp -and $null -ne $resp.vercelEnv) {
    $vercelEnvResp = ([string]$resp.vercelEnv).Trim()
  }
  $deploymentId = ""
  if ($null -ne $resp -and $null -ne $resp.deploymentId) {
    $deploymentId = ([string]$resp.deploymentId).Trim()
  }

  if ([string]::IsNullOrWhiteSpace($vercelSha) -or $vercelSha.ToLowerInvariant() -eq 'unknown') {
    throw ("Vercel /api/version returned missing/unknown commitSha (vercelEnv='{0}', deploymentId='{1}', host='{2}'). Vercel System Env variables may not be exposed to runtime. Check Vercel project settings (System Environment Variables exposure)." -f $vercelEnvResp, $deploymentId, $TargetHost)
  }

  if ($ExpectedVercelEnv -ne 'any' -and -not [string]::IsNullOrWhiteSpace($vercelEnvResp) -and $vercelEnvResp -ne $ExpectedVercelEnv) {
    throw ("Vercel environment mismatch: expected='{0}' actual='{1}' host='{2}' deploymentId='{3}'." -f $ExpectedVercelEnv, $vercelEnvResp, $TargetHost, $deploymentId)
  }

  if ($vercelSha -ne $localSha) {
    throw ("VERCEL MISMATCH: local={0} vercel={1} vercelEnv={2} deploymentId={3} host={4}" -f $localSha, $vercelSha, $vercelEnvResp, $deploymentId, $TargetHost)
  }

  Write-Host ("Vercel commit gate: OK local={0} vercelEnv={1} deploymentId={2} host={3}" -f $localSha, $vercelEnvResp, $deploymentId, $TargetHost) -ForegroundColor Green
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

Write-Section "Boot"
$repoRoot = Ensure-RepoRoot
Write-Host ("Time: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -ForegroundColor Gray
Write-Host ("Repo: {0}" -f $repoRoot) -ForegroundColor Gray

Write-Section "Git context"
$gitOk = $false
if (Get-Command git -ErrorAction SilentlyContinue) {
  $isRepo = (& git rev-parse --is-inside-work-tree) 2>$null
  if ($LASTEXITCODE -eq 0 -and $isRepo -eq "true") { $gitOk = $true }
}

if ($gitOk) {
  $branch = (& git rev-parse --abbrev-ref HEAD) 2>$null
  $commit = (& git rev-parse --short HEAD) 2>$null
  $head   = (& git log -1 --oneline) 2>$null
  Write-Host ("Branch: {0}" -f $branch) -ForegroundColor Green
  Write-Host ("Commit: {0}" -f $commit) -ForegroundColor Green
  Write-Host ("Head:   {0}" -f $head)   -ForegroundColor Green
} else {
  Write-Host "Warning: git not available or not a git repo." -ForegroundColor Yellow
}

Write-Section "Git preflight guards"
if ($gitOk) {
  if (Test-GitOperationInProgress) {
    throw "Git operation in progress. Resolve/abort before running post_merge_routine."
  }

  $unmerged = (& git diff --name-only --diff-filter=U) 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($unmerged -join "`n"))) {
    throw "Git operation in progress. Resolve/abort before running post_merge_routine."
  }

  $dirty = (& git status --porcelain) 2>$null
  if (-not $SkipPull -and $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($dirty -join "`n"))) {
    Write-Host "Warning: working tree has local changes and pull may fail. Commit or stash before running post_merge_routine." -ForegroundColor Yellow
  } else {
    Write-Host "Preflight: OK" -ForegroundColor Green
  }
} else {
  Write-Host "Preflight skipped (not a git repo)." -ForegroundColor DarkGray
}

Write-Section "Optional: feature fingerprint check"
if ($Expect.Count -gt 0) {
  if (-not $gitOk) { throw "-Expect requires git repo." }

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
  Write-Host "Expect check: OK" -ForegroundColor Green
} else {
  Write-Host "Expect check: (skipped)" -ForegroundColor DarkGray
}

Write-Section "Sync remote (ff-only)"
if (-not $SkipPull) {
  if ($gitOk) {
    TryRun "git" @("fetch","--all","--prune") | Out-Null
    $up = (& git rev-parse --abbrev-ref --symbolic-full-name "@{u}") 2>$null
    if ($LASTEXITCODE -eq 0 -and $up) {
      Run "git" @("pull","--ff-only")
    } else {
      Write-Host "No upstream branch; skip git pull." -ForegroundColor DarkGray
    }
  } else {
    Write-Host "Skip git sync (not a repo)." -ForegroundColor DarkGray
  }
} else {
  Write-Host "SkipPull enabled." -ForegroundColor DarkGray
}

Write-Section "Optional: Vercel same commit gate"
if ($RequireVercelSameCommit) {
  $vercelHost = Resolve-VercelProdUrl -ProvidedValue $VercelProdUrlOrHost
  Test-VercelSameCommit -TargetHost $vercelHost -ExpectedVercelEnv $VercelEnv
} else {
  Write-Host "Vercel same commit gate: (skipped)" -ForegroundColor DarkGray
}

Write-Section "Clean build artifacts"
if (Test-Path ".\.next") {
  Write-Host "Removing .next directory" -ForegroundColor Yellow
  Remove-Item -Recurse -Force ".\.next" -ErrorAction SilentlyContinue
} else {
  Write-Host ".next not found (skip)" -ForegroundColor DarkGray
}

Write-Section "Kill ports"
foreach ($p in $KillPorts) { Stop-Port -Port $p }

Write-Section "Install (npm ci)"
if (-not $SkipNpmCi) { Run "npm" @("ci") }
else { Write-Host "SkipNpmCi enabled." -ForegroundColor DarkGray }

Write-Section "Build (npm run build)"
if (-not $SkipBuild) {
  Run "npm" @("run","build")
  Write-Host "BUILD OK" -ForegroundColor Green
} else {
  Write-Host "SkipBuild enabled." -ForegroundColor DarkGray
}

Write-Section "Runtime server"
if (-not $SkipDev) {
  if ($ProdSmoke) {
    Write-Host "ProdSmoke approximates Vercel runtime; dev may differ." -ForegroundColor Yellow
    Write-Host ("Starting prod smoke: npm run start -- -p {0}" -f $DevPort) -ForegroundColor Cyan
    Run "npm" @("run","start","--","-p","$DevPort")
  } else {
    Write-Host ("Starting dev: npm run dev -- --webpack -p {0}" -f $DevPort) -ForegroundColor Cyan
    Run "npm" @("run","dev","--","--webpack","-p","$DevPort")
  }
} else {
  Write-Host "SkipDev enabled." -ForegroundColor DarkGray
}

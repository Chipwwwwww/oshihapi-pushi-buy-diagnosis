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
  [switch]$RequireVercelSameCommit,
  [string]$VercelProdUrlOrHost,

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
  $target = ""
  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    $target = $ProvidedValue.Trim()
  }

  if ([string]::IsNullOrWhiteSpace($target)) {
    $hostFile = ".\ops\vercel_prod_host.txt"
    if (Test-Path $hostFile) {
      $line = Get-Content -Path $hostFile -TotalCount 1 -ErrorAction SilentlyContinue
      if (-not [string]::IsNullOrWhiteSpace($line)) {
        $target = $line.Trim()
      }
    }
  }

  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($env:OSH_VERCEL_PROD_HOST)) {
    $target = $env:OSH_VERCEL_PROD_HOST.Trim()
  }

  if ([string]::IsNullOrWhiteSpace($target)) {
    throw "Missing Vercel production host. Set -VercelProdUrlOrHost, or ops/vercel_prod_host.txt, or OSH_VERCEL_PROD_HOST."
  }

  if ($target -notmatch '^https?://') {
    $target = "https://$target"
  }

  return $target.TrimEnd('/')
}

function Test-VercelSameCommit([string]$TargetUrl) {
  if (-not $gitOk) {
    throw "-RequireVercelSameCommit requires git repo."
  }

  $localSha = (& git rev-parse HEAD) 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($localSha)) {
    throw "Unable to determine local commit SHA via git rev-parse HEAD."
  }
  $localSha = $localSha.Trim()

  $endpoint = "$TargetUrl/api/version"
  Write-Host ("Checking Vercel commit: {0}" -f $endpoint) -ForegroundColor DarkGray
  $resp = Invoke-RestMethod -Uri $endpoint -TimeoutSec 10
  $vercelSha = ""
  if ($null -ne $resp -and $null -ne $resp.commitSha) {
    $vercelSha = [string]$resp.commitSha
  }
  $vercelSha = $vercelSha.Trim()

  if ([string]::IsNullOrWhiteSpace($vercelSha)) {
    throw "Vercel /api/version did not return commitSha."
  }

  if ($vercelSha -ne $localSha) {
    throw ("VERCEL MISMATCH: vercel={0} local={1}" -f $vercelSha, $localSha)
  }

  Write-Host ("Vercel commit gate: OK ({0})" -f $localSha) -ForegroundColor Green
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
  $vercelUrl = Resolve-VercelProdUrl -ProvidedValue $VercelProdUrlOrHost
  Test-VercelSameCommit -TargetUrl $vercelUrl
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
    Write-Host ("Starting prod smoke: npx next start -p {0}" -f $DevPort) -ForegroundColor Cyan
    Run "npx" @("next","start","-p","$DevPort")
  } else {
    Write-Host ("Starting dev: npm run dev -- --webpack -p {0}" -f $DevPort) -ForegroundColor Cyan
    Run "npm" @("run","dev","--","--webpack","-p","$DevPort")
  }
} else {
  Write-Host "SkipDev enabled." -ForegroundColor DarkGray
}

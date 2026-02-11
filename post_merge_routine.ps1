<# 
oshihapi post_merge_routine.ps1 (Windows PowerShell)
Goal: after merging/pulling, make Local + Vercel Production deterministic and identical.

What it does (default):
1) (optional) git fetch/pull
2) fail-fast: detect merge conflict markers (<<<<<<< ======= >>>>>>>)
3) Vercel parity gate: wait until https://<PROD_HOST>/api/version matches local HEAD (requires PROD_HOST)
4) clean .next, kill dev ports, npm ci, npm run build
5) start dev server: npm run dev -- --webpack -p <PORT>

Usage:
  .\post_merge_routine.ps1
  .\post_merge_routine.ps1 -SkipDev
  .\post_merge_routine.ps1 -SkipPull
  .\post_merge_routine.ps1 -ProdHost "your-project.vercel.app"
  .\post_merge_routine.ps1 -SkipVercelParity   # emergency bypass
#>

[CmdletBinding()]
param(
  [switch]$SkipPull,
  [switch]$SkipNpmCi,
  [switch]$SkipBuild,
  [switch]$SkipDev,
  [switch]$SkipVercelParity,
  [int]$Port = 3000,

  # If set, the script will FAIL if prod host is not configured.
  [switch]$RequireVercelParity = $true,

  # Host only (no https://). Can also be set via env:OSH_VERCEL_PROD_HOST or ops/vercel_prod_host.txt
  [string]$ProdHost = "",

  [int]$VercelRetries = 12,        # 12*10s = 120s default
  [int]$VercelRetrySleepSec = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host ("=" * 78) -ForegroundColor DarkGray
  Write-Host $title -ForegroundColor Cyan
  Write-Host ("=" * 78) -ForegroundColor DarkGray
}

function Run([string]$cmd, [string[]]$args = @()) {
  Write-Host ("Running: " + $cmd + " " + ($args -join " ")) -ForegroundColor DarkGray
  & $cmd @args
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed (exit=$LASTEXITCODE): $cmd $($args -join ' ')"
  }
}

function Ensure-RepoRoot {
  if (-not (Test-Path ".git")) {
    throw "Please run this script from the repo root (folder that contains .git). Current: $(Get-Location)"
  }
}

function Kill-Port([int]$p) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -Unique -ExpandProperty OwningProcess
    foreach ($pid in ($conns | Where-Object { $_ -and $_ -ne 0 } | Select-Object -Unique)) {
      try {
        Write-Host "Killing PID $pid (port $p)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      } catch {}
    }
  } catch {
    # Get-NetTCPConnection may be unavailable on some systems; fallback to netstat
    $lines = & netstat -ano | Select-String (":$p\s")
    foreach ($line in $lines) {
      $parts = ($line -split "\s+") | Where-Object { $_ -ne "" }
      $pid = $parts[-1]
      if ($pid -match "^\d+$") {
        try {
          Write-Host "Killing PID $pid (port $p)..." -ForegroundColor Yellow
          taskkill /PID $pid /F | Out-Null
        } catch {}
      }
    }
  }
}

function Normalize-Host([string]$h) {
  if (-not $h) { return "" }
  $x = $h.Trim()
  $x = $x -replace '^https?://', ''
  $x = $x.TrimEnd('/')
  return $x
}

function Get-ProdHost {
  if ($ProdHost) { return (Normalize-Host $ProdHost) }

  $envHost = $env:OSH_VERCEL_PROD_HOST
  if ($envHost) { return (Normalize-Host $envHost) }

  $file = Join-Path (Get-Location) "ops\vercel_prod_host.txt"
  if (Test-Path $file) {
    $line = (Get-Content $file -ErrorAction SilentlyContinue | Select-Object -First 1)
    return (Normalize-Host $line)
  }

  return ""
}

function Detect-ConflictMarkers {
  Write-Section "[post_merge_routine] Fast guard (conflict markers)"
  $paths = @("app", "src", "components", "ops", "docs", "post_merge_routine.ps1")
  try {
    $out = & git grep -n -I -E "^(<<<<<<<|=======|>>>>>>>)" -- $paths 2>$null
    if ($LASTEXITCODE -eq 0 -and $out) {
      Write-Host "Conflict markers detected:" -ForegroundColor Red
      $out | ForEach-Object { Write-Host $_ -ForegroundColor Red }
      throw "Conflict markers detected. Resolve them before running post_merge_routine."
    }
  } catch {
    # If git grep fails (e.g., paths missing), still allow; but keep it noisy.
    Write-Host "Warning: conflict marker scan skipped/failed: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

function Get-LocalHead {
  return (& git rev-parse HEAD).Trim()
}

function Invoke-Json([string]$url) {
  # Use Invoke-RestMethod but with useful error message
  try {
    return Invoke-RestMethod -Uri $url -TimeoutSec 10 -Headers @{ "Cache-Control"="no-cache" }
  } catch {
    $msg = $_.Exception.Message
    throw "Cannot reach $url ($msg)"
  }
}

function Vercel-ParityGate {
  if ($SkipVercelParity) {
    Write-Section "[post_merge_routine] Vercel parity gate (SKIPPED)"
    return
  }

  $host = Get-ProdHost

  if (-not $host) {
    $hint = @(
      "Prod host is not set.",
      "Set one of:",
      "  1) ops\vercel_prod_host.txt (host only, e.g. oshihapi-pushi-buy-diagnosis.vercel.app)",
      "  2) env var: setx OSH_VERCEL_PROD_HOST ""oshihapi-pushi-buy-diagnosis.vercel.app"" (restart PowerShell)",
      "  3) pass: .\post_merge_routine.ps1 -ProdHost ""..."""
    ) -join "`n"
    if ($RequireVercelParity) { throw $hint }
    Write-Host $hint -ForegroundColor Yellow
    return
  }

  $localSha = Get-LocalHead
  $url = "https://$host/api/version"

  Write-Section "[post_merge_routine] Vercel parity gate"
  Write-Host "LOCAL SHA = $localSha" -ForegroundColor Cyan
  Write-Host "PROD HOST = $host" -ForegroundColor Cyan
  Write-Host "URL      = $url" -ForegroundColor DarkGray

  for ($i=1; $i -le $VercelRetries; $i++) {
    try {
      $ver = Invoke-Json $url

      $remoteSha = ""
      if ($null -ne $ver.commitSha) { $remoteSha = [string]$ver.commitSha }
      $remoteSha = $remoteSha.Trim()

      if (-not $remoteSha -or $remoteSha -eq "unknown") {
        throw "commitSha empty/unknown (vercelEnv=$($ver.vercelEnv))"
      }

      if ($remoteSha -eq $localSha) {
        Write-Host "VERCEL == LOCAL ✅ ($localSha) (vercelEnv=$($ver.vercelEnv))" -ForegroundColor Green
        return
      }

      Write-Host "Attempt $i/$VercelRetries: mismatch remote=$remoteSha local=$localSha (vercelEnv=$($ver.vercelEnv)). Waiting ${VercelRetrySleepSec}s..." -ForegroundColor Yellow
    } catch {
      $msg = $_.Exception.Message
      # common: 404 when /api/version is not deployed yet
      Write-Host "Attempt $i/$VercelRetries: cannot reach $url ($msg). Waiting ${VercelRetrySleepSec}s..." -ForegroundColor Yellow
    }

    Start-Sleep -Seconds $VercelRetrySleepSec
  }

  throw "VERCEL MISMATCH (after $VercelRetries retries): expected $localSha. Check that /api/version exists and Vercel Production has deployed the same commit, and that ops/vercel_prod_host.txt points to the PRODUCTION domain (not a preview domain)."
}

Write-Section "[post_merge_routine] Boot"
Ensure-RepoRoot
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host "Repo: $(Get-Location)" -ForegroundColor DarkGray

Write-Section "[post_merge_routine] Git context"
if (-not $SkipPull) {
  Run git @("fetch", "--all", "--prune")
  # Safe pull for current branch
  Run git @("pull", "--ff-only")
} else {
  Write-Host "SkipPull enabled." -ForegroundColor Yellow
}

Detect-ConflictMarkers
Vercel-ParityGate

Write-Section "[post_merge_routine] Clean build artifacts"
if (Test-Path ".next") {
  Write-Host "Removing .next directory" -ForegroundColor DarkGray
  Remove-Item -Recurse -Force ".next"
}

Write-Section "[post_merge_routine] Kill ports"
Kill-Port 3000
Kill-Port 3001
Kill-Port 3002

Write-Section "[post_merge_routine] Install (npm ci)"
if (-not $SkipNpmCi) {
  Run npm @("ci")
} else {
  Write-Host "SkipNpmCi enabled." -ForegroundColor Yellow
}

Write-Section "[post_merge_routine] Build (npm run build)"
if (-not $SkipBuild) {
  Run npm @("run", "build")
  Write-Host "BUILD OK" -ForegroundColor Green
} else {
  Write-Host "SkipBuild enabled." -ForegroundColor Yellow
}

Write-Section "[post_merge_routine] Dev server"
if ($SkipDev) {
  Write-Host "SkipDev enabled." -ForegroundColor Yellow
  exit 0
}

Write-Host "Starting dev: npm run dev -- --webpack -p $Port" -ForegroundColor Cyan
# do not use Run() because dev is long-running
& npm run dev -- --webpack -p $Port

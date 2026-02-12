#requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$SkipDev,
  [int]$DevPort = 3000,
  [switch]$SkipParity,
  [int]$ParityTimeoutSec = 180,
  [string]$ProdHost = "",
  [string]$PreviewHost = ""
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

# --- TLS (for Invoke-WebRequest in parity probe) ---
try {
  [Net.ServicePointManager]::SecurityProtocol =
    [Net.SecurityProtocolType]::Tls12 -bor `
    [Net.SecurityProtocolType]::Tls11 -bor `
    [Net.SecurityProtocolType]::Tls
} catch {}

$script:ScriptPath = $PSCommandPath
$script:RepoRoot   = $PSScriptRoot
$script:Fatal      = $false

$script:Status = [ordered]@{
  Sync   = "skipped"
  Install= "skipped"
  Build  = "skipped"
  Parity = "skipped"
  Dev    = "skipped"
}

function Write-Section([string]$Title) {
  $line = ('=' * 62)
  Write-Host ""
  Write-Host $line -ForegroundColor DarkGray
  Write-Host $Title -ForegroundColor Cyan
  Write-Host $line -ForegroundColor DarkGray
}
function OK([string]$m){ Write-Host ("✅ " + $m) -ForegroundColor Green }
function WARN([string]$m){ Write-Host ("⚠ " + $m) -ForegroundColor Yellow }
function FAIL([string]$m){ Write-Host ("❌ " + $m) -ForegroundColor Red }

function Get-RepoRootSafe {
  if ($script:RepoRoot -and (Test-Path $script:RepoRoot)) { return $script:RepoRoot }
  if ($script:ScriptPath -and (Test-Path $script:ScriptPath)) {
    $p = Split-Path -Parent $script:ScriptPath
    if ($p -and (Test-Path $p)) { return $p }
  }
  try {
    $top = (& git rev-parse --show-toplevel 2>$null | Out-String).Trim()
    if ($top -and (Test-Path $top)) { return $top }
  } catch {}
  return (Get-Location).Path
}

function Parse-SelfSafe {
  try {
    if (-not $script:ScriptPath) { return $false }
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $script:ScriptPath), [ref]$null, [ref]$errors) | Out-Null
    return (-not $errors -or $errors.Count -eq 0)
  } catch { return $false }
}

function GitText {
  param([string[]]$ArgList)
  if (-not $ArgList -or $ArgList.Count -eq 0) { return "" }
  try {
    $out = & git @ArgList 2>&1
    return ($out | Out-String).Trim()
  } catch { return "" }
}

function Run-Native {
  param(
    [string]$Label,
    [string]$File,
    [string[]]$ArgList,
    [switch]$AllowFail
  )
  $cmdLine = $File + " " + (($ArgList | ForEach-Object { $_ }) -join " ")
  Write-Host ("Running: " + $cmdLine) -ForegroundColor DarkGray

  $code = 1
  try {
    & $File @ArgList 2>&1 | ForEach-Object { Write-Host $_ }
    $code = [int]$LASTEXITCODE
  } catch {
    $code = 1
  }

  if ($code -ne 0) {
    FAIL ("{0} failed (exit={1})" -f $Label, $code)
    if (-not $AllowFail) { $script:Fatal = $true }
  } else {
    OK ("{0}: OK" -f $Label)
  }
  return $code
}

function Kill-Port([int]$Port) {
  try {
    $lines = (netstat -ano | Select-String (":{0}\s" -f $Port)).Line
    $pids = @()
    foreach ($line in $lines) {
      $parts = ($line -split "\s+") | Where-Object { $_ -ne "" }
      if ($parts.Count -ge 5) {
        $pid = $parts[-1]
        if ($pid -match "^\d+$") { $pids += [int]$pid }
      }
    }
    $pids = $pids | Sort-Object -Unique
    foreach ($pid in $pids) { try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue | Out-Null } catch {} }
  } catch {}
}

function Has-FileInHead([string]$RepoPath) {
  try {
    & git cat-file -e ("HEAD:{0}" -f $RepoPath) 2>$null
    return ($LASTEXITCODE -eq 0)
  } catch { return $false }
}

function Get-FirstLine([string]$Path) {
  try { if (Test-Path $Path) { return (Get-Content -LiteralPath $Path | Select-Object -First 1).Trim() } } catch {}
  return $null
}

function Normalize-Host([string]$h) {
  if (-not $h) { return "" }
  $h = $h.Trim()
  $h = $h -replace "^https?://", ""
  $h = $h.TrimEnd("/")
  return $h
}

function Get-Target([string]$curBranch, [string]$prodBranch) {
  if ([string]::IsNullOrWhiteSpace($curBranch) -or [string]::IsNullOrWhiteSpace($prodBranch)) { return "prod" }
  if ($curBranch -eq $prodBranch) { return "prod" }
  return "preview"
}

function Get-VercelHost([string]$target) {
  if ($target -eq "prod") {
    if ($ProdHost) { return (Normalize-Host $ProdHost) }
    if ($env:OSH_VERCEL_PROD_HOST) { return (Normalize-Host $env:OSH_VERCEL_PROD_HOST) }
    return (Normalize-Host (Get-FirstLine ".\ops\vercel_prod_host.txt"))
  } else {
    if ($PreviewHost) { return (Normalize-Host $PreviewHost) }
    if ($env:OSH_VERCEL_PREVIEW_HOST) { return (Normalize-Host $env:OSH_VERCEL_PREVIEW_HOST) }
    return (Normalize-Host (Get-FirstLine ".\ops\vercel_preview_host.txt"))
  }
}

function Get-RemoteSha([string]$vercelHost) {
  if ([string]::IsNullOrWhiteSpace($vercelHost)) { return "" }
  $ts = [int](Get-Date -UFormat %s)
  $url = ("https://{0}/api/version?t={1}" -f $vercelHost, $ts)
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -Method Get -Headers @{ 'Cache-Control'='no-cache'; 'Pragma'='no-cache' } -TimeoutSec 15 -ErrorAction Stop
    $json = $resp.Content | ConvertFrom-Json -ErrorAction Stop
    if ($json -and $json.commitSha) { return ("" + $json.commitSha).Trim() }
  } catch {}
  return ""
}

function Wait-ForParity([string]$vercelHost, [string]$expectSha, [int]$timeoutSec) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    $remote = Get-RemoteSha -vercelHost $vercelHost
    if ($remote -and ($remote -eq $expectSha)) { return $true }
    Start-Sleep -Seconds 5
  }
  return $false
}

function New-DebugBundle {
  try {
    if (-not (Test-Path ".\ops")) { New-Item -ItemType Directory -Path ".\ops" | Out-Null }
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $tmp = Join-Path ".\ops" ("pmr_debug_tmp_" + $ts)
    New-Item -ItemType Directory -Path $tmp | Out-Null

    $snap = @()
    $snap += "Time: " + (Get-Date)
    $snap += "Repo: " + (Get-Location).Path
    $snap += ""
    $snap += "=== POWERSHELL ==="
    $snap += ($PSVersionTable | Out-String)
    $snap += ""
    $snap += "=== NODE / NPM ==="
    $snap += ("node: " + (& node -v 2>$null))
    $snap += ("npm : " + (& npm -v 2>$null))
    $snap += ""
    $snap += "=== GIT ==="
    $snap += (GitText @("branch","--show-current"))
    $snap += (GitText @("log","-1","--oneline","--decorate"))
    $snap += (GitText @("status","--porcelain"))
    $snap | Set-Content -Encoding UTF8 (Join-Path $tmp "env_and_git_snapshot.txt")

    if ($script:ScriptPath -and (Test-Path $script:ScriptPath)) {
      Copy-Item -LiteralPath $script:ScriptPath (Join-Path $tmp "post_merge_routine.ps1") -Force
    }

    $zip = Join-Path ".\ops" ("pmr_debug_bundle_" + $ts + ".zip")
    if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
    Compress-Archive -Path (Join-Path $tmp "*") -DestinationPath $zip -Force
    Remove-Item -LiteralPath $tmp -Recurse -Force
    OK ("Debug bundle created: " + (Resolve-Path $zip))
  } catch {
    WARN "Debug bundle creation failed (ignored)."
  }
}

function Run-DevWithReadyBanner([int]$port) {
  $url = ("http://localhost:{0}" -f $port)
  Write-Host ("⏳ Waiting for {0} ..." -f $url) -ForegroundColor DarkGray

  $shown = $false
  & npm.cmd run dev -- --webpack -p $port 2>&1 | ForEach-Object {
    $line = [string]$_
    Write-Host $line
    if (-not $shown) {
      if ($line -match "(?i)Ready in" -or
          $line -match "(?i)\bready\b" -or
          $line -match "(?i)started server" -or
          $line -match ("(?i)http://localhost:{0}\b" -f $port) -or
          $line -match "(?i)\bLocal:\s*http://localhost") {
        OK ("Local 起動OK: {0}" -f $url)
        $shown = $true
      }
    }
  }
}

# =========================
# MAIN
# =========================
$root = Get-RepoRootSafe
if ($root -and (Test-Path $root)) { Set-Location $root }

Write-Section "[post_merge_routine] Boot"
Write-Host ("Time: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host ("Repo: " + (Get-Location).Path)

if (Parse-SelfSafe) { OK "PowerShell parser check: OK" } else { FAIL "PowerShell parser check: FAILED"; New-DebugBundle; return }

Write-Section "[post_merge_routine] Git context"
$branch = (GitText @("branch","--show-current"))
$head   = (GitText @("rev-parse","HEAD"))
Write-Host ("Branch: " + $branch) -ForegroundColor Green
Write-Host ("Commit: " + $head) -ForegroundColor Green

$up = (GitText @("rev-parse","@{u}"))
if ($up -and ($up -notmatch "fatal:")) {
  $div = (GitText @("rev-list","--left-right","--count","@{u}...HEAD"))
  Write-Host ("Upstream: " + $up) -ForegroundColor DarkGray
  Write-Host ("Divergence(upstream...HEAD): " + $div) -ForegroundColor DarkGray
} else {
  WARN "No upstream configured; skipping divergence check."
}

Write-Section "[post_merge_routine] Sync remote"
[void](Run-Native -Label "git fetch" -File "git" -ArgList @("fetch","--all","--prune") -AllowFail)
if ($up -and ($up -notmatch "fatal:")) {
  [void](Run-Native -Label "git pull" -File "git" -ArgList @("pull","--ff-only") -AllowFail)
} else {
  WARN "No upstream; skipping git pull."
}
$script:Status.Sync = $(if ($script:Fatal) { "fail" } else { "ok" })

Write-Section "[post_merge_routine] Clean build artifacts"
try {
  if (Test-Path ".next") { WARN "Removing .next"; Remove-Item -Recurse -Force ".next" }
  else { OK ".next not found (clean)" }
} catch { WARN ".next cleanup failed (ignored)" }

Write-Section "[post_merge_routine] Kill ports"
Kill-Port 3000; Kill-Port 3001; Kill-Port 3002
OK "Ports cleared (best-effort)"

Write-Section "[post_merge_routine] Install (npm ci)"
if (-not $script:Fatal) {
  $code = Run-Native -Label "npm ci" -File "npm.cmd" -ArgList @("ci")
  $script:Status.Install = $(if ($code -eq 0) { "ok" } else { "fail" })
} else {
  $script:Status.Install = "skipped"
}

Write-Section "[post_merge_routine] Build (npm run build)"
if (-not $script:Fatal -and $script:Status.Install -eq "ok") {
  $code = Run-Native -Label "npm run build" -File "npm.cmd" -ArgList @("run","build")
  $script:Status.Build = $(if ($code -eq 0) { "ok" } else { "fail" })
} else {
  if ($script:Fatal) { $script:Status.Build = "skipped" }
  elseif ($script:Status.Install -ne "ok") { $script:Status.Build = "skipped (install failed)" }
}

Write-Section "[post_merge_routine] Vercel parity gate"
if ($SkipParity) {
  WARN "SkipParity enabled; skipping parity gate."
  $script:Status.Parity = "skipped"
} elseif ($script:Status.Build -ne "ok") {
  WARN "Build not OK; skipping parity gate."
  $script:Status.Parity = "skipped"
} elseif (-not (Has-FileInHead "app/api/version/route.ts")) {
  WARN "HEAD does not contain app/api/version/route.ts (parity probe unavailable)."
  $script:Status.Parity = "skipped"
} else {
  $prodBranch = Get-FirstLine ".\ops\vercel_prod_branch.txt"
  if (-not $prodBranch) { $prodBranch = "feature/urgent-medium-long" }

  $target = Get-Target -curBranch $branch -prodBranch $prodBranch
  $vercelHost = Get-VercelHost -target $target

  if (-not $vercelHost) {
    WARN ("No host configured for target='{0}'. Set ops/vercel_{0}_host.txt or pass -ProdHost/-PreviewHost." -f $target)
    $script:Status.Parity = "skipped"
  } else {
    Write-Host ("Target: {0} (prodBranch={1})" -f $target, $prodBranch) -ForegroundColor DarkGray
    Write-Host ("Host  : " + $vercelHost) -ForegroundColor DarkGray
    Write-Host ("Expect: " + $head) -ForegroundColor DarkGray

    $ok = Wait-ForParity -vercelHost $vercelHost -expectSha $head -timeoutSec $ParityTimeoutSec
    if ($ok) { OK ("Vercel parity OK ({0})" -f $target); $script:Status.Parity="ok" }
    else { WARN ("Vercel parity NOT confirmed within timeout ({0})." -f $target); $script:Status.Parity="not confirmed" }
  }
}

Write-Section "[post_merge_routine] Summary"
Write-Host ("Sync   : " + $script:Status.Sync)    -ForegroundColor Cyan
Write-Host ("Install: " + $script:Status.Install) -ForegroundColor Cyan
Write-Host ("Build  : " + $script:Status.Build)   -ForegroundColor Cyan
Write-Host ("Parity : " + $script:Status.Parity)  -ForegroundColor Cyan

New-DebugBundle

Write-Section "[post_merge_routine] Dev server"
if ($SkipDev) {
  WARN "SkipDev enabled; not starting dev server."
  $script:Status.Dev = "skipped"
} elseif ($script:Status.Build -ne "ok") {
  WARN "Build not OK; not starting dev server."
  $script:Status.Dev = "skipped"
} else {
  WARN ("Starting dev: npm run dev -- --webpack -p " + $DevPort)
  $script:Status.Dev = "running"
  Run-DevWithReadyBanner -port $DevPort
}

[CmdletBinding()]
param(
  [string]$ProdUrl = "https://oshihapi-pushi-buy-diagnosis.vercel.app",
  [switch]$RunKeywordScan,
  [switch]$RunNpmBuild
)

$ErrorActionPreference = "Stop"

function Ok($msg){ Write-Host "✅ $msg" -ForegroundColor Green }
function Warn($msg){ Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Fail($msg){ Write-Host "❌ $msg" -ForegroundColor Red }

function Exec([string]$cmd){
  Write-Host "▶ $cmd" -ForegroundColor Cyan
  & powershell -NoProfile -Command $cmd
  if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $cmd" }
}

# --- locate repo root ---
$root = (& git rev-parse --show-toplevel 2>$null).Trim()
if (-not $root) { throw "Not a git repo (cannot find .git). Run this from the repo folder." }
Set-Location $root
Ok "Repo root: $root"

# --- git status / branch / sha ---
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
$head   = (& git rev-parse HEAD).Trim()
$originMain = (& git rev-parse origin/main 2>$null).Trim()

Write-Host "`n=== GIT ===" -ForegroundColor White
"branch     : $branch"
"HEAD       : $head"
"origin/main: $originMain"
if ($branch -ne "main") { Warn "You are on '$branch' (expected main)." }
if ($originMain -and $originMain -ne $head) { Warn "HEAD != origin/main (pull/fetch?)" } else { Ok "HEAD matches origin/main" }

# --- must-have paths (PR39–PR80+ core) ---
Write-Host "`n=== MUST-HAVE PATHS (LiteralPath) ===" -ForegroundColor White
$mustPaths = @(
  "post_merge_routine.ps1",
  "app\api\telemetry\route.ts",
  "app\api\telemetry\health\route.ts",
  "app\api\version\route.ts",
  "app\flow\FlowClient.tsx",
  "app\page.tsx",
  "app\history\page.tsx",
  "app\result\[runId]\page.tsx",
  "docs\restore_main_pr39_to_80plus_report.md"
)

$missing = @()
foreach($p in $mustPaths){
  $full = Join-Path $root $p
  $mark = "❌"
  if (Test-Path -LiteralPath $full) { $mark = "✅" } else { $missing += $p }
  "{0}  {1}" -f $mark, $p
}
if ($missing.Count -gt 0) {
  Warn ("Missing paths: " + ($missing -join ", "))
} else {
  Ok "All must-have paths present"
}

# --- optional keyword scan ---
if ($RunKeywordScan) {
  Write-Host "`n=== KEYWORD SCAN COUNTS ===" -ForegroundColor White
  $targets = @("styleMode","presentation","localStorage","parity","local ready","telemetry","/api/version")
  $files = Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.ps1,*.md -ErrorAction SilentlyContinue
  foreach($t in $targets){
    $c = ($files | Select-String -Pattern $t -SimpleMatch -ErrorAction SilentlyContinue).Count
    "{0,-14} {1}" -f $t, $c
  }
  Ok "Keyword scan done"
} else {
  Warn "Keyword scan skipped (run with -RunKeywordScan)"
}

# --- PROD smoke: /api/version & /api/telemetry/health ---
Write-Host "`n=== PROD SMOKE ===" -ForegroundColor White
try {
  $verRaw = (Invoke-WebRequest "$ProdUrl/api/version" -UseBasicParsing).Content
  $ver = $verRaw | ConvertFrom-Json
  "PROD /api/version: $verRaw"
  "PROD gitRef     : $($ver.gitRef)"
  "PROD commitSha  : $($ver.commitSha)"
  "Match HEAD      : " + ($($ver.commitSha) -eq $head)

  if ($ver.gitRef -ne "main") { Warn "PROD gitRef is '$($ver.gitRef)' (expected main)" }
  if ($ver.commitSha -ne $head) { Warn "PROD commitSha != HEAD (deploy may be behind)" } else { Ok "PROD commit matches HEAD" }
} catch {
  Fail "PROD /api/version FAIL: $($_.Exception.Message)"
}

try {
  $hRaw = (Invoke-WebRequest "$ProdUrl/api/telemetry/health" -UseBasicParsing).Content
  "PROD /api/telemetry/health: $hRaw"
  $h = $hRaw | ConvertFrom-Json
  if ($h.ok -eq $true) { Ok "Telemetry health ok" } else { Warn "Telemetry health not ok" }
} catch {
  Fail "PROD /api/telemetry/health FAIL: $($_.Exception.Message)"
}

# --- optional npm build gate ---
if ($RunNpmBuild) {
  Write-Host "`n=== NPM BUILD GATE ===" -ForegroundColor White
  Exec "npm ci"
  Exec "npm run build"
  Ok "npm ci + build passed"
} else {
  Warn "npm build gate skipped (run with -RunNpmBuild)"
}

Write-Host "`n=== DONE ===" -ForegroundColor White
Ok "Verification finished"

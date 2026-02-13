[CmdletBinding()]
param(
  [switch]$SkipDev,
  [switch]$SkipParity,
  [int]$DevPort = 3000,
  [int]$DevTimeoutSec = 75,

  [string]$ProvidedProdHost,
  [string]$ProvidedPreviewHost,
  [string]$ProvidedProdBranch
)

# PowerShell 5.1 safe, deterministic, diagnosable
$ErrorActionPreference = "Stop"

function NowStamp { Get-Date -Format "yyyyMMdd_HHmmss" }
function SafeStr([object]$x) { if ($null -eq $x) { return "" } return $x.ToString() }

function Get-RepoRoot {
  $r = (& git rev-parse --show-toplevel 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($r)) { throw "Not inside a git repo. Please cd into your repo first." }
  return $r.Trim()
}

function Ensure-RepoRoot {
  $r = Get-RepoRoot
  Set-Location $r
  return $r
}

function Choose-NpmExe {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  $cmd2 = Get-Command npm -ErrorAction SilentlyContinue
  if ($cmd2 -and $cmd2.Source) { return $cmd2.Source }
  return "npm"
}

function Kill-Ports([int[]]$ports) {
  foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      $owningPid = $c.OwningProcess
      if ($owningPid -and $owningPid -ne 0) {
        try {
          Stop-Process -Id $owningPid -Force -ErrorAction Stop
          Write-Host ("🧹 Killed PID {0} (port {1})" -f $owningPid, $p) -ForegroundColor Yellow
        } catch {
          Write-Host ("⚠️ Cannot kill PID {0} (port {1}): {2}" -f $owningPid, $p, $_.Exception.Message) -ForegroundColor Yellow
        }
      }
    }
  }
}

function Safe-Remove([string]$path) {
  if (Test-Path $path) {
    try {
      Remove-Item $path -Recurse -Force -ErrorAction Stop
      Write-Host ("🗑️ Removed {0}" -f $path) -ForegroundColor DarkGray
    } catch {
      Write-Host ("⚠️ Failed removing {0}: {1}" -f $path, $_.Exception.Message) -ForegroundColor Yellow
    }
  }
}

function Append-Log([string]$logPath, [string]$line) {
  $line | Add-Content -Encoding UTF8 $logPath
}

function Run-External([string]$label, [string]$exe, [string[]]$CmdArgs, [string]$logPath) {
  Write-Host ("▶ {0}" -f $label) -ForegroundColor Cyan
  Append-Log $logPath ("[{0}] {1} {2}" -f (Get-Date -Format o), $exe, ($CmdArgs -join " "))

  # stream to console + log (deterministic)
  & $exe @CmdArgs 2>&1 | Tee-Object -FilePath $logPath -Append | Out-Host

  if ($LASTEXITCODE -ne 0) {
    throw ("FAILED: {0} (exit={1}). See log: {2}" -f $label, $LASTEXITCODE, $logPath)
  }
}

function Read-FirstLine([string]$path) {
  if (-not (Test-Path $path)) { return $null }
  $x = Get-Content -LiteralPath $path -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($x) { return $x.Trim() }
  return $null
}

function Copy-SupportSummary([string]$root, [string]$stage, [string]$logPath, [string]$bundlePath) {
  try {
    $head = SafeStr ((& git rev-parse HEAD 2>$null) | Select-Object -First 1)
    $branch = SafeStr ((& git branch --show-current 2>$null) | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($branch)) { $branch = "DETACHED" }

    $portLine = "Port 3000 not listening."
    try {
      $c = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($c) {
        $owningPid = $c.OwningProcess
        $proc = Get-CimInstance Win32_Process -Filter ("ProcessId={0}" -f $owningPid) -ErrorAction SilentlyContinue
        $portLine = ("Port3000 PID={0}`nCMD={1}" -f $owningPid, (SafeStr $proc.CommandLine))
      }
    } catch {}

    $tail = "(no log tail)"
    if (Test-Path $logPath) { $tail = (Get-Content -LiteralPath $logPath -Tail 120 -ErrorAction SilentlyContinue) -join "`n" }

    $txt = @()
    $txt += "=== PMR AUTO SUMMARY ==="
    $txt += ("time: {0}" -f (Get-Date -Format o))
    $txt += ("repo: {0}" -f $root)
    $txt += ("branch: {0}" -f $branch)
    $txt += ("head: {0}" -f $head)
    $txt += ("stage: {0}" -f $stage)
    $txt += ("log: {0}" -f $logPath)
    $txt += ("bundle: {0}" -f $bundlePath)
    $txt += ""
    $txt += "=== port 3000 ==="
    $txt += $portLine
    $txt += ""
    $txt += "=== log tail (last 120) ==="
    $txt += $tail

    $final = ($txt -join "`n")
    try { Set-Clipboard -Value $final } catch {}
  } catch {}
}

function Write-DebugBundle([string]$root, [string]$stage, [string]$logPath, [string]$devOut, [string]$devErr) {
  $zip = $null
  try {
    $stamp = NowStamp
    $opsDir = Join-Path $root "ops"
    New-Item -ItemType Directory -Force -Path $opsDir | Out-Null

    $tmp = Join-Path $opsDir ("pmr_bundle_{0}" -f $stamp)
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null

    $head = SafeStr ((& git rev-parse HEAD 2>$null) | Select-Object -First 1)
    $branch = SafeStr ((& git branch --show-current 2>$null) | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($branch)) { $branch = "DETACHED" }

    $snap = Join-Path $tmp "env_and_git_snapshot.txt"
@"
time: $(Get-Date -Format o)
pwd : $(Get-Location)
head: $head
branch: $branch
stage: $stage
node: $(node -v 2>$null)
npm : $(npm -v 2>$null)
status:
$(git status -sb)
"@ | Set-Content -Encoding UTF8 $snap

    if (Test-Path $logPath) { Copy-Item $logPath (Join-Path $tmp "pmr.log.txt") -Force }
    if (Test-Path ".\post_merge_routine.ps1") { Copy-Item ".\post_merge_routine.ps1" (Join-Path $tmp "post_merge_routine.ps1") -Force }
    if (Test-Path $devOut) { Copy-Item $devOut (Join-Path $tmp "dev.stdout.txt") -Force }
    if (Test-Path $devErr) { Copy-Item $devErr (Join-Path $tmp "dev.stderr.txt") -Force }

    foreach ($f in @("ops\vercel_prod_branch.txt","ops\vercel_prod_host.txt","ops\vercel_preview_host.txt")) {
      if (Test-Path $f) { Copy-Item $f (Join-Path $tmp (Split-Path $f -Leaf)) -Force }
    }

    $zip = Join-Path $opsDir ("pmr_debug_bundle_{0}.zip" -f $stamp)
    if (Test-Path $zip) { Remove-Item $zip -Force -ErrorAction SilentlyContinue }
    Compress-Archive -Path (Join-Path $tmp "*") -DestinationPath $zip -Force

    Write-Host ("📦 Debug bundle: {0}" -f $zip) -ForegroundColor Yellow
    return $zip
  } catch {
    Write-Host ("⚠️ Debug bundle failed: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
    return $zip
  }
}

function Parity-Check([string]$root, [string]$logPath) {
  if ($SkipParity) { Write-Host "ℹ️ Parity: skipped by -SkipParity" -ForegroundColor DarkGray; return }

  $prodBranch = $ProvidedProdBranch
  if ([string]::IsNullOrWhiteSpace($prodBranch)) { $prodBranch = Read-FirstLine (Join-Path $root "ops\vercel_prod_branch.txt") }
  if ([string]::IsNullOrWhiteSpace($prodBranch)) { $prodBranch = "main" }

  $prodHost = $ProvidedProdHost
  if ([string]::IsNullOrWhiteSpace($prodHost)) { $prodHost = Read-FirstLine (Join-Path $root "ops\vercel_prod_host.txt") }

  $previewHost = $ProvidedPreviewHost
  if ([string]::IsNullOrWhiteSpace($previewHost)) { $previewHost = Read-FirstLine (Join-Path $root "ops\vercel_preview_host.txt") }

  $branch = SafeStr ((& git branch --show-current 2>$null) | Select-Object -First 1)
  if ([string]::IsNullOrWhiteSpace($branch)) { $branch = "DETACHED" }

  $targetEnv = "preview"
  if ($branch -eq $prodBranch) { $targetEnv = "prod" }

  $parityHost = $null
  if ($targetEnv -eq "prod") { $parityHost = $prodHost } else { $parityHost = $previewHost }

  if ([string]::IsNullOrWhiteSpace($parityHost)) {
    Write-Host ("ℹ️ Parity: skipped (target={0}, missing host config)" -f $targetEnv) -ForegroundColor DarkGray
    return
  }

  $localSha = (git rev-parse HEAD).Trim()
  $t = [int][double]::Parse((Get-Date -UFormat %s))
  $url = ("https://{0}/api/version?t={1}" -f $parityHost, $t)

  Write-Host ("🔎 Parity: target={0} host={1}" -f $targetEnv, $parityHost) -ForegroundColor Cyan
  try {
    $resp = Invoke-WebRequest -Uri $url -Method Get -Headers @{ "Cache-Control"="no-cache"; "Pragma"="no-cache" } -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    $json = $resp.Content | ConvertFrom-Json
    $remoteSha = [string]$json.commitSha

    if ($remoteSha -eq $localSha) { Write-Host ("✅ Parity OK (commitSha match: {0})" -f $localSha) -ForegroundColor Green }
    else { Write-Host ("⚠️ Parity NOT match. Local={0} Remote={1}" -f $localSha, $remoteSha) -ForegroundColor Yellow }
  } catch {
    Write-Host ("⚠️ Parity failed: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
  }
}

function Wait-DevReady([string]$devOut, [string]$devErr, [int]$port, [string]$localSha, [int]$timeoutSec, [System.Diagnostics.Process]$proc) {
  $ready = $false
  for ($i=0; $i -lt $timeoutSec; $i++) {
    # If process crashed, fail early
    try {
      if ($proc.HasExited) {
        $ec = $proc.ExitCode
        throw ("dev process exited early (exit={0})." -f $ec)
      }
    } catch { throw }

    # 1) output-based ready
    try {
      if (Test-Path $devOut) {
        $txt = Get-Content -LiteralPath $devOut -Raw -ErrorAction SilentlyContinue
        if ($txt -match "Ready in" -or $txt -match "✓ Ready") { $ready = $true; break }
      }
    } catch {}

    # 2) endpoint ready (also ensures we aren't seeing stale dev)
    try {
      $t = [int][double]::Parse((Get-Date -UFormat %s))
      $r = Invoke-WebRequest -Uri ("http://localhost:{0}/api/version?t={1}" -f $port, $t) -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
      if ($r.StatusCode -eq 200) {
        $j = $r.Content | ConvertFrom-Json
        if ([string]$j.commitSha -eq $localSha) { $ready = $true; break }
      }
    } catch {}

    Start-Sleep -Seconds 1
  }
  return $ready
}

# ===== MAIN =====
$root = Ensure-RepoRoot
$stamp = NowStamp
$ops = Join-Path $root "ops"
New-Item -ItemType Directory -Force -Path $ops | Out-Null

$logPath = Join-Path $ops ("pmr_log_{0}.txt" -f $stamp)
$devOut  = Join-Path $ops ("pmr_dev_stdout_{0}.txt" -f $stamp)
$devErr  = Join-Path $ops ("pmr_dev_stderr_{0}.txt" -f $stamp)

$label = "INIT"
$bundle = ""
try {
  $label = "KILL_PORTS"
  Kill-Ports @(3000,3001,3002)

  $label = "CLEAN_CACHES"
  Safe-Remove ".\.next"
  Safe-Remove ".\.turbo"
  Safe-Remove ".\node_modules\.cache"

  $npmExe = Choose-NpmExe

  $label = "NPM_CI"
  try {
    Run-External "npm ci" $npmExe @("ci") $logPath
  } catch {
    Write-Host "⚠️ npm ci failed once. Trying cleanup + retry..." -ForegroundColor Yellow
    try { Remove-Item ".\node_modules" -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    try { & $npmExe @("cache","verify") 2>&1 | Tee-Object -FilePath $logPath -Append | Out-Host } catch {}
    Run-External "npm ci (retry)" $npmExe @("ci") $logPath
  }

  $label = "BUILD"
  Run-External "npm run build" $npmExe @("run","build") $logPath

  $localSha = (git rev-parse HEAD).Trim()

  $label = "PARITY"
  Parity-Check $root $logPath

  if (-not $SkipDev) {
    $label = "DEV_START"
    Write-Host ("▶ Start dev: http://localhost:{0}" -f $DevPort) -ForegroundColor Cyan

    if (Test-Path $devOut) { Remove-Item $devOut -Force -ErrorAction SilentlyContinue }
    if (Test-Path $devErr) { Remove-Item $devErr -Force -ErrorAction SilentlyContinue }

    $proc = Start-Process -FilePath $npmExe -ArgumentList @("run","dev","--","--webpack","-p",("{0}" -f $DevPort)) `
      -WorkingDirectory $root -PassThru -NoNewWindow `
      -RedirectStandardOutput $devOut -RedirectStandardError $devErr

    $label = "DEV_WAIT_READY"
    $ok = Wait-DevReady $devOut $devErr $DevPort $localSha $DevTimeoutSec $proc
    if ($ok) {
      Write-Host ("✅ Local 起動OK: http://localhost:{0} (commit {1})" -f $DevPort, $localSha) -ForegroundColor Green
      Write-Host ("   logs: {0} / {1}" -f $devOut, $devErr) -ForegroundColor DarkGray
    } else {
      throw ("Dev not ready in {0}s. Check logs: {1} / {2}" -f $DevTimeoutSec, $devOut, $devErr)
    }
  } else {
    Write-Host "ℹ️ Dev: skipped by -SkipDev" -ForegroundColor DarkGray
  }

  Copy-SupportSummary $root "OK" $logPath ""
  Write-Host ("✅ PMR done. Log: {0}" -f $logPath) -ForegroundColor Green
  exit 0
} catch {
  Write-Host ("❌ PMR failed at {0}: {1}" -f $label, $_.Exception.Message) -ForegroundColor Red
  $bundle = SafeStr (Write-DebugBundle $root $label $logPath $devOut $devErr)
  Copy-SupportSummary $root $label $logPath $bundle
  exit 1
}



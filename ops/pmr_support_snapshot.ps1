[CmdletBinding()]
param(
  [string]$RepoRoot
)

$ErrorActionPreference = "Stop"

function Find-RepoRoot {
  if ($RepoRoot -and (Test-Path $RepoRoot)) { return (Resolve-Path $RepoRoot).Path }
  $r = (& git rev-parse --show-toplevel 2>$null)
  if ($LASTEXITCODE -eq 0 -and $r) { return $r.Trim() }
  throw "Not inside a git repo. Provide -RepoRoot or cd into the repo."
}

function Pick-Latest([string]$dir, [string]$pattern) {
  if (-not (Test-Path $dir)) { return $null }
  $f = Get-ChildItem -LiteralPath $dir -Filter $pattern -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($f) { return $f.FullName }
  return $null
}

$root = Find-RepoRoot
Set-Location $root

$ops = Join-Path $root "ops"
$log = Pick-Latest $ops "pmr_log_*.txt"
$bundle = Pick-Latest $ops "pmr_debug_bundle_*.zip"

$head = (git rev-parse HEAD).Trim()
$branch = (git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) { $branch = "DETACHED" }

$portLine = "Port 3000 not listening."
try {
  $c = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) {
    $pid = $c.OwningProcess
    $proc = Get-CimInstance Win32_Process -Filter ("ProcessId={0}" -f $pid) -ErrorAction SilentlyContinue
    $portLine = ("Port3000 PID={0}`nCMD={1}" -f $pid, ($proc.CommandLine))
  }
} catch {}

$tail = "(no log)"
if ($log -and (Test-Path $log)) { $tail = (Get-Content -LiteralPath $log -Tail 120 -ErrorAction SilentlyContinue) -join "`n" }

$txt = @()
$txt += "=== PMR SUPPORT SNAPSHOT ==="
$txt += ("time: {0}" -f (Get-Date -Format o))
$txt += ("repo: {0}" -f $root)
$txt += ("head: {0}" -f $head)
$txt += ("branch: {0}" -f $branch)
$txt += ""
$txt += "=== git status -sb ==="
$txt += (git status -sb)
$txt += ""
$txt += "=== git log -1 --oneline ==="
$txt += (git log -1 --oneline)
$txt += ""
$txt += "=== port 3000 ==="
$txt += $portLine
$txt += ""
$txt += "=== latest PMR log ==="
$txt += ("{0}" -f $log)
$txt += ""
$txt += "=== latest PMR debug bundle ==="
$txt += ("{0}" -f $bundle)
$txt += ""
$txt += "=== pmr log tail (last 120) ==="
$txt += $tail

$final = ($txt -join "`n")
try { Set-Clipboard -Value $final } catch {}

Write-Host $final

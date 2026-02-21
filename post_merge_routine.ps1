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
  [switch]$SkipParity,
  [switch]$ProdSmoke,
  [Alias('ParityGate')]
  [switch]$RequireVercelSameCommit,
  [switch]$SkipVercelParity,
  [switch]$SkipPush,
  [switch]$AllowPreviewHost,
  [bool]$AutoCheckoutProdBranch = $true,
  [switch]$StrictParity,

  [Alias('ProdHost')]
  [Alias('VercelHost')]
  [string]$VercelProdUrlOrHost,
  [string]$PreviewHost = '',
  [string]$ProdBranch = '',
  [ValidateSet('auto','prod','preview','off')]
  [string]$ParityTarget = 'auto',
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

$script:LastCommandStdout = ''
$script:LastCommandStderr = ''
$script:LastCommandExitCode = 0
$script:PmrStage = 'boot'
$script:PmrExitCode = 0
$script:PmrFailureMessage = ''
$script:PmrLogPath = ''
$script:PmrBundlePath = ''
$script:BuildStatus = 'not run'
$script:BuildFirstTsError = ''
$script:ProdHeadMatch = 'not confirmed'
$script:TelemetryHealthStatus = 'not confirmed'
$script:ParityConclusion = 'not confirmed'
$script:ParityReason = ''
$script:RepoRoot = ''
$script:GitAvailable = $false
$script:NpmCmdPath = ''

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host ("=" * 72) -ForegroundColor DarkGray
  Write-Host ("[post_merge_routine] {0}" -f $Title) -ForegroundColor Cyan
  Write-Host ("=" * 72) -ForegroundColor DarkGray
}

function Run([string]$Command, [string[]]$CmdArgs = @(), [string]$WorkingDirectory = '') {
  if ($Command -eq 'git' -and -not [string]::IsNullOrWhiteSpace($script:RepoRoot)) {
    if ($CmdArgs.Count -lt 2 -or $CmdArgs[0] -ne '-C') {
      $CmdArgs = @('-C', $script:RepoRoot) + $CmdArgs
    }
  }
  $display = if ($CmdArgs.Count -gt 0) { "$Command $($CmdArgs -join ' ')" } else { $Command }
  Write-Host "Running: $display" -ForegroundColor DarkGray
  Invoke-Exec -Command $Command -CmdArgs $CmdArgs -Display $display -WorkingDirectory $WorkingDirectory
}

function Invoke-Exec(
  [Parameter(Mandatory = $true)]
  [string]$Command,
  [string[]]$CmdArgs = @(),
  [string]$Display = '',
  [string]$WorkingDirectory = ''
) {
  $label = if ([string]::IsNullOrWhiteSpace($Display)) {
    if ($CmdArgs.Count -gt 0) { "$Command $($CmdArgs -join ' ')" } else { $Command }
  } else {
    $Display
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $Command
  if ($CmdArgs -and $CmdArgs.Count -gt 0) {
    $psi.Arguments = [string]::Join(' ', ($CmdArgs | ForEach-Object {
      $arg = [string]$_
      if ($arg -match '[\s"]') {
        '"' + ($arg -replace '"', '\"') + '"'
      } else {
        $arg
      }
    }))
  }
  if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    if (-not [string]::IsNullOrWhiteSpace($script:RepoRoot)) {
      $WorkingDirectory = $script:RepoRoot
    } else {
      $WorkingDirectory = (Get-Location).Path
    }
  }
  $psi.WorkingDirectory = $WorkingDirectory
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true

  $commandLeaf = [System.IO.Path]::GetFileName($psi.FileName)
  $commandLeafLower = if ([string]::IsNullOrWhiteSpace($commandLeaf)) { '' } else { $commandLeaf.ToLowerInvariant() }
  $isBatchScript = $commandLeafLower.EndsWith('.cmd') -or $commandLeafLower.EndsWith('.bat')
  $isCmdShim = @('npm','npm.cmd','npx','npx.cmd','pnpm','pnpm.cmd','yarn','yarn.cmd') -contains $commandLeafLower
  if ($isBatchScript -or $isCmdShim) {
    $originalFileName = $psi.FileName
    $originalArgs = $psi.Arguments
    $quotedOriginalFileName = '"' + ($originalFileName -replace '"', '""') + '"'
    $wrappedCmdLine = $quotedOriginalFileName
    if (-not [string]::IsNullOrWhiteSpace($originalArgs)) {
      $wrappedCmdLine += (' ' + $originalArgs)
    }

    $comSpec = $env:ComSpec
    if ([string]::IsNullOrWhiteSpace($comSpec)) {
      $comSpec = 'cmd.exe'
    }

    $psi.FileName = $comSpec
    $psi.Arguments = '/d /s /c "' + $wrappedCmdLine + '"'
  }

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi

  [void]$process.Start()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  $exitCode = $process.ExitCode

  $script:LastCommandStdout = $stdout
  $script:LastCommandStderr = $stderr
  $script:LastCommandExitCode = $exitCode

  if (-not [string]::IsNullOrEmpty($stdout)) {
    Write-Host ($stdout.TrimEnd("`r", "`n"))
  }
  if (-not [string]::IsNullOrEmpty($stderr)) {
    Write-Host ($stderr.TrimEnd("`r", "`n")) -ForegroundColor Yellow
  }

  if ($exitCode -ne 0) {
    Write-Host '---- Captured stdout ----' -ForegroundColor DarkYellow
    if ([string]::IsNullOrWhiteSpace($stdout)) { Write-Host '(empty)' -ForegroundColor DarkGray }
    else { Write-Host ($stdout.TrimEnd("`r", "`n")) }

    Write-Host '---- Captured stderr ----' -ForegroundColor DarkYellow
    if ([string]::IsNullOrWhiteSpace($stderr)) { Write-Host '(empty)' -ForegroundColor DarkGray }
    else { Write-Host ($stderr.TrimEnd("`r", "`n")) -ForegroundColor Yellow }

    throw "Command failed (exit=$exitCode): $label"
  }
}

function Ensure-RepoRoot() {
    $scriptDir = $PSScriptRoot
  if ([string]::IsNullOrWhiteSpace($scriptDir)) { $scriptDir = Split-Path -Parent $PSCommandPath }
  if ([string]::IsNullOrWhiteSpace($scriptDir)) { $scriptDir = (Get-Location).Path }
  $root = ''
  $script:GitAvailable = $false

  if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitRootRaw = (& git -C $scriptDir rev-parse --show-toplevel) 2>$null
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($gitRootRaw)) {
      $root = ($gitRootRaw | Select-Object -First 1).Trim()
      $script:GitAvailable = $true
    }
  }

  if ([string]::IsNullOrWhiteSpace($root)) {
    $root = $scriptDir
  }

  if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json'))) {
    throw "package.json not found. Current: $root"
  }
  return $root
}

function Get-GitValue([string[]]$Args, [string]$ErrorMessage) {
  $value = (& git -C $script:RepoRoot @Args) 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
    throw $ErrorMessage
  }
  return ($value | Select-Object -First 1).Trim()
}

function Get-GitBranchSafe([string]$RepoRoot) {
  $old = Get-Location
  try {
    Set-Location -LiteralPath $RepoRoot
    $branchRaw = (& git rev-parse --abbrev-ref HEAD) 2>$null
    if ($LASTEXITCODE -ne 0 -or $null -eq $branchRaw) { return $null }

    $branch = ($branchRaw | Select-Object -First 1).ToString().Trim()
    if ([string]::IsNullOrWhiteSpace($branch) -or $branch -eq 'HEAD') { return $null }

    return $branch
  } catch {
    return $null
  } finally {
    try { Set-Location -LiteralPath $old.Path } catch {}
  }
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

function Resolve-NpmCmdPath() {
  $preferred = Join-Path $env:ProgramFiles 'nodejs\npm.cmd'
  if (-not [string]::IsNullOrWhiteSpace($preferred) -and (Test-Path -LiteralPath $preferred)) {
    return $preferred
  }

  $nodePath = $null
  try {
    $nodeCandidates = (& where.exe node) 2>$null
    if ($LASTEXITCODE -eq 0 -and $nodeCandidates) {
      $nodePath = ($nodeCandidates | Select-Object -First 1).Trim()
    }
  } catch {}

  if (-not [string]::IsNullOrWhiteSpace($nodePath)) {
    $nodeDir = Split-Path -Parent $nodePath
    if (-not [string]::IsNullOrWhiteSpace($nodeDir)) {
      $fallback = Join-Path $nodeDir 'npm.cmd'
      if (Test-Path -LiteralPath $fallback) {
        return $fallback
      }
    }
  }

  throw 'Unable to resolve npm.cmd. Node.js installation appears invalid. Expected %ProgramFiles%\nodejs\npm.cmd or npm.cmd alongside the first where.exe node result.'
}

function Write-NpmResolutionDiagnostics([string]$ResolvedNpmCmdPath) {
  Write-Host ("Resolved npm.cmd path: {0}" -f $ResolvedNpmCmdPath) -ForegroundColor Cyan

  try {
    Write-Host 'where.exe npm:' -ForegroundColor DarkGray
    $whereNpm = (& where.exe npm) 2>&1
    if ($whereNpm) {
      $whereNpm | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
    } else {
      Write-Host '(no output)' -ForegroundColor DarkGray
    }
  } catch {
    Write-Host ("where.exe npm failed (best effort): {0}" -f $_.Exception.Message) -ForegroundColor Yellow
  }

  try {
    Write-Host 'Get-Command npm -All:' -ForegroundColor DarkGray
    $cmdEntries = Get-Command npm -All -ErrorAction Stop
    if ($cmdEntries) {
      $cmdEntries | ForEach-Object {
        $source = ''
        if ($_.Source) { $source = $_.Source }
        Write-Host ("- {0} [{1}] {2}" -f $_.Name, $_.CommandType, $source) -ForegroundColor DarkGray
      }
    } else {
      Write-Host '(no entries)' -ForegroundColor DarkGray
    }
  } catch {
    Write-Host ("Get-Command npm -All failed (best effort): {0}" -f $_.Exception.Message) -ForegroundColor Yellow
  }
}

function Get-FirstTypeScriptErrorLocation([string]$Text) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return '' }
  $lines = $Text -split "`r?`n"
  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -match '([A-Za-z]:\\[^:\n]+\\.(ts|tsx))\(([0-9]+),([0-9]+)\)') {
      return ("{0}:{1}" -f $Matches[1], $Matches[3])
    }
    if ($line -match '([A-Za-z]:\\[^:\n]+\\.(ts|tsx))[:]([0-9]+)') {
      return ("{0}:{1}" -f $Matches[1], $Matches[3])
    }
    if ($line -match '([^\s]+\.(ts|tsx))[:](\d+)[:](\d+)') {
      return ("{0}:{1}" -f $Matches[1], $Matches[3])
    }
  }
  return ''
}

function New-PmrDebugBundle([string]$RepoRootPath, [string]$Reason) {
  $opsDir = Join-Path $RepoRootPath 'ops'
  if (-not (Test-Path -LiteralPath $opsDir)) {
    New-Item -ItemType Directory -Path $opsDir -Force | Out-Null
  }

  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $safeReason = if ([string]::IsNullOrWhiteSpace($Reason)) { 'run' } else { ($Reason -replace '[^A-Za-z0-9_.-]', '_') }
  $bundleDir = Join-Path $opsDir ("pmr_debug_bundle_{0}_{1}" -f $stamp, $safeReason)
  New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null

  $logPath = Join-Path $bundleDir 'pmr_context.txt'
  $items = @()
  $items += ("time={0}" -f (Get-Date).ToString('o'))
  $items += ("stage={0}" -f $script:PmrStage)
  $items += ("exitCode={0}" -f $script:PmrExitCode)
  $items += ("failure={0}" -f $script:PmrFailureMessage)
  $items += ("buildStatus={0}" -f $script:BuildStatus)
  $items += ("firstTsError={0}" -f $script:BuildFirstTsError)
  $items += ("prodHeadMatch={0}" -f $script:ProdHeadMatch)
  $items += ("telemetryHealth={0}" -f $script:TelemetryHealthStatus)
  $items += ("parityConclusion={0}" -f $script:ParityConclusion)
  $items += ''
  $items += 'lastCommandStdout:'
  $items += $script:LastCommandStdout
  $items += ''
  $items += 'lastCommandStderr:'
  $items += $script:LastCommandStderr
  $items | Out-File -LiteralPath $logPath -Encoding utf8

  $gitStatusPath = Join-Path $bundleDir 'git_status.txt'
  $gitLogPath = Join-Path $bundleDir 'git_log_10.txt'
  try { (& git -C $script:RepoRoot status -sb) | Out-File -LiteralPath $gitStatusPath -Encoding utf8 } catch { 'git status failed' | Out-File -LiteralPath $gitStatusPath -Encoding utf8 }
  try { (& git -C $script:RepoRoot log -n 10 --oneline --decorate) | Out-File -LiteralPath $gitLogPath -Encoding utf8 } catch { 'git log failed' | Out-File -LiteralPath $gitLogPath -Encoding utf8 }

  $zipPath = Join-Path $opsDir ("pmr_debug_bundle_{0}_{1}.zip" -f $stamp, $safeReason)
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
  }
  Compress-Archive -LiteralPath $bundleDir -DestinationPath $zipPath -Force
  $script:PmrBundlePath = $zipPath
  Write-Host ("[OK] Debug bundle: {0}" -f $zipPath) -ForegroundColor Green
}

function Invoke-ParserPreflight([string]$RepoRootPath) {
  $scriptPaths = @(
    (Join-Path $RepoRootPath 'post_merge_routine.ps1'),
    (Join-Path $RepoRootPath 'ops/verify_pr39_80plus_parity.ps1')
  )
  $allErrors = @()
  foreach ($scriptPath in $scriptPaths) {
    $tokens = $null
    $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
    if ($errors -and $errors.Count -gt 0) {
      foreach ($parseError in $errors) {
        $entry = [PSCustomObject]@{
          Path = $scriptPath
          Message = $parseError.Message
          Line = $parseError.Extent.StartLineNumber
          Column = $parseError.Extent.StartColumnNumber
        }
        $allErrors += $entry
      }
    }
  }

  if ($allErrors.Count -gt 0) {
    Write-Host '[ERR] Parser preflight failed.' -ForegroundColor Red
    $allErrors | Select-Object -First 5 | ForEach-Object {
      Write-Host ("[ERR] {0}:{1}:{2} {3}" -f $_.Path, $_.Line, $_.Column, $_.Message) -ForegroundColor Red
    }
    throw 'PowerShell parser preflight failed.'
  }

  Write-Host '[OK] Parser preflight passed.' -ForegroundColor Green
}

function Write-FinalChecklist() {
  Write-Section 'Final checklist'
  Write-Host ("Local build: {0}" -f $script:BuildStatus)
  if (-not [string]::IsNullOrWhiteSpace($script:BuildFirstTsError)) {
    Write-Host ("First TS error: {0}" -f $script:BuildFirstTsError)
  }
  if ($script:PmrExitCode -eq 0) {
    Write-Host 'PMR: [OK]'
  } else {
    Write-Host ("PMR: [ERR] stage={0} exit={1} bundle={2}" -f $script:PmrStage, $script:PmrExitCode, $script:PmrBundlePath)
  }
  Write-Host ("Parity: {0}" -f $script:ParityConclusion)
  Write-Host ("Prod commitSha == HEAD?: {0}" -f $script:ProdHeadMatch)
  Write-Host ("Health: {0}" -f $script:TelemetryHealthStatus)
  if (-not [string]::IsNullOrWhiteSpace($script:ParityReason)) {
    Write-Host ("parity reason: {0}" -f $script:ParityReason)
  }
  if ($script:PmrExitCode -ne 0) {
    Write-Host 'If this failed, please attach:' -ForegroundColor Yellow
    Write-Host '1) ops/pmr_debug_bundle_*.zip' -ForegroundColor Yellow
    Write-Host '2) latest ops/pmr_log_*.txt' -ForegroundColor Yellow
    Write-Host '3) git status -sb' -ForegroundColor Yellow
    Write-Host '4) git log -n 10 --oneline --decorate' -ForegroundColor Yellow
  }
}

function Start-LocalReadyProbeProcess(
  [Parameter(Mandatory = $true)]
  [string]$Url,
  [int]$TimeoutSec = 180,
  [int]$IntervalSec = 1
) {
  # Keep this as plain PS 5.1 syntax; no PS7-only features.
  $safeTimeoutSec = if ($TimeoutSec -gt 0) { $TimeoutSec } else { 180 }
  $safeIntervalSec = if ($IntervalSec -gt 0) { $IntervalSec } else { 1 }

  $encodedUrl = $Url.Replace("'", "''")
  $probeScript = @"
`$ErrorActionPreference = 'SilentlyContinue'
`$url = '$encodedUrl'
`$timeoutSec = $safeTimeoutSec
`$intervalSec = $safeIntervalSec
if (`$intervalSec -lt 1) { `$intervalSec = 1 }
`$deadline = (Get-Date).AddSeconds(`$timeoutSec)
while ((Get-Date) -lt `$deadline) {
  try {
    `$resp = Invoke-WebRequest -Uri `$url -UseBasicParsing -TimeoutSec 1
    if (`$resp -and `$resp.StatusCode -ge 200 -and `$resp.StatusCode -lt 400) {
      Write-Host ('[OK] Local ready: {0}' -f `$url) -ForegroundColor Green
      exit 0
    }
  } catch {}
  Start-Sleep -Seconds `$intervalSec
}
Write-Host ('[WARN] Local ready timeout: {0} sec ({1})' -f `$timeoutSec, `$url) -ForegroundColor Yellow
exit 0
"@

  $bytes = [System.Text.Encoding]::Unicode.GetBytes($probeScript)
  $encoded = [Convert]::ToBase64String($bytes)
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded) -NoNewWindow | Out-Null
}

function Run-DevWithReadyBanner(
  [Parameter(Mandatory = $true)]
  [int]$Port
) {
  $localUrl = "http://localhost:$Port"
  Start-LocalReadyProbeProcess -Url $localUrl -TimeoutSec 180 -IntervalSec 1
  Write-Host ("[WARN] Waiting for {0} ..." -f $localUrl) -ForegroundColor DarkYellow

  # Keep npm dev in foreground so Ctrl+C reaches the dev process directly.
  & $script:NpmCmdPath run dev -- --webpack -p "$Port"

  $devExitCode = $LASTEXITCODE
  if ($devExitCode -ne 0) {
    throw ("Command failed (exit={0}): {1} run dev -- --webpack -p {2}" -f $devExitCode, $script:NpmCmdPath, $Port)
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
  $gitDir = (& git -C $script:RepoRoot rev-parse --git-dir) 2>$null
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
  $upstream = (& git -C $script:RepoRoot rev-parse --abbrev-ref --symbolic-full-name "@{u}") 2>$null
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

  $output = (& git -C $script:RepoRoot grep -n -I -E -e '^<<<<<<<' -e '^=======$' -e '^>>>>>>>' -- @existingPaths) 2>$null
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
  $dirty = (& git -C $script:RepoRoot status --porcelain) 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect working tree (git status failed).'
  }

  if (-not [string]::IsNullOrWhiteSpace(($dirty -join "`n"))) {
    throw "Working tree is not clean. Commit or stash local changes before running .\post_merge_routine.ps1.`nTip: git status --short"
  }
}

function Test-WorkingTreeClean() {
  $dirty = (& git -C $script:RepoRoot status --porcelain) 2>$null
  if ($LASTEXITCODE -ne 0) { return $false }
  return [string]::IsNullOrWhiteSpace(($dirty -join "`n"))
}

function Ensure-OnProdBranchIfNeeded([string]$EffectiveProdBranch, [bool]$EnableAutoCheckout) {
  if (-not $EnableAutoCheckout) {
    Write-Host 'AutoCheckoutProdBranch disabled.' -ForegroundColor DarkGray
    return
  }

  $currentBranch = Get-GitValue -Args @('rev-parse','--abbrev-ref','HEAD') -ErrorMessage 'Unable to determine current branch.'
  if ($currentBranch -eq $EffectiveProdBranch) { return }

  if (-not (Test-WorkingTreeClean)) {
    Write-Host ("AutoCheckoutProdBranch skipped: working tree is dirty (current={0}, prod={1})." -f $currentBranch, $EffectiveProdBranch) -ForegroundColor Yellow
    return
  }

  Write-Host ("AutoCheckoutProdBranch: switching {0} -> {1}" -f $currentBranch, $EffectiveProdBranch) -ForegroundColor Yellow
  Run 'git' @('checkout',$EffectiveProdBranch)
  Run 'git' @('pull','--ff-only')
}

function Get-AheadBehind([string]$UpstreamRef) {
  $countRaw = (& git -C $script:RepoRoot rev-list --left-right --count "$UpstreamRef...HEAD") 2>$null
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

function Resolve-HostValue([string]$ProvidedValue, [string]$EnvName, [string]$FilePath, [string]$Label) {
  $target = ''

  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    $target = $ProvidedValue
  }

  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($EnvName)) {
    $envValue = [Environment]::GetEnvironmentVariable($EnvName)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
      $target = $envValue
    }
  }

  if ([string]::IsNullOrWhiteSpace($target) -and -not [string]::IsNullOrWhiteSpace($FilePath) -and (Test-Path $FilePath)) {
    $line = Get-Content -Path $FilePath -TotalCount 1 -ErrorAction SilentlyContinue
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
    throw ("Invalid {0} host '{1}'." -f $Label, $target)
  }

  return $target
}

function Resolve-VercelPreviewHost([string]$ProvidedValue) {
  return Resolve-HostValue -ProvidedValue $ProvidedValue -EnvName 'OSH_VERCEL_PREVIEW_HOST' -FilePath '.\ops\vercel_preview_host.txt' -Label 'Vercel preview'
}

function Get-VercelBypassSecretSafe() {
  $secretPath = '.\ops\vercel_protection_bypass_secret.txt'
  try {
    if (Test-Path -LiteralPath $secretPath) {
      $line = Get-Content -LiteralPath $secretPath -TotalCount 1 -ErrorAction SilentlyContinue
      if (-not [string]::IsNullOrWhiteSpace($line)) {
        return $line.Trim()
      }
    }
  } catch {}

  try {
    $envSecret = [Environment]::GetEnvironmentVariable('VERCEL_PROTECTION_BYPASS_SECRET')
    if (-not [string]::IsNullOrWhiteSpace($envSecret)) {
      return $envSecret.Trim()
    }
  } catch {}

  return $null
}

function Infer-ProdBranchFromOriginHead([string]$FallbackBranch = 'main') {
  $symbolic = (& git -C $script:RepoRoot symbolic-ref --quiet --short refs/remotes/origin/HEAD) 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($symbolic)) {
    $remoteRef = ($symbolic | Select-Object -First 1).Trim()
    if ($remoteRef -match '^origin/(.+)$') {
      return $Matches[1]
    }
  }
  return $FallbackBranch
}

function Resolve-VercelProdBranch([string]$ProvidedValue, [string]$FallbackBranch = 'main') {
  if (-not [string]::IsNullOrWhiteSpace($ProvidedValue)) {
    return $ProvidedValue.Trim()
  }

  $branchFilePath = '.\ops\vercel_prod_branch.txt'
  if (Test-Path $branchFilePath) {
    $line = Get-Content -Path $branchFilePath -TotalCount 1 -ErrorAction SilentlyContinue
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      return $line.Trim()
    }
  }

  return Infer-ProdBranchFromOriginHead -FallbackBranch $FallbackBranch
}

function Resolve-ParityTargetHost([string]$CurrentBranch, [string]$EffectiveProdBranch, [string]$RequestedTarget, [string]$ProvidedProdHost, [string]$ProvidedPreviewHost) {
  $productionHost = Resolve-VercelProdHost -ProvidedValue $ProvidedProdHost
  $previewHost = Resolve-VercelPreviewHost -ProvidedValue $ProvidedPreviewHost

  if ($RequestedTarget -eq 'prod') {
    if ([string]::IsNullOrWhiteSpace($productionHost)) {
      return [PSCustomObject]@{ ShouldRun = $false; Target = 'prod'; Host = ''; Message = 'Missing Vercel production host. Set -ProdHost / -VercelHost or ops/vercel_prod_host.txt.' }
    }
    return [PSCustomObject]@{ ShouldRun = $true; Target = 'prod'; Host = $productionHost; Message = '' }
  }

  if ($RequestedTarget -eq 'preview') {
    if ([string]::IsNullOrWhiteSpace($previewHost)) {
      return [PSCustomObject]@{ ShouldRun = $false; Target = 'preview'; Host = ''; Message = 'Missing preview host. Set -PreviewHost or ops/vercel_preview_host.txt.' }
    }
    return [PSCustomObject]@{ ShouldRun = $true; Target = 'preview'; Host = $previewHost; Message = '' }
  }

  if ($CurrentBranch -eq $EffectiveProdBranch) {
    if ([string]::IsNullOrWhiteSpace($productionHost)) {
      return [PSCustomObject]@{ ShouldRun = $false; Target = 'prod'; Host = ''; Message = 'Missing Vercel production host for prod branch parity. Set -ProdHost / -VercelHost or ops/vercel_prod_host.txt.' }
    }
    return [PSCustomObject]@{ ShouldRun = $true; Target = 'prod'; Host = $productionHost; Message = '' }
  }

  if (-not [string]::IsNullOrWhiteSpace($previewHost)) {
    return [PSCustomObject]@{ ShouldRun = $true; Target = 'preview'; Host = $previewHost; Message = '' }
  }

  return [PSCustomObject]@{
    ShouldRun = $false
    Target = 'skip'
    Host = ''
    Message = ("Feature branch ({0}) cannot be validated against production commit. Configure preview host or merge first." -f $CurrentBranch)
  }
}

function Invoke-VersionEndpoint([string]$ProdHost, [hashtable]$Headers = $null) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $timestamp = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $url = "https://$ProdHost/api/version?t=$timestamp"
  $httpResult = Invoke-WebRequestWithSingleRedirect -Url $url -TimeoutSec 15 -Headers $Headers
  $response = $httpResult.Response

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
    Url = $httpResult.FinalUrl
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

function Invoke-WebRequestWithSingleRedirect([string]$Url, [int]$TimeoutSec = 15, [hashtable]$Headers = $null) {
  $safeTimeoutSec = if ($TimeoutSec -gt 0) { $TimeoutSec } else { 15 }
  $attemptUrl = $Url
  $didFollow = $false
  $requestHeaders = @{ 'Cache-Control'='no-cache'; 'Pragma'='no-cache' }
  if ($Headers) {
    foreach ($key in $Headers.Keys) {
      $requestHeaders[$key] = $Headers[$key]
    }
  }

  for ($i = 0; $i -lt 2; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri $attemptUrl -Method Get -UseBasicParsing -MaximumRedirection 0 -TimeoutSec $safeTimeoutSec -Headers $requestHeaders -ErrorAction Stop
      return [PSCustomObject]@{ Response = $resp; FinalUrl = $attemptUrl; Redirected = $didFollow }
    } catch {
      $statusCode = Get-WebExceptionStatusCode -Exception $_.Exception
      $location = $null
      if ($_.Exception -and $_.Exception.Response -and $_.Exception.Response.Headers) {
        $location = $_.Exception.Response.Headers['Location']
      }

      if (($statusCode -in @(301,302,307,308)) -and -not [string]::IsNullOrWhiteSpace($location) -and -not $didFollow) {
        Write-Host ("[WARN] Redirect {0} -> {1}" -f $statusCode, $location) -ForegroundColor Yellow
        if ($location -notmatch '^https?://') {
          $baseUri = New-Object System.Uri($attemptUrl)
          $location = (New-Object System.Uri($baseUri, $location)).AbsoluteUri
        }
        $attemptUrl = $location
        $didFollow = $true
        continue
      }
      throw
    }
  }
}

function Assert-VersionRouteExistsInHead() {
  & git -C $script:RepoRoot cat-file -e 'HEAD:app/api/version/route.ts' 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw 'Missing app/api/version/route.ts in HEAD commit. The route may exist only in your working tree. Please git add/commit/push this route, then rerun parity gate.'
  }
}

function Wait-VercelCommitParity([string]$ProdHost, [string]$LocalSha, [string]$ExpectedEnv, [switch]$AllowPreview, [int]$MaxWaitSec = 600, [int]$PollIntervalSec = 10, [string]$BypassSecret = $null) {
  $started = Get-Date
  $attempt = 0
  $safeIntervalSec = [Math]::Max(1, $PollIntervalSec)
  $maxAttempts = [Math]::Max(1, [int][Math]::Floor($MaxWaitSec / $safeIntervalSec) + 1)
  $lastStatusCode = $null
  $hadParsedCommitSha = $false
  $branchName = Get-GitValue -Args @('rev-parse','--abbrev-ref','HEAD') -ErrorMessage 'Unable to determine current branch for diagnostics.'
  $did404Diagnosis = $false

  $result = [PSCustomObject]@{
    CommitSha = ''
    VercelEnv = ''
    VercelUrl = ''
    GitRef = ''
    StatusCode = 0
    TelemetryHealthStatus = ''
    ProdHeadMatchStatus = 'not confirmed'
  }
  $requestHeaders = $null
  if (-not [string]::IsNullOrWhiteSpace($BypassSecret)) {
    $requestHeaders = @{ 'x-vercel-protection-bypass' = $BypassSecret }
  }

  while ($attempt -lt $maxAttempts) {
    $attempt++
    $elapsedSec = [int]((Get-Date) - $started).TotalSeconds

    try {
      $versionResponse = Invoke-VersionEndpoint -ProdHost $ProdHost -Headers $requestHeaders
      $statusCode = $versionResponse.StatusCode
      $lastStatusCode = $statusCode
      $result.StatusCode = $statusCode

      if ($statusCode -eq 404) {
        throw "404"
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

      if ($ExpectedEnv -ne 'any' -and -not [string]::IsNullOrWhiteSpace($vercelEnvValue) -and $vercelEnvValue -ne $ExpectedEnv) {
        throw ("Vercel environment mismatch: expected={0} actual={1} host={2}." -f $ExpectedEnv, $vercelEnvValue, $ProdHost)
      }

      if ([string]::IsNullOrWhiteSpace($vercelSha) -or $vercelSha -eq 'unknown') {
        Write-Host ("/api/version returned commitSha='$vercelSha'. waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
        if ($attempt -lt $maxAttempts) { Start-Sleep -Seconds $safeIntervalSec }
        continue
      }

      $hadParsedCommitSha = $true
      if ($vercelSha -ne $LocalSha) {
        $result.ProdHeadMatchStatus = 'not confirmed(commit mismatch)'
        Write-Host ("Vercel commit mismatch: local=$LocalSha vercel=$vercelSha host=$ProdHost vercelEnv=$vercelEnvValue waited=${elapsedSec}s/${MaxWaitSec}s") -ForegroundColor Yellow
        if ($attempt -lt $maxAttempts) { Start-Sleep -Seconds $safeIntervalSec }
        continue
      }

      $result.ProdHeadMatchStatus = 'ok'

      $healthUrl = "https://$ProdHost/api/telemetry/health"
      try {
        $healthResp = Invoke-WebRequest -Uri $healthUrl -Method Get -UseBasicParsing -TimeoutSec 10 -Headers $requestHeaders -ErrorAction Stop
        if ($healthResp -and [int]$healthResp.StatusCode -eq 200) {
          $result.TelemetryHealthStatus = 'ok'
        } else {
          $result.TelemetryHealthStatus = ('not confirmed(status {0})' -f [int]$healthResp.StatusCode)
        }
      } catch {
        $healthCode = Get-WebExceptionStatusCode -Exception $_.Exception
        if ($null -ne $healthCode) {
          $result.TelemetryHealthStatus = ('not confirmed(status {0})' -f $healthCode)
        } else {
          $result.TelemetryHealthStatus = ('not confirmed({0})' -f (Shorten-Text -Text $_.Exception.Message -MaxLen 120))
        }
      }

      Write-Host ("VERCEL == LOCAL [OK] ({0}) (vercelEnv={1})" -f $LocalSha, $vercelEnvValue) -ForegroundColor Green
      $result | Add-Member -NotePropertyName Success -NotePropertyValue $true -Force
      $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue '' -Force
      return $result
    } catch {
      $statusCode = Get-WebExceptionStatusCode -Exception $_.Exception
      if ($_.Exception.Message -eq '404') { $statusCode = 404 }
      if ($null -ne $statusCode) {
        $lastStatusCode = $statusCode
        $result.StatusCode = $statusCode
      }

      if ($statusCode -eq 404) {
        $result.ProdHeadMatchStatus = 'not confirmed(status 404)'
        if (-not $did404Diagnosis) {
          $did404Diagnosis = $true
          $probeUrl = "https://$ProdHost/api/telemetry/health"
          $probeStatus = 'not confirmed(unavailable)'
          try {
            $probeResp = Invoke-WebRequest -Uri $probeUrl -Method Get -UseBasicParsing -TimeoutSec 10 -Headers $requestHeaders -ErrorAction Stop
            if ($probeResp -and [int]$probeResp.StatusCode -eq 200) {
              $probeStatus = 'ok'
            } else {
              $probeStatus = ('not confirmed(status {0})' -f [int]$probeResp.StatusCode)
            }
          } catch {
            $probeCode = Get-WebExceptionStatusCode -Exception $_.Exception
            if ($null -ne $probeCode) { $probeStatus = ('not confirmed(status {0})' -f $probeCode) }
          }
          $result.TelemetryHealthStatus = $probeStatus
          Write-Host ("/api/version 404 diagnosed once: host={0}, branch={1}, telemetryHealth={2}." -f $ProdHost, $branchName, $probeStatus) -ForegroundColor Yellow
        } elseif (($attempt % 10) -eq 0 -or $attempt -eq $maxAttempts) {
          Write-Host ("/api/version still 404 (attempt {0}/{1}); waiting..." -f $attempt, $maxAttempts) -ForegroundColor DarkYellow
        }
      } else {
        if ($null -ne $statusCode) {
          $result.ProdHeadMatchStatus = ('not confirmed(status {0})' -f $statusCode)
        }
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
    $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue ("PARITY 404: /api/version not found after {0} tries (host={1}, branch={2}, telemetryHealth={3}). Check host mapping or wait for deployment readiness." -f $maxAttempts, $ProdHost, $branchName, $result.TelemetryHealthStatus) -Force
    return $result
  }

  if (-not $hadParsedCommitSha) {
    $result | Add-Member -NotePropertyName Success -NotePropertyValue $false -Force
    $result | Add-Member -NotePropertyName FailureMessage -NotePropertyValue ("VERCEL PARITY PROBE FAILED: unable to obtain commitSha from /api/version after {0} tries (host={1}, branch={2}, lastStatus={3})." -f $maxAttempts, $ProdHost, $branchName, $lastStatusCode) -Force
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

$repoRoot = Ensure-RepoRoot
$script:RepoRoot = $repoRoot
Set-Location -LiteralPath $repoRoot
$opsDirForLog = Join-Path $repoRoot 'ops'
if (-not (Test-Path -LiteralPath $opsDirForLog)) {
  New-Item -ItemType Directory -Path $opsDirForLog -Force | Out-Null
}
$logStamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$script:PmrLogPath = Join-Path $opsDirForLog ("pmr_log_{0}.txt" -f $logStamp)
Start-Transcript -LiteralPath $script:PmrLogPath -Force | Out-Null

try {
  $script:PmrStage = 'boot'
  Write-Section "Boot"
  Write-Host ("Time: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -ForegroundColor Gray
  Write-Host ("Repo: {0}" -f $repoRoot) -ForegroundColor Gray

  $script:PmrStage = 'parser-preflight'
  Invoke-ParserPreflight -RepoRootPath $repoRoot

  Write-Section "Git context"
  $gitOk = $false
  if ($script:GitAvailable -and (Get-Command git -ErrorAction SilentlyContinue)) {
    $isRepo = (& git -C $script:RepoRoot rev-parse --is-inside-work-tree) 2>$null
    if ($LASTEXITCODE -eq 0 -and $isRepo -eq 'true') { $gitOk = $true }
  }

  if ($gitOk) {
    $branch = (& git -C $script:RepoRoot rev-parse --abbrev-ref HEAD) 2>$null
    $commit = (& git -C $script:RepoRoot rev-parse --short HEAD) 2>$null
    $head = (& git -C $script:RepoRoot log -1 --oneline) 2>$null
    Write-Host ("Branch: {0}" -f $branch) -ForegroundColor Green
    Write-Host ("Commit: {0}" -f $commit) -ForegroundColor Green
    Write-Host ("Head:   {0}" -f $head) -ForegroundColor Green
  } else {
    Write-Host '[WARN] git context not confirmed (git unavailable from script path).' -ForegroundColor Yellow
  }

  $effectiveProdBranch = Resolve-VercelProdBranch -ProvidedValue $ProdBranch -FallbackBranch 'main'
  $canRunGitParity = $gitOk -and (-not $SkipParity)

  if ($SkipParity) {
    $script:ParityConclusion = 'skipped(reason: SkipParity)'
    $script:ParityReason = 'SkipParity'
    Write-Host 'Git preflight parity skipped (SkipParity).' -ForegroundColor Yellow
  } elseif (-not $gitOk) {
    $script:ParityConclusion = 'not confirmed'
    $script:ParityReason = 'git unavailable'
    Write-Host '[WARN] Git preflight parity not confirmed (git unavailable).' -ForegroundColor Yellow
  } else {
    $script:PmrStage = 'git-preflight'
    Write-Section "Git preflight parity"
    try {
      if (Test-GitOperationInProgress) {
        throw "Git operation in progress (merge/rebase/cherry-pick). Run git status, resolve or abort, then rerun .\post_merge_routine.ps1."
      }

      $unmerged = (& git -C $script:RepoRoot diff --name-only --diff-filter=U) 2>$null
      if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($unmerged -join "`n"))) {
        throw "Unmerged files detected. Run git status and resolve conflicts before rerunning .\post_merge_routine.ps1."
      }

      Assert-NoConflictMarkers
      Ensure-CleanWorkingTree
      Run 'git' @('fetch','--all','--prune')

      $currentBranch = Get-GitBranchSafe -RepoRoot $script:RepoRoot
      if ($null -eq $currentBranch) {
        $script:ParityConclusion = 'not confirmed'
        $script:ParityReason = 'Unable to determine current branch (detached HEAD or git error)'
        $canRunGitParity = $false
        Write-Host ("[WARN] Git preflight parity not confirmed: {0}" -f $script:ParityReason) -ForegroundColor Yellow
      } else {
        $script:ParityReason = ''
      }

      Write-Host ("Resolved production branch: {0}" -f $effectiveProdBranch) -ForegroundColor Green
      if ($canRunGitParity) {
        Ensure-OnProdBranchIfNeeded -EffectiveProdBranch $effectiveProdBranch -EnableAutoCheckout $AutoCheckoutProdBranch
      }

      if ($canRunGitParity -and -not $SkipPull) {
        $upstream = Resolve-UpstreamRef
        if (-not [string]::IsNullOrWhiteSpace($upstream)) {
          Run 'git' @('pull','--ff-only')
        }
      } elseif ($canRunGitParity) {
        Write-Host 'SkipPull enabled.' -ForegroundColor DarkGray
      }

      if ($canRunGitParity) {
        Write-Host 'Preflight: OK' -ForegroundColor Green
      }
    } catch {
      $script:ParityConclusion = 'not confirmed'
      if ([string]::IsNullOrWhiteSpace($script:ParityReason)) {
        $script:ParityReason = $_.Exception.Message
      }
      $canRunGitParity = $false
      Write-Host ("[WARN] Git preflight parity not confirmed: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
      if ($StrictParity) { throw }
    }
  }

  Write-Section "Optional: feature fingerprint check"
  if ($Expect.Count -gt 0) {
    if (-not $gitOk) {
      Write-Host '[WARN] Expect check skipped (git unavailable).' -ForegroundColor Yellow
    } elseif ($SkipParity) {
      Write-Host '[WARN] Expect check skipped (SkipParity).' -ForegroundColor Yellow
    } else {
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
        & git -C $script:RepoRoot @expectArgs | Out-Null
      } else {
        & git -C $script:RepoRoot @expectArgs -- @existingExpectPaths | Out-Null
      }

      if ($LASTEXITCODE -ne 0) {
        throw "EXPECT FAILED: pattern '$pat' not found (scope=$ExpectScope, mode=$expectMode). Likely wrong branch/commit."
      }
    }
    Write-Host 'Expect check: OK' -ForegroundColor Green
    }
  } else {
    Write-Host 'Expect check: (skipped)' -ForegroundColor DarkGray
  }

  $script:PmrStage = 'clean'
  Write-Section "Clean build artifacts"
  if ($SkipClean) {
    Write-Host 'SkipClean enabled.' -ForegroundColor DarkGray
  } else {
    if (Test-Path -LiteralPath '.\.next') {
      Write-Host 'Removing .next directory' -ForegroundColor Yellow
      Remove-Item -Recurse -Force -LiteralPath '.\.next' -ErrorAction SilentlyContinue
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

  $script:PmrStage = 'npm-ci'
  Write-Section "Install (npm ci)"
  $script:NpmCmdPath = Resolve-NpmCmdPath
  Write-NpmResolutionDiagnostics -ResolvedNpmCmdPath $script:NpmCmdPath
  if (-not $SkipNpmCi) { Run $script:NpmCmdPath @('ci') }
  else { Write-Host 'SkipNpmCi enabled.' -ForegroundColor DarkGray }

  $script:PmrStage = 'lint'
  Write-Section "Lint (npm run lint)"
  if ($SkipLint) {
    Write-Host 'SkipLint enabled.' -ForegroundColor DarkGray
  } else {
    Run $script:NpmCmdPath @('run','lint')
    Write-Host 'LINT OK' -ForegroundColor Green
  }

  $script:PmrStage = 'build'
  Write-Section "Build (npm run build)"
  if (-not $SkipBuild) {
    try {
      Run $script:NpmCmdPath @('run','build')
      $script:BuildStatus = 'PASS'
      Write-Host 'BUILD OK' -ForegroundColor Green
    } catch {
      $allBuildText = ("{0}`n{1}" -f $script:LastCommandStdout, $script:LastCommandStderr)
      $script:BuildFirstTsError = Get-FirstTypeScriptErrorLocation -Text $allBuildText
      $script:BuildStatus = 'FAIL'
      throw
    }
  } else {
    $script:BuildStatus = 'SKIPPED'
    Write-Host 'SkipBuild enabled.' -ForegroundColor DarkGray
  }

  $script:PmrStage = 'vercel-parity'
  Write-Section "Vercel parity gate (branch-aware)"
  $runVercelParity = $false
  if ($SkipParity) {
    $runVercelParity = $false
  } elseif ($ParityTarget -eq 'off') {
    $runVercelParity = $false
  } elseif ($canRunGitParity -and $VercelParityMode -ne 'off' -and ((-not $SkipVercelParity) -or $RequireVercelSameCommit)) {
    $runVercelParity = $true
  }
  $finalLocalSha = ''
  $finalOriginSha = ''
  $finalVercelSha = ''
  $finalVercelEnv = ''
  $productionDomainHost = ''
  $parityFailed = $false
  $parityFailureMessage = ''

  if ($runVercelParity) {
    Assert-VersionRouteExistsInHead

    Ensure-CleanWorkingTree
    $parityState = Ensure-GitRemoteParity -SkipAutoPush:$SkipPush
    $finalLocalSha = $parityState.LocalSha
    $finalOriginSha = $parityState.OriginSha

    $hostTarget = Resolve-ParityTargetHost -CurrentBranch $parityState.Branch -EffectiveProdBranch $effectiveProdBranch -RequestedTarget $ParityTarget -ProvidedProdHost $VercelProdUrlOrHost -ProvidedPreviewHost $PreviewHost
    if (-not $hostTarget.ShouldRun) {
      $script:ParityConclusion = ('skipped({0})' -f $hostTarget.Message)
      Write-Host ("Vercel parity skipped: {0}" -f $hostTarget.Message) -ForegroundColor Yellow
    } else {
      $productionDomainHost = $hostTarget.Host
      $expectedVercelEnv = if ($hostTarget.Target -eq 'preview') { 'preview' } elseif ($VercelEnv -eq 'preview') { 'production' } else { $VercelEnv }

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

      $allowPreviewForTarget = $AllowPreviewHost -or $hostTarget.Target -eq 'preview'
      $vercelBypassSecret = Get-VercelBypassSecretSafe
      $vercelState = Wait-VercelCommitParity -ProdHost $productionDomainHost -LocalSha $finalLocalSha -ExpectedEnv $expectedVercelEnv -AllowPreview:$allowPreviewForTarget -MaxWaitSec $effectiveMaxWaitSec -PollIntervalSec $effectivePollIntervalSec -BypassSecret $vercelBypassSecret
      if (-not [string]::IsNullOrWhiteSpace($vercelState.TelemetryHealthStatus)) {
        $script:TelemetryHealthStatus = $vercelState.TelemetryHealthStatus
      }
      if (-not [string]::IsNullOrWhiteSpace($vercelState.ProdHeadMatchStatus)) {
        $script:ProdHeadMatch = $vercelState.ProdHeadMatchStatus
      }
      if (-not $vercelState.Success) {
        $parityFailed = $true
        $parityFailureMessage = $vercelState.FailureMessage
        $script:ParityConclusion = 'not confirmed'
        Write-Host ("Vercel parity failed: {0}" -f $parityFailureMessage) -ForegroundColor Yellow
      } else {
        $script:ParityConclusion = 'ok'
      }
      $finalVercelSha = $vercelState.CommitSha
      $finalVercelEnv = $vercelState.VercelEnv

      Write-Host ("PARITY TARGET: {0}" -f $hostTarget.Target) -ForegroundColor Green
      Write-Host ("LOCAL SHA:     {0}" -f $finalLocalSha) -ForegroundColor Green
      Write-Host ("ORIGIN SHA:    {0}" -f $finalOriginSha) -ForegroundColor Green
      Write-Host ("VERCEL SHA:    {0}" -f $finalVercelSha) -ForegroundColor Green
      Write-Host ("VERCEL ENV:    {0}" -f $finalVercelEnv) -ForegroundColor Green

      Write-ParitySnapshot -LocalSha $finalLocalSha -OriginSha $finalOriginSha -VercelSha $finalVercelSha -VercelEnvValue $finalVercelEnv -ProdHost $productionDomainHost
    }
  } else {
    if ($SkipParity) {
      $script:ParityConclusion = 'skipped(reason: SkipParity)'
      $script:ParityReason = 'SkipParity'
      Write-Host 'Parity skipped by SkipParity.' -ForegroundColor Yellow
    } elseif (-not $canRunGitParity) {
      if ([string]::IsNullOrWhiteSpace($script:ParityConclusion)) {
        $script:ParityConclusion = 'not confirmed'
      }
      if ([string]::IsNullOrWhiteSpace($script:ParityReason)) {
        $script:ParityReason = 'git parity preflight not confirmed'
      }
      Write-Host ("[WARN] Vercel parity skipped because git parity preflight was not confirmed: {0}" -f $script:ParityReason) -ForegroundColor Yellow
    } elseif ($ParityTarget -eq 'off' -or $VercelParityMode -eq 'off') {
      $script:ParityConclusion = 'skipped(off)'
      $script:ParityReason = 'ParityTarget/VercelParityMode off'
      Write-Host 'Vercel parity skipped (off).' -ForegroundColor Yellow
    } else {
      $script:ParityConclusion = 'skipped(SkipVercelParity)'
      $script:ParityReason = 'SkipVercelParity'
      Write-Host 'SkipVercelParity enabled.' -ForegroundColor Yellow
    }
  }

  Write-Section "Summary"
  if ($parityFailed) {
    Write-Host ("PARITY SUMMARY: FAIL - {0}" -f $parityFailureMessage) -ForegroundColor Yellow
    Write-Host 'Next step: verify host mapping for current branch and retry parity after deployment is ready.' -ForegroundColor Yellow
    if ($StrictParity) {
      throw 'StrictParity enabled and parity failed.'
    }
  } else {
    Write-Host 'PARITY SUMMARY: OK or skipped.' -ForegroundColor Green
  }

  $script:PmrStage = 'runtime'
  Write-Section "Runtime server"
  if (-not $SkipDev) {
    if ($ProdSmoke) {
      Write-Host 'ProdSmoke approximates Vercel runtime; dev may differ.' -ForegroundColor Yellow
      Write-Host ("Starting prod smoke: npm run start -- -p {0}" -f $DevPort) -ForegroundColor Cyan
      Run $script:NpmCmdPath @('run','start','--','-p',"$DevPort")
    } else {
      Write-Host ("Starting dev: npm run dev -- --webpack -p {0}" -f $DevPort) -ForegroundColor Cyan
      Run-DevWithReadyBanner -Port $DevPort
    }
  } else {
    Write-Host 'SkipDev enabled.' -ForegroundColor DarkGray
  }

  $script:PmrExitCode = 0
} catch {
  $script:PmrExitCode = 1
  $msg = if ($_.Exception -and -not [string]::IsNullOrWhiteSpace($_.Exception.Message)) { $_.Exception.Message } else { [string]$_ }
  $script:PmrFailureMessage = $msg
  Write-Host ("[ERR] stage={0} {1}" -f $script:PmrStage, $msg) -ForegroundColor Red
} finally {
  try { Stop-Transcript | Out-Null } catch {}
  if ($script:BuildStatus -eq 'not run') {
    $script:BuildStatus = 'SKIPPED'
  }
  if ([string]::IsNullOrWhiteSpace($script:ParityConclusion)) {
    $script:ParityConclusion = 'not confirmed'
  }
  $bundleReason = 'failure'
  if ($script:PmrExitCode -eq 0) { $bundleReason = 'success' }
  New-PmrDebugBundle -RepoRootPath $repoRoot -Reason $bundleReason
  Write-FinalChecklist
  Write-Host ("PMR log: {0}" -f $script:PmrLogPath)
  exit $script:PmrExitCode
}

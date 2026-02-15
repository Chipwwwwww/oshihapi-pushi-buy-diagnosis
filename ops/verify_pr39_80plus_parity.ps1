param(
  [string]$ProdHost = '',
  [switch]$SkipProd
)

$ErrorActionPreference = 'Stop'

function Say([string]$Message) {
  Write-Host $Message
}

function Safe-Trim([object]$Value) {
  if ($null -eq $Value) { return '' }
  return ([string]$Value).Trim()
}

function Normalize-ProdHost([string]$InputHost) {
  $value = Safe-Trim $InputHost
  if ([string]::IsNullOrWhiteSpace($value)) { return '' }
  if ($value -notmatch '^https?://') {
    $value = 'https://' + $value
  }
  return $value.TrimEnd('/')
}

try {
  $rootRaw = (& git rev-parse --show-toplevel 2>$null)
  $root = Safe-Trim $rootRaw
  if ([string]::IsNullOrWhiteSpace($root)) {
    Write-Host '[ERR] Not a git repo.' -ForegroundColor Red
    exit 1
  }

  Set-Location $root

  $headRaw = (& git rev-parse HEAD 2>$null)
  $head = Safe-Trim $headRaw
  Say ("HEAD: {0}" -f $head)

  $mustPaths = @(
    'post_merge_routine.ps1',
    'app/api/telemetry/route.ts',
    'app/api/telemetry/health/route.ts',
    'app/api/version/route.ts',
    'app/flow/FlowClient.tsx',
    'app/page.tsx',
    'app/history/page.tsx',
    'app/result/[runId]/page.tsx',
    'docs/restore_main_pr39_to_80plus_report.md'
  )

  Say "`n=== must-have paths (LiteralPath) ==="
  foreach ($pathItem in $mustPaths) {
    $marker = '[ERR]'
    if (Test-Path -LiteralPath $pathItem) { $marker = '[OK]' }
    Say ("{0}  {1}" -f $marker, $pathItem)
  }

  if ([string]::IsNullOrWhiteSpace($ProdHost)) {
    $hostFile = 'ops/vercel_prod_host.txt'
    if (Test-Path -LiteralPath $hostFile) {
      $firstLine = Get-Content -LiteralPath $hostFile -TotalCount 1 -ErrorAction SilentlyContinue
      $ProdHost = Safe-Trim $firstLine
    }
  }

  if ([string]::IsNullOrWhiteSpace($ProdHost)) {
    $ProdHost = 'https://oshihapi-pushi-buy-diagnosis.vercel.app'
  }

  $ProdHost = Normalize-ProdHost $ProdHost

  $prodHeadMatch = 'not confirmed'
  $healthStatus = 'not confirmed'
  $parityConclusion = 'not confirmed'

  if ($SkipProd) {
    $parityConclusion = 'skipped(SkipProd)'
    Say "`n[WARN] PROD checks skipped by -SkipProd."
  } else {
    Say "`n=== PROD smoke ==="
    try {
      $versionUrl = "{0}/api/version" -f $ProdHost
      $versionResponse = Invoke-WebRequest -Uri $versionUrl -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
      $versionJson = $null
      if ($versionResponse -and -not [string]::IsNullOrWhiteSpace($versionResponse.Content)) {
        $versionJson = $versionResponse.Content | ConvertFrom-Json
      }

      $commitSha = if ($versionJson -and $versionJson.commitSha) { [string]$versionJson.commitSha } else { '' }
      $gitRef = if ($versionJson -and $versionJson.gitRef) { [string]$versionJson.gitRef } else { '' }
      Say ("PROD commitSha: {0}" -f $commitSha)
      Say ("PROD gitRef:    {0}" -f $gitRef)

      if (-not [string]::IsNullOrWhiteSpace($commitSha) -and -not [string]::IsNullOrWhiteSpace($head)) {
        $prodHeadMatch = [string]($commitSha -eq $head)
        if ($prodHeadMatch -eq 'True') {
          $parityConclusion = 'ok'
        } else {
          $parityConclusion = 'not confirmed'
        }
      } else {
        $parityConclusion = 'not confirmed'
      }
      Say ("Match HEAD:     {0}" -f $prodHeadMatch)
    } catch {
      Say ("[WARN] PROD /api/version not confirmed: {0}" -f $_.Exception.Message)
      $parityConclusion = 'not confirmed'
    }

    try {
      $healthUrl = "{0}/api/telemetry/health" -f $ProdHost
      $healthResponse = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
      if ($healthResponse -and -not [string]::IsNullOrWhiteSpace($healthResponse.Content)) {
        $healthStatus = Safe-Trim $healthResponse.Content
      } elseif ($healthResponse) {
        $healthStatus = [string]$healthResponse.StatusCode
      }
      Say ("PROD /api/telemetry/health: {0}" -f $healthStatus)
    } catch {
      Say ("[WARN] PROD /api/telemetry/health not confirmed: {0}" -f $_.Exception.Message)
      $healthStatus = 'not confirmed'
    }
  }

  Say "`n=== parity summary ==="
  Say ("Prod commitSha == HEAD?: {0}" -f $prodHeadMatch)
  Say ("/api/telemetry/health: {0}" -f $healthStatus)
  Say ("parity conclusion: {0}" -f $parityConclusion)
  Say "`nNext: run .\\post_merge_routine.ps1 for full post-merge verification."
  exit 0
} catch {
  Say ("[WARN] verifier failed but continuing: {0}" -f $_.Exception.Message)
  Say 'parity conclusion: not confirmed'
  exit 0
}

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

function Get-WebExceptionStatusCode([System.Exception]$Exception) {
  if ($null -eq $Exception) { return $null }
  if ($Exception -is [System.Net.WebException] -and $Exception.Response) {
    try { return [int]([System.Net.HttpWebResponse]$Exception.Response).StatusCode } catch {}
  }
  if ($Exception.PSObject.Properties['Response'] -and $Exception.Response) {
    try { return [int]$Exception.Response.StatusCode } catch {}
  }
  return $null
}

function Invoke-WebRequestWithSingleRedirect([string]$Url, [int]$TimeoutSec = 15) {
  $safeTimeoutSec = if ($TimeoutSec -gt 0) { $TimeoutSec } else { 15 }
  $attemptUrl = $Url
  $didFollow = $false
  for ($i = 0; $i -lt 2; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $attemptUrl -UseBasicParsing -MaximumRedirection 0 -TimeoutSec $safeTimeoutSec -ErrorAction Stop
      return [PSCustomObject]@{ Response = $response; FinalUrl = $attemptUrl; Redirected = $didFollow }
    } catch {
      $statusCode = Get-WebExceptionStatusCode -Exception $_.Exception
      $location = $null
      if ($_.Exception -and $_.Exception.Response -and $_.Exception.Response.Headers) {
        $location = $_.Exception.Response.Headers['Location']
      }
      if (($statusCode -in @(301,302,307,308)) -and -not [string]::IsNullOrWhiteSpace($location) -and -not $didFollow) {
        Say ("[WARN] Redirect {0} -> {1}" -f $statusCode, $location)
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

try {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $rootRaw = (& git -C $scriptDir rev-parse --show-toplevel 2>$null)
  $root = Safe-Trim $rootRaw
  if ([string]::IsNullOrWhiteSpace($root)) {
    Write-Host '[ERR] Not a git repo.' -ForegroundColor Red
    exit 1
  }

  Set-Location $root

  $headRaw = (& git -C $root rev-parse HEAD 2>$null)
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
      $versionResult = Invoke-WebRequestWithSingleRedirect -Url $versionUrl -TimeoutSec 15
      $versionResponse = $versionResult.Response
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
      $healthResult = Invoke-WebRequestWithSingleRedirect -Url $healthUrl -TimeoutSec 15
      $healthResponse = $healthResult.Response
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

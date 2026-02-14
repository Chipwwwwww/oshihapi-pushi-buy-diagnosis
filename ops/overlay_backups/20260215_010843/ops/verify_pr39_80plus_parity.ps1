param(
  [string]$ProdHost = "",
  [switch]$SkipProd
)

function Say($m){ Write-Host $m }

$root = (& git rev-parse --show-toplevel 2>$null)
if (-not $root) { Write-Host "❌ Not a git repo." -ForegroundColor Red; exit 1 }
$root = $root.Trim()
Set-Location $root

$head = (& git rev-parse HEAD).Trim()
Say ("HEAD: {0}" -f $head)

$mustPaths = @(
  "post_merge_routine.ps1",
  "app/api/telemetry/route.ts",
  "app/api/telemetry/health/route.ts",
  "app/api/version/route.ts",
  "app/flow/FlowClient.tsx",
  "app/page.tsx",
  "app/history/page.tsx",
  "app/result/[runId]/page.tsx",
  "docs/restore_main_pr39_to_80plus_report.md"
)

Say "`n=== must-have paths (LiteralPath) ==="
foreach($p in $mustPaths){
  $mark = "❌"
  if (Test-Path -LiteralPath $p) { $mark = "✅" }
  "{0}  {1}" -f $mark, $p | Write-Host
}

if (-not $ProdHost) {
  if (Test-Path -LiteralPath "ops/vercel_prod_host.txt") {
    $line = (Get-Content -LiteralPath "ops/vercel_prod_host.txt" -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($line) { $ProdHost = $line.Trim() }
  }
  if (-not $ProdHost) { $ProdHost = "https://oshihapi-pushi-buy-diagnosis.vercel.app" }
}
if ($ProdHost.EndsWith("/")) { $ProdHost = $ProdHost.TrimEnd("/") }

if (-not $SkipProd) {
  Say "`n=== PROD smoke ==="
  try {
    $ver = (Invoke-WebRequest "$ProdHost/api/version" -UseBasicParsing).Content | ConvertFrom-Json
    Say ("PROD commitSha: {0}" -f $ver.commitSha)
    Say ("PROD gitRef:    {0}" -f $ver.gitRef)
    Say ("Match HEAD:     {0}" -f (($ver.commitSha) -eq $head))
  } catch {
    Say ("PROD /api/version FAIL: {0}" -f $_.Exception.Message)
  }

  try {
    $h = (Invoke-WebRequest "$ProdHost/api/telemetry/health" -UseBasicParsing).Content
    Say ("PROD /api/telemetry/health: {0}" -f $h)
  } catch {
    Say ("PROD /api/telemetry/health FAIL: {0}" -f $_.Exception.Message)
  }
}

Say "`nNext: run .\post_merge_routine.ps1 for full post-merge verification."

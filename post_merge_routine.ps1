$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "post_merge_routine_v3.ps1"

if (-not (Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

& $scriptPath
if ($LASTEXITCODE -ne 0) {
  throw "post_merge_routine_v3.ps1 failed with exit code $LASTEXITCODE"
}

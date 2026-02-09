$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
  )

  Write-Host "Running: $Command $($Arguments -join ' ')"
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE: $Command $($Arguments -join ' ')"
  }
}

function Stop-PortProcess {
  param(
    [Parameter(Mandatory = $true)][int[]]$Ports
  )

  foreach ($port in $Ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $connections) {
      continue
    }

    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
      $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
      if ($process) {
        Write-Host "Stopping process $($process.Name) (PID $pid) on port $port"
        Stop-Process -Id $pid -Force
      }
    }
  }
}

Invoke-CheckedCommand git fetch
Invoke-CheckedCommand git pull

if (Test-Path ".next") {
  Write-Host "Removing .next directory"
  Remove-Item -Recurse -Force ".next"
}

Stop-PortProcess -Ports 3000, 3001, 3002

Invoke-CheckedCommand npm ci
Invoke-CheckedCommand npm run build

Write-Host "Starting dev server on port 3000"
Invoke-CheckedCommand npm run dev -- --webpack -p 3000

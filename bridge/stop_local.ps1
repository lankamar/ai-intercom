# stop_local.ps1 - AI Intercom: Apaga bridge + cerebro local (Windows)
# Uso: .\stop_local.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ScriptDir "..\logs"

Write-Host "==================================" -ForegroundColor Red
Write-Host "  AI Intercom - Apagando sistema" -ForegroundColor Red
Write-Host "==================================" -ForegroundColor Red

foreach ($service in @("bridge", "brain")) {
    $pidFile = "$LogDir\$service.pid"
    if (Test-Path $pidFile) {
        $savedPid = Get-Content $pidFile
        try {
            Stop-Process -Id $savedPid -Force
            Write-Host "  OK $service (PID: $savedPid) detenido." -ForegroundColor Green
        } catch {
            Write-Host "  INFO $service ya no estaba corriendo." -ForegroundColor Gray
        }
        Remove-Item $pidFile
    }
}

# Fallback: matar cualquier proceso en el puerto 8765
$oldConn = Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue
if ($oldConn) {
    $oldPid = $oldConn.OwningProcess | Select-Object -First 1
    Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
    Write-Host "  Proceso residual en 8765 eliminado." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Todo apagado." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Red

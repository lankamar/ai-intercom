# stop_local.ps1 — AI Intercom: Apaga bridge + cerebro local (Windows)
# Uso: .\stop_local.ps1
# ─────────────────────────────────────────────────

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ScriptDir "..\logs"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
Write-Host " 🛑 AI Intercom — Apagando sistema" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red

foreach ($service in @("bridge", "brain")) {
    $pidFile = "$LogDir\$service.pid"
    if (Test-Path $pidFile) {
        $pid = Get-Content $pidFile
        try {
            Stop-Process -Id $pid -Force
            Write-Host "   ✅ $service (PID: $pid) detenido." -ForegroundColor Green
        } catch {
            Write-Host "   ℹ️  $service ya no estaba corriendo." -ForegroundColor Gray
        }
        Remove-Item $pidFile
    }
}

# Fallback: matar cualquier proceso en el puerto 8765
$oldProcess = Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($oldProcess) {
    Stop-Process -Id $oldProcess -Force -ErrorAction SilentlyContinue
    Write-Host "   🔫 Proceso residual en 8765 eliminado." -ForegroundColor Yellow
}

Write-Host ""
Write-Host " ✅ Todo apagado." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red

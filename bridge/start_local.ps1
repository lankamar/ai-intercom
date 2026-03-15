# start_local.ps1 — AI Intercom: Levanta bridge + cerebro local (Windows)
# Uso: .\start_local.ps1
# ─────────────────────────────────────────────────

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ScriptDir "..\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " 🚀 AI Intercom — Iniciando sistema" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Matar cualquier proceso viejo en el puerto 8765
$oldProcess = Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($oldProcess) {
    Write-Host "⚠️  Puerto 8765 ocupado (PID: $oldProcess). Matando proceso..." -ForegroundColor Yellow
    Stop-Process -Id $oldProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# 1. Levantar el bridge en background
Write-Host "🌉 Levantando bridge..." -ForegroundColor Green
$bridge = Start-Process python -ArgumentList "$ScriptDir\bridge.py" `
    -RedirectStandardOutput "$LogDir\bridge.log" `
    -RedirectStandardError "$LogDir\bridge_err.log" `
    -PassThru -WindowStyle Hidden
$bridge.Id | Out-File "$LogDir\bridge.pid"
Write-Host "   ✅ Bridge PID: $($bridge.Id)" -ForegroundColor Green
Start-Sleep -Seconds 2

# 2. Levantar el cerebro local en background
Write-Host "🧠 Levantando cerebro local..." -ForegroundColor Green
$brain = Start-Process python -ArgumentList "$ScriptDir\local_brain_test.py" `
    -RedirectStandardOutput "$LogDir\brain.log" `
    -RedirectStandardError "$LogDir\brain_err.log" `
    -PassThru -WindowStyle Hidden
$brain.Id | Out-File "$LogDir\brain.pid"
Write-Host "   ✅ Brain PID: $($brain.Id)" -ForegroundColor Green
Start-Sleep -Seconds 1

# 3. Verificar salud
Write-Host ""
Write-Host "🩺 Verificando estado del bridge..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8765/health" -Method Get
    Write-Host "   Status  : $($health.status)" -ForegroundColor Green
    Write-Host "   Version : $($health.version)" -ForegroundColor Green
    Write-Host "   Brain   : $($health.brain)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Bridge aún no responde. Revisá logs\bridge.log" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " ✅ Sistema operativo en localhost:8765" -ForegroundColor Cyan
Write-Host " 📄 Logs: $LogDir" -ForegroundColor Gray
Write-Host " 🛑 Para apagar: .\stop_local.ps1" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

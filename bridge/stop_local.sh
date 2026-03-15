#!/bin/bash
# stop_local.sh — AI Intercom: Apaga bridge + cerebro local
# Uso: bash stop_local.sh
# ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGDIR="$SCRIPT_DIR/../logs"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 🛑 AI Intercom — Apagando sistema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Matar por PID guardado
for service in bridge brain; do
    PID_FILE="$LOGDIR/$service.pid"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            echo "   ✅ $service (PID: $PID) detenido."
        else
            echo "   ℹ️  $service ya no estaba corriendo."
        fi
        rm -f "$PID_FILE"
    fi
done

# Fallback: matar cualquier proceso en el puerto 8765
OLD_PID=$(lsof -ti:8765 2>/dev/null)
if [ -n "$OLD_PID" ]; then
    kill -9 $OLD_PID
    echo "   🔫 Proceso residual en 8765 eliminado."
fi

echo ""
echo " ✅ Todo apagado."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

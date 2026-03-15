#!/bin/bash
# start_local.sh — AI Intercom: Levanta bridge + cerebro local
# Uso: bash start_local.sh
# ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGDIR="$SCRIPT_DIR/../logs"
mkdir -p "$LOGDIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " 🚀 AI Intercom — Iniciando sistema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Matar cualquier proceso viejo en el puerto 8765
OLD_PID=$(lsof -ti:8765 2>/dev/null)
if [ -n "$OLD_PID" ]; then
    echo "⚠️  Puerto 8765 ocupado (PID: $OLD_PID). Matando proceso..."
    kill -9 $OLD_PID
    sleep 1
fi

# 1. Levantar el bridge
echo "🌉 Levantando bridge..."
nohup python3 "$SCRIPT_DIR/bridge.py" > "$LOGDIR/bridge.log" 2>&1 &
BRIDGE_PID=$!
echo $BRIDGE_PID > "$LOGDIR/bridge.pid"
echo "   ✅ Bridge PID: $BRIDGE_PID"
sleep 2

# 2. Levantar el cerebro local
echo "🧠 Levantando cerebro local..."
nohup python3 "$SCRIPT_DIR/local_brain_test.py" > "$LOGDIR/brain.log" 2>&1 &
BRAIN_PID=$!
echo $BRAIN_PID > "$LOGDIR/brain.pid"
echo "   ✅ Brain PID: $BRAIN_PID"
sleep 1

# 3. Verificar salud
echo ""
echo "🩺 Verificando estado del bridge..."
sleep 1
curl -s http://localhost:8765/health | python3 -m json.tool || echo "   ⚠️  Bridge aún no responde. Revisá logs/bridge.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ Sistema operativo en localhost:8765"
echo " 📄 Logs: $LOGDIR/"
echo " 🛑 Para apagar: bash stop_local.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

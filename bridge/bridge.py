"""
Antigravity Bridge v1.5.0 — Sistema de Bandeja
================================================
Conecta Chrome con Antigravity usando archivos de bandeja compartida.

Flujo:
  Chrome → /ws/chrome → bridge → inbox.json  ← Antigravity lee esto
  Antigravity escribe → outbox.json → bridge → Chrome

El bridge tambien acepta conexion directa en /ws/antigravity para
implementaciones futuras que no usen archivos.
"""

import asyncio
import json
import logging
import os
import sys
import struct
import time
from pathlib import Path
from aiohttp import web, WSMsgType

# --- Configuracion ---
VERSION    = "1.6.0"
HOST       = "localhost"
PORT       = 8765
BRIDGE_DIR = Path(__file__).parent

INBOX_FILE  = BRIDGE_DIR / "inbox.json"   # Mensajes de Chrome para Antigravity
OUTBOX_FILE = BRIDGE_DIR / "outbox.json"  # Respuestas de Antigravity para Chrome

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(BRIDGE_DIR / "bridge.log"), encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("bridge")

# --- Estado ---
class State:
    def __init__(self):
        self.antigravity_ws  = None   # Conexion directa del cerebro (opcional)
        self.chrome_clients  = set()  # Clientes Chrome conectados por WS

state = State()

# ─────────────────────────────────────────────
#  Sistema de Bandeja (Inbox / Outbox)
# ─────────────────────────────────────────────

def write_inbox(message: dict):
    """Guarda un mensaje de Chrome en inbox.json para que Antigravity lo lea."""
    try:
        try:
            existing = json.loads(INBOX_FILE.read_text(encoding="utf-8"))
        except Exception:
            existing = []
        existing.append({**message, "_timestamp": time.time()})
        INBOX_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        log.error("Error escribiendo inbox: %s", e)

async def outbox_watcher():
    """
    Monitorea outbox.json. Cuando Antigravity escribe una respuesta,
    la envia a todos los clientes Chrome y limpia el archivo.
    """
    log.info("Iniciando outbox watcher...")
    last_mtime = 0

    while True:
        try:
            if OUTBOX_FILE.exists():
                mtime = OUTBOX_FILE.stat().st_mtime
                if mtime > last_mtime:
                    last_mtime = mtime
                    try:
                        content = json.loads(OUTBOX_FILE.read_text(encoding="utf-8"))
                    except Exception:
                        content = None

                    if content:
                        # Normalizar a lista de mensajes
                        messages = content if isinstance(content, list) else [content]
                        for msg in messages:
                            log.info("Outbox -> Chrome: type=%s", msg.get("type", "?"))
                            await broadcast_to_chrome(msg)
                            # Si hay conexion directa de Antigravity, tambien enviar
                            if state.antigravity_ws and not state.antigravity_ws.closed:
                                pass  # El cerebro YA escribio, no re-enviar

                        # Limpiar outbox despues de enviar
                        OUTBOX_FILE.write_text("[]", encoding="utf-8")

        except Exception as e:
            log.error("Error en outbox_watcher: %s", e)

        await asyncio.sleep(0.5)

async def broadcast_to_chrome(data: dict):
    """Envia un mensaje a todos los clientes Chrome conectados."""
    dead = set()
    for ws in state.chrome_clients:
        try:
            if not ws.closed:
                await ws.send_str(json.dumps(data))
        except Exception:
            dead.add(ws)
    state.chrome_clients -= dead

# ─────────────────────────────────────────────
#  WebSocket Handlers
# ─────────────────────────────────────────────

async def ws_chrome_handler(request):
    """Chrome se conecta aqui (service_worker.js)."""
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    state.chrome_clients.add(ws)
    log.info("Chrome conectado. Total clientes: %d", len(state.chrome_clients))

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                except Exception:
                    continue

                msg_type = data.get("type", "?")
                log.info("Chrome -> Bridge: type=%s", msg_type)

                # Solo guardar en inbox los mensajes de chat (no el contexto)
                if msg_type == "chat" and data.get("role") == "user":
                    write_inbox(data)
                    log.info("Mensaje guardado en inbox para Antigravity")

                # Si hay conexion directa del cerebro, reenviar tambien
                if state.antigravity_ws and not state.antigravity_ws.closed:
                    try:
                        await state.antigravity_ws.send_str(msg.data)
                    except Exception:
                        state.antigravity_ws = None

            elif msg.type in (WSMsgType.ERROR, WSMsgType.CLOSE):
                break
    finally:
        state.chrome_clients.discard(ws)
        log.info("Chrome desconectado. Restantes: %d", len(state.chrome_clients))

    return ws

async def ws_antigravity_handler(request):
    """Cerebro se conecta aqui (conexion directa, opcional)."""
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    state.antigravity_ws = ws
    log.info("Cerebro conectado directamente (ws/antigravity)")

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                except Exception:
                    continue
                log.info("Cerebro -> Chrome: type=%s", data.get("type", "?"))
                await broadcast_to_chrome(data)
            elif msg.type in (WSMsgType.ERROR, WSMsgType.CLOSE):
                break
    finally:
        state.antigravity_ws = None
        log.info("Cerebro desconectado")

    return ws

async def health_handler(request):
    brain_ok = state.antigravity_ws is not None and not state.antigravity_ws.closed
    try:
        inbox_count = len(json.loads(INBOX_FILE.read_text(encoding="utf-8"))) if INBOX_FILE.exists() else 0
    except Exception:
        inbox_count = 0
    return web.json_response({
        "status":         "ok",
        "version":        VERSION,
        "brain":          "online" if brain_ok else "inbox_mode",
        "chrome_clients": len(state.chrome_clients),
        "inbox_pending":  inbox_count
    })

# ─────────────────────────────────────────────
#  Endpoint para que Antigravity lea el inbox
# ─────────────────────────────────────────────

async def inbox_handler(request):
    """GET /inbox — Antigravity lee los mensajes pendientes."""
    try:
        messages = json.loads(INBOX_FILE.read_text(encoding="utf-8")) if INBOX_FILE.exists() else []
    except Exception:
        messages = []
    # Limpiar inbox despues de leer
    INBOX_FILE.write_text("[]", encoding="utf-8")
    return web.json_response(messages)

async def outbox_handler(request):
    """POST /outbox — Antigravity envia una respuesta."""
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "JSON invalido"}, status=400)

    # Escribir al outbox (el watcher lo enviara a Chrome)
    try:
        existing = json.loads(OUTBOX_FILE.read_text(encoding="utf-8")) if OUTBOX_FILE.exists() else []
    except Exception:
        existing = []

    messages = data if isinstance(data, list) else [data]
    existing.extend(messages)
    OUTBOX_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("Outbox: %d mensaje(s) de Antigravity encolado(s)", len(messages))
    return web.json_response({"ok": True, "queued": len(messages)})

# ─────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────

async def main():
    # Inicializar archivos de bandeja
    for f in [INBOX_FILE, OUTBOX_FILE]:
        if not f.exists():
            f.write_text("[]", encoding="utf-8")

    app = web.Application()
    app.router.add_get( "/ws/chrome",      ws_chrome_handler)
    app.router.add_get( "/ws/antigravity", ws_antigravity_handler)
    app.router.add_get( "/health",         health_handler)
    app.router.add_get( "/inbox",          inbox_handler)
    app.router.add_post("/outbox",         outbox_handler)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, HOST, PORT)
    await site.start()

    log.info("Bridge v%s activo en http://%s:%d", VERSION, HOST, PORT)
    log.info("  /ws/chrome    <- Chrome")
    log.info("  /ws/antigravity <- Cerebro (directo)")
    log.info("  GET  /inbox   <- Antigravity lee mensajes")
    log.info("  POST /outbox  <- Antigravity envia respuesta")
    log.info("  GET  /health  <- Estado")

    # Iniciar watcher del outbox en segundo plano
    asyncio.create_task(outbox_watcher())

    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Bridge apagado.")

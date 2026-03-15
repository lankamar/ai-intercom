"""
intercom_skill.py — Skill de Antigravity para AI Intercom
==========================================================
Permite a Antigravity (VS Code) leer mensajes desde Chrome
y responder directamente al browser en tiempo real.

Uso desde Antigravity:
    from bridge.intercom_skill import IntercomBridge
    ic = IntercomBridge()
    ic.poll()          # Lee mensajes pendientes de Chrome
    ic.reply('Hola!')  # Responde a Chrome

O en modo automatico:
    ic.watch(callback=mi_funcion)  # Escucha continua
"""

import json
import time
import threading
import urllib.request
import urllib.error
from datetime import datetime


BRIDGE_URL = "http://localhost:8765"


class IntercomBridge:
    """
    Cliente liviano para que Antigravity se comunique con Chrome
    a traves del bridge local. Sin dependencias externas.
    """

    def __init__(self, bridge_url: str = BRIDGE_URL):
        self.bridge_url = bridge_url.rstrip("/")
        self._watching = False
        self._watch_thread = None

    # ─────────────────────────────────────────────
    # Leer mensajes de Chrome
    # ─────────────────────────────────────────────

    def poll(self) -> list:
        """
        Lee y retorna los mensajes pendientes de Chrome.
        El inbox se limpia despues de leer.
        Retorna lista de mensajes o [] si no hay.
        """
        try:
            req = urllib.request.Request(
                f"{self.bridge_url}/inbox",
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data:
                    print(f"[Intercom] {len(data)} mensaje(s) de Chrome:")
                    for msg in data:
                        ts = msg.get("_timestamp", "")
                        content = msg.get("content", "")
                        print(f"  [{self._fmt_time(ts)}] Marcelo: {content}")
                return data
        except urllib.error.URLError:
            print(f"[Intercom] Bridge no disponible en {self.bridge_url}")
            return []
        except Exception as e:
            print(f"[Intercom] Error al leer inbox: {e}")
            return []

    # ─────────────────────────────────────────────
    # Responder a Chrome
    # ─────────────────────────────────────────────

    def reply(self, content: str, msg_type: str = "chat") -> bool:
        """
        Envia una respuesta de Antigravity a Chrome.
        El mensaje aparece en el panel lateral del browser.
        """
        payload = json.dumps({
            "type": msg_type,
            "role": "assistant",
            "content": content,
            "from": "antigravity",
            "timestamp": time.time()
        }).encode("utf-8")
        try:
            req = urllib.request.Request(
                f"{self.bridge_url}/outbox",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                if result.get("ok"):
                    print(f"[Intercom] -> Chrome: {content[:80]}")
                    return True
        except urllib.error.URLError:
            print(f"[Intercom] Bridge no disponible en {self.bridge_url}")
        except Exception as e:
            print(f"[Intercom] Error al enviar respuesta: {e}")
        return False

    # ─────────────────────────────────────────────
    # Estado del sistema
    # ─────────────────────────────────────────────

    def health(self) -> dict:
        """Retorna el estado del bridge."""
        try:
            req = urllib.request.Request(f"{self.bridge_url}/health")
            with urllib.request.urlopen(req, timeout=3) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception:
            return {"status": "offline", "bridge": self.bridge_url}

    def is_online(self) -> bool:
        """Verifica si el bridge esta activo."""
        return self.health().get("status") == "ok"

    # ─────────────────────────────────────────────
    # Modo escucha continua
    # ─────────────────────────────────────────────

    def watch(self, callback=None, interval: float = 1.0):
        """
        Inicia escucha continua en hilo separado.
        callback(messages) se llama cuando llegan mensajes nuevos.
        Si callback es None, imprime los mensajes en consola.
        """
        if self._watching:
            print("[Intercom] Ya esta en modo watch.")
            return

        def _default_callback(messages):
            for msg in messages:
                content = msg.get("content", "")
                print(f"[Intercom] Chrome dice: {content}")

        handler = callback or _default_callback

        def _loop():
            print(f"[Intercom] Iniciando modo watch (intervalo: {interval}s)")
            while self._watching:
                msgs = self.poll()
                if msgs:
                    handler(msgs)
                time.sleep(interval)
            print("[Intercom] Watch detenido.")

        self._watching = True
        self._watch_thread = threading.Thread(target=_loop, daemon=True)
        self._watch_thread.start()

    def stop_watch(self):
        """Detiene la escucha continua."""
        self._watching = False

    # ─────────────────────────────────────────────
    # Utilidades
    # ─────────────────────────────────────────────

    @staticmethod
    def _fmt_time(ts) -> str:
        if not ts:
            return "--:--"
        try:
            return datetime.fromtimestamp(float(ts)).strftime("%H:%M:%S")
        except Exception:
            return str(ts)[:8]


# ─────────────────────────────────────────────
# Uso rapido desde terminal / Antigravity
# ─────────────────────────────────────────────

if __name__ == "__main__":
    ic = IntercomBridge()

    print("[Intercom] Estado del bridge:")
    h = ic.health()
    print(f"  Status  : {h.get('status')}")
    print(f"  Version : {h.get('version')}")
    print(f"  Brain   : {h.get('brain')}")
    print(f"  Clientes: {h.get('chrome_clients')}")
    print(f"  Inbox   : {h.get('inbox_pending')} mensajes")
    print()

    print("[Intercom] Mensajes pendientes de Chrome:")
    msgs = ic.poll()
    if not msgs:
        print("  (Sin mensajes)")
    print()

    # Enviar mensaje de prueba a Chrome
    ic.reply("Hola desde Antigravity! Bridge funcionando correctamente.")

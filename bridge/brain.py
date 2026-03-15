import asyncio
import json
import logging
import aiohttp
import os
import time
from pathlib import Path
import websockets

# --- Configuracion ---
VERSION = "1.6.0"
WS_URL = "ws://localhost:8765/ws/antigravity"
API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")  # Tu API Key
MODEL = "gemini-flash-latest"

SYSTEM_PROMPT = """Eres Antigravity, una IA potente, minimalista y directa diseñada por Google DeepMind.
Tu personalidad es profesional pero cercana, experta en código y diseño premium.
Respondes desde una extensión de Chrome.
Si el usuario te pide algo técnico, sé preciso. Si es charla, sé amable.
IMPORTANTE: Responde siempre en el idioma que te hable el usuario (español por defecto)."""

# Logs
LOG_FILE = Path(__file__).parent / "brain.log"
SHADOW_LOG = Path(__file__).parent / "shadow_conversation.md"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BRAIN] %(message)s",
    handlers=[logging.FileHandler(str(LOG_FILE), encoding="utf-8"), logging.StreamHandler()]
)
log = logging.getLogger("brain")

def shadow_log(role, content):
    """Espeja la conversación para que el Agente en VS Code pueda verla."""
    with open(SHADOW_LOG, "a", encoding="utf-8") as f:
        timestamp = time.strftime("%H:%M:%S")
        f.write(f"\n### [{timestamp}] {role.upper()}:\n{content}\n")

class AntigravityBrain:
    def __init__(self):
        self.ws = None
        self.session = None

    async def call_gemini(self, prompt):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\nUsuario: {prompt}"}]}]
        }
        try:
            async with self.session.post(url, json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data['candidates'][0]['content']['parts'][0]['text']
                else:
                    err = await resp.text()
                    log.error(f"Error Gemini API ({resp.status}): {err}")
                    return "Lo siento, tuve un error al conectar con mis neuronas (API Error)."
        except Exception as e:
            log.error(f"Excepción en Gemini: {e}")
            return "Error fatal en mis neuronas. Revisa el log."

    async def run(self):
        self.session = aiohttp.ClientSession()
        while True:
            try:
                log.info(f"Conectando al bridge en {WS_URL}...")
                async with websockets.connect(WS_URL) as ws:
                    self.ws = ws
                    log.info("✅ Conectado al Bridge. Esperando mensajes...")
                    
                    async for message in ws:
                        data = json.loads(message)
                        if data.get("type") == "chat" and data.get("role") == "user":
                            user_msg = data.get("content")
                            log.info(f"Recibido: {user_msg}")
                            shadow_log("usuario", user_msg)
                            
                            # Generar respuesta
                            response_text = await self.call_gemini(user_msg)
                            
                            # Enviar al bridge
                            reply = {
                                "type": "chat",
                                "role": "assistant",
                                "content": response_text
                            }
                            await ws.send(json.dumps(reply))
                            log.info(f"Enviado: {response_text[:50]}...")
                            shadow_log("antigravity", response_text)

            except Exception as e:
                log.error(f"Error de conexión: {e}. Reintentando en 5s...")
                await asyncio.sleep(5)

if __name__ == "__main__":
    brain = AntigravityBrain()
    try:
        asyncio.run(brain.run())
    except KeyboardInterrupt:
        pass

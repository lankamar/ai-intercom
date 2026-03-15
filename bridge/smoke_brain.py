import asyncio
import json
import logging
import time
import websockets

# --- Configuration ---
WS_URL = "ws://localhost:8765/ws/antigravity"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [SMOKE-BRAIN] %(message)s"
)
log = logging.getLogger("smoke-brain")

async def run_smoke_brain():
    while True:
        try:
            log.info(f"Connecting to bridge at {WS_URL}...")
            async with websockets.connect(WS_URL) as ws:
                log.info("✅ Connected! I will echo everything you say in Chrome.")
                
                async for message in ws:
                    data = json.loads(message)
                    if data.get("type") == "chat" and data.get("role") == "user":
                        user_msg = data.get("content")
                        log.info(f"Received from Chrome: {user_msg}")
                        
                        # Simulated "Brain" logic: just echo with a prefix
                        response_text = f"🤖 [SMOKE-TEST] Recibí tu mensaje: '{user_msg}'. El circuito funciona perfecto!"
                        
                        reply = {
                            "type": "chat",
                            "role": "assistant",
                            "content": response_text,
                            "timestamp": int(time.time())
                        }
                        await ws.send(json.dumps(reply))
                        log.info(f"Sent to Chrome: {response_text}")

        except Exception as e:
            log.error(f"Connection error: {e}. Retrying in 3s...")
            await asyncio.sleep(3)

if __name__ == "__main__":
    try:
        asyncio.run(run_smoke_brain())
    except KeyboardInterrupt:
        log.info("Smoke brain stopped.")

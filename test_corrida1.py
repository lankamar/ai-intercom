import sys
import time

sys.path.insert(0, '.')
from bridge.intercom_skill import IntercomBridge

ic = IntercomBridge()

print("=== PREFLIGHT ===")
h = ic.health()
print(f"  Status  : {h.get('status')}")
print(f"  Brain   : {h.get('brain')}")
print(f"  Clients : {h.get('chrome_clients')}")
print()

# --- Test 1-2-3: Mensajes simples ---
print("=== TEST 1-2-3: Mensajes simples ===")
simple = ["hola", "estado", "cuantos clientes hay?"]
results = {}
for msg in simple:
    sent = ic.reply(msg, msg_type="chat")
    results[msg] = "PASS" if sent else "FAIL"
    print(f"  [{results[msg]}] -> {msg}")
    time.sleep(0.5)

# --- Test 4: 3 mensajes rapidos seguidos ---
print()
print("=== TEST 4: 3 mensajes rapidos seguidos ===")
rapid_results = []
for i in range(3):
    msg = f"rapido-{i+1}"
    sent = ic.reply(msg)
    rapid_results.append(sent)
    print(f"  [{'PASS' if sent else 'FAIL'}] -> {msg}")

# --- Test 5: Espera 30s + ping ---
print()
print("=== TEST 5: Espera 30s + ping ===")
print("  Esperando 30s para probar reconexion...")
time.sleep(30)
sent_ping = ic.reply("ping")
h2 = ic.health()
print(f"  [{'PASS' if sent_ping else 'FAIL'}] -> ping")
print(f"  Health post-wait: {h2.get('status')} | brain: {h2.get('brain')}")

# --- Resumen Final ---
print()
print("=== RESULTADO CORRIDA 1 ===")
all_simple = all(v == "PASS" for v in results.values())
all_rapid = all(rapid_results)
print(f"  Test 1 (hola)                : {results.get('hola', 'N/A')}")
print(f"  Test 2 (estado)              : {results.get('estado', 'N/A')}")
print(f"  Test 3 (cuantos clientes)    : {results.get('cuantos clientes hay?', 'N/A')}")
print(f"  Test 4 (3 rapidos)           : {'PASS' if all_rapid else 'FAIL'}")
print(f"  Test 5 (30s + ping)          : {'PASS' if sent_ping else 'FAIL'}")
print(f"  Bridge post-test             : {h2.get('status')} | clients: {h2.get('chrome_clients')}")
print(f"  ESTADO FINAL: {'PASS COMPLETO' if all_simple and all_rapid and sent_ping else 'FAIL - VER ITEMS ARRIBA'}")

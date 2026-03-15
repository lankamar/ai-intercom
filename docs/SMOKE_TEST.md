# 🧪 AI Intercom Smote Test Guide

Usa esta guía para validar todo el sistema (Chrome ↔ Bridge ↔ Brain) en menos de 2 minutos, **sin necesidad de configurar API keys de Gemini**.

## 🛠️ Procedimiento de 3 Terminales

Sigue este orden exacto:

### Terminal 1: El Bridge (El Servidor)
Este es el "intercomunicador" central.
```powershell
cd C:\Users\Teresa\.gemini\antigravity\scratch\ai-intercom\bridge\
python bridge.py
```
*Deberías ver: `Bridge v1.6.0 activo en http://localhost:8765`*

### Terminal 2: El Cerebro Local (Smoke Brain)
Este script simula ser una IA pero corre 100% local y solo hace "eco".
```powershell
cd C:\Users\Teresa\.gemini\antigravity\scratch\ai-intercom\bridge\
python smoke_brain.py
```
*Deberías ver: `✅ Connected! I will echo everything you say in Chrome.`*

### Terminal 3: La Extensión (Chrome)
1. Abre `chrome://extensions/` en tu navegador.
2. Activa el "Modo desarrollador".
3. Haz clic en "Cargar descomprimida" y selecciona la carpeta: `C:\Users\Teresa\.gemini\antigravity\scratch\ai-intercom\extension\`
4. Abre el **Side Panel** de la extensión.

---

## 🚀 La Prueba Real
1. Escribe cualquier cosa en el chat de Chrome (ej: "Hola Antigravity").
2. Mira las terminales: el mensaje pasará por el Bridge, llegará al Smoke Brain, y este responderá.
3. Verás la respuesta inmediata en Chrome con el prefijo `🤖 [SMOKE-TEST]`.

Si esto funciona, **toda tu tubería está lista** para usar el `brain.py` real con Gemini o cualquier otra IA.

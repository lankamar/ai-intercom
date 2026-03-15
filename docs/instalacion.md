# Guia de Instalacion — AI Intercom

Esta guia te lleva paso a paso desde cero hasta tener Chrome y Antigravity comunicandose en tiempo real.

---

## Requisitos Previos

| Requisito | Version minima | Verificar |
|---|---|---|
| Python | 3.9+ | `python --version` |
| pip | cualquiera | `pip --version` |
| Chrome / Chromium | 88+ | barra de direcciones |
| VS Code | cualquiera | |
| Antigravity | instalado | |

---

## Paso 1: Clonar el Repositorio

```powershell
# En PowerShell o terminal
git clone https://github.com/lankamar/ai-intercom.git
cd ai-intercom
```

---

## Paso 2: Instalar el Bridge Python

```powershell
cd bridge
pip install -r requirements.txt
```

### Iniciar el Bridge

```powershell
python bridge.py
```

Deberias ver:
```
[INFO] Bridge v1.6.0 activo en http://localhost:8765
[INFO]  /ws/chrome <- Chrome
[INFO]  /ws/antigravity <- Cerebro (directo)
[INFO]  GET /inbox <- Antigravity lee mensajes
[INFO]  POST /outbox <- Antigravity envia respuesta
[INFO]  GET /health <- Estado
[INFO] Iniciando outbox watcher...
```

### Verificar que funciona

Abrir en Chrome: http://localhost:8765/health

Respuesta esperada:
```json
{
  "status": "ok",
  "version": "1.6.0",
  "brain": "inbox_mode",
  "chrome_clients": 0,
  "inbox_pending": 0
}
```

---

## Paso 3: Instalar la Extension Chrome

1. Abrir Chrome y navegar a: `chrome://extensions`
2. Activar el toggle **Modo desarrollador** (esquina superior derecha)
3. Click en **Cargar sin empaquetar**
4. Navegar a la carpeta `ai-intercom/extension/`
5. Confirmar la seleccion

El icono del intercomunicador aparece en la barra de herramientas.

### Verificar conexion

Hacer click en el icono de la extension. El panel lateral deberia abrirse con un indicador verde de conexion.

---

## Paso 4: Conectar Antigravity (VS Code)

### Opcion A: Uso manual con intercom_skill.py

```python
# Desde VS Code terminal o Antigravity
import sys
sys.path.insert(0, 'ruta/a/ai-intercom')

from bridge.intercom_skill import IntercomBridge

ic = IntercomBridge()

# Ver estado
print(ic.health())

# Leer mensajes que envio Marcelo desde Chrome
mensajes = ic.poll()

# Responder a Chrome
ic.reply("Hola Marcelo, te recibo desde VS Code!")
```

### Opcion B: Escucha automatica en Antigravity

```python
from bridge.intercom_skill import IntercomBridge

ic = IntercomBridge()

def cuando_llega_mensaje(mensajes):
    for msg in mensajes:
        pregunta = msg.get('content', '')
        print(f"Marcelo pregunta: {pregunta}")
        # Aqui Antigravity procesa y responde
        respuesta = f"Entendido: {pregunta}"
        ic.reply(respuesta)

# Iniciar escucha (no bloquea)
ic.watch(callback=cuando_llega_mensaje, interval=1.0)
```

### Opcion C: Script de prueba directo

```powershell
cd bridge
python intercom_skill.py
```

Muestra el estado del bridge y envia un mensaje de prueba a Chrome.

---

## Paso 5: Probar la Comunicacion

### Flujo completo de prueba:

1. Bridge corriendo (`python bridge.py`)
2. Extension instalada en Chrome
3. Abrir el panel del intercomunicador en Chrome
4. Escribir un mensaje en Chrome
5. En VS Code: `ic.poll()` retorna tu mensaje
6. Responder: `ic.reply("Respuesta de prueba")`
7. Chrome muestra la respuesta en el panel

---

## Instalacion del Native Host (Windows)

Para que el bridge arranque automaticamente con Chrome:

```powershell
# Ejecutar como administrador
cd bridge
.\install_host.ps1
```

Esto registra el bridge como Native Messaging Host en Windows.

---

## Solucion de Problemas

### Bridge no arranca
```
Error: No module named 'aiohttp'
```
Solucion: `pip install aiohttp`

### Extension no conecta
- Verificar que el bridge este corriendo en el puerto 8765
- Ver `bridge/bridge.log` para errores
- Revisar consola de la extension en `chrome://extensions` -> Errores

### Chrome muestra rojo (desconectado)
- Bridge caido: reiniciar con `python bridge.py`
- Puerto en uso: cambiar PORT en bridge.py y manifest

### Antigravity no lee mensajes
```python
# Verificar primero
ic = IntercomBridge()
print(ic.health())  # Debe mostrar status: ok
```

---

## Archivos de Log

- `bridge/bridge.log` — Log completo del bridge
- `bridge/inbox.json` — Mensajes pendientes de Chrome para Antigravity
- `bridge/outbox.json` — Respuestas de Antigravity para Chrome

---

## Referencia Rapida de API

```
GET  http://localhost:8765/health     -> Estado del sistema
GET  http://localhost:8765/inbox      -> Lee mensajes de Chrome (limpia inbox)
POST http://localhost:8765/outbox     -> Envia mensaje a Chrome
WS   ws://localhost:8765/ws/chrome    -> Chrome se conecta aqui
WS   ws://localhost:8765/ws/antigravity -> Antigravity conexion directa
```

---

*Guia v1.0 — AI Intercom | Marcelo — lankamar*

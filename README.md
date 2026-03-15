# AI Intercom — Intercomunicador Bidireccional Chrome + Antigravity

> **"El que este abierto gobernara la conversacion del otro"** — Marcelo, 2025

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)](CHANGELOG.md)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](extension/)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/lankamar/ai-intercom)

---

## Vision

Un intercomunicador en tiempo real que conecta el navegador Chromium con el agente **Antigravity en VS Code**, eliminando el ida y vuelta manual entre ambos entornos durante el desarrollo de proyectos web.

## Mision

Permitir que Marcelo pueda chatear con Antigravity directamente desde el navegador, y que Antigravity pueda ver y responder desde VS Code — **sin APIs externas, sin nube, 100% local**.

## Meta

Extension Chrome + servidor Python local que actua como puente bidireccional real entre el browser y el agente de VS Code.

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [docs/VIABILITY.md](docs/VIABILITY.md) | Evaluación exhaustiva de viabilidad del proyecto |
| [docs/UX_DEEP_SPEC.md](docs/UX_DEEP_SPEC.md) | Especificación UX profunda con temperatura dinámica |
| [docs/NOTEBOOKLM_INSIGHTS.md](docs/NOTEBOOKLM_INSIGHTS.md) | Síntesis de investigación en NotebookLM |
| [docs/PRD.md](docs/PRD.md) | Product Requirements Document |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura del sistema |
| [docs/instalacion.md](docs/instalacion.md) | Guía completa de instalación |

---

## Arquitectura del Sistema

```
[Chrome Browser — Panel Lateral]
         |
         | WebSocket ws://localhost:8765/ws/chrome
         |
   [bridge.py — Servidor aiohttp local]
         |
    +----+----+
    |         |
 [inbox.json] [outbox.json]   <- Sistema de Bandeja
    |         |
    +----+----+
         |
 [Antigravity en VS Code]
  GET /inbox  <- Lee mensajes de Chrome
  POST /outbox <- Envia respuestas a Chrome
```

### Flujo de Datos

```
Marcelo escribe en Chrome  ->  WS /ws/chrome  ->  bridge.py  ->  inbox.json
Antigravity lee inbox      <-  GET /inbox     <-  bridge.py
Antigravity responde       ->  POST /outbox   ->  bridge.py  ->  Chrome
Chrome recibe respuesta    <-  outbox_watcher <-  bridge.py
```

### Endpoints del Bridge (puerto 8765)

| Endpoint | Metodo | Uso |
|---|---|---|
| `/ws/chrome` | WebSocket | Chrome se conecta aqui |
| `/ws/antigravity` | WebSocket | Conexion directa del cerebro (opcional) |
| `/inbox` | GET | Antigravity lee mensajes pendientes |
| `/outbox` | POST | Antigravity envia respuesta a Chrome |
| `/health` | GET | Estado del sistema |

---

## Estructura del Repositorio

```
ai-intercom/
+-- README.md                    <- Este archivo (PRD + Docs)
+-- bridge/
|   +-- bridge.py                <- Servidor aiohttp WebSocket v1.6.0
|   +-- brain.py                 <- Logica del cerebro / AI
|   +-- host.json                <- Native messaging host config
|   +-- install_host.ps1         <- Instalador PowerShell (Windows)
|   +-- native_wrapper.bat       <- Wrapper para native messaging
|   +-- requirements.txt         <- Python deps (aiohttp)
+-- extension/
|   +-- manifest.json            <- Manifest V3
|   +-- background/              <- Service Worker WebSocket
|   +-- side_panel/              <- UI del intercomunicador
|   +-- icons/                   <- Iconos de la extension
+-- docs/
|   +-- instalacion.md           <- Guia de instalacion completa
|   +-- arquitectura.md          <- Diagramas y decisiones
+-- .gitignore
+-- LICENSE
```

---

## Instalacion Rapida

### Requisitos

- Python 3.9+ con `aiohttp`
- Node.js (opcional, para scripts auxiliares)
- Google Chrome o Chromium
- Antigravity en VS Code

### 1. Instalar el Bridge Python

```bash
cd bridge
pip install -r requirements.txt
python bridge.py
# Bridge activo en http://localhost:8765
```

### 2. Instalar la Extension Chrome

1. Abrir Chrome -> `chrome://extensions`
2. Activar **Modo desarrollador** (esquina superior derecha)
3. Click **Cargar sin empaquetar**
4. Seleccionar la carpeta `extension/`
5. El icono del intercomunicador aparece en la barra

### 3. Usar con Antigravity en VS Code

Con el bridge corriendo, Antigravity puede:

```python
# Leer mensajes desde Chrome
import requests
mensajes = requests.get('http://localhost:8765/inbox').json()
for msg in mensajes:
    print(f"Chrome dice: {msg['content']}")

# Responder a Chrome
requests.post('http://localhost:8765/outbox', json={
    'type': 'chat',
    'role': 'assistant',
    'content': 'Respuesta de Antigravity'
})
```

### 4. Verificar Estado

```bash
curl http://localhost:8765/health
# {"status": "ok", "version": "1.6.0", "brain": "inbox_mode", ...}
```

---

## Experiencia de Usuario

### Chrome (Marcelo en el browser)
- Panel lateral con historial de mensajes
- Input de texto para escribir a Antigravity
- Indicador de estado: verde (conectado) / rojo (desconectado)
- Mensajes propios en azul, respuestas de Antigravity en verde

### VS Code (Antigravity)
- Lee `inbox.json` automaticamente o via GET /inbox
- Responde via POST /outbox -> llega en tiempo real a Chrome
- Conexion directa WebSocket disponible en /ws/antigravity
- Log completo en `bridge/bridge.log`

---

## Estados del Sistema

```
CONECTADO    -- Chrome <-> Bridge <-> Antigravity WS directo
INBOX_MODE   -- Chrome conectado, Antigravity usa HTTP (inbox/outbox)
DESCONECTADO -- Bridge no esta corriendo
```

---

## Stack Tecnologico (sin APIs externas)

| Componente | Tecnologia | Razon |
|---|---|---|
| Extension Chrome | Manifest V3, Vanilla JS | Sin frameworks, maxima compatibilidad |
| Bridge Server | Python aiohttp | Async, liviano, sin Express |
| Comunicacion | WebSocket + HTTP REST | Bidireccional, tiempo real, local |
| Persistencia | inbox.json / outbox.json | Sin base de datos |
| Antigravity | HTTP requests locales | Integra con runtime existente |

---

## Roadmap

- [x] Bridge Python con WebSocket y sistema inbox/outbox
- [x] Chrome Extension con Side Panel
- [x] Native messaging host (Windows)
- [x] Endpoints REST para Antigravity
- [x] Documentacion de instalacion detallada
- [x] Antigravity skill file (intercom_skill.py)
- [x] Codespaces dev container (.devcontainer/)
- [x] Evaluacion de viabilidad (docs/VIABILITY.md)
- [x] Especificacion UX con temperatura dinamica (docs/UX_DEEP_SPEC.md)
- [ ] Iconos SVG definitivos
- [ ] Test de integracion completa
- [ ] Empaquetado .crx para distribucion
- [ ] Panel de configuracion (puerto, nombre)

---

## Autor

**Marcelo — lankamar**  
Hospital de Clinicas UBA | Proyecto AI Intercom  
Powered by Antigravity (VS Code) + Comet (Perplexity)

---

*"Anfetaminas y esteroides al proyecto" — Marcelo, 2025*  
*PRD v2.0 — Actualizado con arquitectura real del bridge*

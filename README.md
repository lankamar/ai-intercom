# AI Intercom — Intercomunicador Bidireccional Chrome + Antigravity

> **"El que esté abierto gobernará la conversación del otro"** — Marcelo, 2025

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)](CHANGELOG.md)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](extension/)
[![Research RAG](https://img.shields.io/badge/Research-NotebookLM-orange.svg)](https://notebooklm.google.com/notebook/e7b41e3a-6498-43b0-9c53-41dd84c7e20a)

---

## 📚 Investigación y RAG
Este proyecto utiliza un **NotebookLM** como fuente principal de conocimiento y RAG para la investigación activa:
- **NotebookLM Source:** [AI Intercom Research](https://notebooklm.google.com/notebook/e7b41e3a-6498-43b0-9c53-41dd84c7e20a)

## Visión
Un intercomunicador en tiempo real que conecta el navegador Chromium con el agente **Antigravity en VS Code**, eliminando el ida y vuelta manual entre ambos entornos. En lugar de copiar y pegar contexto entre ChatGPT, Claude o Perplexity, todas las IAs ven el **mismo hilo de conversación** en tiempo real.

## Misión
Permitir que Marcelo pueda chatear con Antigravity directamente desde el navegador, y que Antigravity pueda ver y responder desde VS Code — **sin APIs externas, sin nube, 100% local**.

## Meta
Extensión Chrome + servidor Python local que actúa como puente bidireccional real entre el browser y el agente de VS Code.

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
  POST /outbox <- Envía respuestas a Chrome
```

### Flujo de Datos

```
Marcelo escribe en Chrome  ->  WS /ws/chrome  ->  bridge.py  ->  inbox.json
Antigravity lee inbox      <-  GET /inbox     <-  bridge.py
Antigravity responde       ->  POST /outbox   ->  bridge.py  ->  Chrome
Chrome recibe respuesta    <-  outbox_watcher <-  bridge.py
```

### Endpoints del Bridge (puerto 8765)

| Endpoint | Método | Uso |
|---|---|---|
| `/ws/chrome` | WebSocket | Chrome se conecta aquí |
| `/ws/antigravity` | WebSocket | Conexión directa del cerebro (opcional) |
| `/inbox` | GET | Antigravity lee mensajes pendientes |
| `/outbox` | POST | Antigravity envía respuesta a Chrome |
| `/health` | GET | Estado del sistema |

---

## Estructura del Repositorio

```
ai-intercom/
+-- README.md                    <- Este archivo (PRD + Docs)
+-- bridge/
|   +-- bridge.py                <- Servidor aiohttp WebSocket v1.6.0
|   +-- brain.py                 <- Lógica del cerebro / AI
|   +-- intercom_skill.py        <- Skill para Antigravity (sync)
|   +-- smoke_brain.py           <- Cerebro de prueba (echo local)
|   +-- host.json                <- Native messaging host config
|   +-- install_host.ps1         <- Instalador PowerShell (Windows)
|   +-- native_wrapper.bat       <- Wrapper para native messaging
|   +-- requirements.txt         <- Python deps (aiohttp)
+-- extension/
|   +-- manifest.json            <- Manifest V3
|   +-- background/              <- Service Worker WebSocket
|   +-- side_panel/              <- UI del intercomunicador
|   +-- icons/                   <- Iconos de la extensión
+-- docs/
|   +-- SMOKE_TEST.md            <- Guía de prueba rápida local
|   +-- PRD.md                   <- Product Requirements Document v2.0
|   +-- arquitectura.md          <- Diagramas y decisiones
+-- .gitignore
+-- LICENSE
```

---

## Instalación Rápida

### Requisitos

- Python 3.9+ con `aiohttp` y `websockets`
- Google Chrome o Chromium
- Antigravity en VS Code

### 🧪 Prueba de Humo (Smoke Test)
Si quieres probarlo **YA** sin configurar APIs:
1. Corre `python bridge/bridge.py`
2. Corre `python bridge/smoke_brain.py`
3. Carga la extensión en Chrome.
[Ver guía completa de Smoke Test](docs/SMOKE_TEST.md)

### 1. Instalar el Bridge Python

```bash
cd bridge
pip install -r requirements.txt
python bridge.py
# Bridge activo en http://localhost:8765
```

### 2. Instalar la Extensión Chrome

1. Abrir Chrome -> `chrome://extensions`
2. Activar **Modo desarrollador**
3. Click **Cargar sin empaquetar** y seleccionar carpeta `extension/`

---

## Autor

MARCELO OMAR LANCRY KAMYCKI (LANKAMAR)
Diseñador de Tecnologías Educativas en Salud | 
Implementador de Soluciones con IA & Codiseño Agéntico
 "La intersección exacta donde la medicina humana se encuentra con el algoritmo. Sin ruido. Solo resultados."

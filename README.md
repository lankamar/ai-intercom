# 🧠 AI Intercom — Local-First Multi-AI Context Bridge

> Connect multiple AI assistants in the same browser. No copy-paste. No external servers. No API keys required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](extension/)
[![Research RAG](https://img.shields.io/badge/Research-NotebookLM-orange.svg)](https://notebooklm.google.com/notebook/e7b41e3a-6498-43b0-9c53-41dd84c7e20a)

## 🎯 What is this?

AI Intercom is a Chrome extension + local Python bridge that creates a **shared conversation context** between you and multiple AI assistants simultaneously.

## 📚 Investigación y RAG
Este proyecto utiliza un **NotebookLM** como fuente principal de conocimiento y RAG para la investigación activa:
- **NotebookLM Source:** [AI Intercom Research](https://notebooklm.google.com/notebook/e7b41e3a-6498-43b0-9c53-41dd84c7e20a)

Instead of copying and pasting context between ChatGPT, Claude, Perplexity, or your own agents — all AIs see the **same conversation thread** in real time.

```
You ──► Chrome Side Panel ──► Local Bridge (localhost:8765) ──► Antigravity
                                                              ──► Any LLM Agent
                                                              ──► Future: A2A Protocol
```

## ✨ Key Features

- **Zero external dependencies** — runs entirely on localhost
- **Real-time bidirectional chat** — WebSocket-based, sub-second latency  
- **Multi-AI ready** — connect any LLM as a "brain" agent
- **Context awareness** — automatically shares current tab URL/title
- **Persistent history** — chat survives browser restarts
- **Privacy-first** — your conversations never leave your machine

## 🚀 Quick Start

### 1. Install the bridge
```bash
cd bridge/
pip install -r requirements.txt
powershell -ExecutionPolicy Bypass -File install_host.ps1
```

### 2. Load the Chrome extension
1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked" → select the `extension/` folder

### 3. Start chatting
Open the Side Panel in Chrome — the bridge starts automatically.

## 🏗️ Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full technical details.

| Component | Technology | Role |
|---|---|---|
| Bridge | Python + aiohttp + asyncio | WebSocket relay server |
| Brain | Python + Gemini API | LLM response engine |
| Extension | Chrome MV3 + Side Panel API | User interface |
| Storage | chrome.storage.local + JSON | Message persistence |

## 📋 Message Protocol

```json
{
  "type": "chat | cmd | context | status | result",
  "role": "user | assistant | system",
  "source": "chrome | antigravity | agent_id",
  "content": "...",
  "timestamp": 1234567890
}
```

## 🗺️ Roadmap

- [x] v1.0 — Bidirectional chat Chrome ↔ 1 agent
- [ ] v2.0 — Multi-agent: N AIs in same thread
- [ ] v2.5 — No API key: local LLM (WebLLM/Ollama)
- [ ] v3.0 — A2A protocol: cross-company agent interop

## 🤝 Contributing

PRs welcome. See [docs/PRD.md](docs/PRD.md) for the full product vision.

## 📄 License

MIT — do whatever you want, just keep the attribution.

---
*Built by [@lankamar](https://github.com/lankamar) with Antigravity + Perplexity Comet*

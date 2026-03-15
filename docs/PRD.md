# PRD — AI Intercom v2.0
> **Marcelo — lankamar**
> Hospital de Clinicas UBA | Proyecto AI Intercom
> Powered by Antigravity (VS Code) + Comet (Perplexity)

---

> "Anfetaminas y esteroides al proyecto" — Marcelo, 2025

---

## Misión
Permitir que cualquier persona use múltiples IAs en el mismo navegador sin perder contexto, sin copiar y pegar, y sin depender de ningún servidor externo.

## 📚 Investigación y RAG
Este proyecto utiliza un **NotebookLM** como fuente principal de conocimiento y RAG para la investigación activa:
- **NotebookLM Source:** [AI Intercom Research](https://notebooklm.google.com/notebook/e7b41e3a-6498-43b0-9c53-41dd84c7e20a)

## Visión
Ser el protocolo abierto de referencia para la interoperabilidad de agentes de IA a nivel de navegador.

## Problema
Hoy usar múltiples IAs es como tener un equipo de brillantes colegas que se niegan a hablar entre sí. Cada IA vive en su propio silo. Sin contexto compartido. Sin memoria entre herramientas. El usuario termina siendo el mensajero manual.

## Solución
Una extensión Chrome con un bridge local WebSocket en localhost:8765 que actúa como intercomunicador entre el usuario, múltiples IAs y el contexto de la pestaña activa. Todo corre localmente. Sin APIs externas. Sin servidores de terceros. Sin login.

## Arquitectura Real del Bridge
El bridge actúa como un relay server bidireccional entre múltiples clientes (Chrome, Antigravity, Agentes externos). Utiliza un sistema de "Bandeja" (Inbox/Outbox) para compatibilidad con sistemas de archivos y WebSockets para comunicación en tiempo real.

## Roadmap v2.0
- [x] **v1.0:** Chat bidireccional Chrome ↔ 1 agente.
- [ ] **v2.0:** Multi-agente (N IAs) en el mismo hilo de conversación.
- [ ] **v2.5:** Integración de LLM local sin API key (WebLLM/Ollama).
- [ ] **v3.0:** Protocolo A2A (Agent-to-Agent) para interoperabilidad cross-company.

---
*Documento actualizado con la arquitectura real del bridge y visión estratégica 2025.*

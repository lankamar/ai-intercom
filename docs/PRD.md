# PRD — AI Intercom v1.0

## Misión
Permitir que cualquier persona use múltiples IAs en el mismo navegador sin perder contexto, sin copiar y pegar, y sin depender de ningún servidor externo.

## Visión
Ser el protocolo abierto de referencia para la interoperabilidad de agentes de IA a nivel de navegador.

## Problema
Hoy usar múltiples IAs es como tener un equipo de brillantes colegas que se niegan a hablar entre sí. Cada IA vive en su propio silo. Sin contexto compartido. Sin memoria entre herramientas. El usuario termina siendo el mensajero manual.

## Solución
Una extensión Chrome con un bridge local WebSocket en localhost:8765 que actúa como intercomunicador entre el usuario, múltiples IAs y el contexto de la pestaña activa. Todo corre localmente. Sin APIs externas. Sin servidores de terceros. Sin login.

## Por qué fallaron proyectos similares
1. Dependencia de API/servidor externo — cuando el servicio cierra, el proyecto muere
2. Privacidad comprometida — conversaciones enviadas a terceros
3. Fricción de uso — el usuario debe hacer algo para activarlo
4. Sin protocolo común entre agentes
5. Escalaron demasiado rápido sin estabilizar el core

## Diferenciadores
- OpenMemory/Mem0: requiere API externa + manda conversaciones a sus servidores
- Multi-LLM: sin canal compartido real
- TeamAI: SaaS comercial
- ai-intercom: 100% local, open source, protocolo abierto

## Roadmap
- v1.0: Chat bidireccional Chrome ↔ 1 agente
- v2.0: Multi-agente N IAs en el mismo hilo
- v2.5: LLM local sin API key (WebLLM/Ollama)
- v3.0: A2A protocol — interop con agentes de otras empresas

# UX Deep Specification — AI Intercom
## Experiencia Moderna, Cómoda e Intuitiva con Temperatura Dinámica

> Especificación completa pensada dos veces para una experiencia que se adapta  
> al contexto y a la predictibilidad de la conversación.  
> Versión: 1.0 — 2026-03-15

---

## Filosofía de Diseño

### El problema de temperatura fija

La mayoría de los sistemas de IA usan una temperatura estática para todas las respuestas. Esto es un error UX fundamental: una pregunta como "¿cuánto es 2+2?" y "¿cómo diseño la arquitectura de mi sistema?" no merecen la misma energía creativa del modelo.

**La temperatura debe moverse con la conversación.**

### Principio central: Temperatura Adaptativa

```
predictibilidad alta  →  temperatura baja  →  respuestas precisas, deterministas
predictibilidad baja  →  temperatura alta  →  respuestas creativas, exploradoras
```

El usuario nunca toca un slider de temperatura. El sistema infiere el contexto.

---

## 1. Modelo de Temperatura Dinámica

### 1.1 El Eje de Predictibilidad

La predictibilidad de una pregunta se mide en tiempo real según señales observables:

```
ZONA DETERMINISTA          ZONA CREATIVA
[0.0 ─────────────────── 0.5 ─────────────────── 1.0]
  │                         │                         │
  │  Baja temperatura        │  Temperatura media      │  Alta temperatura
  │  Respuestas exactas      │  Balanceado             │  Exploración abierta
  │                         │                         │
  Ejemplos:                 Ejemplos:                 Ejemplos:
  "¿qué hace este código?"  "¿cómo mejorar esto?"     "¿qué debería construir?"
  "explica este error"      "alternativas a esto"     "¿cuál es la mejor idea?"
  "traduce esta función"    "diseña esto"             "imagina cómo podría ser"
```

### 1.2 Señales para Inferir Predictibilidad

| Señal | Predictibilidad baja (más calor) | Predictibilidad alta (más frío) |
|-------|-----------------------------------|----------------------------------|
| **Tipo de pregunta** | Abierta: "¿qué...?", "¿cómo...?" | Cerrada: "¿cuánto...?", "¿cuál es...?" |
| **Longitud del mensaje** | Mensaje largo con contexto rico | Mensaje corto y directo |
| **Historial reciente** | Conversación exploratoria | Conversación técnica/factual |
| **Hora del día** | Tarde/noche (modo creativo) | Mañana (modo productivo) |
| **Velocidad de escritura** | Lenta (pensando en voz alta) | Rápida (sabe exactamente qué quiere) |
| **Palabras clave** | "idea", "imagina", "¿qué tal si" | "error", "bug", "cómo se llama" |
| **Contexto de la pestaña** | Página de investigación/lectura | Editor de código / terminal |

### 1.3 Algoritmo de Temperatura

```python
def compute_temperature(message: str, history: list, context: dict) -> float:
    """
    Calcula temperatura adaptativa en rango [0.1, 0.9].
    
    0.1 = muy determinista (respuestas exactas, reproducibles)
    0.5 = balanceado (modo por defecto)
    0.9 = muy creativo (exploración, brainstorming)
    """
    score = 0.5  # baseline
    
    # Señales del mensaje actual
    words = message.lower().split()
    if any(w in words for w in ["imagina", "idea", "¿qué tal", "podría", "debería"]):
        score += 0.15
    if any(w in words for w in ["error", "bug", "falla", "exact", "cuánto"]):
        score -= 0.15
    if len(message) > 200:   # mensaje largo = más contexto = más creatividad OK
        score += 0.05
    if message.endswith("?") and len(words) <= 6:  # pregunta corta = factual
        score -= 0.10
    
    # Señales del historial
    if len(history) >= 3:
        recent = history[-3:]
        creative_keywords = sum(
            1 for m in recent
            if any(w in m.get("content", "").lower()
                   for w in ["idea", "diseño", "arquitectura", "¿qué tal"])
        )
        if creative_keywords >= 2:
            score += 0.10
    
    # Señales del contexto de la pestaña
    if context.get("url", "").startswith("https://github.com"):
        score -= 0.05  # código = más determinista
    if "figma" in context.get("url", "") or "miro" in context.get("url", ""):
        score += 0.10  # diseño = más creativo
    
    return max(0.1, min(0.9, round(score, 2)))
```

### 1.4 Visualización de la Temperatura en la UI

El indicador de temperatura debe ser **sutil y nunca intrusivo**. No es un valor numérico expuesto al usuario; es una señal emocional del estado de la conversación.

```
Estado frío (0.1–0.3):    🔵 Punto cian tenue — "modo preciso"
Estado templado (0.4–0.6): ⚪ Punto blanco neutro — "modo balanceado"  
Estado cálido (0.7–0.9):   🟣 Punto púrpura brillante — "modo creativo"
```

Este punto aparece junto al nombre "Antigravity" en el header, transicionando suavemente entre colores con CSS `transition: color 0.8s ease`.

---

## 2. Layout y Estructura Visual

### 2.1 Jerarquía de la Interfaz

```
┌─────────────────────────────────┐
│  🧠 Antigravity  ●  v1.6  🌡️   │  ← Header (fijo, 48px)
│  ─────────────────────────────  │
│                                 │
│  [Burbuja Antigravity]          │  ← Chat area (scroll libre)
│                                 │
│           [Burbuja usuario]     │
│                                 │
│  [Indicador escribiendo...]     │  ← Solo visible cuando responde
│                                 │
│  ─────────────────────────────  │
│  [ Escribe un mensaje...   ↑ ]  │  ← Footer (fijo, auto-expand)
└─────────────────────────────────┘
```

### 2.2 Especificaciones del Header

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 48px;
  background: hsl(240, 10%, 6%);
  border-bottom: 1px solid hsl(240, 10%, 12%);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
}
```

**Elementos del header (izquierda → derecha):**

1. `🧠` — Emoji cerebro (16px, decorativo)
2. `Antigravity` — Texto principal (13px, weight 500, Inter)
3. Indicador de temperatura — Punto de color dinámico (6px, borde redondeado)
4. Badge de versión — `v1.6` (11px, peso 400, opacity 0.4)
5. Indicador de conexión — Punto verde/rojo (8px)

### 2.3 Burbujas de Mensajes

**Burbuja del usuario (derecha):**
```css
.bubble-user {
  background: hsl(200, 98%, 44%);     /* cian de acción */
  color: hsl(210, 100%, 6%);           /* texto casi negro sobre cian */
  border-radius: 20px 20px 4px 20px;  /* punta inferior derecha */
  padding: 10px 14px;
  max-width: 85%;
  align-self: flex-end;
  box-shadow: 0 2px 12px hsla(200, 98%, 44%, 0.3);
  animation: slideInRight 0.2s ease-out;
}
```

**Burbuja de Antigravity (izquierda):**
```css
.bubble-brain {
  background: hsl(240, 10%, 10%);     /* fondo muy oscuro */
  color: hsl(0, 0%, 92%);             /* texto casi blanco */
  border: 1px solid hsl(263, 30%, 25%); /* borde púrpura tenue */
  border-radius: 20px 20px 20px 4px;  /* punta inferior izquierda */
  padding: 10px 14px;
  max-width: 85%;
  align-self: flex-start;
  animation: slideInLeft 0.2s ease-out;
}
```

### 2.4 Indicador "Escribiendo..."

Tres puntos animados que aparecen mientras Antigravity procesa. Este micro-detalle elimina la sensación de "¿está colgado?" y reduce la ansiedad de espera.

```css
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px 14px;
  background: hsl(240, 10%, 10%);
  border-radius: 20px 20px 20px 4px;
  border: 1px solid hsl(263, 30%, 25%);
  width: fit-content;
}

.typing-dot {
  width: 6px;
  height: 6px;
  background: hsl(263, 70%, 62%);
  border-radius: 50%;
  animation: bounce 1.2s infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%           { transform: translateY(-6px); opacity: 1; }
}
```

---

## 3. Interacciones y Micro-Animaciones

### 3.1 Animaciones de Entrada de Mensajes

```css
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-8px) translateY(4px); }
  to   { opacity: 1; transform: translateX(0) translateY(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(8px) translateY(4px); }
  to   { opacity: 1; transform: translateX(0) translateY(0); }
}
```

**Duración**: 200ms — suficientemente rápido para no sentirse lento, suficientemente lento para que el ojo lo siga.

### 3.2 Transición del Indicador de Temperatura

```javascript
function updateTemperatureIndicator(temp) {
  const dot = document.getElementById('tempDot');
  
  if (temp < 0.35) {
    // Frío — cian tenue
    dot.style.background = 'hsl(200, 60%, 45%)';
    dot.title = 'Modo preciso';
  } else if (temp < 0.65) {
    // Templado — blanco neutro
    dot.style.background = 'hsl(0, 0%, 70%)';
    dot.title = 'Modo balanceado';
  } else {
    // Cálido — púrpura brillante
    dot.style.background = 'hsl(263, 70%, 62%)';
    dot.title = 'Modo creativo';
  }
  // La transición CSS maneja el suavizado: transition: background 0.8s ease
}
```

### 3.3 Auto-focus y UX del Input

```javascript
// El textarea siempre tiene focus cuando el panel está activo
// Esto elimina el click extra que frustra al usuario
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) textarea.focus();
});

// Auto-scroll al fondo en cada mensaje nuevo
function scrollToBottom(smooth = true) {
  chatArea.scrollTo({
    top: chatArea.scrollHeight,
    behavior: smooth ? 'smooth' : 'instant'
  });
}

// Scroll suave si el usuario está cerca del fondo (<100px)
// Scroll instantáneo si está más arriba (no interrumpir lectura)
function smartScroll() {
  const distanceFromBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;
  scrollToBottom(distanceFromBottom > 100 ? false : true);
}
```

### 3.4 Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Enter` | Enviar mensaje |
| `Shift+Enter` | Nueva línea en el mensaje |
| `Ctrl+K` | Limpiar conversación (con confirmación) |
| `Escape` | Cancelar mensaje en escritura (vacía el textarea) |
| `↑` en textarea vacío | Editar el último mensaje enviado |

---

## 4. Paleta de Colores y Tokens de Diseño

### 4.1 Tokens Base

```css
:root {
  /* Fondos */
  --bg-base:       hsl(240, 10%, 4%);    /* Negro casi puro */
  --bg-elevated:   hsl(240, 10%, 7%);    /* Superficie elevada */
  --bg-overlay:    hsl(240, 10%, 10%);   /* Overlays / burbujas */
  --bg-hover:      hsl(240, 10%, 13%);   /* Estado hover */
  
  /* Bordes */
  --border-subtle: hsl(240, 10%, 14%);   /* Separadores */
  --border-focus:  hsl(263, 50%, 35%);   /* Foco en inputs */
  
  /* Texto */
  --text-primary:  hsl(0, 0%, 96%);      /* Texto principal */
  --text-secondary:hsl(0, 0%, 60%);      /* Texto secundario */
  --text-muted:    hsl(0, 0%, 35%);      /* Texto desactivado */
  
  /* Acentos */
  --accent-brain:  hsl(263, 70%, 62%);   /* Púrpura Antigravity */
  --accent-user:   hsl(200, 98%, 44%);   /* Cian usuario */
  --accent-online: hsl(142, 72%, 50%);   /* Verde conectado */
  --accent-offline:hsl(0, 72%, 51%);     /* Rojo desconectado */
  
  /* Temperatura dinámica */
  --temp-cold:     hsl(200, 60%, 45%);   /* Modo preciso */
  --temp-neutral:  hsl(0, 0%, 70%);      /* Modo balanceado */
  --temp-warm:     hsl(263, 70%, 62%);   /* Modo creativo */
  
  /* Tipografía */
  --font-body:     'Inter', system-ui, sans-serif;
  --font-mono:     'JetBrains Mono', 'Fira Code', monospace;
  
  /* Espaciado */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  
  /* Radios */
  --radius-sm:  4px;
  --radius-md:  12px;
  --radius-lg:  20px;
  --radius-full: 999px;
  
  /* Sombras */
  --shadow-user: 0 2px 12px hsla(200, 98%, 44%, 0.25);
  --shadow-brain: 0 1px 6px hsla(263, 70%, 62%, 0.12);
}
```

### 4.2 Modo Claro (Futuro)

El sistema de tokens permite agregar modo claro sobrescribiendo las variables en `@media (prefers-color-scheme: light)` sin tocar el código de layout.

```css
@media (prefers-color-scheme: light) {
  :root {
    --bg-base:       hsl(240, 10%, 98%);
    --bg-elevated:   hsl(240, 5%, 95%);
    --bg-overlay:    hsl(240, 5%, 91%);
    --text-primary:  hsl(240, 10%, 10%);
    --text-secondary:hsl(240, 10%, 40%);
  }
}
```

---

## 5. Renderizado de Markdown

Las respuestas de Antigravity frecuentemente incluirán código, listas y texto formateado. El panel debe renderizar Markdown básico de forma segura.

### 5.1 Elementos a Soportar

| Elemento | Renderizado |
|----------|-------------|
| `**bold**` | `<strong>` |
| `` `code inline` `` | `<code>` con fondo oscuro |
| ` ```python \n code ``` ` | `<pre><code>` con syntax highlight |
| `- lista` | `<ul><li>` |
| `1. lista` | `<ol><li>` |
| `> cita` | `<blockquote>` con borde izquierdo |

### 5.2 Seguridad del Renderizado

**Nunca** usar `innerHTML` directamente con contenido sin sanitizar. Pasos seguros:

```javascript
function renderMarkdown(text) {
  // 1. Escapar HTML primero (obligatorio)
  const escaped = escapeHTML(text);
  
  // 2. Aplicar reglas de markdown (solo sobre texto escapado)
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // Los bloques de código multilínea requieren una librería como marked.js
}

function escapeHTML(text) {
  const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
```

### 5.3 Código con Syntax Highlighting

Para bloques de código, usar [Highlight.js](https://highlightjs.org/) (18KB gzip) cargado con `<link rel="preload">` para no bloquear el render inicial:

```html
<!-- En panel.html, cargar asíncrono -->
<link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" as="script">
```

---

## 6. Estado Vacío y Onboarding

### 6.1 Pantalla de Bienvenida (Estado Vacío)

Cuando no hay mensajes en el historial, mostrar un estado vacío motivador:

```html
<div class="empty-state">
  <div class="empty-icon">🧠</div>
  <h3>Antigravity está listo</h3>
  <p>Escribe tu primera pregunta o usa un atajo rápido:</p>
  <div class="quick-actions">
    <button class="quick-btn" data-text="¿Qué estás viendo en la pestaña activa?">
      👁️ Analizar pestaña
    </button>
    <button class="quick-btn" data-text="Dame un resumen de lo que estamos construyendo">
      📋 Resumir contexto
    </button>
    <button class="quick-btn" data-text="¿Qué debería hacer a continuación?">
      🎯 Próximo paso
    </button>
  </div>
</div>
```

### 6.2 Estados de Conexión Explícitos

```
Estado CONECTADO:
  ● verde — "Conectado a Antigravity"

Estado INBOX_MODE:
  ● amarillo — "Modo bandeja — respuestas con delay"
  
Estado DESCONECTADO:
  ● rojo — "Bridge no encontrado"
  [Botón] "Cómo iniciar el bridge →"
```

---

## 7. Accesibilidad (a11y)

### Requisitos mínimos

| Requerimiento | Implementación |
|---------------|---------------|
| Contraste mínimo AA (4.5:1) | Paleta actual cumple en todos los elementos de texto |
| Focus visible | `outline: 2px solid var(--accent-brain)` en todos los elementos interactivos |
| Roles ARIA | `role="log"` en `#chatArea`, `aria-live="polite"` para mensajes nuevos |
| Navegación por teclado | Tab entre elementos, Enter para enviar, Escape para cancelar |
| Screen reader | `aria-label` descriptivos en botones sin texto visible |

```html
<!-- Implementación correcta del chat area -->
<main 
  id="chatArea" 
  role="log" 
  aria-live="polite" 
  aria-atomic="false"
  aria-label="Conversación con Antigravity"
>
```

---

## 8. Performance y Límites

### 8.1 Límites del Historial

El límite actual de 50 mensajes es razonable. Para escalarlo:

```javascript
const HISTORY_LIMITS = {
  storage: 200,  // Chrome storage puede guardar mucho más
  render:  50,   // Solo renderizar los últimos 50
  context: 20,   // Solo enviar los últimos 20 al modelo (tokens)
};
```

### 8.2 Scroll Virtualizado (v2)

Para conversaciones largas (>100 mensajes), implementar scroll virtualizado:
solo renderizar las burbujas visibles en el viewport más un buffer de ±10.

### 8.3 Debounce de Temperatura

El cálculo de temperatura debe ejecutarse con debounce de 300ms para no hacerlo en cada keystroke:

```javascript
const debouncedTempCalc = debounce((message) => {
  const temp = computeTemperature(message, history, tabContext);
  updateTemperatureIndicator(temp);
  bridge.setTemperature(temp);  // Enviar al bridge para que lo incluya en el request
}, 300);

textarea.addEventListener('input', (e) => debouncedTempCalc(e.target.value));
```

---

## 9. Roadmap UX Priorizado

### Sprint 1 — Fundamentos (semana 1-2)
- [x] Dark theme con paleta coherente
- [x] Burbujas diferenciadas usuario/Antigravity
- [x] Indicador de conexión verde/rojo
- [x] Input auto-expansible
- [ ] Indicador "Escribiendo..." (3 puntos animados)
- [ ] Estado vacío con acciones rápidas
- [ ] `aria-live` en el chat area

### Sprint 2 — Temperatura Dinámica (semana 3-4)
- [ ] Algoritmo `computeTemperature()` en `bridge.py`
- [ ] Envío de temperatura en cada mensaje
- [ ] Indicador visual de temperatura en header
- [ ] Transición suave CSS del indicador

### Sprint 3 — Calidad (semana 5-6)
- [ ] Renderizado de Markdown seguro
- [ ] Syntax highlighting con Highlight.js
- [ ] Atajos de teclado completos
- [ ] Scroll inteligente (no interrumpe lectura)

### Sprint 4 — Refinamiento (semana 7-8)
- [ ] Modo claro (`prefers-color-scheme`)
- [ ] Animaciones de entrada de mensajes
- [ ] Panel de configuración (puerto, nombre, temperatura manual override)
- [ ] Scroll virtualizado para historiales largos

---

*UX Deep Spec v1.0 — AI Intercom — 2026-03-15*  
*"El que esté abierto gobernará la conversacion del otro" — Marcelo, 2025*

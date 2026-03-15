/**
 * Antigravity Chrome Intercom v1.6.2 — Storage-First Edition
 * ==========================================================
 * Lógica de interfaz, persistencia de historial y comunicación.
 */

// Elementos UI
const chatArea = document.getElementById("chatArea");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const tempPill = document.getElementById("tempPill");
const tempLabel = document.getElementById("tempLabel");
const tempFill = document.getElementById("tempFill");
const typingIndicator = document.getElementById("typingIndicator");
const typingText = document.getElementById("typingText");
const liveRegion = document.getElementById("liveRegion");

let port = null;
let isConnected = false;
let chatHistory = [];
let currentContext = null;
let typingState = "idle";
let pendingResponse = false;
let responseTimeoutId = null;
let tempEMA = 0.5;
let tempVisual = 0.5;
let typingEvents = [];

const MAX_HISTORY = 50;
const RESPONSE_TIMEOUT_MS = 8000;
const TEMP_ALPHA = 0.35;
const TEMP_HYSTERESIS = 0.03;
const TEMP_MIN = 0.1;
const TEMP_MAX = 0.9;

const DOMAIN_HINTS = {
  precise: ["docs.", "developer", "github", "stackoverflow", "wikipedia", "readthedocs", "mdn"],
  creative: ["dribbble", "behance", "pinterest", "medium", "notion", "substack"]
};

// ─────────────────────────────────────────────────────────────
//  Persistencia (chrome.storage.local)
// ─────────────────────────────────────────────────────────────

/**
 * Carga el historial guardado al iniciar.
 */
async function loadHistory() {
  const result = await chrome.storage.local.get(["chat_history"]);
  if (result.chat_history) {
    chatHistory = result.chat_history;
    renderAllHistory();
  }
}

// ─────────────────────────────────────────────────────────────
//  Renderizado de UI
// ─────────────────────────────────────────────────────────────

function renderAllHistory() {
  chatArea.innerHTML = "";
  chatHistory.forEach(m => renderBubble(m.role, m.content, true));
  scrollToBottom(true);
}

/**
 * Crea una burbuja de chat estilo Comet.
 * @param {string} role - 'user' o 'antigravity'
 * @param {string} content - El texto del mensaje
 * @param {boolean} isInitial - Si es carga inicial (sin animación)
 */
function renderBubble(role, content, isInitial = false) {
  if (!content) return;
  const isBrain = role === "antigravity";
  const wrapper = document.createElement("div");
  wrapper.className = `msg-wrapper ${isBrain ? 'brain' : 'user'}`;
  
  if (isInitial) wrapper.style.animation = 'none';

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = renderSafeMarkdown(String(content));

  const roleLabel = document.createElement("div");
  roleLabel.className = "msg-role";
  roleLabel.textContent = isBrain ? "Antigravity" : "Vos";

  wrapper.appendChild(roleLabel);
  wrapper.appendChild(bubble);

  chatArea.appendChild(wrapper);
  if (!isInitial) scrollToBottom();
}

function scrollToBottom(instant = false) {
  chatArea.scrollTo({
    top: chatArea.scrollHeight,
    behavior: instant ? "auto" : "smooth"
  });
}

function updateConnectionUI(connected) {
  isConnected = connected;
  statusDot.className = `status-dot ${connected ? 'online' : 'offline'}`;
  statusText.textContent = connected ? "Conectado" : "Buscando... (reintentando)";
  document.body.className = connected ? "" : "disconnected";
  
  if (!connected) {
    msgInput.placeholder = "Sin conexión — reintentando...";
  } else {
    msgInput.placeholder = "Escribe a Antigravity... (Ctrl+Enter)";
  }

  if (!connected && pendingResponse) {
    setTypingState("error", "Conexion perdida. Reintentando...");
  }
}

function announce(text) {
  if (!text) return;
  liveRegion.textContent = "";
  setTimeout(() => {
    liveRegion.textContent = text;
  }, 20);
}

function startResponseTimeout() {
  clearResponseTimeout();
  responseTimeoutId = setTimeout(() => {
    if (pendingResponse && (typingState === "sending" || typingState === "thinking")) {
      setTypingState("thinking", "Procesando respuesta...");
    }
  }, RESPONSE_TIMEOUT_MS);
}

function clearResponseTimeout() {
  if (responseTimeoutId) {
    clearTimeout(responseTimeoutId);
    responseTimeoutId = null;
  }
}

function setTypingState(nextState, customText = "") {
  typingState = nextState;

  if (nextState === "idle" || nextState === "done") {
    typingIndicator.hidden = true;
    if (nextState === "done") {
      setTimeout(() => {
        if (typingState === "done") {
          typingState = "idle";
          typingIndicator.hidden = true;
        }
      }, 450);
    }
    return;
  }

  typingIndicator.hidden = false;

  switch (nextState) {
    case "sending":
      typingText.textContent = customText || "Enviando mensaje...";
      break;
    case "thinking":
      typingText.textContent = customText || "Antigravity esta pensando";
      break;
    case "streaming":
      typingText.textContent = customText || "Antigravity esta escribiendo";
      break;
    case "error":
      typingText.textContent = customText || "Error al recibir respuesta";
      break;
    default:
      typingText.textContent = customText || "Procesando...";
  }
}

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

function scoreSemantics(text) {
  const lower = text.toLowerCase();
  const preciseTerms = ["fix", "error", "stack", "debug", "paso a paso", "exacto", "hechos", "comando", "sintaxis"];
  const creativeTerms = ["idea", "ideas", "alternativas", "creativo", "brainstorm", "copy", "nombres", "variantes", "explorar"];

  const preciseHits = preciseTerms.filter(t => lower.includes(t)).length;
  const creativeHits = creativeTerms.filter(t => lower.includes(t)).length;

  const base = 0.5 + (creativeHits * 0.12) - (preciseHits * 0.12);
  return clamp(0, 1, base);
}

function scoreHistory(text) {
  const recentUser = chatHistory
    .filter(m => m.role === "user")
    .slice(-8)
    .map(m => String(m.content || "").toLowerCase());

  if (!recentUser.length) return 0.5;

  const current = text.toLowerCase();
  let maxOverlap = 0;

  for (const msg of recentUser) {
    const tokensA = new Set(current.split(/\s+/).filter(Boolean));
    const tokensB = new Set(msg.split(/\s+/).filter(Boolean));
    const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
    const union = new Set([...tokensA, ...tokensB]).size || 1;
    const jaccard = intersection / union;
    maxOverlap = Math.max(maxOverlap, jaccard);
  }

  return clamp(0, 1, 1 - maxOverlap);
}

function scoreUrlContext() {
  const url = currentContext?.url || "";
  if (!url) return 0.5;

  const lower = url.toLowerCase();

  if (DOMAIN_HINTS.precise.some(h => lower.includes(h))) return 0.3;
  if (DOMAIN_HINTS.creative.some(h => lower.includes(h))) return 0.7;
  return 0.5;
}

function scoreTypingCadence() {
  const events = typingEvents.slice(-20);
  if (events.length < 3) return 0.5;

  const intervals = [];
  for (let i = 1; i < events.length; i += 1) {
    intervals.push(events[i] - events[i - 1]);
  }

  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const fast = avg < 130 ? 0.75 : avg < 220 ? 0.62 : avg < 340 ? 0.5 : 0.35;

  const variance = intervals.reduce((acc, n) => acc + ((n - avg) ** 2), 0) / intervals.length;
  const normalizedVariance = clamp(0, 1, variance / 35000);
  return clamp(0, 1, (fast * 0.75) + (normalizedVariance * 0.25));
}

function applyTempOverrides(text, temp) {
  const lower = text.toLowerCase();

  if (/se preciso|solo hechos|sin creatividad|exactitud|deterministico/.test(lower)) {
    temp = Math.min(temp, 0.25);
  }

  if (/ideas|alternativas|creativo|brainstorm|opciones/.test(lower)) {
    temp = Math.max(temp, 0.65);
  }

  if (/```|\bfunction\b|\bclass\b|\bbug\b|\berror\b|\bfix\b/.test(lower)) {
    temp = Math.min(temp, 0.35);
  }

  return temp;
}

function getModeByTemp(temp) {
  if (temp <= 0.35) return "preciso";
  if (temp <= 0.6) return "balanceado";
  return "creativo";
}

function calculateTemperature(text) {
  const semantics = scoreSemantics(text);
  const history = scoreHistory(text);
  const url = scoreUrlContext();
  const typing = scoreTypingCadence();

  const raw = (0.35 * semantics) + (0.3 * history) + (0.2 * url) + (0.15 * typing);
  const ema = (TEMP_ALPHA * raw) + ((1 - TEMP_ALPHA) * tempEMA);
  tempEMA = clamp(TEMP_MIN, TEMP_MAX, ema);

  const adjusted = clamp(TEMP_MIN, TEMP_MAX, applyTempOverrides(text, tempEMA));
  const mode = getModeByTemp(adjusted);

  return {
    temperature: Number(adjusted.toFixed(2)),
    mode,
    source: {
      semantics: Number(semantics.toFixed(2)),
      history: Number(history.toFixed(2)),
      url: Number(url.toFixed(2)),
      typing: Number(typing.toFixed(2))
    }
  };
}

function updateTemperatureUI(tempData) {
  const t = tempData.temperature;
  if (Math.abs(t - tempVisual) <= TEMP_HYSTERESIS) return;

  tempVisual = t;
  const normalized = clamp(0, 1, (t - TEMP_MIN) / (TEMP_MAX - TEMP_MIN));
  tempFill.style.transform = `scaleX(${normalized})`;
  tempFill.style.filter = `saturate(${0.75 + (normalized * 0.35)})`;

  const modeLabel = tempData.mode === "preciso" ? "Preciso" : tempData.mode === "balanceado" ? "Balanceado" : "Creativo";
  tempLabel.textContent = modeLabel;

  const tooltip = `Temp ${t.toFixed(2)} | S:${tempData.source.semantics} H:${tempData.source.history} U:${tempData.source.url} T:${tempData.source.typing}`;
  tempPill.title = tooltip;
  tempPill.setAttribute("aria-label", `Temperatura ${t.toFixed(2)} en modo ${modeLabel.toLowerCase()}`);
}

// ─────────────────────────────────────────────────────────────
//  Comunicación
// ─────────────────────────────────────────────────────────────

function connectToSW() {
  try {
    port = chrome.runtime.connect({ name: "panel" });
    port.onMessage.addListener(handleSWMessage);
    port.onDisconnect.addListener(() => {
      port = null;
      updateConnectionUI(false);
      setTimeout(connectToSW, 2000);
    });
  } catch (e) {
    console.warn("Error conectando al Service Worker:", e);
    setTimeout(connectToSW, 3000);
  }
}

function handleSWMessage(msg) {
  switch (msg.type) {
    case "ws_status":
      updateConnectionUI(msg.connected);
      break;
    
    case "status":
      updateConnectionUI(msg.brain === "online");
      break;

    case "chat":
      // En v1.6.0+, el Service Worker guarda directo en storage.
      // El renderizado lo hace el listener storage.onChanged definido al final.
      console.log("[Panel] Chat recibido vía Port (v1.6.0 ignorando para evitar duplicados)");
      break;

    case "context_update":
      currentContext = msg;
      break;
    
    case "ping_chat":
      statusText.textContent = "Cerebro respondiendo";
      if (pendingResponse) {
        setTypingState("streaming");
      }
      setTimeout(() => updateConnectionUI(isConnected), 3000);
      break;
  }
}

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !isConnected) return;

  const tempData = calculateTemperature(text);
  updateTemperatureUI(tempData);

  if (text.toLowerCase() === "clear") {
    chatHistory = [];
    chrome.storage.local.set({ "chat_history": [] });
    renderAllHistory();
    msgInput.value = "";
    return;
  }

  // Enviar al bridge PRIMERO
  if (port) {
    port.postMessage({
      type: "chat",
      role: "user",
      content: text,
      meta: {
        temperature: tempData.temperature,
        temperature_source: tempData.source,
        mode: tempData.mode
      }
    });
  }

  pendingResponse = true;
  setTypingState("sending");
  startResponseTimeout();

  // Guardar en storage (esto dispara onChanged en TODOS los paneles abiertos)
  const msg = {
    role: "user",
    content: text,
    timestamp: Date.now(),
    meta: {
      temperature: tempData.temperature,
      mode: tempData.mode
    }
  };
  chatHistory.push(msg);
  if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
  chrome.storage.local.set({ "chat_history": [...chatHistory] });

  // Renderizar localmente sin esperar storage.onChanged
  renderBubble("user", text);
  announce("Mensaje enviado");

  msgInput.value = "";
  msgInput.style.height = "auto";
}

// ─────────────────────────────────────────────────────────────
//  Eventos
// ─────────────────────────────────────────────────────────────

msgInput.addEventListener("input", () => {
  typingEvents.push(Date.now());
  typingEvents = typingEvents.slice(-30);
  msgInput.style.height = "auto";
  msgInput.style.height = (msgInput.scrollHeight) + "px";
});

msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

// ─────────────────────────────────────────────────────────────
//  Utilidades
// ─────────────────────────────────────────────────────────────

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url, "https://example.com");
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function renderSafeMarkdown(content) {
  let safe = escapeHTML(content);

  const codeBlockStore = [];
  safe = safe.replace(/```([\s\S]*?)```/g, (_, code) => {
    const token = `@@CODEBLOCK_${codeBlockStore.length}@@`;
    codeBlockStore.push(`<pre><code>${code.trim()}</code></pre>`);
    return token;
  });

  safe = safe
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n\s*-\s+/g, "<br>&bull; ");

  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, hrefRaw) => {
    const href = sanitizeUrl(hrefRaw);
    if (!href) return label;
    return `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
  });

  safe = safe.replace(/\n/g, "<br>");

  safe = safe.replace(/@@CODEBLOCK_(\d+)@@/g, (_, idx) => codeBlockStore[Number(idx)] || "");

  return safe;
}

// ─────────────────────────────────────────────────────────────
//  Init
// ─────────────────────────────────────────────────────────────

// Escuchar cambios en almacenamiento para sincronizar múltiples pestañas/navegadores
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.chat_history) return;
  
  const newData = changes.chat_history.newValue || [];
  
  // Siempre sincronizar con storage como fuente de verdad
  if (newData.length === 0) {
    chatHistory = [];
    renderAllHistory();
    return;
  }
  
  // Renderizar todos los mensajes nuevos que no están en pantalla
  const newMessages = newData.slice(chatHistory.length);
  chatHistory = newData;
  
  newMessages.forEach(msg => {
    renderBubble(msg.role, msg.content);
    if (msg.role === "antigravity") {
      pendingResponse = false;
      clearResponseTimeout();
      setTypingState("done");
      announce("Nueva respuesta de Antigravity");
    }
  });
});

loadHistory();
connectToSW();
updateTemperatureUI({
  temperature: 0.5,
  mode: "balanceado",
  source: { semantics: 0.5, history: 0.5, url: 0.5, typing: 0.5 }
});
console.log("Antigravity Panel v1.6.2 - UX Adaptive Edition.");

/**
 * Antigravity Chrome Intercom v1.6.2 — Storage-First Edition
 * ==========================================================
 * Lógica de interfaz, persistencia de historial y comunicación.
 */

// Elementos UI
const chatArea      = document.getElementById("chatArea");
const msgInput      = document.getElementById("msgInput");
const sendBtn       = document.getElementById("sendBtn");
const statusDot     = document.getElementById("statusDot");
const statusText    = document.getElementById("statusText");

let port = null;
let isConnected = false;
let chatHistory = [];

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

/**
 * Guarda el historial cada vez que cambia.
 */
async function saveMessage(role, content) {
  chatHistory.push({ role, content, timestamp: Date.now() });
  // Limitar historial a los últimos 50 mensajes para performance
  if (chatHistory.length > 50) chatHistory.shift();
  await chrome.storage.local.set({ "chat_history": chatHistory });
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

  wrapper.innerHTML = `
    <div class="msg-role">${isBrain ? 'Antigravity' : 'Vos'}</div>
    <div class="msg-bubble">${escapeHTML(String(content))}</div>
  `;

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
    
    case "ping_chat":
      statusText.textContent = "¡Cerebro respondiendo!";
      setTimeout(() => updateConnectionUI(isConnected), 3000);
      break;
  }
}

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !isConnected) return;

  if (text.toLowerCase() === "clear") {
    chatHistory = [];
    chrome.storage.local.set({ "chat_history": [] });
    renderAllHistory();
    msgInput.value = "";
    return;
  }

  // Enviar al bridge PRIMERO
  if (port) {
    port.postMessage({ type: "chat", role: "user", content: text });
  }

  // Guardar en storage (esto dispara onChanged en TODOS los paneles abiertos)
  const msg = { role: "user", content: text, timestamp: Date.now() };
  chatHistory.push(msg);
  if (chatHistory.length > 50) chatHistory.shift();
  chrome.storage.local.set({ "chat_history": [...chatHistory] });

  // Renderizar localmente sin esperar storage.onChanged
  renderBubble("user", text);

  msgInput.value = "";
  msgInput.style.height = "auto";
}

// ─────────────────────────────────────────────────────────────
//  Eventos
// ─────────────────────────────────────────────────────────────

msgInput.addEventListener("input", () => {
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
  
  newMessages.forEach(msg => renderBubble(msg.role, msg.content));
});

loadHistory();
connectToSW();
console.log("Antigravity Panel v1.6.2 - Storage-First Edition.");

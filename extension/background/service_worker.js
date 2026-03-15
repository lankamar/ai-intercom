/**
 * Antigravity Chrome Intercom v1.6.2 — Storage-First Edition
 * =====================================================
 * 1. connectNative() → Chrome auto-inicia el bridge.py invisible
 */

const NATIVE_HOST  = "com.antigravity.intercom";
const BRIDGE_WS    = "ws://localhost:8765/ws/chrome";
const RECONNECT_MS = 2000;
const RECONNECT_MAX= 16000;

let nativeLauncher = null;   // Puerto Native Messaging (para mantener bridge vivo)
let ws             = null;   // WebSocket al bridge
let reconnectDelay = RECONNECT_MS;
let panelPorts     = new Set();
let lastContext    = null;
let messageQueue   = [];     // Cola de mensajes cuando el panel está cerrado

// ─────────────────────────────────────────────
//  1. Iniciar Bridge vía Native Messaging
// ─────────────────────────────────────────────

function startLauncher() {
  if (nativeLauncher) return;
  console.log("[SW] 🚀 Iniciando bridge vía Native Host...");
  try {
    nativeLauncher = chrome.runtime.connectNative(NATIVE_HOST);

    nativeLauncher.onMessage.addListener((msg) => {
      console.log("[SW] 📦 Launcher:", msg);
      if (msg.type === "launcher_ready") {
        // Bridge listo — conectar WebSocket
        connectBridge();
      } else if (msg.type === "launcher_error") {
        console.error("[SW] ❌ Launcher error:", msg.error);
      }
    });

    nativeLauncher.onDisconnect.addListener(() => {
      const err = chrome.runtime.lastError?.message;
      console.warn("[SW] Launcher desconectado:", err);
      nativeLauncher = null;
      // Si el launcher muere, el bridge también. Reconectar en 5s.
      setTimeout(startLauncher, 5000);
    });

  } catch (e) {
    console.error("[SW] Error iniciando launcher:", e);
    // Fallback: intentar WebSocket directamente (bridge ya corriendo)
    connectBridge();
  }
}

// ─────────────────────────────────────────────
//  2. Conectar WebSocket al Bridge
// ─────────────────────────────────────────────

function connectBridge() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  console.log("[SW] 🔌 Conectando WebSocket al bridge...");
  ws = new WebSocket(BRIDGE_WS);

  ws.onopen = () => {
    console.log("[SW] ✅ Bridge WebSocket conectado");
    reconnectDelay = RECONNECT_MS;
    broadcastToPanel({ type: "ws_status", connected: true });
    if (lastContext) sendToBridge(lastContext);
  };

  ws.onmessage = (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    handleIncoming(data);
  };

  ws.onclose = () => {
    console.log(`[SW] 🔴 Bridge cerrado. Reconectando en ${reconnectDelay}ms...`);
    broadcastToPanel({ type: "ws_status", connected: false });
    ws = null;
    setTimeout(connectBridge, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);
  };

  ws.onerror = (err) => { console.error("[SW] WS error:", err); };
}

function sendToBridge(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ─────────────────────────────────────────────
//  Mensajes entrantes del Cerebro
// ─────────────────────────────────────────────

async function handleIncoming(data) {
  const type = data.type;
  if (type === "chat") {
    console.log("[SW] 🧠 Chat recibido del cerebro, guardando en Storage...");
    await saveMessageToStorage(data);
    // Ya no hacemos broadcastToPanel(data) para el contenido del chat, 
    // el panel lo detectará vía storage.onChanged (v1.6.0)
    broadcastToPanel({ type: "ping_chat" }); // Solo para feedback visual opcional
    return;
  }
  if (type === "status" || type === "history") {
    broadcastToPanel(data);
    return;
  }
  if (type === "cmd") {
    const result = await executeCommand(data);
    sendToBridge({ type: "result", id: data.id, ...result });
    return;
  }
}

async function saveMessageToStorage(msg) {
  const role = (msg.role === "assistant" || msg.role === "antigravity") ? "antigravity" : msg.role;
  const result = await chrome.storage.local.get(["chat_history"]);
  let history = result.chat_history || [];
  
  // Evitar duplicados (por si acaso un sync se dispara dos veces)
  const isDuplicate = history.some(m => m.content === msg.content && (Date.now() - m.timestamp < 2000));
  if (isDuplicate) return;

  history.push({ role, content: msg.content, timestamp: Date.now() });
  if (history.length > 50) history.shift();
  await chrome.storage.local.set({ "chat_history": history });
}

// ─────────────────────────────────────────────
//  Ejecución de Comandos
// ─────────────────────────────────────────────

async function executeCommand(cmd) {
  const { action, payload } = cmd;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length && action !== "newTab") throw new Error("No hay pestaña activa");
    const tabId = tabs[0]?.id;

    switch (action) {
      case "navigate":
        await chrome.tabs.update(tabId, { url: payload.url });
        return { success: true, data: `Navegando a ${payload.url}` };

      case "newTab":
        const t = await chrome.tabs.create({ url: payload.url || "about:blank" });
        return { success: true, data: { tabId: t.id } };

      case "click": {
        const r = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel) => { const el=document.querySelector(sel); if(!el) return {ok:false,e:`no existe: ${sel}`}; el.click(); return {ok:true}; },
          args: [payload.selector]
        });
        return r[0].result.ok ? { success: true, data: "Clicked" } : { success: false, data: r[0].result.e };
      }

      case "type": {
        const r = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel, txt) => { const el=document.querySelector(sel); if(!el) return {ok:false,e:`no existe: ${sel}`}; el.focus(); el.value=txt; el.dispatchEvent(new Event("input",{bubbles:true})); return {ok:true}; },
          args: [payload.selector, payload.text]
        });
        return r[0].result.ok ? { success: true, data: "Typed" } : { success: false, data: r[0].result.e };
      }

      case "execute": {
        const r = await chrome.scripting.executeScript({
          target: { tabId },
          func: (code) => { try { return {ok:true,result:eval(code)}; } catch(e) { return {ok:false,e:e.message}; } },
          args: [payload.js]
        });
        return r[0].result.ok ? { success: true, data: String(r[0].result.result) } : { success: false, data: r[0].result.e };
      }

      case "getDOM": {
        const r = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel) => { const el=sel?document.querySelector(sel):document.body; return el?el.innerHTML.slice(0,50000):"no encontrado"; },
          args: [payload.selector || null]
        });
        return { success: true, data: r[0].result };
      }

      case "scroll": {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel) => { const el=sel?document.querySelector(sel):document.documentElement; if(el) el.scrollIntoView({behavior:"smooth",block:"center"}); },
          args: [payload.selector || null]
        });
        return { success: true, data: "Scrolled" };
      }

      case "getContext":
        return { success: true, data: await getCurrentContext() };

      default:
        return { success: false, data: `Acción desconocida: "${action}"` };
    }
  } catch (err) {
    return { success: false, data: err.message };
  }
}

// ─────────────────────────────────────────────
//  Contexto de Pestaña
// ─────────────────────────────────────────────

async function getCurrentContext() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) return null;
    const tab = tabs[0];
    let selectedText = "";
    try {
      const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.getSelection()?.toString() || "" });
      selectedText = r[0].result || "";
    } catch {}
    return { url: tab.url, title: tab.title, tabId: tab.id, selectedText, timestamp: Date.now() };
  } catch { return null; }
}

async function broadcastContext() {
  const ctx = await getCurrentContext();
  if (!ctx) return;
  lastContext = { type: "context", ...ctx };
  sendToBridge(lastContext);
  broadcastToPanel({ type: "context_update", ...ctx });
}

// ─────────────────────────────────────────────
//  Side Panel
// ─────────────────────────────────────────────

function broadcastToPanel(data) {
  console.log("[SW] Intentando enviar al panel:", data);
  console.log("[SW] Panel port activo:", panelPorts.size > 0);

  if (panelPorts.size === 0) {
    if (data.type === "chat" || data.type === "status") {
      console.log("[SW] Guardando mensaje en cola temporal (panel cerrado)");
      messageQueue.push(data);
    }
    return;
  }

  for (const port of panelPorts) {
    try { port.postMessage(data); } catch { panelPorts.delete(port); }
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "panel") return;
  panelPorts.add(port);
  console.log("[SW] Panel conectado. Vaciando cola de mensajes:", messageQueue.length);
  
  // Enviar estado de conexión
  port.postMessage({ type: "ws_status", connected: ws?.readyState === WebSocket.OPEN });
  
  // Vaciar cola
  while (messageQueue.length > 0) {
    const msg = messageQueue.shift();
    port.postMessage(msg);
  }
  port.onMessage.addListener((msg) => { if (msg.type === "chat" || msg.type === "context") sendToBridge(msg); });
  port.onDisconnect.addListener(() => panelPorts.delete(port));
});

// ─────────────────────────────────────────────
//  Eventos Chrome
// ─────────────────────────────────────────────

chrome.tabs.onActivated.addListener(() => setTimeout(broadcastContext, 300));
chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === "complete") broadcastContext(); });
chrome.action.onClicked.addListener((tab) => chrome.sidePanel.open({ tabId: tab.id }));

// ─────────────────────────────────────────────
//  Inicio
// ─────────────────────────────────────────────

startLauncher();  // Chrome inicia el bridge → cuando confirma, conectamos WebSocket
console.log("[SW] 🧠 Antigravity Intercom Service Worker iniciado");

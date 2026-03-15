/**
 * context_extractor.js — AI Intercom Content Script
 * ===================================================
 * Extrae contexto de la pestaña activa y lo envía al Service Worker.
 * Corre en cada página que coincide con "<all_urls>" (document_end).
 *
 * Datos extraídos:
 *   - URL y título de la página
 *   - Texto seleccionado por el usuario
 *   - Dominio para inferir temperatura dinámica
 *   - Meta descripción (cuando existe)
 */

(function () {
  "use strict";

  // Enviar contexto inicial de la página al cargar
  function extractPageContext() {
    const metaDesc = document.querySelector('meta[name="description"]');
    return {
      type: "page_context",
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      description: metaDesc ? metaDesc.content : "",
      timestamp: Date.now(),
    };
  }

  // Enviar texto seleccionado cuando el usuario hace una selección
  function handleSelectionChange() {
    const selected = window.getSelection().toString().trim();
    if (selected.length > 0) {
      chrome.runtime.sendMessage({
        type: "selection_context",
        selectedText: selected,
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
      });
    }
  }

  // Enviar contexto de la página al Service Worker al cargar
  try {
    chrome.runtime.sendMessage(extractPageContext());
  } catch (err) {
    // The service worker may be suspended on load; this is expected.
    // Log only in development to aid debugging without polluting production consoles.
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
      console.debug("[AI Intercom] context_extractor: initial send skipped —", err.message);
    }
  }

  // Escuchar cambios de selección de texto
  document.addEventListener("mouseup", handleSelectionChange);
  document.addEventListener("keyup", (e) => {
    if (e.shiftKey) handleSelectionChange();
  });
})();

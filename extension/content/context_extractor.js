// context_extractor.js — AI Intercom Content Script
// Observes page changes and sends context to the service worker.
// Currently minimal: just signals page readiness.

(function () {
  // Notify the service worker that the page is loaded
  chrome.runtime.sendMessage({
    type: "page_context",
    url: window.location.href,
    title: document.title,
    timestamp: Date.now()
  }).catch(() => {
    // Service worker may not be active, this is safe to ignore
  });
})();

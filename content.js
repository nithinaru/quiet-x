(() => {
  "use strict";

  const UI = "data-quiet-x-ui";
  const FIXTURE_PORT = "8765";

  let running = false;
  let observer = null;
  let scheduled = false;
  let currentPath = null;
  let routePoll = 0;
  let toneTimer = 0;

  function allowedHost() {
    const host = location.hostname;
    if (
      host === "x.com" ||
      host === "twitter.com" ||
      host === "mobile.x.com" ||
      host.endsWith(".x.com") ||
      host.endsWith(".twitter.com")
    ) {
      return true;
    }
    if ((host === "127.0.0.1" || host === "localhost") && location.port === FIXTURE_PORT) {
      return true;
    }
    return false;
  }

function start() {
  document.documentElement.classList.add("quiet-x");
    if (!observer) {
      observer = new MutationObserver(() => scheduleScan());
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    if (running) {
      scan();
      return;
    }
    running = true;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => scan(), { once: true });
    } else {
      scan();
    }
  }

  function stop() {
    running = false;
    observer?.disconnect();
    observer = null;
    window.clearInterval(routePoll);
    routePoll = 0;
    window.clearInterval(toneTimer);
    toneTimer = 0;
    currentPath = null;
    document.documentElement.classList.remove("quiet-x");
    delete document.documentElement.dataset.qxReady;
    document.querySelectorAll(`[${UI}]`).forEach((node) => node.remove());
document.querySelectorAll("[data-qx]").forEach((node) => node.removeAttribute("data-qx"));
  document.getElementById("qx-fonts")?.remove();
}

  function scheduleScan() {
    if (!running || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (running) scan();
    });
  }

  function scan() {
    if (!running) return;
    try {
      centerShell();
    } catch (error) {
      console.error("quiet-x", error);
    }
  }

  function centerShell() {
    const header = document.querySelector('header[role="banner"]');
    const main = document.querySelector('main[role="main"]');
    if (!header || !main) return;
    const parent = header.parentElement;
    if (parent && parent.contains(main)) parent.classList.add("qx-shell");
  }

function init() {
  if (!allowedHost()) return;
  document.documentElement.classList.add("quiet-x");
  document.documentElement.dataset.qxBoot = "1";
  start();
}

  init();
})();

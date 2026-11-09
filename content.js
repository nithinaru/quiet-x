(() => {
  "use strict";

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
    return false;
  }

  function init() {
    if (!allowedHost()) return;
    document.documentElement.classList.add("quiet-x");
  }

  init();
})();

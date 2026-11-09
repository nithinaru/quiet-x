const DEFAULTS = { enabled: true, hidePromoted: true, font: "inter" };

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(DEFAULTS, (data) => {
    chrome.storage.local.set({ ...DEFAULTS, ...data });
  });
});

function paintBadge(enabled) {
  const on = enabled !== false;
  chrome.action.setBadgeText({ text: on ? "" : "off" });
  chrome.action.setBadgeBackgroundColor({ color: "#222222" });
  chrome.action.setTitle({ title: on ? "quiet-x" : "quiet-x is off" });
}

chrome.storage.local.get(DEFAULTS, (data) => {
  paintBadge(data.enabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) {
    paintBadge(changes.enabled.newValue);
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.storage.local.get(DEFAULTS, (data) => {
    chrome.storage.local.set({ enabled: data.enabled === false });
  });
});

try {
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId !== 0) return;
    try {
      const sent = chrome.tabs.sendMessage(details.tabId, { type: "qx-route" });
      if (sent && typeof sent.catch === "function") sent.catch(() => {});
    } catch {
      /* the tab has no content script yet */
    }
  });
} catch {
  /* webNavigation is unavailable in this profile */
}

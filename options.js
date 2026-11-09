const DEFAULTS = { enabled: true, hidePromoted: true, font: "inter" };
const enabled = document.querySelector("#enabled");
const hidePromoted = document.querySelector("#hidePromoted");
const font = document.querySelector("#font");

chrome.storage.local.get(DEFAULTS, (data) => {
  enabled.checked = data.enabled !== false;
  hidePromoted.checked = data.hidePromoted !== false;
  font.value = data.font === "system" ? "system" : "inter";
  document.body.dataset.ready = "1";
});

enabled.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabled.checked });
});

hidePromoted.addEventListener("change", () => {
  chrome.storage.local.set({ hidePromoted: hidePromoted.checked });
});

font.addEventListener("change", () => {
  chrome.storage.local.set({ font: font.value });
});

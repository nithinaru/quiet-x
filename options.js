const DEFAULTS = { enabled: true, hidePromoted: true, font: "inter", theme: "dark" };
const enabled = document.querySelector("#enabled");
const hidePromoted = document.querySelector("#hidePromoted");
const font = document.querySelector("#font");
const theme = document.querySelector("#theme");
const systemLight = window.matchMedia("(prefers-color-scheme: light)");

function paintTheme() {
  const light = theme.value === "light" || (theme.value === "system" && systemLight.matches);
  document.documentElement.dataset.qxTheme = light ? "light" : "dark";
}
systemLight.addEventListener("change", paintTheme);

chrome.storage.local.get(DEFAULTS, (data) => {
  enabled.checked = data.enabled !== false;
  hidePromoted.checked = data.hidePromoted !== false;
  font.value = data.font === "system" ? "system" : "inter";
  theme.value = ["light", "system"].includes(data.theme) ? data.theme : "dark";
  paintTheme();
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

theme.addEventListener("change", () => {
  paintTheme();
  chrome.storage.local.set({ theme: theme.value });
});

(() => {
  "use strict";

  const DEFAULTS = { enabled: true, hidePromoted: true, font: "inter" };
  const UI = "data-quiet-x-ui";
  const FIXTURE_PORT = "8765";

  const NAV = [
    { key: "home", label: "home", testids: ["AppTabBar_Home_Link"], hrefs: ["/home"] },
    { key: "explore", label: "explore", testids: ["AppTabBar_Explore_Link"], hrefs: ["/explore"] },
    {
      key: "notifications",
      label: "notifications",
      testids: ["AppTabBar_Notifications_Link"],
      hrefs: ["/notifications"],
      count: true,
    },
    {
      key: "chat",
      label: "chat",
      testids: ["AppTabBar_DirectMessage_Link"],
      hrefs: ["/messages", "/i/chat"],
      count: true,
    },
    {
      key: "bookmarks",
      label: "bookmarks",
      testids: ["AppTabBar_Bookmarks_Link"],
      hrefs: ["/i/bookmarks"],
    },
    { key: "profile", label: "profile", testids: ["AppTabBar_Profile_Link"], hrefs: [] },
  ];

  const ACTION_KINDS = ["reply", "repost", "like", "keep", "share"];

  let running = false;
  let observer = null;
  let scheduled = false;
  let currentPath = null;
  let routePoll = 0;
  let toneTimer = 0;
  let hooked = false;

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

  function storageGet(defaults, done) {
    try {
      if (!chrome?.storage?.local) {
        done(defaults);
        return;
      }
      chrome.storage.local.get(defaults, (data) => {
        if (chrome.runtime?.lastError) done(defaults);
        else done({ ...defaults, ...data });
      });
    } catch {
      done(defaults);
    }
  }

  function hookRuntime() {
    if (hooked) return;
    hooked = true;
    try {
      chrome.runtime?.onMessage.addListener((message) => {
        if (message?.type === "qx-route" && running) scan();
      });
      chrome.storage?.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (!changes.enabled && !changes.font && !changes.hidePromoted) return;
        storageGet(DEFAULTS, applySettings);
      });
    } catch {
      /* opened outside the extension */
    }
  }

  function applySettings(data) {
    const root = document.documentElement;
    root.dataset.qxFont = data.font === "system" ? "system" : "inter";
    root.dataset.qxPromoted = data.hidePromoted === false ? "show" : "hide";
    if (data.enabled === false) stop();
    else start();
  }

function installFonts() {
  if (document.getElementById("qx-fonts")) return;
  if (!chrome?.runtime?.getURL) return;
  const face = (weight, file) =>
    `@font-face{font-family:"Inter";src:url("${chrome.runtime.getURL(file)}") format("woff2");font-weight:${weight};font-style:normal;font-display:swap;}`;
  const style = document.createElement("style");
  style.id = "qx-fonts";
  style.textContent = [face(400, "fonts/inter-400.woff2"), face(500, "fonts/inter-500.woff2"), face(600, "fonts/inter-600.woff2")].join("");
  document.documentElement.append(style);
}

function start() {
  document.documentElement.classList.add("quiet-x");
  installFonts();
    if (!routePoll) {
      routePoll = window.setInterval(() => {
        if (running && location.pathname !== currentPath) scan();
      }, 800);
    }
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
      const routeChanged = location.pathname !== currentPath;
      if (routeChanged) {
        currentPath = location.pathname;
        document.documentElement.dataset.qxStatus = isStatusRoute() ? "1" : "0";
        window.clearInterval(toneTimer);
        toneTimer = 0;
        document.querySelectorAll(`[${UI}]`).forEach((node) => node.remove());
        document.querySelectorAll("article[data-testid='tweet']").forEach((article) => {
          article.removeAttribute("data-qx");
        });
      }
      centerShell();
      renderNav();
      refreshCounts();
      updateNavActive();
      hideHomeComposer();
      if (document.querySelector("[data-testid='primaryColumn']")) ensureBack();
      for (const article of articles()) transformArticle(article);
      if (isStatusRoute()) transformComposer(document.querySelector("[data-testid='primaryColumn']"));
      if (document.readyState !== "loading") {
        document.documentElement.dataset.qxReady = "1";
      }
    } catch (error) {
      console.error("quiet-x", error);
    }
  }

  function isStatusRoute() {
    return /\/status\/\d+/.test(location.pathname);
  }

  function centerShell() {
    const header = document.querySelector('header[role="banner"]');
    const main = document.querySelector('main[role="main"]');
    if (!header || !main) return;
    const parent = header.parentElement;
    if (parent && parent.contains(main)) parent.classList.add("qx-shell");
  }

  function findNav() {
    return (
      document.querySelector('nav[aria-label="Primary"]') ||
      document.querySelector('[data-testid="SideNav_Nav"]') ||
      document.querySelector('header[role="banner"] nav')
    );
  }

  function pathOf(href) {
    if (!href) return "";
    return href.split("?")[0].split("#")[0];
  }

  function hrefMatches(href, part) {
    const path = pathOf(href);
    return path === part || path.startsWith(`${part}/`);
  }

  function findLink(item) {
    for (const id of item.testids) {
      const found = document.querySelector(`[data-testid="${id}"]`);
      if (found) return found;
    }
    if (item.hrefs?.length) {
      for (const link of document.querySelectorAll("a[href]")) {
        const href = link.getAttribute("href") || "";
        if (item.hrefs.some((part) => hrefMatches(href, part))) return link;
      }
    }
    if (item.key === "profile") return document.querySelector('a[aria-label="Profile"]');
    return null;
  }

  function renderNav() {
    const nav = findNav();
    if (!nav) return;
    if (!nav.querySelector(".qx-navlist")) {
      const list = document.createElement("div");
      list.className = "qx-navlist";
      list.setAttribute(UI, "");
      for (const item of NAV) list.append(navButton(item));
      const rule = document.createElement("div");
      rule.className = "qx-nav-divider";
      rule.setAttribute(UI, "");
      list.append(rule);
      list.append(
        rowButton("write", "write", "n", () => {
          document.querySelector('[data-testid="SideNav_NewTweet_Button"]')?.click();
        }),
      );
      list.append(
        rowButton("search", "search", "/", () => {
          findLink(NAV[1])?.click();
        }),
      );
      const tone = rowButton("tone", "tone", "", () => {});
      const hint = document.createElement("span");
      hint.className = "qx-nav-hint";
      tone.append(hint);
      list.append(tone);
      nav.append(list);
      startTone(hint);
    }
    const header = nav.closest("header") || nav;
    header.querySelectorAll("a, button").forEach((control) => {
      if (control.closest(`[${UI}]`)) return;
      control.classList.add("qx-clip");
    });
  }

  function rowButton(key, label, hint, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "qx-nav-item";
    button.dataset.qxNav = key;
    button.setAttribute(UI, "");
    const text = document.createElement("span");
    text.className = "qx-nav-label";
    text.textContent = label;
    button.append(text);
    if (hint) {
      const side = document.createElement("span");
      side.className = "qx-nav-hint";
      side.textContent = hint;
      button.append(side);
    }
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function navButton(item) {
    return rowButton(item.key, item.label, "", () => {
      findLink(item)?.click();
    });
  }

  function startTone(node) {
    window.clearInterval(toneTimer);
    toneTimer = 0;
    const frozen = new URLSearchParams(location.search).get("qx-tone");
    const started = Date.now();
    const paint = () => {
      node.textContent = frozen || formatElapsed(Date.now() - started);
    };
    paint();
    if (!frozen) toneTimer = window.setInterval(paint, 1000);
  }

  function formatElapsed(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  }

  function badgeCount(anchor) {
    if (!anchor) return "";
    const label = anchor.getAttribute("aria-label") || "";
    const fromLabel = label.match(/(\d[\d,]*)\s+unread/i);
    if (fromLabel) return fromLabel[1].replace(/,/g, "");
    const texts = [...anchor.querySelectorAll("span, div")]
      .map((node) => node.textContent.trim())
      .filter((text) => /^\d{1,4}$/.test(text));
    return texts[0] || "";
  }

  function refreshCounts() {
    for (const item of NAV) {
      if (!item.count) continue;
      const parent = document.querySelector(`[data-qx-nav="${item.key}"]`);
      if (!parent) continue;
      const value = badgeCount(findLink(item));
      let slot = parent.querySelector(".qx-nav-count");
      if (!value) {
        slot?.remove();
        continue;
      }
      if (!slot) {
        slot = document.createElement("span");
        slot.className = "qx-nav-count";
        slot.setAttribute(UI, "");
        parent.append(slot);
      }
      if (slot.textContent !== value) slot.textContent = value;
      parent.setAttribute("aria-label", `${item.label}, ${value} unread`);
    }
  }

  function updateNavActive() {
    for (const item of NAV) {
      const row = document.querySelector(`[data-qx-nav="${item.key}"]`);
      if (!row) continue;
      const native = findLink(item);
      const active = isActive(item, native);
      row.classList.toggle("is-active", active);
      if (active) row.setAttribute("aria-current", "page");
      else row.removeAttribute("aria-current");
    }
  }

  function isActive(item, native) {
    const path = location.pathname;
    const nativePath = pathOf(native?.getAttribute("href") || "");
    if (item.key === "profile") return Boolean(nativePath) && path === nativePath;
    if (item.key === "home") return path === "/home" || path === "/" || path === nativePath;
    if (!nativePath) return false;
    return path === nativePath || path.startsWith(`${nativePath}/`);
  }

  function hideHomeComposer() {
    if (isStatusRoute()) return;
    const box = document.querySelector('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]');
    if (!box) return;
    let node = box;
    while (
      node.parentElement &&
      node.parentElement.getAttribute("data-testid") !== "primaryColumn"
    ) {
      node = node.parentElement;
    }
    if (node.getAttribute("data-testid") === "primaryColumn") return;
    if (!node.querySelector("article[data-testid='tweet']")) node.classList.add("qx-clip");
  }

  function articles() {
    const primary = document.querySelector('[data-testid="primaryColumn"]');
    const root = primary || document.body;
    return [...root.querySelectorAll('article[data-testid="tweet"]')];
  }

  function isPromoted(article) {
    if (article.querySelector('[data-testid="placementTracking"]')) return true;
    if (article.closest('[data-testid="placementTracking"]')) return true;
    return [...article.querySelectorAll('[data-testid="socialContext"]')].some((node) =>
      /promoted|sponsored|^ad$/i.test(node.textContent.trim()),
    );
  }

  function isDetailArticle(article) {
    if (!isStatusRoute()) return false;
    const primary = article.closest('[data-testid="primaryColumn"]') || document;
    const main =
      primary.querySelector('article[data-testid="tweet"][tabindex="-1"]') ||
      primary.querySelector('article[data-testid="tweet"]');
    return article === main;
  }

  function transformArticle(article) {
    if (isPromoted(article)) {
      article.dataset.qxPromoted = "1";
      if (document.documentElement.dataset.qxPromoted !== "show") return;
    } else {
      delete article.dataset.qxPromoted;
    }
    const mode = isDetailArticle(article) ? "detail" : "timeline";
    if (article.getAttribute("data-qx") === mode) {
      refreshArticle(article);
      return;
    }
    article.querySelectorAll(`[${UI}]`).forEach((node) => node.remove());
    article.setAttribute("data-qx", mode);
    inlinePinned(article);
    if (mode === "detail") buildDetail(article);
    else buildTimeline(article);
  }

  function inlinePinned(article) {
    const contexts = [...article.querySelectorAll('[data-testid="socialContext"]')];
    const pinned = contexts.find((node) => /pinned/i.test(node.textContent));
    if (!pinned) return;
    pinned.classList.add("qx-clip");
    const name = article.querySelector('[data-testid="User-Name"]');
    if (!name || /pinned/i.test(name.textContent) || name.querySelector("[data-qx-pinned]")) return;
    const handleRow = name.children[1] || name;
    const time = handleRow.querySelector("time");
    const anchor = time ? time.closest("a") || time : null;
    const word = document.createElement("span");
    word.className = "qx-pinned";
    word.setAttribute(UI, "");
    word.dataset.qxPinned = "1";
    word.textContent = "pinned";
    const dot = document.createElement("span");
    dot.setAttribute(UI, "");
    dot.textContent = " · ";
    if (anchor) {
      handleRow.insertBefore(word, anchor);
      handleRow.insertBefore(dot, anchor);
    } else {
      handleRow.append(dot, word);
    }
  }

  function buildTimeline(article) {
    const bar = document.createElement("div");
    bar.className = "qx-bar";
    bar.setAttribute(UI, "");
    const metrics = document.createElement("p");
    metrics.className = "qx-metrics";
    metrics.setAttribute(UI, "");
    metrics.textContent = metricsLine(article);
    bar.append(metrics, buildActions(article, false));
    clipGroup(article);
    insertBeforeGroup(article, bar);
  }

  function buildDetail(article) {
    const meta = buildMeta(article);
    if (meta) insertBeforeGroup(article, meta);
    const bar = document.createElement("div");
    bar.className = "qx-bar is-detail";
    bar.setAttribute(UI, "");
    const actions = buildActions(article, true);
    actions.setAttribute("data-qx-detail-actions", "");
    bar.append(actions);
    const tools = buildTools(article);
    if (tools) bar.append(tools);
    clipGroup(article);
    insertBeforeGroup(article, bar);
  }

  function buildMeta(article) {
    const time = article.querySelector("time");
    if (!time) return null;
    const iso = time.getAttribute("datetime");
    const when = iso ? formatStamp(iso) : time.textContent.trim();
    const views = article.querySelector('a[href*="/analytics"]');
    const viewText = views ? formatViews(views.textContent) : "";
    const line = document.createElement("p");
    line.className = "qx-meta";
    line.setAttribute(UI, "");
    const whenSpan = document.createElement("span");
    whenSpan.textContent = viewText ? `${when} · ` : when;
    line.append(whenSpan);
    if (viewText) {
      const strong = document.createElement("strong");
      strong.textContent = viewText;
      line.append(strong);
    }
    if (views) views.classList.add("qx-clip");
    return line;
  }

  function formatStamp(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).formatToParts(date);
    const hour = parts.find((part) => part.type === "hour")?.value || "";
    const minute = parts.find((part) => part.type === "minute")?.value || "";
    const period = parts.find((part) => part.type === "dayPeriod")?.value || "";
    const ampm = period.replace(/\./g, "").toUpperCase().startsWith("A") ? "AM" : "PM";
    const month = new Intl.DateTimeFormat("en-US", {
      month: "long",
      timeZone: "UTC",
    }).format(date);
    return `${hour}:${minute} ${ampm} · ${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  }

  function formatViews(raw) {
    const cleaned = raw.replace(/views?/gi, "").trim();
    const match = cleaned.match(/^([\d.,]+)\s*([KMB])?$/i);
    if (!match) return raw.trim().toLowerCase();
    return `${match[1]}${(match[2] || "").toLowerCase()} views`;
  }

  function buildActions(article, withCount) {
    const group = document.createElement("div");
    group.className = "qx-actions";
    group.setAttribute(UI, "");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Post actions");
    ACTION_KINDS.forEach((kind, index) => {
      if (index > 0) {
        const sep = document.createElement("span");
        sep.className = "qx-sep";
        sep.setAttribute(UI, "");
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = " · ";
        group.append(sep);
      }
      group.append(makeActionButton(article, kind, withCount));
    });
    return group;
  }

  function makeActionButton(article, kind, withCount) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "qx-action";
    button.dataset.qxAction = kind;
    button.setAttribute(UI, "");
    paintAction(button, article, kind, withCount);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const native = findNative(article, kind);
      if (!native) return;
      native.click();
      refreshArticle(article);
      window.setTimeout(() => refreshArticle(article), 80);
      window.setTimeout(() => refreshArticle(article), 400);
    });
    return button;
  }

  function paintAction(button, article, kind, withCount) {
    const native = findNative(article, kind);
    const text = buttonLabel(kind, native, withCount);
    if (button.textContent !== text) button.textContent = text;
    const on = isOn(kind, native);
    button.classList.toggle("is-on", on);
    if (kind === "like" || kind === "keep" || kind === "repost") {
      button.setAttribute("aria-pressed", on ? "true" : "false");
    }
    button.setAttribute("aria-label", text);
  }

  function buttonLabel(kind, native, withCount) {
    const word = actionWord(kind, native);
    const count = visibleCount(native);
    if (withCount && count && kind !== "share") return `${word} ${count}`;
    return word;
  }

  function actionWord(kind, native) {
    if (kind === "like") return isOn("like", native) ? "liked" : "like";
    if (kind === "keep") return isOn("keep", native) ? "kept" : "keep";
    if (kind === "repost") return isOn("repost", native) ? "reposted" : "repost";
    return kind;
  }

  function isOn(kind, native) {
    const id = native?.getAttribute("data-testid") || "";
    if (kind === "like") return id === "unlike";
    if (kind === "keep") return id === "removeBookmark";
    if (kind === "repost") return id === "unretweet";
    return false;
  }

  function findNative(article, kind) {
    const ids = {
      reply: ["reply"],
      repost: ["retweet", "unretweet"],
      like: ["like", "unlike"],
      keep: ["bookmark", "removeBookmark"],
      share: ["share"],
    }[kind];
    if (!ids) return null;
    for (const id of ids) {
      const found = article.querySelector(`[data-testid="${id}"]`);
      if (found) return found;
    }
    return null;
  }

  function visibleCount(button) {
    if (!button) return "";
    for (const span of button.querySelectorAll("span")) {
      const text = span.textContent.trim();
      if (/^[\d.,]+[KMB]?$/i.test(text)) return text;
    }
    const label = button.getAttribute("aria-label") || "";
    const match = label.match(/([\d.,]+)\s*([KMB])?/i);
    if (!match) return "";
    return `${match[1]}${(match[2] || "").toUpperCase()}`;
  }

  function metricsLine(article) {
    const parts = [];
    const likes = visibleCount(findNative(article, "like"));
    const reposts = visibleCount(findNative(article, "repost"));
    const replies = visibleCount(findNative(article, "reply"));
    if (likes) parts.push(`${likes} likes`);
    if (reposts) parts.push(`${reposts} reposts`);
    if (replies) parts.push(`${replies} replies`);
    return parts.join(" · ");
  }

  function refreshArticle(article) {
    const metrics = article.querySelector(".qx-metrics");
    if (metrics) {
      const next = metricsLine(article);
      if (metrics.textContent !== next) metrics.textContent = next;
    }
    const withCount = article.getAttribute("data-qx") === "detail";
    for (const kind of ACTION_KINDS) {
      const button = article.querySelector(`[data-qx-action="${kind}"]`);
      if (button) paintAction(button, article, kind, withCount);
    }
  }

  function clipGroup(article) {
    const group = article.querySelector('[role="group"]');
    if (!group) return;
    group.classList.add("qx-clip");
    group.setAttribute("aria-hidden", "true");
  }

  function insertBeforeGroup(article, node) {
    const group = article.querySelector('[role="group"]');
    if (group?.parentElement) group.parentElement.insertBefore(node, group);
    else article.append(node);
  }

  function buildTools(article) {
    const scope = article.closest('[data-testid="primaryColumn"]') || article;
    const sort = scope.querySelector('[data-testid="replySort"]');
    const quotes = scope.querySelector('a[href*="/quotes"]');
    if (!sort && !quotes) return null;
    const tools = document.createElement("div");
    tools.className = "qx-tools";
    tools.setAttribute(UI, "");
    if (sort) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "qx-tool";
      button.setAttribute(UI, "");
      button.textContent = sortLabel(sort.textContent || "");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        (scope.querySelector('[data-testid="replySort"]') || sort).click();
      });
      tools.append(button);
      sort.classList.add("qx-clip");
    }
    if (sort && quotes) {
      const sep = document.createElement("span");
      sep.className = "qx-sep";
      sep.setAttribute(UI, "");
      sep.textContent = " · ";
      tools.append(sep);
    }
    if (quotes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "qx-tool";
      button.setAttribute(UI, "");
      button.textContent = "view quotes";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        quotes.click();
      });
      tools.append(button);
      quotes.classList.add("qx-clip");
    }
    return tools;
  }

  function sortLabel(raw) {
    const text = raw.toLowerCase();
    if (text.includes("recent")) return "sort recent ⌄";
    if (text.includes("like")) return "sort likes ⌄";
    return "sort relevant ⌄";
  }

  function ensureBack() {
    const primary = document.querySelector('[data-testid="primaryColumn"]');
    if (!primary || primary.querySelector(":scope > .qx-back")) return;
    const native =
      primary.querySelector('[data-testid="app-bar-back"]') ||
      document.querySelector('[data-testid="app-bar-back"]');
    if (!native && !isStatusRoute()) return;
    if (native) native.classList.add("qx-clip");
    const back = document.createElement("button");
    back.type = "button";
    back.className = "qx-back";
    back.setAttribute(UI, "");
    back.textContent = isStatusRoute() ? "← post" : "←";
    back.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const current =
        primary.querySelector('[data-testid="app-bar-back"]') ||
        document.querySelector('[data-testid="app-bar-back"]');
      if (current) current.click();
      else history.back();
    });
    primary.insertBefore(back, primary.firstChild);
  }

  function transformComposer(primary) {
    if (!primary) return;
    const box = primary.querySelector('[data-testid="tweetTextarea_0"]');
    if (!box) return;
    const shell = box.closest('[data-testid="tweetComposer"]') || box.parentElement;
    if (!shell || shell.getAttribute("data-testid") === "primaryColumn") return;
    shell.classList.add("qx-composer");
    if (!shell.querySelector(".qx-prompt")) {
      const prompt = document.createElement("div");
      prompt.className = "qx-prompt";
      prompt.setAttribute(UI, "");
      prompt.textContent = "> post your reply";
      const send = document.createElement("button");
      send.type = "button";
      send.className = "qx-send";
      send.setAttribute(UI, "");
      send.textContent = "reply";
      send.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        primary.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]')?.click();
      });
      shell.append(prompt, send);
      const sync = () => {
        const empty = !(box.textContent || "").trim();
        prompt.hidden = !empty;
        box.classList.toggle("is-empty", empty);
      };
      box.addEventListener("input", sync);
      sync();
    }
    primary.querySelector('[data-testid="toolBar"]')?.classList.add("qx-clip");
    primary.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]')?.classList.add("qx-clip");
  }

function init() {
  if (!allowedHost()) return;
  document.documentElement.classList.add("quiet-x");
  document.documentElement.dataset.qxBoot = "1";
  hookRuntime();
  applySettings(DEFAULTS);
  storageGet(DEFAULTS, applySettings);
}

  init();
})();

// Quiet X palette remap.
//
// X (react-native-web) paints everything through atomic generated classes such
// as `.r-1cvl2hr{color:rgba(29,155,240,1.00)}`, injected into same-origin
// <style> sheets, often with insertRule, so rules keep arriving after load.
// The class names change between builds, so we never hardcode them. Instead we
// read X's own rules at runtime, find the ones whose colors belong to X's
// palette, and emit `html.quiet-x <same selector> { prop: token !important }`
// into our own <style id="qx-palette">. That makes every page (explore,
// notifications, chat, settings...) follow our tokens in any X theme.
//
// API: globalThis.quietXPalette = { sync(), clear() }
//   sync()  incremental pass over document.styleSheets; returns
//           { scanned, emitted } for the rules looked at this call.
//   clear() removes #qx-palette and forgets what was processed.

(() => {
  "use strict";

  const FG = "var(--qx-fg)";
  const MUTED = "var(--qx-muted)";
  const BG = "var(--qx-bg)";
  const CLEAR = "transparent";

  // ---- Color tables (rgb triples, alpha 1 unless noted). Tweak here. ----

  // `color`, `fill`, `stroke`.
  const TEXT_COLORS = {
    [FG]: [
      "231,233,234", "15,20,25", "247,249,249", "255,255,255", "0,0,0", // primary text
      "29,155,240", "26,140,216", // X blue + hover (other blues: see isBlue)
      "249,24,128", "0,186,124", "244,33,46", // like, repost, red
      "255,212,0", "255,122,0", "120,86,255", // yellow, orange, purple accents
    ],
    [MUTED]: ["113,118,123", "83,100,113", "139,152,165", "110,118,125"],
  };

  // `background-color`, opaque.
  const BG_COLORS = {
    [BG]: ["0,0,0", "255,255,255", "21,32,43"],
    [CLEAR]: [
      "22,24,28", "32,35,39", "24,26,30", // lights out surfaces
      "247,249,249", "239,243,244", // light surfaces
      "30,39,50", "39,51,64", "25,39,52", // dim surfaces
    ],
  };

  // `background-color` with alpha <= FAINT_ALPHA on these bases -> transparent
  // (hover washes). Translucent black above that (media scrims, video chips)
  // is left alone on purpose.
  const FAINT_BG_BASES = ["0,0,0", "255,255,255", "15,20,25", "231,233,234"];
  const FAINT_ALPHA = 0.1;

  // Per-side border colors, opaque. X blue borders (focus rings) -> MUTED.
  const BORDER_COLORS = {
    [CLEAR]: ["47,51,54", "239,243,244", "56,68,77", "207,217,222", "51,54,57", "83,100,113"],
  };

  // X blue and its theme variants: r < 40, 130 < g < 170, b > 200.
  const isBlue = (c) => c.r < 40 && c.g > 130 && c.g < 170 && c.b > 200;

  const MAX_SELECTOR = 2000;
  const STYLE_ID = "qx-palette";

  // ---- Mapping ----

  const toMap = (table) => {
    const m = new Map();
    for (const value of Object.keys(table)) for (const rgb of table[value]) m.set(rgb, value);
    return m;
  };
  const TEXT_MAP = toMap(TEXT_COLORS);
  const BG_MAP = toMap(BG_COLORS);
  const BORDER_MAP = toMap(BORDER_COLORS);
  const FAINT_SET = new Set(FAINT_BG_BASES);

  // Chrome serializes as `rgb(r, g, b)` / `rgba(r, g, b, a)`; also accept the
  // space/slash syntax just in case.
  const COLOR_RE = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/i;
  function parseColor(str) {
    if (!str) return null;
    const m = COLOR_RE.exec(str.trim());
    if (!m) return null;
    let a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (m[5]) a /= 100;
    const c = { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a };
    c.key = c.r + "," + c.g + "," + c.b;
    return c;
  }

  function mapText(c) {
    if (!c || c.a < 1) return null;
    return TEXT_MAP.get(c.key) || (isBlue(c) ? FG : null);
  }

  // Returns { value, only } — `only` means "touch nothing else in this rule"
  // (solid blue fills: primary buttons, unread badges; styles.css owns their text).
  function mapBackground(c) {
    if (!c) return null;
    if (isBlue(c)) return c.a >= 1 ? { value: FG, only: true } : { value: CLEAR };
    if (c.a >= 1) {
      const v = BG_MAP.get(c.key);
      return v ? { value: v } : null;
    }
    if (c.a <= FAINT_ALPHA && FAINT_SET.has(c.key)) return { value: CLEAR };
    return null;
  }

  function mapBorder(c) {
    if (!c || c.a < 1) return null;
    return BORDER_MAP.get(c.key) || (isBlue(c) ? MUTED : null);
  }

  const BORDER_SIDES = [
    ["borderTopColor", "border-top-color"],
    ["borderRightColor", "border-right-color"],
    ["borderBottomColor", "border-bottom-color"],
    ["borderLeftColor", "border-left-color"],
  ];

  // Declarations to override for one style rule, or null.
  function overridesFor(style) {
    const bg = mapBackground(parseColor(style.backgroundColor));
    if (bg && bg.only) return "background-color:" + bg.value + " !important;";

    let out = "";
    if (bg) out += "background-color:" + bg.value + " !important;";
    const color = mapText(parseColor(style.color));
    if (color) out += "color:" + color + " !important;";
    // Per-side longhands cover `border-color` too (the shorthand only
    // serializes to a single color when all sides agree).
    for (const [prop, css] of BORDER_SIDES) {
      const v = mapBorder(parseColor(style[prop]));
      if (v) out += css + ":" + v + " !important;";
    }
    for (const prop of ["fill", "stroke"]) {
      const v = mapText(parseColor(style[prop]));
      if (v) out += prop + ":" + v + " !important;";
    }
    return out || null;
  }

  // ---- Selector scoping ----

  // Split a selector list on top-level commas (ignores commas in (), [] and quotes).
  function splitSelectors(text) {
    const parts = [];
    let depth = 0, quote = "", start = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = ""; continue; }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      else if (ch === "," && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
    }
    parts.push(text.slice(start));
    return parts.map((s) => s.trim()).filter(Boolean);
  }

  // Media keeps X's own colors: duration chips, captions over video, and the
  // pixels inside cards are content, not chrome (SPEC: only round the container).
  const MEDIA =
    ':is([data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"], [data-testid="card.wrapper"])';
  const NOT_MEDIA = `:not(${MEDIA}):not(${MEDIA} *)`;

  function scope(selectorText) {
    return splitSelectors(selectorText)
      .map((sel) => {
        // A pseudo-element must stay last, so those rules are left unguarded.
        const guarded = sel.includes("::") ? sel : sel + NOT_MEDIA;
        // `html`/`:root` selectors target the root itself, so qualify rather than nest.
        const m = /^(html|:root)(?![\w-])/i.exec(sel);
        return m ? "html.quiet-x" + guarded.slice(m[0].length) : "html.quiet-x " + guarded;
      })
      .join(", ");
  }

  // ---- Sheet walking ----

  let processedCount = new WeakMap(); // sheet -> cssRules.length at last pass (fast skip)
  let seenRules = new WeakSet(); // top-level rules already handled (RNW inserts mid-sheet)
  let styleEl = null;

  function ownSheet() {
    if (styleEl && !styleEl.isConnected) reset(); // someone removed it: rebuild
    if (!styleEl) {
      styleEl = document.getElementById(STYLE_ID);
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = STYLE_ID;
        (document.documentElement || document).appendChild(styleEl);
      }
    }
    return styleEl.sheet;
  }

  // Override text for one rule (recursing into @media / @supports), or "".
  function emitFor(rule) {
    if (rule.selectorText !== undefined && rule.style) {
      if (rule.selectorText.length > MAX_SELECTOR) return "";
      const decls = overridesFor(rule.style);
      return decls ? scope(rule.selectorText) + "{" + decls + "}" : "";
    }
    let prelude = null;
    if (typeof CSSMediaRule !== "undefined" && rule instanceof CSSMediaRule) {
      prelude = "@media " + rule.media.mediaText;
    } else if (typeof CSSSupportsRule !== "undefined" && rule instanceof CSSSupportsRule) {
      prelude = "@supports " + rule.conditionText;
    }
    if (!prelude || !rule.cssRules) return "";
    let inner = "";
    for (const child of rule.cssRules) inner += emitFor(child);
    return inner ? prelude + "{" + inner + "}" : "";
  }

  function sync() {
    const stats = { scanned: 0, emitted: 0 };
    try {
      const target = ownSheet();
      if (!target) return stats;
      const batch = [];

      for (const sheet of Array.from(document.styleSheets)) {
        if (sheet === target || (sheet.ownerNode && sheet.ownerNode.id === STYLE_ID)) continue;
        let rules;
        try { rules = sheet.cssRules; } catch (_) { continue; } // cross-origin
        if (!rules) continue;
        const len = rules.length;
        if (processedCount.get(sheet) === len) continue;
        processedCount.set(sheet, len);

        for (let i = 0; i < len; i++) {
          const rule = rules[i];
          if (seenRules.has(rule)) continue;
          seenRules.add(rule);
          stats.scanned++;
          try {
            const text = emitFor(rule);
            if (text) batch.push(text);
          } catch (_) { /* odd rule; skip */ }
        }
      }

      for (const text of batch) {
        try {
          target.insertRule(text, target.cssRules.length);
          stats.emitted++;
        } catch (_) { /* selector Chrome won't re-parse; skip */ }
      }
    } catch (_) { /* never throw out of sync */ }
    return stats;
  }

  function reset() {
    processedCount = new WeakMap();
    seenRules = new WeakSet();
    styleEl = null;
  }

  function clear() {
    try {
      const el = styleEl || document.getElementById(STYLE_ID);
      if (el) el.remove();
    } catch (_) { /* ignore */ }
    reset();
  }

  globalThis.quietXPalette = { sync, clear };
})();

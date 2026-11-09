# Working notes

Read SPEC.md first, then AGENTS.md. The extension is plain JavaScript and CSS. There is no build step.

Work milestone by milestone (M1 through M5). Do not start a later milestone's behavior until the earlier one's acceptance criteria pass. M6 is optional and not required.

Selectors: prefer `data-testid`, `aria-label`, and `role`. Do not depend on generated class names. When a selector breaks, fix it in `SELECTORS` / the find helpers at the top of content.js and say what you observed.

Test by reloading the unpacked extension on chrome://extensions, then refreshing the x.com tab. CSS injected at `document_start` still needs a refresh. `npm test` loads the extension in Chrome and checks fixtures on http://127.0.0.1:8765.

Design tokens are the CSS variables at the top of styles.css. Change those instead of scattering hex values.

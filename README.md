# quiet-x

A Chrome extension that restyles X into a minimal, text-only, black-and-white reading view. It hides the right sidebar, turns the left nav into lowercase words, and replaces the like/repost/reply icons with a line of text. Clicks still hit X's own buttons. There is no API and no build step.

The behavior, selectors, and milestones are in [SPEC.md](SPEC.md). Design tokens are the CSS variables at the top of `styles.css`.

## Load unpacked

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Choose Load unpacked and select this folder.
4. Open [https://x.com](https://x.com) and refresh.

After a code change, click Reload on the extension card, then refresh the X tab. The toolbar icon toggles the restyle. Right-click the icon and choose Options for the typeface and promoted-post switch.

`http://127.0.0.1/*` is listed in the manifest so the local test fixtures pick up the content script. The script only runs on port 8765.

## Tests

```bash
npm install
npm test
```

`npm test` serves the fixtures at `http://127.0.0.1:8765` and launches Playwright's Chromium with this folder loaded as an unpacked extension. Branded Google Chrome ignores `--load-extension`, so install the test browser once with `npx playwright install chromium`. Screenshots land in `docs/screenshots/`.

To load it yourself, use Chrome's Load unpacked button (that path still works). The command-line flag does not, on current branded Chrome.

Inter is bundled under the SIL Open Font License (`fonts/OFL.txt`).

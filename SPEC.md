# quiet-x

A Chrome extension (Manifest V3) that restyles x.com and twitter.com into a minimal, text-only, black-and-white reading view. No X API. No backend. No build step.

The owner can hand this file to another coding agent and expect a complete extension from it alone. The repo already contains an implementation; this document is still the source of truth for behavior.

## Goal

Debloat X. The reference is a demo by @codycollier: https://x.com/codycollier/status/2119780776095121848

The product is a content script plus injected CSS. It hides the right sidebar, replaces icon chrome with lowercase text, and forces a black-and-white type-first layout. Actions still happen by clicking X's real controls, which stay in the DOM and are visually hidden.

## What the four reference frames show

The frames are shots of one continuous demo. All four sit inside a large rounded black window on a dim gray surround. That surround is the video's framing, not part of the in-tab page. Do not draw a fake desktop or a close button inside the x.com page. A dedicated popup window is M6 and is optional.

### Frame 1 — profile timeline

Left column, text only, lowercase, no icons:

- home
- explore
- notifications, with a plain right-aligned `3`
- chat, with a plain right-aligned `4`
- bookmarks
- profile
- a thin hairline
- write, with a right-aligned `n`
- search, with a right-aligned `/`
- tone, with a right-aligned `30s`

A small `←` sits above the profile header. There is no cover photo and no oversized avatar.

Profile header, one line: `x.ai/bot` in white, `joined august 2026` in gray. Next line: `4 following` and `517.6k followers` (numbers white, words gray). Then a "followed by" line with a couple of tiny circular avatars: `followed by allegedly!, arfur rock, and 79 others you follow`.

Tabs, lowercase, active tab underlined in white: `posts`, `replies`, `reposts`, `media`. No tab pills. No divider between posts.

First post:

- Circular avatar.
- One line: `Grok Bot` (white, with a small verified mark), `@bot · pinned · Aug 12` in gray.
- Body: "Introducing Grok Bot, now in early beta." then "Bots are AI teammates that do real work for you. They sign in to your tools, use them just like you do, and come back with finished work."
- Rounded video still, caption "We recently hired a new teammate", duration `1:43`.
- Gray metrics, no icons: `39K likes · 8K reposts · 3.7K replies`.

The next post starts below it: "Grok Bot can now make phone calls." and the top of a white card. There is no border between the posts. The right sidebar (trends, who to follow, search, premium) is gone. The nav and the feed are a centered pair with black space around them.

### Frame 2 — hover actions

Scrolled timeline. A video player from the previous post is partly visible (`0:04 / 1:46`) with the same metrics line under it.

The phone-call post shows a white rounded card: "Your internet contract renews in 3 days." / "Want me to call and cancel?" with a small orange mark and `0:39`. Under the card, one line: metrics on the left (`15K likes · 1.6K reposts · 3.4K replies`) and, because the pointer is over the post, text actions on the right: `reply · repost · like · keep · share`. The cursor sits on the like word. A later post about shopping is just starting. Still no dividers.

### Frame 3 — post detail

The phone-call card is large. Under it:

`1:13 AM · November 5, 2026 · 5.7m views`

The views phrase is a bit stronger than the timestamp. Then an always-visible action row (this is not hover-only):

`reply 3.4K · repost 1.6K · liked 15K · keep 3.5K · share`

`liked` is white. A tiny warm dot appears beside it in the frame; do not add that dot. No brand color. On the same line, right-aligned: `sort relevant ⌄ · view quotes`.

Reply box: `> post your reply` on the left, a text button `reply` on the right. The source frame still shows a faint row of composer icons under that line. This extension hides that icon row so the composer stays text-only (see open questions).

Replies use the same spacing as the timeline and have no dividers:

- Brad Gosse, `@bradgosse · Nov 5`: "@bot set this up for me. I never want to talk to another human on the phone again." Metrics `317 likes · 7 reposts · 45 replies`.
- Grok Bot with a small `OP` mark: "On it. Sending this to your Grok Bot now." Metrics `124 likes · 2 reposts · 17 replies`.
- A "Show replies" control, rendered lowercase: `show replies`.

The left nav is still there.

### Frame 4 — detail header

The column header is `← post`. Author line and the sentence "Grok Bot can now make phone calls." sit above a large white card whose visible frame is an orange pill, `Yes please.`, with `0:38`. The same meta line, action row, sort control, and reply box are below the card. Counts in the source frame are `keep 3.5K`, not 33K. Display whatever count X actually renders. Never hardcode the demo numbers.

## Design tokens

All of these live as CSS variables at the top of `styles.css`. Change the variables, not scattered hex values.

| Token | Value | Use |
| --- | --- | --- |
| `--qx-bg` | `#000000` | Page, columns, menus |
| `--qx-fg` | `#ffffff` | Primary text, active nav, liked/kept/reposted |
| `--qx-muted` | `#9a9a9a` | Handles, dates, metrics, inactive actions. Must stay at least WCAG AA on `#000` (this value is about 7:1) |
| `--qx-nav` | `#d4d4d4` | Inactive nav labels |
| `--qx-faint` | `#7a7a7a` | Shortcut hints (`n`, `/`, the tone value) |
| `--qx-hairline` | `#2a2a2a` | The single nav divider. Not used between posts |
| `--qx-font` | Inter, then system UI stack | No remote font requests. Inter is bundled (OFL, see `fonts/OFL.txt`) |
| `--qx-nav-size` | `15px` | Nav labels |
| `--qx-body-size` | `15.5px` | Post text |
| `--qx-meta-size` | `13.5px` | Metrics, meta, actions |
| `--qx-nav-width` | `220px` | Left column |
| `--qx-feed-width` | `640px` | Primary column |
| `--qx-column-gap` | `64px` | Space between the columns |
| `--qx-radius` | `12px` | Media and cards (within the 8–12px range; 12px matches the frames) |
| `--qx-avatar` | `40px` | Circular avatars |
| `--qx-post-pad-y` | `28px` | Vertical padding of a post |
| `--qx-line` | `1.45` | Body line height |

Rules that are not a token:

- UI labels the extension writes are lowercase. Post body, display names, and the `OP` badge stay as X wrote them.
- No X blue (`#1d9bf0`) on chrome, links, or tabs. Verified badges may stay gold; they are identity, not chrome.
- No borders or dividers between posts, replies, or cells. The nav hairline and the active tab underline are the only rules.
- System font fallback is `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. An options control can force that stack and skip Inter.
- Do not load fonts from a CDN.

## Layout

Two columns, centered as a pair: nav, then the primary column. The right sidebar is removed entirely: trends, who to follow, search box, premium upsells, footer links.

On real X the shell is usually `header[role="banner"]` plus `main[role="main"]` (primary column and sidebar). The script adds `qx-shell` to their shared parent and the CSS centers that shell at `nav + gap + feed`. The header becomes sticky inside the shell instead of pinned to the viewport edge. The sidebar gets `display: none`.

Below 860px, stack the nav as a wrapping text row above a full-width feed. Do not leave a horizontal scrollbar.

Hide, as chrome rather than content:

- The X logo link (`a[aria-label="X"]` or `Twitter`)
- Account switcher
- Grok, Premium, Lists, Communities, Articles, More, and any other nav item that is not in the list below
- Profile banner / header photo
- The home timeline composer ("what's happening"), so a profile or home looks like the frames
- Promoted posts when the option is on (default on). A post is promoted when it contains `[data-testid="placementTracking"]` or a social context whose text is "Promoted", "Sponsored", or "Ad"

Do not restyle the pixels inside photos, videos, or cards (the white phone card, the shopping tiles). Only round the media container.

## Left nav

Build a text nav inside `nav[aria-label="Primary"]` (fallback `[data-testid="SideNav_Nav"]`). Hide X's original links and buttons with a clip class, but keep the nodes so `.click()` still works.

Order:

1. home → `AppTabBar_Home_Link` or `a[href="/home"]`
2. explore → `AppTabBar_Explore_Link` or `/explore`
3. notifications → `AppTabBar_Notifications_Link`. Unread count right-aligned, plain number, hidden at zero
4. chat → `AppTabBar_DirectMessage_Link` or `/messages` or `/i/chat`. Same count treatment
5. bookmarks → `AppTabBar_Bookmarks_Link` or `/i/bookmarks`. If X only exposes bookmarks inside More, use the `/i/bookmarks` href
6. profile → `AppTabBar_Profile_Link` or `a[aria-label="Profile"]`
7. hairline
8. write, hint `n` → click `[data-testid="SideNav_NewTweet_Button"]`
9. search, hint `/` → click the explore link. The sidebar search field is `display: none`, so it cannot be focused. Moving that React input is fragile; explore is the reliable search surface. The `/` hint is visual. Do not steal the `/` or `n` keys; X's own shortcuts should keep working
10. tone, value on the right
11. theme, value on the right (`dark` or `light`). Clicking flips it and saves `theme`

The hairline doubles as the secret way back to regular X: a triple-click sets `enabled` to false and tears the restyle down. The toolbar icon or the options page turns it back on. Nothing on the page advertises this.

Active item: white label. Inactive: `--qx-nav`. No pill, no icon.

Counts come from an aria-label like "Notifications (3 unread items)" or from a descendant whose text is only a number. Re-read them on each scan so a new notification shows up.

### Tone

The frames show `tone` with `30s` and never explain it. Chosen behavior: a session clock. It shows how long this page has been open (`0s`, `12s`, `5m`, `1h`), starting when the content script starts. It does not filter the feed. The implementation is isolated in `startTone` so it can be replaced.

Fixtures pass `?qx-tone=30s` to freeze the label for screenshots and tests. Ignore that parameter on a normal x.com visit unless it is present.

Other readings, not implemented: a recency window ("only the last 30 seconds"), a focus timer, or a typography setting. See open questions.

## Timeline posts

Scope: `article[data-testid="tweet"]` inside `[data-testid="primaryColumn"]`.

For each article:

- Mark it `data-qx="timeline"` so a later scan only refreshes it.
- Put name, handle, and date on one line. CSS turns `[data-testid="User-Name"]` into a row: first child white and semibold, second child muted. If a `[data-testid="socialContext"]` says pinned, hide that row and insert the word `pinned` before the `time` if the name line does not already contain it.
- Leave the verified badge.
- Restyle `[data-testid="caret"]` as a gray `···` with its svg hidden. Clicking it still opens X's menu.
- Hide the native `[role="group"]` action bar (reply, repost, like, bookmark, share) with the clip class and `aria-hidden="true"`. Do not `remove()` those buttons.
- Insert one bar in the group's place:

```html
<div class="qx-bar" data-quiet-x-ui>
  <p class="qx-metrics">39K likes · 8K reposts · 3.7K replies</p>
  <div class="qx-actions" role="group" aria-label="Post actions">
    <button type="button" data-qx-action="reply">reply</button>
    <span class="qx-sep"> · </span>
    <button type="button" data-qx-action="repost">repost</button>
    <span class="qx-sep"> · </span>
    <button type="button" data-qx-action="like">like</button>
    <span class="qx-sep"> · </span>
    <button type="button" data-qx-action="keep">keep</button>
    <span class="qx-sep"> · </span>
    <button type="button" data-qx-action="share">share</button>
  </div>
</div>
```

Metrics order is likes, reposts, replies. Use the compact string already in the button (`39K`, `3.7K`), not a reformatted number. Skip a segment only when X has no count. Views are not on this line.

The action row is `visibility: hidden` until the article is hovered or `:focus-within`. On a detail-page main post it is always visible (see below).

Words:

| Control | testids | Off | On |
| --- | --- | --- | --- |
| reply | `reply` | reply | reply |
| repost | `retweet`, `unretweet` | repost | reposted, white |
| like | `like`, `unlike` | like | liked, white |
| keep | `bookmark`, `removeBookmark` | keep | kept, white |
| share | `share` | share | share |

Clicking a text button calls `preventDefault`, `stopPropagation`, then `.click()` on the native button inside the same article (look it up at click time, not at bind time, so a React re-render does not leave a stale node). Then refresh the labels immediately and again after 80ms and 400ms, because X updates `data-testid` asynchronously. If the click did nothing (logged-out wall), the later refresh restores the previous word.

`like` becomes `liked` in `--qx-fg`. Same for `reposted` and `kept`.

Build every injected node with `createElement` and `textContent`. Never `innerHTML` with post text.

Native menus (`[role="menu"]`) are black with white text so the repost and share sheets are not blue.

## Post detail

A status route is `location.pathname` matching `/\/status\/\d+/`.

The main post is the article in the primary column with `tabindex="-1"`, otherwise the first article. Replies keep the timeline treatment (metrics plus hover actions).

Header: a button `← post` inserted at the top of the primary column. It clicks `[data-testid="app-bar-back"]` if that exists, otherwise `history.back()`. The native back control is clipped. On other pages that already have a back button, the label is only `←`.

Meta line, from the article's `time[datetime]` and `a[href*="/analytics"]`:

`1:13 AM · November 5, 2026 · 5.7m views`

Format the timestamp in UTC with `en-US` parts so the string is stable: hour numeric, minute 2-digit, `AM`/`PM`, full month, day, year. Lowercase a `K`/`M`/`B` suffix on the view count and the word `views`. The views phrase is white; the time and date are muted. Clip the original analytics link so it is not shown twice. Do not clip the `time` in the name line.

Action row, always visible, counts included, share has no count:

`reply 3.4K · repost 1.6K · liked 15K · keep 3.5K · share`

Right side of the same row: `sort relevant ⌄ · view quotes`.

- Sort reads `[data-testid="replySort"]` (text like "Relevant" or "Recent") and proxies a click. Copy the current choice into the label (`sort recent ⌄`, `sort likes ⌄`, otherwise `sort relevant ⌄`).
- View quotes proxies `a[href*="/quotes"]`.

Reply box, only on status routes:

- Find `[data-testid="tweetTextarea_0"]` inside the primary column. Do not reparent it into a node you will later delete.
- Show `> post your reply` while the box is empty. Hide that prompt once there is text. Clicking the row focuses the box.
- A text button `reply` proxies `[data-testid="tweetButton"]` or `tweetButtonInline`.
- Clip `[data-testid="toolBar"]` and the native reply button.

`[data-testid="showReplies"]` is lowercase text, no button chrome. `[data-testid="op-badge"]` stays uppercase in a small muted outline.

## Profile header

Using X's own nodes, not a second profile renderer:

- `[data-testid="UserName"]` and `[data-testid="UserJoinDate"]` on one line. Join date is lowercase (`joined august 2026`). The name is not lowercased.
- Following / followers links: number white, label lowercase. `517.6K` may become `517.6k` through `text-transform`.
- `[data-testid="UserProfileHeader_SocialContext"]` stays, lowercase, tiny round avatars.
- `[role="tab"]` lowercase. The selected tab is white with an inset white underline. No blue pill.
- Hide `[data-testid="profileBanner"]` and `a[href$="/header_photo"]`.

## Architecture

```
manifest.json      MV3, content script on x.com, twitter.com, and the fixture host
content.js         DOM adapter. Isolated world. No MAIN-world injection
styles.css         Tokens (dark and light) and the timeline, profile, detail, and nav rules
pages.css          Explore, search, notifications, chat, settings, lists, dialogs, buttons
palette.js         Remaps X's own atomic-class colors onto the tokens at runtime
background.js      Toolbar toggle, badge, webNavigation route pings
options.html       M5 settings
options.js
options.css
fonts/             Inter 400/500/600, OFL
fixtures/          Local pages that mirror X's testids
tests/             Playwright
```

Why there is no build step: the extension is one content script and one stylesheet. A bundler would slow the reload-unpacked loop and hide the selector map. Playwright is a dev dependency for `npm test` only. It is not part of the extension package. If the script ever has to be split, add more files to the `content_scripts.js` array in order. Still no bundler.

### Boot

`run_at: document_start`. CSS is injected with the script so the first paint is closer to black.

1. If the host is not x.com, twitter.com, or `127.0.0.1:8765` / `localhost:8765`, return. The manifest matches every port on 127.0.0.1 because match patterns and ports are easy to get wrong; the script itself enforces 8765.
2. Add `quiet-x` on `<html>` immediately.
3. Read `chrome.storage.local` (`enabled` default true, `hidePromoted` default true, `font` default `inter`). If `enabled` is false, remove the class and the injected nodes.
4. On DOMContentLoaded, scan. A MutationObserver on `document.documentElement` (`childList`, `subtree`) schedules another scan with `requestAnimationFrame`. Scans are idempotent.
5. Also poll `location.pathname` every 800ms. Content scripts cannot wrap the page world's `history.pushState`. The observer covers DOM swaps; the poll and `chrome.webNavigation.onHistoryStateUpdated` cover route changes that reuse nodes.
6. Set `data-qx-ready="1"` once `document.readyState` is not `loading`.

When the path changes, remove every `[data-quiet-x-ui]` node and clear `data-qx` on articles, then rebuild. Do not remove native X nodes.

Ignore mutations that only happen inside `[data-quiet-x-ui]` by being idempotent rather than by disconnecting forever. A second scan must not insert a second metrics line.

### Storage keys

| Key | Default | Effect |
| --- | --- | --- |
| `enabled` | `true` | Class `quiet-x`, observer, injected UI |
| `hidePromoted` | `true` | `html[data-qx-promoted="hide"]` hides `article[data-qx-promoted="1"]` |
| `font` | `inter` | `html[data-qx-font="system"]` switches the font variable |
| `theme` | `dark` | `dark`, `light`, or `system`. Sets `html[data-qx-theme]` to `dark` or `light`; the light token block in `styles.css` swaps the colors |

The toolbar icon toggles `enabled`. The options page edits all three. `chrome.storage.onChanged` applies them without a reload.

### Selector map

Verify these in DevTools when X ships a redesign. They were stable for a long time and are what the fixtures use.

| Piece | Selector |
| --- | --- |
| Primary column | `[data-testid="primaryColumn"]` |
| Sidebar | `[data-testid="sidebarColumn"]` |
| Nav | `nav[aria-label="Primary"]`, `[data-testid="SideNav_Nav"]` |
| Home | `[data-testid="AppTabBar_Home_Link"]` |
| Explore | `[data-testid="AppTabBar_Explore_Link"]` |
| Notifications | `[data-testid="AppTabBar_Notifications_Link"]` |
| Chat | `[data-testid="AppTabBar_DirectMessage_Link"]` |
| Bookmarks | `[data-testid="AppTabBar_Bookmarks_Link"]`, `a[href="/i/bookmarks"]` |
| Profile | `[data-testid="AppTabBar_Profile_Link"]` |
| Compose | `[data-testid="SideNav_NewTweet_Button"]` |
| Tweet | `article[data-testid="tweet"]` |
| Text | `[data-testid="tweetText"]` |
| Name | `[data-testid="User-Name"]` |
| Avatar | `[data-testid="Tweet-User-Avatar"]` |
| Social context | `[data-testid="socialContext"]` |
| Actions | `[role="group"]` inside the article |
| Reply | `[data-testid="reply"]` |
| Repost | `[data-testid="retweet"]`, `[data-testid="unretweet"]` |
| Like | `[data-testid="like"]`, `[data-testid="unlike"]` |
| Keep | `[data-testid="bookmark"]`, `[data-testid="removeBookmark"]` |
| Share | `[data-testid="share"]` |
| More | `[data-testid="caret"]` |
| Back | `[data-testid="app-bar-back"]` |
| Views | `a[href*="/analytics"]` |
| Composer | `[data-testid="tweetTextarea_0"]` |
| Reply button | `[data-testid="tweetButton"]`, `[data-testid="tweetButtonInline"]` |
| Composer tools | `[data-testid="toolBar"]` |
| Reply sort | `[data-testid="replySort"]` |
| Quotes | `a[href*="/quotes"]` |
| Search input | `[data-testid="SearchBox_Search_Input"]` |
| Promoted | `[data-testid="placementTracking"]` |

Discovery snippet for the console on x.com:

```js
[...document.querySelectorAll("[data-testid]")]
  .map((node) => node.getAttribute("data-testid"))
  .filter((value, index, all) => all.indexOf(value) === index)
  .sort()
```

### Accessibility

- Injected controls are `<button type="button">` with an accessible name.
- Like, keep, and repost set `aria-pressed`.
- The hidden native group is `aria-hidden="true"` so a screen reader does not announce two toolbars.
- `display: none` still receives `.click()` in Chrome. Programmatic click is how the proxy works. Do not `remove()` the native buttons.
- `:focus-visible` draws a 1px white outline with a 3px offset.
- `:focus-within` reveals the action row, same as hover.
- `prefers-reduced-motion: reduce` disables animation. The extension does not add motion of its own.
- Do not ship `opacity: 0` as the only hide. Playwright and some AT treat that as visible. Use `visibility: hidden` or `display: none`.
- Secondary text stays on the AA side of `#000`.

### Security

Isolated world only. No `eval`, no remote script, no MAIN-world injection. Text from the page is copied with `textContent`.

## Files the extension ships

- `manifest.json` — content script CSS and JS at `document_start`; `storage` and `webNavigation`; host permissions for x.com, twitter.com, and `http://127.0.0.1/*`; `options_ui`; toolbar action with no popup (click toggles).
- `http://127.0.0.1/*` is for the test server only. The script ignores other ports.
- Fonts are listed in `web_accessible_resources` so the content-script stylesheet can load them.

## Theme and palette

X paints most of its UI with generated atomic classes (`.r-xxxx{color:...}`). Those names change between builds, so `palette.js` never hardcodes them. On each scan it walks the same-origin stylesheets incrementally, finds rules whose `color`, `background-color`, border colors, `fill`, or `stroke` belong to X's palette (all three X themes), and writes `html.quiet-x <same selector> { prop: token !important }` into `<style id="qx-palette">`. X blue and accent colors become `--qx-fg`, X grays become `--qx-muted`, surfaces and hover washes become transparent, dividers become transparent. Media containers (`tweetPhoto`, `videoPlayer`, `videoComponent`, `card.wrapper`) and our own `[data-quiet-x-ui]` nodes are excluded, so captions, duration chips, and our controls keep their colors. Turning the extension off clears the sheet.

`content.js` sets `html[data-qx-page]` on each route (`home`, `explore`, `search`, `notifications`, `chat`, `settings`, `bookmarks`, `lists`, `profile`, `status`, `other`) so `pages.css` can scope page rules. Several selectors in `pages.css` are unverified against logged-in X; the file's comments mark them.

## Milestones

### M1 — CSS hide and restyle

Acceptance:

- Right sidebar is not visible on home, profile, and status.
- Background of `html` and `body` is `#000`. Primary text is white. No visible `#1d9bf0` on chrome.
- Font is the token stack.
- Articles have no border between them.
- Media containers use `--qx-radius`. Avatars are circles.
- The page still scrolls and links still exist in the DOM.
- Turning the extension off removes `quiet-x` and the page looks like X again.

### M2 — text nav

Acceptance:

- The visible nav is exactly `home explore notifications chat bookmarks profile`, a hairline, then `write search tone`.
- Labels are lowercase in the DOM, not only via CSS.
- Notification and chat counts are plain numbers, right-aligned, absent at zero.
- `write` shows `n` and clicks the real compose control.
- `search` shows `/` and clicks explore.
- `tone` shows a duration (`30s` when `?qx-tone=30s`).
- Clicking each row activates X's own link.
- The two columns are centered. Grok, premium, lists, the logo, and the account switcher are not visible.

### M3 — text actions

Acceptance:

- No visible SVG inside a tweet's `[role="group"]`.
- Metrics read like `39K likes · 8K reposts · 3.7K replies`.
- Hover or focus shows `reply · repost · like · keep · share`.
- One click on `like` clicks the native like button exactly once and the word becomes `liked` in white.
- A second click returns to `like` when the native testid returns to `like`.
- `keep` and `repost` follow the same on/off words.
- Articles added later by infinite scroll get the same bar, once.

### M4 — post detail

Acceptance:

- Status routes show `← post`.
- Meta line matches `1:13 AM · November 5, 2026 · 5.7m views` for that UTC timestamp and a `5.7M Views` source.
- The action row includes the counts and is visible without hover.
- `sort relevant ⌄ · view quotes` is on that row and proxies the native controls.
- The reply box shows `> post your reply` and a `reply` button that proxies the native reply button.
- Replies have timeline spacing and no dividers.

### M5 — options and toggle

Acceptance:

- `options.html` is the extension options page: enabled, hide promoted, typeface (`inter` or `system`).
- The toolbar click toggles enabled. The badge says `off` when disabled.
- Disabling removes the class and the injected nodes without a reload. Enabling rebuilds them.
- Promoted posts are hidden by default and can be shown again.

### M6 — optional, not built

A popup window, not an iframe. x.com refuses to be framed.

Acceptance if someone builds it later:

- Toolbar action grows a way to open `chrome.windows.create({ url: "https://x.com/home", type: "popup", width: 1100, height: 840 })`.
- The extension is already active in that window.
- Do not add a PWA manifest or a hosted shell. The `×` in the demo is the window's close button.

## Tests

`npm test` starts a fixture server on `127.0.0.1:8765` and launches Playwright's Chromium (Chrome for Testing) with `--load-extension` and `--disable-extensions-except`, headed, because extensions do not load under the old headless shell. Branded Google Chrome ignores those flags, so do not point the tests at `channel: "chrome"`. Playwright must drop its default `--disable-extensions` argument. Run `npx playwright install chromium` once before the first test.

Content-script stylesheets resolve `url()` against the page, so Inter is injected from `content.js` with `chrome.runtime.getURL`. The options page loads the same files with relative urls.

Fixtures are not the extension. `fixtures/fixture.css` paints a bright white, blue-link, bordered layout so the test can see the extension change it. The server stitches HTML partials. `fixtures/page.js` is the stand-in for X's client: it toggles `like`/`unlike`, `bookmark`/`removeBookmark`, and `retweet`/`unretweet`, and counts clicks in `data-clicks`. It also `preventDefault`s link clicks so a proxy click does not navigate the test away.

Required checks:

- Sidebar hidden, including "Who to follow" and "Premium".
- `body` background is `rgb(0, 0, 0)`.
- No visible SVG in tweet action groups.
- Nav labels lowercase, counts `3` and `4`, hints `n`, `/`, `30s`.
- Metrics text on the first two posts.
- Hover reveals `reply · repost · like · keep · share`.
- Like proxies once and the label becomes `liked` in `rgb(255, 255, 255)`.
- A cloned article appended to the column grows its own metrics line.
- `history.pushState` to `/bot/status/<id>` plus a DOM swap shows `← post`, the counted action row, and `> post your reply`.
- Detail page: meta line, sort line, reply box.
- Options uncheck removes `quiet-x`; check puts it back.
- A logged-out x.com visit is attempted and does not fail the run if X shows a wall or blocks the request.

Screenshots, committed under `docs/screenshots/`: `timeline.png`, `hover.png`, `liked.png`, `detail.png`. Compare them to the four frames and adjust tokens until the chrome matches: black ground, lowercase nav, one metrics line, hover words, detail header and counted actions. The photos inside the real demo cannot be reproduced; the fixture draws the same captions and cards.

## Risks

- X renames testids and rewrites the shell. The clip-and-proxy approach survives class-name churn and fails when testids move. Re-run the discovery snippet. Keep the old names as fallbacks for one release so a partial rollout does not blank the nav.
- The observer plus an 800ms path poll can jank a fast fling if `scan` walks the whole document and rewrites text. Guard with the `data-qx` marker, refresh text only when it changed, and coalesce through `requestAnimationFrame`. Do not observe `characterData`.
- Forcing a grid on `article` breaks X's own layout. Do not do that. Fixtures supply their own grid in `fixture.css`. On x.com, leave the article display alone and only insert the bar where the action group already sits.
- `display: none` on the sidebar also hides search. That is why search navigates to explore.
- Hiding promoted posts and the sidebar may conflict with X's terms. This is a personal client restyle. The promoted toggle exists so it can be turned off.
- Localized aria-labels ("Me gusta") will not match an English parser. Read the compact number in the inner `span` first, and only then the aria-label.
- Menus and dialogs portal to `body`. The black menu rule has to be global under `html.quiet-x`, not only inside the article.
- Accessibility regresses if both toolbars stay in the tree. Native group gets `aria-hidden`; ours is the one in tab order.
- Composer icon removal makes image replies harder. The native toolbar is clipped, not deleted, and can be unclipped later.
- Mobile X (a different DOM at small widths or a mobile UA) is best-effort. v1 targets the desktop layout.
- Login walls, sensitive-media interstitials, and Articles (longform) get the color and type treatment only.

## Open questions

1. Tone. Implemented as a session clock. Confirm or replace with a recency filter or a focus timer. `startTone` is the only place that paints the value.
2. The brief said `keep 33K`. The frame shows `3.5K`. The extension shows X's number. No further decision unless the owner wanted a different bookmark count format.
3. The red/coral dot next to `liked` in frame 3 is not reproduced. Say if it should be a 4px mark. Default is no extra color.
4. Composer utility icons are hidden. The frames still show them faintly. Unclip `[data-testid="toolBar"]` if image replies matter more than the text-only rule.
5. Should `reposted` and `kept` use the same white treatment as `liked`? They do today.
6. Hiding the profile banner matches frame 1. Some profiles will look bare. Confirm before turning that into an option.
7. Hiding promoted posts is on by default. Confirm the default against the terms concern above.
8. English UI strings only. Counts are copied from X, so they stay in X's locale. A translation pass is out of scope.
9. Chat (`/messages`, `/i/chat`) is recolored and loses the sidebar, but the conversation panes are not rebuilt. How aggressive should that page be?
10. M6 popup versus the in-tab centered columns. The frames look like a floating window because of the video crop. In-tab is the shipped layout.

## Out of scope

- X's API, OAuth, or any server.
- Posting, liking, or bookmarking except by proxying the buttons X already rendered.
- Rebuilding video players, polls, shopping cards, or the DM transcript.
- A store listing, analytics, or accounts.

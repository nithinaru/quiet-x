import { test, expect, chromium } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startFixtureServer } from "./server.js";

const PORT = 8765;
const HOME = `http://127.0.0.1:${PORT}/home?qx-tone=30s`;
const DETAIL = `http://127.0.0.1:${PORT}/bot/status/2119780776095121848?qx-tone=30s`;
const EXT = path.resolve(".");
const SHOTS = path.resolve("docs/screenshots");

let server;
let context;
let userDataDir;

async function extensionId() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const workers = context.serviceWorkers();
    if (workers.length) return new URL(workers[0].url()).host;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("extension service worker did not start");
}

test.beforeAll(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  server = await startFixtureServer(PORT);
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "qx-chrome-"));
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1360, height: 980 },
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    ignoreDefaultArgs: ["--disable-extensions"],
  });
});

test.afterAll(async () => {
  await context?.close();
  await new Promise((resolve) => server?.close(resolve));
  fs.rmSync(userDataDir, { recursive: true, force: true });
});

test("restyles the timeline and the detail view", async () => {
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
  await page.goto(HOME, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.qxReady === "1");

  await expect(page.locator("html")).toHaveClass(/quiet-x/);
  await expect(page.locator('[data-testid="sidebarColumn"]')).toBeHidden();
  await expect(page.getByRole("heading", { name: "Who to follow" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Premium" })).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(0, 0, 0)");

  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(font.toLowerCase()).toContain("inter");

  const labels = await page.locator(".qx-nav-label").allTextContents();
  expect(labels).toEqual([
    "home",
    "explore",
    "notifications",
    "chat",
    "bookmarks",
    "profile",
    "write",
    "search",
    "tone",
    "theme",
  ]);
  await expect(page.locator('[data-qx-nav="notifications"] .qx-nav-count')).toHaveText("3");
  await expect(page.locator('[data-qx-nav="chat"] .qx-nav-count')).toHaveText("4");
  await expect(page.locator('[data-qx-nav="write"] .qx-nav-hint')).toHaveText("n");
  await expect(page.locator('[data-qx-nav="search"] .qx-nav-hint')).toHaveText("/");
  await expect(page.locator('[data-qx-nav="tone"] .qx-nav-hint')).toHaveText("30s");
  await expect(page.locator('[data-qx-nav="home"]')).toHaveClass(/is-active/);

  const posts = page.locator('article[data-testid="tweet"]:visible');
  await expect(posts).toHaveCount(2);
  await expect(posts.nth(0).locator(".qx-metrics")).toHaveText("39K likes · 8K reposts · 3.7K replies");
  await expect(posts.nth(1).locator(".qx-metrics")).toHaveText("15K likes · 1.6K reposts · 3.4K replies");
  await expect(page.getByText("Promoted noise that should disappear.")).toBeHidden();

  const icons = page.locator('article[data-testid="tweet"] [role="group"] svg');
  expect(await icons.count()).toBeGreaterThan(0);
  const visibleIcons = await icons.evaluateAll((nodes) =>
    nodes.filter((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    }).length,
  );
  expect(visibleIcons).toBe(0);

  const border = await posts.nth(0).evaluate((node) => getComputedStyle(node).borderBottomWidth);
  expect(border).toBe("0px");

  await expect(posts.nth(1).locator(".qx-actions")).toBeHidden();
  await page.mouse.move(8, 8);
  await expect(posts.nth(0).locator(".qx-actions")).toBeHidden();
  await page.screenshot({ path: path.join(SHOTS, "timeline.png") });

  await posts.nth(1).hover();
  await expect(posts.nth(1).locator(".qx-actions")).toBeVisible();
  await expect(posts.nth(1).locator(".qx-actions")).toHaveText("reply · repost · like · keep · share");
  await page.screenshot({ path: path.join(SHOTS, "hover.png") });

  await page.bringToFront();
  await posts.nth(1).hover();
  await posts.nth(1).locator('[data-qx-action="like"]').click();
  await expect(posts.nth(1).locator('[data-testid="unlike"]')).toHaveAttribute("data-clicks", "1");
  await expect(posts.nth(1).locator('[data-qx-action="like"]')).toHaveText("liked");
  await expect
    .poll(() =>
      posts.nth(1).locator('[data-qx-action="like"]').evaluate((node) => getComputedStyle(node).color),
    )
    .toBe("rgb(255, 255, 255)");
  await posts.nth(1).hover();
  await page.screenshot({ path: path.join(SHOTS, "liked.png") });

  await page.locator('[data-qx-nav="write"]').click();
  await expect(page.locator('[data-testid="SideNav_NewTweet_Button"]')).toHaveAttribute("data-clicks", "1");

  await expect(page.locator('[data-qx-nav="theme"] .qx-nav-hint')).toHaveText("dark");
  await page.locator('[data-qx-nav="theme"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-qx-theme", "light");
  await expect(page.locator('[data-qx-nav="theme"] .qx-nav-hint')).toHaveText("light");
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(255, 255, 255)");
  await page.screenshot({ path: path.join(SHOTS, "light.png") });
  await page.locator('[data-qx-nav="theme"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-qx-theme", "dark");

  await page.locator(".qx-nav-divider").click({ clickCount: 3 });
  await expect(page.locator("html")).not.toHaveClass(/quiet-x/);
  await expect(page.locator(".qx-navlist")).toHaveCount(0);
  const [worker] = context.serviceWorkers();
  await worker.evaluate(() => chrome.storage.local.set({ enabled: true }));
  await expect(page.locator("html")).toHaveClass(/quiet-x/);

  await page.close();
});

test("observer covers new tweets and route changes", async () => {
  const page = await context.newPage();
  await page.goto(HOME, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.qxReady === "1");

  await page.evaluate(() => {
    const source = document.querySelector('article[data-testid="tweet"]');
    const copy = source.cloneNode(true);
    copy.removeAttribute("data-qx");
    copy.querySelectorAll("[data-quiet-x-ui]").forEach((node) => node.remove());
    copy.querySelector('[data-testid="tweetText"]').textContent = "A post that arrived while you were scrolling.";
    document.querySelector('[data-testid="primaryColumn"]').append(copy);
  });

  const fresh = page.locator("article", { hasText: "A post that arrived while you were scrolling." });
  await expect(fresh.locator(".qx-metrics")).toHaveText("39K likes · 8K reposts · 3.7K replies");
  await expect(fresh.locator(".qx-metrics")).toHaveCount(1);

  await page.evaluate(() => {
    const template = document.getElementById("qx-fixture-detail");
    const primary = document.querySelector('[data-testid="primaryColumn"]');
    primary.replaceChildren(template.content.cloneNode(true));
    history.pushState({}, "", "/bot/status/2119780776095121848");
  });

  await expect(page.locator(".qx-back")).toHaveText("← post");
  await expect(page.locator("[data-qx-detail-actions]")).toHaveText(
    "reply 3.4K · repost 1.6K · liked 15K · keep 3.5K · share",
  );
  await expect(page.locator(".qx-meta")).toHaveText("1:13 AM · November 5, 2026 · 5.7m views");
  await expect(page.locator(".qx-tools")).toHaveText("sort relevant ⌄ · view quotes");
  const colorOf = (selector) =>
    page.locator(selector).first().evaluate((node) => getComputedStyle(node).color);
  expect(await colorOf('[data-qx-detail-actions] [data-qx-action="reply"]')).toBe("rgb(154, 154, 154)");
  expect(await colorOf('[data-qx-detail-actions] [data-qx-action="like"]')).toBe("rgb(255, 255, 255)");

  await page.mouse.move(8, 8);
  await page.screenshot({ path: path.join(SHOTS, "detail.png") });

  await page.evaluate(() => {
    document.querySelector('[data-testid="replySort"]').remove();
    document.querySelector('a[href*="/quotes"]').remove();
    document.querySelector(".qx-tools").remove();
  });
  await page.evaluate(() => {
    const quotes = document.createElement("a");
    quotes.href = "/bot/status/2119780776095121848/quotes";
    quotes.textContent = "Quotes";
    document.querySelector('[data-testid="primaryColumn"]').append(quotes);
  });
  await expect(page.locator(".qx-tools")).toHaveText("view quotes");
  await expect(page.getByText("> post your reply", { exact: true })).toBeVisible();
  await expect(page.locator(".qx-send")).toHaveText("reply");
  await page.close();
});

test("detail route matches the post page", async () => {
  const page = await context.newPage();
  await page.goto(DETAIL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.qxReady === "1");
  await expect(page.locator(".qx-back")).toHaveText("← post");
  await expect(page.locator("[data-qx-detail-actions]")).toHaveText(
    "reply 3.4K · repost 1.6K · liked 15K · keep 3.5K · share",
  );
  await expect(page.locator(".qx-meta")).toHaveText("1:13 AM · November 5, 2026 · 5.7m views");
  await expect(page.locator(".qx-tools")).toHaveText("sort relevant ⌄ · view quotes");
  const colorOf = (selector) =>
    page.locator(selector).first().evaluate((node) => getComputedStyle(node).color);
  expect(await colorOf('[data-qx-detail-actions] [data-qx-action="reply"]')).toBe("rgb(154, 154, 154)");
  expect(await colorOf('[data-qx-detail-actions] [data-qx-action="like"]')).toBe("rgb(255, 255, 255)");

  await page.mouse.move(8, 8);
  await page.screenshot({ path: path.join(SHOTS, "detail.png") });

  await page.evaluate(() => {
    document.querySelector('[data-testid="replySort"]').remove();
    document.querySelector('a[href*="/quotes"]').remove();
    document.querySelector(".qx-tools").remove();
  });
  await page.evaluate(() => {
    const quotes = document.createElement("a");
    quotes.href = "/bot/status/2119780776095121848/quotes";
    quotes.textContent = "Quotes";
    document.querySelector('[data-testid="primaryColumn"]').append(quotes);
  });
  await expect(page.locator(".qx-tools")).toHaveText("view quotes");
  await expect(page.getByText("> post your reply", { exact: true })).toBeVisible();
  await expect(page.locator('[data-testid="sidebarColumn"]')).toBeHidden();

  await page.locator(".qx-send").click();
  await expect(page.locator('[data-testid="tweetButton"]')).toHaveAttribute("data-clicks", "1");

  const reply = page.locator("article", { hasText: "never want to talk to another human" });
  await expect(reply.locator(".qx-metrics")).toHaveText("317 likes · 7 reposts · 45 replies");
  await page.close();
});

test("options toggle removes and restores the restyle", async () => {
  const id = await extensionId();
  const home = await context.newPage();
  await home.goto(HOME, { waitUntil: "domcontentloaded" });
  await home.waitForSelector("html.quiet-x");

  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/options.html`);
  await options.waitForSelector("body[data-ready='1']");
  await expect(options.locator("#enabled")).toBeChecked();
  await options.locator("#enabled").uncheck();
  await home.waitForFunction(() => !document.documentElement.classList.contains("quiet-x"));
  await expect
    .poll(() => home.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(255, 255, 255)");

  await options.locator("#enabled").check();
  await home.waitForSelector("html.quiet-x");
  await expect(home.locator(".qx-nav-label").first()).toHaveText("home");
  await options.close();
  await home.close();
});

test("logged-out x.com is best effort", async () => {
  const page = await context.newPage();
  try {
    const response = await page.goto("https://x.com/explore", {
      timeout: 20000,
      waitUntil: "domcontentloaded",
    });
    const quiet = await page.locator("html.quiet-x").count();
    console.log(
      "x.com probe",
      response?.status() ?? "no-status",
      "quiet-x",
      quiet,
      "title",
      await page.title(),
    );
  } catch (error) {
    console.log("x.com probe failed", error instanceof Error ? error.message : String(error));
  }
  await page.close();
});

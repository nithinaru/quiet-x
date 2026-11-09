import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function includePartials(html) {
  return html.replace(/<!-- @include ([a-z0-9-]+) -->/g, (_, name) => {
    return fs.readFileSync(path.join(root, "partials", `${name}.html`), "utf8");
  });
}

function fileFor(urlPath) {
  if (urlPath === "/fixture.css") return "fixture.css";
  if (urlPath === "/page.js") return "page.js";
  if (urlPath.startsWith("/media/")) {
    const base = path.basename(urlPath);
    if (!/^[\w.-]+$/.test(base)) return null;
    return path.join("media", base);
  }
  if (urlPath.includes("/status/")) return "detail.html";
  return "home.html";
}

export function startFixtureServer(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    const rel = fileFor(url.pathname);
    if (!rel) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const full = path.join(root, rel);
    if (!full.startsWith(root)) {
      res.writeHead(403);
      res.end("no");
      return;
    }
    fs.readFile(full, (error, buf) => {
      if (error) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const body = rel.endsWith(".html") ? Buffer.from(includePartials(buf.toString("utf8"))) : buf;
      const ext = path.extname(rel);
      res.writeHead(200, { "content-type": TYPES[ext] || "text/plain", "cache-control": "no-store" });
      res.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

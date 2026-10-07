import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".md": "text/plain; charset=utf-8", ".json": "application/json" };
const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname.startsWith("/valencia-walking-tour/")) pathname = pathname.slice("/valencia-walking-tour".length);
    if (pathname === "/") pathname = "/index.html";
    if (pathname.split("/").some((part) => part.startsWith(".")) || !types[extname(pathname)]) { response.writeHead(404); response.end("Not found"); return; }
    const file = resolve(root, `.${pathname}`);
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) { response.writeHead(404); response.end("Not found"); return; }
    response.writeHead(200, { "Content-Type": types[extname(file)], "Cache-Control": "no-store" });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end("Not found"); }
});
server.listen(port, "127.0.0.1", () => console.log(`València a pie: http://127.0.0.1:${port}/ (subpath preview: /valencia-walking-tour/)`));
process.on("SIGTERM", () => server.close());

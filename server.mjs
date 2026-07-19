import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4174);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function resolvePath(url) {
  const pathname = new URL(url, `http://localhost:${port}`).pathname;
  const file = pathname === "/" ? "index.html" : pathname.slice(1);
  const resolved = normalize(join(root, file));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

createServer(async (req, res) => {
  const file = resolvePath(req.url || "/");
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`Blue ver2 running at http://localhost:${port}`);
});

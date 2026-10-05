import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};

/** Piccolo server statico (come Netlify: file reali, altrimenti l'app) per simulare nuovi deploy. */
export async function serveDir(dir: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    let file = path.join(dir, pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) {
      file = path.join(dir, 'index.html');
    }
    res.setHeader('content-type', TYPES[path.extname(file)] ?? 'application/octet-stream');
    res.setHeader('cache-control', 'no-cache');
    createReadStream(file).pipe(res);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

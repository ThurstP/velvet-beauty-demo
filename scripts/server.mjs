import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

export const securityPolicy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'";
const types = new Map([['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8']]);

export function createStaticServer(directory) {
  const root = resolve(directory);
  return createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', securityPolicy);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }); res.end('Método no permitido'); return;
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end('Ruta inválida'); return; }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const type = types.get(extname(file));
    if (!file.startsWith(root + sep) || !type || pathname.includes('\0')) {
      res.writeHead(404); res.end('No encontrado'); return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': type });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404); res.end('No encontrado');
    }
  });
}

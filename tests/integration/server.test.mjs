import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createStaticServer, securityPolicy } from '../../scripts/server.mjs';

describe('local static server integration', () => {
  let temporaryDirectory;
  let server;
  let port;
  const html = '<!doctype html><html lang="es"><title>Velvet test</title><p>Simulación</p></html>';
  const javascript = 'console.log("academic fixture");';
  const css = 'body { color: #202024; }';
  const outsideContent = 'THIS_FILE_MUST_NOT_BE_SERVED';

  before(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'velvet-server-test-'));
    const directory = join(temporaryDirectory, 'public');
    await mkdir(directory);
    await Promise.all([
      writeFile(join(directory, 'index.html'), html),
      writeFile(join(directory, 'main.js'), javascript),
      writeFile(join(directory, 'styles.css'), css),
      writeFile(join(directory, 'private.json'), '{"private":true}'),
      writeFile(join(temporaryDirectory, 'outside.js'), outsideContent),
    ]);
    server = createStaticServer(directory);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
    port = server.address().port;
  });

  after(async () => {
    if (server?.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  });

  function send(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const outgoing = request({ hostname: '127.0.0.1', port, path, method, agent: false }, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => resolve({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        }));
      });
      outgoing.on('error', reject);
      outgoing.setTimeout(5000, () => outgoing.destroy(new Error('Local test request timed out')));
      outgoing.end();
    });
  }

  test('GET root and explicit index serve the expected HTML', async () => {
    for (const path of ['/', '/index.html']) {
      const response = await send(path);
      assert.equal(response.status, 200);
      assert.equal(response.body, html);
      assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
    }
  });

  test('GET JavaScript and CSS returns the correct content and media type', async () => {
    for (const [path, body, type] of [
      ['/main.js', javascript, 'text/javascript; charset=utf-8'],
      ['/styles.css', css, 'text/css; charset=utf-8'],
    ]) {
      const response = await send(path);
      assert.equal(response.status, 200);
      assert.equal(response.body, body);
      assert.equal(response.headers['content-type'], type);
    }
  });

  test('HEAD returns the same success metadata without a response body', async () => {
    for (const path of ['/', '/main.js', '/styles.css']) {
      const get = await send(path);
      const head = await send(path, 'HEAD');
      assert.equal(head.status, 200);
      assert.equal(head.headers['content-type'], get.headers['content-type']);
      assert.equal(head.body, '');
    }
  });

  test('unknown files and existing disallowed file types return 404', async () => {
    for (const path of ['/missing.js', '/private.json']) {
      const response = await send(path);
      assert.equal(response.status, 404);
      assert.equal(response.body, 'No encontrado');
    }
  });

  test('POST is rejected with 405 and an explicit Allow header', async () => {
    const response = await send('/index.html', 'POST');
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, 'GET, HEAD');
  });

  test('malformed percent encoding produces 400 instead of crashing the server', async () => {
    for (const path of ['/bad%zz.js', '/bad%.js', '/bad%E0%A4%A.js']) {
      const response = await send(path);
      assert.equal(response.status, 400);
      assert.equal(response.body, 'Ruta inválida');
    }
    assert.equal((await send('/')).status, 200);
  });

  test('encoded traversal attempts cannot expose a file outside the served root', async () => {
    for (const path of [
      '/%2e%2e%2foutside.js',
      '/..%2foutside.js',
      '/%2E%2E%2Foutside.js',
      '/%2e%2e%2f%2e%2e%2foutside.js',
    ]) {
      const response = await send(path);
      assert.equal(response.status, 404, path);
      assert.ok(!response.body.includes(outsideContent), path);
    }
  });

  test('null-byte paths are rejected without exposing content', async () => {
    const response = await send('/main.js%00.html');
    assert.equal(response.status, 404);
    assert.ok(!response.body.includes(javascript));
  });

  test('security headers are present on successful and rejected requests', async () => {
    for (const [path, method] of [['/', 'GET'], ['/missing.js', 'GET'], ['/bad%.js', 'GET'], ['/', 'POST'], ['/', 'HEAD']]) {
      const response = await send(path, method);
      assert.equal(response.headers['content-security-policy'], securityPolicy);
      assert.match(response.headers['content-security-policy'], /connect-src 'none'/);
      assert.match(response.headers['content-security-policy'], /object-src 'none'/);
      assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
      assert.equal(response.headers['x-content-type-options'], 'nosniff');
      assert.equal(response.headers['referrer-policy'], 'no-referrer');
      assert.equal(response.headers['cache-control'], 'no-store');
    }
  });
});

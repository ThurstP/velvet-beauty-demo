import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createStaticServer } from '../../scripts/server.mjs';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const screenshots = fileURLToPath(new URL('../../test-results/', import.meta.url));
let browser;
let server;
let baseURL;

before(async () => {
  await access(new URL('../../dist/index.html', import.meta.url));
  server = createStaticServer(dist);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseURL = `http://127.0.0.1:${address.port}`;

  const configured = process.env.CHROME_EXECUTABLE_PATH;
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let executablePath = configured;
  if (!executablePath) {
    try { await access(macChrome); executablePath = macChrome; }
    catch { /* Use an existing Chrome installation through Playwright's channel. */ }
  }
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : { channel: 'chrome' }) });
  await mkdir(screenshots, { recursive: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function withPage(fn, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  try {
    await page.goto(baseURL);
    await page.getByRole('heading', { name: 'Maquillaje', exact: true }).waitFor();
    await fn(page);
  } finally {
    await context.close();
  }
}

async function openBase(page) {
  await page.getByRole('button', { name: 'Ver base ligera', exact: true }).click();
  await page.getByRole('heading', { name: 'Base ligera', exact: true }).waitFor();
}

async function addBase(page) {
  await openBase(page);
  await page.getByRole('radio', { name: 'Medio', exact: true }).check();
  await page.getByRole('button', { name: 'Agregar 1 unidad al carrito', exact: true }).click();
  await page.getByRole('status').filter({ hasText: /Agregado: Base ligera, tono Medio, 1 unidad/ }).waitFor();
}

test('catálogo: muestra tres productos y el aviso de simulación', async () => {
  await withPage(async page => {
    assert.equal(await page.locator('main article').count(), 3);
    assert.match(await page.locator('.simulation-banner').textContent(), /SIMULACIÓN ACADÉMICA/);
    assert.match(await page.locator('.simulation-banner').textContent(), /Sin compras reales/);
    assert.equal(await page.getByRole('button', { name: 'Ver base ligera', exact: true }).count(), 1);
  });
});

test('carrito vacío: informa el estado sin inventar productos', async () => {
  await withPage(async page => {
    await page.getByRole('button', { name: 'Carrito (0)', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Tu carrito está vacío', exact: true }).isVisible(), true);
    assert.equal(await page.locator('main article').count(), 0);
    await page.getByRole('button', { name: 'Ver catálogo', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Maquillaje', exact: true }).isVisible(), true);
  });
});

test('detalle: no preselecciona tono y mantiene deshabilitado el agregado', async () => {
  await withPage(async page => {
    await openBase(page);
    assert.equal(await page.getByRole('radio').count(), 3);
    assert.equal(await page.locator('input[name="tone"]:checked').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Agregar 1 unidad al carrito', exact: true }).isDisabled(), true);
    assert.match(await page.locator('#tone-help').textContent(), /Selecciona un tono disponible/);
    assert.equal(await page.locator('#screen-title').evaluate(el => document.activeElement === el), true);
  });
});

test('agotado: el tono se identifica con texto y no admite selección', async () => {
  await withPage(async page => {
    await openBase(page);
    const exhausted = page.getByRole('radio', { name: /Profundo.*Agotado/ });
    assert.equal(await exhausted.isDisabled(), true);
    assert.equal(await exhausted.isChecked(), false);
    assert.equal(await page.getByRole('button', { name: 'Agregar 1 unidad al carrito', exact: true }).isDisabled(), true);
  });
});

test('compra de prueba: tono, una unidad, precio y subtotal coinciden', async () => {
  await withPage(async page => {
    await addBase(page);
    assert.equal(await page.getByRole('heading', { name: 'Base ligera', exact: true }).isVisible(), true, 'agregar no cambia automáticamente de pantalla');
    await page.getByRole('button', { name: 'Ver carrito', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Tu selección', exact: true }).isVisible(), true);
    assert.equal(await page.getByText('Tono: Medio', { exact: true }).isVisible(), true);
    assert.equal(await page.getByText('Cantidad: 1', { exact: true }).isVisible(), true);
    assert.match(await page.locator('.cart-summary').textContent(), /48\.000 COP/);
    assert.match(await page.locator('.cart-item').textContent(), /48\.000 COP/);
    assert.equal(await page.getByRole('button', { name: /Pagar|Finalizar compra/i }).count(), 0);
  });
});

test('éxito: conserva el foco en agregar y evita repetir la operación', async () => {
  await withPage(async page => {
    await addBase(page);
    const add = page.getByRole('button', { name: 'Agregar 1 unidad al carrito', exact: true });
    assert.equal(await add.evaluate(el => document.activeElement === el), true);
    assert.equal(await add.getAttribute('aria-disabled'), 'true');
    await add.evaluate(el => el.click());
    assert.equal(await page.getByRole('button', { name: 'Carrito (1)', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Ver carrito', exact: true }).click();
    assert.equal(await page.locator('main article').count(), 1);
    assert.equal(await page.getByText('Cantidad: 1', { exact: true }).isVisible(), true);
  });
});

test('sesión temporal: recargar vacía el carrito', async () => {
  await withPage(async page => {
    await addBase(page);
    await page.reload();
    await page.getByRole('heading', { name: 'Maquillaje', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Carrito (0)', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Tu carrito está vacío', exact: true }).isVisible(), true);
  });
});

test('límite de demo: otro producto no reemplaza la selección previa', async () => {
  await withPage(async page => {
    await addBase(page);
    await page.getByRole('button', { name: '← Volver al catálogo', exact: true }).click();
    await page.getByRole('button', { name: 'Ver rubor compacto', exact: true }).click();
    await page.getByRole('radio', { name: 'Durazno', exact: true }).check();
    const add = page.getByRole('button', { name: 'Agregar 1 unidad al carrito', exact: true });
    assert.equal(await add.getAttribute('aria-disabled'), 'true');
    await add.evaluate(el => el.click());
    await page.getByRole('button', { name: 'Ver carrito', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Base ligera', exact: true }).isVisible(), true);
    assert.equal(await page.getByText('Tono: Medio', { exact: true }).isVisible(), true);
  });
});

test('teclado: radios, flechas y Enter permiten completar la selección', async () => {
  await withPage(async page => {
    await openBase(page);
    const claro = page.getByRole('radio', { name: 'Claro', exact: true });
    await claro.focus();
    await page.keyboard.press('Space');
    assert.equal(await page.getByRole('radio', { name: 'Claro', exact: true }).isChecked(), true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('radio', { name: 'Medio', exact: true }).isChecked(), true);
    assert.equal(await page.getByRole('radio', { name: 'Medio', exact: true }).evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: 'Agregar 1 unidad al carrito', exact: true }).evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Enter');
    assert.match(await page.getByRole('status').textContent(), /tono Medio/);
  });
});

test('responsive: catálogo, detalle y carrito sin desbordamiento a 320, 360, 768 y 1280 px', async () => {
  await withPage(async page => {
    async function noOverflow(label) {
      const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, width: document.documentElement.scrollWidth }));
      assert.ok(dimensions.width <= dimensions.viewport, `${label}: ancho ${dimensions.width} > ${dimensions.viewport}`);
    }
    for (const width of [320, 360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(baseURL);
      await page.getByRole('heading', { name: 'Maquillaje', exact: true }).waitFor();
      await noOverflow(`catálogo ${width}`);
      await openBase(page);
      await noOverflow(`detalle ${width}`);
      if (width === 360 || width === 1280) {
        await page.screenshot({ path: `${screenshots}/${width === 360 ? 'mobile' : 'desktop'}.png`, fullPage: true });
      }
      await page.getByRole('radio', { name: 'Medio', exact: true }).check();
      await page.getByRole('button', { name: 'Agregar 1 unidad al carrito', exact: true }).click();
      await page.getByRole('button', { name: 'Ver carrito', exact: true }).click();
      await noOverflow(`carrito ${width}`);
    }
  });
});

test('seguridad: CSP activa, sin solicitudes a terceros ni errores de consola o ejecución', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (new URL(request.url()).origin !== baseURL) externalRequests.push(request.url()); });
  try {
    const response = await page.goto(baseURL);
    assert.ok(response);
    const policy = response.headers()['content-security-policy'];
    assert.match(policy, /script-src 'self'/);
    assert.match(policy, /connect-src 'none'/);
    assert.match(policy, /object-src 'none'/);
    await page.getByRole('heading', { name: 'Maquillaje', exact: true }).waitFor();
    await addBase(page);
    await page.getByRole('button', { name: 'Ver carrito', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    assert.deepEqual(externalRequests, []);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('contingencia: error de fuente, reintento y catálogo vacío sin controles de depuración', async () => {
  await withPage(async page => {
    await page.evaluate(async () => {
      const [{ AppController }, { mountApp }] = await Promise.all([
        import('/app/controller.js'),
        import('/ui/app.js'),
      ]);
      const root = document.createElement('div');
      document.body.replaceChildren(root);
      let calls = 0;
      const controller = new AppController({
        loadProducts: async () => {
          if (++calls === 1) throw new Error('detalle-interno-no-publicable');
          return [];
        },
      });
      mountApp(root, controller);
      await controller.loadCatalog();
    });
    assert.equal(await page.getByRole('heading', { name: 'No pudimos mostrar el catálogo', exact: true }).isVisible(), true);
    assert.match(await page.getByRole('alert').textContent(), /No pudimos cargar/);
    assert.doesNotMatch(await page.locator('body').textContent(), /detalle-interno/);
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await page.getByRole('heading', { name: 'No hay productos disponibles', exact: true }).waitFor();
    assert.equal(await page.locator('main article').count(), 0);
    assert.equal(await page.getByRole('alert', { includeHidden: true }).textContent(), '');
  });
});

test('seguridad de contenido: nombres con HTML se muestran como texto, sin crear elementos ejecutables', async () => {
  await withPage(async page => {
    const maliciousName = '<img src=x onerror="window.__velvetXss=true">';
    await page.evaluate(async name => {
      const [{ AppController }, { mountApp }, { sampleProducts }] = await Promise.all([
        import('/app/controller.js'),
        import('/ui/app.js'),
        import('/data/products.js'),
      ]);
      const root = document.createElement('div');
      document.body.replaceChildren(root);
      const products = structuredClone(sampleProducts);
      products[0].name = name;
      window.__velvetXss = false;
      const controller = new AppController({ loadProducts: async () => products });
      mountApp(root, controller);
      await controller.loadCatalog();
    }, maliciousName);
    assert.equal(await page.getByRole('heading', { name: maliciousName, exact: true }).isVisible(), true);
    assert.equal(await page.locator('main img, main script').count(), 0);
    assert.equal(await page.evaluate(() => window.__velvetXss), false);
  });
});

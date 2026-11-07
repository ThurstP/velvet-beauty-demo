import test from 'node:test';
import assert from 'node:assert/strict';
import { AppController } from '../../src/app/controller.ts';
import { addToCart } from '../../src/domain/cart.ts';
import { sampleProducts } from '../../src/data/products.ts';

async function ready(services = {}) {
  const controller = new AppController({
    loadProducts: async () => structuredClone(sampleProducts),
    ...services,
  });
  await controller.loadCatalog();
  return controller;
}

test('los identificadores aceptados se guardan canónicos y coinciden con la interfaz', async () => {
  const controller = await ready();
  controller.showProduct(' base-ligera ');
  controller.selectVariant(' medio ');
  assert.equal(controller.getSnapshot().screen.productId, 'base-ligera');
  assert.equal(controller.getSnapshot().selectedVariantId, 'medio');
  controller.addSelected();
  assert.equal(controller.getSnapshot().cart.item.variantId, 'medio');
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test('carga la fuente, valida el catálogo y notifica un estado listo', async () => {
  const pending = deferred();
  const controller = new AppController({ loadProducts: () => pending.promise });
  const observed = [];
  controller.subscribe(state => observed.push(state.status));

  const loading = controller.loadCatalog();
  assert.equal(controller.getSnapshot().status, 'loading');
  pending.resolve(structuredClone(sampleProducts));
  await loading;

  const state = controller.getSnapshot();
  assert.equal(state.status, 'ready');
  assert.equal(state.catalog.length, 3);
  assert.equal(state.error, '');
  assert.equal(state.cart.item, null);
  assert.deepEqual(observed, ['loading', 'loading', 'ready']);
});

test('un catálogo vacío es un resultado válido, no un error de carga', async () => {
  const controller = await ready({ loadProducts: async () => [] });
  const state = controller.getSnapshot();
  assert.equal(state.status, 'ready');
  assert.deepEqual(state.catalog, []);
  assert.equal(state.error, '');
  assert.match(state.message, /No hay productos disponibles/);
});

test('rechaza datos de catálogo inválidos sin publicar datos parciales', async () => {
  const invalid = structuredClone(sampleProducts);
  invalid[1].priceCop = -1;
  const controller = await ready({ loadProducts: async () => invalid });
  const state = controller.getSnapshot();
  assert.equal(state.status, 'error');
  assert.deepEqual(state.catalog, []);
  assert.match(state.error, /No pudimos cargar/);
  assert.equal(state.message, '');
});

test('un fallo de fuente permite reintentar y no expone detalles internos', async () => {
  let attempts = 0;
  const controller = new AppController({
    loadProducts: async () => {
      if (++attempts === 1) throw new Error('credencial-interna-no-publicable');
      return structuredClone(sampleProducts);
    },
  });

  await controller.loadCatalog();
  assert.equal(controller.getSnapshot().status, 'error');
  assert.doesNotMatch(controller.getSnapshot().error, /credencial/);

  await controller.loadCatalog();
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().error, '');
  assert.equal(controller.getSnapshot().catalog.length, 3);
});

test('abrir productos no preselecciona tono y cambiar producto reinicia la elección', async () => {
  const controller = await ready();
  controller.showProduct('base-ligera');
  assert.deepEqual(controller.getSnapshot().screen, { kind: 'detail', productId: 'base-ligera' });
  assert.equal(controller.getSnapshot().selectedVariantId, null);

  controller.selectVariant('medio');
  assert.equal(controller.getSnapshot().selectedVariantId, 'medio');
  controller.showProduct('labial-cremoso');
  assert.deepEqual(controller.getSnapshot().screen, { kind: 'detail', productId: 'labial-cremoso' });
  assert.equal(controller.getSnapshot().selectedVariantId, null);
});

test('un identificador de producto inexistente no abre un detalle inválido', async () => {
  const controller = await ready();
  controller.showProduct('producto-inexistente');
  assert.deepEqual(controller.getSnapshot().screen, { kind: 'catalog' });
  assert.match(controller.getSnapshot().error, /no está disponible/);
  assert.equal(controller.getSnapshot().cart.item, null);
});

test('agregar sin seleccionar tono conserva el carrito vacío e informa cómo continuar', async () => {
  const controller = await ready();
  controller.showProduct('base-ligera');
  controller.addSelected();
  assert.equal(controller.getSnapshot().cart.item, null);
  assert.equal(controller.getSnapshot().selectedVariantId, null);
  assert.match(controller.getSnapshot().error, /Selecciona un tono/);
});

test('el controlador rechaza un tono agotado aunque se intente omitir la interfaz', async () => {
  const controller = await ready();
  controller.showProduct('base-ligera');
  controller.selectVariant('profundo');
  assert.equal(controller.getSnapshot().selectedVariantId, null);
  assert.match(controller.getSnapshot().error, /agotado/);
  controller.addSelected();
  assert.equal(controller.getSnapshot().cart.item, null);
});

test('un tono inexistente no borra una elección válida previa', async () => {
  const controller = await ready();
  controller.showProduct('base-ligera');
  controller.selectVariant('claro');
  controller.selectVariant('tono-inexistente');
  assert.equal(controller.getSnapshot().selectedVariantId, 'claro');
  assert.match(controller.getSnapshot().error, /No encontramos ese tono/);
  assert.equal(controller.getSnapshot().cart.item, null);
});

test('una selección válida conserva producto, tono, cantidad y precio del catálogo', async () => {
  const controller = await ready();
  controller.showProduct('base-ligera');
  controller.selectVariant('medio');
  controller.addSelected();
  const state = controller.getSnapshot();

  assert.deepEqual(state.cart.item, {
    productId: 'base-ligera',
    variantId: 'medio',
    productName: 'Base ligera',
    variantName: 'Medio',
    unitPriceCop: 48000,
    quantity: 1,
  });
  assert.equal(state.screen.kind, 'detail', 'el agregado no cambia de pantalla automáticamente');
  assert.equal(state.error, '');
  assert.match(state.message, /Base ligera, tono Medio, 1 unidad/);
});

test('abrir el carrito muestra la selección sin alterarla', async () => {
  const controller = await ready();
  controller.showProduct('labial-cremoso');
  controller.selectVariant('terracota');
  controller.addSelected();
  const item = controller.getSnapshot().cart.item;
  controller.showCart();
  assert.deepEqual(controller.getSnapshot().screen, { kind: 'cart' });
  assert.equal(controller.getSnapshot().cart.item, item);
});

test('abrir el carrito vacío no fabrica artículos', async () => {
  const controller = await ready();
  controller.showCart();
  assert.equal(controller.getSnapshot().screen.kind, 'cart');
  assert.equal(controller.getSnapshot().cart.item, null);
});

test('repetir un agregado idéntico no duplica la selección', async () => {
  const controller = await ready();
  controller.showProduct('base-ligera');
  controller.selectVariant('claro');
  controller.addSelected();
  const cart = controller.getSnapshot().cart;
  controller.addSelected();
  assert.equal(controller.getSnapshot().cart, cart);
  assert.equal(controller.getSnapshot().cart.item.quantity, 1);
  assert.equal(controller.getSnapshot().error, '');
});

test('otra variante no reemplaza silenciosamente la selección de la demo', async () => {
  const controller = await ready();
  controller.showProduct('base-ligera');
  controller.selectVariant('claro');
  controller.addSelected();
  const originalCart = controller.getSnapshot().cart;

  controller.showProduct('rubor-compacto');
  controller.selectVariant('durazno');
  controller.addSelected();
  assert.equal(controller.getSnapshot().cart, originalCart);
  assert.equal(controller.getSnapshot().cart.item.productId, 'base-ligera');
  assert.equal(controller.getSnapshot().selectedVariantId, 'durazno');
  assert.match(controller.getSnapshot().error, /sola selección/);
});

test('fallo de agregado conserva tono y permite un reintento exitoso', async () => {
  let calls = 0;
  const controller = await ready({
    addSelection: (...args) => {
      if (++calls === 1) throw new Error('detalle-interno-de-error');
      return addToCart(...args);
    },
  });
  controller.showProduct('base-ligera');
  controller.selectVariant('medio');
  controller.addSelected();
  assert.equal(controller.getSnapshot().selectedVariantId, 'medio');
  assert.equal(controller.getSnapshot().cart.item, null);
  assert.match(controller.getSnapshot().error, /Conservamos tu selección/);
  assert.doesNotMatch(controller.getSnapshot().error, /detalle-interno/);

  controller.addSelected();
  assert.equal(controller.getSnapshot().cart.item.variantId, 'medio');
  assert.equal(controller.getSnapshot().error, '');
  assert.match(controller.getSnapshot().message, /Agregado/);
});

test('una carga antigua exitosa no reemplaza el resultado de la carga más reciente', async () => {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  const controller = new AppController({ loadProducts: () => ++calls === 1 ? first.promise : second.promise });
  const older = controller.loadCatalog();
  const newer = controller.loadCatalog();
  second.resolve([structuredClone(sampleProducts)[1]]);
  await newer;
  first.resolve(structuredClone(sampleProducts));
  await older;
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().catalog.length, 1);
  assert.equal(controller.getSnapshot().catalog[0].id, 'labial-cremoso');
});

test('un error tardío de una carga antigua no invalida un catálogo más reciente', async () => {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  const controller = new AppController({ loadProducts: () => ++calls === 1 ? first.promise : second.promise });
  const older = controller.loadCatalog();
  const newer = controller.loadCatalog();
  second.resolve(structuredClone(sampleProducts));
  await newer;
  first.reject(new Error('error de carga antigua'));
  await older;
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().catalog.length, 3);
  assert.equal(controller.getSnapshot().error, '');
});

test('cancelar la suscripción evita notificaciones posteriores', async () => {
  const controller = await ready();
  let notifications = 0;
  const unsubscribe = controller.subscribe(() => { notifications += 1; });
  assert.equal(notifications, 1);
  controller.showCart();
  assert.equal(notifications, 2);
  unsubscribe();
  controller.showCatalog();
  await controller.loadCatalog();
  assert.equal(notifications, 2);
});

test('acciones de selección fuera del detalle no alteran el carrito ni la pantalla', async () => {
  const controller = await ready();
  const before = controller.getSnapshot();
  controller.selectVariant('claro');
  controller.addSelected();
  assert.equal(controller.getSnapshot(), before);
});

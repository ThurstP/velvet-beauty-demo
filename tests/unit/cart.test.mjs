import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog } from '../../src/domain/catalog.ts';
import { addToCart, emptyCart, subtotalCop } from '../../src/domain/cart.ts';
import { DomainError } from '../../src/domain/errors.ts';
import { sampleProducts } from '../../src/data/products.ts';

const catalog = validateCatalog(sampleProducts);
const selection = { productId: 'base-ligera', variantId: 'claro', quantity: 1 };
const code = (expected) => (error) => error instanceof DomainError && error.code === expected;

test('a new cart has no item and no subtotal', () => {
  const cart = emptyCart();
  assert.equal(cart.item, null);
  assert.equal(subtotalCop(cart), 0);
  assert.ok(Object.isFrozen(cart));
});

test('adds exactly the selected product and tone at the catalog price', () => {
  const initial = emptyCart();
  const cart = addToCart(catalog, initial, { ...selection, variantId: 'medio', unitPriceCop: 1 });
  assert.deepEqual(cart.item, {
    productId: 'base-ligera', variantId: 'medio',
    productName: 'Base ligera', variantName: 'Medio', unitPriceCop: 48000, quantity: 1,
  });
  assert.equal(subtotalCop(cart), 48000);
  assert.equal(initial.item, null);
  assert.ok(Object.isFrozen(cart));
  assert.ok(Object.isFrozen(cart.item));
});

test('rejects every quantity other than the number one', () => {
  for (const quantity of [0, -1, 2, 1.5, '1', null, undefined, NaN, Infinity]) {
    assert.throws(() => addToCart(catalog, emptyCart(), { ...selection, quantity }), code('INVALID_QUANTITY'));
  }
});

test('rejects invalid cart input instead of throwing an uncontrolled exception', () => {
  assert.throws(() => addToCart(catalog, emptyCart(), null), code('INVALID_CART_INPUT'));
});

test('rejects missing products and variants belonging to a different product', () => {
  assert.throws(() => addToCart(catalog, emptyCart(), { ...selection, productId: 'missing' }), code('PRODUCT_NOT_FOUND'));
  assert.throws(() => addToCart(catalog, emptyCart(), { ...selection, variantId: 'terracota' }), code('VARIANT_NOT_FOUND'));
  assert.throws(() => addToCart(catalog, emptyCart(), { ...selection, variantId: '' }), code('INVALID_CATALOG_TEXT'));
});

test('unavailable tones cannot be added even when UI restrictions are bypassed', () => {
  const cart = emptyCart();
  assert.throws(() => addToCart(catalog, cart, { ...selection, variantId: 'profundo' }), code('OUT_OF_STOCK'));
  assert.equal(cart.item, null);
});

test('repeating an identical addition is idempotent and does not multiply quantity', () => {
  const cart = addToCart(catalog, emptyCart(), selection);
  const repeated = addToCart(catalog, cart, selection);
  assert.strictEqual(repeated, cart);
  assert.equal(repeated.item.quantity, 1);
  assert.equal(subtotalCop(repeated), 48000);
});

test('a different tone cannot silently replace an existing demo selection', () => {
  const cart = addToCart(catalog, emptyCart(), selection);
  assert.throws(() => addToCart(catalog, cart, { ...selection, variantId: 'medio' }), code('DEMO_CART_LIMIT'));
  assert.equal(cart.item.variantId, 'claro');
  assert.equal(subtotalCop(cart), 48000);
});

test('a different product cannot silently replace the existing demo selection', () => {
  const cart = addToCart(catalog, emptyCart(), selection);
  assert.throws(() => addToCart(catalog, cart, {
    productId: 'labial-cremoso', variantId: 'rosa', quantity: 1,
  }), code('DEMO_CART_LIMIT'));
  assert.equal(cart.item.productId, 'base-ligera');
});

test('cart state cannot be mutated after a successful addition', () => {
  const cart = addToCart(catalog, emptyCart(), selection);
  assert.throws(() => { cart.item.variantId = 'medio'; }, TypeError);
  assert.throws(() => { cart.item.unitPriceCop = 1; }, TypeError);
  assert.throws(() => { cart.item = null; }, TypeError);
});

test('adding to the local prototype does not mutate the catalog or consume real stock', () => {
  const before = catalog[0].variants[0].stock;
  addToCart(catalog, emptyCart(), selection);
  assert.equal(catalog[0].variants[0].stock, before);
});

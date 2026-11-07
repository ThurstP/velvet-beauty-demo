import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, findProduct, findVariant } from '../../src/domain/catalog.ts';
import { DomainError } from '../../src/domain/errors.ts';
import { sampleProducts } from '../../src/data/products.ts';

const fixture = () => structuredClone(sampleProducts);
const code = (expected) => (error) => error instanceof DomainError && error.code === expected;

test('academic catalog has three products and one unavailable tone per product', () => {
  const catalog = validateCatalog(sampleProducts);
  assert.deepEqual(catalog.map((product) => product.priceCop), [48000, 28000, 35000]);
  for (const product of catalog) {
    assert.equal(product.variants.filter((variant) => variant.stock > 0).length, 2);
    assert.equal(product.variants.filter((variant) => variant.stock === 0).length, 1);
  }
});

test('an empty catalog and a product without variants can represent empty states', () => {
  assert.deepEqual(validateCatalog([]), []);
  const input = fixture();
  input[0].variants = [];
  assert.deepEqual(validateCatalog(input)[0].variants, []);
});

test('catalog validation copies data and freezes all returned nested structures', () => {
  const input = fixture();
  const catalog = validateCatalog(input);
  input[0].name = 'Changed outside the domain';
  input[0].variants[0].stock = 999;
  assert.equal(catalog[0].name, 'Base ligera');
  assert.equal(catalog[0].variants[0].stock, 8);
  assert.ok(Object.isFrozen(catalog));
  assert.ok(Object.isFrozen(catalog[0]));
  assert.ok(Object.isFrozen(catalog[0].variants));
  assert.ok(Object.isFrozen(catalog[0].variants[0]));
  assert.throws(() => { catalog[0].priceCop = 1; }, TypeError);
  assert.throws(() => { catalog[0].variants[0].stock = 99; }, TypeError);
});

test('rejects non-array catalogs and malformed products', () => {
  for (const value of [null, undefined, {}, 'catalog', 2]) {
    assert.throws(() => validateCatalog(value), code('INVALID_CATALOG'));
  }
  for (const value of [null, [], 2]) {
    assert.throws(() => validateCatalog([value]), code('INVALID_CATALOG_DATA'));
  }
});

test('rejects blank or non-string required product fields', () => {
  for (const field of ['id', 'name', 'brand', 'description', 'provenance']) {
    for (const value of ['', '  ', null, 123]) {
      const input = fixture();
      input[0][field] = value;
      assert.throws(() => validateCatalog(input), code('INVALID_CATALOG_TEXT'), field);
    }
  }
});

test('rejects duplicate product IDs, including whitespace-only differences', () => {
  const input = fixture();
  input[1].id = ` ${input[0].id} `;
  assert.throws(() => validateCatalog(input), code('DUPLICATE_PRODUCT_ID'));
});

test('rejects duplicate tone IDs within a product but allows reuse across products', () => {
  assert.doesNotThrow(() => validateCatalog(fixture()));
  const input = fixture();
  input[0].variants[1].id = input[0].variants[0].id;
  assert.throws(() => validateCatalog(input), code('DUPLICATE_VARIANT_ID'));
});

test('rejects zero, fractional, unsafe and non-numeric COP prices', () => {
  for (const value of [0, -1, 12.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '48000']) {
    const input = fixture();
    input[0].priceCop = value;
    assert.throws(() => validateCatalog(input), code('INVALID_PRICE'));
  }
});

test('rejects invalid stock and accepts zero stock', () => {
  for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '8']) {
    const input = fixture();
    input[0].variants[0].stock = value;
    assert.throws(() => validateCatalog(input), code('INVALID_STOCK'));
  }
  const input = fixture();
  input[0].variants[0].stock = 0;
  assert.equal(validateCatalog(input)[0].variants[0].stock, 0);
});

test('rejects malformed variant collections and missing tone text', () => {
  for (const value of [null, {}, 'tones']) {
    const input = fixture();
    input[0].variants = value;
    assert.throws(() => validateCatalog(input), code('INVALID_VARIANTS'));
  }
  for (const field of ['id', 'name']) {
    const input = fixture();
    input[0].variants[0][field] = ' ';
    assert.throws(() => validateCatalog(input), code('INVALID_CATALOG_TEXT'));
  }
});

test('lookups return the requested product and only a tone belonging to it', () => {
  const catalog = validateCatalog(sampleProducts);
  const product = findProduct(catalog, 'base-ligera');
  assert.equal(product.name, 'Base ligera');
  assert.equal(findVariant(product, 'medio').name, 'Medio');
  assert.throws(() => findVariant(product, 'terracota'), code('VARIANT_NOT_FOUND'));
});

test('invalid and missing lookup identifiers produce domain errors', () => {
  const catalog = validateCatalog(sampleProducts);
  assert.throws(() => findProduct(catalog, 'missing'), code('PRODUCT_NOT_FOUND'));
  assert.throws(() => findProduct(catalog, ''), code('INVALID_CATALOG_TEXT'));
  assert.throws(() => findVariant(catalog[0], null), code('INVALID_CATALOG_TEXT'));
});

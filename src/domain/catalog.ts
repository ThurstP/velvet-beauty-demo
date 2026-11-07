import { DomainError } from './errors.ts';
import type { Catalog, Product, Variant } from './types.ts';

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DomainError('INVALID_CATALOG_DATA', `${label} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainError('INVALID_CATALOG_TEXT', `${label} debe contener texto.`);
  }
  return value.trim();
}

function stock(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DomainError('INVALID_STOCK', 'Las existencias deben ser un entero seguro no negativo.');
  }
  return value;
}

function price(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError('INVALID_PRICE', 'El precio debe ser un entero seguro positivo en COP.');
  }
  return value;
}

function variants(value: unknown): readonly Variant[] {
  if (!Array.isArray(value)) {
    throw new DomainError('INVALID_VARIANTS', 'Los tonos deben ser una lista.');
  }
  const ids = new Set<string>();
  const validated = value.map((raw: unknown): Variant => {
    const item = record(raw, 'Cada tono');
    const id = text(item['id'], 'El identificador del tono');
    if (ids.has(id)) {
      throw new DomainError('DUPLICATE_VARIANT_ID', 'Un producto no puede repetir identificadores de tono.');
    }
    ids.add(id);
    return Object.freeze({
      id,
      name: text(item['name'], 'El nombre del tono'),
      stock: stock(item['stock']),
    });
  });
  return Object.freeze(validated);
}

/** Validates and copies only supported fields; callers cannot mutate the result. */
export function validateCatalog(input: unknown): Catalog {
  if (!Array.isArray(input)) {
    throw new DomainError('INVALID_CATALOG', 'El catálogo debe ser una lista de productos.');
  }
  const ids = new Set<string>();
  const products = input.map((raw: unknown): Product => {
    const item = record(raw, 'Cada producto');
    const id = text(item['id'], 'El identificador del producto');
    if (ids.has(id)) {
      throw new DomainError('DUPLICATE_PRODUCT_ID', 'El catálogo no puede repetir identificadores de producto.');
    }
    ids.add(id);
    return Object.freeze({
      id,
      name: text(item['name'], 'El nombre del producto'),
      brand: text(item['brand'], 'La marca'),
      description: text(item['description'], 'La descripción'),
      priceCop: price(item['priceCop']),
      provenance: text(item['provenance'], 'La procedencia'),
      variants: variants(item['variants']),
    });
  });
  return Object.freeze(products);
}

export function findProduct(catalog: Catalog, id: string): Product {
  const normalizedId = text(id, 'El identificador del producto');
  const product = catalog.find((candidate) => candidate.id === normalizedId);
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'No encontramos ese producto en el catálogo.');
  }
  return product;
}

export function findVariant(product: Product, id: string): Variant {
  const normalizedId = text(id, 'El identificador del tono');
  const variant = product.variants.find((candidate) => candidate.id === normalizedId);
  if (!variant) {
    throw new DomainError('VARIANT_NOT_FOUND', 'No encontramos ese tono para el producto seleccionado.');
  }
  return variant;
}

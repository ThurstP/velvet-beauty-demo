import type { Catalog, CartState } from '../domain/types.ts';
import { validateCatalog, findProduct, findVariant } from '../domain/catalog.ts';
import { addToCart, emptyCart } from '../domain/cart.ts';
import { DomainError } from '../domain/errors.ts';

export type Screen = { readonly kind: 'catalog' } | { readonly kind: 'detail'; readonly productId: string } | { readonly kind: 'cart' };
export interface AppState {
  readonly status: 'loading' | 'ready' | 'error';
  readonly catalog: Catalog;
  readonly screen: Screen;
  readonly selectedVariantId: string | null;
  readonly cart: CartState;
  readonly message: string;
  readonly error: string;
}
export interface AppServices {
  readonly loadProducts: () => Promise<unknown>;
  readonly addSelection?: typeof addToCart;
}
type Listener = (state: AppState) => void;

/** Coordinates local UI and domain. No network, persistence or personal data. */
export class AppController {
  private state: AppState;
  private readonly services: AppServices;
  private readonly listeners = new Set<Listener>();
  private loadVersion = 0;

  constructor(services: AppServices) {
    this.services = services;
    this.state = Object.freeze<AppState>({ status: 'loading', catalog: Object.freeze([]), screen: { kind: 'catalog' }, selectedVariantId: null, cart: emptyCart(), message: '', error: '' });
  }

  getSnapshot(): AppState { return this.state; }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  private update(patch: Partial<AppState>): void {
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener(this.state);
  }

  async loadCatalog(): Promise<void> {
    const version = ++this.loadVersion;
    this.update({ status: 'loading', error: '', message: 'Cargando productos…' });
    try {
      const catalog = validateCatalog(await this.services.loadProducts());
      if (version !== this.loadVersion) return;
      this.update({ status: 'ready', catalog, message: catalog.length ? 'Catálogo disponible.' : 'No hay productos disponibles.', error: '' });
    } catch {
      if (version !== this.loadVersion) return;
      this.update({ status: 'error', message: '', error: 'No pudimos cargar los productos. Inténtalo de nuevo.' });
    }
  }

  showCatalog(): void {
    this.update({ screen: { kind: 'catalog' }, selectedVariantId: null, message: '', error: '' });
  }

  showProduct(productId: string): void {
    try {
      const product = findProduct(this.state.catalog, productId);
      this.update({ screen: { kind: 'detail', productId: product.id }, selectedVariantId: null, message: '', error: '' });
    } catch {
      this.update({ error: 'Este producto no está disponible.', message: '' });
    }
  }

  selectVariant(variantId: string): void {
    if (this.state.screen.kind !== 'detail') return;
    try {
      const product = findProduct(this.state.catalog, this.state.screen.productId);
      const variant = findVariant(product, variantId);
      if (variant.stock < 1) throw new DomainError('OUT_OF_STOCK', 'Este tono está agotado. Elige otro disponible.');
      this.update({ selectedVariantId: variant.id, message: '', error: '' });
    } catch (error) {
      this.update({ error: error instanceof DomainError ? error.message : 'No pudimos seleccionar el tono.', message: '' });
    }
  }

  addSelected(): void {
    if (this.state.screen.kind !== 'detail') return;
    if (!this.state.selectedVariantId) {
      this.update({ error: 'Selecciona un tono disponible antes de agregar.', message: '' });
      return;
    }
    try {
      const operation = this.services.addSelection ?? addToCart;
      const cart = operation(this.state.catalog, this.state.cart, { productId: this.state.screen.productId, variantId: this.state.selectedVariantId, quantity: 1 });
      const item = cart.item;
      this.update({ cart, error: '', message: item ? `Agregado: ${item.productName}, tono ${item.variantName}, 1 unidad.` : '' });
    } catch (error) {
      this.update({ error: error instanceof DomainError ? error.message : 'No se pudo agregar. Conservamos tu selección; inténtalo de nuevo.', message: '' });
    }
  }

  showCart(): void {
    this.update({ screen: { kind: 'cart' }, message: '', error: '' });
  }
}

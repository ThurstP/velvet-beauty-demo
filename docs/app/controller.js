import { validateCatalog, findProduct, findVariant } from "../domain/catalog.js";
import { addToCart, emptyCart } from "../domain/cart.js";
import { DomainError } from "../domain/errors.js";
/** Coordinates local UI and domain. No network, persistence or personal data. */
export class AppController {
    state;
    services;
    listeners = new Set();
    loadVersion = 0;
    constructor(services) {
        this.services = services;
        this.state = Object.freeze({ status: 'loading', catalog: Object.freeze([]), screen: { kind: 'catalog' }, selectedVariantId: null, cart: emptyCart(), message: '', error: '' });
    }
    getSnapshot() { return this.state; }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.state);
        return () => { this.listeners.delete(listener); };
    }
    update(patch) {
        this.state = Object.freeze({ ...this.state, ...patch });
        for (const listener of this.listeners)
            listener(this.state);
    }
    async loadCatalog() {
        const version = ++this.loadVersion;
        this.update({ status: 'loading', error: '', message: 'Cargando productos…' });
        try {
            const catalog = validateCatalog(await this.services.loadProducts());
            if (version !== this.loadVersion)
                return;
            this.update({ status: 'ready', catalog, message: catalog.length ? 'Catálogo disponible.' : 'No hay productos disponibles.', error: '' });
        }
        catch {
            if (version !== this.loadVersion)
                return;
            this.update({ status: 'error', message: '', error: 'No pudimos cargar los productos. Inténtalo de nuevo.' });
        }
    }
    showCatalog() {
        this.update({ screen: { kind: 'catalog' }, selectedVariantId: null, message: '', error: '' });
    }
    showProduct(productId) {
        try {
            const product = findProduct(this.state.catalog, productId);
            this.update({ screen: { kind: 'detail', productId: product.id }, selectedVariantId: null, message: '', error: '' });
        }
        catch {
            this.update({ error: 'Este producto no está disponible.', message: '' });
        }
    }
    selectVariant(variantId) {
        if (this.state.screen.kind !== 'detail')
            return;
        try {
            const product = findProduct(this.state.catalog, this.state.screen.productId);
            const variant = findVariant(product, variantId);
            if (variant.stock < 1)
                throw new DomainError('OUT_OF_STOCK', 'Este tono está agotado. Elige otro disponible.');
            this.update({ selectedVariantId: variant.id, message: '', error: '' });
        }
        catch (error) {
            this.update({ error: error instanceof DomainError ? error.message : 'No pudimos seleccionar el tono.', message: '' });
        }
    }
    addSelected() {
        if (this.state.screen.kind !== 'detail')
            return;
        if (!this.state.selectedVariantId) {
            this.update({ error: 'Selecciona un tono disponible antes de agregar.', message: '' });
            return;
        }
        try {
            const operation = this.services.addSelection ?? addToCart;
            const cart = operation(this.state.catalog, this.state.cart, { productId: this.state.screen.productId, variantId: this.state.selectedVariantId, quantity: 1 });
            const item = cart.item;
            this.update({ cart, error: '', message: item ? `Agregado: ${item.productName}, tono ${item.variantName}, 1 unidad.` : '' });
        }
        catch (error) {
            this.update({ error: error instanceof DomainError ? error.message : 'No se pudo agregar. Conservamos tu selección; inténtalo de nuevo.', message: '' });
        }
    }
    showCart() {
        this.update({ screen: { kind: 'cart' }, message: '', error: '' });
    }
}

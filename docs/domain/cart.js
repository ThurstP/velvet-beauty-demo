import { findProduct, findVariant } from "./catalog.js";
import { DomainError } from "./errors.js";
export function emptyCart() {
    return Object.freeze({ item: null });
}
/**
 * The prototype demonstrates a single selection. This is an explicit demo
 * boundary, not a commercial policy for the future Velvet store.
 */
export function addToCart(catalog, state, input) {
    if (typeof input !== 'object' || input === null) {
        throw new DomainError('INVALID_CART_INPUT', 'La selección del carrito no es válida.');
    }
    if (input.quantity !== 1) {
        throw new DomainError('INVALID_QUANTITY', 'Este prototipo permite agregar una unidad.');
    }
    const product = findProduct(catalog, input.productId);
    const variant = findVariant(product, input.variantId);
    if (variant.stock < 1) {
        throw new DomainError('OUT_OF_STOCK', 'Este tono está agotado. Elige otro tono disponible.');
    }
    if (state.item) {
        if (state.item.productId === product.id && state.item.variantId === variant.id) {
            return state;
        }
        throw new DomainError('DEMO_CART_LIMIT', 'La demo muestra una sola selección. Tu producto anterior se conserva en el carrito.');
    }
    const item = Object.freeze({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        unitPriceCop: product.priceCop,
        quantity: 1,
    });
    return Object.freeze({ item });
}
export function subtotalCop(state) {
    return state.item?.unitPriceCop ?? 0;
}

import type { AppState } from '../app/controller.ts';
import { findProduct } from '../domain/catalog.ts';
import { subtotalCop } from '../domain/cart.ts';
import { button, element, formatCop, productIllustration, statePanel } from './dom.ts';

function heading(text: string): HTMLHeadingElement {
  const node = element('h1', '', text);
  node.tabIndex = -1;
  node.id = 'screen-title';
  return node;
}

export function catalogScreen(state: AppState): DocumentFragment {
  const view = document.createDocumentFragment();
  const intro = element('div', 'page-intro');
  intro.append(element('p', 'eyebrow', 'ELIGE CON CONFIANZA'), heading('Maquillaje'), element('p', 'secondary', 'Explora, elige un tono y revisa tu selección.'));
  view.append(intro);
  if (!state.catalog.length) {
    view.append(statePanel('No hay productos disponibles', 'Vuelve a consultar más adelante.'));
    return view;
  }
  const list = element('ul', 'product-grid');
  for (const product of state.catalog) {
    const row = element('li');
    const card = element('article', 'product-card');
    const available = product.variants.some(variant => variant.stock > 0);
    const link = button(`Ver ${product.name.toLowerCase()}`, 'product', 'button button-secondary button-wide');
    link.dataset.productId = product.id;
    link.dataset.focusKey = `product-${product.id}`;
    card.append(productIllustration(product.name), element('p', 'eyebrow', product.brand), element('h2', 'product-title', product.name), element('p', 'price', formatCop(product.priceCop)), element('p', 'availability', available ? 'Tonos disponibles' : 'Sin tonos disponibles'), link);
    row.append(card);
    list.append(row);
  }
  view.append(list);
  return view;
}

export function detailScreen(state: AppState): DocumentFragment {
  const view = document.createDocumentFragment();
  if (state.screen.kind !== 'detail') return view;
  const product = findProduct(state.catalog, state.screen.productId);
  view.append(button('← Volver al catálogo', 'catalog', 'button button-text'));
  const layout = element('div', 'detail-grid');
  const info = element('section', 'detail-info');
  info.append(element('p', 'eyebrow', product.brand), heading(product.name), element('p', 'price detail-price', formatCop(product.priceCop)), element('p', '', product.description), element('p', 'secondary', `Procedencia: ${product.provenance}`));
  const available = product.variants.some(v => v.stock > 0);
  if (!available) {
    info.append(statePanel('No hay tonos disponibles', 'Puedes volver al catálogo para consultar otros productos.'));
  } else {
    const fieldset = element('fieldset', 'tone-fieldset');
    fieldset.append(element('legend', '', 'Elige un tono'));
    fieldset.setAttribute('aria-describedby', 'tone-help');
    const choices = element('div', 'tone-options');
    for (const variant of product.variants) {
      const label = element('label', 'tone-option');
      const input = element('input');
      input.type = 'radio';
      input.name = 'tone';
      input.value = variant.id;
      input.checked = state.selectedVariantId === variant.id;
      input.disabled = variant.stock < 1;
      input.dataset.focusKey = `tone-${variant.id}`;
      label.append(input, element('span', '', variant.name));
      if (variant.stock < 1) label.append(element('span', 'tone-stock', 'Agotado'));
      choices.append(label);
    }
    fieldset.append(choices);
    const selected = product.variants.find(v => v.id === state.selectedVariantId);
    const help = element('p', 'secondary tone-help', selected ? `Tono seleccionado: ${selected.name}.` : 'Selecciona un tono disponible para agregarlo.');
    help.id = 'tone-help';
    const add = button('Agregar 1 unidad al carrito', 'add', 'button button-primary button-wide');
    add.disabled = !selected;
    if (state.cart.item) add.setAttribute('aria-disabled', 'true');
    add.setAttribute('aria-describedby', 'tone-help demo-cart-limit');
    info.append(fieldset, help, element('p', 'secondary', 'El color en pantalla es orientativo.'), add);
    if (state.cart.item) info.append(button('Ver carrito', 'cart', 'button button-secondary button-wide'));
  }
  const limit = element('p', 'prototype-note', 'Este prototipo muestra una selección de una unidad por sesión; no permite acumular ni reemplazar artículos.');
  limit.id = 'demo-cart-limit';
  info.append(limit);
  layout.append(productIllustration(product.name, true), info);
  view.append(layout);
  return view;
}

export function cartScreen(state: AppState): DocumentFragment {
  const view = document.createDocumentFragment();
  view.append(button('← Volver al catálogo', 'catalog', 'button button-text'), heading('Tu selección'));
  const item = state.cart.item;
  if (!item) {
    const panel = statePanel('Tu carrito está vacío', 'Explora el catálogo para elegir un producto.');
    panel.append(button('Ver catálogo', 'catalog', 'button button-primary'));
    view.append(panel);
    return view;
  }
  const layout = element('div', 'cart-grid');
  const product = element('article', 'cart-item');
  const description = element('div', 'cart-description');
  description.append(element('h2', '', item.productName), element('p', '', `Tono: ${item.variantName}`), element('p', 'secondary', 'Cantidad: 1'), element('p', 'price', formatCop(item.unitPriceCop)));
  product.append(productIllustration(item.productName), description);
  const summary = element('section', 'cart-summary');
  summary.setAttribute('aria-label', 'Resumen de la selección');
  summary.append(element('h2', '', 'Subtotal de productos'), element('p', 'price detail-price', formatCop(subtotalCop(state.cart))), element('p', 'secondary', 'Fin del recorrido de este prototipo. No se realizan compras ni pagos.'), button('Volver al catálogo', 'catalog', 'button button-secondary button-wide'));
  layout.append(product, summary);
  view.append(layout);
  return view;
}

export function renderScreen(state: AppState): DocumentFragment {
  if (state.status === 'loading') {
    const view = document.createDocumentFragment();
    view.append(heading('Cargando productos…'));
    return view;
  }
  if (state.status === 'error') {
    const view = document.createDocumentFragment();
    view.append(heading('No pudimos mostrar el catálogo'), button('Reintentar', 'retry', 'button button-primary'));
    return view;
  }
  switch (state.screen.kind) {
    case 'catalog': return catalogScreen(state);
    case 'detail': return detailScreen(state);
    case 'cart': return cartScreen(state);
  }
}

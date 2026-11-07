export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(text: string, action: string, className = 'button'): HTMLButtonElement {
  const node = element('button', className, text);
  node.type = 'button';
  node.dataset.action = action;
  node.dataset.focusKey = action;
  return node;
}

export function formatCop(amount: number): string {
  return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)} COP`;
}

export function productIllustration(name: string, large = false): HTMLElement {
  const image = element('div', large ? 'product-image product-image-large' : 'product-image');
  image.setAttribute('aria-hidden', 'true');
  const object = element('div', 'product-object');
  object.append(element('span', 'object-label', 'VELVET'), element('span', 'object-kind', name));
  image.append(object, element('span', 'image-caption', 'Imagen de ejemplo'));
  return image;
}

export function statePanel(title: string, detail: string): HTMLElement {
  const panel = element('section', 'state-panel');
  panel.append(element('h2', '', title), element('p', 'secondary', detail));
  return panel;
}

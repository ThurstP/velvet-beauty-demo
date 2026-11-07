import { AppController } from "../app/controller.js";
import { button, element } from "./dom.js";
import { renderScreen } from "./screens.js";
export function mountApp(root, controller) {
    const shell = element('div', 'app-shell');
    const banner = element('div', 'simulation-banner', 'SIMULACIÓN ACADÉMICA · Productos y precios ficticios · Sin compras reales');
    const header = element('header', 'site-header');
    const brand = button('VELVET BEAUTY', 'catalog', 'brand');
    brand.setAttribute('aria-label', 'Velvet Beauty — ir al catálogo');
    const cart = button('Carrito (0)', 'cart', 'button button-secondary');
    header.append(brand, cart);
    const main = element('main', 'main-content');
    main.id = 'main-content';
    main.tabIndex = -1;
    const notices = element('div', 'notice-area');
    const status = element('p', 'notice success-notice');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const error = element('p', 'notice error-notice');
    error.setAttribute('role', 'alert');
    error.setAttribute('aria-atomic', 'true');
    notices.append(status, error);
    const footer = element('footer', 'site-footer', 'Velvet Beauty · Prototipo académico de catálogo, tonos y carrito. Recargar esta página vacía el carrito.');
    shell.append(banner, header, main, notices, footer);
    root.replaceChildren(shell);
    let previousScreen = '';
    function render(state) {
        const active = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.focusKey : undefined;
        const screenKey = state.status + ':' + state.screen.kind + (state.screen.kind === 'detail' ? ':' + state.screen.productId : '');
        main.setAttribute('aria-busy', String(state.status === 'loading'));
        main.replaceChildren(renderScreen(state));
        cart.textContent = `Carrito (${state.cart.item ? 1 : 0})`;
        cart.disabled = state.status !== 'ready';
        status.textContent = state.message;
        error.textContent = state.error;
        if (previousScreen && previousScreen !== screenKey)
            main.querySelector('h1')?.focus();
        else if (active) {
            // Attribute values are compared as data, never interpolated into selectors.
            const matching = Array.from(shell.querySelectorAll('[data-focus-key]')).find(node => node.dataset.focusKey === active);
            if (matching && !(matching instanceof HTMLButtonElement && matching.disabled))
                matching.focus();
            else if (active === 'add')
                main.querySelector('[data-action="cart"]')?.focus();
        }
        previousScreen = screenKey;
    }
    function onClick(event) {
        const target = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
        if (!target || !root.contains(target) || target.disabled || target.getAttribute('aria-disabled') === 'true')
            return;
        switch (target.dataset.action) {
            case 'catalog':
                controller.showCatalog();
                break;
            case 'product':
                if (target.dataset.productId)
                    controller.showProduct(target.dataset.productId);
                break;
            case 'cart':
                controller.showCart();
                break;
            case 'add':
                controller.addSelected();
                break;
            case 'retry':
                void controller.loadCatalog();
                break;
        }
    }
    function onChange(event) {
        if (event.target instanceof HTMLInputElement && event.target.name === 'tone' && !event.target.disabled)
            controller.selectVariant(event.target.value);
    }
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    const unsubscribe = controller.subscribe(render);
    return () => { unsubscribe(); root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); root.replaceChildren(); };
}

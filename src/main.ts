import { AppController } from './app/controller.ts';
import { sampleProducts } from './data/products.ts';
import { mountApp } from './ui/app.ts';

const root = document.getElementById('app');
if (!root) throw new Error('No se encontró el contenedor de la aplicación.');

const controller = new AppController({ loadProducts: () => Promise.resolve(sampleProducts) });
mountApp(root, controller);
void controller.loadCatalog();

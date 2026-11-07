import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './server.mjs';

const directory = fileURLToPath(new URL('../dist/', import.meta.url));
try { await access(new URL('../dist/index.html', import.meta.url)); }
catch { console.error('Primero ejecuta pnpm build.'); process.exit(1); }
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un puerto válido.');
const server = createStaticServer(directory);
server.on('error', () => { console.error('No se pudo iniciar el servidor local. Comprueba el puerto y los permisos.'); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());

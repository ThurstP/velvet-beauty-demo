import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../dist/', import.meta.url);
// dist is exclusively generated output; source files are never removed.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
const result = spawnSync(process.execPath, [compiler, '--project', 'tsconfig.json'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await copyFile(new URL('../index.html', import.meta.url), new URL('index.html', output));
await copyFile(new URL('../src/styles.css', import.meta.url), new URL('styles.css', output));
console.log('Build completado en dist/ — HTML, CSS y módulos JavaScript locales.');

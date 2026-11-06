#!/usr/bin/env node
/* Lo usa "Publicar versión" antes de sacar una versión.
   Uso: node scripts/cerrar-version.mjs <versión publicada en main>
   - Si VERSION sigue igual a la publicada, sube el último número (7.1.0 → 7.1.1).
   - En CAMBIOS.md, "## Próxima versión" pasa a "## 7.1.1 — 13/11/2026". */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicada = (process.argv[2] || '0.0.0').trim();
let version = (await fs.readFile(path.join(ROOT, 'VERSION'), 'utf8')).trim();

const n = v => v.split('.').map(Number);
const mayor = (a, b) => { const x = n(a), y = n(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
if (!mayor(version, publicada)) {
  const [a, b, c] = n(publicada);
  version = `${a}.${b}.${c + 1}`;
}
await fs.writeFile(path.join(ROOT, 'VERSION'), version + '\n');

const hoy = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date());
const file = path.join(ROOT, 'CAMBIOS.md');
let cambios = await fs.readFile(file, 'utf8');
const titulo = `## ${version} — ${hoy}`;
if (/^## Próxima versión\s*$/m.test(cambios)) {
  cambios = cambios.replace(/^## Próxima versión\s*$/m, titulo);
} else {
  cambios = cambios.replace(/^## /m, `${titulo}\n- Ajustes y arreglos.\n\n## `);
}
await fs.writeFile(file, cambios);
console.log(`Versión ${version} (antes: ${publicada})`);

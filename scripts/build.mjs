#!/usr/bin/env node
/* Arma la web publicable en dist/ a partir de web/.
   - Estampa la versión del archivo VERSION en todas las páginas ({{VERSION}}).
   - Trae la última versión publicada de AirMix desde GitHub ({{AIRMIX_VERSION}}, {{AIRMIX_SIZE}}).
   - Completa el service worker con la lista de archivos para usar sin internet y una huella del build.
   Lo corre Netlify en cada publicación (ver netlify.toml) y GitHub Actions para comprobar.
   Sin dependencias: Node 18 o superior. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'web');
const OUT = path.join(ROOT, 'dist');
const VERSION = (await fs.readFile(path.join(ROOT, 'VERSION'), 'utf8')).trim();
const TEXT = new Set(['.html', '.js', '.css', '.webmanifest', '.json', '.txt', '.xml']);

if (!/^\d+\.\d+\.\d+$/.test(VERSION)) {
  console.error(`VERSION tiene que ser del tipo 7.0.0 y dice "${VERSION}"`);
  process.exit(1);
}

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function latestRelease(repo, assetName) {
  const fallback = { version: 'más reciente', size: '1 MB', ok: false };
  try {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'claraboya-build' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers, signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return fallback;
    const rel = await res.json();
    const m = String(rel.name || rel.tag_name || '').match(/\d+(?:\.\d+)+/);
    const asset = (rel.assets || []).find(a => a.name === assetName);
    if (!m || !asset) return fallback;
    const mb = asset.size / (1024 * 1024);
    const size = (mb < 10 ? mb.toFixed(1) : String(Math.round(mb))).replace('.', ',').replace(/,0$/, '') + ' MB';
    return { version: m[0], size, ok: true };
  } catch {
    return fallback;
  }
}

// 1. dist limpio, copia de web/
await fs.rm(OUT, { recursive: true, force: true });
await fs.cp(SRC, OUT, { recursive: true });

// 2. datos de afuera
const airmix = await latestRelease('joaquinnachman/airmix', 'AirMix.apk');

// 3. reemplazos en archivos de texto
const files = await walk(OUT);
const values = {
  '{{VERSION}}': VERSION,
  '{{AIRMIX_VERSION}}': airmix.version,
  '{{AIRMIX_SIZE}}': airmix.size
};
for (const file of files) {
  if (!TEXT.has(path.extname(file)) || path.basename(file) === 'sw.js') continue;
  let text = await fs.readFile(file, 'utf8');
  let changed = false;
  for (const [key, val] of Object.entries(values)) {
    if (text.includes(key)) { text = text.split(key).join(val); changed = true; }
  }
  if (changed) await fs.writeFile(file, text);
}

// 4. service worker: qué se guarda para usar sin internet
const rel = f => '/' + path.relative(OUT, f).split(path.sep).join('/');
const all = (await walk(OUT)).map(rel);
const precache = all.filter(u =>
  (u.startsWith('/herramientas/') ||
   u.startsWith('/fonts/') ||
   /^\/img\/(app-|icon-32|logo\.webp)/.test(u) ||
   u === '/favicon.ico' || u === '/manifest.webmanifest')
).map(u => u.endsWith('/index.html') ? u.slice(0, -'index.html'.length) : u).sort();

const hash = crypto.createHash('sha256');
for (const u of all.sort()) {
  if (u === '/sw.js') continue;
  hash.update(u);
  hash.update(await fs.readFile(path.join(OUT, u)));
}
const BUILD = hash.digest('hex').slice(0, 10);

const swFile = path.join(OUT, 'sw.js');
let sw = await fs.readFile(swFile, 'utf8');
sw = sw.replace("'{{VERSION}}'", JSON.stringify(VERSION))
       .replace("'{{BUILD}}'", JSON.stringify(BUILD))
       .replace('{{PRECACHE}}', JSON.stringify(precache, null, 2));
await fs.writeFile(swFile, sw);

// 5. versión a la vista de cualquiera (y de las apps)
await fs.writeFile(path.join(OUT, 'version.json'), JSON.stringify({
  version: VERSION,
  build: BUILD,
  fecha: new Date().toISOString(),
  airmix: airmix.ok ? airmix.version : null
}, null, 2) + '\n');

console.log(`Claraboya ${VERSION} (build ${BUILD})`);
console.log(`  ${all.length} archivos, ${precache.length} guardados para usar sin internet`);
console.log(`  AirMix: ${airmix.ok ? airmix.version + ' · ' + airmix.size : 'no se pudo consultar GitHub, queda el texto genérico'}`);

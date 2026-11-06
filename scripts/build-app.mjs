#!/usr/bin/env node
/* Arma app/www (lo que va adentro de la APK) a partir de dist/.
   Uso: node scripts/build.mjs && node scripts/build-app.mjs
   - Deja afuera lo que es solo de la web: descargas, fotos de la página del estudio, service worker, Netlify.
   - Marca cada página como app nativa (<html data-app data-native>).
   - El servidor interno de la APK no abre "carpeta/": los links pasan a "carpeta/index.html". */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'app', 'www');

try { await fs.access(path.join(DIST, 'version.json')); }
catch { console.error('Falta dist/: corré antes node scripts/build.mjs'); process.exit(1); }

const SKIP = [
  /^descargas\//, /^_headers$/, /^_redirects$/, /^sw\.js$/, /^404\.html$/, /^robots\.txt$/, /^sitemap\.xml$/,
  /^index\.html$/, /^style\.css$/, /^main\.js$/,
  /^img\/(?!(logo|app-|cuadros|icon-|favicon))/   // de img/ solo logo e íconos
];

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(full)); else out.push(full);
  }
  return out;
}

await fs.rm(OUT, { recursive: true, force: true });
let copied = 0, bytes = 0;
for (const file of await walk(DIST)) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  if (SKIP.some(r => r.test(rel))) continue;
  const dest = path.join(OUT, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (rel.endsWith('.html')) {
    let html = await fs.readFile(file, 'utf8');
    html = html.replace(/<html\b([^>]*)>/i, (m, attrs) => '<html' + attrs.replace(/\sdata-app\b/, '') + ' data-app data-native>');
    // href/src internos que terminan en "/" → ".../index.html" (respeta ?query y #ancla)
    html = html.replace(/(\s(?:href|src)=")(?![a-z][a-z0-9+.-]*:|\/\/|#)([^"?#]*\/)([?#][^"]*)?"/gi,
      (m, pre, p, rest) => pre + p + 'index.html' + (rest || '') + '"');
    // href="" o href="." no se usan; "../" ya quedó cubierto arriba
    await fs.writeFile(dest, html);
  } else {
    await fs.copyFile(file, dest);
  }
  copied++; bytes += (await fs.stat(dest)).size;
}

// Arranque: la APK abre www/index.html y la app empieza en /app/
await fs.writeFile(path.join(OUT, 'index.html'),
  '<!DOCTYPE html><html lang="es-AR" data-app data-native><head><meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Claraboya</title>' +
  '<style>html,body{margin:0;height:100%;background:#000}</style>' +
  '<script>location.replace("/app/index.html")</script></head><body></body></html>\n');

const v = JSON.parse(await fs.readFile(path.join(DIST, 'version.json'), 'utf8'));
console.log(`app/www listo: Claraboya ${v.version}, ${copied + 1} archivos, ${(bytes / 1048576).toFixed(1)} MB`);

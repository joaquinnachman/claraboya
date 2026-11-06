#!/usr/bin/env node
/* Revisa dist/ antes de publicar: links y archivos rotos, reemplazos pendientes y el service worker.
   Uso: node scripts/build.mjs && node scripts/check.mjs */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const problems = [];

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function exists(urlPath) {
  let p = path.join(OUT, decodeURIComponent(urlPath));
  try {
    const st = await fs.stat(p);
    if (st.isDirectory()) { await fs.stat(path.join(p, 'index.html')); }
    return true;
  } catch { return false; }
}

const redirects = (await fs.readFile(path.join(OUT, '_redirects'), 'utf8').catch(() => ''))
  .split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.trim().split(/\s+/)[0]);

const files = await walk(OUT);
for (const file of files) {
  const ext = path.extname(file);
  if (!['.html', '.js', '.css', '.webmanifest', '.json'].includes(ext)) continue;
  const text = await fs.readFile(file, 'utf8');
  const rel = '/' + path.relative(OUT, file).split(path.sep).join('/');
  const leftover = text.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) problems.push(`${rel}: quedó ${leftover[0]} sin reemplazar`);
  if (ext !== '.html') continue;

  const base = new URL(rel, 'https://claraboya.local');
  // Sacamos los <script> en línea: adentro hay HTML armado por JS (exportar PDF, etc.) que no son links reales.
  const markup = text.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, '');
  for (const m of markup.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:|#|blob:)/.test(ref)) continue;
    const u = new URL(ref, base);
    if (u.origin !== base.origin) continue;
    if (redirects.includes(u.pathname)) continue;
    if (!await exists(u.pathname)) problems.push(`${rel}: no existe ${ref}`);
  }
}

// service worker: todo lo que promete guardar tiene que existir
const sw = await fs.readFile(path.join(OUT, 'sw.js'), 'utf8');
const list = sw.match(/var PRECACHE = (\[[\s\S]*?\]);/);
if (!list) problems.push('sw.js: no encontré la lista PRECACHE');
else {
  for (const u of JSON.parse(list[1])) if (!await exists(u)) problems.push(`sw.js: guarda ${u} y no existe`);
}

if (problems.length) {
  console.error(`Hay ${problems.length} problema(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`dist/ ok: ${files.length} archivos revisados, sin links rotos.`);

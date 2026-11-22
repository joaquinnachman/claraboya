#!/usr/bin/env node
/* Lugares libres del estudio para la pantalla Estudio de la app.
   Recibe los momentos ocupados (ya filtrados: qué calendarios y qué eventos cuentan se decide afuera de este repo)
   y escribe solo lo libre, día por día. Lo usa la tarea diaria que publica `dispo.json` en la rama `dispo`.

   node scripts/dispo.mjs ocupado.json > dispo.json

   ocupado.json: { "desde": "2026-11-22", "ocupado": [["2026-11-23T17:00", "2026-11-23T23:00"], ["2026-11-28", "2026-11-29"]] }
   (hora de Argentina, sin zona; un día entero va como fecha sola y el final no se cuenta, como en Google Calendar)

   Reglas: se miran 7 días desde `desde`, sin domingos, de 10 a 22 h, y los huecos de 2 h o menos cuentan como ocupados. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const DIAS = 7, ABRE = 10 * 60, CIERRA = 22 * 60, HUECO_MIN = 120;

const FECHA = /^\d{4}-\d{2}-\d{2}$/, MOMENTO = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?$/;
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
// minutos desde el 1/1/1970 en hora local "de pared": alcanza para comparar, sin zonas horarias
function minutos(s) {
  const m = MOMENTO.exec(String(s));
  if (!m) throw new Error('Momento mal escrito: ' + s);
  const [y, mo, d] = m[1].split('-').map(Number);
  const dia = Date.UTC(y, mo - 1, d) / 60000;
  if (Number.isNaN(dia)) throw new Error('Fecha imposible: ' + s);
  return dia + (m[2] ? Number(m[2]) * 60 + Number(m[3]) : 0);
}
function sumarDias(fecha, n) { const t = new Date(fecha + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }

export function calcular({ desde, ocupado }, generado = new Date()) {
  if (!FECHA.test(String(desde))) throw new Error('Falta "desde" (AAAA-MM-DD)');
  if (!Array.isArray(ocupado)) throw new Error('Falta la lista "ocupado"');
  const bloques = ocupado.map(([a, b]) => [minutos(a), minutos(b)]).filter(([a, b]) => b > a);
  const dias = [];
  for (let i = 0; i < DIAS; i++) {
    const fecha = sumarDias(desde, i);
    if (new Date(fecha + 'T00:00:00Z').getUTCDay() === 0) continue;   // domingo: no se muestra
    const base = minutos(fecha), ini = base + ABRE, fin = base + CIERRA;
    const dentro = bloques.map(([a, b]) => [Math.max(a, ini), Math.min(b, fin)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
    const libre = []; let cursor = ini;
    for (const [a, b] of dentro) { if (a > cursor) libre.push([cursor, a]); cursor = Math.max(cursor, b); }
    if (fin > cursor) libre.push([cursor, fin]);
    dias.push({ fecha, libre: libre.filter(([a, b]) => b - a > HUECO_MIN).map(([a, b]) => [hhmm(a - base), hhmm(b - base)]) });
  }
  // la hora de Argentina (UTC−3 todo el año) con su zona, para que la app diga "actualizado hoy a las…"
  const ar = new Date(generado.getTime() - 3 * 3600000).toISOString().slice(0, 16) + ':00-03:00';
  return { v: 1, generado: ar, abre: hhmm(ABRE), cierra: hhmm(CIERRA), dias };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const archivo = process.argv[2];
  if (!archivo) { console.error('Uso: node scripts/dispo.mjs ocupado.json > dispo.json'); process.exit(1); }
  try {
    const salida = calcular(JSON.parse(fs.readFileSync(archivo, 'utf8')));
    process.stdout.write(JSON.stringify(salida, null, 1) + '\n');
    for (const d of salida.dias) console.error(d.fecha, d.libre.length ? d.libre.map(r => r.join('–')).join(', ') : 'ocupado');
  } catch (e) { console.error('No se pudo: ' + e.message); process.exit(1); }
}

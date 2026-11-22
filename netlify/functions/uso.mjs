/* Contador anónimo de uso de las herramientas de Claraboya.
   POST /api/uso  → anota que se abrió una herramienta (o que se tocó una acción), sin datos de nadie:
                    ni IP, ni identificadores, ni cookies. Solo qué, desde qué plataforma y qué día.
   GET  /api/uso?mes=2026-11 → los totales del mes (los muestra la página escondida /uso/).
   Cada evento es una entrada vacía en Netlify Blobs cuyo nombre dice qué pasó
   (2026-11/22/abrir.afinador.android.x7f3k2): así no hay que leer y reescribir un contador
   (dos visitas a la vez no se pisan) y para contar alcanza con listar los nombres. */
import { getStore } from '@netlify/blobs';

const ORIGENES = new Set(['https://claraboyaestudio.netlify.app', 'https://localhost']);
export const HERRAMIENTAS = new Set(['inicio', 'estudio', 'herramientas', 'matriz-de-acordes', 'brujula-armonica', 'hoja-de-ruta',
  'rider-tecnico', 'armador-de-setlists', 'calentamiento-vocal', 'afinador', 'metronomo', 'buscador-de-bpm', 'piano',
  'grabador-de-ideas', 'entrenamiento-de-oido']);
export const ACCIONES = new Set(['grabala-chat', 'grabala-audio', 'reservar']);
export const PLATAFORMAS = new Set(['web', 'android', 'iphone', 'instalada']);

function hoyAR(fecha = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(fecha).map(x => [x.type, x.value]));
  return { mes: p.year + '-' + p.month, dia: p.day };
}

// lo que llega del navegador, revisado campo por campo: si algo no está en las listas, no se anota
export function validar(texto) {
  if (typeof texto !== 'string' || texto.length > 300) return null;
  let d; try { d = JSON.parse(texto); } catch { return null; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const pl = PLATAFORMAS.has(d.p) ? d.p : null;
  if (!pl) return null;
  if (d.e === 'abrir' && HERRAMIENTAS.has(d.h)) return { tipo: 'abrir', que: d.h, pl };
  if (d.e === 'accion' && ACCIONES.has(d.a)) return { tipo: 'accion', que: d.a, pl };
  return null;
}

export function clave(ev, fecha = new Date(), azar = Math.random) {
  const { mes, dia } = hoyAR(fecha);
  return `${mes}/${dia}/${ev.tipo}.${ev.que}.${ev.pl}.${azar().toString(36).slice(2, 10)}`;
}

// arma los totales a partir de los nombres de las entradas del mes
export function totales(claves, mes) {
  const t = { mes, abrir: {}, acciones: {}, plataformas: {}, dias: {}, total: 0 };
  for (const k of claves) {
    const m = /^(\d{4}-\d{2})\/(\d{2})\/(abrir|accion)\.([a-z-]+)\.([a-z]+)\.[a-z0-9]+$/.exec(k);
    if (!m || m[1] !== mes) continue;
    const [, , dia, tipo, que, pl] = m;
    if (tipo === 'abrir') {
      const h = t.abrir[que] || (t.abrir[que] = { total: 0 });
      h.total++; h[pl] = (h[pl] || 0) + 1;
      t.plataformas[pl] = (t.plataformas[pl] || 0) + 1;
      t.dias[dia] = (t.dias[dia] || 0) + 1;
      t.total++;
    } else {
      const a = t.acciones[que] || (t.acciones[que] = { total: 0 });
      a.total++; a[pl] = (a[pl] || 0) + 1;
    }
  }
  return t;
}

function cors(req) {
  const o = req.headers.get('origin');
  return o && ORIGENES.has(o) ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {};
}

export function crear(store) {
  return async (req) => {
    try {
      if (req.method === 'POST') {
        const origen = req.headers.get('origin');
        if (!origen || !ORIGENES.has(origen)) return new Response(null, { status: 403 });
        if (!/Mozilla/.test(req.headers.get('user-agent') || '')) return new Response(null, { status: 204 });   // robots: se ignoran
        const ev = validar(await req.text());
        if (!ev) return new Response(null, { status: 400, headers: cors(req) });
        await store.set(clave(ev), '');
        return new Response(null, { status: 204, headers: cors(req) });
      }
      if (req.method === 'GET') {
        const pedido = new URL(req.url).searchParams.get('mes');
        const mes = /^20\d{2}-(0[1-9]|1[0-2])$/.test(pedido || '') ? pedido : hoyAR().mes;
        const claves = [];
        for await (const pagina of store.list({ prefix: mes + '/', paginate: true })) for (const b of pagina.blobs) claves.push(b.key);
        return Response.json(totales(claves, mes), { headers: { 'Cache-Control': 'public, max-age=300', ...cors(req) } });
      }
      return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
    } catch {
      return new Response('No se pudo', { status: 500 });   // sin detalles internos
    }
  };
}

export default (req) => crear(getStore({ name: 'uso', consistency: 'strong' }))(req);

export const config = {
  path: '/api/uso',
  rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};

/* Claraboya · interfaz de app
   Corre en todas las páginas, pero solo hace algo con <html data-app> (APK, web instalada o ?app=1).
   - Barra superior (volver, título, info) y barra inferior (Inicio, Afinador, Metrónomo, Estudio).
   - Botón atrás de Android, volver deslizando en iPhone, transiciones entre pantallas.
   - En la APK: guardar archivos, pantalla encendida, links externos y aviso de versión nueva. */
(function () {
  'use strict';
  var html = document.documentElement;
  if (!html.hasAttribute('data-app')) return;

  var VERSION = '{{VERSION}}';
  var REPO = 'joaquinnachman/claraboya';
  var WEB = 'https://claraboyaestudio.netlify.app';
  var cap = window.Capacitor;
  var NATIVE = html.hasAttribute('data-native') || !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var nativo = window.ClaraboyaNativo || null;
  var store = (function () { try { localStorage.setItem('cb.t', '1'); localStorage.removeItem('cb.t'); return localStorage; } catch (e) { return null; } })();
  var session = (function () { try { return sessionStorage; } catch (e) { return null; } })();
  var IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

  var TOOLS = {
    'afinador': { name: 'Afinador', icon: 'afinador' },
    'metronomo': { name: 'Metrónomo', icon: 'metronomo' },
    'buscador-de-bpm': { name: 'Buscador de BPM', icon: 'bpm' },
    'piano': { name: 'Piano', icon: 'piano' },
    'matriz-de-acordes': { name: 'Matriz de acordes', icon: 'matriz' },
    'brujula-armonica': { name: 'Brújula armónica', icon: 'brujula' },
    'hoja-de-ruta': { name: 'Hoja de ruta', icon: 'ruta' },
    'rider-tecnico': { name: 'Rider técnico', icon: 'rider' },
    'armador-de-setlists': { name: 'Setlists', icon: 'setlist' },
    'calentamiento-vocal': { name: 'Calentamiento vocal', icon: 'voz' }
  };

  /* ---------- íconos ---------- */
  var ICONS = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    inicio: '<path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z"/>',
    estudio: '<path d="M6 4.5l4.6-.4 1.5 7.6H6.3zM11.8 4l4.9-.5 3 8.2h-6.4zM6.4 13h5.9l1.5 7.3-7.1-.6zM13.7 13h6.4l2.4 7.7-7.2-.4z" fill="currentColor" stroke="none"/>',
    afinador: '<path d="M3.5 17a8.5 8.5 0 0 1 17 0"/><path d="M12 17l4.2-6.4"/><path d="M6 11.3l1.2 1M12 8.3v1.6M18 11.3l-1.2 1"/><circle cx="12" cy="17" r="1.4" fill="currentColor"/>',
    metronomo: '<path d="M9.3 3.5h5.4L19 20.5H5z"/><path d="M12 16.5l5.2-9.5"/><path d="M7 16.5h10"/>',
    bpm: '<path d="M3 12h4l2.2-6 4.4 12 2.2-6H21"/>',
    piano: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7.5 13v6.5M12 13v6.5M16.5 13v6.5"/><path d="M6.3 4.5h2.4v8.5H6.3zM10.8 4.5h2.4v8.5h-2.4zM15.3 4.5h2.4v8.5h-2.4z" fill="currentColor"/>',
    matriz: '<path d="M6 4h12M6 4v16M10 4v16M14 4v16M18 4v16M6 9h12M6 14h12M6 20h12"/><circle cx="10" cy="11.5" r="1.6" fill="currentColor"/><circle cx="14" cy="6.5" r="1.6" fill="currentColor"/><circle cx="18" cy="16.8" r="1.6" fill="currentColor"/>',
    brujula: '<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
    ruta: '<path d="M5.5 19.5c5 0 2-7 6.5-7s1.5-7 6.5-7"/><circle cx="5.5" cy="19.5" r="2"/><circle cx="18.5" cy="5.5" r="2"/>',
    rider: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
    setlist: '<path d="M9.5 6h10.5M9.5 12h10.5M9.5 18h10.5"/><circle cx="5" cy="6" r="1.3" fill="currentColor"/><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="5" cy="18" r="1.3" fill="currentColor"/>',
    voz: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    grab: '<path d="M10.5 13.5a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1.1 1.1"/><path d="M13.5 10.5a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1.1-1.1"/>',
    airmix: '<path d="M6 4v16M12 4v16M18 4v16"/><rect x="3.8" y="12.5" width="4.4" height="3.2" rx="1" fill="currentColor"/><rect x="9.8" y="6.5" width="4.4" height="3.2" rx="1" fill="currentColor"/><rect x="15.8" y="10" width="4.4" height="3.2" rx="1" fill="currentColor"/>',
    whatsapp: '<path d="M4 20l1.2-4A8 8 0 1 1 8.3 19z"/><path d="M9 9.2c.3 2.4 2.4 4.6 5 5.2l1.1-1.2 1.8.8c-.2 1.3-1.2 2-2.4 1.9C11 15.6 8.3 13 8 9.6c0-1.2.7-2.2 1.9-2.4l.8 1.8z" fill="currentColor" stroke="none"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r="0.9" fill="currentColor"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/>',
    cafe: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c-.6 1 .6 1.6 0 2.8M11.5 3.5c-.6 1 .6 1.6 0 2.8"/>',
    guardar: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
    recuperar: '<path d="M12 20V9M7.5 13.5L12 9l4.5 4.5M5 4.5h14"/>',
    nuevo: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><circle cx="12" cy="12" r="9.5"/>'
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }
  // Sprite para las páginas propias de la app (<svg><use href="#i-afinador">)
  function injectSprite() {
    if (document.getElementById('cb-sprite')) return;
    var s = '<svg id="cb-sprite" width="0" height="0" style="position:absolute" aria-hidden="true">';
    Object.keys(ICONS).forEach(function (k) {
      s += '<symbol id="i-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + '</symbol>';
    });
    document.body.insertAdjacentHTML('afterbegin', s + '</svg>');
  }

  /* ---------- rutas ---------- */
  // En la APK, el servidor interno no abre "carpeta/": hay que pedir "carpeta/index.html".
  function fixPath(url) {
    if (!NATIVE) return url;
    var u;
    try { u = new URL(url, location.href); } catch (e) { return url; }
    if (u.origin !== location.origin) return url;
    if (/\/$/.test(u.pathname)) u.pathname += 'index.html';
    return u.pathname + u.search + u.hash;
  }
  function go(url, kind) {
    if (kind && session) session.setItem('cbNav', kind);
    location.href = fixPath(url);
  }
  var HOME = '/app/';
  var path = location.pathname.replace(/index\.html$/, '');
  var isHome = path === HOME;
  var tool = document.body.getAttribute('data-tool');
  var page = document.body.getAttribute('data-app-page') || (TOOLS[tool] ? tool : '');

  // El selector de la web no tiene sentido dentro de la app: va al inicio.
  if (path === '/herramientas/' || (NATIVE && path === '/')) { location.replace(fixPath(HOME)); return; }

  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); else if (nativo && nativo.vibrar) nativo.vibrar(ms || 8); } catch (e) { /* nada */ }
  }

  /* ---------- volver ---------- */
  function canGoBack() {
    if (window.navigation && typeof window.navigation.canGoBack === 'boolean') return window.navigation.canGoBack;
    return history.length > 1 && document.referrer.indexOf(location.origin) === 0;
  }
  function goBack() {
    if (session) session.setItem('cbNav', 'back');
    if (canGoBack()) history.back();
    else location.href = fixPath(HOME);
  }

  /* ---------- hoja de abajo ---------- */
  var sheet = null;
  function openSheet(inner) {
    closeSheet();
    sheet = document.createElement('div');
    sheet.className = 'cb-sheet';
    sheet.innerHTML = '<div class="cb-sheet__scrim" data-close></div><div class="cb-sheet__panel" role="dialog" aria-modal="true"><div class="cb-sheet__grip"></div>' + inner + '</div>';
    sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
    // deslizar hacia abajo para cerrar
    var panel = sheet.querySelector('.cb-sheet__panel'), y0 = null;
    panel.addEventListener('touchstart', function (e) { y0 = panel.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    panel.addEventListener('touchmove', function (e) {
      if (y0 === null) return;
      var dy = Math.max(0, e.touches[0].clientY - y0);
      panel.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    panel.addEventListener('touchend', function (e) {
      if (y0 === null) return;
      var dy = e.changedTouches[0].clientY - y0; y0 = null;
      if (dy > 90) closeSheet(); else panel.style.transform = '';
    });
    document.body.appendChild(sheet);
    return sheet;
  }
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; return true; } return false; }

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- barras ---------- */
  function buildAppBar() {
    if (isHome) return;
    var head = document.querySelector('.tool-head');
    var title = (TOOLS[tool] && TOOLS[tool].name) || document.body.getAttribute('data-app-title') ||
      (head && head.querySelector('h1') ? head.querySelector('h1').textContent.trim() : document.title.split('|')[0].trim());
    var isRoot = page === 'estudio';
    var bar = document.createElement('header');
    bar.className = 'cb-appbar';
    bar.innerHTML =
      (isRoot ? '<span style="width:12px"></span>' : '<button class="cb-iconbtn" type="button" data-cb-back aria-label="Volver">' + svg('back') + '</button>') +
      '<h1 class="cb-appbar__title">' + escapeHtml(title) + '</h1>' +
      '<div class="cb-appbar__slot"></div>' +
      (head ? '<button class="cb-iconbtn" type="button" data-cb-info aria-label="Qué es esta herramienta">' + svg('info') + '</button>' : '');
    document.body.insertBefore(bar, document.body.firstChild);

    // lo que había al costado del título (estado de guardado, etc.) pasa a la barra
    var aside = head && head.querySelector('.tool-head__aside');
    if (aside) {
      var slot = bar.querySelector('.cb-appbar__slot');
      while (aside.firstChild) slot.appendChild(aside.firstChild);
    }
    if (head) {
      var kicker = head.querySelector('.tool-head__kicker');
      var sub = head.querySelector('.tool-head__sub');
      bar.querySelector('[data-cb-info]').addEventListener('click', function () {
        openSheet(
          (kicker ? '<p class="cb-sheet__kicker">' + escapeHtml(kicker.textContent.trim()) + '</p>' : '') +
          '<h2 class="cb-sheet__title">' + escapeHtml(title) + '</h2>' +
          (sub ? '<p class="cb-sheet__text">' + escapeHtml(sub.textContent.trim()) + '</p>' : '') +
          '<p class="cb-sheet__text">Lo que guardás queda en este dispositivo. Desde <b>Estudio</b> podés guardar una copia de todo.</p>' +
          '<div class="cb-sheet__actions"><button class="btn" type="button" data-close>Listo</button></div>'
        );
      });
    }
  }

  function buildTabBar() {
    var tabs = [
      { id: 'inicio', label: 'Inicio', href: HOME, icon: 'inicio' },
      { id: 'afinador', label: 'Afinador', href: '/herramientas/afinador/', icon: 'afinador' },
      { id: 'piano', label: 'Piano', href: '/herramientas/piano/', icon: 'piano' },
      { id: 'metronomo', label: 'Metrónomo', href: '/herramientas/metronomo/', icon: 'metronomo' },
      { id: 'estudio', label: 'Estudio', href: '/app/estudio/', icon: 'estudio' }
    ];
    var current = isHome ? 'inicio' : page;
    var nav = document.createElement('nav');
    nav.className = 'cb-tabbar';
    nav.setAttribute('aria-label', 'Secciones');
    nav.innerHTML = tabs.map(function (t) {
      return '<a class="cb-tab" href="' + fixPath(t.href) + '" data-cb-tab' + (t.id === current ? ' aria-current="page"' : '') + '>' +
        '<span class="cb-tab__icon">' + svg(t.icon) + '</span>' + t.label + '</a>';
    }).join('');
    document.body.appendChild(nav);
  }

  /* ---------- clicks: navegación, vibración, links externos ---------- */
  document.addEventListener('click', function (e) {
    var back = e.target.closest('[data-cb-back]');
    if (back) { e.preventDefault(); haptic(); goBack(); return; }

    var a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    if (a.matches('.quick__tile, .tile, .hrow, .resume, .list__row, [data-cb-tab], .hchips a')) haptic();
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|blob:|data:|javascript:)/i.test(href) || a.hasAttribute('download')) return;
    var u;
    try { u = new URL(href, location.href); } catch (err) { return; }

    if (a.hasAttribute('data-cb-tab')) {
      e.preventDefault();
      if (a.getAttribute('aria-current') === 'page') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      go(href, 'tab');
      return;
    }
    if (u.origin === location.origin && NATIVE) {
      var fixed = fixPath(u.href);
      if (fixed !== u.pathname + u.search + u.hash || a.target) { e.preventDefault(); location.href = fixed; }
      return;
    }
    if (u.origin !== location.origin && NATIVE) {
      // en la APK los links de afuera (WhatsApp, Instagram, descargas) se abren en su app o en el navegador
      e.preventDefault();
      location.href = u.href;
    }
  }, false);

  /* ---------- botón atrás de Android / Escape ---------- */
  function closeTopLayer() {
    if (closeSheet()) return true;
    var show = document.getElementById('showMode');
    if (show && show.classList.contains('active')) { var c = document.getElementById('showCloseBtn'); if (c) c.click(); return true; }
    var dlg = document.querySelector('.cb-confirm, [role="dialog"][aria-modal="true"]:not([hidden])');
    if (dlg && dlg.getClientRects().length) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return true;
    }
    return false;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet) closeSheet(); });

  if (NATIVE && cap && cap.Plugins && cap.Plugins.App) {
    cap.Plugins.App.addListener('backButton', function () {
      if (closeTopLayer()) return;
      if (isHome) { if (cap.Plugins.App.minimizeApp) cap.Plugins.App.minimizeApp(); else cap.Plugins.App.exitApp(); return; }
      goBack();
    });
  }

  /* ---------- volver deslizando desde el borde (iPhone/iPad instalada) ---------- */
  if (IOS && !isHome) {
    var sx = null, sy = 0;
    document.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX < 22 ? t.clientX : null; sy = t.clientY; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var t = e.changedTouches[0];
      if (t.clientX - sx > 70 && Math.abs(t.clientY - sy) < 50) goBack();
      sx = null;
    }, { passive: true });
  }

  /* ---------- teclado abierto: se esconde la barra de abajo ---------- */
  document.addEventListener('focusin', function (e) { if (e.target.matches('input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable]')) html.classList.add('cb-keyboard'); });
  document.addEventListener('focusout', function () { html.classList.remove('cb-keyboard'); });

  /* ---------- APK: pantalla encendida, ventanas, archivos ---------- */
  if (NATIVE && nativo) {
    if (nativo.pantallaEncendida) {
      var wakeLocks = 0;
      var fakeLock = function () {
        wakeLocks++; nativo.pantallaEncendida(true);
        var lock = { released: false, type: 'screen', addEventListener: function () {}, removeEventListener: function () {},
          release: function () { if (!lock.released) { lock.released = true; wakeLocks = Math.max(0, wakeLocks - 1); if (!wakeLocks) nativo.pantallaEncendida(false); } return Promise.resolve(); } };
        return Promise.resolve(lock);
      };
      try { Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: fakeLock } }); } catch (e) { /* nada */ }
    }
  }
  if (NATIVE) {
    window.open = function (url) { if (url) location.href = String(url); return null; };
  }

  // Pantalla encendida donde se usa en vivo: afinador abierto y modo show del setlist.
  var keep = null;
  function setKeepAwake(on) {
    if (on && !keep && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { keep = l; }).catch(function () {});
    if (!on && keep) { keep.release(); keep = null; }
  }
  if (tool === 'afinador') {
    setKeepAwake(true);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { keep = null; setKeepAwake(true); } });
  }
  if (tool === 'armador-de-setlists') {
    var showEl = document.getElementById('showMode');
    if (showEl) new MutationObserver(function () { setKeepAwake(showEl.classList.contains('active')); }).observe(showEl, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- última herramienta usada ---------- */
  if (store && TOOLS[tool]) {
    try { store.setItem('cb.app.ultima', JSON.stringify({ tool: tool, t: Date.now() })); } catch (e) { /* nada */ }
  }

  /* ---------- versión nueva (solo APK) ---------- */
  function newer(a, b) {
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
    return false;
  }
  function checkUpdate(force) {
    if (!NATIVE || !window.fetch) return Promise.resolve(null);
    var cached = null;
    try { cached = JSON.parse(store.getItem('cb.app.update') || 'null'); } catch (e) { /* nada */ }
    if (!force && cached && Date.now() - cached.t < 6 * 3600 * 1000) return Promise.resolve(cached.v);
    return fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rel) {
        if (!rel) return null;
        var m = String(rel.name || rel.tag_name || '').match(/\d+\.\d+\.\d+/);
        var v = m ? m[0] : null;
        try { store.setItem('cb.app.update', JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* nada */ }
        return v;
      })
      .catch(function () { return null; });
  }
  var APK_URL = 'https://github.com/' + REPO + '/releases/latest/download/Claraboya.apk';

  /* ---------- copia de todo (Estudio) ---------- */
  function allKeys() {
    var keys = [];
    if (!store) return keys;
    for (var i = 0; i < store.length; i++) { var k = store.key(i); if (k && k.indexOf('cb.') === 0 && k.indexOf('cb.app.') !== 0) keys.push(k); }
    return keys;
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function backupAll() {
    var data = {};
    allKeys().forEach(function (k) { data[k] = store.getItem(k); });
    var payload = { app: 'claraboya-herramientas', tool: 'todas', version: 1, exportedAt: new Date().toISOString(), data: data };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    if (window.CB && window.CB.saveFile) return window.CB.saveFile(blob, 'claraboya-copia-' + today() + '.json');
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'claraboya-copia-' + today() + '.json'; a.click();
  }
  function restoreAll() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var p; try { p = JSON.parse(r.result); } catch (e) { p = null; }
        if (!p || p.app !== 'claraboya-herramientas' || !p.data) { toast('Ese archivo no es una copia de Claraboya.'); return; }
        if (p.tool !== 'todas') { toast('Esa es la copia de una sola herramienta: recuperala desde esa herramienta.'); return; }
        var ask = window.CB && window.CB.confirm ? window.CB.confirm('Vas a reemplazar todo lo guardado en la app por la copia del ' + String(p.exportedAt || '').slice(0, 10) + '.', 'Recuperar copia') : Promise.resolve(confirm('¿Recuperar la copia?'));
        ask.then(function (yes) {
          if (!yes) return;
          allKeys().forEach(function (k) { store.removeItem(k); });
          Object.keys(p.data).forEach(function (k) { if (k.indexOf('cb.') === 0) store.setItem(k, p.data[k]); });
          toast('Listo, recuperaste tu copia.');
        });
      };
      r.readAsText(f);
    });
    input.click();
  }
  function toast(msg) {
    if (window.CB && window.CB.toast) return window.CB.toast(msg);
    var t = document.createElement('div'); t.className = 'cb-toast is-on'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3600);
  }

  /* ---------- páginas propias: inicio y estudio ---------- */
  function initHome() {
    var hello = document.querySelector('[data-cb-hello]');
    if (hello) {
      var h = new Date().getHours();
      hello.textContent = h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
    }
    var resume = document.querySelector('[data-cb-resume]');
    if (resume && store) {
      var last = null;
      try { last = JSON.parse(store.getItem('cb.app.ultima') || 'null'); } catch (e) { /* nada */ }
      if (last && TOOLS[last.tool]) {
        resume.href = fixPath('/herramientas/' + last.tool + '/');
        resume.querySelector('[data-cb-resume-name]').textContent = TOOLS[last.tool].name;
        resume.querySelector('use').setAttribute('href', '#i-' + TOOLS[last.tool].icon);
        resume.hidden = false;
      }
    }
    if (!NATIVE || IOS) document.querySelectorAll('[data-cb-android-only]').forEach(function (el) { if (IOS) el.hidden = true; });
    var banner = document.querySelector('[data-cb-update]');
    if (banner) checkUpdate(false).then(function (v) {
      if (v && newer(v, VERSION)) {
        banner.querySelector('[data-cb-update-v]').textContent = v;
        banner.querySelector('a').href = APK_URL;
        banner.hidden = false;
      }
    });
  }
  function initChips() {
    var nav = document.querySelector('[data-cb-chips]');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var lock = 0;
    function mark(id) {
      links.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false'); });
      var cur = nav.querySelector('[aria-current="true"]');
      if (cur && cur.scrollIntoView) { var l = cur.offsetLeft - 16; nav.scrollTo({ left: l, behavior: 'smooth' }); }
    }
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]'); if (!a) return;
      e.preventDefault();
      var sec = document.getElementById(a.getAttribute('href').slice(1)); if (!sec) return;
      lock = Date.now() + 700; mark(sec.id);
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      if (Date.now() < lock) return;
      var best = null;
      entries.forEach(function (en) { if (en.isIntersecting && (!best || en.boundingClientRect.top < best.boundingClientRect.top)) best = en; });
      if (best) mark(best.target.id);
    }, { rootMargin: '-70px 0px -55% 0px', threshold: 0 });
    links.forEach(function (a) { var sec = document.getElementById(a.getAttribute('href').slice(1)); if (sec) io.observe(sec); });
  }
  function initEstudio() {
    var v = document.querySelector('[data-cb-version]');
    if (v) v.textContent = VERSION;
    var status = document.querySelector('[data-cb-update-status]');
    var btn = document.querySelector('[data-cb-check]');
    if (status) {
      if (!NATIVE) status.textContent = 'Se actualiza sola cuando la abrís con internet.';
      else checkUpdate(false).then(function (lv) { paintStatus(lv); });
    }
    function paintStatus(lv) {
      if (!status) return;
      if (lv && newer(lv, VERSION)) {
        status.innerHTML = 'Hay una versión nueva: <b>' + escapeHtml(lv) + '</b>. Tocá para bajarla.';
        if (btn) btn.setAttribute('data-cb-download', '');
      } else status.textContent = lv ? 'Tenés la última versión.' : 'Tocá para buscar una versión nueva.';
    }
    if (btn) btn.addEventListener('click', function () {
      if (btn.hasAttribute('data-cb-download')) { location.href = APK_URL; return; }
      if (!NATIVE) { location.reload(); return; }
      status.textContent = 'Buscando…';
      checkUpdate(true).then(function (lv) { paintStatus(lv); if (lv && !newer(lv, VERSION)) toast('Ya tenés la última versión.'); });
    });
    document.querySelectorAll('[data-cb-backup-all]').forEach(function (b) { b.addEventListener('click', backupAll); });
    document.querySelectorAll('[data-cb-restore-all]').forEach(function (b) { b.addEventListener('click', restoreAll); });
    if (IOS) document.querySelectorAll('[data-cb-android-only]').forEach(function (el) { el.hidden = true; });
  }

  function init() {
    injectSprite();
    buildAppBar();
    buildTabBar();
    if (isHome) { initHome(); initChips(); }
    if (page === 'estudio') initEstudio();
    // los links que vienen escritos en las páginas también se corrigen en la APK
    if (NATIVE) document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (h && h.charAt(0) !== '#' && !/^[a-z]+:/i.test(h)) a.setAttribute('href', fixPath(h));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.CBApp = { native: NATIVE, version: VERSION, fixPath: fixPath, go: go, back: goBack, sheet: openSheet, closeSheet: closeSheet, haptic: haptic };
})();

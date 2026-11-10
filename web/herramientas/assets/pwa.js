/* Claraboya · web instalable
   - Registra el service worker (la web funciona sin internet y se puede instalar).
   - Tarjeta "Claraboya en tu pantalla de inicio": botón Instalar o instrucciones según el dispositivo.
   - iPhone y iPad: aviso abajo en las herramientas y hoja con los pasos para agregarla a inicio (window.CBInstalar).
   - Tarjetas de apps con [data-release]: versión y peso tomados en vivo de la última versión en GitHub. */
(function () {
  'use strict';

  var isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  /* ---------- service worker ---------- */
  if (!isNativeApp && 'serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () { /* sin SW, la web anda igual */ });
    });
  }

  /* ---------- instalar ---------- */
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(ua);
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var deferredPrompt = null;

  function installUI() {
    var card = document.querySelector('[data-instalar]');
    if (!card) return null;
    return {
      card: card,
      btn: card.querySelector('[data-instalar-btn]'),
      help: card.querySelector('[data-instalar-ayuda]')
    };
  }

  function say(ui, text) { if (ui && ui.help) ui.help.textContent = text; }

  function paintInstall() {
    var ui = installUI();
    if (!ui) return;
    if (isNativeApp) { ui.card.hidden = true; return; }
    if (standalone) {
      ui.btn.hidden = true;
      say(ui, 'Ya la estás usando como app. Se actualiza sola cada vez que cambiamos algo.');
      return;
    }
    if (deferredPrompt) {
      ui.btn.hidden = false;
      say(ui, '');
      return;
    }
    if (isIOS) {
      ui.btn.hidden = false;
      ui.btn.textContent = 'Ver cómo';
      say(ui, 'En iPhone y iPad se agrega desde Compartir → «Agregar a inicio» y queda igual que la app de Android.');
      return;
    }
    ui.btn.hidden = true;
    if (isAndroid) say(ui, 'En el menú del navegador (los tres puntitos), tocá «Instalar app» o «Agregar a la pantalla de inicio».');
    else say(ui, 'En la compu, desde Chrome o Edge: tocá el ícono de instalar que aparece a la derecha de la barra de direcciones.');
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    paintInstall();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    var ui = installUI();
    if (!ui) return;
    ui.btn.hidden = true;
    say(ui, 'Listo, ya la tenés en la pantalla de inicio.');
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-instalar-btn]');
    if (btn && isIOS && !deferredPrompt) { iosSheet(); return; }
    if (!btn || !deferredPrompt) return;
    var prompt = deferredPrompt;
    deferredPrompt = null;
    prompt.prompt();
    prompt.userChoice.then(function () { paintInstall(); });
  });

  /* ---------- iPhone y iPad: tenerla como app ----------
     Safari no tiene botón Instalar: se agrega desde Compartir → «Agregar a inicio».
     En las herramientas aparece un aviso abajo (se puede cerrar) y una hoja con los pasos.
     Instalada, se abre con la misma interfaz que la app de Android. */
  var appMode = document.documentElement.hasAttribute('data-app');
  var isIPad = /ipad/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var otherBrowser = /CriOS|FxiOS|EdgiOS/.test(ua);
  var AVISO = 'cb.ios.aviso';
  var ICO = {
    compartir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5v-11M8.2 7.3L12 3.5l3.8 3.8"/><path d="M8.6 10.5H6.5v10h11v-10h-2.1"/></svg>',
    agregar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    listo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  function iosSteps() {
    var donde = otherBrowser ? 'en la barra de direcciones'
      : isIPad ? 'arriba a la derecha de Safari'
      : 'en la barra de abajo de Safari (en los iPhone más nuevos, adentro del botón <b>···</b>)';
    return '<ol class="cb-steps">' +
      '<li><span>Tocá <b>Compartir</b>, ' + donde + '.</span><i class="cb-steps__ico">' + ICO.compartir + '</i></li>' +
      '<li><span>Elegí <b>Agregar a inicio</b>. Si no aparece, bajá un poco en la lista.</span><i class="cb-steps__ico">' + ICO.agregar + '</i></li>' +
      '<li><span>Tocá <b>Agregar</b>. Si ves <b>Abrir como app web</b>, dejalo prendido.</span><i class="cb-steps__ico cb-steps__ico--ok">' + ICO.listo + '</i></li>' +
      '<li><span>Abrila desde el ícono nuevo. Se ve y anda igual que en Android.</span><img class="cb-steps__app" src="/img/app-180.png" alt="" width="40" height="40"></li>' +
      '</ol>';
  }

  var ownSheet = null;
  function closeOwnSheet() { if (ownSheet) { ownSheet.remove(); ownSheet = null; } }
  function iosSheet() {
    var inner = '<p class="cb-sheet__kicker">En tu ' + (isIPad ? 'iPad' : 'iPhone') + '</p>' +
      '<h2 class="cb-sheet__title">Tenela como app</h2>' +
      '<p class="cb-sheet__text">Queda en tu pantalla de inicio con el ícono de los cuatro cuadros: se abre a pantalla completa, con la barra de abajo, y anda sin internet.</p>' +
      iosSteps() +
      '<div class="cb-sheet__actions">' +
      (appMode ? '' : '<a class="btn primary" href="/app/">Probarla ahora</a>') +
      '<button class="btn" type="button" data-close>Listo</button></div>';
    if (window.CBApp && window.CBApp.sheet) { window.CBApp.sheet(inner); return; }
    closeOwnSheet();
    ownSheet = document.createElement('div');
    ownSheet.className = 'cb-sheet';
    ownSheet.innerHTML = '<div class="cb-sheet__scrim" data-close></div><div class="cb-sheet__panel" role="dialog" aria-modal="true" aria-label="Tenela como app"><div class="cb-sheet__grip"></div>' + inner + '</div>';
    ownSheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeOwnSheet(); });
    document.body.appendChild(ownSheet);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOwnSheet(); });

  function iosInvite() {
    if (!isIOS || standalone || appMode || isNativeApp) return;
    if (location.pathname.indexOf('/herramientas/') !== 0) return;
    var off = 0;
    try { off = Number(localStorage.getItem(AVISO)) || 0; } catch (e) { /* nada */ }
    if (Date.now() - off < 14 * 864e5) return;
    var root = document.documentElement;
    var bar = document.createElement('div');
    bar.className = 'cb-inv';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Claraboya como app');
    bar.innerHTML = '<img class="cb-inv__ico" src="/img/app-180.png" alt="" width="40" height="40">' +
      '<button class="cb-inv__txt" type="button" data-inv-ver><b>Claraboya como app</b><span>Igual que en Android, a pantalla completa</span></button>' +
      '<button class="cb-inv__btn" type="button" data-inv-ver>Ver cómo</button>' +
      '<button class="cb-inv__x" type="button" aria-label="Cerrar el aviso" data-inv-x>×</button>';
    bar.addEventListener('click', function (e) {
      if (e.target.closest('[data-inv-x]')) {
        try { localStorage.setItem(AVISO, String(Date.now())); } catch (x) { /* nada */ }
        bar.remove();
        root.classList.remove('cb-inv-on');
      } else if (e.target.closest('[data-inv-ver]')) iosSheet();
    });
    setTimeout(function () {
      document.body.appendChild(bar);
      root.style.setProperty('--cb-inv-h', bar.offsetHeight + 'px');
      root.classList.add('cb-inv-on');
    }, 1200);
  }

  window.CBInstalar = { ios: isIOS, standalone: standalone, abrir: iosSheet };

  /* ---------- versiones en vivo de las apps (GitHub Releases) ---------- */
  function formatSize(bytes) {
    var mb = bytes / (1024 * 1024);
    var txt = mb < 10 ? mb.toFixed(1) : String(Math.round(mb));
    return txt.replace('.', ',').replace(/,0$/, '') + ' MB';
  }

  function readCache(key) {
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return (Date.now() - o.t < 3600000) ? o.v : null;
    } catch (e) { return null; }
  }
  function writeCache(key, v) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* nada */ }
  }

  function paintRelease(el, info) {
    var v = el.querySelector('[data-release-version]');
    var s = el.querySelector('[data-release-size]');
    if (v && info.version) v.textContent = info.version;
    if (s && info.size) s.textContent = info.size;
  }

  function loadRelease(el) {
    var repo = el.getAttribute('data-release');
    var asset = el.getAttribute('data-asset');
    var key = 'cb.release.' + repo;
    var cached = readCache(key);
    if (cached) { paintRelease(el, cached); return; }
    if (!window.fetch) return;
    fetch('https://api.github.com/repos/' + repo + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rel) {
        if (!rel) return;
        var m = String(rel.name || rel.tag_name || '').match(/\d+(?:\.\d+)+/);
        var file = (rel.assets || []).filter(function (a) { return a.name === asset; })[0];
        var info = { version: m ? m[0] : '', size: file ? formatSize(file.size) : '' };
        writeCache(key, info);
        paintRelease(el, info);
      })
      .catch(function () { /* queda lo que vino de fábrica en la página */ });
  }

  function init() {
    paintInstall();
    iosInvite();
    var rels = document.querySelectorAll('[data-release]');
    for (var i = 0; i < rels.length; i++) loadRelease(rels[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

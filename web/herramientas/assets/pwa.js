/* Claraboya · web instalable
   - Registra el service worker (la web funciona sin internet y se puede instalar).
   - Tarjeta "Claraboya en tu pantalla de inicio": botón Instalar o instrucciones según el dispositivo.
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
    ui.btn.hidden = true;
    if (isIOS) say(ui, 'En iPhone o iPad: tocá el botón Compartir y después «Agregar a inicio».');
    else if (isAndroid) say(ui, 'En el menú del navegador (los tres puntitos), tocá «Instalar app» o «Agregar a la pantalla de inicio».');
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
    if (!btn || !deferredPrompt) return;
    var prompt = deferredPrompt;
    deferredPrompt = null;
    prompt.prompt();
    prompt.userChoice.then(function () { paintInstall(); });
  });

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
    var rels = document.querySelectorAll('[data-release]');
    for (var i = 0; i < rels.length; i++) loadRelease(rels[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

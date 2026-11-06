/* Claraboya · service worker
   Lo completa scripts/build.mjs: VERSION sale del archivo VERSION del repo y BUILD es una huella
   de todos los archivos, así que cualquier cambio publicado instala un service worker nuevo.

   Con internet: páginas, scripts y estilos se piden siempre a la red (cada cambio llega al toque).
   Sin internet: se sirve la última copia guardada. Fuentes e imágenes salen primero de la copia. */
'use strict';

var VERSION = '{{VERSION}}';
var BUILD = '{{BUILD}}';
var CACHE = 'claraboya-' + VERSION + '-' + BUILD;
var PRECACHE = {{PRECACHE}};
var OFFLINE_PAGE = '/herramientas/';
var NETWORK_TIMEOUT = 4000;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) {
        return cache.addAll(PRECACHE.map(function (url) { return new Request(url, { cache: 'reload' }); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) {
          return k.indexOf('claraboya-') === 0 && k !== CACHE;
        }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'version' && event.source) {
    event.source.postMessage({ tipo: 'version', version: VERSION, build: BUILD });
  }
});

function isStatic(url) {
  return /\.(woff2?|png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
}

function fromCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request, { ignoreSearch: request.mode === 'navigate' });
  });
}

function store(request, response) {
  if (response && response.ok && response.type === 'basic') {
    var copy = response.clone();
    caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
  }
  return response;
}

function networkFirst(request) {
  return new Promise(function (resolve, reject) {
    var settled = false;
    var timer = setTimeout(function () {
      fromCache(request).then(function (hit) {
        if (hit && !settled) { settled = true; resolve(hit); }
      });
    }, NETWORK_TIMEOUT);

    fetch(request).then(function (response) {
      clearTimeout(timer);
      store(request, response);
      if (!settled) { settled = true; resolve(response); }
    }).catch(function () {
      clearTimeout(timer);
      fromCache(request).then(function (hit) {
        if (settled) return;
        settled = true;
        if (hit) return resolve(hit);
        if (request.mode === 'navigate') {
          return caches.open(CACHE).then(function (c) { return c.match(OFFLINE_PAGE); }).then(function (page) {
            page ? resolve(page) : reject(new Error('sin conexión'));
          });
        }
        reject(new Error('sin conexión'));
      });
    });
  });
}

function cacheFirst(request) {
  return fromCache(request).then(function (hit) {
    return hit || fetch(request).then(function (response) { return store(request, response); });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;          // Deezer, iTunes, YouTube, Spotify: directo
  if (url.pathname.indexOf('/descargas/') === 0) return;   // las .apk no se guardan
  if (url.pathname === '/sw.js') return;

  event.respondWith(isStatic(url) ? cacheFirst(request) : networkFirst(request));
});

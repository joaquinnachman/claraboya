/* Claraboya Estudio · Herramientas de producción
   Servicios compartidos: guardado en el navegador (misma forma de uso que tenían las apps),
   descargas, copia de seguridad, parámetros de URL entre herramientas y avisos. */
(function () {
  "use strict";

  var TOOL = document.body.getAttribute('data-tool') || 'herramientas';
  var PREFIX = 'cb.' + TOOL + '.';

  // iPhone: que suene aunque la tecla de silencio esté puesta, como en Android.
  // (Al arrancar pausa la música de otras apps.) El afinador no: usa el micrófono.
  try {
    if (navigator.audioSession && TOOL !== 'afinador' && TOOL !== 'herramientas') navigator.audioSession.type = 'playback';
  } catch (e) { /* nada */ }

  /* ---------- almacenamiento ---------- */
  var hasLS = (function () {
    try { var k = '__cb_test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  })();
  var memory = {};

  function readKey(k) {
    if (hasLS) {
      try { var raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }
      catch (e) { return null; }
    }
    return memory[k] ? JSON.parse(memory[k]) : null;
  }
  function writeKey(k, v) {
    var raw = JSON.stringify(v);
    if (hasLS) {
      try { localStorage.setItem(k, raw); return true; }
      catch (e) {
        toast('No hay más lugar para guardar en este navegador. Descargá una copia y borrá lo que no uses.', true);
        return false;
      }
    }
    memory[k] = raw;
    return true;
  }

  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /* Base de datos local con la misma forma que usaban las apps:
     db.collection(n).doc(id).set/update/delete, .add(), .orderBy(campo, dir).onSnapshot(cb) */
  var listeners = {}; // colección -> [{ field, dir, cb }]

  function collKey(name) { return PREFIX + name; }
  function readColl(name) { return readKey(collKey(name)) || {}; }

  function snapshotFor(name, field, dir) {
    var map = readColl(name);
    var ids = Object.keys(map);
    if (field) {
      ids.sort(function (a, b) {
        var va = map[a][field], vb = map[b][field];
        if (va === vb) return 0;
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        var r = va < vb ? -1 : 1;
        return dir === 'desc' ? -r : r;
      });
    }
    var docs = ids.map(function (id) {
      var data = map[id];
      return { id: id, data: function () { return clone(data); } };
    });
    return { docs: docs, empty: docs.length === 0, size: docs.length };
  }

  var pending = {};
  function notify(name) {
    if (pending[name]) return;
    pending[name] = true;
    setTimeout(function () {
      pending[name] = false;
      (listeners[name] || []).forEach(function (l) {
        try { l.cb(snapshotFor(name, l.field, l.dir)); } catch (e) { if (window.console) console.error(e); }
      });
    }, 0);
  }

  function writeColl(name, map) {
    var ok = writeKey(collKey(name), map);
    notify(name);
    return ok;
  }

  function Collection(name) { this.name = name; }
  Collection.prototype.doc = function (id) {
    var name = this.name;
    return {
      id: id,
      set: function (data) { var m = readColl(name); m[id] = clone(data); writeColl(name, m); return Promise.resolve(); },
      update: function (patch) {
        var m = readColl(name);
        m[id] = Object.assign({}, m[id] || {}, clone(patch));
        writeColl(name, m);
        return Promise.resolve();
      },
      delete: function () { var m = readColl(name); delete m[id]; writeColl(name, m); return Promise.resolve(); },
      get: function () { var m = readColl(name); return Promise.resolve(m[id] ? { id: id, exists: true, data: function () { return clone(m[id]); } } : { id: id, exists: false, data: function () { return undefined; } }); }
    };
  };
  Collection.prototype.add = function (data) {
    var id = genId();
    var m = readColl(this.name);
    m[id] = clone(data);
    writeColl(this.name, m);
    return Promise.resolve({ id: id });
  };
  Collection.prototype.orderBy = function (field, dir) {
    var name = this.name;
    return {
      onSnapshot: function (cb) {
        var l = { field: field, dir: dir || 'asc', cb: cb };
        (listeners[name] = listeners[name] || []).push(l);
        setTimeout(function () { cb(snapshotFor(name, field, l.dir)); }, 0);
        return function unsubscribe() {
          listeners[name] = (listeners[name] || []).filter(function (x) { return x !== l; });
        };
      }
    };
  };
  Collection.prototype.onSnapshot = function (cb) { return this.orderBy(null).onSnapshot(cb); };

  var localDb = { collection: function (name) { return new Collection(name); } };

  // Si la misma herramienta está abierta en otra pestaña, se sincroniza sola.
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf(PREFIX) !== 0) return;
    notify(e.key.slice(PREFIX.length));
  });

  /* ---------- descargas ---------- */
  // nombres de archivo seguros en cualquier sistema: sin tildes, sin símbolos, guiones en vez de espacios
  function safeFilename(name) {
    var m = /^(.*?)(\.[a-z0-9]{2,5})?$/i.exec(String(name || 'archivo'));
    var base = (m[1] || 'archivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 _-]+/g, ' ').trim().replace(/\s+/g, '-').toLowerCase() || 'archivo';
    return base + (m[2] || '').toLowerCase();
  }
  function saveFile(blob, filename) {
    filename = safeFilename(filename);
    // En la APK: se guarda en Descargas/Claraboya con el puente nativo.
    if (window.ClaraboyaNativo && window.ClaraboyaNativo.guardarArchivo) {
      return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function () {
          var b64 = String(reader.result).split(',')[1] || '';
          var msg = window.ClaraboyaNativo.guardarArchivo(b64, filename, blob.type || 'application/octet-stream');
          if (msg) toast(msg, /^No /.test(msg));
          resolve();
        };
        reader.onerror = function () { toast('No se pudo guardar el archivo.', true); resolve(); };
        reader.readAsDataURL(blob);
      });
    }
    // Dentro de Claude (vista previa) las descargas pasan por la plataforma.
    if (window.claude && window.claude.use) {
      return window.claude.use('downloads').then(function (d) {
        if (!d) return anchorDownload(blob, filename);
        return d.save({ filename: filename, data: blob });
      }).catch(function (err) {
        if (err && err.code === 'declined') return;
        return anchorDownload(blob, filename);
      });
    }
    return anchorDownload(blob, filename);
  }
  function anchorDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
    return Promise.resolve();
  }

  /* ---------- compartir ----------
     Abre el menú de compartir del teléfono (WhatsApp, Instagram, etc.).
     En la APK usa el puente nativo; en iPhone y en Chrome, el de la web; si no hay ninguno,
     copia el link (o, si es un archivo, lo guarda). */
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }
  function share(o) {
    var nativo = window.ClaraboyaNativo;
    var cancel = function (e) { if (e && e.name === 'AbortError') return 'cancelado'; throw e; };
    if (o.file) {
      var name = safeFilename(o.name || 'archivo');
      if (nativo && nativo.compartirArchivo) {
        return blobToBase64(o.file).then(function (b64) {
          var r = nativo.compartirArchivo(b64, name, o.file.type || 'application/octet-stream', o.text || '');
          if (r !== 'ok') return saveFile(o.file, name);
          return 'ok';
        });
      }
      var f = null;
      try { f = new File([o.file], name, { type: o.file.type }); } catch (e) { /* nada */ }
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
        return navigator.share({ files: [f], title: o.title || name, text: o.text || '' }).then(function () { return 'ok'; }, cancel);
      }
      return saveFile(o.file, name).then(function () { toast('Lo guardé en el teléfono: mandalo desde ahí.'); return 'guardado'; });
    }
    var full = (o.text || '') + (o.url ? (o.text ? '\n' : '') + o.url : '');
    if (nativo && nativo.compartir) { nativo.compartir(o.title || '', full); return Promise.resolve('ok'); }
    if (navigator.share) return navigator.share({ title: o.title, text: o.text, url: o.url }).then(function () { return 'ok'; }, cancel);
    var copy = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(full) : Promise.reject();
    return copy.then(function () { toast('Link copiado: pegalo donde quieras.'); return 'copiado'; }, function () { window.prompt('Copiá este link:', o.url || full); return 'copiado'; });
  }

  /* ---------- copia de seguridad (exportar / importar) ---------- */
  function ownKeys() {
    var keys = [];
    if (hasLS) {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) keys.push(k);
      }
    } else {
      Object.keys(memory).forEach(function (k) { if (k.indexOf(PREFIX) === 0) keys.push(k); });
    }
    return keys;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function exportData() {
    var data = {};
    ownKeys().forEach(function (k) { data[k.slice(PREFIX.length)] = readKey(k); });
    var payload = { app: 'claraboya-herramientas', tool: TOOL, version: 1, exportedAt: new Date().toISOString(), data: data };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    return saveFile(blob, 'claraboya-' + TOOL + '-' + today() + '.json').then(function () {
      toast('Copia descargada. Guardala: con ella recuperás todo en otro navegador.');
    });
  }
  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var payload;
      try { payload = JSON.parse(reader.result); } catch (e) { toast('Ese archivo no es una copia válida.', true); return; }
      if (!payload || payload.app !== 'claraboya-herramientas' || !payload.data) { toast('Ese archivo no es una copia de estas herramientas.', true); return; }
      if (payload.tool !== TOOL) { toast('Esa copia es de otra herramienta (' + payload.tool + '). Abrila desde esa herramienta.', true); return; }
      confirmBox('Vas a reemplazar lo que tenés guardado en esta herramienta por la copia del ' + (payload.exportedAt || '').slice(0, 10) + '.', 'Restaurar copia').then(function (yes) {
        if (!yes) return;
        ownKeys().forEach(function (k) { if (hasLS) localStorage.removeItem(k); else delete memory[k]; });
        Object.keys(payload.data).forEach(function (name) { writeKey(PREFIX + name, payload.data[name]); });
        toast('Copia restaurada.');
        setTimeout(function () { window.location.reload(); }, 600);
      });
    };
    reader.readAsText(file);
  }

  /* ---------- confirmaciones (propias: los diálogos del navegador no siempre existen) ---------- */
  function confirmBox(message, okLabel) {
    return new Promise(function (resolve) {
      var prevFocus = document.activeElement;
      var wrap = document.createElement('div');
      wrap.className = 'cb-confirm';
      wrap.innerHTML = '<div class="cb-confirm__box" role="alertdialog" aria-modal="true" aria-labelledby="cbConfirmMsg">' +
        '<p class="cb-confirm__msg" id="cbConfirmMsg"></p>' +
        '<div class="cb-confirm__actions"><button type="button" class="btn ghost" data-no>Cancelar</button><button type="button" class="btn primary" data-yes></button></div></div>';
      wrap.querySelector('.cb-confirm__msg').textContent = message;
      wrap.querySelector('[data-yes]').textContent = okLabel || 'Sí, seguir';
      function close(v) {
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(v);
      }
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(false); } }
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap || e.target.hasAttribute('data-no')) close(false);
        else if (e.target.hasAttribute('data-yes')) close(true);
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-yes]').focus();
    });
  }

  /* ---------- avisos ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg, isError) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'cb-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle('is-error', !!isError);
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, isError ? 6000 : 3600);
  }

  /* ---------- parámetros entre herramientas ---------- */
  var params = new URLSearchParams(window.location.search);
  var TOOL_NAMES = {
    'matriz-de-acordes': 'Matriz de acordes',
    'brujula-armonica': 'Brújula armónica',
    'hoja-de-ruta': 'Hoja de ruta',
    'rider-tecnico': 'Rider técnico',
    'armador-de-setlists': 'Armador de setlists',
    'calentamiento-vocal': 'Calentamiento vocal',
    'afinador': 'Afinador',
    'metronomo': 'Metrónomo',
    'buscador-de-bpm': 'Buscador de BPM',
    'piano': 'Piano'
  };
  function toolUrl(slug, query) {
    var qs = '';
    if (query) {
      var p = new URLSearchParams();
      Object.keys(query).forEach(function (k) { if (query[k] !== undefined && query[k] !== null && query[k] !== '') p.set(k, query[k]); });
      qs = p.toString() ? '?' + p.toString() : '';
    }
    // en la vista previa no hay índice de carpetas
    // en la vista previa y en la APK no hay índice de carpetas
    var file = (document.documentElement.getAttribute('data-preview') || document.documentElement.hasAttribute('data-native')) ? 'index.html' : '';
    return '../' + slug + '/' + file + qs;
  }
  // Enlaces "Seguí con" que dependen de lo que el usuario está haciendo: data-next-slug + data-next-query (JSON).
  function setNextLink(key, query) {
    var a = document.querySelector('[data-next="' + key + '"]');
    if (!a) return;
    a.href = toolUrl(a.getAttribute('data-next-slug'), query);
  }

  /* ---------- pie: exportar / importar ---------- */
  document.addEventListener('click', function (e) {
    var exp = e.target.closest('[data-cb-export]');
    if (exp) { e.preventDefault(); exportData(); return; }
    var imp = e.target.closest('[data-cb-import]');
    if (imp) {
      e.preventDefault();
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'application/json,.json';
      input.addEventListener('change', function () { if (input.files && input.files[0]) importData(input.files[0]); });
      input.click();
    }
  });
  if (!hasLS) {
    document.querySelectorAll('[data-cb-storage-note]').forEach(function (el) {
      el.innerHTML = '<strong>Este navegador no permite guardar</strong> (modo privado o sin permisos): lo que hagas se pierde al cerrar la página.';
    });
  }

  window.CB = {
    tool: TOOL,
    persistent: hasLS,
    db: function () { return Promise.resolve(localDb); },
    saveFile: saveFile,
    share: share,
    toast: toast,
    confirm: confirmBox,
    params: params,
    toolUrl: toolUrl,
    toolName: function (slug) { return TOOL_NAMES[slug] || ''; },
    setNextLink: setNextLink,
    // marcas simples por herramienta (p. ej. "ya cargué los ejemplos una vez")
    flag: function (name, val) {
      var k = PREFIX + 'flag.' + name;
      if (val === undefined) return readKey(k);
      writeKey(k, val);
    },
    // borradores: lo que estás armando sobrevive si saltás a otra herramienta y volvés
    draft: function (name, val) {
      var k = PREFIX + 'draft.' + name;
      if (val === undefined) return readKey(k);
      if (val === null) { if (hasLS) { try { localStorage.removeItem(k); } catch (e) {} } else delete memory[k]; return; }
      writeKey(k, val);
    },
    exportData: exportData,
    storageLabel: hasLS ? 'guardado en este navegador' : 'sin guardado en este navegador'
  };

  /* ---------- WhatsApp flotante ---------- */
  (function () {
    var dock = document.getElementById('waDock');
    if (!dock) return;
    var bubble = document.getElementById('waBubble');
    var close = document.getElementById('waClose');
    var KEY = 'cb.waBubbleClosed';
    try { if (sessionStorage.getItem(KEY) === '1' && bubble) bubble.hidden = true; } catch (e) {}
    if (close) close.addEventListener('click', function () {
      bubble.hidden = true;
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    });
    var band = document.querySelector('.tf__cta');
    if (band && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        dock.classList.toggle('is-away', entries[0].isIntersecting);
      }).observe(band);
    }
  })();

  /* ---------- menú de herramientas: mostrar la actual aunque el menú tenga scroll ---------- */
  (function () {
    var cur = document.querySelector('.tn__tools a[aria-current="page"]');
    if (!cur) return;
    var bar = cur.parentNode;
    if (cur.offsetLeft + cur.offsetWidth > bar.clientWidth + bar.scrollLeft) bar.scrollLeft = cur.offsetLeft - 24;
  })();
})();

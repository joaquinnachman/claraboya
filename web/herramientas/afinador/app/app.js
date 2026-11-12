/* Claraboya Afinador — lógica de la app */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var INS = window.INSTRUMENTS;

  // ---------------------------------------------------------------- estado
  var KEY = 'claraboya-afinador-v1';
  var MIC_OK = 'claraboya-afinador-mic';
  var S = {
    ins: 'guitarra', tun: {}, a4: 440, notation: 'en', tol: '3', sens: 'mid', speed: 'normal',
    capo: {}, custom: {}
  };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) for (var k in saved) S[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function instrument() { for (var i = 0; i < INS.length; i++) if (INS[i].id === S.ins) return INS[i]; return INS[0]; }
  function allTunings(ins) { return ins.tunings.concat(S.custom[ins.id] || []); }
  function tuning() {
    var ins = instrument(), list = allTunings(ins), id = S.tun[ins.id];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  function capo() { var ins = instrument(); return ins.fretted ? (S.capo[ins.id] || 0) : 0; }

  // ---------------------------------------------------------------- notas
  var NAMES = {
    en: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    enb: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    es: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
    esb: ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si']
  };
  function nameOf(midi, flats) {
    var m = Math.round(midi), pc = ((m % 12) + 12) % 12;
    var s = NAMES[S.notation + (flats ? 'b' : '')][pc], acc = '';
    if (s.slice(-1) === '#') { acc = '♯'; s = s.slice(0, -1); }
    else if (s.length > 1 && s.slice(-1) === 'b') { acc = '♭'; s = s.slice(0, -1); }
    return { base: s, acc: acc, oct: Math.floor(m / 12) - 1, text: s + acc };
  }
  function noteHTML(midi, flats, withOct) {
    var n = nameOf(midi, flats);
    return n.base + (n.acc ? '<span class="acc">' + n.acc + '</span>' : '') + (withOct ? '<sup>' + n.oct + '</sup>' : '');
  }
  function freqOf(midi) { return S.a4 * Math.pow(2, (midi - 69) / 12); }
  function midiOf(f) { return 69 + 12 * Math.log2(f / S.a4); }

  // ---------------------------------------------------------------- medidor (SVG)
  var MW = 560, MH = 270, PX = 280, PY = 330, R = 250, SPAN = 46; // ±50 cents → ±46°
  var needleEl, lampEl, lampGlow, zoneEl, stripEl;
  function polar(r, deg) { var a = (deg - 90) * Math.PI / 180; return [PX + r * Math.cos(a), PY + r * Math.sin(a)]; }
  function arcPath(r, d0, d1) {
    var p0 = polar(r, d0), p1 = polar(r, d1);
    return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
  }
  function c2deg(c) { return Math.max(-1, Math.min(1, c / 50)) * SPAN; }
  function buildMeter() {
    var s = '<svg viewBox="0 0 ' + MW + ' ' + MH + '" aria-hidden="true">' +
      '<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2DFD6"/><stop offset="1" stop-color="#C9C5BA"/></linearGradient>' +
      '<radialGradient id="lg"><stop offset="0" stop-color="#ff5a60"/><stop offset=".55" stop-color="#D8343B"/><stop offset="1" stop-color="#8a1a1f"/></radialGradient>' +
      '<filter id="gl" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<clipPath id="fc"><rect x="6" y="6" width="' + (MW - 12) + '" height="' + (MH - 12) + '" rx="20"/></clipPath></defs>' +
      '<rect x="0" y="0" width="' + MW + '" height="' + MH + '" rx="26" fill="#2b3134"/>' +
      '<rect x="6" y="6" width="' + (MW - 12) + '" height="' + (MH - 12) + '" rx="20" fill="url(#fg)"/>' +
      '<g clip-path="url(#fc)">' +
      '<path id="zone" d="" stroke="#551112" stroke-width="16" fill="none"/>' +
      '<path d="' + arcPath(R, -SPAN, SPAN) + '" stroke="#1B1C1C" stroke-width="3" fill="none"/>';
    for (var c = -50; c <= 50; c += 5) {
      var major = c % 25 === 0, mid = c % 10 === 0;
      var len = major ? 26 : (mid ? 17 : 10), d = c2deg(c);
      var a = polar(R - 2, d), b = polar(R + len, d);
      s += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="#1B1C1C" stroke-width="' + (major ? 4 : 2.5) + '" stroke-linecap="round"/>';
      if (major) {
        var t = polar(R + 46, d);
        s += '<text x="' + t[0].toFixed(1) + '" y="' + (t[1] + 7).toFixed(1) + '" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="20" fill="#1B1C1C">' + (c > 0 ? '+' : '') + c + '</text>';
      }
    }
    var fl = polar(R - 40, -SPAN + 5), sh = polar(R - 40, SPAN - 5);
    s += '<text x="' + fl[0] + '" y="' + (fl[1] + 10) + '" text-anchor="middle" font-family="Bebas Neue" font-size="34" fill="#1B1C1C">♭</text>' +
      '<text x="' + sh[0] + '" y="' + (sh[1] + 10) + '" text-anchor="middle" font-family="Bebas Neue" font-size="34" fill="#1B1C1C">♯</text>' +
      '<text x="' + PX + '" y="186" text-anchor="middle" font-family="Bebas Neue" font-size="40" letter-spacing="3" fill="#1B1C1C">CENTS</text>' +
      // lámpara
      '<circle cx="508" cy="44" r="20" fill="#6b1418" opacity="0" id="lampGlow" filter="url(#gl)"/>' +
      '<circle cx="508" cy="44" r="13" fill="#3a1012" stroke="#1B1C1C" stroke-width="3" id="lamp"/>' +
      '<text x="510" y="80" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="11" letter-spacing="1.5" fill="#1B1C1C">AFINADA</text>' +
      '<text x="30" y="51" font-family="Bebas Neue" font-size="24" letter-spacing="3" fill="#1B1C1C">CLARABOYA</text>' +
      // aguja
      '<g id="needle"><line x1="' + (PX + 4) + '" y1="' + (PY - 98) + '" x2="' + (PX + 4) + '" y2="' + (PY - R - 14) + '" stroke="rgba(0,0,0,.22)" stroke-width="6" stroke-linecap="round"/>' +
      '<line x1="' + PX + '" y1="' + (PY - 98) + '" x2="' + PX + '" y2="' + (PY - R - 16) + '" stroke="#141515" stroke-width="5" stroke-linecap="round" id="needleLine"/></g>' +
      // franja inferior
      '<rect x="0" y="' + (MH - 58) + '" width="' + MW + '" height="58" fill="#3a3f42"/>' +
      '<text id="strip" x="' + PX + '" y="' + (MH - 22) + '" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="17" letter-spacing="5" fill="#D9D9D9">GUITARRA · AUTO</text>' +
      '</g>' +
      '<rect x="6" y="6" width="' + (MW - 12) + '" height="' + (MH - 12) + '" rx="20" fill="none" stroke="#1B1C1C" stroke-width="5"/>' +
      '</svg>';
    $('meter').innerHTML = s;
    needleEl = $('meter').querySelector('#needle');
    lampEl = $('meter').querySelector('#lamp');
    lampGlow = $('meter').querySelector('#lampGlow');
    zoneEl = $('meter').querySelector('#zone');
    stripEl = $('meter').querySelector('#strip');
    updateZone();
  }
  function updateZone() {
    var t = +S.tol; zoneEl.setAttribute('d', arcPath(R - 12, c2deg(-t) - 0.6, c2deg(t) + 0.6));
  }

  // ---------------------------------------------------------------- UI: cuerdas
  var done = [], progress = [], locked = -1, autoIdx = -1;
  function targets() {
    var t = tuning(), cp = capo();
    return t.notes.map(function (n, i) {
      var alts = [n + cp];
      if (t.alt && t.alt[i] != null) alts.push(t.alt[i] + cp);
      return alts;
    });
  }
  function renderStrings() {
    var ins = instrument(), t = tuning(), cp = capo(), box = $('strings');
    if (ins.chromatic) { box.innerHTML = '<div class="chromnote">MODO CROMÁTICO · CUALQUIER NOTA</div>'; return; }
    box.className = 'strings' + (t.notes.length > 6 ? ' many' : '');
    var h = '';
    t.notes.forEach(function (n, i) {
      var cls = 'str' + (done[i] ? ' done' : '') + (i === locked ? ' locked' : '');
      h += '<button class="' + cls + '" data-i="' + i + '">' +
        '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>' +
        '<span class="n">' + noteHTML(n + cp, t.flats, false) + '<sup>' + nameOf(n + cp).oct + '</sup></span>' +
        '<span class="k">' + ins.labels[i] + 'ª</span><span class="pr"><i></i></span></button>';
    });
    box.innerHTML = h;
  }
  function paintStrings() {
    var els = $('strings').querySelectorAll('.str');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      e.classList.toggle('done', !!done[i]);
      e.classList.toggle('locked', i === locked);
      e.classList.toggle('target', i === curTarget && !done[i]);
      e.querySelector('.pr i').style.width = Math.min(100, (progress[i] || 0) * 100) + '%';
    }
  }
  function resetDone() { done = []; progress = []; paintStrings(); }

  function renderHeader() {
    var ins = instrument(), t = tuning(), cp = capo();
    $('insName').textContent = ins.name.toUpperCase() + (cp ? ' · CEJILLA ' + cp : '');
    $('tunName').textContent = t.name.toUpperCase();
    $('a4Txt').textContent = S.a4;
    var mb = $('btnMode');
    if (ins.chromatic) { mb.classList.add('on'); $('modeTxt').textContent = 'LIBRE'; $('modeSub').textContent = 'CROMÁTICO'; }
    else if (locked >= 0) { mb.classList.remove('on'); $('modeTxt').textContent = 'MANUAL'; $('modeSub').textContent = 'CUERDA ' + ins.labels[locked]; }
    else { mb.classList.add('on'); $('modeTxt').textContent = 'AUTO'; $('modeSub').textContent = 'DETECTA'; }
    if (stripEl) stripEl.textContent = (ins.name + ' · ' + (ins.chromatic ? 'CROMÁTICO' : (locked >= 0 ? 'CUERDA ' + ins.labels[locked] : 'AUTO')) + ' · LA ' + S.a4).toUpperCase();
  }
  function renderAll() { renderHeader(); renderStrings(); paintStrings(); }

  $('strings').addEventListener('click', function (e) {
    var b = e.target.closest('.str'); if (!b) return;
    var i = +b.dataset.i;
    locked = locked === i ? -1 : i;
    resetHistory();
    renderHeader(); paintStrings();
    if (locked >= 0) playRef(targets()[i][0]);
  });
  $('btnMode').addEventListener('click', function () {
    if (instrument().chromatic) return;
    if (locked >= 0) locked = -1; else locked = curTarget >= 0 ? curTarget : 0;
    resetHistory(); renderHeader(); paintStrings();
  });
  $('btnReset').addEventListener('click', function () { resetDone(); toast('CUERDAS REINICIADAS'); });
  $('btnRef').addEventListener('click', function () {
    var ins = instrument();
    if (ins.chromatic) { playRef(lastMidi != null ? Math.round(lastMidi) : 69); return; }
    var i = locked >= 0 ? locked : (curTarget >= 0 ? curTarget : 0);
    playRef(targets()[i][0]);
  });

  // ---------------------------------------------------------------- sheets
  var openSheet = null;
  function showSheet(id) {
    closeSheet(true);
    openSheet = $(id); openSheet.classList.add('show'); $('scrim').classList.add('show');
  }
  function closeSheet(quiet) {
    if (openSheet) openSheet.classList.remove('show');
    openSheet = null; if (!quiet) $('scrim').classList.remove('show');
    if (quiet) $('scrim').classList.remove('show');
  }
  $('scrim').addEventListener('click', function () { closeSheet(); });
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeSheet(); }); });

  // --- afinaciones
  var browsing = null;
  function notesText(notes, flats, alt) {
    return notes.map(function (n, i) {
      var s = nameOf(n, flats).text; if (alt && alt[i] != null) s += '/' + nameOf(alt[i], flats).text; return s;
    }).join(' ');
  }
  function renderChips() {
    $('chips').innerHTML = INS.map(function (ins) {
      return '<button class="chip' + (ins.id === browsing ? ' on' : '') + '" data-ins="' + ins.id + '">' + ins.name.toUpperCase() + '</button>';
    }).join('');
    var on = $('chips').querySelector('.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function renderTuningList() {
    var ins = null; for (var i = 0; i < INS.length; i++) if (INS[i].id === browsing) ins = INS[i];
    var cur = S.ins === ins.id ? tuning().id : null;
    var h = '', group = null;
    ins.tunings.forEach(function (t) {
      if (t.group !== group) { group = t.group; h += '<div class="group">' + group + '</div>'; }
      h += '<button class="row' + (t.id === cur ? ' on' : '') + '" data-tun="' + t.id + '"><span class="nm">' + t.name.toUpperCase() + '</span>' +
        '<span class="ns">' + (ins.chromatic ? 'TODAS' : notesText(t.notes, t.flats, t.alt)) + '</span></button>';
    });
    if (!ins.chromatic) {
      var mine = S.custom[ins.id] || [];
      h += '<div class="group">Mis afinaciones</div>';
      mine.forEach(function (t) {
        h += '<div class="row' + (t.id === cur ? ' on' : '') + '" data-tun="' + t.id + '" role="button"><span class="nm">' + esc(t.name).toUpperCase() + '</span>' +
          '<span class="ns">' + notesText(t.notes, t.flats) + '</span>' +
          '<button class="del" data-edit="' + t.id + '" aria-label="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>' +
          '<button class="del" data-del="' + t.id + '" aria-label="Borrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button></div>';
      });
      h += '<button class="addrow" data-new="1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>CREAR AFINACIÓN</button>';
    }
    $('tuningList').innerHTML = h;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  $('btnTuning').addEventListener('click', function () { browsing = S.ins; renderChips(); renderTuningList(); showSheet('sheetTuning'); });
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    browsing = b.dataset.ins; renderChips(); renderTuningList(); $('tuningList').scrollTop = 0;
    if (INS.filter(function (i) { return i.id === browsing; })[0].chromatic) { selectTuning(browsing, 'libre'); closeSheet(); }
  });
  $('tuningList').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del]'), ed = e.target.closest('[data-edit]');
    if (del) {
      e.stopPropagation();
      var list = S.custom[browsing] || [], t = list.filter(function (x) { return x.id === del.dataset.del; })[0];
      if (t && confirm('¿Borrar la afinación "' + t.name + '"?')) {
        S.custom[browsing] = list.filter(function (x) { return x !== t; });
        if (S.tun[browsing] === t.id) delete S.tun[browsing];
        save(); renderTuningList(); if (browsing === S.ins) { resetDone(); renderAll(); }
      }
      return;
    }
    if (ed) { e.stopPropagation(); openEditor(browsing, ed.dataset.edit); return; }
    if (e.target.closest('[data-new]')) { openEditor(browsing, null); return; }
    var r = e.target.closest('[data-tun]'); if (!r) return;
    selectTuning(browsing, r.dataset.tun); closeSheet();
  });
  function selectTuning(insId, tunId) {
    var changed = S.ins !== insId || S.tun[insId] !== tunId;
    S.ins = insId; S.tun[insId] = tunId; save();
    if (changed) { locked = -1; resetDone(); resetHistory(); configureRange(); }
    renderAll();
  }

  // --- editor de afinaciones
  var ed = null;
  function openEditor(insId, tunId) {
    var ins = INS.filter(function (i) { return i.id === insId; })[0];
    var base = null;
    if (tunId) base = (S.custom[insId] || []).filter(function (t) { return t.id === tunId; })[0];
    var from = base || (S.ins === insId ? tuning() : ins.tunings[0]);
    ed = { ins: ins, id: tunId, notes: from.notes.slice(), flats: !!from.flats };
    $('edTitle').firstChild.nodeValue = tunId ? 'EDITAR AFINACIÓN' : 'NUEVA AFINACIÓN';
    $('edName').value = base ? base.name : '';
    renderEditor();
    showSheet('sheetEditor');
  }
  function renderEditor() {
    $('edStrings').innerHTML = ed.notes.map(function (n, i) {
      return '<div class="ed-str"><span class="k">CUERDA ' + ed.ins.labels[i] + '</span>' +
        '<button data-st="' + i + '" data-d="-1">−</button><span class="v">' + nameOf(n, ed.flats).text + '<small>' + nameOf(n).oct + '</small></span>' +
        '<button data-st="' + i + '" data-d="1">+</button>' +
        '<button class="play" data-pl="' + i + '" aria-label="Escuchar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg></button></div>';
    }).join('');
  }
  $('edStrings').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.pl != null) { playRef(ed.notes[+b.dataset.pl] + (ed.ins.fretted ? (S.capo[ed.ins.id] || 0) : 0)); return; }
    var i = +b.dataset.st; ed.notes[i] = Math.max(12, Math.min(100, ed.notes[i] + +b.dataset.d)); renderEditor();
  });
  $('edSave').addEventListener('click', function () {
    var name = $('edName').value.trim() || ('Personal ' + notesText(ed.notes, ed.flats));
    var list = S.custom[ed.ins.id] = S.custom[ed.ins.id] || [];
    var t;
    if (ed.id) { t = list.filter(function (x) { return x.id === ed.id; })[0]; t.name = name; t.notes = ed.notes.slice(); t.flats = ed.flats; }
    else { t = { id: 'c' + Date.now(), name: name, group: 'Mis afinaciones', notes: ed.notes.slice(), flats: ed.flats, custom: true }; list.push(t); }
    save(); closeSheet();
    S.tun[ed.ins.id] = null; selectTuning(ed.ins.id, t.id);
    toast('AFINACIÓN GUARDADA');
  });

  // --- ajustes
  function renderSettings() {
    $('a4Val').textContent = S.a4;
    document.querySelectorAll('#a4Quick button').forEach(function (b) { b.classList.toggle('on', +b.dataset.a4set === S.a4); });
    var ins = instrument();
    $('setCapo').style.display = ins.fretted ? '' : 'none';
    var cp = capo(); $('capoVal').textContent = cp;
    $('capoHint').textContent = cp ? 'Las cuerdas suenan ' + cp + (cp === 1 ? ' semitono' : ' semitonos') + ' más arriba' : 'Sin cejilla';
    document.querySelectorAll('[data-seg]').forEach(function (g) {
      g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', String(S[g.dataset.seg]) === b.dataset.v); });
    });
  }
  function openSettings() { renderSettings(); showSheet('sheetSettings'); }
  $('btnSettings').addEventListener('click', openSettings);
  $('btnA4').addEventListener('click', openSettings);
  $('sheetSettings').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a4) S.a4 = Math.max(415, Math.min(466, S.a4 + +b.dataset.a4));
    else if (b.dataset.a4set) S.a4 = +b.dataset.a4set;
    else if (b.dataset.capo) { var ins = instrument(); S.capo[ins.id] = Math.max(0, Math.min(9, capo() + +b.dataset.capo)); }
    else if (b.dataset.v && b.parentNode.dataset.seg) { S[b.parentNode.dataset.seg] = b.dataset.v; }
    else return;
    save(); renderSettings();
    if (b.dataset.a4 || b.dataset.a4set || b.dataset.capo) { resetDone(); resetHistory(); configureRange(); }
    updateZone(); renderAll();
  });

  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 1800); }

  // ---------------------------------------------------------------- audio
  var ctx, analyser, raw, D = 2, rate = 24000, N = 2048, fmin = 60, fmax = 1400, stream, mutedUntil = 0;
  function configureRange() {
    var ins = instrument(), t = tuning();
    if (ins.chromatic || !t.notes.length) { fmin = 26; fmax = 1600; N = 4096; return; }
    var all = []; targets().forEach(function (a) { all = all.concat(a); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (locked >= 0) { lo = Math.min.apply(null, targets()[locked]); hi = Math.max.apply(null, targets()[locked]); }
    fmin = Math.max(24, freqOf(lo) / 1.5); fmax = Math.min(1700, freqOf(hi) * 1.6);
    N = fmin < 70 ? 4096 : 2048;
  }
  function startAudio() {
    var msg = $('startMsg');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.innerHTML = '<span class="err">Este navegador no permite usar el micrófono. Probá con Chrome, Firefox o Safari actualizados.</span>'; return; }
    msg.textContent = 'Pidiendo permiso para usar el micrófono…';
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } })
      .then(function (s) {
        stream = s;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!ctx) ctx = new AC({ latencyHint: 'interactive' });
        if (ctx.state === 'suspended') ctx.resume();
        D = Math.max(1, Math.round(ctx.sampleRate / 24000)); rate = ctx.sampleRate / D;
        var src = ctx.createMediaStreamSource(s);
        var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 22; hp.Q.value = 0.6;
        var lp1 = ctx.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = rate * 0.36; lp1.Q.value = 0.54;
        var lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = rate * 0.36; lp2.Q.value = 1.31;
        analyser = ctx.createAnalyser();
        var need = 4096 * D, fs = 2048; while (fs < need) fs <<= 1; analyser.fftSize = Math.min(32768, fs);
        analyser.smoothingTimeConstant = 0;
        src.connect(hp); hp.connect(lp1); lp1.connect(lp2); lp2.connect(analyser);
        raw = new Float32Array(analyser.fftSize);
        configureRange();
        try { localStorage.setItem(MIC_OK, '1'); } catch (e) { /* nada */ }
        // sin un toque, algunos teléfonos dejan el audio en pausa: ahí se pide el toque
        setTimeout(function () {
          if (ctx.state !== 'running') { $('start').classList.remove('hide'); msg.textContent = 'Tocá para empezar a afinar.'; }
        }, 400);
        $('start').classList.add('hide');
        s.getAudioTracks()[0].addEventListener('ended', function () { $('start').classList.remove('hide'); msg.textContent = 'Se cortó el micrófono. Tocá para volver a activarlo.'; });
      })
      .catch(function (err) {
        msg.innerHTML = '<span class="err">No pude usar el micrófono.</span><br>Fijate que el navegador tenga permiso para usar el micrófono (el candado o el ícono al lado de la dirección) y tocá el botón otra vez.';
        console.warn(err);
      });
  }
  $('btnStart').addEventListener('click', function () {
    if (stream && ctx && stream.active) { ctx.resume(); $('start').classList.add('hide'); return; }
    startAudio();
  });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  // --- tono de referencia
  var refVoice = null;
  function playRef(midi) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    if (refVoice) { try { refVoice.g.gain.cancelScheduledValues(ctx.currentTime); refVoice.g.gain.setTargetAtTime(0, ctx.currentTime, 0.02); refVoice.o.stop(ctx.currentTime + 0.1); } catch (e) {} }
    var f = freqOf(midi), now = ctx.currentTime;
    var H = Math.max(2, Math.min(16, Math.floor(6000 / f)));
    var re = new Float32Array(H + 1), im = new Float32Array(H + 1);
    for (var h = 1; h <= H; h++) im[h] = (f < 120 && h === 1 ? 0.7 : 1) / Math.pow(h, 1.35);
    var o = ctx.createOscillator(); o.setPeriodicWave(ctx.createPeriodicWave(re, im)); o.frequency.value = f;
    var g = ctx.createGain(); g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.008); g.gain.setTargetAtTime(0, now + 0.05, 0.75);
    o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 3.2);
    refVoice = { o: o, g: g };
    mutedUntil = performance.now() + 3300;
    var b = $('btnRef'); b.classList.add('playing'); $('refTxt').textContent = nameOf(midi, tuning().flats).text + nameOf(midi).oct;
    clearTimeout(playRef.t); playRef.t = setTimeout(function () { b.classList.remove('playing'); $('refTxt').textContent = 'REFERENCIA'; }, 2600);
    o.onended = function () { if (refVoice && refVoice.o === o) { refVoice = null; mutedUntil = performance.now() + 120; } };
  }

  // ---------------------------------------------------------------- análisis
  var hist = [], pending = [], lastValid = 0, lastMidi = null, noise = 0.002, curTarget = -1, inTune = 0;
  function resetHistory() { hist = []; pending = []; inTune = 0; configureRange(); }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); var m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
  var SENS = { low: [0.012, 0.9], mid: [0.0045, 0.86], high: [0.0018, 0.8] };
  var KEEP = { smooth: 9, normal: 5, fast: 3 };
  var dec = new Float64Array(8192);

  function analyse() {
    analyser.getFloatTimeDomainData(raw);
    var L = raw.length, start = L - N * D, sumsq = 0;
    for (var i = 0; i < N; i++) { var v = raw[start + i * D]; dec[i] = v; sumsq += v * v; }
    var rms = Math.sqrt(sumsq / N);
    // nivel
    var db = 20 * Math.log10(rms + 1e-9);
    $('lvl').style.width = Math.max(0, Math.min(100, (db + 60) / 50 * 100)) + '%';
    if (rms < noise) noise = rms; else noise += (rms - noise) * 0.004;
    var sens = SENS[S.sens] || SENS.mid;
    if (performance.now() < mutedUntil) return null;
    if (rms < Math.max(sens[0], noise * 2.6)) return null;
    var r = Pitch.detect(dec.subarray(0, N), rate, fmin, fmax);
    if (!r.freq || r.clarity < sens[1]) return null;
    return midiOf(r.freq);
  }

  function pickTarget(m) {
    var ins = instrument();
    if (ins.chromatic) return { idx: -1, midi: Math.round(m) };
    var T = targets();
    function nearest(alts) { var best = alts[0]; alts.forEach(function (a) { if (Math.abs(a - m) < Math.abs(best - m)) best = a; }); return best; }
    if (locked >= 0) return { idx: locked, midi: nearest(T[locked]) };
    var bi = -1, bd = Infinity;
    T.forEach(function (alts, i) {
      var d = Math.abs(nearest(alts) - m) - (i === autoIdx ? 0.35 : 0);
      if (d < bd) { bd = d; bi = i; }
    });
    autoIdx = bi;
    return { idx: bi, midi: nearest(T[bi]) };
  }

  var view = { cents: 0, vel: 0, active: false };
  var lastT = performance.now(), lastAnalyse = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (analyser && now - lastAnalyse > 28 && ctx.state === 'running') {
      lastAnalyse = now;
      var m = analyse();
      if (m != null) {
        var keep = KEEP[S.speed] || 5;
        if (hist.length && Math.abs(m - median(hist)) > 0.6) {
          pending.push(m);
          if (pending.length >= 2) {
            var p = pending.slice(-2);
            if (Math.abs(p[0] - p[1]) < 0.3) { hist = p; pending = []; } else pending = [m];
          }
        } else { hist.push(m); pending = []; if (hist.length > keep) hist.shift(); }
        if (hist.length) { lastValid = now; lastMidi = median(hist); }
      }
    }
    var active = lastMidi != null && now - lastValid < 1300;
    var fresh = lastMidi != null && now - lastValid < 250;
    if (!active && hist.length) { hist = []; pending = []; }
    update(active, fresh, dt);
    requestAnimationFrame(frame);
  }

  var noteEl = $('note'), octEl = $('oct'), hintEl = $('hint'), hzEl = $('hz'), centsEl = $('cents'), tgtEl = $('tgt');
  var lastNoteKey = '', lastHint = '', lastLamp = null;
  function update(active, fresh, dt) {
    var ins = instrument(), t = tuning(), tol = +S.tol;
    var targetC = 0, ok = false;
    if (active) {
      var tg = pickTarget(lastMidi);
      var cents = (lastMidi - tg.midi) * 100;
      targetC = cents;
      ok = Math.abs(cents) <= tol;
      if (tg.idx !== curTarget) { curTarget = tg.idx; paintStrings(); }
      var key = tg.midi + '|' + S.notation + '|' + t.flats;
      if (key !== lastNoteKey) {
        lastNoteKey = key;
        var nn = nameOf(tg.midi, t.flats);
        noteEl.innerHTML = nn.base + (nn.acc ? '<span class="acc">' + nn.acc + '</span>' : '');
        octEl.textContent = nn.oct;
      }
      noteEl.className = 'note' + (ok ? ' ok' : '');
      var f = freqOf(lastMidi);
      hzEl.innerHTML = '<b>' + f.toFixed(f < 100 ? 2 : 1) + '</b> Hz';
      centsEl.innerHTML = '<b>' + (cents >= 0 ? '+' : '−') + Math.abs(cents).toFixed(1) + '</b> cents';
      if (!ins.chromatic) {
        var heard = nameOf(lastMidi, t.flats);
        tgtEl.innerHTML = 'Escucho <b>' + heard.text + heard.oct + '</b>';
      } else tgtEl.textContent = '';
      var h, cls;
      var fem = !ins.chromatic;
      if (ok) { h = fem ? 'AFINADA' : 'AFINADO'; cls = 'ok'; }
      else {
        var st = Math.round(Math.abs(cents) / 100);
        var more = st >= 1 ? ' · ' + st + (st === 1 ? ' SEMITONO' : ' SEMITONOS') : '';
        if (cents < 0) { h = 'SUBÍ ▲' + more; cls = 'flat'; } else { h = '▼ BAJÁ' + more; cls = 'sharp'; }
      }
      if (h !== lastHint) { lastHint = h; hintEl.textContent = h; hintEl.className = 'hint ' + cls; }
      // marcar cuerda afinada
      if (!ins.chromatic && tg.idx >= 0 && fresh) {
        var i = tg.idx;
        if (ok) {
          if (!done[i]) {
            progress[i] = (progress[i] || 0) + dt / 0.6;
            if (progress[i] >= 1) {
              done[i] = true; progress[i] = 0;
              buzz(18);
              if (t.notes.every(function (_, k) { return done[k]; })) { toast(ins.name.toUpperCase() + ' AFINADA ✓'); setTimeout(function () { buzz(40); }, 160); }
            }
            paintStrings();
          }
        } else if (progress[i]) { progress[i] = Math.max(0, progress[i] - dt * 2); paintStrings(); }
      }
    } else {
      if (lastHint !== 'idle') {
        lastHint = 'idle'; lastNoteKey = '';
        hintEl.textContent = ins.chromatic ? 'TOCÁ UNA NOTA' : 'TOCÁ UNA CUERDA'; hintEl.className = 'hint idle';
        noteEl.className = 'note idle';
        if (locked >= 0 && !ins.chromatic) { var nn2 = nameOf(targets()[locked][0], t.flats); noteEl.innerHTML = nn2.base + (nn2.acc ? '<span class="acc">' + nn2.acc + '</span>' : ''); octEl.textContent = nn2.oct; }
        else { noteEl.textContent = '–'; octEl.textContent = ''; }
        hzEl.textContent = '— Hz'; centsEl.textContent = ''; tgtEl.textContent = '';
        if (curTarget !== -1 && locked < 0) { curTarget = -1; paintStrings(); }
      }
    }
    // aguja con resorte (amortiguada)
    var goal = active ? Math.max(-55, Math.min(55, targetC)) : -55;
    var kSp = S.speed === 'fast' ? 260 : (S.speed === 'smooth' ? 70 : 140), damp = 2 * Math.sqrt(kSp) * 0.95;
    var steps = 4, h2 = dt / steps;
    for (var s = 0; s < steps; s++) { var acc = kSp * (goal - view.cents) - damp * view.vel; view.vel += acc * h2; view.cents += view.vel * h2; }
    var deg = Math.max(-SPAN - 4, Math.min(SPAN + 4, view.cents / 50 * SPAN));
    needleEl.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ' ' + PX + ' ' + PY + ')');
    var lamp = active && ok;
    if (lamp !== lastLamp) {
      lastLamp = lamp;
      lampEl.setAttribute('fill', lamp ? 'url(#lg)' : '#3a1012');
      lampGlow.setAttribute('opacity', lamp ? '1' : '0');
      lampGlow.setAttribute('fill', lamp ? '#ff3b42' : '#6b1418');
      $('meter').querySelector('#needleLine').setAttribute('stroke', lamp ? '#9c1d23' : '#141515');
    }
  }

  // ---------------------------------------------------------------- vibración (en la app)
  function buzz(ms) {
    try {
      var A = window.self !== window.top && window.parent.CBApp;
      if (A && A.haptic) A.haptic(ms); else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* nada */ }
  }

  // ---------------------------------------------------------------- botón atrás de Android
  // Dentro de la app de Claraboya el botón atrás lo maneja la página de afuera: le avisa acá para cerrar una hoja.
  window.CBCerrarCapa = function () { if (openSheet) { closeSheet(); return true; } return false; };
  try {
    var App = window.self === window.top && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App) App.addListener('backButton', function () {
      if (openSheet) closeSheet(); else if (App.minimizeApp) App.minimizeApp(); else App.exitApp();
    });
  } catch (e) {}

  // ---------------------------------------------------------------- arranque
  buildMeter();
  renderAll();
  requestAnimationFrame(frame);
  // en la app: si ya diste permiso alguna vez, el micrófono arranca solo
  try {
    if (document.documentElement.classList.contains('en-app') && localStorage.getItem(MIC_OK)) startAudio();
  } catch (e) { /* nada */ }
  window.__afinador = { S: S, targets: targets }; // para pruebas
})();

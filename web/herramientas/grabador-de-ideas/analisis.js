/* Grabador de ideas · tono y BPM aproximados de una grabación.
   Todo se calcula en el teléfono, sin mandar el audio a ningún lado.
   Entrada: muestras mono (Float32Array) y su frecuencia de muestreo (lo ideal: 11025 Hz).
   window.CBAnalisis = { tono(x, sr), bpm(x, sr) } */
(function (root) {
  'use strict';

  // FFT radix-2 en el lugar (re/im del mismo largo, potencia de 2)
  function fft(re, im) {
    var n = re.length, i, j, k, len, t;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < half; k++) {
          var a = i + k, b = a + half;
          var xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  function hann(n) { var w = new Float64Array(n); for (var i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); return w; }

  /* ---------- tono (Krumhansl-Schmuckler sobre el croma del audio) ---------- */
  var MAYOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  var MENOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function croma(x, sr) {
    var N = 4096, hop = 2048, w = hann(N), re = new Float64Array(N), im = new Float64Array(N);
    var pc = new Int8Array(N / 2).fill(-1), c = new Float64Array(12), k, i;
    for (k = 1; k < N / 2; k++) {
      var f = k * sr / N;
      if (f < 60 || f > 1800) continue;
      pc[k] = (((Math.round(69 + 12 * Math.log2(f / 440))) % 12) + 12) % 12;
    }
    // umbral de silencio relativo a la parte más fuerte de la grabación
    var peak = 0; for (i = 0; i < x.length; i++) { var v = Math.abs(x[i]); if (v > peak) peak = v; }
    var gate = Math.pow(peak * 0.05, 2) * N;
    var mags = new Float64Array(N / 2), cuadros = 0;
    for (var s = 0; s + N <= x.length; s += hop) {
      var e = 0;
      for (i = 0; i < N; i++) { var y = x[s + i]; e += y * y; re[i] = y * w[i]; im[i] = 0; }
      if (e < gate) continue;
      fft(re, im);
      for (k = 1; k < N / 2; k++) mags[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      var fc = new Float64Array(12), tot = 0;
      for (k = 2; k < N / 2 - 1; k++) {
        if (pc[k] < 0) continue;
        // solo picos del espectro: menos ruido, más notas
        if (mags[k] > mags[k - 1] && mags[k] >= mags[k + 1]) { var m = Math.sqrt(mags[k]); fc[pc[k]] += m; tot += m; }
      }
      if (!tot) continue;
      for (k = 0; k < 12; k++) c[k] += fc[k] / tot;
      cuadros++;
    }
    return { c: c, cuadros: cuadros };
  }
  function corr(a, b) {
    var ma = 0, mb = 0, i; for (i = 0; i < 12; i++) { ma += a[i]; mb += b[i]; } ma /= 12; mb /= 12;
    var num = 0, da = 0, db = 0;
    for (i = 0; i < 12; i++) { var x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
    return da && db ? num / Math.sqrt(da * db) : 0;
  }
  // Devuelve { tonica: 0-11 (0 = Do), modo: 'mayor'|'menor', seguro: 0-1, otras: [...] } o null
  function tono(x, sr) {
    var r = croma(x, sr);
    if (r.cuadros < 6) return null;
    var res = [];
    for (var t = 0; t < 12; t++) {
      var rot = new Float64Array(12);
      for (var i = 0; i < 12; i++) rot[i] = r.c[(i + t) % 12];
      res.push({ tonica: t, modo: 'mayor', r: corr(rot, MAYOR) });
      res.push({ tonica: t, modo: 'menor', r: corr(rot, MENOR) });
    }
    res.sort(function (a, b) { return b.r - a.r; });
    var best = res[0];
    if (best.r < 0.45) return null;
    var seguro = Math.max(0, Math.min(1, (best.r - res[1].r) * 6 + (best.r - 0.45)));
    return { tonica: best.tonica, modo: best.modo, seguro: seguro, otras: res.slice(1, 4) };
  }

  /* ---------- BPM (flujo espectral + autocorrelación) ---------- */
  // Devuelve { bpm, seguro: 0-1 } o null
  function bpm(x, sr) {
    var N = 512, hop = 128, w = hann(N), re = new Float64Array(N), im = new Float64Array(N);
    var frames = Math.floor((x.length - N) / hop);
    if (frames < 200) return null;
    var prev = new Float64Array(N / 2), o = new Float64Array(frames), k, i;
    var kMax = Math.min(N / 2, Math.round(5000 * N / sr));
    for (var f = 0; f < frames; f++) {
      var s = f * hop;
      for (i = 0; i < N; i++) { re[i] = x[s + i] * w[i]; im[i] = 0; }
      fft(re, im);
      var flux = 0;
      for (k = 1; k < kMax; k++) {
        var m = Math.log(1 + 100 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
        var d = m - prev[k]; if (d > 0) flux += d;
        prev[k] = m;
      }
      o[f] = flux;
    }
    // sacar la tendencia (media móvil de ~0,5 s) y quedarse con lo positivo
    var ht = hop / sr, half = Math.round(0.25 / ht), acc = 0, cnt = 0, oo = new Float64Array(frames);
    for (i = 0; i < Math.min(frames, half); i++) { acc += o[i]; cnt++; }
    for (i = 0; i < frames; i++) {
      if (i + half < frames) { acc += o[i + half]; cnt++; }
      if (i - half - 1 >= 0) { acc -= o[i - half - 1]; cnt--; }
      var v = o[i] - acc / cnt; oo[i] = v > 0 ? v : 0;
    }
    // autocorrelación entre 50 y 220 BPM
    var lagMin = Math.floor(60 / 220 / ht), lagMax = Math.ceil(60 / 50 / ht);
    var ac = new Float64Array(lagMax + 2), e0 = 0;
    for (i = 0; i < frames; i++) e0 += oo[i] * oo[i];
    if (!e0) return null;
    for (var L = lagMin - 1; L <= lagMax + 1; L++) {
      var sum = 0; for (i = 0; i + L < frames; i++) sum += oo[i] * oo[i + L];
      ac[L] = sum / (frames - L);
    }
    var norm = e0 / frames, best = -1, bestScore = -Infinity;
    for (L = lagMin; L <= lagMax; L++) {
      if (!(ac[L] >= ac[L - 1] && ac[L] >= ac[L + 1])) continue;
      var b = 60 / (L * ht);
      // preferencia suave por tempos comunes (de 70 a 160) para no confundir el doble o la mitad
      var prior = Math.exp(-0.5 * Math.pow(Math.log2(b / 112) / 0.75, 2));
      var score = (ac[L] / norm) * (0.35 + prior);
      if (score > bestScore) { bestScore = score; best = L; }
    }
    if (best < 0) return null;
    // afinar la posición del pico (interpolación parabólica)
    var y0 = ac[best - 1], y1 = ac[best], y2 = ac[best + 1], den = y0 - 2 * y1 + y2;
    var lag = best + (den ? 0.5 * (y0 - y2) / den : 0);
    var tempo = 60 / (lag * ht), fuerza = ac[best] / norm;
    if (fuerza < 0.08) return null;
    return { bpm: Math.round(tempo), seguro: Math.max(0, Math.min(1, (fuerza - 0.08) * 2.5)) };
  }

  var api = { tono: tono, bpm: bpm, _fft: fft };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CBAnalisis = api;
})(this);

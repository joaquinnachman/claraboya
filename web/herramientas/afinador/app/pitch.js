// Detector de tono (McLeod Pitch Method, NSDF calculada con FFT).
// Funciona igual en el navegador y en Node (para las pruebas).
(function (root) {
  'use strict';

  function makeFFT(size) {
    var levels = Math.round(Math.log2(size));
    var cos = new Float64Array(size / 2), sin = new Float64Array(size / 2);
    for (var i = 0; i < size / 2; i++) { cos[i] = Math.cos(2 * Math.PI * i / size); sin[i] = Math.sin(2 * Math.PI * i / size); }
    var rev = new Uint32Array(size);
    for (i = 0; i < size; i++) {
      var r = 0, x = i;
      for (var b = 0; b < levels; b++) { r = (r << 1) | (x & 1); x >>= 1; }
      rev[i] = r;
    }
    // in-place, forward if inv=false
    return function (re, im, inv) {
      for (var i = 0; i < size; i++) {
        var j = rev[i];
        if (j > i) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
      }
      for (var len = 2; len <= size; len <<= 1) {
        var half = len >> 1, step = size / len;
        for (var s = 0; s < size; s += len) {
          for (var k = 0; k < half; k++) {
            var wr = cos[k * step], wi = inv ? sin[k * step] : -sin[k * step];
            var a = s + k, c = a + half;
            var xr = re[c] * wr - im[c] * wi, xi = re[c] * wi + im[c] * wr;
            re[c] = re[a] - xr; im[c] = im[a] - xi;
            re[a] += xr; im[a] += xi;
          }
        }
      }
    };
  }

  var cache = {};
  function getFFT(size) { return cache[size] || (cache[size] = makeFFT(size)); }

  /**
   * x: Float32Array/Float64Array de muestras, sr: sample rate,
   * fmin/fmax: rango de búsqueda. Devuelve {freq, clarity, rms} o null.
   */
  function detect(x, sr, fmin, fmax) {
    var N = x.length, i;
    var mean = 0;
    for (i = 0; i < N; i++) mean += x[i];
    mean /= N;
    var sq = 0;
    var buf = new Float64Array(N);
    for (i = 0; i < N; i++) { var v = x[i] - mean; buf[i] = v; sq += v * v; }
    var rms = Math.sqrt(sq / N);
    if (rms < 1e-5) return { freq: 0, clarity: 0, rms: rms };

    var P = 1; while (P < 2 * N) P <<= 1;
    var fft = getFFT(P);
    var re = new Float64Array(P), im = new Float64Array(P);
    re.set(buf);
    fft(re, im, false);
    for (i = 0; i < P; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
    fft(re, im, true);
    // re[t]/P = autocorrelación r(t)

    var maxLag = Math.min(N - 1, Math.ceil(sr / fmin) + 2);
    var fullLag = Math.floor(N * 0.5);
    var minLag = Math.max(2, Math.floor(sr / fmax) - 1);
    var nsdf = new Float64Array(Math.max(maxLag, fullLag) + 2);
    var m = 2 * sq;
    nsdf[0] = 1;
    for (var t = 1; t <= Math.max(maxLag, fullLag) + 1 && t < N; t++) {
      m -= buf[t - 1] * buf[t - 1] + buf[N - t] * buf[N - t];
      nsdf[t] = m > 1e-12 ? 2 * (re[t] / P) / m : 0;
    }

    // picos clave entre cruces por cero positivos
    var peaks = [];
    t = 1;
    while (t < maxLag && nsdf[t] > 0) t++;          // salir del lóbulo de t=0
    while (t < maxLag) {
      while (t < maxLag && nsdf[t] <= 0) t++;
      var best = -1, bv = -Infinity;
      while (t < maxLag && nsdf[t] > 0) {
        if (nsdf[t] > bv && nsdf[t] >= nsdf[t - 1] && nsdf[t] >= nsdf[t + 1]) { bv = nsdf[t]; best = t; }
        t++;
      }
      if (best > 0 && best >= minLag) peaks.push(best);
    }
    if (!peaks.length) return { freq: 0, clarity: 0, rms: rms };
    var top = 0;
    for (i = 0; i < peaks.length; i++) top = Math.max(top, nsdf[peaks[i]]);
    var thr = 0.9 * top, pick = peaks[0];
    for (i = 0; i < peaks.length; i++) if (nsdf[peaks[i]] >= thr) { pick = peaks[i]; break; }

    var a = nsdf[pick - 1], b = nsdf[pick], c = nsdf[pick + 1];
    var den = a - 2 * b + c, shift = den !== 0 ? 0.5 * (a - c) / den : 0;
    if (shift > 1 || shift < -1) shift = 0;
    var lag = pick + shift;
    var clarity = b - 0.25 * (a - c) * shift;

    // Refinamiento: medir sobre varios períodos (k·T) para ganar precisión.
    var k = Math.min(8, Math.floor(fullLag / lag));
    if (k >= 2) {
      var guess = Math.round(k * lag), bi = guess, bvv = -Infinity;
      for (var q = guess - 2; q <= guess + 2; q++) if (q > 1 && q < fullLag && nsdf[q] > bvv) { bvv = nsdf[q]; bi = q; }
      if (bvv > 0.8 * b) {
        var a2 = nsdf[bi - 1], c2 = nsdf[bi + 1], d2 = a2 - 2 * bvv + c2;
        var sh2 = d2 !== 0 ? 0.5 * (a2 - c2) / d2 : 0;
        if (sh2 <= 1 && sh2 >= -1) {
          var lagK = (bi + sh2) / k;
          if (Math.abs(lagK - lag) < 0.6) lag = lagK;
        }
      }
    }
    return { freq: sr / lag, clarity: Math.min(1, clarity), rms: rms };
  }

  var api = { detect: detect };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pitch = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

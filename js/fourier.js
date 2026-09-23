// Fourier core: closed curves stored as complex coefficients c_k (k = -K..K), z(t) = sum c_k e^{ikt}.
(function (BG) {
  const TWO_PI = Math.PI * 2;

  // Seeded Mulberry32 generator: returns a function giving uniform numbers in [0,1).
  BG.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Box-Muller standard normal sample drawn from a uniform generator.
  BG.gauss = function (rand) {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TWO_PI * rand());
  };

  // Allocates an all-zero coefficient set holding harmonics k = -K..K at index k+K.
  BG.makeCoeffs = function (K) {
    return { K: K, re: new Float64Array(2 * K + 1), im: new Float64Array(2 * K + 1) };
  };

  // Forward DFT: converts n evenly spaced closed-curve points [[x,y],...] into coefficients for |k| <= K.
  BG.dft = function (pts, K) {
    const n = pts.length;
    const c = BG.makeCoeffs(K);
    for (let k = -K; k <= K; k++) {
      let sr = 0, si = 0;
      for (let j = 0; j < n; j++) {
        const a = (-k * TWO_PI * j) / n;
        const cs = Math.cos(a), sn = Math.sin(a);
        sr += pts[j][0] * cs - pts[j][1] * sn;
        si += pts[j][0] * sn + pts[j][1] * cs;
      }
      c.re[k + K] = sr / n;
      c.im[k + K] = si / n;
    }
    return c;
  };

  // Returns a copy of the coefficients keeping only harmonics |k| <= N (the "detail" knob).
  BG.truncate = function (c, N) {
    const out = BG.makeCoeffs(c.K);
    const lim = Math.min(N, c.K);
    for (let k = -lim; k <= lim; k++) {
      out.re[k + c.K] = c.re[k + c.K];
      out.im[k + c.K] = c.im[k + c.K];
    }
    return out;
  };

  // Linear interpolation between two coefficient sets (a shape morph in coefficient space).
  BG.lerp = function (a, b, t) {
    const K = Math.max(a.K, b.K);
    const out = BG.makeCoeffs(K);
    for (let k = -K; k <= K; k++) {
      const ar = Math.abs(k) <= a.K ? a.re[k + a.K] : 0, ai = Math.abs(k) <= a.K ? a.im[k + a.K] : 0;
      const br = Math.abs(k) <= b.K ? b.re[k + b.K] : 0, bi = Math.abs(k) <= b.K ? b.im[k + b.K] : 0;
      out.re[k + K] = ar + (br - ar) * t;
      out.im[k + K] = ai + (bi - ai) * t;
    }
    return out;
  };

  // Adds smooth random noise to every harmonic, damped as (1+|k|)^-1.6 so shapes stay plausible.
  BG.perturb = function (c, sigma, rand) {
    if (sigma <= 0) return c;
    const out = BG.makeCoeffs(c.K);
    for (let k = -c.K; k <= c.K; k++) {
      const d = k === 0 ? 0 : sigma / Math.pow(1 + Math.abs(k), 1.6); // k=0 is the position, keep it fixed
      out.re[k + c.K] = c.re[k + c.K] + d * BG.gauss(rand);
      out.im[k + c.K] = c.im[k + c.K] + d * BG.gauss(rand);
    }
    return out;
  };

  // Zeroes every harmonic with (k-1) not divisible by m, which forces m-fold rotational symmetry.
  BG.symmetric = function (c, m) {
    const out = BG.makeCoeffs(c.K);
    for (let k = -c.K; k <= c.K; k++) {
      if ((((k - 1) % m) + m) % m === 0) {
        out.re[k + c.K] = c.re[k + c.K];
        out.im[k + c.K] = c.im[k + c.K];
      }
    }
    return out;
  };

  const trigCache = {};
  // Builds (and caches) cos/sin tables of k*t_j for every k in -K..K and J sample angles.
  function trigTables(K, J) {
    const key = K + '|' + J;
    if (trigCache[key]) return trigCache[key];
    const w = 2 * K + 1;
    const cosT = new Float64Array(w * J), sinT = new Float64Array(w * J);
    for (let k = -K; k <= K; k++) {
      for (let j = 0; j < J; j++) {
        const a = (k * TWO_PI * j) / J;
        cosT[(k + K) * J + j] = Math.cos(a);
        sinT[(k + K) * J + j] = Math.sin(a);
      }
    }
    return (trigCache[key] = { cosT: cosT, sinT: sinT });
  }

  // Sums the series at J evenly spaced parameters and returns interleaved [x0,y0,x1,y1,...].
  BG.evalCurve = function (c, J) {
    const K = c.K, tb = trigTables(K, J);
    const out = new Float64Array(2 * J);
    for (let i = 0; i <= 2 * K; i++) {
      const re = c.re[i], im = c.im[i];
      if (re === 0 && im === 0) continue;
      const base = i * J;
      for (let j = 0; j < J; j++) {
        const cs = tb.cosT[base + j], sn = tb.sinT[base + j];
        out[2 * j] += re * cs - im * sn;
        out[2 * j + 1] += re * sn + im * cs;
      }
    }
    return out;
  };

  // Evaluates the series at a single parameter t (used by the epicycle animation).
  BG.evalAt = function (c, t) {
    let x = 0, y = 0;
    for (let k = -c.K; k <= c.K; k++) {
      const re = c.re[k + c.K], im = c.im[k + c.K];
      const cs = Math.cos(k * t), sn = Math.sin(k * t);
      x += re * cs - im * sn;
      y += re * sn + im * cs;
    }
    return [x, y];
  };

  // Lists the non-zero circles as {k, r, phase} sorted by radius, biggest circle first.
  BG.epicycles = function (c) {
    const list = [];
    for (let k = -c.K; k <= c.K; k++) {
      const re = c.re[k + c.K], im = c.im[k + c.K];
      const r = Math.hypot(re, im);
      if (r > 1e-9) list.push({ k: k, r: r, phase: Math.atan2(im, re) });
    }
    list.sort(function (a, b) { return b.r - a.r; });
    return list;
  };

  // Counts the real numbers needed to store the non-zero harmonics of a coefficient set.
  BG.countNumbers = function (c) {
    let n = 0;
    for (let i = 0; i < c.re.length; i++) if (c.re[i] !== 0 || c.im[i] !== 0) n += 2;
    return n;
  };

  // Returns [minX, minY, maxX, maxY] of an interleaved xy array.
  BG.bounds = function (xy) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < xy.length; i += 2) {
      if (xy[i] < x0) x0 = xy[i];
      if (xy[i] > x1) x1 = xy[i];
      if (xy[i + 1] < y0) y0 = xy[i + 1];
      if (xy[i + 1] > y1) y1 = xy[i + 1];
    }
    return [x0, y0, x1, y1];
  };
})((globalThis.BG = globalThis.BG || {}));

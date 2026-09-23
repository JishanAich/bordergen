// Motif library: outlines are sampled, run through the DFT, and stored as coefficient sets; also rosette and band series.
(function (BG) {
  const TWO_PI = Math.PI * 2;
  const LIB_K = 48;   // harmonics stored per motif
  const LIB_PTS = 256; // outline samples fed to the DFT

  // Half-profiles (right side, base at y=0 to tip at y=1); a third value of 1 marks a sharp corner.
  const HALF = {
    petal: [[0, 0], [0.17, 0.1], [0.3, 0.36], [0.27, 0.62], [0.13, 0.86], [0, 1, 1]],
    leaf: [[0, 0], [0.1, 0.1], [0.2, 0.24], [0.13, 0.3, 1], [0.25, 0.48], [0.15, 0.55, 1], [0.2, 0.74], [0.09, 0.84], [0, 1, 1]],
    fish: [[0, 0.12, 1], [0.3, -0.02, 1], [0.08, 0.24], [0.2, 0.42], [0.27, 0.62], [0.2, 0.84], [0, 1]],
    paisley: [[0, 0], [0.2, 0.04], [0.3, 0.2], [0.27, 0.42], [0.16, 0.68], [0.06, 0.9], [0, 1, 1]],
    bloom: [[0, 0], [0.14, 0.02], [0.36, 0.12], [0.5, 0.42, 1], [0.26, 0.36, 1], [0.2, 0.62], [0.09, 0.86], [0, 1, 1]]
  };
  BG.MOTIF_NAMES = ['petal', 'leaf', 'fish', 'paisley', 'bloom'];

  // Builds the closed control ring: right side base->tip, then the mirrored left side tip->base.
  function ringFromHalf(half) {
    const right = half.map(function (p) { return p.slice(); });
    const left = half.slice(1, -1).reverse().map(function (p) { return [-p[0], p[1], p[2]]; });
    return right.concat(left);
  }

  // Closed Catmull-Rom spline through control points (sharp points are doubled), returns a dense polyline.
  function catmull(ctrl, per) {
    const pts = [];
    ctrl.forEach(function (p) { pts.push(p); if (p[2]) pts.push(p); });
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (p1 === p2) continue;
      for (let s = 0; s < per; s++) {
        const t = s / per, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        out.push([x, y]);
      }
    }
    return out;
  }

  // Resamples a closed polyline to n points spaced equally by arc length.
  function resample(pts, n) {
    const m = pts.length, cum = [0];
    for (let i = 1; i <= m; i++) {
      const a = pts[i - 1], b = pts[i % m];
      cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const total = cum[m], out = [];
    let seg = 0;
    for (let j = 0; j < n; j++) {
      const target = (total * j) / n;
      while (cum[seg + 1] < target) seg++;
      const a = pts[seg], b = pts[(seg + 1) % m];
      const f = (target - cum[seg]) / Math.max(cum[seg + 1] - cum[seg], 1e-12);
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    return out;
  }

  BG.resample = resample;

  // Samples one named motif outline as LIB_PTS arc-length-spaced points (paisley gets its curl here).
  function outline(name) {
    let ring = catmull(ringFromHalf(HALF[name]), 18);
    if (name === 'paisley') ring = ring.map(function (p) { return [p[0] + 0.55 * p[1] * p[1] - 0.15 * p[1], p[1]]; });
    return resample(ring, LIB_PTS);
  }

  BG.motifs = {};
  BG.MOTIF_NAMES.forEach(function (name) { BG.motifs[name] = BG.dft(outline(name), LIB_K); });

  // Registers a user outline (already resampled to closed points, base at y=0, height 1) as a new motif.
  BG.addCustomMotif = function (name, pts) {
    BG.motifs[name] = BG.dft(resample(pts, LIB_PTS), LIB_K);
    return BG.motifs[name];
  };

  // Polar Fourier rosette r(a)=rho+(1-rho)*norm(sum cos(n*m*a)/n^p): m petals, N harmonics, returns interleaved xy.
  BG.rosetteCurve = function (m, N, rho, p, J) {
    const s = new Float64Array(J);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < J; j++) {
      const a = (TWO_PI * j) / J;
      let v = 0;
      for (let n = 1; n <= N; n++) v += Math.cos(n * m * a) / Math.pow(n, p);
      s[j] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const out = new Float64Array(2 * J), span = Math.max(hi - lo, 1e-9);
    for (let j = 0; j < J; j++) {
      const a = (TWO_PI * j) / J;
      const r = rho + (1 - rho) * ((s[j] - lo) / span);
      out[2 * j] = r * Math.cos(a);
      out[2 * j + 1] = r * Math.sin(a);
    }
    return out;
  };

  // Builds an m-fold star from just three circles (k = 1, 1+m, 1-m), so symmetry is automatic.
  BG.starCoeffs = function (m, sharp) {
    const K = m + 1, c = BG.makeCoeffs(K);
    c.re[1 + K] = 1;
    c.re[1 + m + K] = sharp / (1 + m);
    c.re[1 - m + K] = 0.3 * sharp / Math.max(m - 1, 1);
    return c;
  };

  // Fourier series of the scallop wave |sin x| (0..1) truncated to N cosine harmonics.
  BG.scallopSeries = function (x, N) {
    let v = 2 / Math.PI;
    for (let j = 1; j <= N; j++) v -= ((4 / Math.PI) * Math.cos(2 * j * x)) / (4 * j * j - 1);
    return Math.min(Math.max(v, 0), 1.08);
  };

  // Fourier series of the triangle wave (-1..1) truncated to N odd sine harmonics.
  BG.triangleSeries = function (x, N) {
    let v = 0;
    for (let j = 0; j < N; j++) v += ((j % 2 ? -1 : 1) * Math.sin((2 * j + 1) * x)) / ((2 * j + 1) * (2 * j + 1));
    return (8 / (Math.PI * Math.PI)) * v;
  };

  const vineNorm = {};
  // Vine centre-line series sum sin(n x)/n^1.6, normalised so its peak is 1 for any N.
  BG.vineSeries = function (x, N) {
    if (!vineNorm[N]) {
      let mx = 0;
      for (let i = 0; i < 128; i++) {
        let v = 0;
        for (let n = 1; n <= N; n++) v += Math.sin((n * TWO_PI * i) / 128) / Math.pow(n, 1.6);
        mx = Math.max(mx, Math.abs(v));
      }
      vineNorm[N] = mx;
    }
    let v = 0;
    for (let n = 1; n <= N; n++) v += Math.sin(n * x) / Math.pow(n, 1.6);
    return v / vineNorm[N];
  };
})((globalThis.BG = globalThis.BG || {}));

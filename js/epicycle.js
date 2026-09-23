// Epicycle view: animates a coefficient set as chained rotating circles and draws its amplitude spectrum.
(function (BG) {
  const TWO_PI = Math.PI * 2;
  const COL = { ink: '#1d1512', trail: '#c4301d', circle: 'rgba(29,21,18,0.28)', ghost: 'rgba(29,21,18,0.16)', keep: '#c4301d', cut: '#cdbf9f' };

  // Sizes a canvas to its CSS box at device pixel ratio and returns its 2D context in CSS pixels.
  function fitCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g: g, w: w, h: h };
  }

  // Creates the animated view bound to two canvases (epicycles, spectrum); returns its control object.
  BG.EpicycleView = function (canvas, specCanvas) {
    const view = { playing: true, coeffs: null, N: 8, t0: performance.now(), loopMs: 9000, holdMs: 2200, pts: null, circles: [], box: null };

    // Loads a new full coefficient set truncated to harmonics |k| <= N and restarts the animation.
    view.setShape = function (coeffs, N) {
      view.coeffs = coeffs;
      view.N = N;
      const cut = BG.truncate(coeffs, N);
      view.cut = cut;
      view.pts = BG.evalCurve(cut, 480);
      view.circles = BG.epicycles(cut);
      view.dc = [cut.re[cut.K], cut.im[cut.K]];
      view.box = BG.bounds(view.pts);
      view.drawSpectrum();
    };

    // Restarts the drawing from the beginning of the curve.
    view.restart = function () { view.t0 = performance.now(); };

    // Toggles play/pause, freezing the current phase when paused.
    view.toggle = function () {
      const now = performance.now();
      if (view.playing) view.pausedAt = now - view.t0;
      else view.t0 = now - (view.pausedAt || 0);
      view.playing = !view.playing;
      return view.playing;
    };

    // Draws one animation frame: ghost outline, growing trail, chained circles and the tracing tip.
    view.frame = function (now) {
      if (!view.pts) return;
      const c = fitCanvas(canvas), g = c.g;
      g.clearRect(0, 0, c.w, c.h);
      const b = view.box, bw = b[2] - b[0], bh = b[3] - b[1], pad = 22;
      const sc = Math.min((c.w - 2 * pad) / bw, (c.h - 2 * pad) / bh);
      const ox = c.w / 2 - ((b[0] + b[2]) / 2) * sc, oy = c.h / 2 + ((b[1] + b[3]) / 2) * sc;
      // Map model x/y to canvas pixels (y flipped so motifs point up).
      const X = function (x) { return ox + x * sc; }, Y = function (y) { return oy - y * sc; };
      const el = view.playing ? now - view.t0 : view.pausedAt || 0;
      const cycle = view.loopMs + view.holdMs, ph = el % cycle;
      const p = Math.min(ph / view.loopMs, 1), n = view.pts.length / 2;
      const upto = Math.max(1, Math.floor(p * n));

      g.lineWidth = 1;
      g.strokeStyle = COL.ghost;
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const j = i % n;
        g[i ? 'lineTo' : 'moveTo'](X(view.pts[2 * j]), Y(view.pts[2 * j + 1]));
      }
      g.stroke();

      g.strokeStyle = COL.trail;
      g.lineWidth = 2.6;
      g.lineJoin = 'round';
      g.beginPath();
      for (let i = 0; i < upto; i++) g[i ? 'lineTo' : 'moveTo'](X(view.pts[2 * i]), Y(view.pts[2 * i + 1]));
      if (p >= 1) g.closePath();
      g.stroke();

      const t = TWO_PI * ((upto - 1) / n);
      let cx = view.dc[0], cy = view.dc[1];
      g.lineWidth = 1;
      view.circles.forEach(function (ci) {
        if (ci.k === 0) return;
        const a = ci.phase + ci.k * t, nx = cx + ci.r * Math.cos(a), ny = cy + ci.r * Math.sin(a);
        if (ci.r * sc > 0.6 && p < 1) {
          g.strokeStyle = COL.circle;
          g.beginPath();
          g.arc(X(cx), Y(cy), ci.r * sc, 0, TWO_PI);
          g.stroke();
          g.strokeStyle = COL.ink;
          g.beginPath();
          g.moveTo(X(cx), Y(cy));
          g.lineTo(X(nx), Y(ny));
          g.stroke();
        }
        cx = nx;
        cy = ny;
      });
      g.fillStyle = COL.trail;
      g.beginPath();
      g.arc(X(cx), Y(cy), 3.6, 0, TWO_PI);
      g.fill();
    };

    // Draws |c_k| for k = -K..K on a log scale; harmonics inside the kept band |k| <= N are highlighted.
    view.drawSpectrum = function () {
      if (!view.coeffs) return;
      const c = fitCanvas(specCanvas), g = c.g, K = view.coeffs.K;
      g.clearRect(0, 0, c.w, c.h);
      const w = c.w / (2 * K + 1), base = c.h - 16, top = 6;
      for (let k = -K; k <= K; k++) {
        const a = Math.hypot(view.coeffs.re[k + K], view.coeffs.im[k + K]);
        const v = Math.min(Math.max((Math.log10(Math.max(a, 1e-6)) + 4) / 4, 0), 1);
        g.fillStyle = Math.abs(k) <= view.N ? COL.keep : COL.cut;
        g.fillRect((k + K) * w + 0.5, base - v * (base - top), Math.max(w - 1, 1), v * (base - top));
      }
      g.fillStyle = COL.ink;
      g.font = '10px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('k = -' + K, 22, c.h - 3);
      g.fillText('0', c.w / 2, c.h - 3);
      g.fillText('+' + K, c.w - 18, c.h - 3);
    };

    // Runs the requestAnimationFrame loop that keeps the epicycle canvas drawing.
    view.start = function () {
      // One animation-frame step: draw, then schedule the next frame.
      const loop = function (now) { view.frame(now); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    };
    return view;
  };
})((globalThis.BG = globalThis.BG || {}));

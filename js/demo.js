// Auto demo: plays the 3-minute pitch (harmonic sweep, symmetry, morph, style switch) hands-free.
(function (BG) {
  const SCRIPT = [
    { say: 'Few harmonics: bold, folk-simple shapes', key: 'N', from: 2, to: 6, ms: 1800 },
    { say: 'More harmonics: detail appears - the same numbers, just more of them', key: 'N', from: 6, to: 34, ms: 4200 },
    { say: 'Settling on a Pattachitra level of detail', key: 'N', from: 34, to: 14, ms: 1500 },
    { say: 'Symmetry order m: only harmonics k = 1 (mod m) - rosettes change instantly', key: 'm', from: 6, to: 14, ms: 4200 },
    { say: 'Back to 8-fold', key: 'm', from: 14, to: 8, ms: 1200 },
    { say: 'Coefficient-space morph: petal to fish, no redrawing', key: 'morph', from: 0, to: 100, ms: 4200 },
    { say: 'Morph back', key: 'morph', from: 100, to: 0, ms: 2200 },
    { say: 'Style = a small preset: palette + band stack', style: 'madhubani', ms: 2800 },
    { say: 'Warli: low harmonics, white on terracotta', style: 'warli', ms: 2800 },
    { say: 'Gond: dot-and-dash and paisley on black', style: 'gond', ms: 2800 },
    { say: 'Back to Pattachitra', style: 'pattachitra', ms: 1500 }
  ];

  // Creates the runner; api = { setKnob(key,val), setStyle(name), say(text), done() }. Returns {start, stop, running}.
  BG.AutoDemo = function (api) {
    const run = { running: false };
    let raf = 0, idx = 0, t0 = 0, lastVal = null;

    // Advances the script on each animation frame, sweeping the current knob or holding the current style.
    function tick(now) {
      if (!run.running) return;
      const step = SCRIPT[idx];
      if (!t0) {
        t0 = now;
        lastVal = null;
        api.say(step.say);
        if (step.style) api.setStyle(step.style);
      }
      const p = Math.min((now - t0) / step.ms, 1);
      if (step.key) {
        const v = Math.round(step.from + (step.to - step.from) * p);
        if (v !== lastVal) { lastVal = v; api.setKnob(step.key, v); }
      }
      if (p >= 1) { idx++; t0 = 0; }
      if (idx >= SCRIPT.length) { run.stop(); return; }
      raf = requestAnimationFrame(tick);
    }

    // Starts the script from the beginning.
    run.start = function () {
      run.running = true;
      idx = 0;
      t0 = 0;
      api.setStyle('pattachitra');
      raf = requestAnimationFrame(tick);
    };

    // Stops the script and notifies the UI.
    run.stop = function () {
      run.running = false;
      cancelAnimationFrame(raf);
      api.done();
    };
    return run;
  };
})((globalThis.BG = globalThis.BG || {}));

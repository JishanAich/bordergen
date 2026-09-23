// App wiring: state, slider controls, live re-rendering, the epicycle lab, uploads, exports and the auto demo.
(function (BG) {
  const $ = function (id) { return document.getElementById(id); };
  const SLIDERS = [
    { key: 'N', label: 'Harmonics N', min: 1, max: 40, step: 1, hint: 'few = folk-simple, many = ornate' },
    { key: 'm', label: 'Rosette symmetry m', min: 3, max: 16, step: 1, hint: 'm-fold: only k = 1 (mod m) survive' },
    { key: 'count', label: 'Bands', min: 1, max: 6, step: 1, hint: 'how many bands of the style stack' },
    { key: 'period', label: 'Motif period (px)', min: 44, max: 160, step: 2, hint: 'repeats are snapped to close at the corners' },
    { key: 'thickness', label: 'Border thickness', min: 100, max: 260, step: 2, hint: '' },
    { key: 'variation', label: 'Hand variation %', min: 0, max: 40, step: 1, hint: 'noise added to coefficients (damped per harmonic)' },
    { key: 'morph', label: 'Morph A → B %', min: 0, max: 100, step: 1, hint: 'interpolate motif coefficients' }
  ];
  const state = { seed: 7, aspect: 1.3333, medallion: true };
  let last = null, rafId = 0, view = null, demo = null;

  // Returns the default knob values for a style, including its motif pair and zero morph.
  function defaultsFor(name) {
    const st = BG.STYLES[name];
    return Object.assign({ style: name, motifA: st.primary, motifB: st.morphTo, morph: 0 }, st.defaults);
  }

  // Applies "#key=value&..." overrides from the URL hash (handy for sharing a look or scripted screenshots).
  function applyHash() {
    location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      const p = kv.split('=');
      if (p.length !== 2) return;
      if (p[0] === 'style' && BG.STYLES[p[1]]) Object.assign(state, defaultsFor(p[1]));
    });
    location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      const p = kv.split('='), v = p[1];
      if (p.length !== 2 || p[0] === 'style') return;
      if (p[0] === 'motifA' || p[0] === 'motifB') { if (BG.motifs[v]) state[p[0]] = v; }
      else if (p[0] === 'medallion') state.medallion = v !== '0';
      else if (!isNaN(parseFloat(v))) state[p[0]] = parseFloat(v);
    });
  }

  // Builds the slider rows once from the SLIDERS config.
  function buildSliders() {
    $('sliders').innerHTML = SLIDERS.map(function (s) {
      return '<div class="slider"><div class="top"><span>' + s.label + '</span><b id="v-' + s.key + '"></b></div>' +
        '<input type="range" id="s-' + s.key + '" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '">' +
        (s.hint ? '<div class="sub">' + s.hint + '</div>' : '') + '</div>';
    }).join('');
    SLIDERS.forEach(function (s) {
      $('s-' + s.key).addEventListener('input', function (e) { setKnob(s.key, +e.target.value); });
    });
  }

  // Sets one knob in state, mirrors it into its slider and schedules a redraw.
  function setKnob(key, val) {
    state[key] = val;
    const el = $('s-' + key);
    if (el) el.value = val;
    const lab = $('v-' + key);
    if (lab) lab.textContent = val;
    scheduleRender();
  }

  // Fills a <select> with motif names (plus the uploaded one) and selects the given value.
  function fillMotifSelect(id, value, extra) {
    const names = BG.MOTIF_NAMES.concat(BG.motifs.custom ? ['custom'] : []);
    let html = (extra || []).map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    html += names.map(function (n) { return '<option value="' + n + '">' + (n === 'custom' ? '★ your motif' : n) + '</option>'; }).join('');
    $(id).innerHTML = html;
    $(id).value = value;
  }

  // Pushes all of state into the controls (used after a style switch or hash load).
  function syncUi() {
    const st = BG.STYLES[state.style];
    $('style').value = state.style;
    $('blurb').textContent = st.blurb;
    $('s-count').max = st.layers.length;
    state.count = Math.min(state.count, st.layers.length);
    SLIDERS.forEach(function (s) { setKnob(s.key, state[s.key]); });
    fillMotifSelect('motifA', state.motifA);
    fillMotifSelect('motifB', state.motifB);
    $('aspect').value = String(state.aspect);
    $('medallion').checked = state.medallion;
    $('seed').value = state.seed;
  }

  // Switches to a style preset, resetting the knobs to that style's defaults.
  function setStyle(name) {
    Object.assign(state, defaultsFor(name));
    const keepLab = $('labShape').value;
    syncUi();
    fillLabSelect(keepLab);
    scheduleRender();
  }

  // Coalesces many rapid changes into a single render on the next animation frame.
  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () { rafId = 0; render(); });
  }

  // Sizes the SVG to the largest box that fits the stage while keeping the frame's aspect ratio.
  function fitStage() {
    const box = $('frame'), svg = box.firstElementChild;
    if (!svg || !last) return;
    const s = Math.min(box.clientWidth / last.W, box.clientHeight / last.H);
    svg.style.width = Math.floor(last.W * s) + 'px';
    svg.style.height = Math.floor(last.H * s) + 'px';
  }

  // Rebuilds the border from state and refreshes the stage, the numbers pill and the lab.
  function render() {
    let r;
    try { r = BG.buildFrame(state); } catch (e) { $('caption').textContent = 'Render error: ' + e.message; console.error(e); return; }
    last = r;
    $('frame').innerHTML = r.svg;
    fitStage();
    $('pillNum').textContent = r.stats.total.toLocaleString();
    const st = BG.STYLES[state.style].label, s = r.stats;
    $('caption').innerHTML = '<b>' + st + '</b> &middot; N=' + state.N + ' harmonics &middot; m=' + state.m + '-fold &middot; seed ' + state.seed +
      '<br>motif coefficients ' + s.motif + ' + band series ' + s.series + ' + rosette rings ' + s.rosette + ' + layout ' + s.layout + ' = <b>' + s.total + ' numbers</b>';
    updateLab();
  }

  // Fills the lab's shape select with the border motif, every library motif and the 3-circle rosette.
  function fillLabSelect(keep) {
    fillMotifSelect('labShape', 'primary', [['primary', 'Border motif (A↔B)']]);
    $('labShape').insertAdjacentHTML('beforeend', '<option value="rosette">Rosette from 3 circles</option>');
    $('labShape').value = keep || 'primary';
    if ($('labShape').value !== (keep || 'primary')) $('labShape').value = 'primary';
  }

  // Sends the chosen lab shape to the epicycle view (rosette ignores N because 3 circles are the whole shape).
  function updateLab() {
    const v = $('labShape').value;
    let c, N = state.N, msg;
    if (v === 'rosette') {
      c = BG.starCoeffs(state.m, 0.9);
      N = c.K;
      msg = '3 circles: k = 1, 1+' + state.m + ', 1−' + state.m + '. Every k ≡ 1 (mod ' + state.m + ') gives a ' + state.m + '-fold rosette by construction.';
    } else {
      c = v === 'primary' ? BG.lerp(BG.motifs[state.motifA], BG.motifs[state.motifB], state.morph / 100) : BG.motifs[v];
    }
    view.setShape(c, N);
    if (v !== 'rosette') {
      const n = view.circles.length;
      msg = n + ' circles (|k| ≤ ' + N + ') = ' + 2 * n + ' numbers trace this outline.';
    }
    $('epiReadout').textContent = msg;
  }

  // Loads an uploaded image, traces and FFTs it, and installs the result as motif A.
  function onUpload(file) {
    if (!file) return;
    const img = new Image();
    img.onload = function () {
      const pts = BG.traceImage(img);
      URL.revokeObjectURL(img.src);
      if (!pts) { $('uploadMsg').textContent = 'Could not find a clear shape - try a dark silhouette on a plain light background.'; return; }
      BG.addCustomMotif('custom', pts);
      state.motifA = 'custom';
      fillMotifSelect('motifA', 'custom');
      fillMotifSelect('motifB', state.motifB);
      fillLabSelect('custom');
      $('uploadMsg').textContent = 'Traced ' + pts.length + ' outline points, FFT to ' + (2 * 48 + 1) + ' harmonics. Now motif A (morph it with B).';
      scheduleRender();
    };
    img.onerror = function () { $('uploadMsg').textContent = 'That file could not be read as an image.'; };
    img.src = URL.createObjectURL(file);
  }

  // Wires every control to state changes and starts the epicycle animation.
  function bind() {
    Object.keys(BG.STYLES).forEach(function (k) { $('style').insertAdjacentHTML('beforeend', '<option value="' + k + '">' + BG.STYLES[k].label + '</option>'); });
    $('style').addEventListener('change', function (e) { setStyle(e.target.value); });
    $('motifA').addEventListener('change', function (e) { state.motifA = e.target.value; scheduleRender(); });
    $('motifB').addEventListener('change', function (e) { state.motifB = e.target.value; scheduleRender(); });
    $('aspect').addEventListener('change', function (e) { state.aspect = parseFloat(e.target.value); scheduleRender(); });
    $('medallion').addEventListener('change', function (e) { state.medallion = e.target.checked; scheduleRender(); });
    $('seed').addEventListener('input', function (e) { state.seed = Math.max(1, parseInt(e.target.value, 10) || 1); scheduleRender(); });
    $('dice').addEventListener('click', function () { state.seed = 1 + Math.floor(Math.random() * 9999); $('seed').value = state.seed; scheduleRender(); });
    $('upload').addEventListener('change', function (e) { onUpload(e.target.files[0]); e.target.value = ''; });
    $('labShape').addEventListener('change', updateLab);
    $('epiPlay').addEventListener('click', function () { $('epiPlay').textContent = view.toggle() ? 'Pause' : 'Play'; });
    $('epiRestart').addEventListener('click', function () { view.restart(); });
    // Builds the export filename stem from the current style and seed.
    const name = function () { return 'fourier-border-' + state.style + '-' + state.seed; };
    $('exSvg').addEventListener('click', function () { if (last) BG.exportSvg(last.svg, name()); });
    $('exPng').addEventListener('click', function () { if (last) BG.exportPng(last.svg, last.W, last.H, name()); });
    $('exJson').addEventListener('click', function () { if (last) BG.exportJson(state, last.stats, name()); });
    window.addEventListener('resize', function () { fitStage(); view.drawSpectrum(); });
    if (window.ResizeObserver) new ResizeObserver(fitStage).observe($('frame')); // re-fit whenever the stage box changes size
    // Toggles focus mode (panels hidden) and re-fits the border to the new stage size.
    const toggleFocus = function () { document.body.classList.toggle('focus'); fitStage(); };
    $('focusBtn').addEventListener('click', toggleFocus);
    window.addEventListener('keydown', function (e) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range') return;
      if (e.key === 'f' || e.key === 'F') toggleFocus();
      if (e.key === 'd' || e.key === 'D') $('autoDemo').click();
    });

    demo = BG.AutoDemo({
      setKnob: setKnob, setStyle: setStyle,
      say: function (t) { $('narration').textContent = t; $('autoDemo').textContent = '■ Stop demo'; },
      done: function () { $('narration').textContent = ''; $('autoDemo').classList.remove('on'); $('autoDemo').textContent = '▶ Auto demo'; }
    });
    $('autoDemo').addEventListener('click', function () {
      if (demo.running) { demo.stop(); return; }
      $('autoDemo').classList.add('on');
      demo.start();
    });
  }

  // Boots the app: controls, first render and the epicycle loop.
  function init() {
    Object.assign(state, defaultsFor('pattachitra'));
    applyHash();
    view = BG.EpicycleView($('epi'), $('spec'));
    buildSliders();
    bind();
    syncUi();
    fillLabSelect();
    render();
    view.start();
    window.BGApp = { state: state, setKnob: setKnob, setStyle: setStyle, render: render, lastSvg: function () { return last && last.svg; } };
  }

  window.addEventListener('DOMContentLoaded', init);
})(globalThis.BG);

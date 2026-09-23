// Sanity tests for the Fourier core: DFT round-trip, symmetry masks, truncation error, series ranges.
const assert = require('assert');
require('../js/fourier.js');
require('../js/motifs.js');
const BG = globalThis.BG;

// Round trip: full-K coefficients should reproduce the sampled outline closely.
for (const name of BG.MOTIF_NAMES) {
  const c = BG.motifs[name];
  const xy = BG.evalCurve(c, 256);
  const b = BG.bounds(xy);
  assert(b[3] > 0.85 && b[3] < 1.2, name + ' tip near y=1, got ' + b[3]);
  const low = BG.evalCurve(BG.truncate(c, 3), 256);
  let err = 0;
  for (let i = 0; i < xy.length; i++) err = Math.max(err, Math.abs(xy[i] - low[i]));
  console.log(name.padEnd(8), 'bounds', b.map(v => v.toFixed(2)).join(','), ' max err N=3:', err.toFixed(3),
    ' numbers N=12:', BG.countNumbers(BG.truncate(c, 12)));
}

// m-fold symmetry: rotating the parameter by 2pi/m equals rotating the plane by 2pi/m.
const m = 6, s = BG.starCoeffs(m, 0.9), J = 240;
const p = BG.evalCurve(s, J);
const shift = J / m, rot = 2 * Math.PI / m;
let symErr = 0;
for (let j = 0; j < J; j++) {
  const q = (j + shift) % J;
  const x = p[2 * j] * Math.cos(rot) - p[2 * j + 1] * Math.sin(rot);
  const y = p[2 * j] * Math.sin(rot) + p[2 * j + 1] * Math.cos(rot);
  symErr = Math.max(symErr, Math.hypot(x - p[2 * q], y - p[2 * q + 1]));
}
assert(symErr < 1e-9, 'star not m-fold symmetric: ' + symErr);
console.log('star symmetry error', symErr.toExponential(1));

// Series ranges.
assert(Math.abs(BG.scallopSeries(Math.PI / 2, 40) - 1) < 0.02);
assert(Math.abs(BG.triangleSeries(Math.PI / 2, 40) - 1) < 0.01);
const r = BG.rosetteCurve(8, 10, 0.4, 1.2, 256);
const rb = BG.bounds(r);
assert(rb[2] <= 1.001 && rb[2] > 0.9);
console.log('all math tests passed');

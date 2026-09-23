// Tests the silhouette tracer on synthetic images: shape recovery, normalisation and DFT round trip.
const assert = require('assert');
['fourier', 'motifs', 'trace'].forEach(f => require('../js/' + f + '.js'));
const BG = globalThis.BG;

// Rasterises an inside(x,y) predicate into an RGBA buffer, dark shape on white.
function raster(w, h, inside, noise) {
  const px = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (inside(x, y)) { const i = 4 * (y * w + x); px[i] = px[i + 1] = px[i + 2] = 20; }
  }
  if (noise) for (let k = 0; k < 6; k++) { const i = 4 * ((5 + k) * w + 5 + k); px[i] = px[i + 1] = px[i + 2] = 0; }
  return px;
}

// Ellipse: 60 wide, 100 tall, in a 120x140 image -> after normalise width ~0.6, height 1.
const w = 120, h = 140;
const ell = raster(w, h, (x, y) => ((x - 60) / 30) ** 2 + ((y - 70) / 50) ** 2 <= 1, true);
const pts = BG.traceMask(ell, w, h);
assert(pts && pts.length === 256, 'ellipse traced');
const xy = new Float64Array(512); pts.forEach((p, i) => { xy[2 * i] = p[0]; xy[2 * i + 1] = p[1]; });
const b = BG.bounds(xy);
console.log('ellipse bounds', b.map(v => v.toFixed(2)).join(','), 'start', pts[0].map(v => v.toFixed(2)).join(','));
assert(Math.abs(b[3] - 1) < 0.03 && Math.abs(b[1]) < 0.03, 'height normalised to 1');
assert(Math.abs((b[2] - b[0]) - 0.6) < 0.04, 'width ~0.6');
assert(pts[0][1] < 0.05 && Math.abs(pts[0][0]) < 0.06, 'starts at base centre');
let area = 0; for (let i = 0; i < 256; i++) { const a = pts[i], c = pts[(i + 1) % 256]; area += a[0] * c[1] - c[0] * a[1]; }
assert(area > 0, 'counter-clockwise');
assert(Math.abs(area / 2 - Math.PI * 0.3 * 0.5) < 0.02, 'area matches ellipse ' + (area / 2).toFixed(3));

// A leaf-ish shape with a notch, then DFT round trip through the motif library.
const leaf = raster(w, h, (x, y) => { const t = (y - 20) / 100; return t >= 0 && t <= 1 && Math.abs(x - 60) <= 34 * Math.sin(Math.PI * t) ** 0.8 * (1 - 0.3 * t); });
const lp = BG.traceMask(leaf, w, h);
assert(lp, 'leaf traced');
const c = BG.addCustomMotif('custom', lp);
const back = BG.evalCurve(c, 256);
let err = 0; lp.forEach((p, i) => { err = Math.max(err, Math.hypot(p[0] - back[2 * i], p[1] - back[2 * i + 1])); });
console.log('custom motif round-trip max err (K=48):', err.toFixed(3));
assert(err < 0.05);
assert(BG.traceMask(new Uint8ClampedArray(w * h * 4).fill(255), w, h) === null, 'blank image -> null');
console.log('trace tests passed');

// Dev helper: builds each style's border with default knobs and writes SVG files (optionally with overrides from argv).
const fs = require('fs'), path = require('path');
['fourier', 'motifs', 'styles', 'layers', 'layout'].forEach(f => require('../js/' + f + '.js'));
const BG = globalThis.BG;
const outDir = process.argv[2] || '.';
const over = {};
process.argv.slice(3).forEach(a => { const [k, v] = a.split('='); over[k] = isNaN(v) ? v : +v; });
Object.keys(BG.STYLES).forEach(name => {
  const d = BG.STYLES[name].defaults, st = BG.STYLES[name];
  const state = Object.assign({
    style: name, N: d.N, m: d.m, count: d.count, period: d.period, thickness: d.thickness, variation: d.variation,
    seed: 7, aspect: 4 / 3, motifA: st.primary, motifB: st.morphTo, morph: 0, medallion: true
  }, over);
  if (over.style && over.style !== name) return;
  const t0 = Date.now();
  const r = BG.buildFrame(state);
  fs.writeFileSync(path.join(outDir, name + '.svg'), r.svg);
  console.log(name, 'ms', Date.now() - t0, 'kb', Math.round(r.svg.length / 1024), JSON.stringify(r.stats));
});

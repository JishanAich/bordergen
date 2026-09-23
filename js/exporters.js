// Export helpers: SVG, PNG and parameter-JSON downloads for the generated border.
(function (BG) {
  // Triggers a browser download of a Blob under the given filename.
  BG.download = function (blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  };

  // Saves the border as a standalone, layer-grouped .svg file that opens cleanly in Inkscape or Illustrator.
  BG.exportSvg = function (svgText, name) {
    const doc = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgText.replace(/></g, '>\n<');
    BG.download(new Blob([doc], { type: 'image/svg+xml' }), name + '.svg');
  };

  // Rasterises the SVG at 2x through an offscreen canvas and saves it as a PNG.
  BG.exportPng = function (svgText, W, H, name) {
    const img = new Image();
    img.onload = function () {
      const cv = document.createElement('canvas');
      cv.width = W * 2;
      cv.height = H * 2;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(function (b) { BG.download(b, name + '.png'); }, 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  };

  // Lists the non-zero harmonics of a coefficient set as [{k, re, im}] rounded to 4 decimals.
  function coeffList(c) {
    const out = [];
    for (let k = -c.K; k <= c.K; k++) {
      const re = c.re[k + c.K], im = c.im[k + c.K];
      if (re !== 0 || im !== 0) out.push({ k: k, re: +re.toFixed(4), im: +im.toFixed(4) });
    }
    return out;
  }

  // Saves the knob values plus the actual motif coefficients: the whole border is this small file.
  BG.exportJson = function (state, stats, name) {
    const style = BG.STYLES[state.style];
    const motif = BG.truncate(BG.lerp(BG.motifs[state.motifA], BG.motifs[state.motifB], state.morph / 100), state.N);
    const doc = {
      about: 'Fourier Border Studio parameters: the border is generated from these numbers only.',
      state: state, numbersTotal: stats.total,
      primaryMotif: { model: 'z(t) = sum c_k e^{ikt}', harmonics: coeffList(motif) },
      rosette: { model: 'r(theta) = rho + norm(sum cos(n m theta)/n^p)', m: state.m, N: state.N, rings: style.corner.rings },
      palette: style.palette
    };
    BG.download(new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' }), name + '.json');
  };
})((globalThis.BG = globalThis.BG || {}));

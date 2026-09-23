// Image tracer: turns a silhouette image into a normalised closed outline that the DFT can learn from.
(function (BG) {
  // Builds a foreground mask from RGBA pixels: alpha if the image has transparency, else difference from the corner colour.
  function makeMask(rgba, w, h) {
    const mask = new Uint8Array(w * h);
    let transparent = false;
    for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 250) { transparent = true; break; }
    // Luminance of the pixel starting at RGBA index i.
    const lum = function (i) { return 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]; };
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4].map(lum).sort(function (a, b) { return a - b; });
    const bg = (corners[1] + corners[2]) / 2;
    for (let p = 0; p < w * h; p++) {
      mask[p] = transparent ? (rgba[4 * p + 3] > 128 ? 1 : 0) : (Math.abs(lum(4 * p) - bg) > 55 ? 1 : 0);
    }
    return mask;
  }

  // Keeps only the largest 4-connected blob of the mask (drops specks and noise).
  function largestBlob(mask, w, h) {
    const label = new Int32Array(w * h), sizes = [0];
    const stack = new Int32Array(w * h);
    let next = 1;
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || label[s]) continue;
      let sp = 0, size = 0;
      stack[sp++] = s;
      label[s] = next;
      while (sp) {
        const p = stack[--sp], x = p % w, y = (p / w) | 0;
        size++;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
        for (let k = 0; k < 4; k++) {
          const q = nb[k];
          if (q >= 0 && mask[q] && !label[q]) { label[q] = next; stack[sp++] = q; }
        }
      }
      sizes[next++] = size;
    }
    let best = 0;
    for (let i = 1; i < sizes.length; i++) if (!best || sizes[i] > sizes[best]) best = i;
    const out = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) out[p] = label[p] === best && best ? 1 : 0;
    return out;
  }

  // Moore-neighbour boundary tracing of the blob's outer edge; returns pixel coordinates in walking order.
  function traceBoundary(mask, w, h) {
    let sx = -1, sy = -1;
    for (let p = 0; p < w * h && sx < 0; p++) if (mask[p]) { sx = p % w; sy = (p / w) | 0; }
    if (sx < 0) return [];
    const dx = [-1, -1, 0, 1, 1, 1, 0, -1], dy = [0, -1, -1, -1, 0, 1, 1, 1];
    // True when (x,y) is inside the image and part of the mask.
    const at = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x]; };
    const pts = [[sx, sy]];
    let cx = sx, cy = sy, dir = 0;
    for (let guard = 0; guard < w * h * 8; guard++) {
      let found = false;
      for (let i = 0; i < 8; i++) {
        const d = (dir + 6 + i) % 8, nx = cx + dx[d], ny = cy + dy[d];
        if (at(nx, ny)) { cx = nx; cy = ny; dir = d; found = true; break; }
      }
      if (!found || (cx === sx && cy === sy)) break;
      pts.push([cx, cy]);
    }
    return pts;
  }

  // Normalises a traced outline: y up, base at y=0 (start point), height 1, x centred, counter-clockwise, 256 points.
  function normalise(pts) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    const H = Math.max(y1 - y0, 1), cx = (x0 + x1) / 2;
    let q = pts.map(function (p) { return [(p[0] - cx) / H, (y1 - p[1]) / H]; });
    let area = 0;
    for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) q = q.reverse();
    let s = 0;
    for (let i = 1; i < q.length; i++) {
      const better = q[i][1] < q[s][1] - 1e-9 || (Math.abs(q[i][1] - q[s][1]) < 1e-9 && Math.abs(q[i][0]) < Math.abs(q[s][0]));
      if (better) s = i;
    }
    q = q.slice(s).concat(q.slice(0, s));
    const sm = q.map(function (_, i) {
      let sx = 0, sy = 0;
      for (let k = -3; k <= 3; k++) { const r = q[(i + k + q.length) % q.length]; sx += r[0]; sy += r[1]; }
      return [sx / 7, sy / 7];
    });
    return BG.resample(sm, 256);
  }

  // Traces raw RGBA pixels (w x h) and returns the normalised outline, or null if no usable shape is found.
  BG.traceMask = function (rgba, w, h) {
    const blob = largestBlob(makeMask(rgba, w, h), w, h);
    const edge = traceBoundary(blob, w, h);
    if (edge.length < 24) return null;
    return normalise(edge);
  };

  // Downsamples an <img> to at most 160px, then traces it; returns the outline or null.
  BG.traceImage = function (img) {
    const scale = 160 / Math.max(img.naturalWidth, img.naturalHeight, 1);
    const w = Math.max(8, Math.round(img.naturalWidth * Math.min(scale, 1))), h = Math.max(8, Math.round(img.naturalHeight * Math.min(scale, 1)));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    return BG.traceMask(g.getImageData(0, 0, w, h).data, w, h);
  };
})((globalThis.BG = globalThis.BG || {}));

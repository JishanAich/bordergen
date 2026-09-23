// Band drawers: each works in local side coordinates (u along the side, v inward from the outer edge) and returns SVG strings.
(function (BG) {
  const TWO_PI = Math.PI * 2;

  // Rounds a number to one decimal for compact SVG output.
  function f(n) { return String(Math.round(n * 10) / 10); }

  // Converts an interleaved xy array to a closed path string, mapping each point through fn(x,y)->[X,Y].
  function dOf(xy, fn) {
    let d = '';
    for (let i = 0; i < xy.length; i += 2) {
      const p = fn(xy[i], xy[i + 1]);
      d += (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]);
    }
    return d + 'Z';
  }

  // Builds a <path> element string from path data and paint settings (empty string skips an attribute).
  function pathEl(d, fill, stroke, sw, id) {
    return '<path' + (id ? ' id="' + id + '"' : '') + ' d="' + d + '" fill="' + (fill || 'none') + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + sw + '"' : '') + '/>';
  }

  // Builds a <circle> element string.
  function circleEl(cx, cy, r, fill, stroke, sw) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + sw + '"' : '') + '/>';
  }

  // Picks the i-th entry of a colour-name list and resolves it through the palette.
  function pick(ctx, list, i) { return ctx.pal[list[i % list.length]]; }

  // Number of repeats that fit a side exactly, so patterns close seamlessly at the corners.
  function repeats(ctx, L) {
    const n = Math.max(1, Math.round(L / ctx.state.period));
    return { n: n, pp: L / n };
  }

  // Motif frieze: petals/fish/etc. repeated along the band, alternating direction so neighbours interlock.
  function drawMotifs(ctx, L, y0, h, layer) {
    const out = [], ink = ctx.pal[ctx.style.ink || 'ink'];
    const r = repeats(ctx, L), alt = layer.mode === 'alt';
    const count = alt ? 2 * r.n : r.n, step = L / count;
    const s = Math.min(h * 0.92, step * 1.7), tp = ctx.tp;
    for (let i = 0; i < count; i++) {
      const uc = step * (i + 0.5), d = alt && i % 2 ? 1 : -1;
      const vb = y0 + h / 2 - (d * s) / 2;
      const c = BG.perturb(ctx.motif(layer.motif), ctx.variation, ctx.rand);
      const xy = BG.evalCurve(c, 96);
      const fill = pick(ctx, layer.fill, i >> (alt ? 1 : 0));
      // Maps a motif-local point to canvas coordinates for this frieze slot (scale s, direction d).
      const map = function (x, y) { return tp(uc + s * x, vb + d * s * y); };
      if (layer.dbl) out.push(pathEl(dOf(xy, map), 'none', ink, layer.sw * 2.6));
      out.push(pathEl(dOf(xy, map), fill, layer.dbl ? ctx.pal.paper : ink, layer.dbl ? layer.sw * 0.9 : layer.sw));
      if (layer.inner) {
        // Same mapping as above but shrunk to 55% about the motif's belly for the inner petal.
        const inner = function (x, y) { return tp(uc + s * 0.55 * x, vb + d * s * (0.42 + (y - 0.42) * 0.55)); };
        out.push(pathEl(dOf(xy, inner), pick(ctx, layer.inner, i >> (alt ? 1 : 0)), ink, layer.sw * 0.8));
      }
    }
    return out;
  }

  // Creeper vine: a Fourier centre-line with leaves at alternate zero-crossings and buds at the crests.
  function drawVine(ctx, L, y0, h, layer) {
    const out = [], tp = ctx.tp, ink = ctx.pal[ctx.style.ink || 'ink'];
    const r = repeats(ctx, L), Nv = Math.max(1, Math.round(ctx.state.N / 4));
    const cy = y0 + h / 2, amp = h * 0.24;
    // Vine centre-line offset v at position u along the band (Fourier series).
    const vAt = function (u) { return cy + amp * BG.vineSeries((TWO_PI * u) / r.pp, Nv); };
    let d = '';
    for (let u = 0; u <= L + 0.01; u += 2) {
      const p = tp(u, vAt(u));
      d += (u ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]);
    }
    out.push(pathEl(d, 'none', ctx.pal[layer.stroke], layer.sw));
    for (let j = 1; j < 2 * r.n; j++) {
      const u = (j * r.pp) / 2, side = j % 2 ? 1 : -1;
      const slope = (vAt(u + 0.5) - vAt(u - 0.5)) / 1;
      const ang = Math.atan2(slope, 1) + side * 1.15;
      const dir = [Math.cos(ang), Math.sin(ang)];
      const s = h * 0.56 * (0.9 + 0.2 * ctx.rand()), v0 = vAt(u);
      const c = BG.perturb(ctx.motif(layer.leaf), ctx.variation, ctx.rand);
      const xy = BG.evalCurve(c, 72);
      // Rotates a leaf-local point to point along dir, scales it and places it on the vine node.
      const map = function (x, y) { return tp(u + s * (x * dir[1] + y * dir[0]), v0 + s * (-x * dir[0] + y * dir[1])); };
      out.push(pathEl(dOf(xy, map), pick(ctx, layer.fill, j), ink, 1.1));
    }
    for (let j = 0; j < 2 * r.n; j++) {
      const u = (r.pp * (0.25 + 0.5 * j)), p = ctx.tp(u, vAt(u));
      out.push(circleEl(p[0], p[1], h * 0.055, pick(ctx, layer.fill, 2), ink, 0.8));
    }
    return out;
  }

  // Fourier wave band: scallops (|sin| series) or zigzag (triangle series), stacked in nested rows.
  function drawWave(ctx, L, y0, h, layer) {
    const out = [], tp = ctx.tp, ink = ctx.pal[ctx.style.ink || 'ink'];
    const r = repeats(ctx, L), N = Math.max(1, Math.min(ctx.state.N, 40)), rows = layer.rows || 1;
    const line = layer.outline ? ctx.pal[layer.fill[0]] : ink;
    for (let row = 0; row < rows; row++) {
      const pts = [];
      for (let u = 0; u <= L + 0.01; u += 2) {
        let v;
        if (layer.shape === 'scallop') {
          const hh = h * 0.96 * Math.pow(0.72, row);
          v = y0 + h - hh * BG.scallopSeries((Math.PI * u) / r.pp, N);
        } else {
          const amp = h * 0.36 * (1 - row * 0.3), cy = y0 + h * (0.42 + row * 0.16);
          v = cy - amp * BG.triangleSeries((TWO_PI * u) / r.pp, N);
        }
        pts.push(tp(u, Math.min(v, y0 + h)));
      }
      let d = '';
      pts.forEach(function (p, i) { d += (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]); });
      if (layer.outline) { out.push(pathEl(d, 'none', line, layer.sw)); continue; }
      const a = tp(L, y0 + h), b = tp(0, y0 + h);
      d += 'L' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]) + 'Z';
      out.push(pathEl(d, pick(ctx, layer.fill, row), line, layer.sw));
    }
    return out;
  }

  // Dot rows: evenly spaced circles in one or two staggered rows.
  function drawDots(ctx, L, y0, h, layer) {
    const out = [], ink = ctx.pal[ctx.style.ink || 'ink'];
    const r = repeats(ctx, L), per = layer.per || 2, rows = layer.rows || 1;
    const q = r.pp / per, rad = Math.min((h / rows) * 0.31, q * 0.42) * (layer.r || 1);
    for (let row = 0; row < rows; row++) {
      const v = y0 + (h * (row + 0.5)) / rows, off = row % 2 ? q / 2 : 0;
      for (let i = 0; i < r.n * per; i++) {
        const u = q * (i + 0.5) + off;
        if (u > L - rad) continue;
        const p = ctx.tp(u, v);
        out.push(circleEl(p[0], p[1], rad, pick(ctx, layer.fill, i + row), ink, 0.6));
      }
    }
    return out;
  }

  // Chain of small polar-Fourier flowers (m petals, N harmonics) centred along the band.
  function drawRosettes(ctx, L, y0, h, layer) {
    const out = [], ink = ctx.pal[ctx.style.ink || 'ink'], st = ctx.state, tp = ctx.tp;
    const n = Math.max(1, Math.round(L / (h * 1.08))), q = L / n, R = Math.min(h * 0.47, q * 0.5);
    const m = st.m, Nr = Math.max(2, Math.min(st.N, 16)), J = Math.max(96, m * 20);
    const big = BG.rosetteCurve(m, Nr, 0.45, 2.1, J), small = BG.rosetteCurve(m, Nr, 0.5, 2.1, J);
    const half = Math.PI / m, ch = Math.cos(half), sh = Math.sin(half);
    for (let i = 0; i < n; i++) {
      const cu = q * (i + 0.5), cv = y0 + h / 2;
      out.push(pathEl(dOf(big, function (x, y) { return tp(cu + R * x, cv + R * y); }), pick(ctx, layer.fill, 0), ink, layer.sw));
      out.push(pathEl(dOf(small, function (x, y) {
        return tp(cu + 0.62 * R * (x * ch - y * sh), cv + 0.62 * R * (x * sh + y * ch));
      }), pick(ctx, layer.fill, 1), ink, layer.sw * 0.8));
      const c = tp(cu, cv);
      out.push(circleEl(c[0], c[1], R * 0.18, pick(ctx, layer.fill, 2), ink, 0.8));
    }
    return out;
  }

  // Hatching: slanted strokes repeated along the band (Madhubani-style filler).
  function drawHatch(ctx, L, y0, h, layer) {
    const r = repeats(ctx, L), q = r.pp / 3, out = [];
    let d = '';
    for (let i = 0; i < r.n * 3; i++) {
      const u = q * i + q * 0.2;
      const a = ctx.tp(u, y0 + h * 0.18), b = ctx.tp(u + q * 0.55, y0 + h * 0.82);
      d += 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]);
    }
    out.push(pathEl(d, 'none', ctx.pal[layer.stroke], layer.sw));
    return out;
  }

  BG.LAYER_DRAWERS = { motifs: drawMotifs, vine: drawVine, wave: drawWave, dots: drawDots, rosettes: drawRosettes, hatch: drawHatch };
  BG.svgUtil = { f: f, dOf: dOf, pathEl: pathEl, circleEl: circleEl };
})((globalThis.BG = globalThis.BG || {}));

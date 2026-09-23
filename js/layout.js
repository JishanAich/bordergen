// Frame layout: stacks bands on each side, places corner rosettes, and assembles the final SVG string.
(function (BG) {
  const U = BG.svgUtil, f = U.f;

  // Returns the four side transforms (top,right,bottom,left) mapping local (u,v) to canvas x,y; u runs the
  // FULL edge length (corner to corner) so bands flow through the corners, clipped to a 45° miter below.
  function sideTransforms(W, H, T) {
    return [
      function (u, v) { return [u, v]; },
      function (u, v) { return [W - v, u]; },
      function (u, v) { return [W - u, H - v]; },
      function (u, v) { return [v, H - u]; }
    ];
  }

  // Returns the four mitered-trapezoid clip polygons (one per side) that tile the border ring with no gap or
  // overlap, so adjacent sides' bands meet at a 45° seam at each corner instead of stopping at a flat block.
  function sideClipPolys(W, H, T) {
    return [
      [[0, 0], [W, 0], [W - T, T], [T, T]],
      [[W, 0], [W, H], [W - T, H - T], [W - T, T]],
      [[W, H], [0, H], [T, H - T], [W - T, H - T]],
      [[0, H], [0, 0], [T, T], [T, H - T]]
    ];
  }

  // Draws a layered rosette (polar-Fourier petals, 3-circle star, discs) centred at cx,cy with outer radius R.
  function drawRosetteArt(ctx, cx, cy, R, spec) {
    const out = [], m = ctx.state.m, ink = ctx.pal.ink, N = Math.max(1, Math.min(ctx.state.N, 40));
    const stroke = spec.stroke ? ctx.pal[spec.stroke] : ink, J = Math.max(160, m * 32);
    spec.rings.forEach(function (ring, i) {
      const rr = R * ring.r, fill = ctx.pal[ring.fill];
      if (ring.t === 'disc') { out.push(U.circleEl(cx, cy, rr, fill, stroke, 1.3)); return; }
      let xy, rot = (ring.rot || 0) * ((2 * Math.PI) / m);
      if (ring.t === 'polar') {
        xy = BG.rosetteCurve(m, N, ring.rho, ring.p, J);
      } else {
        xy = BG.evalCurve(BG.starCoeffs(m, ring.sharp), J);
        const mx = BG.bounds(xy)[2], sc = 1 / Math.max(mx, 1e-9);
        for (let k = 0; k < xy.length; k++) xy[k] *= sc;
        rot += Math.PI / m;
      }
      const cs = Math.cos(rot), sn = Math.sin(rot);
      out.push(U.pathEl(U.dOf(xy, function (x, y) { return [cx + rr * (x * cs - y * sn), cy + rr * (x * sn + y * cs)]; }), fill, stroke, 1.3, 'ring' + i));
    });
    return out;
  }

  // Counts the numbers describing a rosette spec: N harmonics + 2 shape params per polar ring, 3 per star, 2 per disc.
  function rosetteNumbers(spec, N) {
    return spec.rings.reduce(function (a, r) { return a + (r.t === 'polar' ? N + 2 : r.t === 'star' ? 3 : 2); }, 0);
  }

  // Resolves a layer's motif name ('primary' = lerp of the chosen A/B motifs) to truncated coefficients, cached.
  function motifGetter(state) {
    const cache = {};
    return function (name) {
      const key = name + '|' + state.motifA + '|' + state.motifB + '|' + state.morph + '|' + state.N;
      if (!cache[key]) {
        let c;
        if (name === 'primary') c = BG.lerp(BG.motifs[state.motifA], BG.motifs[state.motifB], state.morph / 100);
        else c = BG.motifs[name];
        cache[key] = BG.truncate(c, state.N);
      }
      return cache[key];
    };
  }

  // Builds the whole border as an SVG document string plus statistics about how few numbers describe it.
  BG.buildFrame = function (state) {
    const style = BG.STYLES[state.style], pal = style.palette;
    const W = 1000, H = Math.round(W / state.aspect), T = state.thickness;
    const layers = style.layers.slice(0, state.count);
    const ruleH = style.ruleH, ruleCol = pal[style.ruleColor];
    const ctx = {
      style: style, pal: pal, state: state, rand: BG.rng(state.seed), tp: null,
      variation: (state.variation / 100) * 0.2, motif: motifGetter(state),
      stats: { motif: 0, series: 0, rosette: 0 }
    };
    const usedMotifs = {};
    const flex = T - (layers.length + 1) * ruleH, wsum = layers.reduce(function (a, l) { return a + l.w; }, 0);
    const bands = [];
    let y = ruleH;
    layers.forEach(function (layer) {
      const h = (flex * layer.w) / wsum;
      bands.push({ layer: layer, y0: y, h: h });
      y += h + ruleH;
      const names = layer.type === 'motifs' ? [layer.motif] : layer.type === 'vine' ? [layer.leaf] : [];
      names.forEach(function (nm) {
        const key = nm + '|' + (nm === 'primary' ? state.motifA + state.motifB + state.morph : '');
        if (!usedMotifs[key]) { usedMotifs[key] = 1; ctx.stats.motif += BG.countNumbers(ctx.motif(nm)); }
      });
      if (layer.type === 'wave') ctx.stats.series += Math.min(state.N, 40) + 2;
      if (layer.type === 'vine') ctx.stats.series += Math.max(1, Math.round(state.N / 4)) + 2;
      if (layer.type === 'rosettes') ctx.stats.rosette += 2 * Math.min(state.N, 16) + 4;
    });

    const svg = [];
    svg.push('<rect id="paper" width="' + W + '" height="' + H + '" fill="' + pal.paper + '"/>');
    const names = ['top', 'right', 'bottom', 'left'], tfs = sideTransforms(W, H, T), clips = sideClipPolys(W, H, T);
    svg.push('<defs>' + clips.map(function (poly, i) {
      return '<clipPath id="clip-' + names[i] + '"><polygon points="' + poly.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' ') + '"/></clipPath>';
    }).join('') + '</defs>');
    for (let s = 0; s < 4; s++) {
      const L = s % 2 === 0 ? W : H; // full edge length: bands run corner-to-corner, mitered by the clip below
      ctx.tp = tfs[s];
      svg.push('<g id="side-' + names[s] + '" clip-path="url(#clip-' + names[s] + ')">');
      bands.forEach(function (b, i) {
        const p = [ctx.tp(0, b.y0), ctx.tp(L, b.y0), ctx.tp(L, b.y0 + b.h), ctx.tp(0, b.y0 + b.h)];
        const rect = p.map(function (q, k) { return (k ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1]); }).join('') + 'Z';
        svg.push('<g id="' + names[s] + '-band' + (i + 1) + '-' + b.layer.type + '">');
        svg.push(U.pathEl(rect, pal[b.layer.bg], null, 0));
        svg.push('<g>' + BG.LAYER_DRAWERS[b.layer.type](ctx, L, b.y0, b.h, b.layer).join('') + '</g></g>');
      });
      for (let i = 0; i <= bands.length; i++) {
        const v = i === 0 ? 0 : bands[i - 1].y0 + bands[i - 1].h;
        const p = [ctx.tp(0, v), ctx.tp(L, v), ctx.tp(L, v + ruleH), ctx.tp(0, v + ruleH)];
        svg.push(U.pathEl(p.map(function (q, k) { return (k ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1]); }).join('') + 'Z', ruleCol, null, 0));
      }
      svg.push('</g>');
    }

    // Corners get no flat background block: the mitered bands above already flow through them uninterrupted, so
    // the rosette sits on top as a medallion accent at the seam. Its radius is capped so it blooms out of the
    // innermost band(s) without ever crossing over the outermost band's pattern.
    const outerBandEnd = bands.length ? bands[0].y0 + bands[0].h : ruleH;
    const cornerR = Math.max(T * 0.16, Math.min(T * 0.4, (T / 2 - outerBandEnd) / 0.98));
    ctx.stats.rosette += rosetteNumbers(style.corner, Math.max(1, Math.min(state.N, 40))); // all corners share one description
    const corners = [[0, 0], [W - T, 0], [W - T, H - T], [0, H - T]];
    corners.forEach(function (c, i) {
      svg.push('<g id="corner-' + (i + 1) + '">');
      svg.push(drawRosetteArt(ctx, c[0] + T / 2, c[1] + T / 2, cornerR, style.corner).join(''));
      svg.push('</g>');
    });

    svg.push('<rect id="frame-outer" x="' + ruleH / 2 + '" y="' + ruleH / 2 + '" width="' + (W - ruleH) + '" height="' + (H - ruleH) + '" fill="none" stroke="' + ruleCol + '" stroke-width="' + ruleH + '"/>');
    svg.push('<rect id="frame-inner" x="' + T + '" y="' + T + '" width="' + (W - 2 * T) + '" height="' + (H - 2 * T) + '" fill="none" stroke="' + ruleCol + '" stroke-width="' + ruleH + '"/>');

    if (state.medallion) {
      const R = Math.min(W - 2 * T, H - 2 * T) * 0.36;
      svg.push('<g id="centre-medallion">' + drawRosetteArt(ctx, W / 2, H / 2, R, style.corner).join('') + '</g>');
    }

    const st = ctx.stats, layoutNums = 8;
    const total = st.motif + st.series + st.rosette + layoutNums;
    const doc = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
      '" stroke-linejoin="round" stroke-linecap="round">' + svg.join('') + '</svg>';
    return { svg: doc, W: W, H: H, stats: { motif: st.motif, series: st.series, rosette: st.rosette, layout: layoutNums, total: total } };
  };
})((globalThis.BG = globalThis.BG || {}));

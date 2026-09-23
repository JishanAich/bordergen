# Fourier Border Studio

Generates Pattachitra (and Madhubani, Warli, Gond) borders from a few hundred Fourier coefficients instead of pixels
or diffusion-generated SVG. Every shape is a closed curve stored as complex coefficients, so it can be inspected,
truncated, morphed, symmetrised and exported as clean vector groups.

## Run it

- Open `index.html` in Chrome or Edge (no server, no install), **or**
- Open `dist/fourier-border-studio.html` — the same app in one 68 KB file (`node build.js` regenerates it).

Presenting: press **F** for full-size border (hides panels), **D** to start/stop the hands-free auto demo.
Any look can be linked: `index.html#style=gond&N=6&m=12&seed=42`.

## What the maths is

| Part | Representation |
|---|---|
| Motif (petal, fish, leaf, paisley, bloom) | closed curve `z(t) = Σ c_k e^{ikt}`, 97 complex harmonics, from a DFT of the outline |
| Corner rosette / medallion | polar series `r(θ) = ρ + norm(Σ cos(n·m·θ) / n^p)` — m petals, N harmonics |
| Star (lab panel + rosette centre) | just 3 circles `k = 1, 1+m, 1−m` — m-fold symmetry by construction |
| Bands | scallop = series of `abs(sin)`, zigzag = triangle-wave series, vine = `Σ sin(nx)/n^1.6` |
| Symmetry | m-fold rotational ⇔ only harmonics with `k ≡ 1 (mod m)` are non-zero |
| Detail | keep only `\|k\| ≤ N` — one slider from folk-simple to ornate |
| Morph | linear interpolation of two motifs' coefficients |
| Seamless corners | repeat count per side is `round(L / period)`, so the series is periodic over the side |

The pill in the header counts the real numbers needed to describe the current border (motif coefficients + band
series + rosette rings + layout). Pattachitra defaults land at ~231, Warli ~63.

## 3-minute demo script

1. Show the Pattachitra frame. Point at the pill: "this whole border is ~230 numbers."
2. Right panel: epicycles draw the petal. "A stack of rotating circles — that is the Fourier series." Spectrum below shows which harmonics are kept.
3. Drag **Harmonics N** 3 → 40: folk-simple → ornate. Watch the spectrum bars and the pill change.
4. Right panel → *Rosette from 3 circles*, drag **Rosette symmetry m**: three circles, m-fold symmetry for free.
5. **Morph A → B** petal → fish, then change Motif A/B.
6. Switch **Style**: Madhubani → Warli → Gond (a style is just a small data preset).
7. **Upload a motif silhouette**: traced, FFT'd, and used in the border. This is the "learning from data" step.
8. **Export SVG**, open in Inkscape/Illustrator: named groups per side and band (`top-band1-motifs`, `corner-1`, ...).
9. Roadmap line: learn coefficient distributions from a museum border dataset; a VAE / diffusion model over ~100 numbers rather than millions of pixels.

`D` runs steps 3–6 automatically if you want to talk over it.

## Be upfront about (for Q&A)

- **Not a trained model yet.** The generator is procedural + Fourier maths. "Learning" today = one uploaded silhouette →
  FFT. "Hand variation" is Gaussian noise on coefficients (damped by `(1+|k|)^-1.6`), not a learned distribution.
- **Motifs are authored outlines**, not scans of real Pattachitra work; palettes and band stacks are approximations.
  Have someone from the tradition review them before making claims about authenticity.
- Verified in Chrome only. SVG exports are checked to be well-formed and grouped; not opened in Illustrator here.

## Files

```
index.html, css/style.css       UI shell
js/fourier.js                   coefficients, DFT, truncate, lerp, perturb, symmetry, curve evaluation
js/motifs.js                    motif library (outline → DFT), rosette / star / band series
js/styles.js                    style presets (data only)
js/layers.js                    band drawers (motifs, vine, wave, dots, rosettes, hatch)
js/layout.js                    side transforms, band stacking, corners, SVG assembly, parameter count
js/trace.js                     silhouette image → normalised outline
js/epicycle.js                  epicycle animation + spectrum canvas
js/exporters.js, js/demo.js     SVG/PNG/JSON export, auto demo
js/app.js                       state, controls, rendering
build.js                        bundle into dist/fourier-border-studio.html
test/                           math.test.js, trace.test.js (node); e2e.js (headless Chrome over CDP)
```

Tests: `node test/math.test.js && node test/trace.test.js && node test/e2e.js <screenshot-dir>`
(`APP_URL=file:///.../dist/fourier-border-studio.html` runs e2e against the bundle).

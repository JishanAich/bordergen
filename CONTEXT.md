# bordergen — project context

Load this at the start of a session to pick the project back up (`/bordergen`, see the bottom).
Written 2026-09-21, right after the first demo was built.

## The idea in one line

Generate borders and frames for Pattachitra and other Indian folk-art styles from a **small set of Fourier
coefficients** instead of pixels, or an SVG-emitting diffusion model.

## Why (the motivation)

- A diffusion model that outputs pixels or raw SVG paths gives you something you cannot edit cleanly, cannot
  constrain (symmetry, seamless corners) and cannot explain.
- A border is naturally periodic and symmetric, which is exactly what Fourier series describe. Working in
  coefficient space gives properties for free:
  - **Compact:** a whole border is a few hundred numbers (Pattachitra demo ~231, Warli ~63).
  - **Symmetry by construction:** m-fold rotation means only harmonics with `k ≡ 1 (mod m)` are non-zero;
    mirror symmetry means real coefficients.
  - **One knob for style detail:** keep only `|k| <= N`. Few harmonics = bold, folk-simple (Warli-like),
    many = intricate (Pattachitra, Kalamkari-like).
  - **Seamless repeats:** a band of length L uses `round(L / period)` repeats, so the series is periodic over the side.
  - **Morphing and editing:** interpolate coefficients to morph shapes; the output is clean, grouped vector art.
- The long-term hope (not built): put a generative model over these ~100 numbers instead of millions of pixels.

## The maths (what the demo implements)

| Part | Representation |
|---|---|
| Motif outline (petal, fish, leaf, paisley, bloom) | closed curve `z(t) = Σ c_k e^{ikt}`, k = -48..48, obtained by a DFT of a 256-point outline |
| Corner rosette / medallion | polar series `r(θ) = ρ + norm(Σ cos(n·m·θ) / n^p)`: m petals, N harmonics |
| Star | three circles only: `k = 1, 1+m, 1-m` gives an m-fold star |
| Bands | scallop = series of `abs(sin x)`; zigzag = triangle-wave series; vine = `Σ sin(nx)/n^1.6` |
| Detail | truncate to `|k| <= N` |
| Morph | linear interpolation of two motifs' coefficients |
| Variation | Gaussian noise on coefficients, damped by `(1+|k|)^-1.6`, seeded |

## Border anatomy (the art side)

- A frame is a stack of **bands** along each side plus a **rosette in each corner square**, with thin rules between bands.
- Real Pattachitra borders: thin rule lines, a lotus-petal or creeper-vine band, dot rows, scallops, small flower chains,
  and corner medallions. Palette: vermilion, ochre/yellow, indigo, black, white, some green.
- Styles are just data presets (palette + band stack + corner recipe + default N/m):
  Pattachitra (Odisha), Madhubani (Bihar: double-line fish, hatching), Warli (Maharashtra: few harmonics, white on
  terracotta), Gond (Madhya Pradesh: dots and dashes, paisley, bright on black).
- Motif library: petal, leaf, fish, paisley, bloom. Each is hand-authored control points, smoothed, sampled, DFT'd.

## What exists now

- A **demo of the mechanics and maths only**, in plain JavaScript in `D:\CXA\bordergen`; open `index.html`.
  See `README.md` for the run instructions, the 3-minute demo script and the file map.
- Features: live sliders (harmonics, symmetry, bands, period, thickness, variation, morph), an epicycle animation and
  spectrum panel, image-to-motif upload (trace + FFT), SVG/PNG/JSON export, an auto-demo mode, and tests.
- It is deliberately a throwaway proof of mechanics. It was **decided not to port it** to another language;
  the next step is to think about a larger-scale implementation.

## Honest limits of the demo (do not overclaim)

- **No trained model.** Everything is procedural Fourier maths. The only "learning" is one uploaded silhouette -> FFT.
- Motifs, palettes and band stacks are the assistant's approximations, **not** scans or artist-verified designs.
- Tested in headless Chrome only; SVG exports checked to be well-formed, not opened in Illustrator/Inkscape.

## Working preferences

- Build **new** work in **Python** (not Node/JS). The existing JS demo stays as it is.
- Put a **one-line comment above every function** describing what it does.

## Open questions for the larger-scale version (suggestions, none decided)

- **Data:** where do real border examples come from (museum scans, artists, licensing)? How to extract clean outlines?
- **Learning:** PCA / VAE / diffusion over coefficient vectors; per-style vs conditional model; text or style
  conditioning; how much structure (bands, corners) to learn versus keep as rules.
- **Representation limits:** open curves and non-closed strokes, non-rectangular frames, motifs with holes or
  multiple components, and finer detail than a truncated series captures.
- **Quality and authenticity:** review by people from the tradition; a way to measure "looks like Pattachitra".
- **Product shape:** library or API, web tool, or plugin; output formats; content inside the frame.

## How to resume

Type **`/bordergen`** at the start of a session opened in `D:\CXA\bordergen`. You can add the task after it,
for example `/bordergen plan the large-scale Python version`. If the command is not listed, restart Claude Code
in this folder, or just say "read CONTEXT.md".

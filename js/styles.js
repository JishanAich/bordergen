// Style presets: each art form is data only (palette, band stack, corner rosette, default knob values).
(function (BG) {
  BG.STYLES = {
    pattachitra: {
      label: 'Pattachitra (Odisha)',
      blurb: 'Lotus petals, creeper vine, scallops; vermilion, ochre, indigo.',
      palette: { paper: '#f3e3b5', ink: '#1d1512', vermilion: '#c4301d', yellow: '#e8a71c', indigo: '#1f2f5e', white: '#fbf4e2', green: '#3d6b3c' },
      ruleH: 3.5, ruleColor: 'ink', primary: 'petal', morphTo: 'fish',
      defaults: { N: 14, m: 8, count: 5, period: 78, thickness: 190, variation: 12 },
      layers: [
        { type: 'motifs', motif: 'primary', mode: 'alt', w: 3.2, bg: 'yellow', fill: ['vermilion', 'white'], inner: ['yellow', 'vermilion'], sw: 1.4 },
        { type: 'vine', leaf: 'leaf', w: 3, bg: 'white', stroke: 'indigo', fill: ['vermilion', 'green', 'yellow'], sw: 2 },
        { type: 'dots', w: 1.3, bg: 'ink', fill: ['white', 'yellow'], per: 2, r: 0.95, rows: 1 },
        { type: 'wave', shape: 'scallop', w: 2.4, bg: 'indigo', fill: ['vermilion', 'yellow', 'white'], rows: 3, sw: 1.1 },
        { type: 'rosettes', w: 2.6, bg: 'yellow', fill: ['vermilion', 'indigo', 'white'], sw: 1.2 }
      ],
      corner: {
        bg: 'yellow',
        rings: [
          { t: 'polar', r: 0.98, rho: 0.42, p: 2.1, fill: 'vermilion' },
          { t: 'polar', r: 0.74, rho: 0.4, p: 2.1, fill: 'white', rot: 0.5 },
          { t: 'polar', r: 0.52, rho: 0.45, p: 2.1, fill: 'indigo' },
          { t: 'star', r: 0.36, sharp: 0.9, fill: 'yellow' },
          { t: 'disc', r: 0.12, fill: 'vermilion' }
        ]
      }
    },

    madhubani: {
      label: 'Madhubani (Bihar)',
      blurb: 'Double-line fish, hatching, bold colour blocks.',
      palette: { paper: '#f7ead0', ink: '#1a1a1a', red: '#b3261e', pink: '#d9557a', yellow: '#f0b400', green: '#2e7d4f', white: '#fffaf0' },
      ruleH: 3, ruleColor: 'ink', primary: 'fish', morphTo: 'leaf',
      defaults: { N: 10, m: 8, count: 5, period: 86, thickness: 190, variation: 10 },
      layers: [
        { type: 'motifs', motif: 'primary', mode: 'alt', w: 3.4, bg: 'white', fill: ['yellow', 'pink', 'green'], sw: 1.4, dbl: true },
        { type: 'hatch', w: 1.4, bg: 'yellow', stroke: 'ink', sw: 1.6 },
        { type: 'wave', shape: 'zigzag', w: 2.4, bg: 'red', fill: ['white', 'yellow'], rows: 2, sw: 1.2 },
        { type: 'dots', w: 1.6, bg: 'green', fill: ['white', 'yellow'], per: 2, r: 0.9, rows: 2 },
        { type: 'vine', leaf: 'petal', w: 3, bg: 'pink', stroke: 'ink', fill: ['yellow', 'white', 'green'], sw: 2 }
      ],
      corner: {
        bg: 'white',
        rings: [
          { t: 'polar', r: 0.98, rho: 0.45, p: 2.1, fill: 'red' },
          { t: 'polar', r: 0.72, rho: 0.42, p: 2.1, fill: 'yellow', rot: 0.5 },
          { t: 'polar', r: 0.5, rho: 0.5, p: 2.1, fill: 'green' },
          { t: 'star', r: 0.34, sharp: 0.85, fill: 'white' },
          { t: 'disc', r: 0.1, fill: 'ink' }
        ]
      }
    },

    warli: {
      label: 'Warli (Maharashtra)',
      blurb: 'Few harmonics: triangles, zigzags and dots in white on terracotta.',
      palette: { paper: '#a3452a', ink: '#5a1e0e', clay: '#a3452a', white: '#fff6e8' },
      ruleH: 3, ruleColor: 'white', primary: 'petal', morphTo: 'leaf',
      defaults: { N: 5, m: 6, count: 5, period: 70, thickness: 180, variation: 10 },
      layers: [
        { type: 'wave', shape: 'zigzag', w: 2.6, bg: 'clay', fill: ['white'], rows: 2, sw: 2.2, outline: true },
        { type: 'dots', w: 1.2, bg: 'clay', fill: ['white'], per: 2, r: 0.7, rows: 1 },
        { type: 'motifs', motif: 'primary', mode: 'alt', w: 3, bg: 'clay', fill: ['white'], sw: 1.6 },
        { type: 'hatch', w: 1.3, bg: 'clay', stroke: 'white', sw: 2 },
        { type: 'wave', shape: 'zigzag', w: 2.2, bg: 'clay', fill: ['white'], rows: 1, sw: 1.2 }
      ],
      corner: {
        bg: 'clay', stroke: 'white',
        rings: [
          { t: 'polar', r: 0.98, rho: 0.5, p: 2.1, fill: 'white' },
          { t: 'polar', r: 0.74, rho: 0.5, p: 2.1, fill: 'clay', rot: 0.5 },
          { t: 'star', r: 0.44, sharp: 0.85, fill: 'white' },
          { t: 'disc', r: 0.13, fill: 'clay' }
        ]
      }
    },

    gond: {
      label: 'Gond (Madhya Pradesh)',
      blurb: 'Dot-and-dash fills, paisley forms, bright hues on black.',
      palette: { paper: '#171412', ink: '#0d0b0a', yellow: '#f4c430', red: '#e2412c', cyan: '#2ec4b6', magenta: '#d6336c', white: '#fdf6e3' },
      ruleH: 3, ruleColor: 'yellow', primary: 'paisley', morphTo: 'bloom',
      defaults: { N: 12, m: 10, count: 5, period: 74, thickness: 190, variation: 12 },
      layers: [
        { type: 'motifs', motif: 'primary', mode: 'alt', w: 3.4, bg: 'red', fill: ['yellow', 'cyan'], inner: ['ink', 'magenta'], sw: 1.4 },
        { type: 'dots', w: 1.5, bg: 'ink', fill: ['yellow', 'white'], per: 3, r: 0.8, rows: 2 },
        { type: 'hatch', w: 1.4, bg: 'ink', stroke: 'white', sw: 1.8 },
        { type: 'wave', shape: 'scallop', w: 2.4, bg: 'cyan', fill: ['yellow', 'magenta', 'ink'], rows: 3, sw: 1.1 },
        { type: 'rosettes', w: 2.6, bg: 'ink', fill: ['magenta', 'yellow', 'white'], sw: 1.2 }
      ],
      corner: {
        bg: 'ink',
        rings: [
          { t: 'polar', r: 0.98, rho: 0.45, p: 2.1, fill: 'magenta' },
          { t: 'polar', r: 0.74, rho: 0.42, p: 2.1, fill: 'yellow', rot: 0.5 },
          { t: 'polar', r: 0.52, rho: 0.45, p: 2.1, fill: 'cyan' },
          { t: 'star', r: 0.34, sharp: 0.9, fill: 'red' },
          { t: 'disc', r: 0.1, fill: 'white' }
        ]
      }
    }
  };
})((globalThis.BG = globalThis.BG || {}));

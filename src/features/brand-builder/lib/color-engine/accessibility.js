/**
 * WCAG accessibility — contrast ratios, contrast matrix, auto-correction.
 */
import { contrastRatio, hexToOklch, oklchToHex } from './color-utils.js';

// ── Single pair check ────────────────────────────────────────────

export function checkContrastPair(fg, bg) {
  const ratio = contrastRatio(fg, bg);
  return {
    ratio: Math.round(ratio * 100) / 100,
    aa:      ratio >= 4.5,
    aaa:     ratio >= 7.0,
    aaLarge: ratio >= 3.0,
  };
}

// ── Contrast matrix ──────────────────────────────────────────────

/**
 * Build a contrast matrix for all named colors.
 * @param {Record<string, string>} namedColors  e.g. { primary: '#xxx', ... }
 * @returns {Record<string, Record<string, number>>}
 */
export function buildContrastMatrix(namedColors) {
  const names = Object.keys(namedColors);
  const matrix = {};
  for (const a of names) {
    matrix[a] = {};
    for (const b of names) {
      matrix[a][b] = Math.round(contrastRatio(namedColors[a], namedColors[b]) * 100) / 100;
    }
  }
  return matrix;
}

/**
 * Extract pairs that pass AA / AAA from a contrast matrix.
 */
export function getWcagPairs(matrix) {
  const aaPairs = [];
  const aaaPairs = [];
  const names = Object.keys(matrix);

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j];
      const ratio = matrix[a][b];
      if (ratio >= 4.5) aaPairs.push({ fg: a, bg: b, ratio });
      if (ratio >= 7.0) aaaPairs.push({ fg: a, bg: b, ratio });
    }
  }

  return { aaPairs, aaaPairs };
}

// ── Auto-correct for contrast ────────────────────────────────────

/**
 * Shift fg lightness until it achieves minRatio against bg.
 * Max 15% total shift. Returns corrected hex.
 */
export function autoCorrectForContrast(fg, bg, minRatio = 4.5) {
  if (contrastRatio(fg, bg) >= minRatio) return fg;

  const fgOklch = hexToOklch(fg);
  const bgOklch = hexToOklch(bg);

  // Determine direction: darken fg if bg is light, lighten if bg is dark
  const dir = bgOklch.l > 0.5 ? -1 : 1;
  const step = 0.02;
  let l = fgOklch.l;

  for (let i = 0; i < 15; i++) {
    l += dir * step;
    l = Math.max(0.05, Math.min(0.95, l));
    const candidate = oklchToHex(l, fgOklch.c, fgOklch.h);
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
  }

  // Last resort: return whatever we got
  return oklchToHex(l, fgOklch.c, fgOklch.h);
}

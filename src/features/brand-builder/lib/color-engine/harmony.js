/**
 * Color harmony rules — analogous, complementary, triadic, split-complementary.
 * All inputs/outputs are hue angles (0-360).
 */
import { clampHue } from './color-utils.js';

export function analogous(hue, offset = 30) {
  return [clampHue(hue - offset), clampHue(hue + offset)];
}

export function complementary(hue) {
  return clampHue(hue + 180);
}

export function triadic(hue) {
  return [clampHue(hue + 120), clampHue(hue + 240)];
}

export function splitComplementary(hue) {
  return [clampHue(hue + 150), clampHue(hue + 210)];
}

/**
 * Get secondary/accent hues from a harmony method string.
 * Returns [secondaryHue, accentHue].
 */
export function getHarmonyHues(primaryHue, method = 'analogous') {
  switch (method) {
    case 'complementary': {
      const comp = complementary(primaryHue);
      return [comp, clampHue(comp + 30)];
    }
    case 'triadic': {
      const [h1, h2] = triadic(primaryHue);
      return [h1, h2];
    }
    case 'split-complementary': {
      const [h1, h2] = splitComplementary(primaryHue);
      return [h1, h2];
    }
    case 'analogous':
    default: {
      const [h1, h2] = analogous(primaryHue);
      return [h1, h2];
    }
  }
}

/**
 * Generate color ramps (50-950) using oklch lightness interpolation.
 * Also generates neutral ramps derived from primary hue.
 */
import { hexToOklch, oklchToHex } from './color-utils.js';

// Lightness targets for each step (oklch L, 0-1 range)
const RAMP_LIGHTNESS = {
  50:  0.97,
  100: 0.93,
  200: 0.86,
  300: 0.76,
  400: 0.63,
  500: null, // base
  600: 0.43,
  700: 0.35,
  800: 0.27,
  900: 0.18,
  950: 0.10,
};

/**
 * Generate a 50-950 ramp from a single base hex color.
 * Preserves hue, adjusts lightness in oklch, reduces chroma at extremes.
 */
export function generateColorRamp(baseHex) {
  const base = hexToOklch(baseHex);
  const ramp = {};

  for (const [step, targetL] of Object.entries(RAMP_LIGHTNESS)) {
    const s = Number(step);
    if (targetL === null) {
      ramp[s] = baseHex;
      continue;
    }

    // Reduce chroma at extreme lightness to stay in gamut
    let chromaScale = 1;
    if (targetL > 0.9) chromaScale = 0.3;
    else if (targetL > 0.8) chromaScale = 0.5;
    else if (targetL < 0.15) chromaScale = 0.4;
    else if (targetL < 0.25) chromaScale = 0.6;

    ramp[s] = oklchToHex(
      targetL,
      base.c * chromaScale,
      base.h
    );
  }

  return ramp;
}

/**
 * Generate a neutral ramp tinted toward the primary hue.
 * Returns { white, light_gray, mid_gray, dark_gray, near_black, ramp }.
 */
export function generateNeutralRamp(primaryHex) {
  const base = hexToOklch(primaryHex);
  // Use very low chroma (subtle tint) with primary's hue
  const tintChroma = Math.min(base.c * 0.08, 0.012);

  const neutralRamp = {};
  for (const [step, targetL] of Object.entries(RAMP_LIGHTNESS)) {
    const s = Number(step);
    const l = targetL === null ? 0.55 : targetL;
    neutralRamp[s] = oklchToHex(l, tintChroma, base.h);
  }

  return {
    white:      oklchToHex(0.985, tintChroma * 0.3, base.h),
    light_gray: oklchToHex(0.92,  tintChroma, base.h),
    mid_gray:   oklchToHex(0.55,  tintChroma, base.h),
    dark_gray:  oklchToHex(0.30,  tintChroma, base.h),
    near_black: oklchToHex(0.12,  tintChroma, base.h),
    ramp: neutralRamp,
  };
}

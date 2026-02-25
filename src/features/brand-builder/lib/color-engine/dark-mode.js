/**
 * Generate dark mode palette from a light-mode palette.
 * Uses lighter ramp steps for primary/secondary on dark backgrounds.
 */
import { hexToOklch, oklchToHex } from './color-utils.js';

/**
 * Derive dark mode colors from a palette.
 * @param {{ primary, secondary, neutrals }} palette
 */
export function generateDarkMode(palette) {
  const pBase = hexToOklch(palette.primary.base);
  const sBase = hexToOklch(palette.secondary.base);

  return {
    background:     oklchToHex(0.09, pBase.c * 0.04, pBase.h), // L ~8-10%
    surface:        oklchToHex(0.16, pBase.c * 0.05, pBase.h), // L ~14-18%
    primary:        palette.primary.ramp?.[300]  || palette.primary.light  || palette.primary.base,
    secondary:      palette.secondary.ramp?.[300] || palette.secondary.light || palette.secondary.base,
    text_primary:   oklchToHex(0.95, 0.003, pBase.h), // near-white
    text_secondary: oklchToHex(0.65, 0.008, pBase.h), // mid-gray
  };
}

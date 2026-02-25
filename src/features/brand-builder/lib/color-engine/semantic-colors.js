/**
 * Generate semantic colors (success, warning, error, info)
 * harmonized with the brand's saturation level.
 */
import { hexToHsl, hslToHex, contrastRatio } from './color-utils.js';

/**
 * Auto-adjust lightness so the color passes AA (4.5:1) on white.
 */
function ensureAAonWhite(h, s, l) {
  let hex = hslToHex(h, s, l);
  let attempts = 0;
  while (contrastRatio(hex, '#FFFFFF') < 4.5 && attempts < 20) {
    l = Math.max(l - 3, 15);
    hex = hslToHex(h, s, l);
    attempts++;
  }
  return hex;
}

/**
 * Generate semantic colors derived from primary brand color.
 * Matches saturation level to keep them feeling "on-brand".
 */
export function generateSemanticColors(primaryHex) {
  const primary = hexToHsl(primaryHex);
  // Match brand saturation (clamped for readability)
  const brandSat = Math.min(Math.max(primary.s, 50), 85);

  return {
    success: ensureAAonWhite(140, brandSat, 38),
    warning: ensureAAonWhite(40, brandSat, 42),
    error:   ensureAAonWhite(0, brandSat, 42),
    info:    primaryHex, // brand color itself
  };
}

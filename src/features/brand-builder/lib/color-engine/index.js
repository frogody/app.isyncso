/**
 * Color Engine — barrel export.
 */
export { generatePaletteVariants, buildFullPalette, buildColorSystem } from './palette-generator.js';
export { personalityToBaseHSL, getMoodDescriptor, getTemperature, getSaturationLevel, getIndustrySafeHue, getDensityHarmony } from './personality-mapping.js';
export { generateColorRamp, generateNeutralRamp } from './color-scales.js';
export { generateSemanticColors } from './semantic-colors.js';
export { generateDarkMode } from './dark-mode.js';
export { checkContrastPair, buildContrastMatrix, getWcagPairs, autoCorrectForContrast } from './accessibility.js';
export { simulateCVD, checkCVDSafety } from './color-blindness.js';
export { checkCompetitorDiff } from './competitor-check.js';
export { getHarmonyHues, analogous, complementary, triadic, splitComplementary } from './harmony.js';
export {
  hexToRgb, rgbToHsl, hslToHex, hexToOklch, oklchToHex, hexToHsl,
  relativeLuminance, contrastRatio, rgbToCmyk, hexToCmyk,
  lerp, clampHue, buildColorSpec, hexToRgbString,
} from './color-utils.js';

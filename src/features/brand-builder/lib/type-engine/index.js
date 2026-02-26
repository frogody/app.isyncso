/**
 * Type engine — barrel export.
 */
export { FONT_CATALOG, getFontByFamily, getSerifs, getSansSerifs, getMonospaces, getDisplayFonts, getFontsBySubclass } from './font-catalog.js';
export { loadGoogleFont, loadGoogleFonts, isFontLoaded } from './google-fonts-loader.js';
export { scoreFontPersonality, rankFontsForRole, getDirectionCardFonts } from './font-scoring.js';
export { scorePairing, filterByChoices, generateFilteredPairings, getAlternativeFonts } from './font-pairing.js';
export { getScaleRatio, generateTypeScale, generateResponsiveSizes } from './type-scale.js';
export { buildTypographySystem, buildFontSpec, generateUsageRules, generateCSS, generateTailwindConfig, generatePairingRationale } from './typography-builder.js';

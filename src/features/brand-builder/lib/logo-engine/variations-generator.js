/**
 * Logo variations generator.
 * Takes a refined concept and generates 6 variations × 7 color modes = 42 SVG strings.
 */
import {
  buildFontImport,
  buildWordmarkText,
  buildLettermarkText,
  buildIconElement,
  composeHorizontalLogo,
  composeStackedLogo,
  composeWordmarkOnly,
  composeIconOnly,
  composeLettermark,
  composeFavicon,
  composeSocialAvatar,
  applyColorMode,
  estimateTextWidth,
} from './svg-builder.js';

const COLOR_MODES = [
  'full_color_light',
  'full_color_dark',
  'full_color_on_brand',
  'reversed',
  'mono_black',
  'mono_white',
  'grayscale',
];

/**
 * Generate all 6 logo variations with 7 color modes each.
 * @param {object} refinedConcept - The refined concept from sub-step 3 (with _params)
 * @param {object} project - Full project object
 * @returns {object} LogoVariations schema-compliant object
 */
export function generateLogoVariations(refinedConcept, project) {
  const params = refinedConcept._params || {};
  const { brand_dna, color_system, typography_system } = project;
  const palette = color_system?.palette;
  const primaryFont = typography_system?.primary_font;
  const companyName = params.companyName || brand_dna?.company_name || 'Brand';
  const fontFamily = params.fontFamily || primaryFont?.family || 'Inter';
  const googleFontsUrl = primaryFont?.google_fonts_url || '';
  const fontImport = buildFontImport(fontFamily, googleFontsUrl);
  const fill = params.fill || palette?.primary?.base || '#000000';
  const fontWeight = params.fontWeight || 700;
  const letterSpacing = params.letterSpacing || '0em';
  const textTransform = params.textTransform || 'uppercase';
  const fontSize = params.fontSize || 42;
  const icon = params.icon;

  // Build base elements
  const wordmarkOpts = { fontSize, fontWeight, letterSpacing, textTransform, fill };
  const wordmark = buildWordmarkText(companyName, fontFamily, wordmarkOpts);
  const iconEl = icon ? buildIconElement(icon, { fill }) : null;
  const letterEl = buildLettermarkText(companyName, fontFamily, { fontSize: 60, fontWeight, fill });

  const displayText = textTransform === 'uppercase' ? companyName.toUpperCase()
    : textTransform === 'lowercase' ? companyName.toLowerCase()
    : companyName;
  const textWidth = estimateTextWidth(displayText, fontSize, parseFloat(letterSpacing) || 0);

  // Generate each variation type
  const primary = buildVariationWithModes(
    () => icon
      ? composeHorizontalLogo(wordmark, iconEl, fontImport, { iconSize: 50, spacing: 16, textWidth, height: 70 })
      : composeWordmarkOnly(wordmark, fontImport, { textWidth, height: 70 }),
    palette,
  );

  const secondary = buildVariationWithModes(
    () => icon
      ? composeStackedLogo(wordmark, iconEl, fontImport, { iconSize: 60, spacing: 12, textWidth, fontSize })
      : composeWordmarkOnly(wordmark, fontImport, { textWidth, height: 70 }),
    palette,
  );

  const submark = buildVariationWithModes(
    () => icon
      ? composeIconOnly(iconEl, { size: 100 })
      : composeLettermark(letterEl, fontImport, { size: 100 }),
    palette,
  );

  const wordmarkVar = buildVariationWithModes(
    () => composeWordmarkOnly(wordmark, fontImport, { textWidth, height: 70 }),
    palette,
  );

  const favicon = buildVariationWithModes(
    () => composeFavicon(iconEl, letterEl, fontImport, { useLetter: !icon }),
    palette,
  );

  const social_avatar = buildVariationWithModes(
    () => {
      const el = icon ? iconEl : letterEl;
      return icon
        ? composeSocialAvatar(iconEl, { size: 200, bgColor: palette?.neutrals?.white || '#FFFFFF' })
        : composeSocialAvatar(null, { size: 200, bgColor: fill });
    },
    palette,
  );

  return { primary, secondary, submark, wordmark: wordmarkVar, favicon, social_avatar };
}

/**
 * Build a single LogoVariation with all 7 color modes.
 */
function buildVariationWithModes(buildBaseSvg, palette) {
  const baseSvg = buildBaseSvg();
  const color_modes = {};

  for (const mode of COLOR_MODES) {
    color_modes[mode] = applyColorMode(baseSvg, mode, palette);
  }

  return { color_modes };
}

/**
 * Logo engine barrel export.
 */
export {
  ICON_LIBRARY,
  ICON_CATEGORIES,
  KEYWORD_POOL,
  scoreIconForBrief,
  filterIconsByStyle,
  getIconsByCategory,
  getIconById,
  getRelevantKeywords,
} from './icon-library.js';

export {
  buildFontImport,
  estimateTextWidth,
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
} from './svg-builder.js';

export {
  generateLogoConcepts,
  generateConceptVariations,
} from './concept-generator.js';

export {
  generateLogoVariations,
} from './variations-generator.js';

export {
  generateLogoRules,
  generateConstructionGrid,
} from './rules-generator.js';

/**
 * Generates an iconography system from the existing icon library.
 * Selects top-scoring icons, renders them in chosen style + brand colors.
 */
import {
  ICON_LIBRARY,
  scoreIconForBrief,
  filterIconsByStyle,
  getRelevantKeywords,
} from '../logo-engine/icon-library.js';

/**
 * Build an SVG string for a single icon in the specified style.
 */
function renderIconSvg(icon, style, primaryColor, secondaryColor, strokeWeight) {
  const vb = icon.viewBox || '0 0 100 100';

  if (style === 'outlined') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100" height="100"><path d="${icon.svgPath}" fill="none" stroke="${primaryColor}" stroke-width="${strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  if (style === 'duotone') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100" height="100"><path d="${icon.svgPath}" fill="${secondaryColor}" fill-opacity="0.3" fill-rule="evenodd"/><path d="${icon.svgPath}" fill="none" stroke="${primaryColor}" stroke-width="${strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  // filled (default)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100" height="100"><path d="${icon.svgPath}" fill="${primaryColor}" fill-rule="evenodd"/></svg>`;
}

/**
 * Generate a complete IconographySystem from project data.
 */
export function generateIconSet(project) {
  const dna = project?.brand_dna || {};
  const palette = project?.color_system?.palette;
  const typography = project?.typography_system;

  const style = dna._iconStylePref || 'outlined';
  const industry = dna.industry?.primary || '';
  const personalityVector = dna.personality_vector || [50, 50, 50, 50, 50];

  const primaryColor = palette?.primary?.base || '#000000';
  const secondaryColor = palette?.secondary?.base || '#666666';

  // Get relevant keywords for scoring
  const keywords = getRelevantKeywords(industry, personalityVector);

  // Score and sort all icons
  const scored = ICON_LIBRARY
    .map(icon => ({ icon, score: scoreIconForBrief(icon, keywords, industry) }))
    .sort((a, b) => b.score - a.score);

  // Take top 10
  const topIcons = scored.slice(0, 10);

  // Determine properties from personality
  const minimalRich = personalityVector[4] ?? 50;
  const strokeWeight = minimalRich < 35 ? 1.5 : minimalRich > 65 ? 3 : 2;
  const gridSize = minimalRich > 60 ? 32 : 24;

  // Corner radius from font category
  const fontCategory = typography?.primary_font?.category || 'sans-serif';
  const cornerRadius = fontCategory === 'serif' ? 0
    : fontCategory === 'display' ? 2
    : fontCategory === 'monospace' ? 0
    : 4;

  // Build base_set
  const baseSet = topIcons.map(({ icon }) => ({
    name: icon.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    svg: renderIconSvg(icon, style, primaryColor, secondaryColor, strokeWeight),
    keywords: icon.keywords,
    _iconId: icon.id, // internal reference for re-rendering
  }));

  // Color rules
  const colorRules = `Use ${primaryColor} (primary) for active/default icons. Use secondary or zinc-400 for inactive/disabled states. On dark backgrounds, use white (#FFFFFF) or light tints.`;

  return {
    style,
    stroke_weight: strokeWeight,
    grid_size: gridSize,
    corner_radius: cornerRadius,
    color_rules: colorRules,
    base_set: baseSet,
  };
}

/**
 * Re-render icons in a different style (for live toggling).
 */
export function rerenderIconSet(baseSet, newStyle, primaryColor, secondaryColor, strokeWeight) {
  return baseSet.map(item => {
    const icon = ICON_LIBRARY.find(i => i.id === item._iconId);
    if (!icon) return item;
    return {
      ...item,
      svg: renderIconSvg(icon, newStyle, primaryColor, secondaryColor, strokeWeight),
    };
  });
}

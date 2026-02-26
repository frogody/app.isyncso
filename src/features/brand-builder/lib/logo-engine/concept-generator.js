/**
 * Logo concept generator.
 * Generates 8-12 concepts by combining icons + typography + colors.
 * Each concept is a LogoConcept: { svg_source, design_rationale, icon_keywords, style }.
 */
import { ICON_LIBRARY, scoreIconForBrief, filterIconsByStyle } from './icon-library.js';
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
  estimateTextWidth,
} from './svg-builder.js';

// ── Concept Generation ────────────────────────────────────────────────────────

/**
 * Generate 8-12 logo concepts based on project data.
 * @param {object} project - Full project object with brand_dna, color_system, typography_system
 * @returns {Array<{svg_source: string, design_rationale: string, icon_keywords: string[], style: string}>}
 */
export function generateLogoConcepts(project) {
  const { brand_dna, color_system, typography_system } = project;
  const companyName = brand_dna?.company_name || 'Brand';
  const logoType = brand_dna?._logoType || 'icon_wordmark';
  const iconKeywords = brand_dna?._iconKeywords || [];
  const iconStyle = brand_dna?._iconStyle || 'geometric';
  const industry = brand_dna?.industry?.primary || '';
  const palette = color_system?.palette;
  const primaryFont = typography_system?.primary_font;

  const fontFamily = primaryFont?.family || 'Inter';
  const googleFontsUrl = primaryFont?.google_fonts_url || '';
  const availableWeights = primaryFont?.weights_available || [400, 500, 600, 700, 800];
  const primaryColor = palette?.primary?.base || '#000000';
  const secondaryColor = palette?.secondary?.base || '#333333';
  const fontImport = buildFontImport(fontFamily, googleFontsUrl);

  const concepts = [];

  if (logoType === 'wordmark_only') {
    return generateWordmarkConcepts(companyName, fontFamily, fontImport, availableWeights, primaryColor, secondaryColor, iconKeywords);
  }

  if (logoType === 'lettermark') {
    return generateLettermarkConcepts(companyName, fontFamily, fontImport, availableWeights, primaryColor, secondaryColor, iconKeywords);
  }

  // icon_wordmark or abstract — needs icons
  const filtered = filterIconsByStyle(ICON_LIBRARY, iconStyle);
  const scored = filtered
    .map(icon => ({ icon, score: scoreIconForBrief(icon, iconKeywords, industry) }))
    .sort((a, b) => b.score - a.score);

  const topIcons = scored.slice(0, 6).map(s => s.icon);

  // Pick 2 weights from available
  const weights = pickWeights(availableWeights);
  // Variation combos
  const spacings = ['-0.02em', '0em', '0.05em'];
  const cases = ['uppercase', 'lowercase', 'capitalize'];
  const layouts = ['horizontal', 'stacked'];
  const colors = [primaryColor, secondaryColor];

  for (let i = 0; i < topIcons.length && concepts.length < 12; i++) {
    const icon = topIcons[i];

    // Concept A: bold uppercase horizontal
    const weightA = weights[1] || 700;
    concepts.push(buildIconWordmarkConcept({
      companyName, fontFamily, fontImport, icon,
      fontWeight: weightA,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      layout: 'horizontal',
      fill: colors[0],
      iconKeywords,
    }));

    if (concepts.length >= 12) break;

    // Concept B: medium weight lowercase stacked
    const weightB = weights[0] || 500;
    concepts.push(buildIconWordmarkConcept({
      companyName, fontFamily, fontImport, icon,
      fontWeight: weightB,
      letterSpacing: '0em',
      textTransform: 'lowercase',
      layout: 'stacked',
      fill: colors[i % 2 === 0 ? 0 : 1],
      iconKeywords,
    }));

    if (concepts.length >= 12) break;

    // Concept C: alternate combo if room
    if (i < 3) {
      concepts.push(buildIconWordmarkConcept({
        companyName, fontFamily, fontImport, icon,
        fontWeight: weightA,
        letterSpacing: spacings[i % 3],
        textTransform: cases[i % 3],
        layout: layouts[(i + 1) % 2],
        fill: colors[1],
        iconKeywords,
      }));
    }
  }

  return concepts.slice(0, 12);
}

/**
 * Generate variations of a selected concept ("More like this").
 * Same icon, tweaked typography params.
 */
export function generateConceptVariations(baseConcept, project, count = 6) {
  const { brand_dna, color_system, typography_system } = project;
  const companyName = brand_dna?.company_name || 'Brand';
  const palette = color_system?.palette;
  const primaryFont = typography_system?.primary_font;
  const fontFamily = primaryFont?.family || 'Inter';
  const googleFontsUrl = primaryFont?.google_fonts_url || '';
  const availableWeights = primaryFont?.weights_available || [400, 500, 600, 700, 800];
  const fontImport = buildFontImport(fontFamily, googleFontsUrl);
  const primaryColor = palette?.primary?.base || '#000000';
  const secondaryColor = palette?.secondary?.base || '#333333';
  const accentColor = palette?.accent?.base || primaryColor;

  // Extract params from base concept
  const base = baseConcept._params || {};
  const variations = [];

  const weightVars = availableWeights.filter(w => w !== base.fontWeight).slice(0, 3);
  const spacingVars = ['-0.02em', '0em', '0.03em', '0.08em'].filter(s => s !== base.letterSpacing);
  const caseVars = ['uppercase', 'lowercase', 'capitalize'].filter(c => c !== base.textTransform);
  const layoutVars = ['horizontal', 'stacked'];
  const colorVars = [primaryColor, secondaryColor, accentColor];

  for (let i = 0; i < count && variations.length < count; i++) {
    const params = {
      companyName,
      fontFamily,
      fontImport,
      icon: base.icon,
      fontWeight: weightVars[i % weightVars.length] || base.fontWeight || 700,
      letterSpacing: spacingVars[i % spacingVars.length] || base.letterSpacing || '0em',
      textTransform: caseVars[i % caseVars.length] || base.textTransform || 'uppercase',
      layout: layoutVars[i % layoutVars.length],
      fill: colorVars[i % colorVars.length],
      iconKeywords: baseConcept.icon_keywords,
    };

    if (baseConcept.style === 'icon_wordmark' || baseConcept.style === 'abstract') {
      if (params.icon) {
        variations.push(buildIconWordmarkConcept(params));
      }
    } else if (baseConcept.style === 'wordmark_only') {
      variations.push(buildWordmarkOnlyConcept(params));
    } else if (baseConcept.style === 'lettermark') {
      variations.push(buildLettermarkOnlyConcept(params));
    }
  }

  return variations;
}

// ── Internal Builders ─────────────────────────────────────────────────────────

function buildIconWordmarkConcept({ companyName, fontFamily, fontImport, icon, fontWeight, letterSpacing, textTransform, layout, fill, iconKeywords }) {
  const fontSize = layout === 'stacked' ? 36 : 42;
  const wordmark = buildWordmarkText(companyName, fontFamily, {
    fontSize, fontWeight, letterSpacing, textTransform, fill,
  });
  const iconEl = buildIconElement(icon, { fill });
  const textWidth = estimateTextWidth(
    textTransform === 'uppercase' ? companyName.toUpperCase() : companyName,
    fontSize,
    parseFloat(letterSpacing) || 0,
  );

  const svg = layout === 'stacked'
    ? composeStackedLogo(wordmark, iconEl, fontImport, { iconSize: 60, spacing: 12, textWidth, fontSize })
    : composeHorizontalLogo(wordmark, iconEl, fontImport, { iconSize: 50, spacing: 16, textWidth, height: 70 });

  const caseLabel = textTransform === 'uppercase' ? 'uppercase' : textTransform === 'lowercase' ? 'lowercase' : 'title case';
  const layoutLabel = layout === 'stacked' ? 'stacked' : 'horizontal';

  return {
    svg_source: svg,
    design_rationale: `${layoutLabel.charAt(0).toUpperCase() + layoutLabel.slice(1)} ${caseLabel} wordmark with ${icon.id} icon. Weight ${fontWeight}, spacing ${letterSpacing}.`,
    icon_keywords: iconKeywords || icon.keywords,
    style: 'icon_wordmark',
    _params: { companyName, fontFamily, fontImport, icon, fontWeight, letterSpacing, textTransform, layout, fill, fontSize },
  };
}

function generateWordmarkConcepts(companyName, fontFamily, fontImport, availableWeights, primaryColor, secondaryColor, iconKeywords) {
  const concepts = [];
  const weights = pickWeights(availableWeights);
  const combos = [
    { weight: weights[1] || 700, spacing: '0.08em', transform: 'uppercase', color: primaryColor },
    { weight: weights[0] || 500, spacing: '0em', transform: 'lowercase', color: primaryColor },
    { weight: weights[1] || 700, spacing: '-0.02em', transform: 'capitalize', color: primaryColor },
    { weight: weights[0] || 500, spacing: '0.05em', transform: 'uppercase', color: secondaryColor },
    { weight: weights[1] || 700, spacing: '0em', transform: 'capitalize', color: secondaryColor },
    { weight: weights[0] || 400, spacing: '0.03em', transform: 'lowercase', color: primaryColor },
    { weight: weights[1] || 800, spacing: '0.10em', transform: 'uppercase', color: primaryColor },
    { weight: weights[0] || 500, spacing: '-0.01em', transform: 'capitalize', color: secondaryColor },
  ];

  for (const combo of combos) {
    concepts.push(buildWordmarkOnlyConcept({
      companyName, fontFamily, fontImport,
      fontWeight: combo.weight,
      letterSpacing: combo.spacing,
      textTransform: combo.transform,
      fill: combo.color,
      iconKeywords,
    }));
  }

  return concepts;
}

function buildWordmarkOnlyConcept({ companyName, fontFamily, fontImport, fontWeight, letterSpacing, textTransform, fill, iconKeywords }) {
  const fontSize = 48;
  const wordmark = buildWordmarkText(companyName, fontFamily, {
    fontSize, fontWeight, letterSpacing, textTransform, fill,
  });
  const textWidth = estimateTextWidth(
    textTransform === 'uppercase' ? companyName.toUpperCase() : companyName,
    fontSize,
    parseFloat(letterSpacing) || 0,
  );

  const svg = composeWordmarkOnly(wordmark, fontImport, { textWidth, height: 70 });

  const caseLabel = textTransform === 'uppercase' ? 'uppercase' : textTransform === 'lowercase' ? 'lowercase' : 'title case';

  return {
    svg_source: svg,
    design_rationale: `Wordmark-only in ${caseLabel}. Weight ${fontWeight}, spacing ${letterSpacing}.`,
    icon_keywords: iconKeywords || [],
    style: 'wordmark_only',
    _params: { companyName, fontFamily, fontImport, fontWeight, letterSpacing, textTransform, fill, fontSize, layout: 'wordmark', icon: null },
  };
}

function generateLettermarkConcepts(companyName, fontFamily, fontImport, availableWeights, primaryColor, secondaryColor, iconKeywords) {
  const concepts = [];
  const weights = pickWeights(availableWeights);

  const combos = [
    { weight: weights[1] || 700, size: 60, color: primaryColor },
    { weight: weights[0] || 500, size: 50, color: primaryColor },
    { weight: weights[1] || 800, size: 55, color: secondaryColor },
    { weight: weights[0] || 400, size: 65, color: primaryColor },
    { weight: weights[1] || 700, size: 50, color: secondaryColor },
    { weight: weights[0] || 600, size: 60, color: primaryColor },
  ];

  for (const combo of combos) {
    concepts.push(buildLettermarkOnlyConcept({
      companyName, fontFamily, fontImport,
      fontWeight: combo.weight,
      fontSize: combo.size,
      fill: combo.color,
      iconKeywords,
    }));
  }

  return concepts;
}

function buildLettermarkOnlyConcept({ companyName, fontFamily, fontImport, fontWeight, fontSize = 60, fill, iconKeywords }) {
  const letterEl = buildLettermarkText(companyName, fontFamily, { fontSize, fontWeight, fill });
  const svg = composeLettermark(letterEl, fontImport, { size: 100 });

  const words = companyName.trim().split(/\s+/);
  const initials = words.length > 1
    ? words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
    : companyName[0].toUpperCase();

  return {
    svg_source: svg,
    design_rationale: `Lettermark "${initials}" in weight ${fontWeight}, size ${fontSize}px.`,
    icon_keywords: iconKeywords || [],
    style: 'lettermark',
    _params: { companyName, fontFamily, fontImport, fontWeight, fontSize, fill, layout: 'lettermark', icon: null, letterSpacing: '0em', textTransform: 'uppercase' },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickWeights(available) {
  // Pick a lighter and a bolder weight
  const sorted = [...available].sort((a, b) => a - b);
  const light = sorted.find(w => w >= 400 && w <= 500) || sorted[0];
  const bold = sorted.find(w => w >= 700) || sorted[sorted.length - 1];
  return [light, bold];
}

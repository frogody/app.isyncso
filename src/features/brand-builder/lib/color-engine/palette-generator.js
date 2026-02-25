/**
 * Orchestrator: generates 6 palette variants from brand DNA,
 * builds full ColorSystem objects, ranks by quality.
 */
import { DIRECTION_CARDS } from '../../components/stages/brand-dna/DirectionCardsData.js';
import { hslToHex, hexToHsl, contrastRatio, buildColorSpec, clampHue } from './color-utils.js';
import { getHarmonyHues } from './harmony.js';
import {
  personalityToBaseHSL,
  getDensityHarmony,
  getMoodDescriptor,
  getTemperature,
  getSaturationLevel,
  getIndustrySafeHue,
} from './personality-mapping.js';
import { generateColorRamp, generateNeutralRamp } from './color-scales.js';
import { generateSemanticColors } from './semantic-colors.js';
import { generateDarkMode } from './dark-mode.js';
import { autoCorrectForContrast, buildContrastMatrix, getWcagPairs, checkContrastPair } from './accessibility.js';
import { checkCVDSafety } from './color-blindness.js';

// ── Build a single full palette from HSL inputs ──────────────────

function buildColorScale(hex) {
  const ramp = generateColorRamp(hex);
  return {
    base: hex,
    light: ramp[200] || hex,
    dark: ramp[800] || hex,
    ramp,
  };
}

export function buildFullPalette(primaryHSL, harmonyMethod, brandDna = {}) {
  const primaryHex = hslToHex(primaryHSL.h, primaryHSL.s, primaryHSL.l);
  const [secHue, accHue] = getHarmonyHues(primaryHSL.h, harmonyMethod);

  // Secondary: same-ish saturation, slightly lighter
  const secSat = Math.max(primaryHSL.s - 15, 15);
  const secondaryHex = hslToHex(secHue, secSat, Math.min(primaryHSL.l + 10, 65));

  // Accent: high saturation, ensure AA on white
  const rawAccent = hslToHex(accHue, Math.min(primaryHSL.s + 15, 90), 45);
  const accentHex = autoCorrectForContrast(rawAccent, '#FFFFFF', 4.5);

  const primary = buildColorScale(primaryHex);
  const secondary = buildColorScale(secondaryHex);
  const accent = buildColorScale(accentHex);
  const neutrals = generateNeutralRamp(primaryHex);
  const semantic = generateSemanticColors(primaryHex);

  // Gradients
  const gradients = [
    {
      name: 'Primary to Secondary',
      from: primaryHex,
      to: secondaryHex,
      angle: 135,
      css: `linear-gradient(135deg, ${primaryHex}, ${secondaryHex})`,
    },
    {
      name: 'Primary to Accent',
      from: primaryHex,
      to: accentHex,
      angle: 135,
      css: `linear-gradient(135deg, ${primaryHex}, ${accentHex})`,
    },
  ];

  const partialPalette = { primary, secondary, accent, neutrals, semantic, extended: { gradients } };
  const dark_mode = generateDarkMode(partialPalette);

  return { ...partialPalette, dark_mode };
}

// ── Score a palette for quality ──────────────────────────────────

function scorePalette(palette) {
  let score = 50; // baseline

  // Primary on white contrast
  const pOnW = contrastRatio(palette.primary.base, '#FFFFFF');
  if (pOnW >= 4.5) score += 15;
  else if (pOnW >= 3.0) score += 8;

  // Accent on white contrast
  const aOnW = contrastRatio(palette.accent.base, '#FFFFFF');
  if (aOnW >= 4.5) score += 10;
  else if (aOnW >= 3.0) score += 5;

  // Text on near_black (dark mode readability)
  const dmText = contrastRatio(palette.dark_mode.text_primary, palette.dark_mode.background);
  if (dmText >= 7) score += 10;
  else if (dmText >= 4.5) score += 5;

  // CVD safety bonus
  const cvd = checkCVDSafety({
    primary: palette.primary.base,
    secondary: palette.secondary.base,
    accent: palette.accent.base,
  });
  if (cvd.safe) score += 15;

  return Math.min(100, score);
}

// ── Generate 6 palette variants ──────────────────────────────────

export function generatePaletteVariants(brandDna) {
  const vector = brandDna.personality_vector || [50, 50, 50, 50, 50];
  const density = vector[4] || 50;
  const baseHSL = personalityToBaseHSL(vector);
  const defaultHarmony = getDensityHarmony(density);

  // Look up direction card colors
  const dirCards = (brandDna.selected_direction_ids || [])
    .map(id => DIRECTION_CARDS.find(c => c.id === id))
    .filter(Boolean);

  const variants = [];

  // Variant 1: Direct personality mapping
  variants.push({
    label: 'Personality Core',
    description: `${getMoodDescriptor(vector)} — direct from your brand personality`,
    palette: buildFullPalette(baseHSL, defaultHarmony, brandDna),
  });

  // Variant 2: Direction card 1 seed
  if (dirCards[0]) {
    const seedHex = dirCards[0].colors[0]; // first prominent color
    const seedHSL = hexToHsl(seedHex);
    // Blend seed with personality saturation/lightness
    const blended = {
      h: seedHSL.h,
      s: Math.round((seedHSL.s + baseHSL.s) / 2),
      l: Math.round((seedHSL.l + baseHSL.l) / 2),
    };
    variants.push({
      label: `${dirCards[0].name} Inspired`,
      description: `Seeded from the ${dirCards[0].name} direction`,
      palette: buildFullPalette(blended, defaultHarmony, brandDna),
    });
  }

  // Variant 3: Direction card 2 seed
  if (dirCards[1]) {
    const seedHex = dirCards[1].colors[1] || dirCards[1].colors[0];
    const seedHSL = hexToHsl(seedHex);
    const blended = {
      h: seedHSL.h,
      s: Math.round((seedHSL.s + baseHSL.s) / 2),
      l: Math.round((seedHSL.l + baseHSL.l) / 2),
    };
    variants.push({
      label: `${dirCards[1].name} Inspired`,
      description: `Seeded from the ${dirCards[1].name} direction`,
      palette: buildFullPalette(blended, defaultHarmony, brandDna),
    });
  }

  // Fill remaining slots up to 6
  // Variant 4: Complementary harmony
  variants.push({
    label: 'Complementary',
    description: 'High-contrast complementary color scheme',
    palette: buildFullPalette(baseHSL, 'complementary', brandDna),
  });

  // Variant 5: Triadic bold
  const boldHSL = { ...baseHSL, s: Math.min(baseHSL.s + 10, 90) };
  variants.push({
    label: 'Triadic Bold',
    description: 'Wide color spread, +10% saturation for vibrancy',
    palette: buildFullPalette(boldHSL, 'triadic', brandDna),
  });

  // Variant 6: Industry-safe
  const safeHue = getIndustrySafeHue(brandDna.industry?.primary);
  const safeHSL = { h: safeHue, s: Math.min(baseHSL.s, 60), l: Math.min(baseHSL.l + 5, 55) };
  variants.push({
    label: 'Industry Standard',
    description: `Conventional color for ${brandDna.industry?.primary || 'your industry'}`,
    palette: buildFullPalette(safeHSL, 'analogous', brandDna),
  });

  // Score and sort
  const scored = variants.map((v, i) => ({
    ...v,
    index: i,
    score: scorePalette(v.palette),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Return top 6
  return scored.slice(0, 6);
}

// ── Build full ColorSystem from a palette ────────────────────────

export function buildColorSystem(palette, brandDna = {}) {
  const vector = brandDna.personality_vector || [50, 50, 50, 50, 50];
  const baseHSL = personalityToBaseHSL(vector);

  // Named colors for contrast matrix
  const namedColors = {
    primary:    palette.primary.base,
    secondary:  palette.secondary.base,
    accent:     palette.accent.base,
    near_black: palette.neutrals.near_black,
    dark_gray:  palette.neutrals.dark_gray,
    mid_gray:   palette.neutrals.mid_gray,
    light_gray: palette.neutrals.light_gray,
    white:      palette.neutrals.white,
  };

  // Accessibility
  const contMatrix = buildContrastMatrix(namedColors);
  const { aaPairs, aaaPairs } = getWcagPairs(contMatrix);
  const cvd = checkCVDSafety({
    primary: palette.primary.base,
    secondary: palette.secondary.base,
    accent: palette.accent.base,
  });

  // Usage rules
  const usage_rules = {
    primary_ratio: 0.60,
    secondary_ratio: 0.30,
    accent_ratio: 0.10,
    background_default: 'white',
    text_on_light: palette.neutrals.near_black,
    text_on_dark: palette.neutrals.white,
    link_color: palette.primary.base,
    link_hover: palette.primary.ramp?.[600] || palette.primary.dark,
  };

  // Specifications
  const specifications = {};
  for (const [name, hex] of Object.entries(namedColors)) {
    specifications[name] = buildColorSpec(name, hex);
  }
  // Add semantic
  for (const [name, hex] of Object.entries(palette.semantic)) {
    specifications[`semantic_${name}`] = buildColorSpec(`semantic-${name}`, hex);
  }

  return {
    palette,
    usage_rules,
    specifications,
    accessibility: {
      contrast_matrix: contMatrix,
      wcag_aa_pairs: aaPairs.map(p => [p.fg, p.bg]),
      wcag_aaa_pairs: aaaPairs.map(p => [p.fg, p.bg]),
      colorblind_safe: cvd.safe,
    },
    mood: getMoodDescriptor(vector),
    temperature: getTemperature(baseHSL.h),
    saturation_level: getSaturationLevel(baseHSL.s),
  };
}

/**
 * Typography system builder — orchestrates font spec, type scale, usage rules,
 * CSS declarations, and Tailwind config into a schema-compliant TypographySystem.
 */
import { getScaleRatio, generateTypeScale } from './type-scale.js';

/**
 * Build a FontSpec object from a font catalog entry (schema-compliant).
 */
export function buildFontSpec(fontEntry) {
  return {
    family: fontEntry.family,
    classification: fontEntry.classification,
    weights_available: fontEntry.weights_available,
    source: fontEntry.source || 'google_fonts',
    license: fontEntry.license || 'OFL',
    google_fonts_url: fontEntry.google_fonts_url || null,
    files: {
      woff2: {},
      woff: {},
      otf: {},
      ttf: {},
    },
  };
}

/**
 * Generate usage rules for the typography system.
 */
export function generateUsageRules(primaryFont, secondaryFont) {
  return {
    heading_font_usage: `Use ${primaryFont.family} for all headings (display, h1–h6) and overline labels. Set weight to 600–700 for emphasis.`,
    body_font_usage: `Use ${secondaryFont.family} for body text, captions, and UI elements. Keep weight at 400 for readability; 500 for buttons and emphasis.`,
    never_combine: [
      `${primaryFont.family} for long body text (>3 lines)`,
      `${secondaryFont.family} for display-size headings (>36px)`,
      'More than 3 font families on a single page',
    ],
    minimum_body_size: 14,
    maximum_line_length: '65–75 characters (ch)',
    paragraph_spacing: '1.5× body line-height',
  };
}

/**
 * Generate CSS custom property declarations + @import.
 */
export function generateCSS(system) {
  const imports = [];
  if (system.primary_font.google_fonts_url) {
    imports.push(`@import url('${system.primary_font.google_fonts_url}');`);
  }
  if (system.secondary_font.google_fonts_url && system.secondary_font.family !== system.primary_font.family) {
    imports.push(`@import url('${system.secondary_font.google_fonts_url}');`);
  }
  if (system.accent_font?.google_fonts_url) {
    imports.push(`@import url('${system.accent_font.google_fonts_url}');`);
  }

  const vars = [
    `  --font-heading: '${system.primary_font.family}', ${system.primary_font.classification === 'serif' ? 'serif' : 'sans-serif'};`,
    `  --font-body: '${system.secondary_font.family}', ${system.secondary_font.classification === 'serif' ? 'serif' : 'sans-serif'};`,
    system.accent_font ? `  --font-code: '${system.accent_font.family}', monospace;` : '  --font-code: monospace;',
    `  --font-size-base: ${system.base_size}px;`,
    `  --scale-ratio: ${system.scale_ratio};`,
  ];

  // Add size variables for each level
  const scale = system.scale;
  for (const [level, spec] of Object.entries(scale)) {
    const varName = level.replace(/_/g, '-');
    vars.push(`  --font-size-${varName}: ${spec.font_size_rem}rem;`);
    vars.push(`  --line-height-${varName}: ${spec.line_height};`);
  }

  return [
    ...imports,
    '',
    ':root {',
    ...vars,
    '}',
  ].join('\n');
}

/**
 * Generate Tailwind config object for the typography system.
 */
export function generateTailwindConfig(system) {
  const headingStack = system.primary_font.classification === 'serif'
    ? `'${system.primary_font.family}', serif`
    : `'${system.primary_font.family}', sans-serif`;

  const bodyStack = system.secondary_font.classification === 'serif'
    ? `'${system.secondary_font.family}', serif`
    : `'${system.secondary_font.family}', sans-serif`;

  const monoStack = system.accent_font
    ? `'${system.accent_font.family}', monospace`
    : 'monospace';

  const fontSize = {};
  for (const [level, spec] of Object.entries(system.scale)) {
    const key = level.replace(/_/g, '-');
    fontSize[key] = [`${spec.font_size_rem}rem`, { lineHeight: `${spec.line_height}`, letterSpacing: spec.letter_spacing }];
  }

  return {
    fontFamily: {
      heading: headingStack,
      body: bodyStack,
      mono: monoStack,
    },
    fontSize,
  };
}

/**
 * Generate a human-readable pairing rationale.
 */
export function generatePairingRationale(primaryFont, secondaryFont, score, reasons) {
  const parts = [
    `${primaryFont.family} (${primaryFont.classification}) paired with ${secondaryFont.family} (${secondaryFont.classification})`,
    `creates a ${reasons.length ? reasons[0].toLowerCase() : 'balanced typographic hierarchy'}.`,
  ];

  if (primaryFont.classification !== secondaryFont.classification) {
    parts.push(`The contrast between ${primaryFont.classification} headings and ${secondaryFont.classification} body text provides clear visual hierarchy.`);
  }

  const xDiff = Math.abs(primaryFont.x_height_ratio - secondaryFont.x_height_ratio);
  if (xDiff < 0.05) {
    parts.push('Their similar x-heights ensure comfortable reading when mixed inline.');
  }

  parts.push(`Personality match score: ${Math.round(score)}/100.`);

  return parts.join(' ');
}

/**
 * Build the complete TypographySystem object (schema-compliant).
 *
 * @param {object} primaryFontEntry - heading font from catalog
 * @param {object} secondaryFontEntry - body font from catalog
 * @param {object} accentFontEntry - monospace font from catalog
 * @param {number} density - brand density axis (0-100)
 * @param {number} baseSize - base font size in px (default 16)
 * @param {number} [pairingScore] - optional score from pairing engine
 * @param {string[]} [pairingReasons] - optional reasons from pairing engine
 */
export function buildTypographySystem(
  primaryFontEntry,
  secondaryFontEntry,
  accentFontEntry,
  density,
  baseSize = 16,
  pairingScore,
  pairingReasons
) {
  const scaleRatio = getScaleRatio(density);

  const primary_font = buildFontSpec(primaryFontEntry);
  const secondary_font = buildFontSpec(secondaryFontEntry);
  const accent_font = accentFontEntry ? buildFontSpec(accentFontEntry) : null;

  const scale = generateTypeScale(baseSize, scaleRatio, primaryFontEntry, secondaryFontEntry, accentFontEntry);
  const usage_rules = generateUsageRules(primaryFontEntry, secondaryFontEntry);
  const pairing_rationale = generatePairingRationale(
    primaryFontEntry, secondaryFontEntry,
    pairingScore || 50, pairingReasons || []
  );

  const system = {
    primary_font,
    secondary_font,
    accent_font,
    scale,
    scale_ratio: scaleRatio,
    base_size: baseSize,
    pairing_rationale,
    usage_rules,
    css_declarations: '',
    tailwind_config: {},
  };

  // Generate CSS and Tailwind after system is assembled (they reference system fields)
  system.css_declarations = generateCSS(system);
  system.tailwind_config = generateTailwindConfig(system);

  return system;
}

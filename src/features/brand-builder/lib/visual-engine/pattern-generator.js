/**
 * Generates SVG pattern tiles and graphic devices from brand data.
 * All output is pure SVG strings — no DOM dependency.
 */

/**
 * Build color variants from the brand palette.
 */
function buildColorVariants(palette) {
  const primary = palette?.primary?.base || '#000000';
  const secondary = palette?.secondary?.base || '#666666';
  const neutral = palette?.neutral?.base || '#E5E5E5';

  return [
    { foreground: primary, background: '#FFFFFF' },
    { foreground: secondary, background: '#FFFFFF' },
    { foreground: '#FFFFFF', background: primary },
    { foreground: primary, background: neutral },
  ];
}

/**
 * Dot grid pattern tile.
 */
function buildDotGridTile(color, dotRadius = 2, spacing = 16) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spacing} ${spacing}" width="${spacing}" height="${spacing}"><circle cx="${spacing / 2}" cy="${spacing / 2}" r="${dotRadius}" fill="${color}"/></svg>`;
}

/**
 * Diagonal lines pattern tile.
 */
function buildDiagonalLinesTile(color, strokeWidth = 1.5, tileSize = 20) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tileSize} ${tileSize}" width="${tileSize}" height="${tileSize}"><line x1="0" y1="${tileSize}" x2="${tileSize}" y2="0" stroke="${color}" stroke-width="${strokeWidth}"/></svg>`;
}

/**
 * Chevron / zigzag pattern tile.
 */
function buildChevronTile(color, strokeWidth = 1.5) {
  const w = 40, h = 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polyline points="0,${h} ${w / 2},0 ${w},${h}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/**
 * Cross / plus pattern tile.
 */
function buildCrossTile(color, strokeWidth = 1.5, tileSize = 24) {
  const half = tileSize / 2;
  const arm = tileSize * 0.2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tileSize} ${tileSize}" width="${tileSize}" height="${tileSize}"><line x1="${half}" y1="${half - arm}" x2="${half}" y2="${half + arm}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/><line x1="${half - arm}" y1="${half}" x2="${half + arm}" y2="${half}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/></svg>`;
}

/**
 * Generate a divider line SVG (graphic device).
 */
function buildDividerLine(color, style = 'straight') {
  if (style === 'wave') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 20" width="200" height="20"><path d="M0 10 Q25 0 50 10 T100 10 T150 10 T200 10" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 4" width="200" height="4"><line x1="0" y1="2" x2="200" y2="2" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

/**
 * Generate a corner accent SVG (graphic device).
 */
function buildCornerAccent(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><path d="M0 0 L80 0 L80 8 L8 8 L8 80 L0 80 Z" fill="${color}" opacity="0.15"/><path d="M0 0 L40 0 L40 3 L3 3 L3 40 L0 40 Z" fill="${color}" opacity="0.3"/></svg>`;
}

/**
 * Generate a background accent dot cluster (graphic device).
 */
function buildDotCluster(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><circle cx="20" cy="20" r="4" fill="${color}" opacity="0.15"/><circle cx="50" cy="15" r="3" fill="${color}" opacity="0.1"/><circle cx="80" cy="25" r="5" fill="${color}" opacity="0.12"/><circle cx="35" cy="50" r="3.5" fill="${color}" opacity="0.08"/><circle cx="65" cy="55" r="4" fill="${color}" opacity="0.15"/><circle cx="95" cy="45" r="3" fill="${color}" opacity="0.1"/><circle cx="25" cy="80" r="4.5" fill="${color}" opacity="0.12"/><circle cx="55" cy="85" r="3" fill="${color}" opacity="0.08"/><circle cx="85" cy="75" r="5" fill="${color}" opacity="0.15"/><circle cx="100" cy="100" r="3.5" fill="${color}" opacity="0.1"/></svg>`;
}

/**
 * Generate complete PatternSystem from project data.
 */
export function generatePatterns(project) {
  const palette = project?.color_system?.palette;
  const dna = project?.brand_dna || {};
  const personalityVector = dna.personality_vector || [50, 50, 50, 50, 50];

  const primaryColor = palette?.primary?.base || '#000000';
  const secondaryColor = palette?.secondary?.base || '#666666';
  const colorVariants = buildColorVariants(palette);

  // Personality-driven sizing
  const minimalRich = personalityVector[4] ?? 50;
  const calmDynamic = personalityVector[1] ?? 50;

  const dotRadius = minimalRich < 35 ? 1.5 : minimalRich > 65 ? 3 : 2;
  const strokeWidth = minimalRich < 35 ? 1 : minimalRich > 65 ? 2.5 : 1.5;
  const dividerStyle = calmDynamic > 60 ? 'wave' : 'straight';

  // Build patterns
  const patterns = [
    {
      name: 'Dot Grid',
      svg_tile: buildDotGridTile(primaryColor, dotRadius),
      usage: 'Subtle backgrounds, card fills, section dividers',
      scale_range: { min: 0.5, max: 2 },
      color_variants: colorVariants.slice(0, 3),
    },
    {
      name: 'Diagonal Lines',
      svg_tile: buildDiagonalLinesTile(primaryColor, strokeWidth),
      usage: 'Accent backgrounds, header sections, overlays',
      scale_range: { min: 0.5, max: 1.5 },
      color_variants: colorVariants.slice(0, 3),
    },
    {
      name: 'Chevron',
      svg_tile: buildChevronTile(primaryColor, strokeWidth),
      usage: 'Decorative borders, section transitions, footer backgrounds',
      scale_range: { min: 0.5, max: 2 },
      color_variants: colorVariants.slice(0, 3),
    },
    {
      name: 'Cross Grid',
      svg_tile: buildCrossTile(primaryColor, strokeWidth),
      usage: 'Form backgrounds, subtle textures, presentation slides',
      scale_range: { min: 0.75, max: 2 },
      color_variants: colorVariants.slice(0, 3),
    },
  ];

  // Build graphic devices
  const graphicDevices = [
    {
      name: 'Corner Accent',
      svg: buildCornerAccent(primaryColor),
      usage: 'Page corners, card decorations, presentation slides',
      derived_from: 'brand primary color',
    },
    {
      name: 'Section Divider',
      svg: buildDividerLine(primaryColor, dividerStyle),
      usage: 'Between content sections, under headings',
      derived_from: 'brand personality',
    },
    {
      name: 'Background Cluster',
      svg: buildDotCluster(secondaryColor),
      usage: 'Hero backgrounds, empty states, decorative fills',
      derived_from: 'dot grid pattern',
    },
  ];

  return { patterns, graphic_devices: graphicDevices };
}

/**
 * Type scale calculator — 15 levels with responsive sizes.
 * Scale ratio determined by brand density axis.
 */

/**
 * Get the modular scale ratio from the density axis (0-100).
 */
export function getScaleRatio(density) {
  if (density < 30) return 1.200; // Minor Third — airy
  if (density <= 60) return 1.250; // Major Third — balanced
  return 1.333; // Perfect Fourth — dense
}

// Font weight assignments per level
const LEVEL_CONFIG = {
  display_1:  { exponent: 5,    lineHeight: 1.15, letterSpacing: '-0.03em', transform: 'none',      weight: 700, role: 'heading' },
  display_2:  { exponent: 4,    lineHeight: 1.15, letterSpacing: '-0.03em', transform: 'none',      weight: 700, role: 'heading' },
  h1:         { exponent: 3.5,  lineHeight: 1.25, letterSpacing: '-0.02em', transform: 'none',      weight: 700, role: 'heading' },
  h2:         { exponent: 3,    lineHeight: 1.25, letterSpacing: '-0.015em', transform: 'none',     weight: 600, role: 'heading' },
  h3:         { exponent: 2.5,  lineHeight: 1.25, letterSpacing: '-0.015em', transform: 'none',     weight: 600, role: 'heading' },
  h4:         { exponent: 2,    lineHeight: 1.30, letterSpacing: '-0.01em', transform: 'none',      weight: 600, role: 'heading' },
  h5:         { exponent: 1.5,  lineHeight: 1.30, letterSpacing: '-0.01em', transform: 'none',      weight: 500, role: 'heading' },
  h6:         { exponent: 1,    lineHeight: 1.30, letterSpacing: '-0.01em', transform: 'none',      weight: 500, role: 'heading' },
  body_large: { exponent: 1,    lineHeight: 1.60, letterSpacing: '0em',     transform: 'none',      weight: 400, role: 'body' },
  body:       { exponent: 0,    lineHeight: 1.60, letterSpacing: '0em',     transform: 'none',      weight: 400, role: 'body' },
  body_small: { exponent: -0.5, lineHeight: 1.50, letterSpacing: '0em',     transform: 'none',      weight: 400, role: 'body' },
  caption:    { exponent: -1,   lineHeight: 1.40, letterSpacing: '0.01em',  transform: 'none',      weight: 400, role: 'body' },
  overline:   { exponent: -1.5, lineHeight: 1.40, letterSpacing: '0.08em',  transform: 'uppercase', weight: 600, role: 'heading' },
  button:     { exponent: 0,    lineHeight: 1.50, letterSpacing: '0.03em',  transform: 'none',      weight: 500, role: 'body' },
  code:       { exponent: -0.5, lineHeight: 1.50, letterSpacing: '0em',     transform: 'none',      weight: 400, role: 'accent' },
};

/**
 * Generate responsive sizes: mobile = 85%, tablet = 92%, min 12px.
 */
export function generateResponsiveSizes(desktopPx) {
  return {
    mobile_size_px: Math.max(12, Math.round(desktopPx * 0.85)),
    tablet_size_px: Math.max(12, Math.round(desktopPx * 0.92)),
  };
}

/**
 * Pick the closest available weight from a font's weights list.
 */
function closestWeight(desired, available) {
  if (!available || !available.length) return desired;
  return available.reduce((prev, curr) =>
    Math.abs(curr - desired) < Math.abs(prev - desired) ? curr : prev
  );
}

/**
 * Generate the full TypeScale (15 TypeSpec entries).
 *
 * @param {number} baseSize - base font size in px (default 16)
 * @param {number} ratio - modular scale ratio
 * @param {{ family: string, weights_available: number[] }} primaryFont - heading font
 * @param {{ family: string, weights_available: number[] }} secondaryFont - body font
 * @param {{ family: string, weights_available: number[] }} accentFont - monospace font
 */
export function generateTypeScale(baseSize, ratio, primaryFont, secondaryFont, accentFont) {
  const scale = {};

  for (const [level, config] of Object.entries(LEVEL_CONFIG)) {
    const sizePx = Math.round(baseSize * Math.pow(ratio, config.exponent));
    const sizeRem = Math.round((sizePx / 16) * 1000) / 1000;

    // Font assignment by role
    let font;
    if (config.role === 'accent') {
      font = accentFont || secondaryFont;
    } else if (config.role === 'heading') {
      font = primaryFont;
    } else {
      font = secondaryFont;
    }

    const fontWeight = closestWeight(config.weight, font.weights_available);

    scale[level] = {
      font_family: font.family,
      font_weight: fontWeight,
      font_size_px: sizePx,
      font_size_rem: sizeRem,
      line_height: config.lineHeight,
      letter_spacing: config.letterSpacing,
      text_transform: config.transform,
      responsive: generateResponsiveSizes(sizePx),
    };
  }

  return scale;
}

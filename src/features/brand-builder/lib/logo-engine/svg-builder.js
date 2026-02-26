/**
 * SVG string composition for logo generation.
 * Builds wordmark text, icon elements, layouts, and color mode transformations.
 * All functions return raw SVG strings — no DOM dependency.
 */

// ── Font Import ───────────────────────────────────────────────────────────────

/**
 * Build Google Fonts @import style block for embedding in SVG.
 */
export function buildFontImport(fontFamily, googleFontsUrl) {
  if (!googleFontsUrl) return '';
  return `<style>@import url('${googleFontsUrl}');</style>`;
}

// ── Text Width Estimation ─────────────────────────────────────────────────────

/**
 * Estimate text width in pixels without DOM measurement.
 * Uses average character width ratio of 0.55 for proportional fonts.
 */
export function estimateTextWidth(text, fontSize, letterSpacing = 0) {
  const charWidth = fontSize * 0.55;
  const parsed = typeof letterSpacing === 'string' ? parseFloat(letterSpacing) : letterSpacing;
  const spacingPx = (Number.isFinite(parsed) ? parsed : 0) * fontSize;
  return text.length * charWidth + Math.max(0, text.length - 1) * spacingPx;
}

// ── Element Builders ──────────────────────────────────────────────────────────

/**
 * Build a wordmark <text> SVG element.
 */
export function buildWordmarkText(companyName, fontFamily, options = {}) {
  const {
    fontSize = 48,
    fontWeight = 700,
    letterSpacing = '0em',
    textTransform = 'none',
    fill = '#000000',
    x = '50%',
    y = '50%',
    anchor = 'middle',
  } = options;

  let text = companyName;
  if (textTransform === 'uppercase') text = companyName.toUpperCase();
  else if (textTransform === 'lowercase') text = companyName.toLowerCase();
  else if (textTransform === 'capitalize') {
    text = companyName.replace(/\b\w/g, c => c.toUpperCase());
  }

  // Escape XML entities
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<text font-family="'${fontFamily}', sans-serif" font-weight="${fontWeight}" font-size="${fontSize}" letter-spacing="${letterSpacing}" fill="${fill}" dominant-baseline="central" text-anchor="${anchor}" x="${x}" y="${y}">${text}</text>`;
}

/**
 * Build a lettermark <text> SVG element (first letter or initials).
 */
export function buildLettermarkText(companyName, fontFamily, options = {}) {
  const {
    fontSize = 60,
    fontWeight = 800,
    fill = '#000000',
  } = options;

  // Extract initials: first letter of each word, max 3
  const words = companyName.trim().split(/\s+/);
  const initials = words.length > 1
    ? words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
    : companyName[0].toUpperCase();

  const escaped = initials.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<text font-family="'${fontFamily}', sans-serif" font-weight="${fontWeight}" font-size="${fontSize}" fill="${fill}" dominant-baseline="central" text-anchor="middle" x="50" y="50">${escaped}</text>`;
}

/**
 * Build an icon <g> element from an icon entry.
 */
export function buildIconElement(iconEntry, options = {}) {
  const {
    fill = '#000000',
    scale = 1,
    translateX = 0,
    translateY = 0,
  } = options;

  const transforms = [];
  if (translateX || translateY) transforms.push(`translate(${translateX},${translateY})`);
  if (scale !== 1) transforms.push(`scale(${scale})`);

  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

  return `<g${transformAttr}><path d="${iconEntry.svgPath}" fill="${fill}" fill-rule="evenodd"/></g>`;
}

// ── Layout Composers ──────────────────────────────────────────────────────────

/**
 * Compose a horizontal logo: icon left, wordmark right.
 */
export function composeHorizontalLogo(wordmarkEl, iconEl, fontImport, options = {}) {
  const {
    iconSize = 60,
    spacing = 20,
    textWidth = 200,
    height = 80,
    fill = '#000000',
  } = options;

  const totalWidth = iconSize + spacing + textWidth + 20; // 20px padding
  const svgWidth = Math.max(totalWidth, 200);
  const iconScale = iconSize / 100;
  const iconY = (height - iconSize) / 2;
  const textX = iconSize + spacing;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${height}" width="${svgWidth}" height="${height}">
${fontImport}
<g transform="translate(0,${iconY}) scale(${iconScale})">${iconEl ? iconEl.replace(/<g[^>]*>/, '<g>') : ''}</g>
<g transform="translate(${textX},0)">${wordmarkEl.replace(/x="[^"]*"/, `x="0"`).replace(/text-anchor="[^"]*"/, 'text-anchor="start"').replace(/y="[^"]*"/, `y="${height / 2}"`)}</g>
</svg>`;
}

/**
 * Compose a stacked logo: icon on top, wordmark below.
 */
export function composeStackedLogo(wordmarkEl, iconEl, fontImport, options = {}) {
  const {
    iconSize = 70,
    spacing = 15,
    textWidth = 200,
    fontSize = 48,
  } = options;

  const width = Math.max(iconSize, textWidth, 150);
  const height = iconSize + spacing + fontSize + 20;
  const iconScale = iconSize / 100;
  const iconX = (width - iconSize) / 2;
  const textY = iconSize + spacing + fontSize / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${fontImport}
<g transform="translate(${iconX},0) scale(${iconScale})">${iconEl ? iconEl.replace(/<g[^>]*>/, '<g>') : ''}</g>
${wordmarkEl.replace(/x="[^"]*"/, `x="${width / 2}"`).replace(/y="[^"]*"/, `y="${textY}"`).replace(/text-anchor="[^"]*"/, 'text-anchor="middle"')}
</svg>`;
}

/**
 * Compose a wordmark-only logo (no icon).
 */
export function composeWordmarkOnly(wordmarkEl, fontImport, options = {}) {
  const {
    textWidth = 250,
    height = 60,
  } = options;

  const width = textWidth + 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${fontImport}
${wordmarkEl.replace(/x="[^"]*"/, `x="${width / 2}"`).replace(/y="[^"]*"/, `y="${height / 2}"`).replace(/text-anchor="[^"]*"/, 'text-anchor="middle"')}
</svg>`;
}

/**
 * Compose an icon-only logo (no text).
 */
export function composeIconOnly(iconEl, options = {}) {
  const { size = 100 } = options;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
${iconEl ? iconEl.replace(/<g[^>]*>/, '<g>') : ''}
</svg>`;
}

/**
 * Compose a lettermark logo (initials in a container).
 */
export function composeLettermark(letterEl, fontImport, options = {}) {
  const { size = 100 } = options;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
${fontImport}
${letterEl}
</svg>`;
}

/**
 * Compose a favicon (32×32 simplified).
 */
export function composeFavicon(iconEl, letterEl, fontImport, options = {}) {
  const { useLetter = false } = options;

  const content = useLetter && letterEl
    ? letterEl.replace(/font-size="[^"]*"/, 'font-size="28"')
    : (iconEl ? iconEl.replace(/<g[^>]*>/, '<g>') : '');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="32" height="32">
${useLetter ? fontImport : ''}
${content}
</svg>`;
}

/**
 * Compose a social avatar (circle-cropped icon).
 */
export function composeSocialAvatar(iconEl, options = {}) {
  const { size = 200, bgColor = '#FFFFFF' } = options;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
<defs><clipPath id="circle-clip"><circle cx="50" cy="50" r="50"/></clipPath></defs>
<circle cx="50" cy="50" r="50" fill="${bgColor}"/>
<g clip-path="url(#circle-clip)">
<g transform="translate(15,15) scale(0.7)">${iconEl ? iconEl.replace(/<g[^>]*>/, '<g>') : ''}</g>
</g>
</svg>`;
}

// ── Color Mode Transformations ────────────────────────────────────────────────

/**
 * Apply a color mode transformation to an SVG string.
 * Returns a new SVG string with recolored fills/strokes.
 */
export function applyColorMode(svgString, mode, palette) {
  if (!svgString || !mode) return svgString;

  switch (mode) {
    case 'full_color_light':
      return svgString; // already in brand colors

    case 'full_color_dark':
      // Same brand colors, but suitable for dark backgrounds
      return svgString;

    case 'full_color_on_brand':
      // All fills become white for use on primary-colored background
      return recolorAllFills(svgString, '#FFFFFF');

    case 'reversed':
      return recolorAllFills(svgString, '#FFFFFF');

    case 'mono_black':
      return recolorAllFills(svgString, '#000000');

    case 'mono_white':
      return recolorAllFills(svgString, '#FFFFFF');

    case 'grayscale': {
      // Convert brand colors to grayscale using luminance
      return svgString.replace(/fill="(#[0-9a-fA-F]{3,8})"/g, (match, hex) => {
        const gray = hexToGrayscale(hex);
        return `fill="${gray}"`;
      });
    }

    default:
      return svgString;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function recolorAllFills(svgString, color) {
  // Replace fill attributes on path/text elements, but not on rect/circle backgrounds
  return svgString.replace(/fill="(#[0-9a-fA-F]{3,8})"/g, `fill="${color}"`);
}

function hexToGrayscale(hex) {
  // Parse hex to RGB
  let r, g, b;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }

  // Luminance-weighted grayscale
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const h = gray.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
}

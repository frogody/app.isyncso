/**
 * Shared SVG utilities for application mockup generators.
 * All functions return pure strings — no DOM dependency.
 */
import { buildFontImport, estimateTextWidth } from '../logo-engine/svg-builder.js';

// Re-export for convenience
export { estimateTextWidth };

// ── SVG Content Extraction ──────────────────────────────────────────────────

/**
 * Extract inner content from an SVG string, plus the source viewBox dimensions.
 * Returns { content, viewBoxWidth, viewBoxHeight }.
 */
export function extractSvgContent(svgString) {
  if (!svgString) return { content: '', viewBoxWidth: 100, viewBoxHeight: 100 };

  // Parse viewBox
  const vbMatch = svgString.match(/viewBox="([^"]+)"/);
  let viewBoxWidth = 100, viewBoxHeight = 100;
  if (vbMatch) {
    const parts = vbMatch[1].split(/\s+/).map(Number);
    viewBoxWidth = parts[2] || 100;
    viewBoxHeight = parts[3] || 100;
  }

  // Strip outer <svg> and </svg>
  const content = svgString
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();

  return { content, viewBoxWidth, viewBoxHeight };
}

// ── SVG Wrapping ────────────────────────────────────────────────────────────

/**
 * Wrap inner SVG content in a root <svg> element.
 */
export function wrapSvg(inner, width, height, options = {}) {
  const { bgColor, defs = '', fontStyle = '' } = options;
  const bg = bgColor ? `<rect width="${width}" height="${height}" fill="${bgColor}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${fontStyle}${defs}${bg}${inner}</svg>`;
}

// ── Logo Embedding ──────────────────────────────────────────────────────────

/**
 * Get a logo SVG string from the project.
 */
export function getLogoSvg(project, variation = 'primary', colorMode = 'full_color_light') {
  return project?.logo_system?.variations?.[variation]?.color_modes?.[colorMode] || '';
}

/**
 * Embed a logo into a larger SVG composition.
 * Returns a <g> element with transform for position + scale.
 */
export function embedLogo(project, variation, colorMode, x, y, targetWidth) {
  const svg = getLogoSvg(project, variation, colorMode);
  if (!svg) return '';

  const { content, viewBoxWidth, viewBoxHeight } = extractSvgContent(svg);
  const scale = targetWidth / viewBoxWidth;
  const targetHeight = viewBoxHeight * scale;

  return {
    element: `<g transform="translate(${x},${y}) scale(${scale})">${content}</g>`,
    width: targetWidth,
    height: targetHeight,
  };
}

// ── Font Style ──────────────────────────────────────────────────────────────

/**
 * Build <style> block with Google Fonts imports for both fonts.
 */
export function buildFontStyle(project) {
  const primary = project?.typography_system?.primary_font;
  const secondary = project?.typography_system?.secondary_font;
  const imports = [];
  if (primary?.google_fonts_url) imports.push(`@import url('${primary.google_fonts_url}');`);
  if (secondary?.google_fonts_url && secondary.google_fonts_url !== primary?.google_fonts_url) {
    imports.push(`@import url('${secondary.google_fonts_url}');`);
  }
  return imports.length ? `<style>${imports.join('')}</style>` : '';
}

/**
 * Get font family name for SVG text elements.
 */
export function getFontFamily(project, which = 'primary') {
  const font = which === 'primary'
    ? project?.typography_system?.primary_font
    : project?.typography_system?.secondary_font;
  return font?.family || 'Inter';
}

// ── Color Extraction ────────────────────────────────────────────────────────

/**
 * Extract palette shorthand (same pattern as MiniMockup.jsx).
 */
export function getColors(project) {
  const palette = project?.color_system?.palette;
  return {
    p: palette?.primary?.base || '#333333',
    pl: palette?.primary?.light || '#666666',
    pd: palette?.primary?.dark || '#111111',
    s: palette?.secondary?.base || '#666666',
    a: palette?.accent?.base || '#FF6B35',
    nb: palette?.neutrals?.near_black || '#1a1a1a',
    lg: palette?.neutrals?.light_gray || '#f5f5f5',
    wh: palette?.neutrals?.white || '#ffffff',
    mg: palette?.neutrals?.mid_gray || '#888888',
  };
}

// ── Copy Extraction ─────────────────────────────────────────────────────────

/**
 * Extract sample copy from verbal identity with fallbacks.
 */
export function getCopy(project) {
  const copy = project?.verbal_identity?.writing_guidelines?.sample_copy || {};
  const name = project?.brand_dna?.company || 'Company';
  const tagline = project?.brand_dna?.tagline || '';
  return {
    name,
    tagline,
    heroHeadline: copy.homepage_hero?.headline || `Welcome to ${name}`,
    heroSubheadline: copy.homepage_hero?.subheadline || tagline || 'We build something remarkable.',
    heroCta: copy.homepage_hero?.cta || 'Get Started',
    socialPost: copy.social_media_post?.text || copy.social_media_post || `Discover what ${name} can do for you.`,
    aboutIntro: copy.about_page_intro?.text || copy.about_page_intro || `${name} is on a mission to transform the industry.`,
  };
}

// ── Pattern Embedding ───────────────────────────────────────────────────────

/**
 * Build a <defs><pattern> block from the project's first pattern tile.
 * Returns { def, fillUrl } or null if no patterns.
 */
export function buildPatternDef(project, id = 'brand-pattern', opacity = 0.08) {
  const tile = project?.visual_language?.patterns?.patterns?.[0]?.svg_tile;
  if (!tile) return null;

  const { content, viewBoxWidth, viewBoxHeight } = extractSvgContent(tile);

  return {
    def: `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${viewBoxWidth}" height="${viewBoxHeight}">${content}</pattern></defs>`,
    fill: `<rect width="100%" height="100%" fill="url(#${id})" opacity="${opacity}"/>`,
  };
}

// ── Gradient Def ────────────────────────────────────────────────────────────

/**
 * Build a <linearGradient> definition.
 */
export function buildGradientDef(id, color1, color2, angle = 135) {
  const rad = (angle * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(rad) * 50);
  const y1 = Math.round(50 - Math.sin(rad) * 50);
  const x2 = Math.round(50 + Math.cos(rad) * 50);
  const y2 = Math.round(50 + Math.sin(rad) * 50);

  return `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient>`;
}

// ── Text Helpers ────────────────────────────────────────────────────────────

export function escapeXml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build an SVG <text> element.
 */
export function svgText(text, x, y, options = {}) {
  const {
    fontFamily = 'Inter',
    fontSize = 16,
    fontWeight = 400,
    fill = '#000000',
    anchor = 'start',
    opacity = 1,
    letterSpacing,
  } = options;
  const ls = letterSpacing ? ` letter-spacing="${letterSpacing}"` : '';
  const op = opacity < 1 ? ` opacity="${opacity}"` : '';
  return `<text x="${x}" y="${y}" font-family="'${escapeXml(fontFamily)}', sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="hanging"${ls}${op}>${escapeXml(text)}</text>`;
}

/**
 * Wrap long text into multiple lines (returns array of <text> elements).
 */
export function svgTextWrap(text, x, y, maxWidth, options = {}) {
  const { fontSize = 16, lineHeight = 1.4, ...rest } = options;
  const words = String(text).split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (estimateTextWidth(test, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.map((line, i) =>
    svgText(line, x, y + i * fontSize * lineHeight, { fontSize, ...rest })
  ).join('');
}

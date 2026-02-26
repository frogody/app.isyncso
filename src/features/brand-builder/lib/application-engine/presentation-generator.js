/**
 * Presentation slide generators: title, content, divider, closing.
 * All return pure SVG strings.
 */
import {
  wrapSvg, embedLogo, buildFontStyle, getFontFamily,
  getColors, getCopy, buildPatternDef, escapeXml, svgText,
} from './helpers.js';

// ── Main Entry ──────────────────────────────────────────────────────────────

export function generateSlides(project) {
  return {
    pptx: null,
    keynote: null,
    slides: [
      { type: 'title', name: 'Title Slide', preview: generateTitleSlide(project) },
      { type: 'content', name: 'Content Slide', preview: generateContentSlide(project) },
      { type: 'divider', name: 'Section Divider', preview: generateDividerSlide(project) },
      { type: 'closing', name: 'Closing Slide', preview: generateClosingSlide(project) },
    ],
  };
}

// ── Title Slide ─────────────────────────────────────────────────────────────

function generateTitleSlide(project) {
  const W = 1920, H = 1080;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);

  const pattern = buildPatternDef(project, 'slide-title-pattern', 0.08);
  const defs = pattern ? pattern.def : '';
  const patternFill = pattern ? pattern.fill : '';

  // Logo top-left
  const logo = embedLogo(project, 'primary', 'mono_white', 80, 60, 160);

  // Title text
  const title = svgText('Presentation Title', 80, H * 0.42, {
    fontFamily: font, fontSize: 72, fontWeight: 700, fill: '#ffffff',
  });

  // Subtitle
  const subtitle = svgText(copy.tagline || copy.name, 80, H * 0.42 + 96, {
    fontFamily: font, fontSize: 28, fontWeight: 400, fill: '#ffffff', opacity: 0.7,
  });

  // Date / presenter line
  const dateLine = svgText('Presented by ' + copy.name, 80, H - 80, {
    fontFamily: font, fontSize: 16, fontWeight: 400, fill: '#ffffff', opacity: 0.5,
  });

  // Accent line below title
  const accent = `<rect x="80" y="${H * 0.42 + 50}" width="80" height="4" rx="2" fill="${c.a}"/>`;

  const inner = `${patternFill}${logo.element}${title}${accent}${subtitle}${dateLine}`;
  return wrapSvg(inner, W, H, { bgColor: c.p, fontStyle, defs });
}

// ── Content Slide ───────────────────────────────────────────────────────────

function generateContentSlide(project) {
  const W = 1920, H = 1080;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);

  // Header bar
  const headerH = 80;
  const headerBar = `<rect width="${W}" height="${headerH}" fill="${c.p}"/>`;
  const logo = embedLogo(project, 'wordmark', 'mono_white', 40, (headerH - 30) / 2, 120);

  // Content heading
  const heading = svgText('Section Heading', 80, headerH + 80, {
    fontFamily: font, fontSize: 40, fontWeight: 700, fill: c.nb,
  });

  // Body placeholder lines
  let bodyLines = '';
  const bodyY = headerH + 160;
  const widths = [0.55, 0.58, 0.50, 0.53, 0.45];
  widths.forEach((w, i) => {
    bodyLines += `<rect x="80" y="${bodyY + i * 32}" width="${(W * 0.6) * w}" height="10" rx="5" fill="${c.mg}" opacity="0.2"/>`;
  });

  // Accent sidebar right
  const sideX = W * 0.68;
  const pattern = buildPatternDef(project, 'slide-content-pattern', 0.1);
  const patternDefs = pattern ? pattern.def : '';
  const sidebar = `<rect x="${sideX}" y="${headerH + 40}" width="${W - sideX - 40}" height="${H - headerH - 80}" rx="16" fill="${c.p}" opacity="0.06"/>`;

  // Page number
  const pageNum = svgText('02', W - 80, H - 50, {
    fontFamily: font, fontSize: 14, fontWeight: 500, fill: c.mg, anchor: 'end',
  });

  const inner = `${headerBar}${logo.element}${heading}${bodyLines}${sidebar}${pageNum}`;
  return wrapSvg(inner, W, H, { bgColor: c.wh, fontStyle, defs: patternDefs });
}

// ── Section Divider ─────────────────────────────────────────────────────────

function generateDividerSlide(project) {
  const W = 1920, H = 1080;
  const c = getColors(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);

  // Large section number
  const bigNum = svgText('01', W * 0.5, H * 0.35, {
    fontFamily: font, fontSize: 300, fontWeight: 800, fill: '#ffffff', opacity: 0.08, anchor: 'middle',
  });

  // Section title
  const title = svgText('Section Title', W * 0.5, H * 0.5, {
    fontFamily: font, fontSize: 56, fontWeight: 700, fill: '#ffffff', anchor: 'middle',
  });

  // Accent line
  const accent = `<rect x="${(W - 80) / 2}" y="${H * 0.5 + 40}" width="80" height="4" rx="2" fill="${c.a}"/>`;

  const inner = `${bigNum}${title}${accent}`;
  return wrapSvg(inner, W, H, { bgColor: c.s, fontStyle });
}

// ── Closing Slide ───────────────────────────────────────────────────────────

function generateClosingSlide(project) {
  const W = 1920, H = 1080;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);

  const pattern = buildPatternDef(project, 'slide-closing-pattern', 0.06);
  const defs = pattern ? pattern.def : '';
  const patternFill = pattern ? pattern.fill : '';

  // Logo centered
  const logoW = 200;
  const logo = embedLogo(project, 'secondary', 'mono_white', (W - logoW) / 2, H * 0.25, logoW);

  // Thank you text
  const thankYou = svgText('Thank You', W / 2, H * 0.55, {
    fontFamily: font, fontSize: 56, fontWeight: 700, fill: '#ffffff', anchor: 'middle',
  });

  // Company + tagline
  const companyLine = svgText(copy.name, W / 2, H * 0.66, {
    fontFamily: font, fontSize: 20, fontWeight: 500, fill: '#ffffff', opacity: 0.7, anchor: 'middle',
  });
  const taglineLine = copy.tagline
    ? svgText(copy.tagline, W / 2, H * 0.66 + 32, {
        fontFamily: font, fontSize: 16, fontWeight: 400, fill: '#ffffff', opacity: 0.5, anchor: 'middle',
      })
    : '';

  const inner = `${patternFill}${logo.element}${thankYou}${companyLine}${taglineLine}`;
  return wrapSvg(inner, W, H, { bgColor: c.p, fontStyle, defs });
}

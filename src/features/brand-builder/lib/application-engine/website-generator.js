/**
 * Website mockup generators: desktop + mobile.
 * All return pure SVG strings.
 */
import {
  wrapSvg, embedLogo, buildFontStyle, getFontFamily, extractSvgContent,
  getColors, getCopy, buildPatternDef, escapeXml, svgText, svgTextWrap,
} from './helpers.js';

// ── Desktop Mockup ──────────────────────────────────────────────────────────

export function generateDesktopMockup(project) {
  const W = 1440, H = 960;
  const chromeH = 36;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);

  // Pattern for hero
  const pattern = buildPatternDef(project, 'web-hero-pattern', 0.04);
  const defs = pattern ? pattern.def : '';

  // ── Browser Chrome ──
  const chrome = [
    `<rect width="${W}" height="${chromeH}" fill="#2a2a2e" rx="8"/>`,
    `<rect y="${8}" width="${W}" height="${chromeH - 8}" fill="#2a2a2e"/>`,
    `<circle cx="18" cy="18" r="5" fill="#ff5f57"/>`,
    `<circle cx="36" cy="18" r="5" fill="#febc2e"/>`,
    `<circle cx="54" cy="18" r="5" fill="#28c840"/>`,
    `<rect x="200" y="10" width="300" height="16" rx="8" fill="#1c1c1e"/>`,
  ].join('');

  const contentY = chromeH;
  const contentH = H - chromeH;
  const pad = 60;

  // ── Navbar ──
  const navH = 60;
  const navBg = `<rect x="0" y="${contentY}" width="${W}" height="${navH}" fill="${c.wh}"/>`;
  const navLogo = embedLogo(project, 'primary', 'full_color_light', pad, contentY + 12, 100);
  const navLinks = ['About', 'Features', 'Pricing'].map((label, i) =>
    svgText(label, W - pad - (2 - i) * 100, contentY + navH / 2 + 5, {
      fontFamily: font, fontSize: 14, fontWeight: 500, fill: c.mg,
    })
  ).join('');
  const ctaBtn = [
    `<rect x="${W - pad - 100}" y="${contentY + 15}" width="90" height="30" rx="6" fill="${c.a}"/>`,
    svgText('Sign Up', W - pad - 55, contentY + 25, {
      fontFamily: font, fontSize: 12, fontWeight: 600, fill: '#ffffff', anchor: 'middle',
    }),
  ].join('');
  const navBorder = `<rect x="0" y="${contentY + navH - 1}" width="${W}" height="1" fill="${c.mg}" opacity="0.1"/>`;

  // ── Hero Section ──
  const heroY = contentY + navH;
  const heroH = 320;
  const heroBg = `<rect x="0" y="${heroY}" width="${W}" height="${heroH}" fill="${c.lg}"/>`;
  const heroPattern = pattern ? `<g transform="translate(0,${heroY})"><rect width="${W}" height="${heroH}" fill="url(#web-hero-pattern)"/></g>` : '';

  const heroTitle = svgTextWrap(copy.heroHeadline, pad, heroY + 80, W * 0.5, {
    fontFamily: font, fontSize: 42, fontWeight: 700, fill: c.nb, lineHeight: 1.2,
  });
  const heroSub = svgTextWrap(copy.heroSubheadline, pad, heroY + 190, W * 0.45, {
    fontFamily: font, fontSize: 18, fontWeight: 400, fill: c.mg, lineHeight: 1.5,
  });
  const heroBtn = [
    `<rect x="${pad}" y="${heroY + 260}" width="140" height="40" rx="8" fill="${c.a}"/>`,
    svgText(copy.heroCta, pad + 70, heroY + 273, {
      fontFamily: font, fontSize: 14, fontWeight: 600, fill: '#ffffff', anchor: 'middle',
    }),
  ].join('');

  // ── Feature Cards ──
  const cardsY = heroY + heroH + 50;
  const cardW = (W - pad * 2 - 40) / 3;
  const cardH = 180;
  const icons = project?.visual_language?.iconography?.base_set || [];

  let cards = '';
  for (let i = 0; i < 3; i++) {
    const cx = pad + i * (cardW + 20);
    cards += `<rect x="${cx}" y="${cardsY}" width="${cardW}" height="${cardH}" rx="12" fill="${c.wh}" stroke="${c.mg}" stroke-width="0.5" stroke-opacity="0.15"/>`;

    // Icon placeholder
    const icon = icons[i];
    if (icon?.svg) {
      const { content } = extractSvgContent(icon.svg);
      const iconScale = 32 / 48;
      cards += `<g transform="translate(${cx + 24},${cardsY + 24}) scale(${iconScale})">${content}</g>`;
    } else {
      cards += `<rect x="${cx + 24}" y="${cardsY + 24}" width="32" height="32" rx="8" fill="${c.p}" opacity="0.15"/>`;
    }

    // Card text placeholders
    cards += `<rect x="${cx + 24}" y="${cardsY + 76}" width="${cardW * 0.6}" height="12" rx="6" fill="${c.nb}" opacity="0.8"/>`;
    cards += `<rect x="${cx + 24}" y="${cardsY + 100}" width="${cardW * 0.8}" height="8" rx="4" fill="${c.mg}" opacity="0.3"/>`;
    cards += `<rect x="${cx + 24}" y="${cardsY + 116}" width="${cardW * 0.65}" height="8" rx="4" fill="${c.mg}" opacity="0.3"/>`;
  }

  // ── Footer ──
  const footerY = H - 100;
  const footerH = 100;
  const footer = `<rect x="0" y="${footerY}" width="${W}" height="${footerH}" fill="${c.nb}"/>`;
  const footerLogo = embedLogo(project, 'wordmark', 'mono_white', pad, footerY + 30, 100);
  const footerCopy = svgText(`© ${new Date().getFullYear()} ${copy.name}. All rights reserved.`, W - pad, footerY + 50, {
    fontFamily: font, fontSize: 11, fontWeight: 400, fill: '#ffffff', opacity: 0.4, anchor: 'end',
  });

  const inner = [
    chrome, navBg, navLogo.element, navLinks, ctaBtn, navBorder,
    heroBg, heroPattern, heroTitle, heroSub, heroBtn,
    cards, footer, footerLogo.element, footerCopy,
  ].join('');

  return wrapSvg(inner, W, H, { bgColor: c.wh, fontStyle, defs });
}

// ── Mobile Mockup ───────────────────────────────────────────────────────────

export function generateMobileMockup(project) {
  const W = 390, H = 844;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);

  const pattern = buildPatternDef(project, 'mobile-pattern', 0.04);
  const defs = pattern ? pattern.def : '';

  // ── Phone Frame ──
  const frame = [
    `<rect width="${W}" height="${H}" rx="40" fill="#1c1c1e"/>`,
    `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="38" fill="${c.wh}"/>`,
  ].join('');

  // Status bar
  const statusBar = [
    svgText('9:41', 30, 18, { fontFamily: font, fontSize: 14, fontWeight: 600, fill: c.nb }),
    `<rect x="${W - 80}" y="12" width="20" height="10" rx="2" fill="${c.nb}" opacity="0.3"/>`,
  ].join('');

  // Notch
  const notch = `<rect x="${(W - 120) / 2}" y="0" width="120" height="28" rx="14" fill="#1c1c1e"/>`;

  const contentX = 24;
  const contentW = W - 48;

  // ── Mobile Nav ──
  const navY = 56;
  const navLogo = embedLogo(project, 'submark', 'full_color_light', contentX, navY, 32);
  const hamburger = [
    `<rect x="${W - contentX - 24}" y="${navY + 4}" width="20" height="2" rx="1" fill="${c.nb}"/>`,
    `<rect x="${W - contentX - 24}" y="${navY + 10}" width="20" height="2" rx="1" fill="${c.nb}"/>`,
    `<rect x="${W - contentX - 24}" y="${navY + 16}" width="14" height="2" rx="1" fill="${c.nb}"/>`,
  ].join('');

  // ── Hero ──
  const heroY = 110;
  const heroBg = `<rect x="4" y="${heroY}" width="${W - 8}" height="260" fill="${c.lg}"/>`;
  const heroPattern = pattern ? `<g><clipPath id="hero-clip"><rect x="4" y="${heroY}" width="${W - 8}" height="260"/></clipPath><rect x="4" y="${heroY}" width="${W - 8}" height="260" fill="url(#mobile-pattern)" clip-path="url(#hero-clip)"/></g>` : '';

  const heroTitle = svgTextWrap(copy.heroHeadline, contentX, heroY + 40, contentW, {
    fontFamily: font, fontSize: 28, fontWeight: 700, fill: c.nb, lineHeight: 1.2,
  });
  const heroBtn = [
    `<rect x="${contentX}" y="${heroY + 200}" width="120" height="36" rx="8" fill="${c.a}"/>`,
    svgText(copy.heroCta, contentX + 60, heroY + 212, {
      fontFamily: font, fontSize: 13, fontWeight: 600, fill: '#ffffff', anchor: 'middle',
    }),
  ].join('');

  // ── Single card ──
  const cardY = heroY + 290;
  const card = [
    `<rect x="${contentX}" y="${cardY}" width="${contentW}" height="100" rx="12" fill="${c.wh}" stroke="${c.mg}" stroke-width="0.5" stroke-opacity="0.15"/>`,
    `<rect x="${contentX + 16}" y="${cardY + 20}" width="28" height="28" rx="6" fill="${c.p}" opacity="0.15"/>`,
    `<rect x="${contentX + 56}" y="${cardY + 22}" width="${contentW * 0.5}" height="10" rx="5" fill="${c.nb}" opacity="0.8"/>`,
    `<rect x="${contentX + 56}" y="${cardY + 40}" width="${contentW * 0.7}" height="7" rx="3.5" fill="${c.mg}" opacity="0.3"/>`,
    `<rect x="${contentX + 56}" y="${cardY + 54}" width="${contentW * 0.55}" height="7" rx="3.5" fill="${c.mg}" opacity="0.3"/>`,
  ].join('');

  // ── Footer ──
  const footerY = H - 80;
  const footer = [
    `<rect x="4" y="${footerY}" width="${W - 8}" height="76" rx="0" fill="${c.nb}"/>`,
    `<rect x="4" y="${H - 8}" width="${W - 8}" height="8" rx="38" fill="${c.nb}"/>`,
    svgText(`© ${copy.name}`, W / 2, footerY + 30, {
      fontFamily: font, fontSize: 10, fontWeight: 400, fill: '#ffffff', opacity: 0.4, anchor: 'middle',
    }),
  ].join('');

  const inner = [
    frame, statusBar, notch,
    navLogo.element, hamburger,
    heroBg, heroPattern, heroTitle, heroBtn,
    card, footer,
  ].join('');

  return wrapSvg(inner, W, H, { fontStyle, defs });
}

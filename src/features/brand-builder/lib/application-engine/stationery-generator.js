/**
 * Stationery mockup generators: business cards, letterhead, envelope.
 * All return pure SVG strings.
 */
import {
  wrapSvg, embedLogo, buildFontStyle, getFontFamily,
  getColors, getCopy, buildPatternDef, escapeXml, svgText,
} from './helpers.js';

// ── Business Card Front ─────────────────────────────────────────────────────

export function generateBusinessCardFront(project) {
  const W = 1050, H = 600;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);
  const pad = 60;

  // Logo top-left
  const logo = embedLogo(project, 'primary', 'full_color_light', pad, pad, 160);

  // Contact area
  const contactY = H - pad - 120;
  const contactLines = [
    { text: 'Your Name', size: 18, weight: 600, color: c.nb },
    { text: 'Job Title', size: 14, weight: 400, color: c.mg },
    { text: '', size: 10, weight: 400, color: c.mg },
    { text: 'hello@' + copy.name.toLowerCase().replace(/\s+/g, '') + '.com', size: 13, weight: 400, color: c.p },
    { text: '+1 (555) 123-4567', size: 13, weight: 400, color: c.mg },
    { text: 'www.' + copy.name.toLowerCase().replace(/\s+/g, '') + '.com', size: 13, weight: 400, color: c.mg },
  ];

  let contactContent = '';
  let cy = contactY;
  for (const line of contactLines) {
    if (!line.text) { cy += 8; continue; }
    contactContent += svgText(line.text, pad, cy, {
      fontFamily: font, fontSize: line.size, fontWeight: line.weight, fill: line.color,
    });
    cy += line.size + 8;
  }

  // Accent line
  const lineY = contactY - 20;
  const accentLine = `<rect x="${pad}" y="${lineY}" width="60" height="3" rx="1.5" fill="${c.p}"/>`;

  // Tagline below logo
  const taglineY = pad + (logo.height || 50) + 24;
  const taglineEl = copy.tagline
    ? svgText(copy.tagline, pad, taglineY, { fontFamily: font, fontSize: 14, fontWeight: 400, fill: c.mg })
    : '';

  const inner = `${logo.element}${taglineEl}${accentLine}${contactContent}`;
  return wrapSvg(inner, W, H, { bgColor: c.wh, fontStyle });
}

// ── Business Card Back ──────────────────────────────────────────────────────

export function generateBusinessCardBack(project) {
  const W = 1050, H = 600;
  const c = getColors(project);
  const fontStyle = buildFontStyle(project);

  // Centered logo
  const logo = embedLogo(project, 'submark', 'mono_white', 0, 0, 120);
  const logoX = (W - 120) / 2;
  const logoY = (H - (logo.height || 120)) / 2;
  const centeredLogo = embedLogo(project, 'submark', 'mono_white', logoX, logoY, 120);

  // Pattern overlay
  const pattern = buildPatternDef(project, 'card-back-pattern', 0.08);
  const defs = pattern ? pattern.def : '';
  const patternFill = pattern ? pattern.fill : '';

  const inner = `${patternFill}${centeredLogo.element}`;
  return wrapSvg(inner, W, H, { bgColor: c.p, fontStyle, defs });
}

// ── Letterhead ──────────────────────────────────────────────────────────────

export function generateLetterhead(project) {
  const W = 595, H = 842;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);
  const pad = 50;

  // Logo top-left
  const logo = embedLogo(project, 'primary', 'full_color_light', pad, pad, 120);

  // Company info top-right
  const infoX = W - pad;
  const infoContent = [
    svgText(copy.name, infoX, pad + 4, { fontFamily: font, fontSize: 11, fontWeight: 600, fill: c.nb, anchor: 'end' }),
    svgText('123 Business Street', infoX, pad + 20, { fontFamily: font, fontSize: 9, fontWeight: 400, fill: c.mg, anchor: 'end' }),
    svgText('City, State 12345', infoX, pad + 33, { fontFamily: font, fontSize: 9, fontWeight: 400, fill: c.mg, anchor: 'end' }),
  ].join('');

  // Divider line
  const divY = pad + Math.max(logo.height || 40, 50) + 20;
  const divider = `<rect x="${pad}" y="${divY}" width="${W - pad * 2}" height="1" fill="${c.p}" opacity="0.3"/>`;

  // Body placeholder lines
  let bodyContent = '';
  const bodyY = divY + 50;
  const lineWidths = [0.85, 0.92, 0.78, 0.88, 0.65, 0, 0.90, 0.82, 0.75, 0.88, 0.60];
  lineWidths.forEach((w, i) => {
    if (w === 0) return;
    const lw = (W - pad * 2) * w;
    bodyContent += `<rect x="${pad}" y="${bodyY + i * 18}" width="${lw}" height="6" rx="3" fill="${c.mg}" opacity="0.15"/>`;
  });

  // Footer
  const footerY = H - 40;
  const footer = [
    svgText(`www.${copy.name.toLowerCase().replace(/\s+/g, '')}.com`, W / 2, footerY, { fontFamily: font, fontSize: 8, fontWeight: 400, fill: c.mg, anchor: 'middle' }),
    `<rect x="${pad}" y="${footerY - 12}" width="${W - pad * 2}" height="0.5" fill="${c.mg}" opacity="0.2"/>`,
  ].join('');

  const inner = `${logo.element}${infoContent}${divider}${bodyContent}${footer}`;
  return wrapSvg(inner, W, H, { bgColor: c.wh, fontStyle });
}

// ── Envelope ────────────────────────────────────────────────────────────────

export function generateEnvelope(project) {
  const W = 975, H = 450;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);
  const pad = 50;

  // Logo top-left
  const logo = embedLogo(project, 'primary', 'full_color_light', pad, pad, 100);

  // Return address below logo
  const addrY = pad + (logo.height || 40) + 16;
  const returnAddr = [
    svgText(copy.name, pad, addrY, { fontFamily: font, fontSize: 11, fontWeight: 600, fill: c.nb }),
    svgText('123 Business Street', pad, addrY + 18, { fontFamily: font, fontSize: 10, fontWeight: 400, fill: c.mg }),
    svgText('City, State 12345', pad, addrY + 33, { fontFamily: font, fontSize: 10, fontWeight: 400, fill: c.mg }),
  ].join('');

  // Mailing address area (center-right)
  const mailX = W * 0.5;
  const mailY = H * 0.45;
  const mailAddr = [
    `<rect x="${mailX}" y="${mailY}" width="260" height="10" rx="5" fill="${c.mg}" opacity="0.2"/>`,
    `<rect x="${mailX}" y="${mailY + 22}" width="220" height="10" rx="5" fill="${c.mg}" opacity="0.2"/>`,
    `<rect x="${mailX}" y="${mailY + 44}" width="180" height="10" rx="5" fill="${c.mg}" opacity="0.2"/>`,
  ].join('');

  // Stamp placeholder
  const stamp = `<rect x="${W - pad - 60}" y="${pad}" width="60" height="70" rx="4" fill="${c.lg}" stroke="${c.mg}" stroke-width="0.5" stroke-dasharray="3 2"/>`;

  // Accent line bottom
  const accent = `<rect x="0" y="${H - 4}" width="${W}" height="4" fill="${c.p}"/>`;

  const inner = `${logo.element}${returnAddr}${mailAddr}${stamp}${accent}`;
  return wrapSvg(inner, W, H, { bgColor: c.wh, fontStyle });
}

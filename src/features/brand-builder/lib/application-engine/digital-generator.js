/**
 * Digital mockup generators: email signature, social profiles/covers, OG image, zoom bg.
 * All return pure SVG strings (or HTML for email signature).
 */
import {
  wrapSvg, embedLogo, buildFontStyle, getFontFamily, getLogoSvg,
  getColors, getCopy, buildPatternDef, buildGradientDef, escapeXml, svgText, svgTextWrap,
} from './helpers.js';

// ── Email Signature HTML ────────────────────────────────────────────────────

export function generateEmailSignatureHtml(project) {
  const c = getColors(project);
  const copy = getCopy(project);
  const avatarSvg = getLogoSvg(project, 'social_avatar', 'full_color_light');
  const avatarDataUri = avatarSvg
    ? `data:image/svg+xml,${encodeURIComponent(avatarSvg)}`
    : '';

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${c.nb};line-height:1.4;">
  <tr>
    <td style="padding-right:16px;vertical-align:top;">
      ${avatarDataUri ? `<img src="${escapeXml(avatarDataUri)}" width="64" height="64" alt="${escapeXml(copy.name)}" style="border-radius:50%;display:block;" />` : ''}
    </td>
    <td style="vertical-align:top;">
      <strong style="font-size:14px;color:${c.nb};">Your Name</strong><br/>
      <span style="font-size:12px;color:${c.mg};">Job Title</span><br/>
      <span style="font-size:12px;color:${c.mg};">${escapeXml(copy.name)}</span>
      <br/>
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
        <tr><td style="border-top:2px solid ${c.p};padding-top:8px;">
          <span style="font-size:12px;color:${c.mg};">+1 (555) 123-4567</span><br/>
          <a href="mailto:hello@${copy.name.toLowerCase().replace(/\s+/g, '')}.com" style="font-size:12px;color:${c.p};text-decoration:none;">hello@${copy.name.toLowerCase().replace(/\s+/g, '')}.com</a><br/>
          <a href="#" style="font-size:12px;color:${c.p};text-decoration:none;">www.${copy.name.toLowerCase().replace(/\s+/g, '')}.com</a>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`;
}

// ── Email Signature Assets ──────────────────────────────────────────────────

export function generateEmailSignatureAssets(project) {
  const svg = getLogoSvg(project, 'social_avatar', 'full_color_light');
  return svg ? [svg] : [];
}

// ── Social Profiles ─────────────────────────────────────────────────────────

const PLATFORMS = ['linkedin', 'twitter', 'instagram', 'facebook'];

export function generateSocialProfiles(project) {
  const c = getColors(project);
  const result = {};
  for (const platform of PLATFORMS) {
    result[platform] = generateSocialProfile(project, c);
  }
  return result;
}

function generateSocialProfile(project, c) {
  const S = 400;
  const logo = embedLogo(project, 'social_avatar', 'full_color_light', 0, 0, 200);
  const logoX = (S - 200) / 2;
  const logoY = (S - (logo.height || 200)) / 2;
  const centeredLogo = embedLogo(project, 'social_avatar', 'full_color_light', logoX, logoY, 200);

  const inner = `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="${c.wh}"/><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 4}" fill="${c.wh}" stroke="${c.p}" stroke-width="4"/>${centeredLogo.element}`;
  return wrapSvg(inner, S, S, {});
}

// ── Social Covers ───────────────────────────────────────────────────────────

const COVER_DIMS = {
  linkedin: { w: 1584, h: 396 },
  twitter: { w: 1500, h: 500 },
  facebook: { w: 820, h: 312 },
};

export function generateSocialCovers(project) {
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);
  const result = {};

  for (const [platform, dims] of Object.entries(COVER_DIMS)) {
    const { w, h } = dims;
    const gradDef = buildGradientDef('cover-grad', c.p, c.s, 135);
    const defs = `<defs>${gradDef}</defs>`;

    // Pattern overlay
    const pattern = buildPatternDef(project, `cover-pattern-${platform}`, 0.06);
    const patternDefs = pattern ? pattern.def : '';
    const patternFill = pattern ? pattern.fill : '';

    // Logo centered
    const logoW = Math.min(w * 0.25, 300);
    const logo = embedLogo(project, 'wordmark', 'mono_white', (w - logoW) / 2, h * 0.3, logoW);

    // Tagline below logo
    const tagline = copy.tagline
      ? svgText(copy.tagline, w / 2, h * 0.3 + (logo.height || 40) + 20, {
          fontFamily: font, fontSize: Math.max(16, w * 0.014), fontWeight: 400,
          fill: '#ffffff', anchor: 'middle', opacity: 0.8,
        })
      : '';

    const inner = `<rect width="${w}" height="${h}" fill="url(#cover-grad)"/>${patternFill}${logo.element}${tagline}`;
    result[platform] = wrapSvg(inner, w, h, { fontStyle, defs: defs + patternDefs });
  }

  return result;
}

// ── Social Post Template ────────────────────────────────────────────────────

export function generateSocialPostTemplate(project) {
  const S = 1080;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);
  const pad = 80;

  // Pattern overlay
  const pattern = buildPatternDef(project, 'post-pattern', 0.06);
  const defs = pattern ? pattern.def : '';
  const patternFill = pattern ? pattern.fill : '';

  // Company name overline
  const overline = svgText(copy.name.toUpperCase(), pad, pad, {
    fontFamily: font, fontSize: 14, fontWeight: 600, fill: '#ffffff', opacity: 0.6, letterSpacing: '0.15em',
  });

  // Quote / post text
  const postText = svgTextWrap(
    typeof copy.socialPost === 'string' ? copy.socialPost : 'Discover something remarkable.',
    pad, S * 0.35, S - pad * 2,
    { fontFamily: font, fontSize: 36, fontWeight: 700, fill: '#ffffff', lineHeight: 1.3 }
  );

  // Logo bottom-right
  const logo = embedLogo(project, 'submark', 'mono_white', S - pad - 60, S - pad - 60, 60);

  // Accent line
  const accent = `<rect x="${pad}" y="${S * 0.32}" width="60" height="3" rx="1.5" fill="${c.a}"/>`;

  const inner = `${patternFill}${overline}${accent}${postText}${logo.element}`;
  return wrapSvg(inner, S, S, { bgColor: c.p, fontStyle, defs });
}

// ── OG Image ────────────────────────────────────────────────────────────────

export function generateOgImage(project) {
  const W = 1200, H = 630;
  const c = getColors(project);
  const copy = getCopy(project);
  const font = getFontFamily(project);
  const fontStyle = buildFontStyle(project);

  const gradDef = buildGradientDef('og-grad', c.p, c.pd || c.s, 135);
  const defs = `<defs>${gradDef}</defs>`;

  // Pattern
  const pattern = buildPatternDef(project, 'og-pattern', 0.05);
  const patternDefs = pattern ? pattern.def : '';
  const patternFill = pattern ? pattern.fill : '';

  // Logo left
  const logo = embedLogo(project, 'primary', 'mono_white', 80, (H - 60) / 2, 140);

  // Text right
  const textX = 300;
  const nameEl = svgText(copy.name, textX, H * 0.35, {
    fontFamily: font, fontSize: 48, fontWeight: 700, fill: '#ffffff',
  });
  const taglineEl = copy.tagline
    ? svgText(copy.tagline, textX, H * 0.35 + 64, {
        fontFamily: font, fontSize: 22, fontWeight: 400, fill: '#ffffff', opacity: 0.8,
      })
    : '';

  // Accent line
  const accent = `<rect x="${textX}" y="${H * 0.35 + (copy.tagline ? 100 : 60)}" width="60" height="3" rx="1.5" fill="${c.a}"/>`;

  const inner = `<rect width="${W}" height="${H}" fill="url(#og-grad)"/>${patternFill}${logo.element}${nameEl}${taglineEl}${accent}`;
  return wrapSvg(inner, W, H, { fontStyle, defs: defs + patternDefs });
}

// ── Zoom Background ─────────────────────────────────────────────────────────

export function generateZoomBackground(project) {
  const W = 1920, H = 1080;
  const c = getColors(project);
  const fontStyle = buildFontStyle(project);

  // Pattern overlay
  const pattern = buildPatternDef(project, 'zoom-pattern', 0.04);
  const defs = pattern ? pattern.def : '';
  const patternFill = pattern ? pattern.fill : '';

  // Logo bottom-right
  const logo = embedLogo(project, 'primary', 'full_color_dark', W - 280, H - 120, 200);

  // Subtle accent corner top-left
  const accent = `<rect x="0" y="0" width="4" height="200" fill="${c.p}" opacity="0.3"/>`;

  const inner = `${patternFill}${logo.element}${accent}`;
  return wrapSvg(inner, W, H, { bgColor: c.nb, fontStyle, defs });
}

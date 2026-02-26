/**
 * Application engine barrel export + buildAllApplications orchestrator.
 */
export {
  extractSvgContent, wrapSvg, embedLogo, getLogoSvg,
  buildFontStyle, getFontFamily, getColors, getCopy,
  buildPatternDef, buildGradientDef, escapeXml, svgText, svgTextWrap,
} from './helpers.js';

export {
  generateBusinessCardFront, generateBusinessCardBack,
  generateLetterhead, generateEnvelope,
} from './stationery-generator.js';

export {
  generateEmailSignatureHtml, generateEmailSignatureAssets,
  generateSocialProfiles, generateSocialCovers,
  generateSocialPostTemplate, generateOgImage, generateZoomBackground,
} from './digital-generator.js';

export { generateSlides } from './presentation-generator.js';

export {
  generateDesktopMockup, generateMobileMockup,
} from './website-generator.js';

// ── Build All Applications ──────────────────────────────────────────────────

import { generateBusinessCardFront, generateBusinessCardBack, generateLetterhead, generateEnvelope } from './stationery-generator.js';
import { generateEmailSignatureHtml, generateEmailSignatureAssets, generateSocialProfiles, generateSocialCovers, generateSocialPostTemplate, generateOgImage, generateZoomBackground } from './digital-generator.js';
import { generateSlides } from './presentation-generator.js';
import { generateDesktopMockup, generateMobileMockup } from './website-generator.js';

/**
 * Generate all application mockups from the project data.
 * Returns a complete Applications schema object.
 */
export function buildAllApplications(project) {
  return {
    stationery: {
      business_card_front: generateBusinessCardFront(project),
      business_card_back: generateBusinessCardBack(project),
      letterhead: generateLetterhead(project),
      envelope: generateEnvelope(project),
    },
    digital: {
      email_signature_html: generateEmailSignatureHtml(project),
      email_signature_assets: generateEmailSignatureAssets(project),
      social_profiles: generateSocialProfiles(project),
      social_covers: generateSocialCovers(project),
      social_post_templates: [generateSocialPostTemplate(project)],
      og_image: generateOgImage(project),
      zoom_background: generateZoomBackground(project),
    },
    presentation: generateSlides(project),
    website_mockup: {
      html: null,
      screenshot_desktop: generateDesktopMockup(project),
      screenshot_mobile: generateMobileMockup(project),
    },
  };
}

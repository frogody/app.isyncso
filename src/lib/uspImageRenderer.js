// ─────────────────────────────────────────────────────────────────
// USP Image Prompt Builder — generates detailed prompts for
// NanoBanana Pro to create professional USP infographic images
// ─────────────────────────────────────────────────────────────────

// ── USP Template Types ──

export const USP_TEMPLATES = [
  {
    id: 'feature_grid',
    label: 'Feature Grid',
    description: 'Product image on left, key features listed on the right with icons',
  },
  {
    id: 'specs_callout',
    label: 'Specs Callout',
    description: 'Product centered with labeled specifications around it',
  },
  {
    id: 'benefit_highlight',
    label: 'Benefit Highlight',
    description: 'Bold headline with the product\'s primary benefit, product image large',
  },
  {
    id: 'multi_feature',
    label: 'Multi-Feature',
    description: 'Product centered with 4 feature callouts in the corners',
  },
];

// ── Build USP prompt for a specific template ──

function buildFeatureGridPrompt({ productIdentity, productDesc, features, brandName }) {
  return [
    `Create a professional e-commerce USP infographic image for ${productIdentity}.`,
    productDesc ? `Product description: ${productDesc.substring(0, 200)}.` : '',
    `The product must look EXACTLY like the reference image(s) — preserve every detail of shape, color, material, branding, and proportions.`,
    ``,
    `DESIGN LAYOUT:`,
    `- Dark navy blue gradient background (#0f172a to #1e293b)`,
    `- LEFT SIDE: Product photograph, large and prominent, centered vertically with dramatic studio lighting and a subtle drop shadow`,
    `- RIGHT SIDE: ${features.length} key feature items stacked vertically, each with a small modern icon and bold white text label`,
    features.length > 0 ? `- Features to highlight:\n${features.map((f, i) => `  ${i + 1}. ${typeof f === 'string' ? f : f.title || f}`).join('\n')}` : '',
    `- Each feature icon should be in a rounded square badge with a subtle cyan/blue tint`,
    `- Feature text in clean white sans-serif font, bold titles with lighter description below`,
    brandName ? `- Brand name "${brandName}" subtly placed below the product in uppercase tracking letters` : '',
    ``,
    `STYLE: Premium Amazon/bol.com product listing infographic. Clean, modern, professional e-commerce graphic design. Think high-end marketplace A+ content.`,
    `The text must be perfectly readable, crisp, and professional — this is a graphic design, not a photograph.`,
    `NO watermarks, NO AI artifacts, NO garbled text.`,
  ].filter(Boolean).join('\n');
}

function buildSpecsCalloutPrompt({ productIdentity, productDesc, features, headline }) {
  return [
    `Create a professional e-commerce specifications callout infographic for ${productIdentity}.`,
    productDesc ? `Product description: ${productDesc.substring(0, 200)}.` : '',
    `The product must look EXACTLY like the reference image(s) — preserve every detail.`,
    ``,
    `DESIGN LAYOUT:`,
    `- Dark blue-black background with subtle radial gradient`,
    headline ? `- Bold headline "${headline}" centered at the top in large white text` : '',
    `- Product image centered in the middle of the frame, large and clear`,
    `- ${Math.ceil(features.length / 2)} specification labels on the LEFT side, connected to the product with thin lines or dots`,
    `- ${Math.floor(features.length / 2)} specification labels on the RIGHT side, similarly connected`,
    features.length > 0 ? `- Specifications to show:\n${features.map((f, i) => `  ${i + 1}. ${typeof f === 'string' ? f : f.title || f}`).join('\n')}` : '',
    `- Each spec label has a small glowing accent dot and clean white text`,
    `- Subtle circular glow behind the product for depth`,
    ``,
    `STYLE: Technical product specification sheet meets premium design. Like Apple or Dyson product marketing materials. Clean modern typography, dark premium background.`,
    `NO watermarks, NO AI artifacts. Readable text is critical.`,
  ].filter(Boolean).join('\n');
}

function buildBenefitHighlightPrompt({ productIdentity, productDesc, headline, description, brandName }) {
  return [
    `Create a professional e-commerce benefit highlight infographic for ${productIdentity}.`,
    productDesc ? `Product description: ${productDesc.substring(0, 200)}.` : '',
    `The product must look EXACTLY like the reference image(s) — preserve every detail.`,
    ``,
    `DESIGN LAYOUT:`,
    `- Dark navy gradient background with a subtle accent color stripe at the top edge`,
    brandName ? `- Small brand name "${brandName}" in cyan accent color, uppercase letters, top-left area` : '',
    headline ? `- Large bold headline "${headline}" in white text, positioned in the top third of the image` : '',
    description ? `- Supporting subtitle "${description}" in lighter gray text below the headline` : '',
    `- Product image taking up the lower two-thirds of the frame, large and centered, with dramatic drop shadow`,
    `- Overall composition: bold typography at top, premium product showcase below`,
    `- Subtle gradient accent line at the very bottom`,
    ``,
    `STYLE: Hero banner for an e-commerce listing. Bold, impactful, drives desire to purchase. Premium brand feel, dark and sophisticated.`,
    `NO watermarks, NO AI artifacts.`,
  ].filter(Boolean).join('\n');
}

function buildMultiFeaturePrompt({ productIdentity, productDesc, features, headline, tagline }) {
  return [
    `Create a professional e-commerce multi-feature showcase infographic for ${productIdentity}.`,
    productDesc ? `Product description: ${productDesc.substring(0, 200)}.` : '',
    `The product must look EXACTLY like the reference image(s) — preserve every detail.`,
    ``,
    `DESIGN LAYOUT:`,
    `- Dark navy background with subtle concentric circle decorative elements`,
    headline ? `- Headline "${headline}" centered at the top in bold white text` : '',
    tagline ? `- Tagline "${tagline}" below headline in cyan/accent color` : '',
    `- Product image in the center of the frame, medium-large size`,
    `- FOUR feature callouts positioned in the four corners of the image:`,
    features.slice(0, 4).map((f, i) => {
      const corner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'][i];
      return `  - ${corner.toUpperCase()}: "${typeof f === 'string' ? f : f.title || f}" with a modern icon in a rounded badge`;
    }).join('\n'),
    `- Each feature has an icon badge (rounded square, subtle blue/cyan tint) with bold white title text below`,
    `- Visual hierarchy: product is the hero, features support from the periphery`,
    ``,
    `STYLE: Premium marketplace product showcase. Like a bol.com or Amazon A+ content image. Clean, professional, trustworthy.`,
    `NO watermarks, NO AI artifacts. Text must be clean and readable.`,
  ].filter(Boolean).join('\n');
}

// ── Map template IDs to prompt builders ──

const PROMPT_BUILDERS = {
  feature_grid: buildFeatureGridPrompt,
  specs_callout: buildSpecsCalloutPrompt,
  benefit_highlight: buildBenefitHighlightPrompt,
  multi_feature: buildMultiFeaturePrompt,
};

// ── Build a USP prompt for a given template ──

export function buildUSPPrompt(templateId, data) {
  const builder = PROMPT_BUILDERS[templateId];
  if (!builder) throw new Error(`Unknown USP template: ${templateId}`);
  return builder(data);
}

// ── Build a full set of USP prompts for a product ──

export function buildUSPPromptSet({
  productName,
  productBrand,
  productDescription,
  bulletPoints = [],
  shortTagline,
}) {
  const productIdentity = `${productBrand ? productBrand + ' ' : ''}${productName}`.trim();

  // Parse bullet points into feature objects
  const features = bulletPoints.map((bp) => {
    const match = bp.match(/^(.+?)\s*[-–—:]\s*(.+)$/);
    if (match) return { title: match[1].trim(), description: match[2].trim() };
    const words = bp.split(/\s+/);
    if (words.length > 6) return { title: words.slice(0, 6).join(' '), description: bp };
    return { title: bp, description: '' };
  });

  const sharedData = {
    productIdentity,
    productDesc: productDescription,
    features,
    brandName: productBrand,
    headline: productName,
    tagline: shortTagline,
    description: shortTagline || features[0]?.description || '',
  };

  return [
    {
      templateId: 'feature_grid',
      label: 'Feature Grid',
      prompt: buildFeatureGridPrompt({ ...sharedData, headline: `Why Choose ${productName}?` }),
    },
    {
      templateId: 'specs_callout',
      label: 'Specs Callout',
      prompt: buildSpecsCalloutPrompt(sharedData),
    },
    {
      templateId: 'benefit_highlight',
      label: 'Benefit Highlight',
      prompt: buildBenefitHighlightPrompt({
        ...sharedData,
        headline: features[0]?.title || `Premium ${productName}`,
        description: features[0]?.description || shortTagline || '',
      }),
    },
    {
      templateId: 'multi_feature',
      label: 'Multi-Feature',
      prompt: buildMultiFeaturePrompt(sharedData),
    },
  ];
}

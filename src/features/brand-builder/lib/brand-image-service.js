/**
 * Brand Image Service
 * Thin wrapper around the generate-image edge function for Brand Builder.
 * Uses Nano Banana Pro (Google Gemini image gen) for all brand visuals.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Generate a brand image via Nano Banana Pro.
 *
 * @param {Object} opts
 * @param {string} opts.prompt - The image generation prompt
 * @param {string} [opts.category] - Category for logging: 'logo' | 'mockup-business-card' | 'mockup-letterhead' | 'mockup-social' | 'mockup-website' | 'photography-example' | 'illustration-example'
 * @param {number} [opts.width=1024]
 * @param {number} [opts.height=1024]
 * @param {string} [opts.userId]
 * @param {string} [opts.companyId]
 * @returns {Promise<{ url: string, model: string }>}
 */
export async function generateBrandImage({
  prompt,
  category = 'brand-asset',
  width = 1024,
  height = 1024,
  userId,
  companyId,
}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      model_key: 'nano-banana-pro',
      use_case: category,
      width,
      height,
      user_id: userId,
      company_id: companyId,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Image generation failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return { url: data.url, model: data.model || 'nano-banana-pro' };
}

/**
 * Build a high-quality logo generation prompt from brand context.
 * Uses all 5 personality vector dimensions for nuanced style direction.
 */
export function buildLogoPrompt({ companyName, industry, personalityVector, primaryColor, secondaryColor, fontFamily, conceptHint, variation, tagline }) {
  const pv = personalityVector || [50, 50, 50, 50, 50];

  // Map all 5 personality dimensions to visual characteristics
  // [0] Modern↔Traditional, [1] Bold↔Refined, [2] Playful↔Serious, [3] Warm↔Cool, [4] Complex↔Simple
  const era = pv[0] > 65 ? 'contemporary minimalist' : pv[0] < 35 ? 'classic heritage' : 'timeless';
  const weight = pv[1] > 65 ? 'bold and confident with strong geometric forms' : pv[1] < 35 ? 'refined and elegant with delicate details' : 'balanced weight';
  const mood = pv[2] > 65 ? 'friendly and approachable' : pv[2] < 35 ? 'authoritative and trustworthy' : 'professional yet approachable';
  const warmth = pv[3] > 65 ? 'organic, rounded shapes with warmth' : pv[3] < 35 ? 'precise, angular geometry with cool sophistication' : 'harmonious proportions';
  const complexity = pv[4] > 65 ? 'intricate and detailed' : pv[4] < 35 ? 'ultra-minimal and reductive' : 'clean and purposeful';

  const parts = [
    `Design a world-class professional logo for "${companyName}", a ${industry || 'business'} company.`,
    ``,
    `DESIGN DIRECTION:`,
    `- Visual era: ${era}`,
    `- Character: ${weight}`,
    `- Personality: ${mood}`,
    `- Form language: ${warmth}`,
    `- Detail level: ${complexity}`,
    ``,
    `COLOR SPECIFICATION:`,
    `- Primary brand color: ${primaryColor || '#000000'}`,
    `- Secondary accent: ${secondaryColor || '#666666'}`,
    `- Use these exact colors. The logo must work in these brand colors.`,
    ``,
    `LOGO TYPE: ${variation || 'Creative logo concept'}.`,
  ];

  if (fontFamily) {
    parts.push(`TYPOGRAPHY: The lettering should feel like ${fontFamily} — match that typographic character.`);
  }

  if (tagline) {
    parts.push(`TAGLINE: "${tagline}" — incorporate subtly below the main mark if appropriate.`);
  }

  if (conceptHint) {
    parts.push(`CONCEPT DIRECTION: ${conceptHint}.`);
  }

  parts.push(
    ``,
    `QUALITY REQUIREMENTS:`,
    `- This must look like it was designed by a top-tier branding agency (Pentagram, Wolff Olins, Landor level quality).`,
    `- Clean vector-style rendering, mathematically precise geometry, perfect symmetry where appropriate.`,
    `- Render on a pure white background (#FFFFFF). Show ONLY the logo — nothing else.`,
    `- The logo must be immediately recognizable, memorable, and scalable from favicon to billboard.`,
    `- Professional kerning and letterspacing if text is included.`,
    ``,
    `AVOID: Clipart, stock imagery, gradients unless integral to concept, drop shadows, bevels, 3D effects, overly complex illustrations, generic symbols (globes, arrows, checkmarks), busy backgrounds, multiple logo variations in one image, watermarks, mockup contexts, amateurish proportions.`,
  );

  return parts.join('\n');
}

/**
 * Build an application mockup prompt from brand context.
 */
export function buildMockupPrompt({ type, companyName, primaryColor, secondaryColor, fontFamily, tagline }) {
  const base = {
    'business-card': `Professional business card mockup on dark marble surface. Brand: "${companyName}". Primary color: ${primaryColor}. Secondary: ${secondaryColor}. Font style: ${fontFamily || 'sans-serif'}. ${tagline ? `Tagline: "${tagline}".` : ''} Photorealistic product photography, shallow depth of field, soft studio lighting. Show front of card angled on surface.`,
    'letterhead': `Professional A4 letterhead mockup on a clean desk. Brand: "${companyName}". Header uses ${primaryColor} accent color. Clean minimal design with ${fontFamily || 'sans-serif'} typography. Photorealistic flat-lay, soft natural lighting.`,
    'social-media': `Instagram social media post mockup displayed on phone screen. Brand: "${companyName}". Color palette: ${primaryColor} and ${secondaryColor}. Modern branded content post. Photorealistic device mockup, soft background blur.`,
    'website': `Modern website landing page for "${companyName}". Hero section with ${primaryColor} gradient accents. ${fontFamily || 'Sans-serif'} headings. Clean contemporary design. Displayed on desktop monitor mockup, photorealistic.`,
  };

  return base[type] || base['business-card'];
}

/**
 * Build a photography example prompt from photography guidelines.
 */
export function buildPhotographyPrompt({ mood, lighting, composition, colorTreatment, subjects, variation }) {
  let prompt = `Professional brand photography example.`;
  if (mood) prompt += ` Mood: ${mood}.`;
  if (lighting) prompt += ` Lighting: ${lighting}.`;
  if (composition) prompt += ` Composition: ${composition}.`;
  if (colorTreatment) prompt += ` Color treatment: ${colorTreatment}.`;
  if (subjects) prompt += ` Subject: ${subjects}.`;
  if (variation) prompt += ` ${variation}.`;
  prompt += ` High-quality professional photograph, editorial quality.`;
  return prompt;
}

/**
 * Build an illustration example prompt from illustration guidelines.
 */
export function buildIllustrationPrompt({ style, lineWeight, colorUsage, complexity, brandColors, variation }) {
  let prompt = `Brand illustration example in ${style || 'flat'} style.`;
  if (lineWeight) prompt += ` ${lineWeight} line weight.`;
  if (colorUsage && brandColors) prompt += ` ${colorUsage} color scheme using ${brandColors}.`;
  if (complexity) prompt += ` ${complexity} level of detail.`;
  if (variation) prompt += ` Subject: ${variation}.`;
  prompt += ` Clean professional illustration suitable for brand guidelines.`;
  return prompt;
}

/**
 * Generate multiple brand images in parallel with error handling.
 * Returns array of results, with null for failed generations.
 */
export async function generateBrandImages(requests) {
  const results = await Promise.allSettled(
    requests.map((req) => generateBrandImage(req))
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.error(`[brand-image-service] Generation ${i} failed:`, r.reason);
    return null;
  });
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

// =============================================================================
// MATERIAL & SURFACE DETECTION (expanded from 4 to 12 categories)
// =============================================================================

type MaterialCategory =
  | 'jewelry' | 'gemstone' | 'luxury' | 'glass'
  | 'textile' | 'leather' | 'wood' | 'ceramic'
  | 'electronics' | 'food' | 'paper' | 'plastic'
  | 'metal' | 'standard';

type SurfaceFinish = 'glossy' | 'matte' | 'brushed' | 'textured' | 'transparent' | 'reflective' | 'mixed';

interface PhysicalProfile {
  material: MaterialCategory;
  surface: SurfaceFinish;
  sizeCategory: 'micro' | 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
  cameraRecommendation: string;
  lightingSetup: string;
  compositionHint: string;
  colorInteraction: string;
  avoidList: string[];
}

function detectMaterial(
  name?: string, description?: string, tags?: string[], category?: string,
  specifications?: any[], attributes?: any[]
): MaterialCategory {
  const signals = [
    name, description, tags?.join(' '), category,
    specifications?.map((s: any) => `${s.name} ${s.value}`).join(' '),
    attributes?.map((a: any) => `${a.key} ${a.value}`).join(' ')
  ].filter(Boolean).join(' ').toLowerCase();

  // Priority order: most specific first
  if (/\b(ring|necklace|bracelet|earring|pendant|brooch|bangle|anklet|tiara|cufflink|gold\s|silver\s|platinum|18k|14k|925|sterling|karat|carat|jewel)/i.test(signals)) return 'jewelry';
  if (/\b(diamond|sapphire|ruby|emerald|pearl|opal|topaz|amethyst|gemstone|gem\b|brilliant.cut|facet)/i.test(signals)) return 'gemstone';
  if (/\b(leather|suede|nubuck|calfskin|lambskin|cowhide|crocodile|alligator|patent\s*leather)/i.test(signals)) return 'leather';
  if (/\b(cotton|silk|wool|linen|cashmere|polyester|nylon|denim|tweed|chiffon|satin|velvet|fabric|textile|knit|woven|embroid)/i.test(signals)) return 'textile';
  if (/\b(ceramic|porcelain|stoneware|earthenware|pottery|terracotta|enamel|glazed)/i.test(signals)) return 'ceramic';
  if (/\b(wood|bamboo|oak|walnut|maple|teak|mahogany|pine|birch|plywood|timber|carved\s*wood)/i.test(signals)) return 'wood';
  if (/\b(glass|crystal|bottle|perfume|fragrance|vase|transparent|translucent|blown\s*glass)/i.test(signals)) return 'glass';
  if (/\b(phone|laptop|tablet|screen|led|circuit|electronic|gadget|headphone|speaker|earbuds|charger|cable|usb|monitor|keyboard|mouse)/i.test(signals)) return 'electronics';
  if (/\b(food|chocolate|coffee|tea|wine|cheese|bread|cake|pastry|fruit|vegetable|spice|sauce|organic|gourmet|edible)/i.test(signals)) return 'food';
  if (/\b(paper|cardboard|stationery|notebook|journal|envelope|origami|card\s*stock)/i.test(signals)) return 'paper';
  if (/\b(plastic|acrylic|polycarbonate|silicone|rubber|vinyl|resin|3d.print)/i.test(signals)) return 'plastic';
  if (/\b(steel|iron|aluminum|copper|brass|bronze|titanium|chrome|stainless|alloy|metal)/i.test(signals)) return 'metal';
  if (/\b(watch|timepiece|luxury|premium|haute|couture|designer|handcrafted|swarovski)/i.test(signals)) return 'luxury';
  return 'standard';
}

function detectSurface(
  material: MaterialCategory, name?: string, description?: string,
  specifications?: any[], attributes?: any[]
): SurfaceFinish {
  const signals = [
    name, description,
    specifications?.map((s: any) => `${s.name} ${s.value}`).join(' '),
    attributes?.map((a: any) => `${a.key} ${a.value}`).join(' ')
  ].filter(Boolean).join(' ').toLowerCase();

  if (/\b(glossy|polished|shiny|mirror|lacquer|gloss|glazed|patent)\b/.test(signals)) return 'glossy';
  if (/\b(matte|mat\b|satin|frosted|flat\s*finish|powder.coat)\b/.test(signals)) return 'matte';
  if (/\b(brushed|sanded|wire.brush|hairline)\b/.test(signals)) return 'brushed';
  if (/\b(textured|embossed|engraved|carved|grain|ribbed|knurled|rough)\b/.test(signals)) return 'textured';
  if (/\b(transparent|translucent|see.through|clear)\b/.test(signals)) return 'transparent';

  // Infer from material when not stated
  const materialDefaults: Record<MaterialCategory, SurfaceFinish> = {
    jewelry: 'reflective', gemstone: 'reflective', luxury: 'glossy', glass: 'transparent',
    leather: 'textured', textile: 'textured', wood: 'textured', ceramic: 'glossy',
    electronics: 'mixed', food: 'matte', paper: 'matte', plastic: 'glossy',
    metal: 'reflective', standard: 'mixed'
  };
  return materialDefaults[material] || 'mixed';
}

// =============================================================================
// PHYSICAL PROFILE BUILDER — infers how a product should be photographed
// =============================================================================

function buildPhysicalProfile(
  material: MaterialCategory,
  surface: SurfaceFinish,
  sizeScale?: { label: string; cm: string; desc: string },
  specifications?: any[],
  shipping?: any
): PhysicalProfile {
  // Determine size from scale selector, specs, or shipping weight
  let sizeCategory: PhysicalProfile['sizeCategory'] = 'medium';
  if (sizeScale) {
    const sizeMap: Record<string, PhysicalProfile['sizeCategory']> = {
      'Tiny': 'tiny', 'Small': 'small', 'Hand-sized': 'medium',
      'Forearm': 'medium', 'Large': 'large', 'Very Large': 'xlarge'
    };
    sizeCategory = sizeMap[sizeScale.label] || 'medium';
  } else if (shipping?.weight) {
    const w = parseFloat(shipping.weight);
    if (w < 0.05) sizeCategory = 'tiny';
    else if (w < 0.3) sizeCategory = 'small';
    else if (w < 2) sizeCategory = 'medium';
    else if (w < 10) sizeCategory = 'large';
    else sizeCategory = 'xlarge';
  }
  // Jewelry is always tiny/small regardless
  if (material === 'jewelry' || material === 'gemstone') {
    if (sizeCategory === 'medium' || sizeCategory === 'large' || sizeCategory === 'xlarge') {
      sizeCategory = 'tiny';
    }
  }

  // Camera recommendation based on size
  const cameraMap: Record<string, string> = {
    micro: 'extreme macro lens 1:1 magnification, f/8-f/11, focus stacking, tripod-mounted',
    tiny: 'macro lens 100mm, f/8-f/16, focus stacking for depth, close-up detail',
    small: 'macro to portrait lens 85-100mm, f/5.6-f/11, shallow-to-medium DOF, tabletop setup',
    medium: 'standard lens 50-85mm, f/4-f/8, product fills 60-80% of frame',
    large: 'wide-to-standard lens 35-50mm, f/5.6-f/11, full product with context',
    xlarge: 'wide angle 24-35mm, f/8-f/11, environmental product shot, room context'
  };

  // Lighting based on material + surface
  const lightingMap: Record<MaterialCategory, Record<SurfaceFinish, string>> = {
    jewelry: {
      reflective: 'tent lighting with gradient panels, black card flagging for specular control, soft box from above at 45deg, focus stacking',
      glossy: 'large soft box overhead, black cards on sides to shape metal reflections, backlight for rim separation',
      matte: 'broad soft light, minimal specular, even coverage',
      brushed: 'directional soft box at 30deg to reveal brush direction, black card flagging',
      textured: 'side-raking light at 15-20deg to reveal engraving/texture, soft fill opposite',
      transparent: 'backlit with dark field technique for gemstone translucency',
      mixed: 'tent lighting with gradient panels, soft box diffusion'
    },
    gemstone: {
      reflective: 'dark field illumination, fiber optic spot on facets, backlit for fire and brilliance',
      glossy: 'dark field illumination, backlit for translucency',
      matte: 'soft overhead light with backlight for translucency',
      brushed: 'directional light to reveal surface',
      textured: 'side light for raw stone texture',
      transparent: 'backlit for translucency and internal fire, fiber optic spot on facets',
      mixed: 'dark field with backlight for fire'
    },
    glass: {
      transparent: 'bright field OR dark field technique, rim light defining edges, backlit for clarity, gradient background',
      reflective: 'tent lighting, careful angle to control reflections',
      glossy: 'large area soft light, rim light for edge definition',
      matte: 'frosted glass: side light to reveal surface texture',
      brushed: 'directional light across brushed surface',
      textured: 'side-raking light for surface detail',
      mixed: 'bright field base with rim accents'
    },
    leather: {
      textured: 'large soft box at 60-70deg angle to reveal grain texture, warm color temperature 3800K',
      matte: 'broad soft light showing material quality without harsh reflections',
      glossy: 'controlled soft box with careful specular placement showing leather sheen',
      reflective: 'soft box with careful angle for patent leather shine',
      brushed: 'directional light to show suede nap direction',
      transparent: 'standard soft lighting',
      mixed: 'large soft box at 60deg, warm tone'
    },
    textile: {
      textured: 'large diffused source at 45-60deg to reveal weave pattern and drape, warm ambient fill',
      matte: 'broad even lighting showing fabric color accuracy',
      glossy: 'soft box placement showing silk/satin sheen and drape',
      reflective: 'careful specular control for metallic fabrics',
      brushed: 'side light revealing knit/weave texture',
      transparent: 'backlit for sheer fabrics showing weave structure',
      mixed: 'large diffused soft box at 45deg'
    },
    wood: {
      textured: 'side-raking warm light (3200-3800K) at 20-30deg to reveal wood grain, amber fill light',
      matte: 'broad warm soft light showing grain without glare',
      glossy: 'controlled reflections on lacquered surface, large soft source',
      reflective: 'large soft box overhead for varnished surfaces',
      brushed: 'directional warm light across brush marks',
      transparent: 'standard warm lighting',
      mixed: 'warm side-raking light at 25deg'
    },
    ceramic: {
      glossy: 'large soft box overhead, black cards preventing double reflections on curved glazed surfaces',
      matte: 'broad soft light showing clay texture and color',
      textured: 'side-raking light for unglazed texture detail',
      reflective: 'tent lighting for highly glazed surfaces',
      brushed: 'directional light for surface marks',
      transparent: 'backlit for thin translucent porcelain',
      mixed: 'large soft box with fill'
    },
    electronics: {
      glossy: 'large polarized soft box reducing screen/surface glare, edge accent lights for shape definition',
      matte: 'even soft lighting showing product form',
      reflective: 'polarized light to control screen reflections, rim lights for edge definition',
      textured: 'side light for textured surfaces like speaker grilles',
      brushed: 'angled light to reveal brushed aluminum finish',
      transparent: 'standard soft lighting',
      mixed: 'polarized soft box overhead, accent rim lights, screen-appropriate brightness'
    },
    food: {
      matte: 'large window light simulation from side at 30deg, backlight for steam/steam effect, warm color temperature',
      glossy: 'controlled highlights showing freshness and moisture',
      textured: 'side light revealing crust/surface texture',
      reflective: 'soft highlights on sauces and glazes',
      brushed: 'standard food lighting',
      transparent: 'backlit for drinks and clear liquids',
      mixed: 'window-style side light with warm backlight'
    },
    paper: {
      matte: 'broad soft overhead light for even color, slight side angle for paper texture',
      textured: 'raking light at 15deg for embossing and paper grain',
      glossy: 'careful angle to avoid glare on coated paper',
      reflective: 'polarized to reduce foil stamping glare',
      brushed: 'directional light for surface',
      transparent: 'backlit for translucent papers',
      mixed: 'broad soft overhead light'
    },
    plastic: {
      glossy: 'large soft box with polarizer, careful specular placement, edge lights for shape',
      matte: 'even soft light showing form and color accuracy',
      textured: 'side-raking light for surface detail',
      reflective: 'tent lighting for mirror-like plastics',
      brushed: 'directional light for surface treatment',
      transparent: 'bright field technique, rim light defining edges',
      mixed: 'soft box with edge accent lights'
    },
    metal: {
      reflective: 'tent lighting with gradient panels, black card flagging, controlled specular highlights',
      brushed: 'directional light at 30deg angle to reveal brush direction, black cards opposite',
      glossy: 'large soft source with carefully placed black cards',
      matte: 'broad even light, minimal specular control needed',
      textured: 'side-raking light for forged/hammered texture',
      transparent: 'standard soft lighting',
      mixed: 'tent lighting with gradient panels'
    },
    luxury: {
      glossy: 'controlled reflections, dramatic key light with rich shadows, black negative fill',
      matte: 'even soft light with dramatic shadows, aspirational mood',
      reflective: 'tent lighting with gradient panels, black card flagging',
      textured: 'side light revealing craftsmanship detail',
      brushed: 'directional light for surface finish',
      transparent: 'backlit with rim accents',
      mixed: 'dramatic key light with controlled fill'
    },
    standard: {
      glossy: 'soft box overhead with fill', matte: 'broad even lighting',
      reflective: 'soft box with black cards', textured: 'side light for detail',
      brushed: 'directional soft light', transparent: 'backlit with rim light',
      mixed: 'standard three-point lighting setup'
    }
  };

  // Composition hints based on size
  const compositionMap: Record<string, string> = {
    micro: 'extreme close-up filling frame, minimal negative space, possibly on fingertip for scale',
    tiny: 'close-up with controlled negative space, possibly with hand or small prop for scale reference',
    small: 'centered subject with elegant negative space, rule-of-thirds for lifestyle, tight crop for detail',
    medium: 'product occupies 60-70% of frame, balanced negative space, environmental props at edges',
    large: 'product centered with room to breathe, environmental context, lifestyle staging',
    xlarge: 'wide environmental shot, product in situ, room/space context'
  };

  // Color interaction with light based on surface
  const colorInteractionMap: Record<SurfaceFinish, string> = {
    glossy: 'specular highlights should be tight and bright, color saturation high between highlights',
    matte: 'even color rendering without hot spots, subtle gradient transitions',
    brushed: 'linear highlight streaks following brush direction, color visible in diffuse areas',
    textured: 'light catches surface peaks creating micro-highlights, shadows in recesses add depth',
    transparent: 'light passes through revealing internal color, caustic patterns on surface below',
    reflective: 'mirror-like surface reflects environment, product color visible in diffuse angle only',
    mixed: 'varied surface responses, balanced lighting to serve all areas'
  };

  const lighting = lightingMap[material]?.[surface] || lightingMap.standard[surface] || 'standard three-point lighting';

  return {
    material,
    surface,
    sizeCategory,
    cameraRecommendation: cameraMap[sizeCategory] || cameraMap.medium,
    lightingSetup: lighting,
    compositionHint: compositionMap[sizeCategory] || compositionMap.medium,
    colorInteraction: colorInteractionMap[surface] || colorInteractionMap.mixed,
    avoidList: buildAvoidList(material, surface)
  };
}

function buildAvoidList(material: MaterialCategory, surface: SurfaceFinish): string[] {
  const common = ['blurry', 'low quality', 'distorted proportions', 'unnatural colors'];
  const materialAvoids: Record<MaterialCategory, string[]> = {
    jewelry: ['fingerprints', 'dust on metal', 'color cast on metals', 'blown-out highlights', 'oversized jewelry', 'unrealistic proportions', 'disproportionate scale relative to human body'],
    gemstone: ['fingerprints', 'dust', 'color cast', 'flat facets without fire', 'dead stones without light play'],
    glass: ['fingerprints', 'smudges', 'solid-looking glass', 'missing transparency'],
    leather: ['plastic-looking leather', 'unnaturally uniform texture', 'wrong grain pattern'],
    textile: ['stiff rigid fabric', 'missing drape and fold', 'unnaturally smooth fabric', 'wrong weave pattern'],
    wood: ['plastic-looking wood', 'missing grain detail', 'unnaturally uniform color'],
    ceramic: ['plastic-looking glaze', 'missing surface texture', 'unnaturally perfect surface'],
    electronics: ['screen glare obscuring display', 'visible fingerprints on screens', 'wrong LED colors'],
    food: ['unappetizing color', 'artificial-looking food', 'wrong texture', 'melted/spoiled appearance'],
    paper: ['curling edges', 'visible dust', 'washed-out colors'],
    plastic: ['cheap appearance', 'visible mold lines', 'uneven color'],
    metal: ['fingerprints', 'dust', 'color cast', 'blown-out reflections'],
    luxury: ['cheap appearance', 'flat lighting', 'cluttered background', 'casual/unprofessional staging'],
    standard: []
  };
  const surfaceAvoids: Record<SurfaceFinish, string[]> = {
    glossy: ['flat matte appearance', 'missing reflections', 'dull surface'],
    matte: ['unwanted specular highlights', 'glossy appearance'],
    brushed: ['wrong brush direction', 'missing linear highlights'],
    textured: ['smooth untextured surface', 'missing detail'],
    transparent: ['opaque appearance', 'missing see-through quality'],
    reflective: ['dull non-reflective surface', 'missing specular highlights'],
    mixed: []
  };
  return [...common, ...(materialAvoids[material] || []), ...(surfaceAvoids[surface] || [])];
}

// =============================================================================
// SYSTEM PROMPT — dramatically more detailed
// =============================================================================

const SYSTEM_PROMPT = `You are a world-class commercial product photographer and AI image prompt engineer. You understand materials, lighting physics, composition, and how different products interact with light.

YOUR JOB: Transform a user's simple prompt into a highly detailed, technically precise prompt that will produce stunning, commercially viable product images.

CRITICAL RULES:
1. Keep the user's core creative intent — enhance, don't override
2. Use SPECIFIC professional photography terminology (not vague terms like "nice lighting")
3. Max 250 words for the enhanced prompt — dense with visual information
4. Never mention brand names unless the user explicitly did
5. Output ONLY valid JSON

PRODUCT PHOTOGRAPHY EXPERTISE:
When given a product physical profile, use it precisely:
- CAMERA: Use the recommended focal length and aperture
- LIGHTING: Follow the lighting setup — it's based on the product's material and surface
- COMPOSITION: Follow the size-appropriate composition guidance
- SURFACE: Describe how light should interact with this specific surface finish
- AVOID: Incorporate the avoid list as things that must NOT appear

REFERENCE IMAGE MODE (when has_reference_image = true):
The product appearance is LOCKED from the reference image. Your prompt must focus ENTIRELY on:
- Scene/environment/setting description
- Lighting mood and atmosphere
- Background and surrounding elements
- Camera angle and framing
- DO NOT describe the product's physical appearance (color, shape, material) — it comes from the reference
- DO describe how the product should be positioned/oriented in the scene

TEXT-TO-IMAGE MODE (when has_reference_image = false):
You must describe BOTH the product AND the scene:
- Product physical appearance, material, surface quality
- Scene, background, lighting, atmosphere
- Composition and camera angle

NEGATIVE PROMPT INTEGRATION:
Generate a negative_prompt listing things to avoid. Also weave the most critical avoidances into the main prompt as explicit "no X, no Y" instructions — image models respond to in-prompt negation.

OUTPUT FORMAT (JSON):
{
  "enhanced_prompt": "The fully enhanced prompt text with all technical details",
  "style_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "negative_prompt": "comprehensive list of things to avoid",
  "composition_notes": "brief explanation of composition choices"
}`;

// =============================================================================
// MATERIAL-SPECIFIC POST-PROCESSING (deterministic, style-aware)
// =============================================================================

interface MaterialTreatment {
  suffix: string;
  negative: string;
  background?: string;
}

function getMaterialTreatment(
  profile: PhysicalProfile,
  style: string | undefined,
  isFullTreatment: boolean
): MaterialTreatment {
  const { material, surface } = profile;
  if (material === 'standard') return { suffix: '', negative: '' };

  // Full treatment: specific backgrounds + all photography terms
  if (isFullTreatment) {
    const treatments: Record<string, MaterialTreatment> = {
      jewelry: {
        suffix: `, ${profile.lightingSetup}, ${profile.cameraRecommendation}, polished mirror finish, realistic jewelry scale and proportions, true-to-life size relative to human body, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', '),
        background: 'deep black velvet background'
      },
      gemstone: {
        suffix: `, ${profile.lightingSetup}, ${profile.cameraRecommendation}, brilliant-cut facet reflections with internal fire and scintillation, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', '),
        background: 'deep black background'
      },
      glass: {
        suffix: `, ${profile.lightingSetup}, caustic light patterns on surface below, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', '),
        background: 'gradient background transitioning dark to medium'
      },
      leather: {
        suffix: `, ${profile.lightingSetup}, visible grain texture and material quality, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', '),
        background: 'dark complementary backdrop'
      },
      textile: {
        suffix: `, ${profile.lightingSetup}, natural drape and fold showing fabric quality, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', ')
      },
      wood: {
        suffix: `, ${profile.lightingSetup}, visible wood grain and natural character, warm tones, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', ')
      },
      ceramic: {
        suffix: `, ${profile.lightingSetup}, visible glaze quality and form, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', ')
      },
      electronics: {
        suffix: `, ${profile.lightingSetup}, clean product form, screen content visible without glare, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', ')
      },
      food: {
        suffix: `, ${profile.lightingSetup}, appetizing presentation, natural steam/moisture, fresh appearance, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', ')
      },
      metal: {
        suffix: `, ${profile.lightingSetup}, controlled specular highlights defining form, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', '),
        background: 'dark gradient backdrop'
      },
      luxury: {
        suffix: `, ${profile.lightingSetup}, editorial high-end feel, ultra-sharp commercial quality, aspirational aesthetic, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', '),
        background: 'dark sophisticated backdrop'
      },
      plastic: {
        suffix: `, ${profile.lightingSetup}, clean product form, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', ')
      },
      paper: {
        suffix: `, ${profile.lightingSetup}, ${profile.colorInteraction}`,
        negative: profile.avoidList.join(', ')
      }
    };
    return treatments[material] || { suffix: '', negative: profile.avoidList.join(', ') };
  }

  // Light treatment: material-accurate rendering without background override
  return {
    suffix: `, ${profile.colorInteraction}, sharp detail, commercial product quality`,
    negative: profile.avoidList.slice(0, 6).join(', ')
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      use_case,
      style,
      product_name,
      product_type,
      product_description,
      product_tags,
      product_category,
      brand_mood,
      has_reference_image,
      product_size_scale,
      // NEW: rich physical product data
      product_specifications,
      product_attributes,
      product_shipping,
      product_colors,
      product_materials_text,
    } = await req.json();

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: Build Physical Profile ──────────────────────────
    const material = detectMaterial(
      product_name, product_description, product_tags, product_category,
      product_specifications, product_attributes
    );
    const surface = detectSurface(
      material, product_name, product_description,
      product_specifications, product_attributes
    );
    const profile = buildPhysicalProfile(
      material, surface, product_size_scale,
      product_specifications, product_shipping
    );

    // ── Step 2: Build rich context for LLM ─────────────────────
    let userMessage = `Transform this prompt for AI image generation:\n\n"${prompt}"`;
    const context: string[] = [];

    // Use case
    if (use_case) {
      const useCaseDescriptions: Record<string, string> = {
        'product_variation': 'Product photography — the EXACT product is preserved from a reference image. Only the background, environment, and lighting change. Do NOT describe the product itself.',
        'product_scene': 'Lifestyle product photography — product preserved from reference image, placed in a real-world scene. Focus prompt on the SCENE and ATMOSPHERE.',
        'marketing_creative': 'Marketing/advertising imagery — describe both product and scene for text-to-image generation',
        'quick_draft': 'Quick concept visualization — clear and direct prompt',
        'premium_quality': 'Ultra high-end commercial photography — maximum detail and quality'
      };
      context.push(`USE CASE: ${useCaseDescriptions[use_case] || use_case}`);
    }

    // Style
    if (style) {
      const styleDescriptions: Record<string, string> = {
        'photorealistic': 'Ultra-realistic photograph, professional studio or location photography',
        'cinematic': 'Cinematic movie still, dramatic lighting, anamorphic lens feel, depth of field',
        'illustration': 'Artistic illustration, clean lines, vibrant colors',
        '3d_render': '3D rendered scene, octane/blender quality, volumetric lighting, PBR materials',
        'minimalist': 'Clean minimalist, lots of negative space, essential elements only',
        'vintage': 'Vintage/retro, film grain, muted warm tones, nostalgic',
        'watercolor': 'Watercolor painting, soft edges, color bleeding, paper texture',
        'digital_art': 'Digital art, concept art quality, detailed, artstation-level',
        'luxury': 'High-end luxury product photography — dark sophisticated backdrop, controlled reflections, dramatic lighting, aspirational premium aesthetic, editorial quality'
      };
      context.push(`STYLE: ${styleDescriptions[style] || style}`);
    }

    // Product context — now much richer
    if (product_name) {
      let productInfo = `PRODUCT: "${product_name}" (${product_type || 'physical'} product)`;
      if (product_description) productInfo += `\n  Description: ${product_description}`;
      if (product_tags?.length) productInfo += `\n  Tags: ${product_tags.join(', ')}`;
      if (product_category) productInfo += `\n  Category: ${product_category}`;
      if (product_materials_text) productInfo += `\n  Materials: ${product_materials_text}`;
      if (product_colors) productInfo += `\n  Product Colors: ${product_colors}`;
      context.push(productInfo);

      // Specifications
      if (product_specifications?.length) {
        const specText = product_specifications
          .map((s: any) => `${s.name}: ${s.value}${s.unit ? ' ' + s.unit : ''}`)
          .join(', ');
        context.push(`SPECIFICATIONS: ${specText}`);
      }

      // Attributes
      if (product_attributes?.length) {
        const attrText = product_attributes
          .map((a: any) => `${a.key}: ${a.value}`)
          .join(', ');
        context.push(`ATTRIBUTES: ${attrText}`);
      }
    }

    // Physical profile — the key improvement
    context.push(`PHYSICAL PROFILE (use these photography settings):
  Material: ${profile.material} (${profile.surface} finish)
  Size: ${profile.sizeCategory}
  Camera: ${profile.cameraRecommendation}
  Lighting: ${profile.lightingSetup}
  Composition: ${profile.compositionHint}
  Light Interaction: ${profile.colorInteraction}
  MUST AVOID: ${profile.avoidList.slice(0, 8).join(', ')}`);

    // Brand mood
    if (brand_mood) {
      context.push(`BRAND ATMOSPHERE: ${brand_mood}`);
    }

    // Reference image handling
    if (has_reference_image) {
      context.push(`REFERENCE IMAGE PROVIDED: The product's appearance is locked from the reference image. Your prompt must describe ONLY the scene, environment, lighting, background, and atmosphere. Do NOT describe the product's color, shape, material, or physical features — those come from the reference image. Instead describe WHERE the product is, WHAT surrounds it, and HOW light falls on the scene.`);
    }

    // Size reference
    if (product_size_scale) {
      context.push(`REAL-WORLD SIZE: "${product_size_scale.label}" (${product_size_scale.cm}). ${product_size_scale.desc}. The product MUST appear at this realistic scale relative to hands, surfaces, or objects in the scene.`);
    }

    // Jewelry-specific size rules
    if (material === 'jewelry' || material === 'gemstone') {
      const jewelrySignals = [prompt, product_name, product_description, product_tags?.join(' ')].filter(Boolean).join(' ').toLowerCase();
      let sizeGuidance = 'JEWELRY SCALE: Must be at realistic actual size.';
      if (/\bearring/i.test(jewelrySignals)) sizeGuidance += ' Earrings: 1-3cm, proportional to human ear.';
      else if (/\bring\b/i.test(jewelrySignals)) sizeGuidance += ' Rings: finger-sized, NEVER larger.';
      else if (/\bnecklace|pendant|chain\b/i.test(jewelrySignals)) sizeGuidance += ' Pendant: 1-4cm, chain drapes naturally.';
      else if (/\bbracelet|bangle|cuff\b/i.test(jewelrySignals)) sizeGuidance += ' Bracelet: wrist-sized, 6-8cm diameter.';
      else if (/\bbrooch\b/i.test(jewelrySignals)) sizeGuidance += ' Brooch: 3-6cm pin.';

      const isLuxuryStyle = style === 'luxury';
      if (isLuxuryStyle) {
        context.push(`JEWELRY + LUXURY STYLE: MUST use dark/black background, macro detail, controlled specular highlights, focus stacking, gradient lighting on metal. NEVER white or neutral backgrounds. ${sizeGuidance}`);
      } else {
        context.push(`JEWELRY PRODUCT: Sharp detail and controlled reflections. Follow selected style for background. ${sizeGuidance}`);
      }
    }

    if (context.length > 0) {
      userMessage += `\n\nContext:\n${context.map(c => `- ${c}`).join('\n')}`;
    }

    // ── Step 3: Call LLM ────────────────────────────────────────
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.65,
        max_tokens: 700,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Together.ai API error:', errText);
      return new Response(
        JSON.stringify({
          enhanced_prompt: prompt,
          style_tags: [style || 'photorealistic'],
          negative_prompt: profile.avoidList.join(', '),
          composition_notes: profile.compositionHint,
          physical_profile: profile,
          fallback: true,
          debug_error: errText.slice(0, 200)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let enhanced;
    try {
      enhanced = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enhanced = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    // ── Step 4: Deterministic post-processing ───────────────────
    let finalPrompt = enhanced.enhanced_prompt || prompt;
    let finalNegative = enhanced.negative_prompt || '';

    const isFullTreatment = style === 'luxury' || !style;
    const treatment = getMaterialTreatment(profile, style, isFullTreatment);

    if (material !== 'standard') {
      if (isFullTreatment && treatment.background) {
        // Force appropriate background for luxury/default style
        finalPrompt = finalPrompt.replace(
          /\b(white|neutral|light|bright|clean)\s+(background|backdrop|surface)\b/gi,
          treatment.background
        );
      } else if (!isFullTreatment) {
        // Undo forced dark backgrounds when user chose a non-luxury style
        finalPrompt = finalPrompt.replace(
          /\b(dark|black|deep black|velvet)\s+(background|backdrop|surface)\b/gi,
          'clean studio background'
        );
        finalPrompt = finalPrompt.replace(/dark,?\s*gradient\s+background/gi, 'clean studio background');
      }

      finalPrompt += treatment.suffix;

      if (treatment.negative) {
        finalNegative = finalNegative ? `${finalNegative}, ${treatment.negative}` : treatment.negative;
      }
    }

    // Weave critical negatives into the prompt (FLUX responds to in-prompt negation)
    const criticalNegatives = profile.avoidList.slice(0, 3);
    if (criticalNegatives.length > 0) {
      const negationClause = criticalNegatives.map(n => `no ${n}`).join(', ');
      if (!finalPrompt.toLowerCase().includes(negationClause.slice(0, 20).toLowerCase())) {
        finalPrompt += `, ${negationClause}`;
      }
    }

    return new Response(
      JSON.stringify({
        enhanced_prompt: finalPrompt,
        style_tags: enhanced.style_tags || [],
        negative_prompt: finalNegative,
        composition_notes: enhanced.composition_notes || '',
        original_prompt: prompt,
        detected_material: material,
        detected_surface: surface,
        physical_profile: {
          material: profile.material,
          surface: profile.surface,
          sizeCategory: profile.sizeCategory,
          camera: profile.cameraRecommendation,
          lighting: profile.lightingSetup,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        enhanced_prompt: null,
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const FAL_KEY = Deno.env.get("FAL_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Model configurations ────────────────────────────────────────────
// Steps cranked up for quality: pro=40, dev/kontext=32, schnell stays 4
const MODELS: Record<string, { id: string; requiresImage: boolean; costPerMp: number; steps: number }> = {
  'flux-kontext': {
    id: 'black-forest-labs/FLUX.1-Kontext-dev',
    requiresImage: true,
    costPerMp: 0.025,
    steps: 32
  },
  'flux-kontext-pro': {
    id: 'black-forest-labs/FLUX.1-Kontext-pro',
    requiresImage: true,
    costPerMp: 0.04,
    steps: 40
  },
  'flux-dev': {
    id: 'black-forest-labs/FLUX.1-dev',
    requiresImage: false,
    costPerMp: 0.025,
    steps: 32
  },
  'flux-schnell': {
    id: 'black-forest-labs/FLUX.1-schnell',
    requiresImage: false,
    costPerMp: 0.0027,
    steps: 4
  },
  'flux-pro': {
    id: 'black-forest-labs/FLUX.1.1-pro',
    requiresImage: false,
    costPerMp: 0.04,
    steps: 40
  },
  'flux-kontext-max': {
    id: 'black-forest-labs/FLUX.1-kontext-max',
    requiresImage: true,
    costPerMp: 0.08,
    steps: 40
  }
};

// ─── Use-case → model routing ────────────────────────────────────────
// Default quality: flux-pro everywhere except quick_draft
const USE_CASE_MODELS: Record<string, string> = {
  'product_variation': 'flux-kontext-pro',
  'product_scene': 'flux-kontext-pro',
  'marketing_creative': 'flux-pro',
  'quick_draft': 'flux-schnell',
  'premium_quality': 'flux-pro',
  'product_quick': 'flux-kontext',
  'draft': 'flux-dev',
  'fashion_tryon': 'flux-kontext-pro',
  'fashion_lookbook': 'flux-kontext-pro',
};

// ─── Quality prefix injected into EVERY prompt ───────────────────────
const QUALITY_PREFIX = 'Ultra high resolution professional photograph, 8K detail, sharp focus throughout, masterful lighting, commercial quality output';

// ─── Supabase helpers ────────────────────────────────────────────────
async function supabaseInsert(table: string, data: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase insert error: ${err}`);
  }
}

async function uploadToStorage(
  bucket: string,
  fileName: string,
  data: Uint8Array,
  contentType: string
): Promise<{ publicUrl: string }> {
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
    },
    body: data,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Storage upload error: ${err}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
  return { publicUrl };
}

// ─── Product category detection ──────────────────────────────────────
function detectProductCategory(productContext: any, prompt: string, isFashion?: boolean): 'jewelry' | 'luxury' | 'glass' | 'food' | 'textile' | 'fashion' | 'standard' {
  if (isFashion) return 'fashion';

  const signals = [
    productContext?.name, productContext?.description, productContext?.short_description,
    productContext?.tags?.join(' '), productContext?.category, prompt
  ].filter(Boolean).join(' ').toLowerCase();

  if (/\b(ring|necklace|bracelet|earring|pendant|brooch|diamond|gold|silver|platinum|gemstone|sapphire|ruby|emerald|pearl|18k|14k|925|sterling|carat|karat|jewel)\b/.test(signals)) return 'jewelry';
  if (/\b(watch|timepiece|luxury|premium|haute|couture|designer|handcrafted|crystal|swarovski)\b/.test(signals)) return 'luxury';
  if (/\b(glass|crystal|bottle|perfume|fragrance|vase|transparent|translucent)\b/.test(signals)) return 'glass';
  if (/\b(food|chocolate|cake|coffee|tea|wine|cheese|bread|organic|gourmet|culinary)\b/.test(signals)) return 'food';
  if (/\b(dress|shirt|jacket|pants|skirt|blouse|coat|sweater|hoodie|jeans|sneaker|boot|heel|sandal|t-shirt|trousers|fashion|garment|apparel|outfit|wear|clothing|fabric|textile|cotton|silk|linen|wool|leather|suede|denim|cashmere|polyester)\b/.test(signals)) return 'fashion';
  if (/\b(fabric|textile)\b/.test(signals)) return 'textile';
  return 'standard';
}

// ─── Build the final generation prompt ───────────────────────────────
// This is the FALLBACK when enhance-prompt was already called upstream.
// It takes whatever prompt came in and wraps it with quality directives.
function buildFinalPrompt(
  userPrompt: string,
  brandContext: any,
  productContext: any,
  style?: string,
  negativePrompt?: string
): string {
  const parts: string[] = [QUALITY_PREFIX];

  // Core user prompt
  parts.push(userPrompt);

  // Brand context
  if (brandContext?.colors?.primary) {
    parts.push(`Brand palette: ${brandContext.colors.primary}${brandContext.colors.secondary ? ', ' + brandContext.colors.secondary : ''}`);
  }
  if (brandContext?.visual_style?.mood) {
    parts.push(`Brand aesthetic: ${brandContext.visual_style.mood}`);
  }

  // Product context
  if (productContext) {
    const productName = productContext.name || productContext.product_name || '';
    if (productName && !userPrompt.toLowerCase().includes(productName.toLowerCase())) {
      parts.push(`Product: ${productName}`);
    }
  }

  // Size scale
  if (productContext?.product_size_scale) {
    const s = productContext.product_size_scale;
    parts.push(`Shown at realistic ${s.label.toLowerCase()} scale (${s.cm}), ${s.desc}`);
  }

  // Category-specific photography technique
  const category = detectProductCategory(productContext, userPrompt);
  const categoryDirectives: Record<string, string> = {
    jewelry: 'Jewelry product photography: controlled specular highlights on metal, macro detail with focus stacking, gradient lighting, dark background, no color cast on metals, realistic jewelry proportions and scale',
    luxury: 'Premium luxury photography: dramatic controlled lighting, rich shadows, elegant negative space, aspirational aesthetic, ultra-sharp detail',
    glass: 'Transparent product photography: rim lighting defining edges, gradient background, backlit material clarity, caustic light patterns',
    food: 'Food photography: appetizing warm tones, shallow depth of field, natural light feel, fresh ingredients visible, steam or texture detail',
    textile: 'Textile photography: fabric texture visible, natural draping, accurate color reproduction, soft directional lighting showing weave',
    fashion: 'Fashion photography: preserve exact garment design, fabric texture, color fidelity, stitching details, and pattern from reference. Professional fashion model pose, editorial lighting, Vogue-quality composition, natural body proportions, fabric draping realistically on the body',
    standard: 'Professional product photography: clean lighting, accurate colors, sharp detail throughout'
  };
  parts.push(categoryDirectives[category]);

  // Style application
  if (style && style !== 'photorealistic') {
    const styleMap: Record<string, string> = {
      cinematic: 'Cinematic film still look, dramatic lighting, shallow depth of field, color graded',
      illustration: 'Artistic illustration style, clean lines, stylized rendering',
      '3d_render': '3D rendered with physically-based materials, global illumination, ray traced reflections',
      minimalist: 'Clean minimalist composition, maximum negative space, single focal point',
      vintage: 'Vintage film aesthetic, warm muted tones, subtle grain, nostalgic atmosphere',
      luxury: 'Dark sophisticated backdrop, controlled reflections, dramatic lighting, aspirational premium aesthetic'
    };
    if (styleMap[style]) parts.push(styleMap[style]);
  }

  // Incorporate negative prompt as avoidance directives (FLUX doesn't have negative_prompt param)
  const negatives = negativePrompt || getDefaultNegatives(category);
  if (negatives) {
    parts.push(`Absolutely avoid: ${negatives}`);
  }

  return parts.join('. ') + '.';
}

function getDefaultNegatives(category: string): string {
  const categoryNegatives: Record<string, string> = {
    jewelry: 'blurry, low quality, oversized jewelry, unrealistic proportions, fingerprints, dust, color cast on metals, blown-out highlights, flat lighting, distorted, watermark',
    luxury: 'blurry, low quality, cheap appearance, flat lighting, cluttered background, distorted, watermark',
    glass: 'blurry, low quality, fingerprints, smudges, flat lighting, distorted, watermark',
    food: 'blurry, low quality, unappetizing colors, artificial looking, distorted, watermark',
    textile: 'blurry, low quality, wrinkled messily, inaccurate colors, distorted, watermark',
    fashion: 'blurry, low quality, distorted body proportions, unnatural pose, wrong garment color, missing garment details, deformed hands, deformed face, extra fingers, mutated limbs, watermark, amateur lighting, flat lighting, wrinkled messily',
    standard: 'blurry, low quality, distorted, deformed, watermark, text overlay, amateur lighting, noisy, grainy'
  };
  return categoryNegatives[category] || categoryNegatives.standard;
}

// ─── Together.ai image generation ────────────────────────────────────
async function generateWithTogether(
  modelConfig: { id: string; requiresImage: boolean; costPerMp: number; steps: number },
  prompt: string | null,
  referenceImageUrl: string | null,
  width: number,
  height: number
): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }> {
  if (!TOGETHER_API_KEY) {
    return { success: false, error: 'No Together API key configured' };
  }

  try {
    const requestBody: any = {
      model: modelConfig.id,
      width,
      height,
      steps: modelConfig.steps,
      n: 1,
      response_format: 'b64_json'
    };

    if (modelConfig.requiresImage) {
      if (!referenceImageUrl) {
        return { success: false, error: `Model ${modelConfig.id} requires a reference image` };
      }
      requestBody.image_url = referenceImageUrl;
      if (prompt) {
        requestBody.prompt = prompt;
      }
    } else {
      if (!prompt) {
        return { success: false, error: 'Prompt is required for text-to-image generation' };
      }
      requestBody.prompt = prompt;
    }

    console.log(`Generating with ${modelConfig.id} (${modelConfig.steps} steps)...`);

    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Together.ai error:', errText);
      return { success: false, error: `Together.ai API error: ${errText}` };
    }

    const data = await response.json();
    if (data.data?.[0]?.b64_json) {
      return {
        success: true,
        data: data.data[0].b64_json,
        mimeType: 'image/png'
      };
    }

    return { success: false, error: 'No image data in response' };
  } catch (e: any) {
    console.error('Together.ai exception:', e.message);
    return { success: false, error: e.message };
  }
}

// ─── FAL.ai FASHN Virtual Try-On V1.6 ────────────────────────────────
// Purpose-built model: takes a person image + garment image → outputs person wearing garment.
// 864×1296 resolution, preserves garment text/patterns/details accurately.
const SCENE_PROMPT_MAP: Record<string, string> = {
  studio_white: '',
  studio_dark: 'a dark moody black studio backdrop with dramatic directional lighting',
  studio_grey: 'a neutral grey seamless paper studio backdrop',
  urban_street: 'a city street with modern architecture and natural daylight',
  urban_alley: 'a gritty industrial alleyway with textured brick walls',
  nature_outdoor: 'lush greenery and natural outdoor setting with soft dappled light',
  golden_hour: 'warm golden hour sunset backlighting with soft warm tones',
  cafe_interior: 'a cozy modern cafe interior with warm ambient lighting',
  luxury_interior: 'a high-end luxury hotel lobby or designer lounge interior',
  beach: 'a sandy beach with ocean waves in the background and bright natural light',
  rooftop: 'an urban rooftop with a dramatic city skyline in the background',
  runway: 'a fashion show runway with dramatic spotlighting and audience blur',
  abstract_gradient: 'a soft abstract gradient background with smooth color transitions',
};

async function generateWithFalTryOn(
  personImageUrl: string,
  garmentImageUrl: string,
  garmentDescription?: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  if (!FAL_KEY) return { success: false, error: 'No FAL API key configured' };

  try {
    console.log('FASHN V1.6 try-on: person + garment composite...');

    const response = await fetch('https://fal.run/fal-ai/fashn/tryon/v1.6', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_image: personImageUrl,
        garment_image: garmentImageUrl,
        category: 'auto',
        mode: 'quality',
        garment_photo_type: 'auto',
        num_samples: 1,
        output_format: 'png',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('FASHN V1.6 error:', errText);
      return { success: false, error: `FASHN try-on error: ${errText}` };
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url || data.image?.url;

    if (imageUrl) {
      return { success: true, imageUrl };
    }

    return { success: false, error: 'No image in FASHN response' };
  } catch (e: any) {
    console.error('FASHN exception:', e.message);
    return { success: false, error: e.message };
  }
}

// Download an image from a URL and return as Uint8Array
async function downloadImage(url: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/png';
    return { data: new Uint8Array(arrayBuffer), mimeType };
  } catch {
    return null;
  }
}

// ─── Server-side pose/framing/angle labels for prompt construction ───
const POSE_PRESETS_SERVER: Record<string, string> = {
  standing_front: 'standing front-facing, relaxed posture',
  standing_3q: 'standing at a three-quarter angle toward camera',
  standing_side: 'standing in full side profile',
  standing_back: 'facing away from camera',
  walking_casual: 'walking casually mid-stride',
  walking_confident: 'walking with a confident runway stride',
  walking_street: 'walking relaxed on a street',
  sitting_casual: 'sitting casually on a stool',
  sitting_cross: 'sitting with legs crossed',
  sitting_lean: 'sitting and leaning back casually',
  pose_hand_hip: 'standing with one hand on hip',
  pose_arms_crossed: 'standing with arms crossed',
  pose_hands_pockets: 'standing with hands in pockets',
  pose_looking_away: 'looking to the side',
  pose_over_shoulder: 'looking back over their shoulder',
  pose_dynamic: 'in a dynamic mid-movement pose',
  pose_editorial: 'in a high-fashion editorial pose',
  pose_lean_wall: 'leaning against a wall',
  pose_crouch: 'crouching low',
  pose_jump: 'mid-air jumping',
};

const FRAMING_SERVER: Record<string, string> = {
  full_body: 'full body head to toe',
  three_quarter: 'three-quarter body, head to mid-thigh',
  upper_body: 'upper body, head to waist',
  close_up: 'close-up detail shot',
  mid_shot: 'mid shot, waist up',
  extreme_close: 'extreme close-up of fabric texture',
};

const ANGLE_SERVER: Record<string, string> = {
  eye_level: 'eye level, straight on',
  low_angle: 'low angle looking up, dramatic',
  high_angle: 'high angle looking down',
  dutch_angle: 'dutch angle, tilted and dynamic',
  birds_eye: 'top-down bird\'s eye view',
  worms_eye: 'extreme low worm\'s eye angle',
  three_quarter_low: 'three-quarter low angle',
  profile_angle: 'side profile, 90 degrees from front',
};

// ─── Gemini fallback ─────────────────────────────────────────────────
async function tryGemini(prompt: string): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }> {
  if (!GOOGLE_API_KEY) return { success: false, error: 'No Google API key' };

  try {
    console.log('Trying Gemini fallback...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["image", "text"] }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      if (errText.includes('not available in your country')) {
        return { success: false, error: 'Gemini geo-restricted' };
      }
      return { success: false, error: `Gemini error: ${errText}` };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          return {
            success: true,
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          };
        }
      }
    }
    return { success: false, error: 'No image in Gemini response' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Main handler ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      model_key,
      use_case,
      reference_image_url,
      prompt,
      original_prompt,
      style,
      aspect_ratio,
      brand_context,
      product_context,
      product_images,
      is_physical_product,
      is_fashion,
      fashion_booth,
      fashion_model_preset,
      fashion_pose,
      fashion_framing,
      fashion_angle,
      fashion_scene,
      fashion_avatar_url,
      composite_reference_url,
      negative_prompt,
      prompt_enhanced = false,
      width = 1024,
      height = 1024,
      company_id,
      user_id,
    } = await req.json();

    // ── Model selection ──────────────────────────────────────────────
    let selectedModelKey = model_key;

    if (use_case && USE_CASE_MODELS[use_case]) {
      selectedModelKey = USE_CASE_MODELS[use_case];
    }

    const hasProductImages = product_images?.length > 0 || reference_image_url;
    if (!selectedModelKey && (is_physical_product || product_context?.type === 'physical') && hasProductImages) {
      selectedModelKey = 'flux-kontext-pro'; // Upgraded: was flux-kontext
    }

    // Default model: flux-pro (was flux-dev — the #1 quality killer)
    if (!selectedModelKey) {
      selectedModelKey = 'flux-pro';
    }

    const modelConfig = MODELS[selectedModelKey];
    if (!modelConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${selectedModelKey}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refImageUrl = reference_image_url || (product_images?.length > 0 ? product_images[0] : null);

    if (modelConfig.requiresImage && !refImageUrl) {
      return new Response(
        JSON.stringify({
          error: 'Reference image required',
          details: `Model ${selectedModelKey} requires a reference image for product preservation`,
          suggestion: 'Select a product with images or upload a reference image'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Fashion Booth: Kontext Max with avatar as reference ─────────
    // Send the AVATAR photo as the image reference so Kontext preserves identity.
    // Describe the garment change + pose + scene in the text prompt.
    // Kontext edits the avatar photo: keeps face/body, changes outfit + pose + scene.
    if (fashion_booth && fashion_avatar_url) {
      console.log('Fashion Booth: Avatar as reference → Kontext Max (identity-preserving edit)');

      const pose = fashion_pose ? POSE_PRESETS_SERVER[fashion_pose] || fashion_pose : 'standing naturally';
      const framing = fashion_framing ? FRAMING_SERVER[fashion_framing] || fashion_framing : 'full body';
      const angle = fashion_angle ? ANGLE_SERVER[fashion_angle] || fashion_angle : 'eye level';
      const sceneDesc = fashion_scene && SCENE_PROMPT_MAP[fashion_scene]
        ? SCENE_PROMPT_MAP[fashion_scene]
        : 'a clean white studio backdrop';

      // Build garment description from product name + any user additions
      const garmentName = (prompt?.trim() ? '' : (product_context?.name || '')) || 'the specified garment';

      const editParts: string[] = [];
      editParts.push(`Transform this photo into a professional fashion editorial. Change the person's outfit: they are now wearing ${garmentName}.`);
      if (prompt?.trim()) editParts.push(`Garment and style details: ${prompt.trim()}`);
      editParts.push('IDENTITY RULE: The person\'s face, hair color, hair style, skin tone, facial hair, eye color, and body build must remain EXACTLY identical to the input photo. This is the same person — do not alter their identity.');
      editParts.push(`The person is ${pose}. Shot framing: ${framing}. Camera angle: ${angle}.`);
      if (sceneDesc) editParts.push(`Background/setting: ${sceneDesc}.`);
      editParts.push('Professional fashion editorial photography, sharp focus on outfit details, natural skin tones, realistic fabric draping, 8K quality.');

      const editPrompt = editParts.join('\n');

      const kontextMaxConfig = MODELS['flux-kontext-max'];
      const avatarResult = await generateWithTogether(
        kontextMaxConfig,
        editPrompt,
        fashion_avatar_url,   // Avatar photo as reference — preserves identity
        width,
        height
      );

      if (avatarResult.success && avatarResult.data) {
        const ext = avatarResult.mimeType?.includes('jpeg') ? 'jpg' : 'png';
        const fileName = `fashion-booth-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const imageData = Uint8Array.from(atob(avatarResult.data), c => c.charCodeAt(0));
        const { publicUrl } = await uploadToStorage('generated-content', fileName, imageData, avatarResult.mimeType || 'image/png');

        const megapixels = (width * height) / 1000000;
        const costUsd = megapixels * kontextMaxConfig.costPerMp;

        if (company_id) {
          try {
            await supabaseInsert('ai_usage_logs', {
              organization_id: company_id,
              user_id: user_id || null,
              model_id: null, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
              cost: costUsd,
              request_type: 'image',
              endpoint: '/v1/images/generations',
              metadata: {
                model_name: kontextMaxConfig.id,
                model_key: 'flux-kontext-max',
                pipeline: 'avatar-edit',
                use_case: 'fashion_booth',
                fashion_scene, fashion_pose, fashion_angle,
              }
            });
          } catch (logError) { console.error('Failed to log usage:', logError); }
        }

        return new Response(
          JSON.stringify({
            url: publicUrl,
            model: 'flux-kontext-max',
            model_id: kontextMaxConfig.id,
            cost_usd: costUsd,
            steps: kontextMaxConfig.steps,
            pipeline: 'avatar-edit',
            prompt: editPrompt,
            original_prompt: original_prompt || prompt,
            dimensions: { width, height },
            product_preserved: false,
            use_case: 'fashion_booth'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.warn('Kontext Max avatar edit failed, falling back:', avatarResult.error);
      }
    }

    // ── Fashion Booth fallback (no avatar, or composite failed) ─────
    // Legacy fashion model preset → prompt fragment (for non-booth fashion calls)
    const FASHION_MODEL_PROMPTS: Record<string, string> = {
      'female_editorial': 'worn by a professional female fashion model with natural proportions, confident editorial pose, looking at camera',
      'male_editorial': 'worn by a professional male fashion model with natural proportions, confident editorial pose, looking at camera',
      'diverse_group': 'worn by a diverse group of professional fashion models with natural proportions, styled editorial group shot',
      'flat_lay': 'styled flat-lay arrangement on a clean surface with fashion accessories and props, no model, garment laid flat',
      'mannequin': 'on an invisible ghost mannequin, clean e-commerce product shot, garment shown from front with shape visible',
      'custom': '',
    };

    // ── Prompt construction ──────────────────────────────────────────
    let finalPrompt = prompt;

    const isFashionUseCase = use_case === 'fashion_tryon' || use_case === 'fashion_lookbook';

    if (fashion_booth && modelConfig.requiresImage) {
      // Fashion Booth without avatar — Kontext approach with garment as reference
      finalPrompt = `${prompt}\n\nIMPORTANT: The garment from the reference image must be reproduced with pixel-perfect accuracy — same fabric weave, same color shade, same pattern placement, same stitching, same pocket shapes, same zipper/button details, same collar/hood shape. Any deviation is unacceptable. Ultra high resolution, 8K detail, sharp focus on garment construction.`;
    } else if (isFashionUseCase && modelConfig.requiresImage) {
      // Legacy fashion mode (non-booth) — keep existing behavior
      const modelFragment = FASHION_MODEL_PROMPTS[fashion_model_preset] || FASHION_MODEL_PROMPTS['female_editorial'];
      const garmentPreservation = 'CRITICAL: Preserve the EXACT garment design from the reference image — same fabric texture, same color, same pattern, same stitching, same silhouette, same details. Do not alter the garment in any way.';

      if (use_case === 'fashion_tryon') {
        const sceneDesc = prompt?.trim() ? prompt.trim() : 'professional fashion studio with soft directional lighting';
        finalPrompt = `${garmentPreservation} Show this garment ${modelFragment}, in setting: ${sceneDesc}. High-fashion editorial photography, Vogue-quality, natural skin tones, realistic fabric draping on the body, professional fashion lighting, sharp focus on garment details. Ultra high quality, 8K detail.`;
      } else {
        const sceneDesc = prompt?.trim() ? prompt.trim() : 'styled editorial fashion lookbook scene';
        finalPrompt = `${garmentPreservation} ${sceneDesc}. ${modelFragment ? modelFragment + '.' : ''} Fashion lookbook photography, styled scene, editorial composition, natural colors, professional lighting highlighting fabric texture and garment construction. Ultra high quality, 8K detail.`;
      }
    } else if (modelConfig.requiresImage) {
      // For Kontext (image-to-image): keep prompt focused but add quality + preservation hints
      // Kontext prompts describe the EDIT, not the full scene
      if (prompt) {
        finalPrompt = `${prompt}. CRITICAL: Preserve ALL text, logos, brand names, icons, buttons, labels, and printed markings on the product EXACTLY as they appear in the reference image — correct spelling, correct font, correct placement, correct size. Do not alter, blur, distort, or hallucinate any text or logo. Ultra high quality, sharp detail, professional lighting, commercial grade output.`;
      }
    } else if (prompt_enhanced) {
      // Prompt was already enhanced by enhance-prompt — use as-is to avoid bloat
      // Only add a minimal quality suffix if the prompt doesn't already have one
      if (!/\b(8K|ultra high|professional photograph|sharp focus)\b/i.test(prompt)) {
        finalPrompt = `${prompt}. Ultra high resolution, 8K detail, sharp focus, professional commercial quality.`;
      } else {
        finalPrompt = prompt;
      }
    } else {
      // Raw prompt — wrap with full quality directives
      finalPrompt = buildFinalPrompt(prompt, brand_context, product_context, style, negative_prompt);
    }

    // ── Generate ─────────────────────────────────────────────────────
    let imageResult = await generateWithTogether(modelConfig, finalPrompt, refImageUrl, width, height);

    // Fallback to Gemini for text-to-image only
    if (!imageResult.success && !modelConfig.requiresImage && GOOGLE_API_KEY) {
      console.log('Together.ai failed, trying Gemini fallback...');
      imageResult = await tryGemini(finalPrompt);
    }

    if (!imageResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Image generation failed',
          details: imageResult.error || 'All providers failed',
          model_attempted: selectedModelKey
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Upload to storage ────────────────────────────────────────────
    const ext = imageResult.mimeType?.includes('jpeg') ? 'jpg' : 'png';
    const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const imageData = Uint8Array.from(atob(imageResult.data!), c => c.charCodeAt(0));

    const { publicUrl } = await uploadToStorage(
      'generated-content',
      fileName,
      imageData,
      imageResult.mimeType || 'image/png'
    );

    // ── Usage tracking ───────────────────────────────────────────────
    const megapixels = (width * height) / 1000000;
    const costUsd = megapixels * modelConfig.costPerMp;

    if (company_id) {
      try {
        await supabaseInsert('ai_usage_logs', {
          organization_id: company_id,
          user_id: user_id || null,
          model_id: null,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          cost: costUsd,
          request_type: 'image',
          endpoint: '/v1/images/generations',
          metadata: {
            model_name: modelConfig.id,
            model_key: selectedModelKey,
            use_case: use_case || null,
            dimensions: { width, height },
            megapixels,
            steps: modelConfig.steps,
            has_reference_image: !!refImageUrl
          }
        });
      } catch (logError) {
        console.error('Failed to log usage:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        url: publicUrl,
        model: selectedModelKey,
        model_id: modelConfig.id,
        cost_usd: costUsd,
        steps: modelConfig.steps,
        prompt: finalPrompt,
        original_prompt: original_prompt || prompt,
        dimensions: { width, height },
        product_preserved: modelConfig.requiresImage,
        use_case: use_case || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

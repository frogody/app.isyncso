import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// =============================================================================
// MODEL CONFIGURATIONS
// =============================================================================

const MODELS: Record<string, { id: string; requiresImage: boolean; costPerMp: number; steps: number; description: string }> = {
  'flux-kontext': {
    id: 'black-forest-labs/FLUX.1-Kontext-dev',
    requiresImage: true,
    costPerMp: 0.025,
    steps: 28,
    description: 'Reference-based editing (dev) - good quality, budget-friendly'
  },
  'flux-kontext-pro': {
    id: 'black-forest-labs/FLUX.1-Kontext-pro',
    requiresImage: true,
    costPerMp: 0.04,
    steps: 28,
    description: 'Reference-based editing (pro) - best for product preservation + scene changes'
  },
  'flux-dev': {
    id: 'black-forest-labs/FLUX.1-dev',
    requiresImage: false,
    costPerMp: 0.025,
    steps: 28,
    description: 'Text-to-image (dev) - good quality general purpose'
  },
  'flux-schnell': {
    id: 'black-forest-labs/FLUX.1-schnell',
    requiresImage: false,
    costPerMp: 0.0027,
    steps: 4,
    description: 'Fast text-to-image - quick drafts and iterations'
  },
  'flux-pro': {
    id: 'black-forest-labs/FLUX.1.1-pro',
    requiresImage: false,
    costPerMp: 0.04,
    steps: 28,
    description: 'Text-to-image (pro) - highest quality for marketing and premium'
  }
};

// Use-case → model mapping
const USE_CASE_MODELS: Record<string, string> = {
  'product_variation': 'flux-kontext-pro',
  'product_scene': 'flux-kontext-pro',
  'marketing_creative': 'flux-pro',
  'quick_draft': 'flux-schnell',
  'premium_quality': 'flux-pro',
  'product_quick': 'flux-kontext',
  'draft': 'flux-dev'
};

// =============================================================================
// SMART MODEL ROUTING — considers product characteristics
// =============================================================================

interface RoutingContext {
  useCase?: string;
  hasReferenceImage: boolean;
  isPhysical: boolean;
  hasText: boolean;       // product has visible text/logos to preserve
  materialCategory?: string;
  surfaceFinish?: string;
  isHighDetail: boolean;  // product needs high detail (jewelry, electronics)
}

function smartModelRoute(ctx: RoutingContext, requestedModel?: string): string {
  // Explicit model request always wins
  if (requestedModel && MODELS[requestedModel]) return requestedModel;

  // Use case mapping as primary router
  if (ctx.useCase && USE_CASE_MODELS[ctx.useCase]) {
    const mapped = USE_CASE_MODELS[ctx.useCase];
    // Upgrade logic: if use case says kontext but no reference, fall back intelligently
    if (MODELS[mapped]?.requiresImage && !ctx.hasReferenceImage) {
      return ctx.isHighDetail ? 'flux-pro' : 'flux-dev';
    }
    return mapped;
  }

  // Smart fallback when no use case specified
  if (ctx.hasReferenceImage) {
    // Reference image available → use Kontext
    return ctx.isHighDetail ? 'flux-kontext-pro' : 'flux-kontext';
  }

  if (ctx.isPhysical) {
    // Physical product without reference → text-to-image
    return ctx.isHighDetail ? 'flux-pro' : 'flux-dev';
  }

  // Default
  return 'flux-dev';
}

function isHighDetailProduct(materialCategory?: string, surfaceFinish?: string): boolean {
  const highDetailMaterials = ['jewelry', 'gemstone', 'glass', 'electronics', 'ceramic'];
  const highDetailSurfaces = ['reflective', 'transparent', 'glossy'];
  return highDetailMaterials.includes(materialCategory || '') ||
         highDetailSurfaces.includes(surfaceFinish || '');
}

// =============================================================================
// PRODUCT CATEGORY DETECTION (mirrors enhance-prompt but for server-side fallback)
// =============================================================================

type MaterialCategory =
  | 'jewelry' | 'gemstone' | 'luxury' | 'glass'
  | 'textile' | 'leather' | 'wood' | 'ceramic'
  | 'electronics' | 'food' | 'paper' | 'plastic'
  | 'metal' | 'standard';

function detectProductCategory(productContext: any, prompt: string): MaterialCategory {
  const signals = [
    productContext?.name, productContext?.description, productContext?.short_description,
    productContext?.tags?.join(' '), productContext?.category, prompt,
    productContext?.specifications?.map((s: any) => `${s.name} ${s.value}`).join(' '),
    productContext?.attributes?.map((a: any) => `${a.key} ${a.value}`).join(' ')
  ].filter(Boolean).join(' ').toLowerCase();

  if (/\b(ring|necklace|bracelet|earring|pendant|brooch|diamond|gold|silver|platinum|gemstone|sapphire|ruby|emerald|pearl|18k|14k|925|sterling|carat|karat|jewel)\b/.test(signals)) return 'jewelry';
  if (/\b(leather|suede|nubuck|calfskin)\b/.test(signals)) return 'leather';
  if (/\b(cotton|silk|wool|linen|cashmere|denim|fabric|textile)\b/.test(signals)) return 'textile';
  if (/\b(ceramic|porcelain|stoneware|pottery)\b/.test(signals)) return 'ceramic';
  if (/\b(wood|bamboo|oak|walnut|maple|teak)\b/.test(signals)) return 'wood';
  if (/\b(glass|crystal|bottle|perfume|fragrance|vase|transparent|translucent)\b/.test(signals)) return 'glass';
  if (/\b(phone|laptop|tablet|screen|electronic|gadget|headphone|speaker)\b/.test(signals)) return 'electronics';
  if (/\b(food|chocolate|coffee|wine|cheese|bread|cake|fruit|gourmet)\b/.test(signals)) return 'food';
  if (/\b(steel|iron|aluminum|copper|brass|titanium|chrome|stainless|metal)\b/.test(signals)) return 'metal';
  if (/\b(watch|timepiece|luxury|premium|haute|couture|designer|handcrafted|swarovski)\b/.test(signals)) return 'luxury';
  return 'standard';
}

// =============================================================================
// PROMPT BUILDER (server-side fallback when enhance-prompt wasn't called)
// =============================================================================

function buildEnhancedPrompt(
  userPrompt: string,
  brandContext: any,
  productContext: any,
  style?: string,
  hasReferenceImage?: boolean
): string {
  let enhanced = userPrompt || '';

  // For reference-image use cases, focus on scene not product
  if (hasReferenceImage) {
    enhanced += ' Professional product photography,';
  }

  if (brandContext?.colors?.primary) {
    enhanced += ` Brand colors: ${brandContext.colors.primary}`;
    if (brandContext.colors.secondary) {
      enhanced += `, ${brandContext.colors.secondary}`;
    }
    enhanced += '.';
  }

  if (brandContext?.visual_style?.mood) {
    enhanced += ` Style: ${brandContext.visual_style.mood}.`;
  }

  if (productContext && !hasReferenceImage) {
    // Text-to-image: describe the product
    const productName = productContext.name || productContext.product_name || 'the product';
    enhanced += ` Product: ${productName}.`;
    if (productContext.description) {
      enhanced += ` ${productContext.description.slice(0, 150)}`;
    }
  }

  // Size scale
  if (productContext?.product_size_scale) {
    const s = productContext.product_size_scale;
    enhanced += ` Product shown at realistic ${s.label.toLowerCase()} scale (${s.cm}), ${s.desc}.`;
  }

  // Material-specific photography guidance
  const category = detectProductCategory(productContext, userPrompt);
  const isLuxuryStyle = style === 'luxury' || !style;

  const materialSuffixes: Record<string, Record<boolean extends true ? 'full' : 'light', string>> = {
    jewelry: {
      full: ' Jewelry product photography, controlled reflections on metal, macro detail, gradient lighting, dark background, focus stacking. Never oversized.',
      light: ' Controlled reflections on metal, sharp macro detail. Never oversized.'
    },
    leather: {
      full: ' Warm lighting revealing leather grain texture, material quality visible, rich shadows.',
      light: ' Visible leather grain, warm tones.'
    },
    textile: {
      full: ' Lighting showing fabric drape and weave, material quality visible, natural folds.',
      light: ' Natural fabric drape, visible weave.'
    },
    wood: {
      full: ' Warm side light revealing wood grain, natural character, amber tones.',
      light: ' Visible wood grain, warm tones.'
    },
    glass: {
      full: ' Rim lighting defining transparent edges, gradient background, backlit clarity.',
      light: ' Rim lighting on edges, backlit clarity.'
    },
    electronics: {
      full: ' Clean product form, screen visible without glare, edge lighting for shape definition.',
      light: ' Clean form, no screen glare.'
    },
    food: {
      full: ' Appetizing presentation, window-style side light, warm tones, fresh appearance.',
      light: ' Appetizing, warm tones.'
    },
    ceramic: {
      full: ' Soft box lighting showing glaze quality, curved form definition.',
      light: ' Visible glaze quality.'
    },
    metal: {
      full: ' Tent lighting with gradient panels, controlled specular highlights, dark gradient backdrop.',
      light: ' Controlled specular highlights.'
    },
    luxury: {
      full: ' Premium presentation, dramatic lighting, controlled reflections, editorial quality.',
      light: ' Controlled reflections, sharp quality.'
    }
  };

  const matSuffix = materialSuffixes[category];
  if (matSuffix) {
    enhanced += isLuxuryStyle ? matSuffix.full : matSuffix.light;
  }

  return enhanced;
}

// =============================================================================
// API INTEGRATION
// =============================================================================

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

    console.log(`Generating with ${modelConfig.id}...`);

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

// =============================================================================
// MAIN HANDLER
// =============================================================================

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
      width = 1024,
      height = 1024,
      company_id,
      user_id,
      // NEW: physical profile from enhance-prompt
      physical_profile,
    } = await req.json();

    // ── Smart Model Routing ─────────────────────────────────────
    const hasProductImages = product_images?.length > 0 || reference_image_url;
    const materialCategory = physical_profile?.material ||
      detectProductCategory(product_context, prompt || '');
    const surfaceFinish = physical_profile?.surface;

    const routingContext: RoutingContext = {
      useCase: use_case,
      hasReferenceImage: !!hasProductImages,
      isPhysical: is_physical_product || product_context?.type === 'physical',
      hasText: /\b(logo|text|label|brand\s*name|packaging)\b/i.test(
        [product_context?.name, product_context?.description, prompt].filter(Boolean).join(' ')
      ),
      materialCategory,
      surfaceFinish,
      isHighDetail: isHighDetailProduct(materialCategory, surfaceFinish)
    };

    const selectedModelKey = smartModelRoute(routingContext, model_key);
    const modelConfig = MODELS[selectedModelKey];

    if (!modelConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${selectedModelKey}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refImageUrl = reference_image_url || (product_images?.length > 0 ? product_images[0] : null);

    if (modelConfig.requiresImage && !refImageUrl) {
      // Smart downgrade: if we need a reference image but don't have one, switch to text-to-image
      const fallbackModel = routingContext.isHighDetail ? 'flux-pro' : 'flux-dev';
      const fallbackConfig = MODELS[fallbackModel];
      console.log(`No reference image for ${selectedModelKey}, falling back to ${fallbackModel}`);

      let enhancedPrompt = prompt;
      if (!prompt || prompt === original_prompt) {
        enhancedPrompt = buildEnhancedPrompt(prompt, brand_context, product_context, style, false);
      }
      if (style && style !== 'photorealistic') {
        enhancedPrompt += ` Style: ${style}.`;
      }

      let imageResult = await generateWithTogether(fallbackConfig, enhancedPrompt, null, width, height);
      if (!imageResult.success && GOOGLE_API_KEY) {
        imageResult = await tryGemini(enhancedPrompt);
      }

      if (!imageResult.success) {
        return new Response(
          JSON.stringify({
            error: 'Image generation failed',
            details: imageResult.error || 'All providers failed',
            model_attempted: fallbackModel,
            routing_note: `Downgraded from ${selectedModelKey} (no reference image)`
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ext = imageResult.mimeType?.includes('jpeg') ? 'jpg' : 'png';
      const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const imageData = Uint8Array.from(atob(imageResult.data!), c => c.charCodeAt(0));
      const { publicUrl } = await uploadToStorage('generated-content', fileName, imageData, imageResult.mimeType || 'image/png');

      const megapixels = (width * height) / 1000000;
      const costUsd = megapixels * fallbackConfig.costPerMp;

      if (company_id) {
        try {
          await supabaseInsert('ai_usage_logs', {
            organization_id: company_id, user_id: user_id || null,
            model_id: null, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
            cost: costUsd, request_type: 'image', endpoint: '/v1/images/generations',
            metadata: {
              model_name: fallbackConfig.id, model_key: fallbackModel,
              original_model: selectedModelKey, routing_downgrade: true,
              use_case: use_case || null, dimensions: { width, height },
              megapixels, has_reference_image: false,
              material_category: materialCategory, surface_finish: surfaceFinish
            }
          });
        } catch (logError) {
          console.error('Failed to log usage:', logError);
        }
      }

      return new Response(
        JSON.stringify({
          url: publicUrl, model: fallbackModel, model_id: fallbackConfig.id,
          cost_usd: costUsd, prompt: enhancedPrompt, original_prompt: original_prompt || prompt,
          dimensions: { width, height }, product_preserved: false,
          use_case: use_case || null, routing_note: `Downgraded from ${selectedModelKey}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Build final prompt ──────────────────────────────────────
    let enhancedPrompt = prompt;
    if (!modelConfig.requiresImage) {
      // Text-to-image: enhance the prompt with product/brand context
      enhancedPrompt = buildEnhancedPrompt(prompt, brand_context, product_context, style, false);
      if (style && style !== 'photorealistic') {
        enhancedPrompt += ` Style: ${style}.`;
      }
    }
    // For reference-image models (Kontext), the prompt should focus on scene/environment
    // The enhance-prompt edge function already handles this — we just pass the prompt through

    // ── Generate image ──────────────────────────────────────────
    let imageResult = await generateWithTogether(modelConfig, enhancedPrompt, refImageUrl, width, height);

    if (!imageResult.success && !modelConfig.requiresImage && GOOGLE_API_KEY) {
      console.log('Together.ai failed, trying Gemini fallback...');
      imageResult = await tryGemini(enhancedPrompt);
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

    // ── Upload to storage ───────────────────────────────────────
    const ext = imageResult.mimeType?.includes('jpeg') ? 'jpg' : 'png';
    const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const imageData = Uint8Array.from(atob(imageResult.data!), c => c.charCodeAt(0));

    const { publicUrl } = await uploadToStorage(
      'generated-content', fileName, imageData,
      imageResult.mimeType || 'image/png'
    );

    // ── Calculate cost ──────────────────────────────────────────
    const megapixels = (width * height) / 1000000;
    const costUsd = megapixels * modelConfig.costPerMp;

    // ── Track usage ─────────────────────────────────────────────
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
            has_reference_image: !!refImageUrl,
            material_category: materialCategory,
            surface_finish: surfaceFinish,
            is_high_detail: routingContext.isHighDetail
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
        prompt: enhancedPrompt,
        original_prompt: original_prompt || prompt,
        dimensions: { width, height },
        product_preserved: modelConfig.requiresImage,
        use_case: use_case || null,
        material_detected: materialCategory,
        routing: {
          model_chosen: selectedModelKey,
          reason: modelConfig.description,
          is_high_detail: routingContext.isHighDetail
        }
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

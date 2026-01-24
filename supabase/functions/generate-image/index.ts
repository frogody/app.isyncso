import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Model configurations with pricing (per megapixel)
const MODELS: Record<string, { id: string; requiresImage: boolean; costPerMp: number; steps: number }> = {
  'flux-kontext': {
    id: 'black-forest-labs/FLUX.1-Kontext-dev',
    requiresImage: true,
    costPerMp: 0.025,
    steps: 28
  },
  'flux-kontext-pro': {
    id: 'black-forest-labs/FLUX.1-Kontext-pro',
    requiresImage: true,
    costPerMp: 0.04,
    steps: 28
  },
  'flux-dev': {
    id: 'black-forest-labs/FLUX.1-dev',
    requiresImage: false,
    costPerMp: 0.025,
    steps: 28
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
    steps: 28
  }
};

const USE_CASE_MODELS: Record<string, string> = {
  'product_variation': 'flux-kontext-pro',  // Changed: use pro for better quality
  'product_scene': 'flux-kontext-pro',
  'marketing_creative': 'flux-pro',          // Changed: use pro for marketing
  'quick_draft': 'flux-schnell',
  'premium_quality': 'flux-pro',
  'product_quick': 'flux-kontext',           // New: budget option with reference
  'draft': 'flux-dev'                        // New: budget option without reference
};

// Helper: Direct Supabase REST API call
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

// Helper: Upload to Supabase Storage
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

function buildEnhancedPrompt(
  userPrompt: string,
  brandContext: any,
  productContext: any
): string {
  let enhanced = userPrompt || '';

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

  if (productContext) {
    const productName = productContext.name || productContext.product_name || 'the product';
    enhanced += ` Product: ${productName}.`;
    if (productContext.description) {
      enhanced += ` ${productContext.description}`;
    }
  }

  return enhanced;
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
    } = await req.json();

    // Determine which model to use
    let selectedModelKey = model_key;

    if (use_case && USE_CASE_MODELS[use_case]) {
      selectedModelKey = USE_CASE_MODELS[use_case];
    }

    const hasProductImages = product_images?.length > 0 || reference_image_url;
    if (!selectedModelKey && (is_physical_product || product_context?.type === 'physical') && hasProductImages) {
      selectedModelKey = 'flux-kontext';
    }

    if (!selectedModelKey) {
      selectedModelKey = 'flux-dev';
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

    let enhancedPrompt = prompt;
    if (!modelConfig.requiresImage) {
      enhancedPrompt = buildEnhancedPrompt(prompt, brand_context, product_context);
      if (style && style !== 'photorealistic') {
        enhancedPrompt += ` Style: ${style}.`;
      }
    }

    // Generate image
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

    // Upload to Supabase Storage
    const ext = imageResult.mimeType?.includes('jpeg') ? 'jpg' : 'png';
    const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const imageData = Uint8Array.from(atob(imageResult.data!), c => c.charCodeAt(0));

    const { publicUrl } = await uploadToStorage(
      'generated-content',
      fileName,
      imageData,
      imageResult.mimeType || 'image/png'
    );

    // Calculate cost
    const megapixels = (width * height) / 1000000;
    const costUsd = megapixels * modelConfig.costPerMp;

    // Track usage if company_id provided (using new ai_usage_logs table)
    if (company_id) {
      try {
        await supabaseInsert('ai_usage_logs', {
          organization_id: company_id,
          user_id: user_id || null,
          model_id: null, // Will be looked up by admin dashboard using model name in metadata
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
        prompt: enhancedPrompt,
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

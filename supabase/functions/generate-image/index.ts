import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function buildProductPreservationPrompt(
  userPrompt: string,
  productContext: any,
  hasReferenceImages: boolean
): string {
  if (!productContext) return userPrompt;

  const productName = productContext.name || productContext.product_name || 'the product';
  const productDescription = productContext.description || '';
  const productType = productContext.type;

  if (productType === 'physical' || hasReferenceImages) {
    return `Professional product photography of "${productName}".

CRITICAL REQUIREMENTS:
- Product must be the EXACT "${productName}" with precise design accuracy
- Maintain exact shape, colors, materials, textures, and visual characteristics
- For jewelry: preserve chain style, pendant shape, clasp design, metal finish exactly
- For clothing: preserve cut, fabric texture, patterns, stitching precisely
- Product should look like a real photograph of the actual product

PRODUCT: ${productName}
${productDescription ? `DESCRIPTION: ${productDescription}` : ''}

SCENE: ${userPrompt}

Create photorealistic product photograph with the product clearly visible and in focus.`;
  }

  return `${userPrompt}. Product: ${productName}. ${productDescription}`;
}

// Try Gemini image generation
async function tryGemini(prompt: string): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }> {
  if (!GOOGLE_API_KEY) return { success: false, error: 'No Google API key' };

  const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      console.log(`Trying Gemini ${model}...`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
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
          console.log('Gemini geo-restricted');
          return { success: false, error: 'geo-restricted' };
        }
        continue;
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
    } catch (e: any) {
      console.error(`Gemini ${model} error:`, e.message);
    }
  }

  return { success: false, error: 'Gemini failed' };
}

// Try Together.ai Flux model
async function tryTogether(prompt: string): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }> {
  if (!TOGETHER_API_KEY) return { success: false, error: 'No Together API key' };

  try {
    console.log('Trying Together.ai Flux...');
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
        response_format: 'b64_json'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Together error:', errText);
      return { success: false, error: errText };
    }

    const data = await response.json();
    if (data.data?.[0]?.b64_json) {
      return {
        success: true,
        data: data.data[0].b64_json,
        mimeType: 'image/png'
      };
    }

    return { success: false, error: 'No image in response' };
  } catch (e: any) {
    console.error('Together error:', e.message);
    return { success: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
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
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasProductImages = product_images?.length > 0;
    const isPhysicalProductRequest = is_physical_product || product_context?.type === 'physical' || hasProductImages;

    let enhancedPrompt = prompt;
    if (isPhysicalProductRequest && product_context) {
      enhancedPrompt = buildProductPreservationPrompt(prompt, product_context, hasProductImages);
      console.log('Product preservation for:', product_context.name);
    }

    if (style && style !== 'photorealistic') {
      enhancedPrompt += ` Style: ${style}.`;
    }

    if (brand_context?.colors?.primary) {
      enhancedPrompt += ` Brand colors: ${brand_context.colors.primary}${brand_context.colors.secondary ? `, ${brand_context.colors.secondary}` : ''}.`;
    }

    let imageResult: { success: boolean; data?: string; mimeType?: string; error?: string };
    let usedModel = 'unknown';

    // Try Gemini first
    imageResult = await tryGemini(enhancedPrompt);
    if (imageResult.success) {
      usedModel = 'gemini';
    }

    // Fallback to Together.ai
    if (!imageResult.success) {
      console.log('Gemini failed, trying Together.ai...');
      imageResult = await tryTogether(enhancedPrompt);
      if (imageResult.success) {
        usedModel = 'flux-schnell';
      }
    }

    if (!imageResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Image generation failed',
          details: imageResult.error || 'All providers failed',
          suggestion: 'Configure TOGETHER_API_KEY for fallback image generation',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Supabase Storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ext = imageResult.mimeType?.includes('jpeg') ? 'jpg' : 'png';
    const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const imageData = Uint8Array.from(atob(imageResult.data!), c => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('generated-content')
      .upload(fileName, imageData, { contentType: imageResult.mimeType || 'image/png', upsert: false });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Storage upload failed', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: urlData } = supabase.storage.from('generated-content').getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        url: urlData.publicUrl,
        model: usedModel,
        prompt: enhancedPrompt,
        original_prompt: original_prompt || prompt,
        dimensions: { width, height },
        product_preserved: isPhysicalProductRequest,
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

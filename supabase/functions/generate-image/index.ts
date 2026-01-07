import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys from secrets
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      original_prompt,
      style,
      aspect_ratio,
      width,
      height,
      brand_context,
      product_context,
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY is not set');
      return new Response(
        JSON.stringify({
          error: 'API key not configured',
          message: 'GOOGLE_API_KEY environment variable is not set'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let imageUrl: string | null = null;
    let model = 'unknown';
    let errorDetails: string | null = null;

    // Try Nano Banana Pro (gemini-3-pro-image-preview) first for best quality
    const modelsToTry = [
      'gemini-3-pro-image-preview',  // Nano Banana Pro - best quality
      'gemini-2.5-flash-image',      // Nano Banana - faster
      'gemini-2.0-flash-exp',        // Fallback
    ];

    for (const modelName of modelsToTry) {
      if (imageUrl) break;

      try {
        console.log(`Attempting image generation with ${modelName}...`);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': GOOGLE_API_KEY
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                responseModalities: ["image", "text"],
              }
            })
          }
        );

        const responseText = await response.text();
        console.log(`${modelName} response status:`, response.status);

        if (response.ok) {
          const data = JSON.parse(responseText);
          console.log(`${modelName} response structure:`, JSON.stringify(data).substring(0, 300));

          // Look for image data in the response
          const candidate = data.candidates?.[0];
          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData?.mimeType?.startsWith('image/')) {
                const base64Image = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;

                // Determine file extension
                let extension = 'png';
                if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
                else if (mimeType.includes('webp')) extension = 'webp';

                // Upload to Supabase Storage
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
                const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
                const imageData = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));

                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('generated-content')
                  .upload(fileName, imageData, {
                    contentType: mimeType,
                    upsert: false
                  });

                if (uploadError) {
                  console.error('Storage upload error:', uploadError);
                  errorDetails = `Storage error: ${uploadError.message}`;
                  continue;
                }

                const { data: urlData } = supabase.storage
                  .from('generated-content')
                  .getPublicUrl(fileName);

                imageUrl = urlData.publicUrl;
                model = modelName;
                console.log(`Successfully generated image with ${modelName}`);
                break;
              }
            }
          }

          if (!imageUrl && candidate) {
            // Check if there's text response but no image
            const textPart = candidate.content?.parts?.find((p: any) => p.text);
            if (textPart) {
              console.log(`${modelName} returned text instead of image:`, textPart.text?.substring(0, 200));
            }
          }
        } else {
          const errorInfo = `${modelName} API error (${response.status}): ${responseText.substring(0, 300)}`;
          console.error(errorInfo);
          if (!errorDetails) errorDetails = errorInfo;
        }
      } catch (modelError: any) {
        const errorInfo = `${modelName} error: ${modelError.message}`;
        console.error(errorInfo);
        if (!errorDetails) errorDetails = errorInfo;
      }
    }

    // If no image was generated, return error with details
    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          error: 'Failed to generate image',
          details: errorDetails || 'No image models returned valid image data. The API may not support image generation with your current API key.',
          apiKeyPresent: true,
          modelsAttempted: modelsToTry
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        url: imageUrl,
        model: model,
        prompt: prompt,
        original_prompt: original_prompt,
        dimensions: { width, height }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-image:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

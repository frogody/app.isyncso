import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Keys from secrets
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const NANOBANANA_API_KEY = Deno.env.get("NANOBANANA_API_KEY");
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

    let imageUrl: string | null = null;
    let model = 'unknown';

    // Try Google Gemini 2.0 Flash (experimental image generation)
    if (GOOGLE_API_KEY) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Generate an image: ${prompt}`
                }]
              }],
              generationConfig: {
                responseModalities: ["image", "text"],
                responseMimeType: "image/png"
              }
            })
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();

          // Check if we got image data
          const imagePart = geminiData.candidates?.[0]?.content?.parts?.find(
            (part: any) => part.inlineData?.mimeType?.startsWith('image/')
          );

          if (imagePart?.inlineData?.data) {
            // Upload to Supabase Storage
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            const imageData = Uint8Array.from(atob(imagePart.inlineData.data), c => c.charCodeAt(0));

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('generated-content')
              .upload(fileName, imageData, {
                contentType: 'image/png',
                upsert: false
              });

            if (uploadError) {
              console.error('Storage upload error:', uploadError);
              throw new Error('Failed to upload generated image');
            }

            const { data: urlData } = supabase.storage
              .from('generated-content')
              .getPublicUrl(fileName);

            imageUrl = urlData.publicUrl;
            model = 'gemini-2.0-flash-exp';
          }
        }
      } catch (geminiError) {
        console.error('Gemini error:', geminiError);
      }
    }

    // Fallback to NanoBanana if available
    if (!imageUrl && NANOBANANA_API_KEY) {
      try {
        const nanoBananaResponse = await fetch('https://api.nanobanana.ai/v1/images/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NANOBANANA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            model: 'gemini-2.5-flash-image',
            aspect_ratio: aspect_ratio,
            style: style,
            width: width,
            height: height
          })
        });

        if (nanoBananaResponse.ok) {
          const nanoBananaData = await nanoBananaResponse.json();
          if (nanoBananaData.url) {
            imageUrl = nanoBananaData.url;
            model = 'nanobanana-gemini-2.5-flash';
          }
        }
      } catch (nbError) {
        console.error('NanoBanana error:', nbError);
      }
    }

    // If no image was generated, return a demo/placeholder
    if (!imageUrl) {
      // Return a structured response with a placeholder
      // In production, you'd want proper API keys configured
      return new Response(
        JSON.stringify({
          error: 'Image generation service not configured. Please set up GOOGLE_API_KEY or NANOBANANA_API_KEY in edge function secrets.',
          demo: true,
          url: `https://placehold.co/${width || 1024}x${height || 1024}/1e293b/94a3b8?text=AI+Image+Generation%0AConfigure+API+Keys`,
          model: 'placeholder'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

  } catch (error) {
    console.error('Error in generate-image:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

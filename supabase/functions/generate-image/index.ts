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

    // Try Google Imagen 3 for image generation
    try {
      console.log('Attempting Imagen 3 generation...');

      // Map aspect ratio to Imagen format
      let imagenAspectRatio = "1:1";
      if (aspect_ratio === "16:9") imagenAspectRatio = "16:9";
      else if (aspect_ratio === "9:16") imagenAspectRatio = "9:16";
      else if (aspect_ratio === "4:3") imagenAspectRatio = "4:3";
      else if (aspect_ratio === "3:4") imagenAspectRatio = "3:4";

      const imagenResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{
              prompt: prompt
            }],
            parameters: {
              sampleCount: 1,
              aspectRatio: imagenAspectRatio,
              safetyFilterLevel: "block_only_high",
              personGeneration: "allow_adult"
            }
          })
        }
      );

      const imagenText = await imagenResponse.text();
      console.log('Imagen response status:', imagenResponse.status);

      if (imagenResponse.ok) {
        const imagenData = JSON.parse(imagenText);
        console.log('Imagen response data:', JSON.stringify(imagenData).substring(0, 500));

        // Check for predictions with base64 image
        if (imagenData.predictions?.[0]?.bytesBase64Encoded) {
          const base64Image = imagenData.predictions[0].bytesBase64Encoded;

          // Upload to Supabase Storage
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
          const imageData = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('generated-content')
            .upload(fileName, imageData, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(`Failed to upload generated image: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('generated-content')
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
          model = 'imagen-3.0-generate-002';
          console.log('Successfully generated image with Imagen 3');
        } else {
          errorDetails = 'Imagen returned no image data: ' + JSON.stringify(imagenData).substring(0, 200);
          console.error(errorDetails);
        }
      } else {
        errorDetails = `Imagen API error (${imagenResponse.status}): ${imagenText.substring(0, 500)}`;
        console.error(errorDetails);
      }
    } catch (imagenError) {
      errorDetails = `Imagen error: ${imagenError.message}`;
      console.error('Imagen error:', imagenError);
    }

    // Fallback: Try Gemini 2.0 Flash with image generation
    if (!imageUrl) {
      try {
        console.log('Falling back to Gemini 2.0 Flash...');

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Create a detailed, high-quality image: ${prompt}`
                }]
              }],
              generationConfig: {
                responseModalities: ["image", "text"],
              }
            })
          }
        );

        const geminiText = await geminiResponse.text();
        console.log('Gemini response status:', geminiResponse.status);

        if (geminiResponse.ok) {
          const geminiData = JSON.parse(geminiText);

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
                contentType: imagePart.inlineData.mimeType || 'image/png',
                upsert: false
              });

            if (uploadError) {
              console.error('Storage upload error:', uploadError);
            } else {
              const { data: urlData } = supabase.storage
                .from('generated-content')
                .getPublicUrl(fileName);

              imageUrl = urlData.publicUrl;
              model = 'gemini-2.0-flash-exp';
              console.log('Successfully generated image with Gemini 2.0 Flash');
            }
          } else {
            console.log('Gemini did not return image data:', JSON.stringify(geminiData).substring(0, 500));
          }
        } else {
          console.error('Gemini API error:', geminiText.substring(0, 500));
        }
      } catch (geminiError) {
        console.error('Gemini error:', geminiError);
      }
    }

    // If no image was generated, return error with details
    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          error: 'Failed to generate image',
          details: errorDetails || 'Image generation APIs did not return valid image data',
          apiKeyPresent: !!GOOGLE_API_KEY,
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

  } catch (error) {
    console.error('Error in generate-image:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

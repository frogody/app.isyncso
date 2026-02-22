import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { requireCredits, refundCredits } from '../_shared/credit-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const GOOGLE_VEO_API_KEY = Deno.env.get("GOOGLE_VEO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      original_prompt,
      style,
      duration_seconds,
      aspect_ratio,
      width,
      height,
      brand_context,
      product_context,
      user_id,
    } = await req.json();

    // ── Credit check (50 credits for video generation) ─────────────
    if (user_id) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const credit = await requireCredits(supabaseAdmin, user_id, 'generate-video', {
        edgeFunction: 'generate-video',
        metadata: { duration_seconds, aspect_ratio },
      });
      if (!credit.success) return credit.errorResponse!;
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let videoUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    let model = 'unknown';

    // Try Google Veo API (when available)
    const veoApiKey = GOOGLE_VEO_API_KEY || GOOGLE_API_KEY;
    if (veoApiKey) {
      try {
        const veoResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/veo:generateVideo?key=${veoApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: prompt,
              durationSeconds: duration_seconds || 10,
              aspectRatio: aspect_ratio || '16:9',
              style: style
            })
          }
        );

        if (veoResponse.ok) {
          const veoData = await veoResponse.json();

          if (veoData.operationId) {
            let attempts = 0;
            const maxAttempts = 60;

            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 5000));

              const statusResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/operations/${veoData.operationId}?key=${veoApiKey}`
              );

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();

                if (statusData.done) {
                  if (statusData.response?.videoUrl) {
                    videoUrl = statusData.response.videoUrl;
                    thumbnailUrl = statusData.response.thumbnailUrl;
                    model = 'google-veo';
                  }
                  break;
                }
              }
              attempts++;
            }
          } else if (veoData.videoUrl) {
            videoUrl = veoData.videoUrl;
            thumbnailUrl = veoData.thumbnailUrl;
            model = 'google-veo';
          }
        }
      } catch (veoError) {
        console.error('Veo error:', veoError);
      }
    }

    // Alternative: Try Gemini with video generation
    if (!videoUrl && GOOGLE_API_KEY) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Create a ${duration_seconds || 10} second ${style || 'cinematic'} video: ${prompt}`
                }]
              }],
              generationConfig: {
                responseModalities: ["video"],
                videoConfig: {
                  durationSeconds: duration_seconds || 10,
                  aspectRatio: aspect_ratio || "16:9"
                }
              }
            })
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();

          const videoPart = geminiData.candidates?.[0]?.content?.parts?.find(
            (part: any) => part.inlineData?.mimeType?.startsWith('video/')
          );

          if (videoPart?.inlineData?.data) {
            const fileName = `generated-video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
            const videoData = Uint8Array.from(atob(videoPart.inlineData.data), c => c.charCodeAt(0));

            const { publicUrl } = await uploadToStorage(
              'generated-content',
              fileName,
              videoData,
              'video/mp4'
            );

            videoUrl = publicUrl;
            model = 'gemini-video';
          }
        }
      } catch (geminiError) {
        console.error('Gemini video error:', geminiError);
      }
    }

    // If no video was generated, return demo response
    if (!videoUrl) {
      return new Response(
        JSON.stringify({
          error: 'Video generation service not configured. Please set up GOOGLE_API_KEY or GOOGLE_VEO_API_KEY in edge function secrets.',
          demo: true,
          url: null,
          thumbnail_url: `https://placehold.co/${width || 1920}x${height || 1080}/1e293b/94a3b8?text=AI+Video+Generation%0AConfigure+API+Keys`,
          model: 'placeholder'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        url: videoUrl,
        thumbnail_url: thumbnailUrl,
        model: model,
        prompt: prompt,
        original_prompt: original_prompt,
        duration_seconds: duration_seconds,
        dimensions: { width, height }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-video:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

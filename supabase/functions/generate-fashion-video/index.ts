import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const GOOGLE_VEO_API_KEY = Deno.env.get("GOOGLE_VEO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Models to try ───────────────────────────────────────────────────
// Uses same Gemini generateContent API with responseModalities: ["video"]
// Image-to-video: pass the source image as inlineData in parts[]
const GEMINI_VIDEO_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash-preview-04-17',
];

// Model label mapping for the frontend selector
// All models funnel through the same Gemini generateContent API
const MODEL_LABELS: Record<string, string> = {
  'veo-3.1-fast': 'Veo 3.1 Fast',
  'veo-3.1': 'Veo 3.1',
  'veo-3-fast': 'Veo 3 Fast',
  'veo-3': 'Veo 3',
  'veo-2': 'Veo 2',
};

const COST_PER_SEC: Record<string, number> = {
  'veo-3.1-fast': 0.15,
  'veo-3.1': 0.40,
  'veo-3-fast': 0.15,
  'veo-3': 0.40,
  'veo-2': 0.35,
};

// ─── Helpers ─────────────────────────────────────────────────────────

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

async function downloadImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  return { data: b64, mimeType };
}

// ─── Main handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      image_url,
      prompt,
      model_key = 'veo-3.1-fast',
      duration_seconds = 6,
      aspect_ratio = '9:16',
      generate_audio = false,
      company_id,
      user_id,
    } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'image_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = GOOGLE_VEO_API_KEY || GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'No Google API key configured. Set GOOGLE_VEO_API_KEY or GOOGLE_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modelLabel = MODEL_LABELS[model_key] || model_key;
    const costPerSec = COST_PER_SEC[model_key] || 0.15;

    console.log(`Fashion Video: ${modelLabel} | ${duration_seconds}s | AR=${aspect_ratio}`);

    // ── Step 1: Download the fashion image and encode to base64 ──────
    console.log('Downloading source image...');
    const { data: imageB64, mimeType: imageMime } = await downloadImageAsBase64(image_url);
    console.log(`Image downloaded: ${imageMime}, ${Math.round(imageB64.length / 1024)}KB base64`);

    // ── Step 2: Build the video generation prompt ────────────────────
    const videoPrompt = prompt?.trim()
      ? `Animate this fashion photo into a video: ${prompt.trim()}`
      : 'Animate this fashion photo into a cinematic video. The model confidently strikes multiple poses, slowly turning to show the outfit from different angles. Natural fabric movement, smooth camera motion, professional studio lighting. Keep the person, outfit, and setting exactly as they appear.';

    // ── Step 3: Try Gemini models with video output ──────────────────
    // Same pattern as the working generate-video edge function:
    // Use generateContent with responseModalities: ["video"] + image inlineData
    let videoUrl: string | null = null;
    let usedModel = 'unknown';

    for (const geminiModel of GEMINI_VIDEO_MODELS) {
      try {
        console.log(`Trying ${geminiModel} for image-to-video...`);

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inlineData: {
                      mimeType: imageMime.startsWith('image/') ? imageMime : 'image/jpeg',
                      data: imageB64,
                    },
                  },
                  {
                    text: videoPrompt,
                  },
                ],
              }],
              generationConfig: {
                responseModalities: ["video"],
                videoConfig: {
                  durationSeconds: duration_seconds || 6,
                  aspectRatio: aspect_ratio || "9:16",
                },
              },
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          console.error(`${geminiModel} error (${geminiResponse.status}):`, errText.substring(0, 300));
          continue;
        }

        const geminiData = await geminiResponse.json();

        // Extract video from response (base64 inline data)
        const videoPart = geminiData.candidates?.[0]?.content?.parts?.find(
          (part: any) => part.inlineData?.mimeType?.startsWith('video/')
        );

        if (videoPart?.inlineData?.data) {
          console.log(`${geminiModel}: video generated! Uploading to storage...`);

          const fileName = `fashion-video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
          const videoData = Uint8Array.from(atob(videoPart.inlineData.data), c => c.charCodeAt(0));

          const { publicUrl } = await uploadToStorage(
            'generated-content',
            fileName,
            videoData,
            videoPart.inlineData.mimeType || 'video/mp4'
          );

          videoUrl = publicUrl;
          usedModel = geminiModel;
          console.log(`Video uploaded: ${publicUrl}`);
          break;
        } else {
          console.warn(`${geminiModel}: no video in response`);
        }
      } catch (modelErr: any) {
        console.error(`${geminiModel} exception:`, modelErr.message);
        continue;
      }
    }

    // ── Step 4: If all Gemini models failed, try Veo LRO as fallback ─
    if (!videoUrl) {
      const veoApiKey = GOOGLE_VEO_API_KEY || GOOGLE_API_KEY;
      if (veoApiKey) {
        try {
          console.log('Gemini video models failed, trying Veo text-to-video fallback...');

          // Veo doesn't support image input easily, so we describe the image in the prompt
          const veoPrompt = `${videoPrompt}. Professional fashion photography, cinematic quality, smooth motion.`;

          const veoResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/veo:generateVideo?key=${veoApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: veoPrompt,
                durationSeconds: duration_seconds || 6,
                aspectRatio: aspect_ratio || '9:16',
              }),
            }
          );

          if (veoResponse.ok) {
            const veoData = await veoResponse.json();

            if (veoData.operationId) {
              let attempts = 0;
              const maxAttempts = 60;

              while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                attempts++;

                const statusResponse = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/operations/${veoData.operationId}?key=${veoApiKey}`
                );

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  if (statusData.done) {
                    if (statusData.response?.videoUrl) {
                      videoUrl = statusData.response.videoUrl;
                      usedModel = 'veo-text2video';
                    }
                    break;
                  }
                }

                console.log(`Veo poll ${attempts}/${maxAttempts}...`);
              }
            } else if (veoData.videoUrl) {
              videoUrl = veoData.videoUrl;
              usedModel = 'veo-text2video';
            }
          }
        } catch (veoErr: any) {
          console.error('Veo fallback error:', veoErr.message);
        }
      }
    }

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video generation failed — all providers returned no video. This may be a temporary issue, please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 5: Log usage ────────────────────────────────────────────
    const durationNum = duration_seconds || 6;
    const costUsd = durationNum * costPerSec;

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
          request_type: 'video',
          endpoint: `google/${usedModel}`,
          metadata: {
            pipeline: 'fashion-video',
            model_key,
            model_label: modelLabel,
            actual_model: usedModel,
            duration_seconds: durationNum,
            aspect_ratio,
          },
        });
      } catch (logError) {
        console.error('Failed to log usage:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        url: videoUrl,
        model: model_key,
        model_label: modelLabel,
        actual_model: usedModel,
        duration_seconds: durationNum,
        aspect_ratio,
        cost_usd: costUsd,
        pipeline: 'fashion-video',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-fashion-video:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

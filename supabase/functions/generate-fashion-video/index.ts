import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const GOOGLE_VEO_API_KEY = Deno.env.get("GOOGLE_VEO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Available Google Veo models ─────────────────────────────────────
const VEO_MODELS: Record<string, { id: string; label: string; maxDuration: number; costPerSec: number; supportsAudio: boolean }> = {
  'veo-2': {
    id: 'veo-2-generate-preview',
    label: 'Veo 2',
    maxDuration: 8,
    costPerSec: 0.35,
    supportsAudio: false,
  },
  'veo-3': {
    id: 'veo-3-generate-preview',
    label: 'Veo 3',
    maxDuration: 8,
    costPerSec: 0.40,
    supportsAudio: true,
  },
  'veo-3-fast': {
    id: 'veo-3-fast-generate-preview',
    label: 'Veo 3 Fast',
    maxDuration: 8,
    costPerSec: 0.15,
    supportsAudio: true,
  },
  'veo-3.1': {
    id: 'veo-3.1-generate-preview',
    label: 'Veo 3.1',
    maxDuration: 8,
    costPerSec: 0.40,
    supportsAudio: true,
  },
  'veo-3.1-fast': {
    id: 'veo-3.1-fast-generate-preview',
    label: 'Veo 3.1 Fast',
    maxDuration: 8,
    costPerSec: 0.15,
    supportsAudio: true,
  },
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

    const modelConfig = VEO_MODELS[model_key] || VEO_MODELS['veo-3.1-fast'];
    const duration = String(Math.min(duration_seconds, modelConfig.maxDuration));

    console.log(`Fashion Video: ${modelConfig.label} | ${duration}s | AR=${aspect_ratio} | audio=${generate_audio}`);

    // ── Step 1: Download the fashion image and encode to base64 ──────
    console.log('Downloading source image...');
    const { data: imageB64, mimeType: imageMime } = await downloadImageAsBase64(image_url);
    console.log(`Image downloaded: ${imageMime}, ${Math.round(imageB64.length / 1024)}KB base64`);

    // ── Step 2: Build the video generation prompt ────────────────────
    const videoPrompt = prompt?.trim()
      ? prompt.trim()
      : 'The fashion model slowly turns to show the outfit from different angles, with natural fabric movement and professional studio lighting. Smooth camera motion, cinematic quality.';

    // ── Step 3: Submit to Google Veo API ─────────────────────────────
    const requestBody: any = {
      instances: [{
        prompt: videoPrompt,
        image: {
          inlineData: {
            mimeType: imageMime.startsWith('image/') ? imageMime : 'image/jpeg',
            data: imageB64,
          },
        },
      }],
      parameters: {
        aspectRatio: aspect_ratio,
        resolution: '720p',
        durationSeconds: duration,
        negativePrompt: 'distorted face, extra limbs, deformed hands, low quality, blurry, glitch, jittery motion',
        personGeneration: 'allow_adult',
        numberOfVideos: 1,
      },
    };

    // Audio control for Veo 3+
    if (modelConfig.supportsAudio) {
      requestBody.parameters.generateAudio = generate_audio;
    }

    console.log(`Submitting to ${modelConfig.id}...`);
    const submitResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.id}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      console.error(`Veo submit error (${submitResponse.status}):`, errText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: `Video generation failed: ${errText.substring(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const submitData = await submitResponse.json();
    const operationName = submitData.name;

    if (!operationName) {
      return new Response(
        JSON.stringify({ error: 'No operation ID returned from Veo API' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Operation started: ${operationName}`);

    // ── Step 4: Poll for completion ──────────────────────────────────
    let videoUri: string | null = null;
    let attempts = 0;
    const maxAttempts = 60; // 10s intervals × 60 = 10 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10s poll interval
      attempts++;

      try {
        const statusResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
          {
            headers: { 'x-goog-api-key': apiKey },
          }
        );

        if (!statusResponse.ok) {
          console.warn(`Poll attempt ${attempts}: HTTP ${statusResponse.status}`);
          continue;
        }

        const statusData = await statusResponse.json();

        if (statusData.done) {
          // Check for error
          if (statusData.error) {
            console.error('Veo generation error:', JSON.stringify(statusData.error));
            return new Response(
              JSON.stringify({ error: `Video generation failed: ${statusData.error.message || 'Unknown error'}` }),
              { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Extract video URI
          const samples = statusData.response?.generateVideoResponse?.generatedSamples;
          if (samples?.[0]?.video?.uri) {
            videoUri = samples[0].video.uri;
            console.log(`Video ready after ${attempts * 10}s: ${videoUri}`);
          }
          break;
        }

        console.log(`Poll ${attempts}/${maxAttempts}: still processing...`);
      } catch (pollErr: any) {
        console.warn(`Poll error (attempt ${attempts}):`, pollErr.message);
      }
    }

    if (!videoUri) {
      return new Response(
        JSON.stringify({ error: 'Video generation timed out or produced no result' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 5: Download the video from Google ───────────────────────
    console.log('Downloading video from Google...');
    const videoResponse = await fetch(videoUri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoResponse.ok) {
      const errText = await videoResponse.text();
      throw new Error(`Failed to download video: ${errText.substring(0, 200)}`);
    }

    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoData = new Uint8Array(videoArrayBuffer);
    console.log(`Video downloaded: ${Math.round(videoData.length / 1024)}KB`);

    // ── Step 6: Upload to Supabase storage ───────────────────────────
    const fileName = `fashion-video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
    const { publicUrl } = await uploadToStorage('generated-content', fileName, videoData, 'video/mp4');
    console.log(`Video uploaded: ${publicUrl}`);

    // ── Step 7: Log usage ────────────────────────────────────────────
    const durationNum = parseInt(duration) || 6;
    const costUsd = durationNum * modelConfig.costPerSec;

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
          endpoint: `google/${modelConfig.id}`,
          metadata: {
            pipeline: 'fashion-video',
            model_key,
            model_label: modelConfig.label,
            duration_seconds: durationNum,
            aspect_ratio,
            generate_audio,
          },
        });
      } catch (logError) {
        console.error('Failed to log usage:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        url: publicUrl,
        model: model_key,
        model_label: modelConfig.label,
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

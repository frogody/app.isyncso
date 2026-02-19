import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const GOOGLE_VEO_API_KEY = Deno.env.get("GOOGLE_VEO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Map frontend model_key → Veo API model IDs (try in order) ──────
const MODEL_MAP: Record<string, string[]> = {
  'veo-3.1-fast': ['veo-3.1-fast-generate-preview'],
  'veo-3.1':      ['veo-3.1-generate-preview'],
  'veo-3-fast':   ['veo-3-generate-preview'],
  'veo-3':        ['veo-3-generate-preview'],
  'veo-2':        ['veo-2-generate-preview'],
};

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

// Deep-search any object for a video URI
function findVideoUri(obj: any, depth = 0): string | null {
  if (!obj || depth > 6) return null;
  if (typeof obj === 'string' && obj.startsWith('http') && (obj.includes('video') || obj.includes('file'))) return obj;
  if (obj.uri && typeof obj.uri === 'string') return obj.uri;
  if (obj.url && typeof obj.url === 'string') return obj.url;
  if (obj.videoUrl && typeof obj.videoUrl === 'string') return obj.videoUrl;
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const found = findVideoUri(obj[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
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
      ? prompt.trim()
      : 'Animate this fashion photo into a cinematic video. The model confidently strikes multiple poses, slowly turning to show the outfit from different angles. Natural fabric movement, smooth camera motion, professional studio lighting. Keep the person, outfit, and setting exactly as they appear.';

    // ── Step 3: Try Veo predictLongRunning with image input ──────────
    // Gemini API format: image wrapped in inlineData { mimeType, data }
    let videoUrl: string | null = null;
    let usedModel = 'unknown';
    let lastApiError = '';

    const modelIds = MODEL_MAP[model_key] || ['veo-3.1-fast-generate-preview'];
    const safeMime = imageMime.startsWith('image/') ? imageMime : 'image/jpeg';

    for (const modelId of modelIds) {
      try {
        console.log(`Trying model ${modelId}...`);

        const veoResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              instances: [{
                prompt: videoPrompt,
                image: {
                  inlineData: {
                    mimeType: safeMime,
                    data: imageB64,
                  },
                },
              }],
              parameters: {
                aspectRatio: aspect_ratio || '9:16',
                durationSeconds: String(duration_seconds || 8),
                personGeneration: 'allow_adult',
              },
            }),
          }
        );

        if (!veoResponse.ok) {
          const errText = await veoResponse.text();
          console.error(`${modelId} error (${veoResponse.status}):`, errText.substring(0, 500));
          lastApiError = `${modelId} (${veoResponse.status}): ${errText.substring(0, 500)}`;
          continue;
        }

        const veoData = await veoResponse.json();
        console.log(`${modelId} accepted! Response keys:`, Object.keys(veoData));

        // Get operation name for polling
        const operationName = veoData.name;
        if (!operationName) {
          console.error(`${modelId}: no operation name, checking for immediate result...`);
          const immediateUri = findVideoUri(veoData);
          if (immediateUri) {
            const videoResp = await fetch(immediateUri, {
              headers: { 'x-goog-api-key': apiKey },
            });
            if (videoResp.ok) {
              const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
              const fileName = `fashion-video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
              const { publicUrl } = await uploadToStorage('generated-content', fileName, videoBytes, 'video/mp4');
              videoUrl = publicUrl;
              usedModel = modelId;
              break;
            }
          }
          lastApiError = `${modelId}: no operation name in response`;
          continue;
        }

        // ── Poll for completion ──────────────────────────────────────
        console.log(`Polling operation: ${operationName}`);
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes max (5s intervals)

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;

          try {
            const statusResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
              { headers: { 'x-goog-api-key': apiKey } }
            );

            if (!statusResponse.ok) {
              const statusErr = await statusResponse.text();
              console.error(`Poll error (${statusResponse.status}):`, statusErr.substring(0, 200));
              if (statusResponse.status >= 400 && statusResponse.status < 500) break;
              continue;
            }

            const statusData = await statusResponse.json();

            if (statusData.done) {
              console.log(`Operation complete after ${attempts * 5}s!`);

              if (statusData.error) {
                console.error(`Operation failed:`, JSON.stringify(statusData.error).substring(0, 500));
                lastApiError = `${modelId} operation error: ${JSON.stringify(statusData.error).substring(0, 300)}`;
                break;
              }

              const responseStr = JSON.stringify(statusData.response || statusData);
              console.log(`Response structure:`, responseStr.substring(0, 500));

              // Try to find the video URI
              const foundUri = findVideoUri(statusData.response || statusData);

              if (foundUri) {
                console.log(`Found video URI: ${foundUri.substring(0, 100)}...`);
                const videoResp = await fetch(foundUri, {
                  headers: { 'x-goog-api-key': apiKey },
                });
                if (videoResp.ok) {
                  const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
                  console.log(`Downloaded video: ${videoBytes.length} bytes`);
                  const fileName = `fashion-video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
                  const { publicUrl } = await uploadToStorage('generated-content', fileName, videoBytes, 'video/mp4');
                  videoUrl = publicUrl;
                  usedModel = modelId;
                  console.log(`Video uploaded to storage: ${publicUrl}`);
                } else {
                  console.error(`Failed to download video (${videoResp.status})`);
                }
              } else {
                // Check for inline base64 video data
                const inlinePaths = [
                  statusData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.inlineData,
                  statusData.response?.generatedSamples?.[0]?.video?.inlineData,
                  statusData.response?.generatedSamples?.[0]?.inlineData,
                ];
                for (const inlineData of inlinePaths) {
                  if (inlineData?.data) {
                    console.log('Found inline base64 video data');
                    const videoBytes = Uint8Array.from(atob(inlineData.data), c => c.charCodeAt(0));
                    const fileName = `fashion-video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
                    const { publicUrl } = await uploadToStorage('generated-content', fileName, videoBytes, inlineData.mimeType || 'video/mp4');
                    videoUrl = publicUrl;
                    usedModel = modelId;
                    break;
                  }
                }

                if (!videoUrl) {
                  console.error('Done but no video found in response');
                  console.error('Full response:', responseStr.substring(0, 1000));
                  lastApiError = `${modelId}: operation done but no video in response`;
                }
              }
              break;
            }

            if (attempts % 6 === 0) {
              console.log(`Poll ${attempts}/${maxAttempts} (${attempts * 5}s elapsed)...`);
            }
          } catch (pollErr: any) {
            console.error(`Poll exception at attempt ${attempts}:`, pollErr.message);
          }
        }

        if (videoUrl) break;

        if (attempts >= maxAttempts) {
          lastApiError = `${modelId}: timed out after ${maxAttempts * 5}s`;
          console.error(lastApiError);
        }
      } catch (modelErr: any) {
        console.error(`${modelId} exception:`, modelErr.message);
        lastApiError = `${modelId} exception: ${modelErr.message}`;
        continue;
      }
    } // end model loop

    // ── Step 4: Return result ────────────────────────────────────────
    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video generation failed — Veo returned no video. This may be a temporary issue. Please try again or select a different model.', debug_last_error: lastApiError }),
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

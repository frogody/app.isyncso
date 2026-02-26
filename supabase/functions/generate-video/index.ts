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

// Veo model IDs to try in order (fastest first)
const MODEL_IDS = [
  'veo-2-generate-preview',
];

// ─── Helpers ─────────────────────────────────────────────────────────

async function uploadToStorage(
  bucket: string,
  fileName: string,
  data: Uint8Array,
  contentType: string
): Promise<string> {
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

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
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

// Upload image to Google Files API to get a fileUri for Veo
async function uploadToGoogleFiles(
  imageB64: string,
  mimeType: string,
  apiKey: string
): Promise<string | null> {
  try {
    const imageBytes = Uint8Array.from(atob(imageB64), c => c.charCodeAt(0));
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
          'X-Goog-Upload-Protocol': 'raw',
          'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: imageBytes,
      }
    );
    if (!resp.ok) {
      console.error('Files API upload error:', (await resp.text()).substring(0, 300));
      return null;
    }
    const data = await resp.json();
    const uri = data.file?.uri;
    console.log('Uploaded to Google Files:', uri);
    return uri || null;
  } catch (e: any) {
    console.error('Files API exception:', e.message);
    return null;
  }
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
    const body = await req.json();
    const {
      prompt,
      original_prompt,
      image_url,
      style,
      user_id,
    } = body;

    // Accept both field names from frontend
    const duration = body.duration || body.duration_seconds || 5;
    const aspectRatio = body.aspect_ratio || '16:9';

    // ── Credit check (50 credits for video generation) ─────────────
    if (user_id) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const credit = await requireCredits(supabaseAdmin, user_id, 'generate-video', {
        edgeFunction: 'generate-video',
        metadata: { duration, aspect_ratio: aspectRatio },
      });
      if (!credit.success) return credit.errorResponse!;
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
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

    console.log(`Product Video: duration=${duration}s, AR=${aspectRatio}, hasImage=${!!image_url}`);

    // ── Step 1: Prepare image (if provided) ───────────────────────────
    let googleFileUri: string | null = null;
    let imageB64: string | null = null;
    let imageMime = 'image/jpeg';

    if (image_url) {
      console.log('Downloading product image...');
      const img = await downloadImageAsBase64(image_url);
      imageB64 = img.data;
      imageMime = img.mimeType;
      console.log(`Image downloaded: ${imageMime}, ${Math.round(imageB64.length / 1024)}KB base64`);

      console.log('Uploading image to Google Files API...');
      googleFileUri = await uploadToGoogleFiles(imageB64, imageMime, apiKey);
    }

    // ── Step 2: Try Veo predictLongRunning ────────────────────────────
    let videoUrl: string | null = null;
    let usedModel = 'unknown';
    let lastApiError = '';

    const safeMime = imageMime.startsWith('image/') ? imageMime : 'image/jpeg';

    // Build image payload variants
    type ImagePayload = { label: string; instance: Record<string, unknown> };
    const imagePayloads: ImagePayload[] = [];

    if (image_url && googleFileUri) {
      imagePayloads.push({
        label: 'fileUri',
        instance: { prompt, image: { fileUri: googleFileUri } },
      });
    }

    if (image_url && imageB64) {
      imagePayloads.push({
        label: 'bytesBase64Encoded',
        instance: { prompt, image: { bytesBase64Encoded: imageB64, mimeType: safeMime } },
      });
    }

    // Text-only fallback (always available)
    imagePayloads.push({
      label: 'textOnly',
      instance: { prompt },
    });

    for (const modelId of MODEL_IDS) {
      for (const payload of imagePayloads) {
        try {
          console.log(`Trying ${modelId} with ${payload.label} format...`);

          const veoResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify({
                instances: [payload.instance],
                parameters: {
                  aspectRatio: aspectRatio,
                  durationSeconds: Number(duration) || 5,
                  personGeneration: 'allow_adult',
                },
              }),
            }
          );

          if (!veoResponse.ok) {
            const errText = await veoResponse.text();
            console.error(`${modelId}/${payload.label} (${veoResponse.status}):`, errText.substring(0, 300));
            lastApiError = `${modelId}/${payload.label} (${veoResponse.status}): ${errText.substring(0, 300)}`;
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
                const fileName = `videos/product-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
                videoUrl = await uploadToStorage('generated-content', fileName, videoBytes, 'video/mp4');
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
                  console.error('Operation failed:', JSON.stringify(statusData.error).substring(0, 500));
                  lastApiError = `${modelId} operation error: ${JSON.stringify(statusData.error).substring(0, 300)}`;
                  break;
                }

                const responseStr = JSON.stringify(statusData.response || statusData);
                console.log('Response structure:', responseStr.substring(0, 500));

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
                    const fileName = `videos/product-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
                    videoUrl = await uploadToStorage('generated-content', fileName, videoBytes, 'video/mp4');
                    usedModel = modelId;
                    console.log(`Video uploaded to storage: ${videoUrl}`);
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
                      const fileName = `videos/product-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
                      videoUrl = await uploadToStorage('generated-content', fileName, videoBytes, inlineData.mimeType || 'video/mp4');
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
            lastApiError = `${modelId}/${payload.label}: timed out after ${maxAttempts * 5}s`;
            console.error(lastApiError);
          }
        } catch (modelErr: any) {
          console.error(`${modelId}/${payload.label} exception:`, modelErr.message);
          lastApiError = `${modelId}/${payload.label} exception: ${modelErr.message}`;
          continue;
        }
      } // end payload loop

      if (videoUrl) break;
    } // end model loop

    // ── Return result ────────────────────────────────────────────────
    if (!videoUrl) {
      return new Response(
        JSON.stringify({
          error: 'Video generation failed. Please try again.',
          debug_last_error: lastApiError,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        url: videoUrl,
        thumbnail_url: null,
        model: usedModel,
        prompt,
        original_prompt: original_prompt || prompt,
        duration_seconds: Number(duration),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-video:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Video generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

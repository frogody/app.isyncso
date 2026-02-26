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

// Models to try — same as the working generate-fashion-video function
const MODEL_IDS = [
  'veo-3.0-generate-001',
  'veo-3-generate-preview',
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

// Upload image to Google Files API to get a fileUri
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
  if (!obj || depth > 8) return null;
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

    const duration = body.duration || body.duration_seconds || 8;
    const aspectRatio = body.aspect_ratio || '16:9';

    // ── Credit check ─────────────────────────────────────────────────
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
        JSON.stringify({ error: 'No Google API key configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Product Video: duration=${duration}s, AR=${aspectRatio}, hasImage=${!!image_url}`);

    // ── Step 1: Prepare image (if provided) ───────────────────────────
    let imageB64: string | null = null;
    let imageMime = 'image/jpeg';
    let googleFileUri: string | null = null;

    if (image_url) {
      try {
        console.log('Downloading product image...');
        const imgResult = await downloadImageAsBase64(image_url);
        imageB64 = imgResult.data;
        imageMime = imgResult.mimeType.startsWith('image/') ? imgResult.mimeType : 'image/jpeg';
        console.log(`Image downloaded: ${imageMime}, ${Math.round(imageB64.length / 1024)}KB`);

        console.log('Uploading to Google Files API...');
        googleFileUri = await uploadToGoogleFiles(imageB64, imageMime, apiKey);
      } catch (imgErr: any) {
        console.warn('Image processing failed, continuing with text-only:', imgErr.message);
      }
    }

    // ── Step 2: Build image payload variants ──────────────────────────
    // Try multiple formats per model — some models reject fileUri but accept others
    type ImagePayload = { label: string; instance: Record<string, unknown> };
    const imagePayloads: ImagePayload[] = [];

    if (googleFileUri) {
      imagePayloads.push({
        label: 'fileUri',
        instance: { prompt, image: { fileUri: googleFileUri } },
      });
    }
    if (imageB64) {
      imagePayloads.push({
        label: 'bytesBase64Encoded',
        instance: { prompt, image: { bytesBase64Encoded: imageB64, mimeType: imageMime } },
      });
      imagePayloads.push({
        label: 'inlineData',
        instance: { prompt, image: { inlineData: { mimeType: imageMime, data: imageB64 } } },
      });
    }
    // Always include text-only as final fallback
    imagePayloads.push({
      label: 'textOnly',
      instance: { prompt },
    });

    // ── Step 3: Call Veo predictLongRunning API ─────────────────────────
    let videoUrl: string | null = null;
    let usedModel = 'unknown';
    let lastApiError = '';
    const allErrors: string[] = [];

    for (const modelId of MODEL_IDS) {
      for (const payload of imagePayloads) {
        console.log(`Trying ${modelId} with ${payload.label} format...`);

        try {
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
                  durationSeconds: Number(duration) || 8,
                },
              }),
            }
          );

          if (!veoResponse.ok) {
            const errText = await veoResponse.text();
            const errMsg = `${modelId}/${payload.label} (${veoResponse.status}): ${errText.substring(0, 300)}`;
            console.error(errMsg);
            lastApiError = errMsg;
            allErrors.push(errMsg);
            continue; // try next payload format
          }

          const veoData = await veoResponse.json();
          console.log(`${modelId}/${payload.label} accepted! Keys:`, Object.keys(veoData));

          // The response is a long-running operation with a "name" field
          const operationName = veoData.name;
          if (!operationName) {
            const immediateUri = findVideoUri(veoData);
            if (immediateUri) {
              console.log('Immediate video URI found');
              const videoResp = await fetch(immediateUri, {
                headers: { 'x-goog-api-key': apiKey },
              });
              if (videoResp.ok) {
                const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
                const fileName = `videos/product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp4`;
                videoUrl = await uploadToStorage('generated-content', fileName, videoBytes, 'video/mp4');
                usedModel = modelId;
              }
            }
            if (!videoUrl) {
              lastApiError = `${modelId}/${payload.label}: no operation name`;
              console.error(lastApiError, JSON.stringify(veoData).substring(0, 500));
              allErrors.push(lastApiError);
              continue;
            }
            break; // got video from immediate result
          }

          // ── Poll for completion ──────────────────────────────────────
          console.log(`Polling operation: ${operationName}`);
          const maxAttempts = 120;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise(r => setTimeout(r, 5000));

            try {
              const statusRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
                { headers: { 'x-goog-api-key': apiKey } }
              );

              if (!statusRes.ok) {
                const statusErr = await statusRes.text();
                console.error(`Poll ${attempt} error (${statusRes.status}):`, statusErr.substring(0, 200));
                if (statusRes.status >= 400 && statusRes.status < 500) break;
                continue;
              }

              const statusData = await statusRes.json();

              if (statusData.done) {
                console.log(`Operation complete after ${attempt * 5}s!`);

                if (statusData.error) {
                  console.error('Operation error:', JSON.stringify(statusData.error).substring(0, 500));
                  lastApiError = `${modelId}: ${JSON.stringify(statusData.error).substring(0, 300)}`;
                  allErrors.push(lastApiError);
                  break;
                }

                const responseStr = JSON.stringify(statusData.response || statusData);
                console.log('Response structure:', responseStr.substring(0, 500));

                const foundUri = findVideoUri(statusData.response || statusData);

                if (foundUri) {
                  console.log(`Found video URI: ${foundUri.substring(0, 120)}`);
                  const videoResp = await fetch(foundUri, {
                    headers: { 'x-goog-api-key': apiKey },
                  });
                  if (videoResp.ok) {
                    const videoBytes = new Uint8Array(await videoResp.arrayBuffer());
                    console.log(`Downloaded video: ${videoBytes.length} bytes`);
                    const fileName = `videos/product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp4`;
                    videoUrl = await uploadToStorage('generated-content', fileName, videoBytes, 'video/mp4');
                    usedModel = modelId;
                    console.log(`Uploaded to storage: ${videoUrl}`);
                  } else {
                    const dlErr = await videoResp.text().catch(() => '');
                    console.error(`Video download failed: ${videoResp.status}`, dlErr.substring(0, 200));
                    lastApiError = `${modelId}: video download failed (${videoResp.status})`;
                    allErrors.push(lastApiError);
                  }
                } else {
                  // Check for inline base64 video
                  const inlinePaths = [
                    statusData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.inlineData,
                    statusData.response?.generatedSamples?.[0]?.video?.inlineData,
                    statusData.response?.generatedSamples?.[0]?.inlineData,
                  ];
                  for (const inlineData of inlinePaths) {
                    if (inlineData?.data) {
                      console.log('Found inline base64 video');
                      const videoBytes = Uint8Array.from(atob(inlineData.data), c => c.charCodeAt(0));
                      const fileName = `videos/product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp4`;
                      videoUrl = await uploadToStorage('generated-content', fileName, videoBytes, inlineData.mimeType || 'video/mp4');
                      usedModel = modelId;
                      break;
                    }
                  }

                  if (!videoUrl) {
                    console.error('Done but no video found:', responseStr.substring(0, 1000));
                    lastApiError = `${modelId}: done but no video in response`;
                    allErrors.push(lastApiError);
                  }
                }
                break;
              }

              if (attempt % 6 === 0) {
                console.log(`Poll ${attempt}/${maxAttempts} (${attempt * 5}s)...`);
              }
            } catch (pollErr: any) {
              console.error(`Poll exception ${attempt}:`, pollErr.message);
            }
          }

          if (videoUrl) break; // got video, exit payload loop
        } catch (err: any) {
          console.error(`${modelId}/${payload.label} exception:`, err.message);
          lastApiError = `${modelId}/${payload.label}: ${err.message}`;
          allErrors.push(lastApiError);
          continue;
        }
      } // end payload loop

      if (videoUrl) break; // got video, exit model loop
    } // end model loop

    // ── Return result ────────────────────────────────────────────────
    if (!videoUrl) {
      return new Response(
        JSON.stringify({
          error: 'Video generation failed. Please try again.',
          debug_last_error: lastApiError,
          all_errors: allErrors,
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { requireCredits, refundCredits } from '../_shared/credit-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_KEY = Deno.env.get("FAL_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// fal.ai model endpoints
const FAL_MODELS = {
  image_to_video: 'fal-ai/kling-video/v2.0/master/image-to-video',
  text_to_video: 'fal-ai/kling-video/v2.0/master/text-to-video',
};

// Helper: Upload video to Supabase Storage
async function uploadToStorage(
  bucket: string,
  fileName: string,
  videoData: Uint8Array,
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
    body: videoData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Storage upload error: ${err}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
}

// Helper: Submit job to fal.ai queue and poll for result
async function falQueueGenerate(model: string, input: Record<string, unknown>): Promise<any> {
  const queueUrl = `https://queue.fal.run/${model}`;

  // Submit to queue
  const submitRes = await fetch(queueUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`fal.ai submit failed (${submitRes.status}): ${errText}`);
  }

  const { request_id } = await submitRes.json();
  if (!request_id) throw new Error('No request_id from fal.ai queue');

  console.log(`fal.ai job submitted: ${request_id} (model: ${model})`);

  // Poll for completion (max ~4 minutes)
  const maxAttempts = 80;
  const pollInterval = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, pollInterval));

    const statusRes = await fetch(
      `${queueUrl}/requests/${request_id}/status`,
      { headers: { 'Authorization': `Key ${FAL_KEY}` } }
    );

    if (!statusRes.ok) continue;

    const status = await statusRes.json();
    console.log(`Poll ${i + 1}: ${status.status}`);

    if (status.status === 'COMPLETED') {
      // Fetch the result
      const resultRes = await fetch(
        `${queueUrl}/requests/${request_id}`,
        { headers: { 'Authorization': `Key ${FAL_KEY}` } }
      );

      if (!resultRes.ok) {
        const errText = await resultRes.text();
        throw new Error(`fal.ai result fetch failed: ${errText}`);
      }

      return await resultRes.json();
    }

    if (status.status === 'FAILED') {
      throw new Error(`fal.ai generation failed: ${status.error || 'Unknown error'}`);
    }
  }

  throw new Error('Video generation timed out after 4 minutes');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      prompt,
      original_prompt,
      style,
      image_url,
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

    if (!FAL_KEY) {
      // Refund credits if API not configured
      if (user_id) {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await refundCredits(supabaseAdmin, user_id, 'generate-video');
      }
      return new Response(
        JSON.stringify({ error: 'Video generation service not configured. FAL_KEY is missing.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Choose model based on whether we have an image
    const hasImage = !!image_url;
    const model = hasImage ? FAL_MODELS.image_to_video : FAL_MODELS.text_to_video;

    // Kling duration must be "5" or "10" (string)
    const klingDuration = duration >= 8 ? "10" : "5";

    // Build fal.ai input
    const falInput: Record<string, unknown> = {
      prompt,
      duration: klingDuration,
      aspect_ratio: aspectRatio,
    };

    if (hasImage) {
      falInput.image_url = image_url;
    }

    console.log(`Generating video: model=${model}, duration=${klingDuration}s, hasImage=${hasImage}`);

    // Submit to fal.ai queue and wait for result
    const result = await falQueueGenerate(model, falInput);

    // Extract video URL from fal.ai response
    const falVideoUrl = result?.video?.url;
    if (!falVideoUrl) {
      throw new Error('fal.ai did not return a video URL');
    }

    console.log(`Video generated: ${falVideoUrl}`);

    // Download video and re-upload to Supabase storage for permanence
    let videoUrl = falVideoUrl;
    try {
      const videoRes = await fetch(falVideoUrl);
      if (videoRes.ok) {
        const videoBytes = new Uint8Array(await videoRes.arrayBuffer());
        const fileName = `videos/generated-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp4`;
        videoUrl = await uploadToStorage('generated-content', fileName, videoBytes, 'video/mp4');
        console.log(`Video uploaded to storage: ${videoUrl}`);
      }
    } catch (uploadErr) {
      console.warn('Failed to upload to storage, using fal.ai URL:', uploadErr);
      // Fall back to fal.ai URL (temporary but functional)
    }

    return new Response(
      JSON.stringify({
        url: videoUrl,
        thumbnail_url: result?.thumbnail?.url || null,
        model: model,
        prompt,
        original_prompt: original_prompt || prompt,
        duration_seconds: parseInt(klingDuration),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-video:', error);

    // Refund credits on failure
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.user_id) {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await refundCredits(supabaseAdmin, body.user_id, 'generate-video');
      }
    } catch { /* best effort refund */ }

    return new Response(
      JSON.stringify({ error: error.message || 'Video generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

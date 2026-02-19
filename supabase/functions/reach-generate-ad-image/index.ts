import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const QUALITY_PREFIX =
  "Ultra high resolution professional photograph, 8K detail, sharp focus, masterful lighting, commercial quality";

async function uploadToStorage(
  bucket: string,
  fileName: string,
  data: Uint8Array,
  contentType: string
): Promise<string> {
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": contentType,
    },
    body: data,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Storage upload error: ${err}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      product_name,
      product_description,
      ad_headline,
      ad_primary_text,
      platform,
      dimensions,
      style,
      product_image_url,
      company_id,
      campaign_id,
      variant_index,
    } = body;

    if (!TOGETHER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Image generation not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Build the prompt
    const width = dimensions?.width || 1024;
    const height = dimensions?.height || 1024;

    const promptParts = [QUALITY_PREFIX];

    if (style === "lifestyle") {
      promptParts.push("Lifestyle product photography, natural setting, warm tones");
    } else if (style === "minimal") {
      promptParts.push("Minimalist product photography, clean white background, studio lighting");
    } else if (style === "bold") {
      promptParts.push("Bold graphic advertising style, vibrant colors, dynamic composition");
    } else {
      promptParts.push("Professional advertising campaign image, polished commercial style");
    }

    if (product_name) {
      promptParts.push(`Product: ${product_name}`);
    }
    if (product_description) {
      promptParts.push(
        `Description: ${product_description.substring(0, 200)}`
      );
    }
    if (ad_headline) {
      promptParts.push(`Ad concept: ${ad_headline}`);
    }
    if (platform) {
      promptParts.push(`Optimized for ${platform} advertising`);
    }

    const prompt = promptParts.join(". ");

    // Determine model: use Kontext if we have a reference image, otherwise FLUX Pro
    const hasReference = !!product_image_url;
    const model = hasReference
      ? "black-forest-labs/FLUX.1-Kontext-pro"
      : "black-forest-labs/FLUX.1.1-pro";
    const steps = 40;

    // Build Together.ai request
    const togetherBody: Record<string, unknown> = {
      model,
      prompt,
      width,
      height,
      steps,
      n: 1,
      response_format: "b64_json",
    };

    // Add reference image for Kontext models
    if (hasReference) {
      togetherBody.image_url = product_image_url;
    }

    console.log(
      `[reach-generate-ad-image] Generating with ${model}, ${width}x${height}, steps=${steps}`
    );

    const togetherRes = await fetch(
      "https://api.together.xyz/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(togetherBody),
      }
    );

    if (!togetherRes.ok) {
      const errText = await togetherRes.text();
      console.error("[reach-generate-ad-image] Together.ai error:", errText);
      throw new Error(`Together.ai API error: ${togetherRes.status}`);
    }

    const togetherData = await togetherRes.json();
    const b64 = togetherData?.data?.[0]?.b64_json;

    if (!b64) {
      throw new Error("No image data returned from Together.ai");
    }

    // Decode base64 to Uint8Array
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload to storage
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const fileName = `reach-ad-${timestamp}-${rand}.png`;

    const publicUrl = await uploadToStorage(
      "generated-content",
      fileName,
      bytes,
      "image/png"
    );

    console.log(`[reach-generate-ad-image] Uploaded: ${publicUrl}`);

    return new Response(
      JSON.stringify({ image_url: publicUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("[reach-generate-ad-image] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Image generation failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

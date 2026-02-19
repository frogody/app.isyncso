import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const FAL_KEY = Deno.env.get("FAL_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const QUALITY_PREFIX =
  "Ultra high resolution professional photograph, 8K detail, sharp focus, masterful lighting, commercial quality";

// FLUX supported sizes — must be multiples of 32, between 256-1440, max ~1.5MP
function snapToFluxDimensions(w: number, h: number): { width: number; height: number } {
  // Clamp to valid range
  const clamp = (v: number) => Math.max(256, Math.min(1440, v));
  let width = Math.round(clamp(w) / 32) * 32;
  let height = Math.round(clamp(h) / 32) * 32;

  // Ensure total pixels <= ~1.5MP (1536x1536 max area)
  const maxPixels = 1536 * 1536;
  if (width * height > maxPixels) {
    const scale = Math.sqrt(maxPixels / (width * height));
    width = Math.round((width * scale) / 32) * 32;
    height = Math.round((height * scale) / 32) * 32;
  }

  return { width: Math.max(256, width), height: Math.max(256, height) };
}

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

// Together.ai FLUX generation
async function tryTogether(
  prompt: string,
  width: number,
  height: number,
  referenceImageUrl?: string | null
): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!TOGETHER_API_KEY) return { success: false, error: "No Together API key" };

  const hasRef = !!referenceImageUrl;
  const model = hasRef
    ? "black-forest-labs/FLUX.1-Kontext-pro"
    : "black-forest-labs/FLUX.1.1-pro";
  const steps = hasRef ? 40 : 28;

  const dims = snapToFluxDimensions(width, height);

  const body: Record<string, unknown> = {
    model,
    prompt,
    width: dims.width,
    height: dims.height,
    steps,
    n: 1,
    response_format: "b64_json",
  };

  if (hasRef) {
    body.image_url = referenceImageUrl;
  }

  console.log(`[together] ${model}, ${dims.width}x${dims.height}, steps=${steps}`);

  try {
    const res = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[together] error:", errText);
      return { success: false, error: `Together ${res.status}: ${errText.substring(0, 200)}` };
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return { success: false, error: "No image data from Together" };

    return { success: true, data: b64 };
  } catch (e: any) {
    return { success: false, error: `Together: ${e.message}` };
  }
}

// fal.ai FLUX generation
async function tryFal(
  prompt: string,
  width: number,
  height: number
): Promise<{ success: boolean; data?: string; url?: string; error?: string }> {
  if (!FAL_KEY) return { success: false, error: "No FAL key" };

  const dims = snapToFluxDimensions(width, height);

  try {
    console.log(`[fal] flux-pro/v1.1, ${dims.width}x${dims.height}`);

    const res = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: { width: dims.width, height: dims.height },
        num_images: 1,
        enable_safety_checker: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[fal] error:", errText);
      return { success: false, error: `fal ${res.status}: ${errText.substring(0, 200)}` };
    }

    const data = await res.json();
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) return { success: false, error: "No image URL from fal" };

    return { success: true, url: imageUrl };
  } catch (e: any) {
    return { success: false, error: `fal: ${e.message}` };
  }
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
    } = body;

    // Build the prompt
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

    if (product_name) promptParts.push(`Product: ${product_name}`);
    if (product_description) promptParts.push(`Description: ${product_description.substring(0, 200)}`);
    if (ad_headline) promptParts.push(`Ad concept: ${ad_headline}`);
    if (platform) promptParts.push(`Optimized for ${platform} advertising`);

    const width = dimensions?.width || 1024;
    const height = dimensions?.height || 1024;
    const orientation = width > height ? "landscape" : width < height ? "portrait" : "square";
    promptParts.push(`${orientation} format advertisement`);

    const prompt = promptParts.join(". ");

    console.log(`[reach-generate-ad-image] prompt=${prompt.length}chars, target=${width}x${height}`);

    // Resolve product reference image URL
    const productRef = typeof product_image_url === "string" && product_image_url.startsWith("http")
      ? product_image_url
      : null;

    // Strategy 1: Together.ai FLUX (primary — works for Create module)
    const togetherResult = await tryTogether(prompt, width, height, productRef);
    if (togetherResult.success && togetherResult.data) {
      const binaryStr = atob(togetherResult.data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const ts = Date.now();
      const rand = Math.random().toString(36).substring(2, 8);
      const fileName = `reach-ad-${ts}-${rand}.png`;
      const publicUrl = await uploadToStorage("generated-content", fileName, bytes, "image/png");

      console.log(`[reach-generate-ad-image] Together success: ${publicUrl}`);
      return new Response(JSON.stringify({ image_url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.warn(`[reach-generate-ad-image] Together failed: ${togetherResult.error}`);

    // Strategy 2: fal.ai FLUX (fallback — returns URL, download & re-upload)
    const falResult = await tryFal(prompt, width, height);
    if (falResult.success && falResult.url) {
      // Download from fal and re-upload to our storage
      const imgRes = await fetch(falResult.url);
      if (imgRes.ok) {
        const imgBuffer = await imgRes.arrayBuffer();
        const bytes = new Uint8Array(imgBuffer);
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const ts = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        const fileName = `reach-ad-${ts}-${rand}.${ext}`;
        const publicUrl = await uploadToStorage("generated-content", fileName, bytes, contentType);

        console.log(`[reach-generate-ad-image] fal success: ${publicUrl}`);
        return new Response(JSON.stringify({ image_url: publicUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    console.warn(`[reach-generate-ad-image] fal failed: ${falResult.error}`);

    throw new Error(`Image generation failed. Together: ${togetherResult.error}. fal: ${falResult.error}`);
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

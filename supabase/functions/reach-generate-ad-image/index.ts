import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const QUALITY_PREFIX =
  "Ultra high resolution professional photograph, 8K detail, sharp focus, masterful lighting, commercial quality";

// Google image generation models — try newest first
const GOOGLE_MODELS = [
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
];

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

// Try generating with a Google model
async function tryGoogleModel(
  model: string,
  parts: Array<Record<string, unknown>>
): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }> {
  try {
    console.log(`[google] Trying ${model}...`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[google] ${model} error (${response.status}):`, errText.substring(0, 300));
      return { success: false, error: `${model}: ${response.status}` };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          console.log(`[google] ${model} returned image`);
          return {
            success: true,
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        }
      }
    }
    return { success: false, error: `${model}: no image in response` };
  } catch (e: any) {
    return { success: false, error: `${model}: ${e.message}` };
  }
}

// Together.ai FLUX fallback — snap dimensions to valid FLUX sizes
function snapToFluxDimensions(w: number, h: number): { width: number; height: number } {
  const clamp = (v: number) => Math.max(256, Math.min(1440, v));
  let width = Math.round(clamp(w) / 32) * 32;
  let height = Math.round(clamp(h) / 32) * 32;
  const maxPixels = 1536 * 1536;
  if (width * height > maxPixels) {
    const scale = Math.sqrt(maxPixels / (width * height));
    width = Math.round((width * scale) / 32) * 32;
    height = Math.round((height * scale) / 32) * 32;
  }
  return { width: Math.max(256, width), height: Math.max(256, height) };
}

async function tryTogether(
  prompt: string,
  width: number,
  height: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!TOGETHER_API_KEY) return { success: false, error: "No Together API key" };

  const dims = snapToFluxDimensions(width, height);
  console.log(`[together] FLUX.1.1-pro ${dims.width}x${dims.height}`);

  try {
    const res = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/FLUX.1.1-pro",
        prompt,
        width: dims.width,
        height: dims.height,
        steps: 28,
        n: 1,
        response_format: "b64_json",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
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

    // Build Google API parts — include reference image if available
    const googleParts: Array<Record<string, unknown>> = [];
    let hasReference = false;

    if (product_image_url && typeof product_image_url === "string" && product_image_url.startsWith("http")) {
      try {
        const imgRes = await fetch(product_image_url);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const imgBytes = new Uint8Array(imgBuffer);
          let binary = "";
          for (let i = 0; i < imgBytes.length; i++) {
            binary += String.fromCharCode(imgBytes[i]);
          }
          const imgB64 = btoa(binary);
          const ct = imgRes.headers.get("content-type") || "image/jpeg";
          googleParts.push({ inlineData: { mimeType: ct, data: imgB64 } });
          googleParts.push({
            text: `Use the above product image as reference. Generate a new professional ad image featuring this product. ${prompt}`,
          });
          hasReference = true;
        }
      } catch (e) {
        console.warn("[reach-generate-ad-image] Could not fetch reference image:", e);
      }
    }

    if (!hasReference) {
      googleParts.push({ text: prompt });
    }

    // ── Strategy 1: Google Gemini (primary) ──
    if (GOOGLE_API_KEY) {
      for (const model of GOOGLE_MODELS) {
        const result = await tryGoogleModel(model, googleParts);
        if (result.success && result.data) {
          const binaryStr = atob(result.data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

          const mimeType = result.mimeType || "image/png";
          const ext = mimeType.includes("png") ? "png" : "jpg";
          const ts = Date.now();
          const rand = Math.random().toString(36).substring(2, 8);
          const fileName = `reach-ad-${ts}-${rand}.${ext}`;
          const publicUrl = await uploadToStorage("generated-content", fileName, bytes, mimeType);

          console.log(`[reach-generate-ad-image] Google ${model} success: ${publicUrl}`);
          return new Response(JSON.stringify({ image_url: publicUrl }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
      console.warn("[reach-generate-ad-image] All Google models failed, trying Together fallback");
    }

    // ── Strategy 2: Together.ai FLUX (fallback) ──
    const togetherResult = await tryTogether(prompt, width, height);
    if (togetherResult.success && togetherResult.data) {
      const binaryStr = atob(togetherResult.data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const ts = Date.now();
      const rand = Math.random().toString(36).substring(2, 8);
      const fileName = `reach-ad-${ts}-${rand}.png`;
      const publicUrl = await uploadToStorage("generated-content", fileName, bytes, "image/png");

      console.log(`[reach-generate-ad-image] Together fallback success: ${publicUrl}`);
      return new Response(JSON.stringify({ image_url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("All image generation providers failed");
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

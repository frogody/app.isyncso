import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

// Try generating with a specific Google model
async function tryGoogleModel(
  model: string,
  parts: Array<Record<string, unknown>>
): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }> {
  try {
    console.log(`[reach-generate-ad-image] Trying model: ${model}`);
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
      console.error(`[reach-generate-ad-image] ${model} error:`, errText);
      return { success: false, error: `${model}: ${response.status} - ${errText.substring(0, 200)}` };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          return {
            success: true,
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        }
      }
    }
    return { success: false, error: `${model}: No image in response` };
  } catch (e: any) {
    return { success: false, error: `${model}: ${e.message}` };
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

    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Image generation not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Build the prompt
    const promptParts = [
      "Ultra high resolution professional advertisement image, 8K detail, sharp focus, masterful lighting, commercial quality",
    ];

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
      promptParts.push(`Description: ${product_description.substring(0, 200)}`);
    }
    if (ad_headline) {
      promptParts.push(`Ad concept: ${ad_headline}`);
    }
    if (platform) {
      promptParts.push(`Optimized for ${platform} advertising`);
    }

    const width = dimensions?.width || 1024;
    const height = dimensions?.height || 1024;
    promptParts.push(
      `Image dimensions: ${width}x${height} pixels, ${width > height ? "landscape" : width < height ? "portrait" : "square"} format`
    );

    const prompt = promptParts.join(". ");

    console.log(`[reach-generate-ad-image] Generating image, prompt length=${prompt.length}`);

    // Build request parts - include reference image if provided
    const parts: Array<Record<string, unknown>> = [];
    let hasReference = false;

    if (product_image_url) {
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
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          parts.push({
            inlineData: { mimeType: contentType, data: imgB64 },
          });
          parts.push({
            text: `Use the above product image as reference. Generate a new professional ad image featuring this product. ${prompt}`,
          });
          hasReference = true;
        }
      } catch (e) {
        console.warn("[reach-generate-ad-image] Could not fetch reference image:", e);
      }
    }

    if (!hasReference) {
      parts.push({ text: prompt });
    }

    // Try models in order: nano-banana (best for product images) → gemini-2.0-flash-exp → gemini-2.0-flash
    const models = hasReference
      ? ["nano-banana-pro-preview", "gemini-2.0-flash-exp", "gemini-2.0-flash"]
      : ["gemini-2.0-flash-exp", "gemini-2.0-flash", "nano-banana-pro-preview"];

    let lastError = "";
    for (const model of models) {
      const result = await tryGoogleModel(model, parts);
      if (result.success && result.data) {
        // Decode base64 to Uint8Array
        const binaryStr = atob(result.data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // Upload to storage
        const mimeType = result.mimeType || "image/png";
        const ext = mimeType.includes("png") ? "png" : "jpg";
        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        const fileName = `reach-ad-${timestamp}-${rand}.${ext}`;

        const publicUrl = await uploadToStorage(
          "generated-content",
          fileName,
          bytes,
          mimeType
        );

        console.log(`[reach-generate-ad-image] Success with ${model}, uploaded: ${publicUrl}`);

        return new Response(JSON.stringify({ image_url: publicUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      lastError = result.error || "Unknown error";
      console.warn(`[reach-generate-ad-image] ${model} failed: ${lastError}`);
    }

    throw new Error(`All models failed. Last error: ${lastError}`);
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

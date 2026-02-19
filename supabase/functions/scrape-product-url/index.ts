import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

// =============================================================================
// HELPERS
// =============================================================================

function validateEan(ean: string | null | undefined): string | null {
  if (!ean) return null;
  const cleaned = String(ean).replace(/\D/g, "");
  if (cleaned.length === 13 || cleaned.length === 8) {
    return cleaned;
  }
  return null;
}

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    const hasImageExtension =
      /\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(url);
    const isImageCdn =
      /(images|img|cdn|media|static|assets)/i.test(parsed.hostname) ||
      /(images|img|cdn|media|photo|product)/i.test(parsed.pathname);
    const hasImageParams = /image|img|photo|product/i.test(parsed.search);

    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      (hasImageExtension || isImageCdn || hasImageParams)
    );
  } catch {
    return false;
  }
}

// =============================================================================
// TAVILY SEARCH (proven to work - same as research-product)
// =============================================================================

async function searchWithTavily(
  url: string,
  retryCount = 0
): Promise<{ content: string; images: string[] }> {
  if (!TAVILY_API_KEY) {
    console.log("[Tavily] No API key");
    return { content: "", images: [] };
  }

  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1500;

  // Strategy: use the URL directly as the search query — Tavily will
  // crawl it and return the page content. This is the same approach
  // that works in research-product.
  try {
    console.log(`[Tavily] Search attempt ${retryCount + 1}`);

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: url,
        search_depth: "advanced",
        include_answer: true,
        include_raw_content: true,
        include_images: true,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Tavily] Search failed (${response.status}): ${errText}`);

      if (
        (response.status >= 500 || response.status === 429) &&
        retryCount < MAX_RETRIES
      ) {
        await new Promise((r) =>
          setTimeout(r, RETRY_DELAY * (retryCount + 1))
        );
        return searchWithTavily(url, retryCount + 1);
      }
      return { content: "", images: [] };
    }

    const data = await response.json();
    const results = data.results || [];

    // Combine ALL results content for maximum data coverage
    let content = "";
    if (data.answer) {
      content += data.answer + "\n\n";
    }
    for (const r of results) {
      const chunk = r.raw_content || r.content || "";
      if (chunk) content += chunk + "\n\n";
    }
    content = content.trim();

    // Collect images from all results
    const images: string[] = [];
    if (data.images) images.push(...data.images);
    for (const r of results) {
      if (r.images) images.push(...r.images);
    }

    console.log(
      `[Tavily] Got ${content.length} chars, ${images.length} images from ${results.length} results`
    );
    return { content, images: [...new Set(images)] };
  } catch (err) {
    console.error("[Tavily] Search error:", err);
    if (retryCount < MAX_RETRIES) {
      await new Promise((r) =>
        setTimeout(r, RETRY_DELAY * (retryCount + 1))
      );
      return searchWithTavily(url, retryCount + 1);
    }
    return { content: "", images: [] };
  }
}

// =============================================================================
// DIRECT URL FETCH (secondary source)
// =============================================================================

async function fetchPageContent(
  url: string
): Promise<{ text: string; images: string[] }> {
  try {
    console.log(`[Fetch] Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,nl;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.log(`[Fetch] HTTP ${response.status}`);
      return { text: "", images: [] };
    }

    const html = await response.text();
    console.log(`[Fetch] Got ${html.length} chars HTML`);

    // Extract text
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<!--[\s\S]*?-->/g, "");
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, "\n");
    text = text.replace(/<[^>]+>/g, " ");
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/\s+/g, " ");
    text = text.replace(/\n\s+/g, "\n");
    text = text.replace(/\n+/g, "\n");
    text = text.trim();

    // Extract images
    const images: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      if (match[1] && isValidImageUrl(match[1])) images.push(match[1]);
    }
    const ogRegex =
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
    while ((match = ogRegex.exec(html)) !== null) {
      if (match[1]) images.push(match[1]);
    }

    console.log(`[Fetch] Extracted ${text.length} chars text, ${images.length} images`);
    return { text, images: [...new Set(images)] };
  } catch (err) {
    console.error("[Fetch] Error:", err);
    return { text: "", images: [] };
  }
}

// =============================================================================
// LLM EXTRACTION (Together.ai only)
// =============================================================================

const EXTRACTION_PROMPT = `You are a product data extractor. Given raw text content from a product listing page, extract all product information into a structured JSON object.

Return ONLY valid JSON with this exact structure (use null for missing fields):
{
  "name": "Product name",
  "brand": "Brand name",
  "description": "Full product description",
  "ean": "EAN/barcode number (13 or 8 digits only)",
  "mpn": "Manufacturer Part Number",
  "category": "Product category",
  "price": 29.99,
  "compare_at_price": 39.99,
  "currency": "EUR",
  "specifications": [
    {"name": "Color", "value": "Black"},
    {"name": "Weight", "value": "250g"}
  ],
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "weight": 0.25,
  "weight_unit": "kg",
  "dimensions": {"length": 10, "width": 5, "height": 3},
  "country_of_origin": "Netherlands"
}

Rules:
- Extract ALL specifications/features you can find
- For price, extract the numeric value only (no currency symbols)
- For EAN/barcode, only include if it's a valid 13 or 8-digit number
- For images, include ALL product image URLs you find in the content
- For weight, convert to kg
- For dimensions, use cm
- Return ONLY the JSON object, no other text`;

async function callLLM(content: string): Promise<any> {
  if (!TOGETHER_API_KEY) {
    console.error("[LLM] No TOGETHER_API_KEY");
    return null;
  }

  try {
    console.log(`[LLM] Sending ${content.length} chars to Together.ai...`);
    const res = await fetch("https://api.together.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          {
            role: "user",
            content: `Extract product data from this listing:\n\n${content.substring(0, 12000)}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[LLM] Together error ${res.status}: ${errBody}`);
      return null;
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[LLM] Non-JSON response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[LLM] Extracted: "${parsed.name}"`);
    return parsed;
  } catch (err) {
    console.error("[LLM] Failed:", err);
    return null;
  }
}

// =============================================================================
// IMAGE DOWNLOAD
// =============================================================================

async function downloadAndStoreImages(
  supabase: any,
  userId: string,
  images: string[],
  productName: string
): Promise<Array<{ url: string; alt: string; uploaded_at: string }>> {
  const storedImages: Array<{
    url: string;
    alt: string;
    uploaded_at: string;
  }> = [];
  const maxImages = 8;

  for (let i = 0; i < Math.min(images.length, maxImages); i++) {
    try {
      const imageUrl = images[i];
      console.log(
        `[Image] Downloading ${i + 1}/${Math.min(images.length, maxImages)}: ${imageUrl.substring(0, 80)}...`
      );

      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          Referer: new URL(imageUrl).origin + "/",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        console.log(`[Image] Failed ${i + 1}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) continue;

      const extension = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : contentType.includes("gif")
            ? "gif"
            : "jpg";

      const blob = await response.blob();
      if (blob.size < 1000) continue;

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const filename = `${userId}/imports/${timestamp}-${randomId}-${i}.${extension}`;

      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(filename, buffer, { contentType, upsert: false });

      if (error) {
        console.log(`[Image] Upload failed: ${error.message}`);
        continue;
      }

      if (data) {
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filename);

        if (urlData?.publicUrl) {
          storedImages.push({
            url: urlData.publicUrl,
            alt: productName || `Product image ${i + 1}`,
            uploaded_at: new Date().toISOString(),
          });
        }
      }
    } catch (imgError) {
      console.error(`[Image] Error ${i + 1}:`, imgError);
    }
  }

  console.log(`[Image] Stored ${storedImages.length} images`);
  return storedImages;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, userId } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "url is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Scrape] Starting for: ${url}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fetch content from multiple sources in parallel
    const [tavilyResult, fetchResult] = await Promise.all([
      searchWithTavily(url),
      fetchPageContent(url),
    ]);

    // Combine all content — prefer Tavily (more reliable via search API)
    const contentForLLM = tavilyResult.content || fetchResult.text;
    const allImages = [
      ...tavilyResult.images,
      ...fetchResult.images,
    ].filter((u, i, a) => isValidImageUrl(u) && a.indexOf(u) === i);

    console.log(
      `[Scrape] Content: ${contentForLLM.length} chars, Images found: ${allImages.length}`
    );

    if (!contentForLLM || contentForLLM.length < 30) {
      return new Response(
        JSON.stringify({
          error:
            "Could not fetch content from this URL. Try a different product link.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: LLM extraction via Together.ai
    const extracted = await callLLM(contentForLLM);

    if (!extracted) {
      return new Response(
        JSON.stringify({
          error: "Failed to extract product data. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Merge LLM-extracted images with scraped images
    const mergedImages = [
      ...(extracted.images || []),
      ...allImages,
    ].filter(
      (imgUrl: string, idx: number, arr: string[]) =>
        isValidImageUrl(imgUrl) && arr.indexOf(imgUrl) === idx
    );

    // Step 4: Download images
    const storedImages = await downloadAndStoreImages(
      supabase,
      userId,
      mergedImages,
      extracted.name || "Product"
    );

    // Step 5: Return result
    const result = {
      name: extracted.name || null,
      brand: extracted.brand || null,
      description: extracted.description || null,
      ean: validateEan(extracted.ean),
      mpn: extracted.mpn || null,
      category: extracted.category || null,
      price: extracted.price ? Number(extracted.price) : null,
      compare_at_price: extracted.compare_at_price
        ? Number(extracted.compare_at_price)
        : null,
      currency: extracted.currency || "EUR",
      specifications: Array.isArray(extracted.specifications)
        ? extracted.specifications
        : [],
      images: storedImages,
      weight: extracted.weight ? Number(extracted.weight) : null,
      weight_unit: extracted.weight_unit || "kg",
      dimensions: extracted.dimensions || null,
      country_of_origin: extracted.country_of_origin || null,
      source_url: url,
    };

    console.log(
      `[Scrape] Done. Name: "${result.name}", EAN: ${result.ean}, Images: ${result.images.length}, Specs: ${result.specifications.length}`
    );

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Scrape] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

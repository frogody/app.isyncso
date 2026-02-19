import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
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
// TAVILY EXTRACT
// =============================================================================

async function extractWithTavily(url: string): Promise<string> {
  if (!TAVILY_API_KEY) {
    console.log("[Tavily] No API key, skipping extract");
    return "";
  }

  try {
    console.log(`[Tavily] Extracting content from: ${url}`);
    const response = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        urls: [url],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Tavily] Extract failed (${response.status}): ${errText}`);
      return "";
    }

    const data = await response.json();
    const content = data.results?.[0]?.raw_content || data.results?.[0]?.text || "";
    console.log(`[Tavily] Extracted ${content.length} chars`);
    return content;
  } catch (err) {
    console.error("[Tavily] Extract error:", err);
    return "";
  }
}

// =============================================================================
// HTML FETCH + EXTRACT (fallback)
// =============================================================================

async function fetchPageHtml(url: string): Promise<string> {
  try {
    console.log(`[Fetch] Fetching HTML from: ${url}`);
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
      console.error(`[Fetch] Failed: ${response.status}`);
      return "";
    }

    const html = await response.text();
    console.log(`[Fetch] Got ${html.length} chars of HTML`);
    return html;
  } catch (err) {
    console.error("[Fetch] Error:", err);
    return "";
  }
}

function extractTextFromHtml(html: string): string {
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
  return text.trim();
}

function extractImageUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  // Match src attributes from img tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1] && isValidImageUrl(match[1])) {
      urls.push(match[1]);
    }
  }
  // Match og:image meta tags
  const ogRegex =
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  while ((match = ogRegex.exec(html)) !== null) {
    if (match[1]) urls.push(match[1]);
  }
  // Deduplicate
  return [...new Set(urls)];
}

// =============================================================================
// LLM EXTRACTION
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
  const llmPayload = {
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
  };

  const providers = [
    ...(GROQ_API_KEY
      ? [
          {
            url: "https://api.groq.com/openai/v1/chat/completions",
            key: GROQ_API_KEY,
            model: "llama-3.3-70b-versatile",
            name: "Groq",
          },
        ]
      : []),
    ...(TOGETHER_API_KEY
      ? [
          {
            url: "https://api.together.ai/v1/chat/completions",
            key: TOGETHER_API_KEY,
            model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            name: "Together",
          },
        ]
      : []),
  ];

  for (const provider of providers) {
    try {
      console.log(`[LLM] Trying ${provider.name}...`);
      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: provider.model, ...llmPayload }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(
          `[LLM] ${provider.name} error ${res.status}: ${errBody}`
        );
        continue;
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) continue;

      // Parse JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`[LLM] ${provider.name} returned non-JSON`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`[LLM] ${provider.name} extracted successfully`);
      return parsed;
    } catch (err) {
      console.error(`[LLM] ${provider.name} failed:`, err);
      continue;
    }
  }

  return null;
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
          "Accept-Language": "en-US,en;q=0.9",
          Referer: new URL(imageUrl).origin + "/",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "same-origin",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        console.log(`[Image] Failed ${i + 1}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) {
        console.log(`[Image] Not an image (${contentType}), skipping`);
        continue;
      }

      const extension = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : contentType.includes("gif")
            ? "gif"
            : "jpg";

      const blob = await response.blob();
      if (blob.size < 1000) {
        console.log(`[Image] Too small (${blob.size} bytes), skipping`);
        continue;
      }

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const filename = `${userId}/imports/${timestamp}-${randomId}-${i}.${extension}`;

      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(filename, buffer, { contentType, upsert: false });

      if (error) {
        console.log(`[Image] Upload failed ${i + 1}: ${error.message}`);
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
          console.log(`[Image] Stored ${i + 1}: ${urlData.publicUrl}`);
        }
      }
    } catch (imgError) {
      console.error(`[Image] Error downloading image ${i + 1}:`, imgError);
    }
  }

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

    // Validate URL
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

    console.log(`[Scrape] Starting extraction for: ${url}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fetch page HTML + Tavily extract in parallel
    const [html, tavilyContent] = await Promise.all([
      fetchPageHtml(url),
      extractWithTavily(url),
    ]);

    if (!html && !tavilyContent) {
      return new Response(
        JSON.stringify({
          error: "Could not fetch any content from the URL",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Combine content sources for LLM
    const htmlText = html ? extractTextFromHtml(html) : "";
    const htmlImages = html ? extractImageUrlsFromHtml(html) : [];

    // Prefer Tavily content (cleaner), fall back to HTML text
    const contentForLLM = tavilyContent || htmlText;

    if (!contentForLLM || contentForLLM.length < 50) {
      return new Response(
        JSON.stringify({
          error: "Could not extract meaningful content from the URL",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: LLM extraction
    console.log(
      `[Scrape] Sending ${contentForLLM.length} chars to LLM for extraction`
    );
    const extracted = await callLLM(contentForLLM);

    if (!extracted) {
      return new Response(
        JSON.stringify({
          error: "Failed to extract product data from the page content",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Merge image sources — LLM-extracted + HTML-extracted
    const allImageUrls = [
      ...(extracted.images || []),
      ...htmlImages,
    ].filter(
      (imgUrl: string, idx: number, arr: string[]) =>
        isValidImageUrl(imgUrl) && arr.indexOf(imgUrl) === idx
    );

    console.log(`[Scrape] Found ${allImageUrls.length} unique image URLs`);

    // Step 5: Download images to Supabase storage
    const storedImages = await downloadAndStoreImages(
      supabase,
      userId,
      allImageUrls,
      extracted.name || "Product"
    );

    console.log(`[Scrape] Successfully stored ${storedImages.length} images`);

    // Step 6: Build response
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

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

/** Get the root domain from a hostname (e.g. "www.bol.com" -> "bol.com") */
function getRootDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

/** Known CDN domain mappings for popular retailers */
const CDN_DOMAIN_MAP: Record<string, string[]> = {
  "bol.com": ["s-bol.com", "media.s-bol.com", "bol.com"],
  "amazon.com": ["amazon.com", "images-amazon.com", "media-amazon.com", "m.media-amazon.com"],
  "amazon.nl": ["amazon.nl", "images-amazon.com", "media-amazon.com", "m.media-amazon.com"],
  "amazon.de": ["amazon.de", "images-amazon.com", "media-amazon.com", "m.media-amazon.com"],
  "coolblue.nl": ["coolblue.nl", "image.coolblue.nl"],
  "coolblue.be": ["coolblue.be", "image.coolblue.nl"],
  "mediamarkt.nl": ["mediamarkt.nl", "assets.mmsrg.com"],
  "mediamarkt.de": ["mediamarkt.de", "assets.mmsrg.com"],
  "zalando.nl": ["zalando.nl", "img01.ztat.net"],
  "ikea.com": ["ikea.com", "ikea.net"],
  "aliexpress.com": ["aliexpress.com", "ae01.alicdn.com"],
  "ebay.com": ["ebay.com", "i.ebayimg.com"],
  "etsy.com": ["etsy.com", "i.etsystatic.com"],
};

/** Check if an image URL belongs to (or is related to) the target site */
function isImageFromTargetDomain(imageUrl: string, targetHostname: string): boolean {
  try {
    const imgHost = new URL(imageUrl).hostname.toLowerCase();
    const targetFamily = getDomainFamily(targetHostname);

    // Check if image is from the target's domain family
    if (targetFamily.some(d => imgHost.includes(d) || imgHost.endsWith("." + d))) {
      return true;
    }

    // Also check CDN domain map for additional CDN patterns
    const targetRoot = getRootDomain(targetHostname.toLowerCase());
    const cdnDomains = CDN_DOMAIN_MAP[targetRoot];
    if (cdnDomains) {
      return cdnDomains.some(cdn => imgHost.includes(cdn) || imgHost.endsWith("." + cdn));
    }

    return false;
  } catch {
    return false;
  }
}

/** Domain family groups — these domains share CDNs and are NOT competitors of each other */
const DOMAIN_FAMILIES: string[][] = [
  ["amazon.com", "amazon.nl", "amazon.de", "amazon.co.uk", "amazon.fr", "amazon.es", "amazon.it",
   "images-amazon.com", "media-amazon.com", "m.media-amazon.com", "images-eu.ssl-images-amazon.com"],
  ["bol.com", "s-bol.com", "media.s-bol.com"],
  ["coolblue.nl", "coolblue.be", "image.coolblue.nl"],
  ["mediamarkt.nl", "mediamarkt.de", "assets.mmsrg.com"],
  ["ebay.com", "i.ebayimg.com", "ebay.nl", "ebay.de"],
  ["aliexpress.com", "ae01.alicdn.com"],
  ["zalando.nl", "zalando.de", "img01.ztat.net"],
];

/** Get the family of a domain (returns all related domains) */
function getDomainFamily(hostname: string): string[] {
  const lower = hostname.toLowerCase();
  for (const family of DOMAIN_FAMILIES) {
    if (family.some(d => lower.includes(d) || lower.endsWith("." + d))) {
      return family;
    }
  }
  return [getRootDomain(hostname)];
}

/** Filter out images from competitor retailers */
function isFromCompetitorRetailer(imageUrl: string, targetHostname: string): boolean {
  try {
    const imgHost = new URL(imageUrl).hostname.toLowerCase();
    const targetFamily = getDomainFamily(targetHostname);

    // If the image is from the same family as target, it's NOT a competitor
    if (targetFamily.some(d => imgHost.includes(d) || imgHost.endsWith("." + d))) {
      return false;
    }

    // Check if the image is from a known retailer (that's NOT our target family)
    const allRetailerDomains = DOMAIN_FAMILIES.flat();
    return allRetailerDomains.some(d => imgHost.includes(d) || imgHost.endsWith("." + d));
  } catch {
    return false;
  }
}

// =============================================================================
// TAVILY SEARCH — prioritize target URL result
// =============================================================================

interface TavilyResult {
  primaryContent: string;
  supplementaryContent: string;
  tavilyAnswer: string;      // Tavily's synthesized answer (clean summary)
  primaryImages: string[];   // Images from target domain
  topImages: string[];       // Tavily's curated top-level images (very relevant)
  allImages: string[];       // All images from all results
}

async function searchWithTavily(
  url: string,
  targetHostname: string,
  retryCount = 0
): Promise<TavilyResult> {
  const empty: TavilyResult = {
    primaryContent: "",
    supplementaryContent: "",
    tavilyAnswer: "",
    primaryImages: [],
    topImages: [],
    allImages: [],
  };

  if (!TAVILY_API_KEY) {
    console.log("[Tavily] No API key");
    return empty;
  }

  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1500;

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
        return searchWithTavily(url, targetHostname, retryCount + 1);
      }
      return empty;
    }

    const data = await response.json();
    const results = data.results || [];
    const targetRoot = getRootDomain(targetHostname);

    // Separate primary result (matching target URL) from supplementary
    let primaryContent = "";
    let supplementaryContent = "";
    let tavilyAnswer = "";
    const primaryImages: string[] = [];
    const topImages: string[] = [];
    const allImages: string[] = [];

    // Tavily's synthesized answer — clean, concise product summary
    if (data.answer) {
      tavilyAnswer = data.answer;
    }

    for (const r of results) {
      const resultHost = r.url ? getRootDomain(new URL(r.url).hostname) : "";
      const rawContent = r.raw_content || r.content || "";

      if (resultHost === targetRoot) {
        // This result is from the target site — primary
        primaryContent += rawContent + "\n\n";
        if (r.images) primaryImages.push(...r.images);
        // Also extract image URLs embedded in the text content
        const embeddedImgs = extractImageUrlsFromText(rawContent, targetHostname);
        primaryImages.push(...embeddedImgs);
      } else {
        // From another site — supplementary only
        supplementaryContent += rawContent + "\n\n";
        if (r.images) allImages.push(...r.images);
      }
    }

    // Top-level Tavily images are curated — highly relevant to the query
    if (data.images) {
      topImages.push(...data.images);
      allImages.push(...data.images);
    }

    // Also scan ALL raw content for image URLs from target domain's CDN
    // This catches images embedded in text that Tavily didn't surface as images
    const allRawContent = results.map((r: any) => r.raw_content || "").join("\n");
    if (allRawContent) {
      const extraImgs = extractImageUrlsFromText(allRawContent, targetHostname);
      primaryImages.push(...extraImgs);
    }

    console.log(
      `[Tavily] Primary: ${primaryContent.length} chars, ${primaryImages.length} target imgs | ` +
      `Top: ${topImages.length} curated imgs | ` +
      `Supplementary: ${supplementaryContent.length} chars, ${allImages.length} total imgs | ` +
      `${results.length} results`
    );

    return {
      primaryContent: primaryContent.trim(),
      supplementaryContent: supplementaryContent.trim(),
      tavilyAnswer: tavilyAnswer.trim(),
      primaryImages: [...new Set(primaryImages)],
      topImages: [...new Set(topImages)],
      allImages: [...new Set(allImages)],
    };
  } catch (err) {
    console.error("[Tavily] Search error:", err);
    if (retryCount < MAX_RETRIES) {
      await new Promise((r) =>
        setTimeout(r, RETRY_DELAY * (retryCount + 1))
      );
      return searchWithTavily(url, targetHostname, retryCount + 1);
    }
    return empty;
  }
}

// =============================================================================
// DIRECT URL FETCH — extract product images from actual HTML
// =============================================================================

async function fetchPageContent(
  url: string,
  targetHostname: string
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

    // Extract ALL image URLs from HTML
    const allImgUrls: string[] = [];

    // 1. Standard <img> tags
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      if (match[1]) allImgUrls.push(match[1]);
    }

    // 2. data-src / data-lazy / data-zoom attributes (lazy-loaded images)
    const dataSrcRegex = /data-(?:src|lazy|zoom|image|original|full)=["']([^"']+)["']/gi;
    while ((match = dataSrcRegex.exec(html)) !== null) {
      if (match[1]) allImgUrls.push(match[1]);
    }

    // 3. srcset attribute (responsive images — pick largest)
    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    while ((match = srcsetRegex.exec(html)) !== null) {
      const srcset = match[1];
      const entries = srcset.split(",").map(s => s.trim().split(/\s+/));
      // Pick the last (usually largest) entry
      if (entries.length > 0) {
        const largest = entries[entries.length - 1][0];
        if (largest) allImgUrls.push(largest);
      }
    }

    // 4. og:image meta tag
    const ogRegex =
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
    while ((match = ogRegex.exec(html)) !== null) {
      if (match[1]) allImgUrls.push(match[1]);
    }

    // 5. JSON-LD structured data (many retailers embed product images here)
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        extractImagesFromJsonLd(jsonData, allImgUrls);
      } catch { /* ignore parse errors */ }
    }

    // 6. Look for image URLs in JavaScript/data attributes (product gallery arrays)
    const jsImageRegex = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"']*)?)["']/gi;
    while ((match = jsImageRegex.exec(html)) !== null) {
      if (match[1]) allImgUrls.push(match[1]);
    }

    // 7. CSS background-image URLs
    const bgImageRegex = /background-image:\s*url\(["']?(https?:\/\/[^"')]+)["']?\)/gi;
    while ((match = bgImageRegex.exec(html)) !== null) {
      if (match[1]) allImgUrls.push(match[1]);
    }

    // 8. Special: bol.com image pattern (media.s-bol.com)
    const bolImageRegex = /https?:\/\/media\.s-bol\.com\/[^\s"'<>)]+/gi;
    while ((match = bolImageRegex.exec(html)) !== null) {
      allImgUrls.push(match[0]);
    }

    // Resolve relative URLs and filter
    const baseUrl = new URL(url);
    const resolvedImages: string[] = [];
    const seen = new Set<string>();

    for (const imgUrl of allImgUrls) {
      try {
        let resolved = imgUrl;
        if (imgUrl.startsWith("//")) {
          resolved = "https:" + imgUrl;
        } else if (imgUrl.startsWith("/")) {
          resolved = baseUrl.origin + imgUrl;
        }

        // Normalize to remove size parameters for deduplication
        const normalized = normalizeImageUrl(resolved);
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        // Only keep images from target domain
        if (isValidImageUrl(resolved) && isImageFromTargetDomain(resolved, targetHostname)) {
          resolvedImages.push(resolved);
        }
      } catch { /* skip invalid */ }
    }

    console.log(
      `[Fetch] Extracted ${text.length} chars text, ${resolvedImages.length} target-domain images (from ${allImgUrls.length} total)`
    );
    return { text, images: resolvedImages };
  } catch (err) {
    console.error("[Fetch] Error:", err);
    return { text: "", images: [] };
  }
}

/** Extract image URLs from JSON-LD data recursively */
function extractImagesFromJsonLd(data: any, images: string[]) {
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) extractImagesFromJsonLd(item, images);
    return;
  }
  if (typeof data === "object") {
    if (data.image) {
      if (typeof data.image === "string") images.push(data.image);
      else if (Array.isArray(data.image)) {
        for (const img of data.image) {
          if (typeof img === "string") images.push(img);
          else if (img?.url) images.push(img.url);
          else if (img?.contentUrl) images.push(img.contentUrl);
        }
      } else if (data.image?.url) images.push(data.image.url);
      else if (data.image?.contentUrl) images.push(data.image.contentUrl);
    }
    // Also check for product gallery patterns
    if (data.images) extractImagesFromJsonLd(data.images, images);
    if (data["@graph"]) extractImagesFromJsonLd(data["@graph"], images);
  }
}

/** Normalize image URL for deduplication — strip size/quality params */
function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove common resize parameters
    parsed.searchParams.delete("w");
    parsed.searchParams.delete("h");
    parsed.searchParams.delete("width");
    parsed.searchParams.delete("height");
    parsed.searchParams.delete("quality");
    parsed.searchParams.delete("q");
    parsed.searchParams.delete("size");
    parsed.searchParams.delete("resize");
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}

/**
 * Deduplicate images that are the same content at different sizes.
 * bol.com pattern: media.s-bol.com/{imageId}/{variant}/{WxH}.jpg
 * General pattern: same base path with different size suffixes
 */
function deduplicateByContent(images: string[]): string[] {
  // Group images by their "content ID" — the path without size info
  const groups = new Map<string, Array<{ url: string; area: number }>>();

  for (const url of images) {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split("/");

      // Detect bol.com pattern: /{id}/{variant}/{WxH}.{ext}
      let contentId: string;
      const lastPart = pathParts[pathParts.length - 1] || "";
      const sizeMatch = lastPart.match(/^(\d+)x(\d+)\./);

      if (parsed.hostname.includes("s-bol.com") && pathParts.length >= 3) {
        // Group by the first two path segments (image ID + variant)
        contentId = parsed.hostname + "/" + pathParts.slice(1, -1).join("/");
      } else if (sizeMatch) {
        // Generic size pattern: group by everything before the size
        contentId = parsed.hostname + "/" + pathParts.slice(1, -1).join("/");
      } else {
        // No size pattern detected — use normalized URL as the key
        contentId = normalizeImageUrl(url);
      }

      const width = sizeMatch ? parseInt(sizeMatch[1]) : 1000;
      const height = sizeMatch ? parseInt(sizeMatch[2]) : 1000;
      const area = width * height;

      if (!groups.has(contentId)) {
        groups.set(contentId, []);
      }
      groups.get(contentId)!.push({ url, area });
    } catch {
      // If parsing fails, just keep it
      groups.set(url, [{ url, area: 0 }]);
    }
  }

  // From each group, pick the largest image
  const result: string[] = [];
  for (const variants of groups.values()) {
    variants.sort((a, b) => b.area - a.area);
    result.push(variants[0].url);
  }

  return result;
}

// =============================================================================
// JINA AI READER — headless browser rendering (free, great for JS-heavy sites)
// =============================================================================

async function fetchViaJinaReader(
  url: string,
  targetHostname: string
): Promise<{ text: string; images: string[] }> {
  try {
    console.log(`[Jina] Fetching via r.jina.ai...`);
    const jinaUrl = `https://r.jina.ai/${url}`;

    const response = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "text",
      },
    });

    if (!response.ok) {
      console.log(`[Jina] HTTP ${response.status}`);
      return { text: "", images: [] };
    }

    const content = await response.text();
    console.log(`[Jina] Got ${content.length} chars`);

    // Detect blocked/error pages (common anti-bot responses)
    const blockedPatterns = [
      /ip address .* is blocked/i,
      /access .* (?:temporarily )?blocked/i,
      /captcha/i,
      /please verify you are a human/i,
      /enable javascript/i,
      /403 forbidden/i,
      /404 not found/i,
      /503 .*(?:service|unavailable|fout)/i,
      /please turn off your vpn/i,
      /automated (?:access|request|script)/i,
      /bot detection/i,
      /too many requests/i,
      /rate limit/i,
      /service (?:niet beschikbaar|unavailable)/i,
      /er is een fout opgetreden/i,
      /error.*processing your request/i,
      /Target URL returned error/i,
    ];
    if (content.length < 300 || blockedPatterns.some(p => p.test(content.substring(0, 2000)))) {
      console.log(`[Jina] Blocked or error page detected`);
      return { text: "", images: [] };
    }

    // Extract image URLs from markdown content
    const images: string[] = [];

    // Markdown image syntax: ![alt](url)
    const mdImgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = mdImgRegex.exec(content)) !== null) {
      if (match[1] && isImageFromTargetDomain(match[1], targetHostname)) {
        images.push(match[1]);
      }
    }

    // Also look for raw image URLs in the text
    const urlRegex = /https?:\/\/[^\s)\]>]+\.(?:jpg|jpeg|png|webp|avif|gif)(?:\?[^\s)\]>]*)?/gi;
    while ((match = urlRegex.exec(content)) !== null) {
      if (isImageFromTargetDomain(match[0], targetHostname)) {
        images.push(match[0]);
      }
    }

    // CDN-specific patterns (like media.s-bol.com)
    const cdnPatterns = CDN_DOMAIN_MAP[getRootDomain(targetHostname)] || [];
    for (const cdn of cdnPatterns) {
      const cdnRegex = new RegExp(`https?://[^\\s)\\]>"']*${cdn.replace(/\./g, "\\.")}[^\\s)\\]>"']*`, "gi");
      while ((match = cdnRegex.exec(content)) !== null) {
        const imgUrl = match[0].replace(/[,;]$/, "");
        if (isValidImageUrl(imgUrl)) {
          images.push(imgUrl);
        }
      }
    }

    const uniqueImages = [...new Set(images)];
    console.log(
      `[Jina] Extracted ${content.length} chars text, ${uniqueImages.length} target-domain images`
    );

    return { text: content, images: uniqueImages };
  } catch (err) {
    console.error("[Jina] Error:", err);
    return { text: "", images: [] };
  }
}

/** Extract image URLs embedded in text content — target domain only */
function extractImageUrlsFromText(text: string, targetHostname: string): string[] {
  const images: string[] = [];
  // Match URLs that look like images
  const urlRegex = /https?:\/\/[^\s"'<>()]+\.(?:jpg|jpeg|png|webp|avif|gif)(?:\?[^\s"'<>()]*)?/gi;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const imgUrl = match[0];
    if (isImageFromTargetDomain(imgUrl, targetHostname)) {
      images.push(imgUrl);
    }
  }
  // Also match URL patterns without extension but from known image CDNs
  const cdnUrlRegex = /https?:\/\/(?:media|images|img|cdn)[^\s"'<>()]+/gi;
  while ((match = cdnUrlRegex.exec(text)) !== null) {
    const imgUrl = match[0].replace(/[,;]$/, ""); // trim trailing punctuation
    if (isImageFromTargetDomain(imgUrl, targetHostname) && isValidImageUrl(imgUrl)) {
      images.push(imgUrl);
    }
  }
  return images;
}

// =============================================================================
// LLM EXTRACTION (Together.ai) — site-aware prompt
// =============================================================================

function buildExtractionPrompt(sourceUrl: string, targetHostname: string, contentSource: string): string {
  const siteName = getRootDomain(targetHostname);

  const supplementaryNote = contentSource === "supplementary"
    ? `\nNOTE: The content below comes from multiple sources discussing this product, NOT directly from ${siteName}.
The product listing is from ${siteName} but we couldn't access the page directly.
For pricing: Look for the LOWEST price mentioned in EUR (for European retailers) or the most commonly cited price. European retailers like ${siteName} typically price in EUR.
If you see multiple prices, prefer the retail/selling price over MSRP.`
    : "";

  return `You are a product data extractor. You are extracting data from a ${siteName} product listing page.

IMPORTANT RULES:
- The source URL is: ${sourceUrl}${supplementaryNote}
- Extract the price as listed on ${siteName} when available. If the page content is from other sources, extract the most reasonable retail price.
- The currency should match what ${siteName} uses (e.g., EUR for bol.com, coolblue.nl; USD for amazon.com; GBP for amazon.co.uk).
- For images: ONLY include image URLs from ${siteName} or its CDN. Do NOT include images from other retailers or review sites.
- If you see data from multiple sources, ALWAYS prefer data from ${siteName}.

Return ONLY valid JSON with this exact structure (use null for missing fields):
{
  "name": "Full product name as shown on ${siteName}",
  "brand": "Brand name",
  "description": "Full product description from ${siteName}",
  "ean": "EAN/barcode number (13 or 8 digits only)",
  "mpn": "Manufacturer Part Number",
  "category": "Product category",
  "price": 29.99,
  "compare_at_price": 39.99,
  "currency": "EUR",
  "specifications": [
    {"name": "Color", "value": "Black"},
    {"name": "Weight", "value": "250g"},
    {"name": "Material", "value": "ABS Plastic"},
    {"name": "Age Range", "value": "18+"},
    {"name": "Piece Count", "value": "1Pokemon"}
  ],
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["Black", "White", "Red"],
  "materials": ["Cotton", "Polyester"],
  "variants": [
    {"name": "64GB", "price": 799},
    {"name": "128GB", "price": 899}
  ],
  "images": [],
  "weight": 0.25,
  "weight_unit": "kg",
  "dimensions": {"length": 10, "width": 5, "height": 3},
  "country_of_origin": "Netherlands"
}

Rules:
- Extract ALL specifications, features, attributes, and technical details you can find from ${siteName}
- Include things like: material, color, size, age range, piece count, compatibility, model number, power, capacity, etc.
- SIZES: Extract all available sizes (clothing: S/M/L/XL/XXL or numeric; shoes: EU/US sizes; other: any size variants). Set to null if no sizes found.
- COLORS: Extract all available color options. Set to null if no colors found.
- MATERIALS: Extract all materials mentioned (fabric composition, build material, etc.). Set to null if not found.
- VARIANTS: Extract product variants with their names and prices if different. Set to null if no variants.
- PRICING IS CRITICAL:
  - "price" = the CURRENT selling price (the price the customer actually pays right now). This is usually the largest/most prominent price on the page, or the sale/discounted price.
  - "compare_at_price" = the original/old/crossed-out price BEFORE any discount (often shown with a strikethrough). If there's no discount, set this to null.
  - Extract ONLY the numeric value (no currency symbols, no thousand separators)
  - Use the price from ${siteName} specifically, ignore prices from other websites
- For EAN/barcode, only include if it's a valid 13 or 8-digit number (commonly labeled as EAN, GTIN, UPC, or barcode)
- Do NOT include image URLs in the images array — leave it as an empty array. Images are handled separately.
- For weight, convert to kg
- For dimensions, use cm
- Return ONLY the JSON object, no other text`;
}

/** Extract the most product-relevant section from long content */
function extractRelevantSection(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;

  // Try to find the product section by looking for key patterns
  const productPatterns = [
    /(?:product|artikel|specificat|kenmerken|features|beschrijving|description)/i,
    /(?:€|EUR|USD|\$|prij[sz]|price|regular price|sale price)/i,
    /(?:EAN|GTIN|UPC|barcode|MPN|SKU)/i,
  ];

  // Score each 2000-char window for product relevance
  const windowSize = 2000;
  const step = 1000;
  let bestStart = 0;
  let bestScore = 0;

  for (let i = 0; i < content.length - windowSize; i += step) {
    const window = content.substring(i, i + windowSize);
    let score = 0;
    for (const pattern of productPatterns) {
      if (pattern.test(window)) score += 1;
    }
    // Prefer earlier content (slight penalty for later positions)
    score -= (i / content.length) * 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  // Take content around the best section, but always include the start too
  if (bestStart > 3000) {
    // Include first 5K chars (product title usually) + best section
    const firstPart = content.substring(0, 5000);
    const bestPart = content.substring(bestStart, bestStart + maxLength - 5500);
    return firstPart + "\n...\n" + bestPart;
  }

  return content.substring(0, maxLength);
}

async function callLLM(
  content: string,
  sourceUrl: string,
  targetHostname: string,
  contentSource: string
): Promise<any> {
  if (!TOGETHER_API_KEY) {
    console.error("[LLM] No TOGETHER_API_KEY");
    return null;
  }

  try {
    console.log(`[LLM] Sending ${content.length} chars to Together.ai (source: ${contentSource})...`);
    const systemPrompt = buildExtractionPrompt(sourceUrl, targetHostname, contentSource);

    const res = await fetch("https://api.together.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract product data from this ${getRootDomain(targetHostname)} listing:\n\n${extractRelevantSection(content, 20000)}`,
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
    console.log(`[LLM] Extracted: "${parsed.name}", price: ${parsed.price} ${parsed.currency}`);
    return parsed;
  } catch (err) {
    console.error("[LLM] Failed:", err);
    return null;
  }
}

// =============================================================================
// IMAGE FILTERING & SCORING
// =============================================================================

/**
 * Score and rank images using a tiered approach:
 * Tier 1: Images from target domain (bol.com → media.s-bol.com)
 * Tier 2: Tavily's curated top-level images (usually very relevant)
 * Tier 3: Other non-competitor images (neutral CDNs)
 * Excluded: Competitor retailer images (amazon when target is bol.com, etc.)
 */
function scoreAndFilterImages(
  targetDomainImages: string[],
  tavilyTopImages: string[],
  otherImages: string[],
  targetHostname: string
): string[] {
  const scored: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();

  function addImage(img: string, baseScore: number) {
    if (!isValidImageUrl(img)) return;

    const normalized = normalizeImageUrl(img);
    if (seen.has(normalized)) return;
    seen.add(normalized);

    let score = baseScore;

    // Bonus for target domain
    if (isImageFromTargetDomain(img, targetHostname)) {
      score += 50;
    }

    // Hard exclude competitor retailer images
    if (isFromCompetitorRetailer(img, targetHostname)) {
      return; // skip entirely
    }

    // Prefer larger images
    if (/\d{3,4}x\d{3,4}/i.test(img) || /large|big|full|zoom|hi-?res/i.test(img)) {
      score += 5;
    }

    // Penalize tiny images (thumbnails, icons, tracking pixels)
    if (/thumb|tiny|icon|small|pixel|1x1|spacer|tracking|blank/i.test(img)) {
      score -= 100;
    }

    // Penalize generic/stock/UI patterns
    if (/logo|banner|header|footer|badge|sprite|avatar|button|arrow|chevron/i.test(img)) {
      score -= 80;
    }

    // Penalize SVGs and data URIs
    if (/\.svg($|\?)/i.test(img) || img.startsWith("data:")) {
      score -= 100;
    }

    if (score > 0) {
      scored.push({ url: img, score });
    }
  }

  // Tier 1: Target domain images (highest priority)
  for (const img of targetDomainImages) {
    addImage(img, 100);
  }

  // Tier 2: Tavily curated top images (second priority)
  for (const img of tavilyTopImages) {
    addImage(img, 70);
  }

  // Tier 3: Other images (lowest priority, but still allowed if not a competitor)
  for (const img of otherImages) {
    addImage(img, 20);
  }

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate images that are same content at different sizes — keep largest
  const rankedUrls = scored.map(s => s.url);
  const deduplicated = deduplicateByContent(rankedUrls);

  console.log(
    `[Images] Tiers: ${targetDomainImages.length} target, ${tavilyTopImages.length} top, ${otherImages.length} other → ` +
    `Scored ${scored.length} → Deduped ${deduplicated.length}. Top 5 scores: ${scored.slice(0, 5).map(s => s.score).join(', ')}`
  );

  return deduplicated;
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
  const maxImages = 15; // Increased from 8 to capture more product images

  for (let i = 0; i < Math.min(images.length, maxImages); i++) {
    try {
      const imageUrl = images[i];
      console.log(
        `[Image] Downloading ${i + 1}/${Math.min(images.length, maxImages)}: ${imageUrl.substring(0, 100)}...`
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
      // Skip images smaller than 5KB (likely icons/placeholders)
      if (blob.size < 5000) {
        console.log(`[Image] Skipped ${i + 1}: too small (${blob.size} bytes)`);
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

    const targetHostname = parsedUrl.hostname;
    console.log(`[Scrape] Starting for: ${url} (target: ${targetHostname})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fetch content from multiple sources in parallel
    const [tavilyResult, fetchResult, jinaResult] = await Promise.all([
      searchWithTavily(url, targetHostname),
      fetchPageContent(url, targetHostname),
      fetchViaJinaReader(url, targetHostname),
    ]);

    // Build content for LLM — prioritize content FROM the target site
    // Priority: Jina (rendered page) > direct fetch > Tavily primary > Tavily answer > Tavily supplementary
    let contentForLLM = "";
    let contentSource = "none";

    // Best source: Jina Reader (renders JavaScript, gets the actual page)
    if (jinaResult.text && jinaResult.text.length > 200) {
      contentForLLM = jinaResult.text.substring(0, 15000);
      contentSource = "jina";
    }
    // Second: Direct fetch HTML text (always from target domain)
    if (fetchResult.text && fetchResult.text.length > 200) {
      const added = contentForLLM.length > 0 ? "\n\n--- Page HTML content ---\n\n" : "";
      contentForLLM += added + fetchResult.text.substring(0, 8000);
      if (contentSource === "none") contentSource = "fetch";
    }
    // Third: Tavily primary (from target domain result)
    if (tavilyResult.primaryContent && tavilyResult.primaryContent.length > 200) {
      if (contentForLLM.length < 2000) {
        const added = contentForLLM.length > 0 ? "\n\n--- Tavily content ---\n\n" : "";
        contentForLLM += added + tavilyResult.primaryContent;
        if (contentSource === "none") contentSource = "tavily_primary";
      }
    }
    // Always prepend Tavily's synthesized answer (clean, concise product summary)
    if (tavilyResult.tavilyAnswer) {
      contentForLLM = "=== Product Summary ===\n" + tavilyResult.tavilyAnswer +
        "\n\n=== Detailed Content ===\n" + contentForLLM;
    }
    // Last resort: supplementary content from other sites
    if (contentForLLM.length < 500 && tavilyResult.supplementaryContent) {
      contentSource = "supplementary";
      contentForLLM = tavilyResult.supplementaryContent.substring(0, 8000);
    }
    contentForLLM = contentForLLM.trim();

    console.log(`[Scrape] Content source: ${contentSource} (${contentForLLM.length} chars)`);

    // Collect and score images using tiered approach
    const targetDomainImages = [
      ...jinaResult.images,            // Jina Reader images (rendered page, target domain)
      ...fetchResult.images,           // Direct HTML images (target domain)
      ...tavilyResult.primaryImages,   // Tavily images from target domain results
    ];
    const scoredImages = scoreAndFilterImages(
      targetDomainImages,
      tavilyResult.topImages,          // Tavily's curated top-level images
      tavilyResult.allImages,          // All other images (fallback)
      targetHostname
    );

    console.log(
      `[Scrape] Source: ${contentSource}, Content: ${contentForLLM.length}c, ` +
      `Images: ${scoredImages.length} (target: ${targetDomainImages.length}, top: ${tavilyResult.topImages.length})`
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

    // Step 2: LLM extraction via Together.ai (site-aware prompt)
    const extracted = await callLLM(contentForLLM, url, targetHostname, contentSource);

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

    // Step 3: Download scored images (already filtered to target domain)
    const storedImages = await downloadAndStoreImages(
      supabase,
      userId,
      scoredImages,
      extracted.name || "Product"
    );

    // Step 4: Return result
    // Merge sizes/colors/materials into specifications if present
    const specs = Array.isArray(extracted.specifications) ? [...extracted.specifications] : [];

    if (Array.isArray(extracted.sizes) && extracted.sizes.length > 0) {
      specs.push({ name: "Available Sizes", value: extracted.sizes.join(", ") });
    }
    if (Array.isArray(extracted.colors) && extracted.colors.length > 0) {
      specs.push({ name: "Available Colors", value: extracted.colors.join(", ") });
    }
    if (Array.isArray(extracted.materials) && extracted.materials.length > 0) {
      specs.push({ name: "Materials", value: extracted.materials.join(", ") });
    }

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
      specifications: specs,
      sizes: Array.isArray(extracted.sizes) ? extracted.sizes : null,
      colors: Array.isArray(extracted.colors) ? extracted.colors : null,
      materials: Array.isArray(extracted.materials) ? extracted.materials : null,
      variants: Array.isArray(extracted.variants) ? extracted.variants : null,
      images: storedImages,
      weight: extracted.weight ? Number(extracted.weight) : null,
      weight_unit: extracted.weight_unit || "kg",
      dimensions: extracted.dimensions || null,
      country_of_origin: extracted.country_of_origin || null,
      source_url: url,
    };

    console.log(
      `[Scrape] Done. Name: "${result.name}", Price: ${result.price} ${result.currency}, ` +
      `EAN: ${result.ean}, Images: ${result.images.length}, Specs: ${result.specifications.length}`
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

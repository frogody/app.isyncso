import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Together from "npm:together-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ResearchInput {
  queueId: string;
  productDescription: string;
  modelNumber?: string;
  supplierName?: string;
  extractedEan?: string;
}

interface ProductResearchResult {
  ean: string | null;
  name: string | null;
  tagline: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  images: string[];
  specifications: Array<{ name: string; value: string }>;
  weight: number | null;
  dimensions: { length?: number; width?: number; height?: number } | null;
  sourceUrl: string | null;
  confidence: number;
}

// Get domain for known suppliers
function getSupplierDomain(supplierName: string): string {
  const supplierDomains: Record<string, string> = {
    'bol.com': 'bol.com',
    'bol': 'bol.com',
    'amazon': 'amazon.nl',
    'coolblue': 'coolblue.nl',
    'mediamarkt': 'mediamarkt.nl',
    'wehkamp': 'wehkamp.nl',
    'blokker': 'blokker.nl',
    'hema': 'hema.nl',
    'action': 'action.com',
    'makro': 'makro.nl',
    'sligro': 'sligro.nl',
    'hanos': 'hanos.nl',
  };

  const lowerName = supplierName.toLowerCase();
  for (const [key, domain] of Object.entries(supplierDomains)) {
    if (lowerName.includes(key)) return domain;
  }
  return supplierName.toLowerCase().replace(/\s+/g, '') + '.com';
}

// Use web search to find product information
async function searchWeb(query: string, tavilyApiKey: string): Promise<any[]> {
  try {
    console.log(`Tavily search: "${query}"`);
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: true,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      console.error('Tavily search failed:', await response.text());
      return [];
    }

    const data = await response.json();
    console.log(`Tavily returned ${data.results?.length || 0} results`);
    return data.results || [];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

// =============================================================================
// STEP 1: EAN LOOKUP - Dedicated search to find the EAN/barcode
// =============================================================================
async function findEan(
  together: Together,
  tavilyApiKey: string,
  input: ResearchInput
): Promise<{ ean: string | null; confidence: number; sourceUrl: string | null }> {
  console.log('=== STEP 1: EAN LOOKUP ===');

  // If we already have an EAN from the invoice, validate and return it
  if (input.extractedEan) {
    const validated = validateEan(input.extractedEan);
    if (validated) {
      console.log(`Using extracted EAN: ${validated}`);
      return { ean: validated, confidence: 1.0, sourceUrl: null };
    }
  }

  // Extract brand from product description (usually first word)
  const words = input.productDescription.split(/\s+/);
  const possibleBrand = words[0];

  // Build EAN-specific search queries
  const eanQueries: string[] = [];

  // Query 1: Model number + brand + EAN (most specific)
  if (input.modelNumber) {
    eanQueries.push(`${possibleBrand} ${input.modelNumber} EAN barcode GTIN`);
  }

  // Query 2: Product name + EAN lookup
  const shortName = input.productDescription.substring(0, 60);
  eanQueries.push(`"${shortName}" EAN barcode number`);

  // Query 3: Supplier-specific search
  if (input.supplierName) {
    const domain = getSupplierDomain(input.supplierName);
    if (input.modelNumber) {
      eanQueries.push(`${input.modelNumber} site:${domain}`);
    } else {
      eanQueries.push(`${shortName} site:${domain}`);
    }
  }

  // Query 4: EAN lookup sites
  if (input.modelNumber) {
    eanQueries.push(`${possibleBrand} ${input.modelNumber} site:ean-search.org OR site:barcodelookup.com`);
  }

  // Execute EAN searches
  const allSearchResults: any[] = [];
  for (const query of eanQueries.slice(0, 3)) {
    const results = await searchWeb(query, tavilyApiKey);
    allSearchResults.push(...results);
    if (allSearchResults.length >= 8) break;
  }

  if (allSearchResults.length === 0) {
    console.log('No search results for EAN lookup');
    return { ean: null, confidence: 0, sourceUrl: null };
  }

  // Use AI to extract EAN from search results
  const searchContent = allSearchResults.map(r => ({
    title: r.title,
    url: r.url,
    content: (r.content || r.snippet || '').substring(0, 1500),
  }));

  const eanPrompt = `You are an EAN/barcode extraction expert. Your ONLY task is to find the correct EAN (European Article Number) for this product.

PRODUCT TO IDENTIFY:
- Description: "${input.productDescription}"
${input.modelNumber ? `- Model Number: ${input.modelNumber}` : ''}
${input.supplierName ? `- Purchased from: ${input.supplierName}` : ''}
- Likely Brand: ${possibleBrand}

SEARCH RESULTS:
${JSON.stringify(searchContent, null, 2)}

TASK: Find the EAN/GTIN barcode for this EXACT product.

IMPORTANT RULES:
1. EAN-13 must be exactly 13 digits
2. EAN-8 must be exactly 8 digits
3. Make sure the EAN matches THIS SPECIFIC product/model, not a similar one
4. Look for EAN, GTIN, Barcode, or "Article number" in the search results
5. Cross-reference model numbers to ensure correct match
6. If multiple EANs are found, choose the one that best matches the model number

Respond with ONLY this JSON (no markdown, no explanation):
{
  "ean": "the 13 or 8 digit EAN, or null if not found",
  "confidence": 0.0 to 1.0,
  "source_url": "URL where you found the EAN",
  "reasoning": "Brief explanation of how you identified the EAN"
}`;

  try {
    const response = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      messages: [{ role: "user", content: eanPrompt }],
      max_tokens: 512,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('No AI response for EAN lookup');
      return { ean: null, confidence: 0, sourceUrl: null };
    }

    // Parse response
    const cleanedContent = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON in EAN lookup response');
      return { ean: null, confidence: 0, sourceUrl: null };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validatedEan = validateEan(parsed.ean);

    console.log(`EAN lookup result: ${validatedEan || 'not found'}, confidence: ${parsed.confidence}`);
    if (parsed.reasoning) {
      console.log(`Reasoning: ${parsed.reasoning}`);
    }

    return {
      ean: validatedEan,
      confidence: validatedEan ? (parsed.confidence || 0.7) : 0,
      sourceUrl: parsed.source_url || null,
    };
  } catch (error) {
    console.error('EAN lookup AI error:', error);
    return { ean: null, confidence: 0, sourceUrl: null };
  }
}

// =============================================================================
// STEP 2: PRODUCT ENRICHMENT - Get full product details
// =============================================================================
async function enrichProduct(
  together: Together,
  tavilyApiKey: string,
  input: ResearchInput,
  ean: string | null
): Promise<ProductResearchResult> {
  console.log('=== STEP 2: PRODUCT ENRICHMENT ===');

  // Build enrichment search queries
  const enrichQueries: string[] = [];

  // Search by product name for details
  const words = input.productDescription.split(/\s+/);
  const possibleBrand = words[0];
  const shortName = input.productDescription.substring(0, 60);

  // Priority 1: Amazon search (best for CDN images that allow hotlinking)
  enrichQueries.push(`${shortName} site:amazon.de OR site:amazon.nl OR site:amazon.com`);

  // Priority 2: bol.com search (Dutch retailer with accessible CDN)
  enrichQueries.push(`${shortName} site:bol.com`);

  // If we have EAN, search by EAN
  if (ean) {
    enrichQueries.push(`${ean} product specifications features`);
  }

  // Model number search
  if (input.modelNumber) {
    enrichQueries.push(`${possibleBrand} ${input.modelNumber} specifications features review`);
  }

  // Execute enrichment searches
  const allSearchResults: any[] = [];
  for (const query of enrichQueries.slice(0, 3)) {
    const results = await searchWeb(query, tavilyApiKey);
    allSearchResults.push(...results);
    if (allSearchResults.length >= 10) break;
  }

  if (allSearchResults.length === 0) {
    console.log('No search results for enrichment');
    return createResultWithEan(ean, input);
  }

  // Use AI to extract full product data
  const searchContent = allSearchResults.map(r => ({
    title: r.title,
    url: r.url,
    content: (r.content || r.snippet || '').substring(0, 2000),
  }));

  const enrichPrompt = `You are a product data extraction expert. Extract comprehensive product information from these search results.

PRODUCT:
- Description: "${input.productDescription}"
${input.modelNumber ? `- Model Number: ${input.modelNumber}` : ''}
${ean ? `- EAN/Barcode: ${ean}` : ''}
${input.supplierName ? `- Supplier: ${input.supplierName}` : ''}

SEARCH RESULTS:
${JSON.stringify(searchContent, null, 2)}

Extract ALL available information about this product. Focus on:
1. Official product name (clean, proper capitalization)
2. Short tagline (catchy 5-15 word marketing phrase highlighting key benefit)
3. Detailed description (2-3 paragraphs about features and benefits)
4. Brand name
5. Product category
6. Product images - IMPORTANT: Use CDN/media URLs that allow direct access:
   - Preferred: Amazon CDN (images-na.ssl-images-amazon.com, m.media-amazon.com)
   - Preferred: bol.com CDN (media.s-bol.com)
   - Preferred: Other retailer CDNs (media.*, cdn.*, assets.*, static.*)
   - AVOID: Manufacturer website URLs (samsung.com, philips.com, etc.) as they block direct access
7. Technical specifications (size, power, capacity, etc.)
8. Weight and dimensions
9. Source URL (most reliable product page)

Respond with ONLY this JSON:
{
  "name": "Official product name",
  "tagline": "Short catchy marketing tagline (5-15 words)",
  "description": "Detailed product description with features and benefits",
  "brand": "Brand name",
  "category": "Product category (e.g., 'Monitors', 'Electronics', 'Kitchen Appliances')",
  "images": ["https://m.media-amazon.com/images/...", "https://media.s-bol.com/..."],
  "specifications": [
    {"name": "Specification name", "value": "Value"}
  ],
  "weight": number in kg or null,
  "dimensions": {"length": cm, "width": cm, "height": cm} or null,
  "source_url": "Best product page URL",
  "confidence": 0.0 to 1.0
}`;

  try {
    const response = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      messages: [{ role: "user", content: enrichPrompt }],
      max_tokens: 2048,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('No AI response for enrichment');
      return createResultWithEan(ean, input);
    }

    // Parse response
    const cleanedContent = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON in enrichment response');
      return createResultWithEan(ean, input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const productName = parsed.name || input.productDescription.substring(0, 100);
    const productBrand = parsed.brand || null;
    const productDescription = parsed.description || null;

    // Use AI tagline or generate one from name/description
    const tagline = parsed.tagline || generateTagline(productName, productDescription, productBrand);

    // Filter images and log for debugging
    const rawImages = Array.isArray(parsed.images) ? parsed.images : [];
    const validImages = rawImages.filter(isValidImageUrl);
    console.log(`Images: ${rawImages.length} raw, ${validImages.length} valid`);
    if (rawImages.length > 0 && validImages.length === 0) {
      console.log('Raw image URLs rejected:', rawImages.slice(0, 3));
    }

    const result: ProductResearchResult = {
      ean,
      name: productName,
      tagline,
      description: productDescription,
      brand: productBrand,
      category: parsed.category || null,
      images: validImages,
      specifications: Array.isArray(parsed.specifications) ? parsed.specifications : [],
      weight: typeof parsed.weight === 'number' ? parsed.weight : null,
      dimensions: parsed.dimensions || null,
      sourceUrl: parsed.source_url || null,
      confidence: ean ? Math.max(parsed.confidence || 0.7, 0.8) : (parsed.confidence || 0.5),
    };

    console.log(`Enrichment complete: ${result.name}, ${result.images.length} images, ${result.specifications.length} specs`);
    return result;
  } catch (error) {
    console.error('Enrichment AI error:', error);
    return createResultWithEan(ean, input);
  }
}

function createResultWithEan(ean: string | null, input: ResearchInput): ProductResearchResult {
  const name = input.productDescription.substring(0, 200);
  const brand = input.productDescription.split(/\s+/)[0] || null;
  return {
    ean,
    name,
    tagline: generateTagline(name, null, brand),
    description: null,
    brand,
    category: null,
    images: [],
    specifications: [],
    weight: null,
    dimensions: null,
    sourceUrl: null,
    confidence: ean ? 0.7 : 0.3,
  };
}

function createEmptyResult(): ProductResearchResult {
  return {
    ean: null,
    name: null,
    tagline: 'Quality Product',
    description: null,
    brand: null,
    category: null,
    images: [],
    specifications: [],
    weight: null,
    dimensions: null,
    sourceUrl: null,
    confidence: 0,
  };
}

function validateEan(ean: string | null | undefined): string | null {
  if (!ean) return null;
  const cleaned = String(ean).replace(/\D/g, '');
  if (cleaned.length === 13 || cleaned.length === 8) {
    return cleaned;
  }
  return null;
}

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Accept HTTP/HTTPS URLs that either:
    // 1. Have image extensions
    // 2. Are from known CDN/image hosting domains
    // 3. Have image-related query params
    const hasImageExtension = /\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(url);
    const isImageCdn = /(images|img|cdn|media|static|assets)/i.test(parsed.hostname) ||
                       /(images|img|cdn|media|photo|product)/i.test(parsed.pathname);
    const hasImageParams = /image|img|photo|product/i.test(parsed.search);

    return ['http:', 'https:'].includes(parsed.protocol) &&
           (hasImageExtension || isImageCdn || hasImageParams);
  } catch {
    return false;
  }
}

// Generate a tagline from product name and description
function generateTagline(name: string, description: string | null, brand: string | null): string {
  // Extract key features from name/description
  const cleanName = name.replace(/[,\-]/g, ' ').trim();
  const words = cleanName.split(/\s+/).slice(0, 8);

  if (brand && words.length > 0) {
    // "Brand Product - Key feature"
    const feature = description ? description.split('.')[0].substring(0, 50) : words.slice(1).join(' ');
    return `${brand} ${words.slice(0, 3).join(' ')} - Premium Quality`;
  }

  return `${words.slice(0, 6).join(' ')} - Quality Product`;
}

// Download and store product images
async function downloadAndStoreImages(
  supabase: any,
  companyId: string,
  images: string[],
  productName: string
): Promise<string[]> {
  const storedUrls: string[] = [];
  const maxImages = 5;

  for (let i = 0; i < Math.min(images.length, maxImages); i++) {
    try {
      const imageUrl = images[i];
      console.log(`Downloading image ${i + 1}: ${imageUrl.substring(0, 80)}...`);

      // Use browser-like headers to bypass hotlink protection
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': new URL(imageUrl).origin + '/',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        console.log(`Failed to download image ${i + 1}: HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';

      // Verify it's actually an image
      if (!contentType.startsWith('image/')) {
        console.log(`Not an image (${contentType}), skipping`);
        continue;
      }

      const extension = contentType.includes('png') ? 'png' :
                       contentType.includes('webp') ? 'webp' :
                       contentType.includes('gif') ? 'gif' : 'jpg';

      const blob = await response.blob();

      // Check file size (skip if too small - likely an error image)
      if (blob.size < 1000) {
        console.log(`Image too small (${blob.size} bytes), skipping`);
        continue;
      }

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Generate unique filename
      const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
      const filename = `${companyId}/${slug}-${Date.now()}-${i}.${extension}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filename, buffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.log(`Failed to upload image ${i + 1}: ${error.message}`);
        continue;
      }

      if (data) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filename);

        if (urlData?.publicUrl) {
          storedUrls.push(urlData.publicUrl);
        }
      }
    } catch (imgError) {
      console.error('Failed to download/store image:', imgError);
    }
  }

  return storedUrls;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");

    if (!togetherApiKey) {
      throw new Error("TOGETHER_API_KEY not configured");
    }

    if (!tavilyApiKey) {
      throw new Error("TAVILY_API_KEY not configured - required for product research");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const together = new Together({ apiKey: togetherApiKey });

    const body = await req.json();

    // Support both single item and batch processing
    const items: ResearchInput[] = body.items || [body];
    const results: any[] = [];

    for (const input of items) {
      const { queueId, productDescription, modelNumber, supplierName, extractedEan } = input;

      if (!queueId || !productDescription) {
        results.push({ queueId, success: false, error: "Missing required fields" });
        continue;
      }

      console.log(`\n========================================`);
      console.log(`Researching: ${productDescription.substring(0, 60)}...`);
      console.log(`Model: ${modelNumber || 'N/A'}, Supplier: ${supplierName || 'N/A'}`);
      console.log(`========================================`);

      // Update status to researching
      await supabase
        .from('product_research_queue')
        .update({
          status: 'researching',
          last_research_at: new Date().toISOString(),
        })
        .eq('id', queueId);

      // ===========================================
      // STEP 1: EAN LOOKUP
      // ===========================================
      const eanResult = await findEan(together, tavilyApiKey, input);

      // Update queue with EAN result
      await supabase
        .from('product_research_queue')
        .update({
          researched_ean: eanResult.ean,
          research_confidence: eanResult.confidence,
        })
        .eq('id', queueId);

      // Note: Even without EAN, we proceed to create the product
      // Products without EAN will be marked as draft for review
      if (!eanResult.ean) {
        console.log('EAN not found - will create product without EAN (marked as draft)');
      }

      // ===========================================
      // STEP 2: PRODUCT ENRICHMENT
      // ===========================================
      const researchResult = await enrichProduct(together, tavilyApiKey, input, eanResult.ean);

      // Use EAN source URL if enrichment didn't find one
      if (!researchResult.sourceUrl && eanResult.sourceUrl) {
        researchResult.sourceUrl = eanResult.sourceUrl;
      }

      console.log('Final research result:', {
        ean: researchResult.ean,
        name: researchResult.name?.substring(0, 50),
        confidence: researchResult.confidence,
        imagesCount: researchResult.images.length,
      });

      // Get company_id from queue record
      const { data: queueRecord } = await supabase
        .from('product_research_queue')
        .select('company_id')
        .eq('id', queueId)
        .single();

      // Download and store images if found
      let storedImages: string[] = [];
      if (researchResult.images.length > 0 && queueRecord?.company_id) {
        console.log(`Attempting to download ${researchResult.images.length} images...`);
        storedImages = await downloadAndStoreImages(
          supabase,
          queueRecord.company_id,
          researchResult.images,
          researchResult.name || productDescription
        );
        console.log(`Successfully stored ${storedImages.length} of ${researchResult.images.length} images`);
      }

      // Always create product - use name from research or fall back to description
      const productName = researchResult.name || productDescription.substring(0, 200);
      if (productName) {
        // Only pass images that were successfully stored (not external URLs)
        // External URLs often have hotlink protection and won't load in browsers
        const imagesToStore = storedImages; // Only use successfully downloaded images

        // Call database function to create/match product
        const { data: processResult, error: processError } = await supabase
          .rpc('process_research_result', {
            p_queue_id: queueId,
            p_ean: researchResult.ean,
            p_name: productName,
            p_description: researchResult.description,
            p_brand: researchResult.brand,
            p_category: researchResult.category,
            p_images: imagesToStore,
            p_specifications: researchResult.specifications,
            p_weight: researchResult.weight,
            p_dimensions: researchResult.dimensions,
            p_source_url: researchResult.sourceUrl,
            p_confidence: researchResult.confidence,
            p_tagline: researchResult.tagline,
          });

        if (processError) {
          console.error('Error processing research result:', processError);
          await supabase
            .from('product_research_queue')
            .update({
              status: 'failed',
              error_message: processError.message,
              researched_ean: researchResult.ean,
              researched_name: researchResult.name,
              research_confidence: researchResult.confidence,
            })
            .eq('id', queueId);

          results.push({ queueId, success: false, error: processError.message });
        } else {
          console.log(`SUCCESS: Product ${processResult.action} - ID: ${processResult.product_id}`);
          results.push({
            queueId,
            success: true,
            ...processResult,
            confidence: researchResult.confidence,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Research product error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

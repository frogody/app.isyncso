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

  // If we have EAN, search by EAN first (most accurate)
  if (ean) {
    enrichQueries.push(`${ean} product specifications features`);
  }

  // Search by product name for details
  const words = input.productDescription.split(/\s+/);
  const possibleBrand = words[0];

  if (input.modelNumber) {
    enrichQueries.push(`${possibleBrand} ${input.modelNumber} specifications features review`);
  }

  // Manufacturer website search
  enrichQueries.push(`${possibleBrand} ${input.productDescription.substring(0, 50)} official site`);

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
2. Detailed description (2-3 paragraphs about features and benefits)
3. Brand name
4. Product category
5. Product images (direct URLs to high-quality product photos)
6. Technical specifications (size, power, capacity, etc.)
7. Weight and dimensions
8. Source URL (most reliable product page)

Respond with ONLY this JSON:
{
  "name": "Official product name",
  "description": "Detailed product description with features and benefits",
  "brand": "Brand name",
  "category": "Product category (e.g., 'Vacuum Cleaners', 'Electronics')",
  "images": ["url1", "url2", "url3"],
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

    const result: ProductResearchResult = {
      ean,
      name: parsed.name || null,
      description: parsed.description || null,
      brand: parsed.brand || null,
      category: parsed.category || null,
      images: Array.isArray(parsed.images) ? parsed.images.filter(isValidImageUrl) : [],
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
  return {
    ean,
    name: input.productDescription.substring(0, 200),
    description: null,
    brand: input.productDescription.split(/\s+/)[0] || null,
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
    return ['http:', 'https:'].includes(parsed.protocol) &&
           /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
  } catch {
    return false;
  }
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
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProductResearchBot/1.0)',
        },
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const extension = contentType.includes('png') ? 'png' :
                       contentType.includes('webp') ? 'webp' : 'jpg';

      const blob = await response.blob();
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

      if (!error && data) {
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

      // If no EAN found and confidence is too low, mark for manual review
      if (!eanResult.ean && eanResult.confidence < 0.5) {
        console.log('EAN not found with sufficient confidence - marking for manual review');

        await supabase
          .from('product_research_queue')
          .update({
            status: 'manual_review',
            error_message: 'Could not find EAN with sufficient confidence. Please enter EAN manually.',
          })
          .eq('id', queueId);

        results.push({
          queueId,
          success: false,
          needsReview: true,
          reason: 'EAN not found',
          confidence: eanResult.confidence,
        });
        continue;
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
        storedImages = await downloadAndStoreImages(
          supabase,
          queueRecord.company_id,
          researchResult.images,
          researchResult.name || productDescription
        );
        console.log(`Stored ${storedImages.length} images`);
      }

      // Process the result if we have enough confidence
      if (researchResult.confidence >= 0.6 && (researchResult.ean || researchResult.name)) {
        // Call database function to create/match product
        const { data: processResult, error: processError } = await supabase
          .rpc('process_research_result', {
            p_queue_id: queueId,
            p_ean: researchResult.ean,
            p_name: researchResult.name,
            p_description: researchResult.description,
            p_brand: researchResult.brand,
            p_category: researchResult.category,
            p_images: storedImages.length > 0 ? storedImages : researchResult.images,
            p_specifications: researchResult.specifications,
            p_weight: researchResult.weight,
            p_dimensions: researchResult.dimensions,
            p_source_url: researchResult.sourceUrl,
            p_confidence: researchResult.confidence,
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
      } else {
        // Low confidence - mark for manual review
        await supabase
          .from('product_research_queue')
          .update({
            status: 'manual_review',
            researched_ean: researchResult.ean,
            researched_name: researchResult.name,
            researched_description: researchResult.description,
            researched_brand: researchResult.brand,
            researched_category: researchResult.category,
            researched_images: storedImages.length > 0 ? storedImages : researchResult.images,
            researched_specifications: researchResult.specifications,
            researched_weight: researchResult.weight,
            researched_dimensions: researchResult.dimensions,
            researched_source_url: researchResult.sourceUrl,
            research_confidence: researchResult.confidence,
            error_message: 'Low confidence - requires manual review',
          })
          .eq('id', queueId);

        results.push({
          queueId,
          success: false,
          needsReview: true,
          confidence: researchResult.confidence,
        });
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

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

// Extract model number from product description
function extractModelNumber(description: string): string | null {
  // Common patterns: ends with model number like "- 3681N", "Model: ABC123", "(ABC-123)"
  const patterns = [
    /[-–]\s*([A-Z0-9][-A-Z0-9]{2,20})$/i,           // "- 3681N" at end
    /\(([A-Z0-9][-A-Z0-9]{2,20})\)$/i,              // "(ABC123)" at end
    /Model[:\s]+([A-Z0-9][-A-Z0-9]{2,20})/i,        // "Model: ABC123"
    /Art\.?\s*(?:nr|no)?\.?[:\s]*([A-Z0-9][-A-Z0-9]{2,20})/i, // "Art.nr: 123"
    /SKU[:\s]+([A-Z0-9][-A-Z0-9]{2,20})/i,          // "SKU: ABC123"
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Build search queries for finding product information
function buildSearchQueries(input: ResearchInput): string[] {
  const queries: string[] = [];
  const { productDescription, modelNumber, supplierName, extractedEan } = input;

  // Extract brand from description (first word is often the brand)
  const words = productDescription.split(/\s+/);
  const possibleBrand = words[0];
  const extractedModel = modelNumber || extractModelNumber(productDescription);

  // If we have an EAN, search directly
  if (extractedEan) {
    queries.push(`${extractedEan} EAN product specifications`);
  }

  // Search with model number (most accurate)
  if (extractedModel) {
    queries.push(`${possibleBrand} ${extractedModel} EAN barcode specifications`);
    if (supplierName) {
      queries.push(`${extractedModel} site:${getSupplierDomain(supplierName)}`);
    }
  }

  // Generic product search
  const shortDescription = productDescription.substring(0, 100);
  queries.push(`${shortDescription} EAN barcode`);

  // Supplier-specific search
  if (supplierName) {
    queries.push(`${shortDescription} site:${getSupplierDomain(supplierName)}`);
  }

  return queries;
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
    return data.results || [];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

// Use AI to extract structured product data from search results
async function extractProductData(
  together: Together,
  searchResults: any[],
  originalInput: ResearchInput
): Promise<ProductResearchResult> {
  const searchContent = searchResults.map(r => ({
    title: r.title,
    url: r.url,
    content: r.content?.substring(0, 2000) || r.snippet || '',
  }));

  const prompt = `You are a product data extraction expert. Extract structured product information from these search results.

ORIGINAL PRODUCT DESCRIPTION FROM INVOICE:
"${originalInput.productDescription}"
${originalInput.modelNumber ? `MODEL NUMBER: ${originalInput.modelNumber}` : ''}
${originalInput.supplierName ? `SUPPLIER: ${originalInput.supplierName}` : ''}
${originalInput.extractedEan ? `EXTRACTED EAN: ${originalInput.extractedEan}` : ''}

SEARCH RESULTS:
${JSON.stringify(searchContent, null, 2)}

TASK: Extract the following information about this product. Only include data you are confident about.

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "ean": "13-digit EAN/barcode or null if not found",
  "name": "Official product name",
  "description": "Full product description (2-3 paragraphs)",
  "brand": "Brand name",
  "category": "Product category",
  "images": ["url1", "url2"] // Up to 5 product image URLs
  "specifications": [
    {"name": "Spec name", "value": "Spec value"}
  ],
  "weight": number in kg or null,
  "dimensions": {"length": cm, "width": cm, "height": cm} or null,
  "source_url": "Most reliable product page URL",
  "confidence": 0.0 to 1.0 // How confident are you in this data?
}

IMPORTANT:
- EAN must be exactly 13 digits (or 8 for EAN-8)
- Only include high-quality product images, not logos or icons
- Weight should be in kilograms
- Dimensions should be in centimeters
- If you cannot find reliable data for a field, use null`;

  try {
    const response = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return createEmptyResult();
    }

    // Clean and parse JSON
    const cleanedContent = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return createEmptyResult();
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      ean: validateEan(parsed.ean),
      name: parsed.name || null,
      description: parsed.description || null,
      brand: parsed.brand || null,
      category: parsed.category || null,
      images: Array.isArray(parsed.images) ? parsed.images.filter(isValidImageUrl) : [],
      specifications: Array.isArray(parsed.specifications) ? parsed.specifications : [],
      weight: typeof parsed.weight === 'number' ? parsed.weight : null,
      dimensions: parsed.dimensions || null,
      sourceUrl: parsed.source_url || null,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    };
  } catch (error) {
    console.error('AI extraction error:', error);
    return createEmptyResult();
  }
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

function validateEan(ean: string | null): string | null {
  if (!ean) return null;
  const cleaned = ean.replace(/\D/g, '');
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

      console.log(`Researching product: ${productDescription.substring(0, 50)}...`);

      // Update status to researching
      await supabase
        .from('product_research_queue')
        .update({
          status: 'researching',
          last_research_at: new Date().toISOString(),
          research_attempts: supabase.rpc ? undefined : 1 // Increment handled by trigger if exists
        })
        .eq('id', queueId);

      let researchResult: ProductResearchResult;

      // Check if Tavily is configured for web search
      if (tavilyApiKey) {
        // Build search queries
        const queries = buildSearchQueries(input);
        console.log('Search queries:', queries);

        // Execute searches
        const allSearchResults: any[] = [];
        for (const query of queries.slice(0, 3)) { // Limit to 3 queries
          const results = await searchWeb(query, tavilyApiKey);
          allSearchResults.push(...results);
          if (allSearchResults.length >= 10) break; // Enough results
        }

        console.log(`Found ${allSearchResults.length} search results`);

        // Extract structured data using AI
        researchResult = await extractProductData(together, allSearchResults, input);
      } else {
        // Fallback: Use AI directly without web search
        console.log('No Tavily API key - using AI-only extraction');
        researchResult = await extractProductDataWithoutSearch(together, input);
      }

      console.log('Research result:', {
        ean: researchResult.ean,
        name: researchResult.name?.substring(0, 50),
        confidence: researchResult.confidence,
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

      // If confidence is high enough, process the result
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

// Fallback extraction without web search
async function extractProductDataWithoutSearch(
  together: Together,
  input: ResearchInput
): Promise<ProductResearchResult> {
  const prompt = `You are a product identification expert. Based on this product description from an invoice, provide as much accurate information as you can.

PRODUCT DESCRIPTION:
"${input.productDescription}"
${input.modelNumber ? `MODEL NUMBER: ${input.modelNumber}` : ''}
${input.supplierName ? `PURCHASED FROM: ${input.supplierName}` : ''}
${input.extractedEan ? `EAN FROM INVOICE: ${input.extractedEan}` : ''}

Based on your knowledge, identify this product and provide:
1. The correct EAN/barcode (13 digits)
2. The official product name
3. Brand and category
4. Brief description

Respond with ONLY a JSON object:
{
  "ean": "13-digit EAN or null",
  "name": "Official product name",
  "description": "Product description",
  "brand": "Brand name",
  "category": "Category",
  "images": [],
  "specifications": [],
  "weight": null,
  "dimensions": null,
  "source_url": null,
  "confidence": 0.0 to 1.0
}

Be conservative with confidence - only high confidence if you're certain about the product identity.`;

  try {
    const response = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return createEmptyResult();

    const cleanedContent = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return createEmptyResult();

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      ean: validateEan(parsed.ean),
      name: parsed.name || null,
      description: parsed.description || null,
      brand: parsed.brand || null,
      category: parsed.category || null,
      images: [],
      specifications: [],
      weight: null,
      dimensions: null,
      sourceUrl: null,
      confidence: Math.min(parsed.confidence || 0.4, 0.6), // Cap confidence for AI-only
    };
  } catch (error) {
    console.error('AI-only extraction error:', error);
    return createEmptyResult();
  }
}

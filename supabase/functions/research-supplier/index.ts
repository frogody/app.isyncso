import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Together from "npm:together-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SupplierResearchInput {
  queueId: string;
  supplierName: string;
  hintEmail?: string;
  hintCountry?: string;
}

interface SupplierResearchResult {
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  businessType: string | null;
  email: string | null;
  phone: string | null;
  address: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  } | null;
  vatNumber: string | null;
  kvkNumber: string | null;
  country: string | null;
  confidence: number;
  sourceUrl: string | null;
}

// Known Dutch/European retailers and their domains
const KNOWN_SUPPLIERS: Record<string, Partial<SupplierResearchResult>> = {
  'mediamarkt': {
    website: 'https://www.mediamarkt.nl',
    businessType: 'retailer',
    country: 'NL',
    description: 'Consumer electronics retailer',
  },
  'bol.com': {
    website: 'https://www.bol.com',
    businessType: 'marketplace',
    country: 'NL',
    description: 'Dutch online marketplace for electronics, books, and more',
  },
  'bol': {
    website: 'https://www.bol.com',
    businessType: 'marketplace',
    country: 'NL',
    description: 'Dutch online marketplace for electronics, books, and more',
  },
  'amazon': {
    website: 'https://www.amazon.nl',
    businessType: 'marketplace',
    country: 'NL',
    description: 'Global online marketplace',
  },
  'amazonnl': {
    website: 'https://www.amazon.nl',
    businessType: 'marketplace',
    country: 'NL',
    description: 'Amazon Netherlands marketplace',
  },
  'coolblue': {
    website: 'https://www.coolblue.nl',
    businessType: 'retailer',
    country: 'NL',
    description: 'Dutch consumer electronics retailer known for customer service',
  },
  'ibood': {
    website: 'https://www.ibood.com',
    businessType: 'retailer',
    country: 'NL',
    description: 'Daily deals website for electronics and lifestyle products',
  },
  'joybuy': {
    website: 'https://www.joybuy.com',
    businessType: 'marketplace',
    country: 'CN',
    description: 'JD.com international marketplace',
  },
  'wehkamp': {
    website: 'https://www.wehkamp.nl',
    businessType: 'retailer',
    country: 'NL',
    description: 'Dutch online department store',
  },
  'blokker': {
    website: 'https://www.blokker.nl',
    businessType: 'retailer',
    country: 'NL',
    description: 'Dutch household goods retailer',
  },
  'action': {
    website: 'https://www.action.com',
    businessType: 'retailer',
    country: 'NL',
    description: 'Discount variety store chain',
  },
  'makro': {
    website: 'https://www.makro.nl',
    businessType: 'wholesaler',
    country: 'NL',
    description: 'Wholesale retailer for business customers',
  },
  'sligro': {
    website: 'https://www.sligro.nl',
    businessType: 'wholesaler',
    country: 'NL',
    description: 'Dutch food service wholesaler',
  },
  'hanos': {
    website: 'https://www.hanos.nl',
    businessType: 'wholesaler',
    country: 'NL',
    description: 'Dutch food service wholesaler',
  },
  'aliexpress': {
    website: 'https://www.aliexpress.com',
    businessType: 'marketplace',
    country: 'CN',
    description: 'Global retail marketplace',
  },
};

// Extract domain from email to help identify company
function extractDomainFromEmail(email: string): string | null {
  if (!email) return null;
  const match = email.match(/@([a-zA-Z0-9.-]+)/);
  return match ? match[1] : null;
}

// Normalize supplier name for lookup
function normalizeSupplierName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

// Search web for supplier information
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

// Research supplier using AI
async function researchSupplier(
  together: Together,
  tavilyApiKey: string,
  input: SupplierResearchInput
): Promise<SupplierResearchResult> {
  console.log(`=== Researching Supplier: ${input.supplierName} ===`);

  // Check if this is a known supplier first
  const normalizedName = normalizeSupplierName(input.supplierName);
  const knownData = KNOWN_SUPPLIERS[normalizedName];

  if (knownData) {
    console.log(`Found known supplier data for: ${input.supplierName}`);
    return {
      website: knownData.website || null,
      logoUrl: null, // Will try to fetch later
      description: knownData.description || null,
      businessType: knownData.businessType || null,
      email: null,
      phone: null,
      address: null,
      vatNumber: null,
      kvkNumber: null,
      country: knownData.country || null,
      confidence: 0.95,
      sourceUrl: knownData.website || null,
    };
  }

  // Try to extract domain from hint email
  const emailDomain = input.hintEmail ? extractDomainFromEmail(input.hintEmail) : null;

  // Build search queries
  const searchQueries: string[] = [];

  // Query 1: Company name + country
  const countryHint = input.hintCountry || 'Netherlands';
  searchQueries.push(`"${input.supplierName}" company ${countryHint} website contact`);

  // Query 2: If we have email domain, search for that
  if (emailDomain && !emailDomain.includes('gmail') && !emailDomain.includes('outlook') && !emailDomain.includes('hotmail')) {
    searchQueries.push(`site:${emailDomain} contact about`);
  }

  // Query 3: Dutch business registry
  searchQueries.push(`"${input.supplierName}" KVK Netherlands`);

  // Execute searches
  const allSearchResults: any[] = [];
  for (const query of searchQueries.slice(0, 2)) {
    const results = await searchWeb(query, tavilyApiKey);
    allSearchResults.push(...results);
    if (allSearchResults.length >= 8) break;
  }

  if (allSearchResults.length === 0) {
    console.log('No search results found for supplier');
    return createEmptyResult();
  }

  // Use AI to extract supplier information
  const searchContent = allSearchResults.map(r => ({
    title: r.title,
    url: r.url,
    content: (r.content || r.snippet || '').substring(0, 1500),
  }));

  const prompt = `You are a business research assistant. Extract company information for this supplier from the search results.

SUPPLIER TO RESEARCH:
- Name: "${input.supplierName}"
${input.hintEmail ? `- Known Email: ${input.hintEmail}` : ''}
${input.hintCountry ? `- Likely Country: ${input.hintCountry}` : ''}
${emailDomain ? `- Email Domain: ${emailDomain}` : ''}

SEARCH RESULTS:
${JSON.stringify(searchContent, null, 2)}

Extract ALL available information about this company. Look for:
1. Official website URL
2. Company description (what they sell/do)
3. Business type: retailer, wholesaler, marketplace, manufacturer, distributor, or other
4. Contact email (customer service or general)
5. Phone number
6. Physical address (street, city, postal code, country)
7. VAT number (BTW nummer in Dutch)
8. KVK number (Dutch Chamber of Commerce registration)
9. Country (ISO 2-letter code like NL, DE, BE)

For Dutch companies, the KVK number is 8 digits. VAT numbers start with country code (e.g., NL123456789B01).

Respond with ONLY this JSON (no markdown, no explanation):
{
  "website": "https://...",
  "description": "Brief description of what the company does",
  "business_type": "retailer|wholesaler|marketplace|manufacturer|distributor|other",
  "email": "contact@...",
  "phone": "+31...",
  "address": {
    "street": "...",
    "city": "...",
    "postal_code": "...",
    "country": "NL"
  },
  "vat_number": "NL...",
  "kvk_number": "12345678",
  "country": "NL",
  "confidence": 0.0 to 1.0,
  "source_url": "URL where you found most info"
}

Use null for any fields you cannot determine with reasonable confidence.`;

  try {
    const response = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('No AI response for supplier research');
      return createEmptyResult();
    }

    // Parse response
    const cleanedContent = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON in supplier research response');
      return createEmptyResult();
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result: SupplierResearchResult = {
      website: parsed.website || null,
      logoUrl: null, // Will try to fetch logo separately
      description: parsed.description || null,
      businessType: parsed.business_type || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      address: parsed.address || null,
      vatNumber: parsed.vat_number || null,
      kvkNumber: parsed.kvk_number || null,
      country: parsed.country || null,
      confidence: parsed.confidence || 0.6,
      sourceUrl: parsed.source_url || null,
    };

    console.log(`Supplier research complete:`, {
      website: result.website,
      businessType: result.businessType,
      country: result.country,
      confidence: result.confidence,
    });

    return result;
  } catch (error) {
    console.error('Supplier research AI error:', error);
    return createEmptyResult();
  }
}

function createEmptyResult(): SupplierResearchResult {
  return {
    website: null,
    logoUrl: null,
    description: null,
    businessType: null,
    email: null,
    phone: null,
    address: null,
    vatNumber: null,
    kvkNumber: null,
    country: null,
    confidence: 0,
    sourceUrl: null,
  };
}

// Try to find and download company logo
async function findAndStoreLogo(
  supabase: any,
  companyId: string,
  supplierName: string,
  website: string | null
): Promise<string | null> {
  if (!website) return null;

  try {
    // Try common logo locations
    const domain = new URL(website).hostname;
    const logoUrls = [
      `https://logo.clearbit.com/${domain}`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    ];

    for (const logoUrl of logoUrls) {
      try {
        console.log(`Trying to fetch logo from: ${logoUrl}`);
        const response = await fetch(logoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LogoFetcher/1.0)',
          },
        });

        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || 'image/png';
        if (!contentType.startsWith('image/')) continue;

        const blob = await response.blob();
        if (blob.size < 500) continue; // Too small, likely not a real logo

        const arrayBuffer = await blob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const extension = contentType.includes('png') ? 'png' :
                         contentType.includes('svg') ? 'svg' : 'jpg';

        const slug = supplierName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
        const filename = `${companyId}/suppliers/${slug}-logo-${Date.now()}.${extension}`;

        const { data, error } = await supabase.storage
          .from('brand-assets')
          .upload(filename, buffer, {
            contentType,
            upsert: false,
          });

        if (error) {
          console.log(`Failed to upload logo: ${error.message}`);
          continue;
        }

        if (data) {
          const { data: urlData } = supabase.storage
            .from('brand-assets')
            .getPublicUrl(filename);

          if (urlData?.publicUrl) {
            console.log(`Logo stored: ${urlData.publicUrl}`);
            return urlData.publicUrl;
          }
        }
      } catch (e) {
        console.log(`Logo fetch error for ${logoUrl}:`, e);
      }
    }
  } catch (error) {
    console.error('Logo download error:', error);
  }

  return null;
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
      throw new Error("TAVILY_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const together = new Together({ apiKey: togetherApiKey });

    const body = await req.json();

    // Support both single item and batch processing
    const items: SupplierResearchInput[] = body.items || [body];
    const results: any[] = [];

    for (const input of items) {
      const { queueId, supplierName, hintEmail, hintCountry } = input;

      if (!queueId || !supplierName) {
        results.push({ queueId, success: false, error: "Missing required fields" });
        continue;
      }

      console.log(`\n========================================`);
      console.log(`Researching Supplier: ${supplierName}`);
      console.log(`========================================`);

      // Update status to researching
      await supabase
        .from('supplier_research_queue')
        .update({
          status: 'researching',
          last_research_at: new Date().toISOString(),
          research_attempts: supabase.sql`research_attempts + 1`,
        })
        .eq('id', queueId);

      // Get queue record to get company_id
      const { data: queueRecord } = await supabase
        .from('supplier_research_queue')
        .select('company_id, supplier_id')
        .eq('id', queueId)
        .single();

      if (!queueRecord) {
        results.push({ queueId, success: false, error: "Queue record not found" });
        continue;
      }

      // Research the supplier
      const researchResult = await researchSupplier(together, tavilyApiKey, input);

      // Try to find and store logo
      let logoUrl = researchResult.logoUrl;
      if (!logoUrl && researchResult.website) {
        logoUrl = await findAndStoreLogo(
          supabase,
          queueRecord.company_id,
          supplierName,
          researchResult.website
        );
      }

      // Call database function to update supplier
      const { data: processResult, error: processError } = await supabase
        .rpc('process_supplier_research_result', {
          p_queue_id: queueId,
          p_website: researchResult.website,
          p_logo_url: logoUrl,
          p_description: researchResult.description,
          p_business_type: researchResult.businessType,
          p_email: researchResult.email,
          p_phone: researchResult.phone,
          p_address: researchResult.address,
          p_vat_number: researchResult.vatNumber,
          p_kvk_number: researchResult.kvkNumber,
          p_country: researchResult.country,
          p_confidence: researchResult.confidence,
          p_source_url: researchResult.sourceUrl,
        });

      if (processError) {
        console.error('Error processing supplier research result:', processError);
        await supabase
          .from('supplier_research_queue')
          .update({
            status: 'failed',
            error_message: processError.message,
          })
          .eq('id', queueId);

        results.push({ queueId, success: false, error: processError.message });
      } else {
        console.log(`SUCCESS: Supplier enriched - ID: ${processResult.supplier_id}`);
        results.push({
          queueId,
          success: true,
          ...processResult,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Research supplier error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

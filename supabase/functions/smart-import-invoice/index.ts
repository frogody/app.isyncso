import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmartImportRequest {
  pdfText: string;
  fileName: string;
  companyId: string;
  userId: string;
  paymentDate?: string; // Override date for ECB rate lookup
}

interface ExtractionResult {
  vendor: {
    name: string;
    address?: string;
    vat_number?: string;
    website?: string;
    email?: string;
    phone?: string;
    iban?: string;
  };
  invoice: {
    number?: string;
    date?: string;
    due_date?: string;
    currency: string;
    subtotal?: number;
    tax_amount?: number;
    total: number;
  };
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate_percent: number;
    line_total: number;
    category_hint?: string;
  }>;
  classification: {
    is_recurring: boolean;
    recurring_frequency?: string | null;
    expense_category: string;
    is_reverse_charge: boolean;
  };
  confidence: {
    overall: number;
    vendor: number;
    amounts: number;
    line_items: number;
  };
}

// ─── LLM Extraction ──────────────────────────────────────────────────────────

async function extractInvoiceData(groqApiKey: string, pdfText: string): Promise<{ success: boolean; data?: ExtractionResult; error?: string }> {
  console.log(`[EXTRACT] Starting extraction, text length: ${pdfText.length}`);
  console.log(`[EXTRACT] First 500 chars of input: ${pdfText.substring(0, 500)}`);

  // The PDF text is already clean (extracted by pdf.js client-side).
  // We use the LLM purely to structure it into JSON — NOT to generate content.
  const userMessage = `Below is the EXACT text extracted from a PDF invoice. Parse it into the JSON schema below.

CRITICAL: Every value you return MUST come directly from the text. If a field is not present in the text, use null. Do NOT invent, guess, or hallucinate ANY values. The vendor name, amounts, dates — everything must be a direct copy from the text.

JSON schema to fill:
{
  "vendor": { "name": "", "address": "", "vat_number": null, "website": null, "email": null, "phone": null, "iban": null },
  "invoice": { "number": "", "date": "YYYY-MM-DD", "due_date": "YYYY-MM-DD or null", "currency": "EUR", "subtotal": 0, "tax_amount": 0, "total": 0 },
  "line_items": [{ "description": "", "quantity": 1, "unit_price": 0, "tax_rate_percent": 0, "line_total": 0, "category_hint": null }],
  "classification": { "is_recurring": false, "recurring_frequency": null, "expense_category": "other", "is_reverse_charge": false },
  "confidence": { "overall": 0.0, "vendor": 0.0, "amounts": 0.0, "line_items": 0.0 }
}

Rules:
- vendor = the company that SENT the invoice (not the "Bill to" recipient)
- Dates must be ISO format YYYY-MM-DD
- Currency: detect from € = EUR, $ = USD, £ = GBP
- If tax is not explicitly listed, set tax_amount to 0 and tax_rate_percent to 0
- is_reverse_charge = true if vendor is outside Netherlands but buyer is Dutch
- is_recurring = true if it looks like a subscription (SaaS, monthly plan, etc.)
- expense_category: software|hosting|office_supplies|professional_services|advertising|travel|telecom|insurance|rent|utilities|other

=== INVOICE TEXT START ===
${pdfText}
=== INVOICE TEXT END ===

Return ONLY the JSON object. No explanation, no markdown.`;

  const callGroq = async (model: string, useJsonFormat: boolean): Promise<ExtractionResult | null> => {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: "You are a data extraction tool. You ONLY output valid JSON. You extract data from the provided text. You NEVER invent data." },
        { role: "user", content: userMessage },
      ],
      max_tokens: 4096,
      temperature: 0,
    };
    if (useJsonFormat) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[EXTRACT] ${model} returned ${response.status}: ${errText.substring(0, 200)}`);
      return null;
    }

    const apiData = await response.json();
    const content = apiData.choices?.[0]?.message?.content || "";
    console.log(`[EXTRACT] ${model} raw response (first 300): ${content.substring(0, 300)}`);

    if (!content) return null;

    // Clean and extract JSON
    let jsonStr = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Find balanced JSON object containing "vendor"
    const vendorIdx = jsonStr.indexOf('"vendor"');
    if (vendorIdx !== -1) {
      const before = jsonStr.substring(0, vendorIdx);
      const braceIdx = before.lastIndexOf("{");
      if (braceIdx !== -1) {
        const candidate = jsonStr.substring(braceIdx);
        let depth = 0;
        for (let i = 0; i < candidate.length; i++) {
          if (candidate[i] === "{") depth++;
          else if (candidate[i] === "}") depth--;
          if (depth === 0 && i > 0) {
            jsonStr = candidate.substring(0, i + 1);
            break;
          }
        }
      }
    }

    // Clean trailing commas and control chars
    jsonStr = jsonStr
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, " ");

    const parsed = JSON.parse(jsonStr) as ExtractionResult;
    console.log(`[EXTRACT] ${model} parsed — vendor: ${parsed.vendor?.name}, total: ${parsed.invoice?.total}`);
    return parsed;
  };

  // Attempt 1: Llama 4 Scout with json_object mode
  try {
    console.log("[EXTRACT] Attempt 1: llama-4-scout + json_object");
    const result = await callGroq("meta-llama/llama-4-scout-17b-16e-instruct", true);
    if (result?.vendor?.name) return { success: true, data: result };
  } catch (e) {
    console.warn("[EXTRACT] Attempt 1 error:", (e as Error).message?.substring(0, 150));
  }

  // Attempt 2: Llama 4 Scout free-form (extract JSON from mixed output)
  try {
    console.log("[EXTRACT] Attempt 2: llama-4-scout free-form");
    const result = await callGroq("meta-llama/llama-4-scout-17b-16e-instruct", false);
    if (result?.vendor?.name) return { success: true, data: result };
  } catch (e) {
    console.warn("[EXTRACT] Attempt 2 error:", (e as Error).message?.substring(0, 150));
  }

  // Attempt 3: Gemma 2 9B — small but excellent at instruction following
  try {
    console.log("[EXTRACT] Attempt 3: gemma2-9b-it");
    const result = await callGroq("gemma2-9b-it", true);
    if (result?.vendor?.name) return { success: true, data: result };
  } catch (e) {
    console.warn("[EXTRACT] Attempt 3 error:", (e as Error).message?.substring(0, 150));
  }

  return { success: false, error: "Extraction failed — the AI could not parse this invoice. Please try again." };
}

// ─── ECB Currency Conversion ─────────────────────────────────────────────────

async function getECBRate(
  supabase: any,
  currency: string,
  date: string
): Promise<{ rate: number; source: string } | null> {
  if (currency === "EUR") return { rate: 1, source: "identity" };

  // 1. Check cache
  const { data: cached } = await supabase
    .from("exchange_rates")
    .select("rate, source")
    .eq("currency_from", currency)
    .eq("currency_to", "EUR")
    .eq("rate_date", date)
    .single();

  if (cached) {
    console.log(`[ECB] Cache hit: ${currency}/EUR on ${date} = ${cached.rate}`);
    return { rate: Number(cached.rate), source: "cache" };
  }

  // 2. Fetch from ECB SDMX CSV API
  try {
    const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${currency}.EUR.SP00.A?format=csvdata&startPeriod=${date}&endPeriod=${date}`;
    console.log(`[ECB] Fetching: ${url}`);

    const resp = await fetch(url);
    if (resp.ok) {
      const csv = await resp.text();
      const lines = csv.trim().split("\n");
      // CSV header is first line, data is second line
      if (lines.length >= 2) {
        const headers = lines[0].split(",");
        const values = lines[1].split(",");
        const obsValueIdx = headers.indexOf("OBS_VALUE");
        if (obsValueIdx !== -1 && values[obsValueIdx]) {
          const rate = parseFloat(values[obsValueIdx]);
          if (!isNaN(rate) && rate > 0) {
            // ECB returns how many units of foreign currency per 1 EUR
            // We need: 1 foreign currency unit = X EUR → invert
            const invertedRate = 1 / rate;
            console.log(`[ECB] Got rate: 1 ${currency} = ${invertedRate.toFixed(6)} EUR (raw: ${rate})`);

            // Cache it
            await supabase.from("exchange_rates").upsert(
              {
                currency_from: currency,
                currency_to: "EUR",
                rate: invertedRate,
                rate_date: date,
                source: "ecb_sdmx",
              },
              { onConflict: "currency_from,currency_to,rate_date" }
            );

            return { rate: invertedRate, source: "ecb_sdmx" };
          }
        }
      }
    }
  } catch (e) {
    console.warn("[ECB] SDMX API failed, trying daily XML feed:", e);
  }

  // 3. Fallback: ECB daily XML feed (latest rates only)
  try {
    const xmlResp = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
    if (xmlResp.ok) {
      const xml = await xmlResp.text();
      // Parse XML for the currency rate
      const regex = new RegExp(`currency='${currency}'\\s+rate='([\\d.]+)'`);
      const match = xml.match(regex);
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        const invertedRate = 1 / rate;
        console.log(`[ECB] Daily XML rate: 1 ${currency} = ${invertedRate.toFixed(6)} EUR`);

        // Cache with today's date
        await supabase.from("exchange_rates").upsert(
          {
            currency_from: currency,
            currency_to: "EUR",
            rate: invertedRate,
            rate_date: date,
            source: "ecb_daily_xml",
          },
          { onConflict: "currency_from,currency_to,rate_date" }
        );

        return { rate: invertedRate, source: "ecb_daily_xml" };
      }
    }
  } catch (e) {
    console.warn("[ECB] Daily XML feed failed:", e);
  }

  console.error(`[ECB] Could not get rate for ${currency} on ${date}`);
  return null;
}

// ─── Vendor Matching ─────────────────────────────────────────────────────────

async function matchOrCreateVendor(
  supabase: any,
  companyId: string,
  vendorData: ExtractionResult["vendor"]
): Promise<{ id: string; match_type: string; confidence: number }> {
  // 1. Exact match on VAT number
  if (vendorData.vat_number) {
    const { data: vatMatch } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("vat_number", vendorData.vat_number)
      .limit(1)
      .maybeSingle();

    if (vatMatch) {
      console.log(`[VENDOR] Exact VAT match: ${vatMatch.name} (${vatMatch.id})`);
      return { id: vatMatch.id, match_type: "exact_vat", confidence: 0.99 };
    }
  }

  // 2. Fuzzy name match
  if (vendorData.name) {
    const { data: nameMatches } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("company_id", companyId)
      .ilike("name", `%${vendorData.name}%`)
      .limit(3);

    if (nameMatches && nameMatches.length > 0) {
      console.log(`[VENDOR] Name match: ${nameMatches[0].name} (${nameMatches[0].id})`);
      return { id: nameMatches[0].id, match_type: "fuzzy_name", confidence: 0.85 };
    }

    // Also check with reversed pattern (vendor name contains our search)
    const { data: reverseMatches } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("company_id", companyId)
      .filter("name", "ilike", `%${vendorData.name.split(" ")[0]}%`)
      .limit(3);

    if (reverseMatches && reverseMatches.length > 0) {
      console.log(`[VENDOR] Partial name match: ${reverseMatches[0].name}`);
      return { id: reverseMatches[0].id, match_type: "partial_name", confidence: 0.7 };
    }
  }

  // 3. Create new vendor
  console.log(`[VENDOR] No match found, creating new vendor: ${vendorData.name}`);
  const { data: newVendor, error } = await supabase
    .from("vendors")
    .insert({
      company_id: companyId,
      name: vendorData.name || "Unknown Vendor",
      email: vendorData.email || null,
      phone: vendorData.phone || null,
      address: vendorData.address || null,
      vat_number: vendorData.vat_number || null,
      website: vendorData.website || null,
      iban: vendorData.iban || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[VENDOR] Create error:", error.message);
    throw new Error(`Failed to create vendor: ${error.message}`);
  }

  return { id: newVendor.id, match_type: "new", confidence: 1.0 };
}

// ─── Tax Classification ──────────────────────────────────────────────────────

async function classifyTax(
  supabase: any,
  companyId: string,
  extraction: ExtractionResult
): Promise<{ rate_id: string | null; rate: number; is_reverse_charge: boolean }> {
  const isReverseCharge = extraction.classification.is_reverse_charge;

  // Determine the target tax rate percentage
  let targetRate = 21; // Default Dutch BTW
  if (isReverseCharge) {
    targetRate = 0; // Reverse charge = 0% BTW
  } else if (extraction.line_items.length > 0) {
    // Use the most common tax rate from line items
    const rates = extraction.line_items.map((li) => li.tax_rate_percent);
    const mode = rates.sort((a, b) => rates.filter((v) => v === a).length - rates.filter((v) => v === b).length).pop() || 21;
    targetRate = mode;
  }

  // Look up matching tax rate in DB
  const { data: taxRates } = await supabase
    .from("tax_rates")
    .select("id, name, rate")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (taxRates && taxRates.length > 0) {
    // Find exact rate match
    const exactMatch = taxRates.find((tr: any) => Number(tr.rate) === targetRate);
    if (exactMatch) {
      return { rate_id: exactMatch.id, rate: targetRate, is_reverse_charge: isReverseCharge };
    }
    // Fallback to default rate
    return { rate_id: taxRates[0].id, rate: Number(taxRates[0].rate), is_reverse_charge: isReverseCharge };
  }

  return { rate_id: null, rate: targetRate, is_reverse_charge: isReverseCharge };
}

// ─── Recurring Detection ─────────────────────────────────────────────────────

function detectRecurring(extraction: ExtractionResult): {
  detected: boolean;
  frequency: string | null;
  suggested_next_date: string | null;
} {
  if (!extraction.classification.is_recurring) {
    return { detected: false, frequency: null, suggested_next_date: null };
  }

  const frequency = extraction.classification.recurring_frequency || "monthly";
  const invoiceDate = extraction.invoice.date;

  let suggestedNextDate: string | null = null;
  if (invoiceDate) {
    const d = new Date(invoiceDate);
    switch (frequency) {
      case "weekly":
        d.setDate(d.getDate() + 7);
        break;
      case "monthly":
        d.setMonth(d.getMonth() + 1);
        break;
      case "quarterly":
        d.setMonth(d.getMonth() + 3);
        break;
      case "annual":
      case "yearly":
        d.setFullYear(d.getFullYear() + 1);
        break;
      default:
        d.setMonth(d.getMonth() + 1);
    }
    suggestedNextDate = d.toISOString().split("T")[0];
  }

  return { detected: true, frequency, suggested_next_date: suggestedNextDate };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: SmartImportRequest = await req.json();
    const { pdfText, fileName, companyId, userId, paymentDate } = body;

    if (!pdfText || !companyId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "pdfText, companyId, and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SMART-IMPORT] Processing "${fileName}" for company ${companyId}`);

    // Step 1: LLM extraction
    const extraction = await extractInvoiceData(groqApiKey, pdfText);
    if (!extraction.success || !extraction.data) {
      return new Response(
        JSON.stringify({ success: false, error: extraction.error || "Extraction failed" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = extraction.data;

    // Step 2: Vendor matching
    let vendorMatch: { id: string; match_type: string; confidence: number } | null = null;
    try {
      vendorMatch = await matchOrCreateVendor(supabase, companyId, data.vendor);
    } catch (e) {
      console.warn("[SMART-IMPORT] Vendor matching failed:", e);
    }

    // Step 3: Tax classification
    const taxResult = await classifyTax(supabase, companyId, data);

    // Step 4: Currency conversion
    let currencyConversion: {
      original_currency: string;
      original_amount: number;
      exchange_rate: number;
      eur_amount: number;
      source: string;
    } | null = null;

    const invoiceCurrency = (data.invoice.currency || "EUR").toUpperCase();
    if (invoiceCurrency !== "EUR" && data.invoice.total) {
      const rateDate = paymentDate || data.invoice.date || new Date().toISOString().split("T")[0];
      const ecbResult = await getECBRate(supabase, invoiceCurrency, rateDate);

      if (ecbResult) {
        currencyConversion = {
          original_currency: invoiceCurrency,
          original_amount: data.invoice.total,
          exchange_rate: ecbResult.rate,
          eur_amount: Math.round(data.invoice.total * ecbResult.rate * 100) / 100,
          source: ecbResult.source,
        };
        console.log(
          `[SMART-IMPORT] Currency: ${data.invoice.total} ${invoiceCurrency} → ${currencyConversion.eur_amount} EUR (rate: ${ecbResult.rate})`
        );
      }
    }

    // Step 5: Recurring detection
    const recurring = detectRecurring(data);

    // Return all analysis results for frontend review
    const result = {
      success: true,
      extraction: data,
      vendor_match: vendorMatch,
      tax_classification: taxResult,
      currency_conversion: currencyConversion,
      recurring,
    };

    console.log(`[SMART-IMPORT] Done — vendor: ${vendorMatch?.match_type}, tax: ${taxResult.rate}%, recurring: ${recurring.detected}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[SMART-IMPORT] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

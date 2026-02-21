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

/** Flat shape returned by the LLM — pure extraction, no classification */
interface FlatExtraction {
  supplier_name?: string | null;
  supplier_address?: string | null;
  supplier_vat?: string | null;
  supplier_email?: string | null;
  supplier_phone?: string | null;
  supplier_website?: string | null;
  supplier_iban?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  subtotal?: number | null;
  tax_amount?: number | null;
  tax_percent?: number | null;
  total?: number | null;
  currency?: string | null;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate_percent?: number | null;
    line_total: number;
  }>;
  confidence?: number;
}

/** Nested shape expected by the frontend (FinanceSmartImport.jsx) */
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

// ─── LLM Extraction (stock-purchases pattern) ──────────────────────────────

const EXTRACTION_PROMPT = `You are an expert invoice data extraction system. Extract structured data from this invoice text.

CRITICAL RULES:
1. Extract ONLY what you can clearly see in the text - NEVER guess or infer
2. For numbers, extract exact values including decimals
3. For dates, use ISO format (YYYY-MM-DD)
4. If a field is not visible or unclear, use null
5. Line items must have description, quantity, unit_price, and line_total
6. IMPORTANT — Identifying the supplier: The supplier is the company that ISSUED/SENT the invoice. It is NOT the "Bill to" / "Factuur aan" company (that is the buyer/recipient). In invoice text the sender is usually listed FIRST (top-left) with their address, and the "Bill to" section contains the recipient. Look for patterns like "Company A ... Bill to ... Company B" — Company A is the supplier.
7. For IBAN, extract the full bank account number if present
8. IMPORTANT — VAT numbers: Only set supplier_vat to the VAT number that belongs to the SUPPLIER. If a VAT number appears in or near the "Bill to" / recipient section, it belongs to the BUYER — do NOT put it in supplier_vat. If the only VAT number visible belongs to the buyer, set supplier_vat to null.
9. For VAT numbers, extract exactly as shown (e.g., NL123456789B01, DE123456789)

Return ONLY a valid JSON object in this exact format:
{
  "supplier_name": "string or null",
  "supplier_address": "string or null",
  "supplier_vat": "string or null",
  "supplier_email": "string or null",
  "supplier_phone": "string or null",
  "supplier_website": "string or null",
  "supplier_iban": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "subtotal": number or null,
  "tax_amount": number or null,
  "tax_percent": number or null,
  "total": number or null,
  "currency": "EUR" or "USD" or "GBP" or null,
  "line_items": [
    {
      "description": "exact text from invoice",
      "quantity": number,
      "unit_price": number,
      "tax_rate_percent": number or null,
      "line_total": number
    }
  ],
  "confidence": 0.0 to 1.0
}`;

async function extractFromText(
  groqApiKey: string,
  pdfText: string,
  retryCount = 0
): Promise<{ success: boolean; data?: FlatExtraction; error?: string; usage?: any }> {
  const MAX_RETRIES = 2;

  try {
    console.log(`[EXTRACT] Calling Groq LLM (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), text length: ${pdfText.length}`);
    if (retryCount === 0) {
      console.log(`[EXTRACT] First 500 chars: ${pdfText.substring(0, 500)}`);
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a data extraction tool. You ONLY output valid JSON. You extract data from the provided text. You NEVER invent data.",
          },
          {
            role: "user",
            content: EXTRACTION_PROMPT + `\n\nHere is the invoice text:\n\n${pdfText}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const apiResponse = await response.json();
    const content = apiResponse.choices?.[0]?.message?.content || "";
    console.log(`[EXTRACT] Response length: ${content.length}`);

    if (!content) {
      return { success: false, error: "No response from AI" };
    }

    // Clean up response — strip markdown code blocks
    let cleanedContent = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Find JSON object
    let jsonString: string | null = null;
    const firstBrace = cleanedContent.indexOf("{");
    const lastBrace = cleanedContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = cleanedContent.substring(firstBrace, lastBrace + 1);
    }

    // Fallback: find JSON containing "supplier_name"
    if (!jsonString) {
      const match = content.match(/\{[\s\S]*?"supplier_name"[\s\S]*?\}/);
      if (match) {
        const startIdx = content.indexOf(match[0]);
        let braceCount = 0;
        let endIdx = startIdx;
        for (let i = startIdx; i < content.length; i++) {
          if (content[i] === "{") braceCount++;
          if (content[i] === "}") braceCount--;
          if (braceCount === 0) {
            endIdx = i + 1;
            break;
          }
        }
        jsonString = content.substring(startIdx, endIdx);
      }
    }

    if (!jsonString) {
      return { success: false, error: "Could not parse AI response — no JSON found" };
    }

    // Clean up JSON
    jsonString = jsonString
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, " ")
      .replace(/\n\s*\n/g, "\n");

    let data: FlatExtraction;
    try {
      data = JSON.parse(jsonString) as FlatExtraction;
    } catch (parseError) {
      console.error("[EXTRACT] JSON parse error:", parseError);
      return { success: false, error: "Could not parse AI response — invalid JSON" };
    }

    console.log(`[EXTRACT] Parsed — supplier: ${data.supplier_name}, total: ${data.total}, confidence: ${data.confidence}`);
    return { success: true, data, usage: apiResponse.usage };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[EXTRACT] Error (attempt ${retryCount + 1}):`, errorMessage);

    // Retry on timeout or server errors only
    const isRetryable =
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("502") ||
      errorMessage.includes("503") ||
      errorMessage.includes("504");

    if (isRetryable && retryCount < MAX_RETRIES) {
      console.log("[EXTRACT] Retrying in 2 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return extractFromText(groqApiKey, pdfText, retryCount + 1);
    }

    return { success: false, error: errorMessage };
  }
}

// ─── Deterministic Classification (code, NOT LLM) ──────────────────────────

function classifyExpenseCategory(
  vendorName: string | null | undefined,
  lineItems: Array<{ description: string }>,
  invoiceText: string
): string {
  const text = [vendorName, ...lineItems.map((li) => li.description), invoiceText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const rules: [string, RegExp][] = [
    ["software", /\b(saas|software|license|licence|licentie|subscription|abonnement|api|cloud|platform|github|gitlab|aws|azure|gcp|claude|anthropic|openai|notion|slack|figma|vercel|netlify|jira|atlassian|adobe|microsoft 365|office 365|google workspace|dropbox|zoom|hubspot|salesforce|stripe|twilio)\b/],
    ["hosting", /\b(hosting|server|domain|dns|cdn|cloudflare|heroku|digitalocean|hetzner|ovh|strato|webhosting|vps|dedicated|compute|s3|storage bucket)\b/],
    ["advertising", /\b(adverti|marketing|campaign|google ads|meta ads|facebook ads|linkedin ads|adwords|ad spend|promot|sponsor)\b/],
    ["telecom", /\b(telecom|telefoon|phone plan|mobile plan|internet|wifi|vodafone|kpn|t-mobile|ziggo|tele2|provider|data bundle|sim)\b/],
    ["travel", /\b(travel|reis|flight|vlucht|hotel|airbnb|booking\.com|transport|taxi|uber|train|trein|ns\.nl|klm|schiphol)\b/],
    ["professional_services", /\b(consult|advies|legal|juridisch|account|audit|notaris|lawyer|attorney|advocaat|boekhouder|adviseur|interim)\b/],
    ["office_supplies", /\b(office supplies|kantoorartikelen|stationery|furniture|meubel|desk|bureau|chair|stoel|equipment|printer|papier|toner|inkt)\b/],
    ["insurance", /\b(insurance|verzekering|polis|premie|dekking|aansprakelijkheid|liability)\b/],
    ["rent", /\b(rent|huur|lease|office space|workspace|kantoor|bedrijfsruimte|werkplek)\b/],
    ["utilities", /\b(utilit|gas|electric|elektr|water|energy|energie|nutsvoorziening|eneco|vattenfall|essent|greenchoice)\b/],
  ];

  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return category;
  }
  return "other";
}

function detectReverseCharge(vendorVat: string | null | undefined): boolean {
  if (!vendorVat) return false;
  const vatClean = vendorVat.replace(/[\s.-]/g, "").toUpperCase();
  if (vatClean.length < 4) return false;

  // Company is Dutch (NL). If vendor VAT starts with non-NL EU country code → reverse charge.
  const vendorCountry = vatClean.substring(0, 2);
  if (vendorCountry === "NL") return false; // Same country, no reverse charge

  const euPrefixes = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "EL", "HU", "IE", "IT", "LV", "LT", "LU", "MT",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  ];
  return euPrefixes.includes(vendorCountry);
}

function detectRecurringFromText(
  vendorName: string | null | undefined,
  lineItems: Array<{ description: string }>,
  invoiceText: string
): { is_recurring: boolean; frequency: string | null } {
  const text = [vendorName, ...lineItems.map((li) => li.description), invoiceText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const recurringKeywords =
    /\b(subscri|monthly plan|annual plan|yearly plan|quarterly plan|recurring|membership|licentie|abonnement|maandelijks|jaarlijks|per maand|per jaar|per kwartaal)\b/;

  if (!recurringKeywords.test(text)) {
    return { is_recurring: false, frequency: null };
  }

  // Detect frequency
  if (/\b(annual|yearly|per year|per jaar|jaarlijks|jaarbasis)\b/.test(text))
    return { is_recurring: true, frequency: "annual" };
  if (/\b(quarterly|per quarter|per kwartaal|kwartaal)\b/.test(text))
    return { is_recurring: true, frequency: "quarterly" };
  if (/\b(weekly|per week|wekelijks)\b/.test(text))
    return { is_recurring: true, frequency: "weekly" };
  return { is_recurring: true, frequency: "monthly" }; // default
}

function calculateConfidence(flat: FlatExtraction): {
  overall: number;
  vendor: number;
  amounts: number;
  line_items: number;
} {
  // Vendor confidence: based on how many vendor fields are filled
  const vendorFields = [
    flat.supplier_name,
    flat.supplier_address,
    flat.supplier_vat,
    flat.supplier_email,
    flat.supplier_iban,
  ].filter(Boolean);
  const vendorScore = Math.min(1.0, vendorFields.length / 2); // 2+ fields = 1.0

  // Amounts confidence: based on total, subtotal, tax consistency
  let amountsScore = 0;
  if (flat.total != null && flat.total > 0) amountsScore += 0.5;
  if (flat.subtotal != null && flat.subtotal > 0) amountsScore += 0.25;
  if (flat.tax_amount != null) amountsScore += 0.15;
  if (flat.subtotal && flat.tax_amount != null && flat.total) {
    const calculatedTotal = flat.subtotal + flat.tax_amount;
    if (Math.abs(calculatedTotal - flat.total) < 0.05) amountsScore += 0.1; // consistency bonus
  }
  amountsScore = Math.min(1.0, amountsScore);

  // Line items confidence
  const items = flat.line_items || [];
  let lineScore = 0;
  if (items.length > 0) {
    const validItems = items.filter(
      (li) => li.description && li.description.length > 1 && li.line_total != null
    );
    lineScore = validItems.length / items.length;
  }

  const overall = vendorScore * 0.3 + amountsScore * 0.4 + lineScore * 0.3;

  return {
    overall: Math.round(overall * 100) / 100,
    vendor: Math.round(vendorScore * 100) / 100,
    amounts: Math.round(amountsScore * 100) / 100,
    line_items: Math.round(lineScore * 100) / 100,
  };
}

function detectCurrency(invoiceText: string, extractedCurrency: string | null | undefined): string {
  if (extractedCurrency) return extractedCurrency.toUpperCase();
  // Regex fallback: look for currency symbols followed by digits
  if (/\$\s*\d/.test(invoiceText)) return "USD";
  if (/\u00a3\s*\d/.test(invoiceText)) return "GBP"; // £
  return "EUR"; // default for NL company
}

// ─── VAT Validation ─────────────────────────────────────────────────────────

/**
 * Validate that the extracted VAT number actually belongs to the supplier.
 * If the supplier address indicates a non-EU country (US, UK, etc.) but the
 * VAT number starts with an EU country code, the LLM likely grabbed the
 * buyer's VAT number by mistake → return null.
 */
function validateSupplierVat(
  vat: string | null | undefined,
  supplierAddress: string | null | undefined
): string | null {
  if (!vat) return null;

  const vatClean = vat.replace(/[\s.-]/g, "").toUpperCase();
  const vatCountry = vatClean.substring(0, 2);
  const addr = (supplierAddress || "").toLowerCase();

  // If supplier address clearly indicates a non-EU country,
  // but VAT starts with an EU prefix, it's the buyer's VAT.
  const nonEuCountryPatterns =
    /\b(united states|usa|u\.s\.a|california|new york|texas|florida|illinois|washington|canada|australia|japan|china|india|brazil|united kingdom|uk|england|scotland|switzerland)\b/;

  if (nonEuCountryPatterns.test(addr)) {
    const euPrefixes = [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
      "DE", "GR", "EL", "HU", "IE", "IT", "LV", "LT", "LU", "MT",
      "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    ];
    if (euPrefixes.includes(vatCountry)) {
      console.log(`[VAT] Discarding VAT ${vat} — supplier address is non-EU ("${addr.substring(0, 60)}") but VAT prefix is ${vatCountry}`);
      return null;
    }
  }

  return vat;
}

// ─── Map flat extraction → nested ExtractionResult ──────────────────────────

function buildExtractionResult(
  flat: FlatExtraction,
  pdfText: string
): ExtractionResult {
  const lineItems = (flat.line_items || []).map((li) => ({
    description: li.description || "",
    quantity: li.quantity || 1,
    unit_price: li.unit_price || 0,
    tax_rate_percent: li.tax_rate_percent || 0,
    line_total: li.line_total || 0,
  }));

  const recurringResult = detectRecurringFromText(
    flat.supplier_name,
    lineItems,
    pdfText
  );

  // Validate that the VAT actually belongs to the supplier (not the buyer)
  const validatedVat = validateSupplierVat(flat.supplier_vat, flat.supplier_address);

  return {
    vendor: {
      name: flat.supplier_name || "",
      address: flat.supplier_address || undefined,
      vat_number: validatedVat || undefined,
      website: flat.supplier_website || undefined,
      email: flat.supplier_email || undefined,
      phone: flat.supplier_phone || undefined,
      iban: flat.supplier_iban || undefined,
    },
    invoice: {
      number: flat.invoice_number || undefined,
      date: flat.invoice_date || undefined,
      due_date: flat.due_date || undefined,
      currency: detectCurrency(pdfText, flat.currency),
      subtotal: flat.subtotal ?? undefined,
      tax_amount: flat.tax_amount ?? undefined,
      total: flat.total || 0,
    },
    line_items: lineItems,
    classification: {
      is_recurring: recurringResult.is_recurring,
      recurring_frequency: recurringResult.frequency,
      expense_category: classifyExpenseCategory(flat.supplier_name, lineItems, pdfText),
      is_reverse_charge: detectReverseCharge(validatedVat),
    },
    confidence: calculateConfidence(flat),
  };
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
      if (lines.length >= 2) {
        const headers = lines[0].split(",");
        const values = lines[1].split(",");
        const obsValueIdx = headers.indexOf("OBS_VALUE");
        if (obsValueIdx !== -1 && values[obsValueIdx]) {
          const rate = parseFloat(values[obsValueIdx]);
          if (!isNaN(rate) && rate > 0) {
            const invertedRate = 1 / rate;
            console.log(`[ECB] Got rate: 1 ${currency} = ${invertedRate.toFixed(6)} EUR (raw: ${rate})`);

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
      const regex = new RegExp(`currency='${currency}'\\s+rate='([\\d.]+)'`);
      const match = xml.match(regex);
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        const invertedRate = 1 / rate;
        console.log(`[ECB] Daily XML rate: 1 ${currency} = ${invertedRate.toFixed(6)} EUR`);

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

    // Also check with first word of vendor name
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
    const mode = rates
      .sort((a, b) => rates.filter((v) => v === a).length - rates.filter((v) => v === b).length)
      .pop() || 21;
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
    const exactMatch = taxRates.find((tr: any) => Number(tr.rate) === targetRate);
    if (exactMatch) {
      return { rate_id: exactMatch.id, rate: targetRate, is_reverse_charge: isReverseCharge };
    }
    return { rate_id: taxRates[0].id, rate: Number(taxRates[0].rate), is_reverse_charge: isReverseCharge };
  }

  return { rate_id: null, rate: targetRate, is_reverse_charge: isReverseCharge };
}

// ─── Recurring Detection (next-date calculator) ─────────────────────────────

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

    // Step 1: Pure LLM extraction (no classification — just extract what's in the text)
    const extraction = await extractFromText(groqApiKey, pdfText);
    if (!extraction.success || !extraction.data) {
      return new Response(
        JSON.stringify({ success: false, error: extraction.error || "Extraction failed" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Build nested result with deterministic classification (code, not LLM)
    const data = buildExtractionResult(extraction.data, pdfText);

    console.log(`[SMART-IMPORT] Extraction done — vendor: ${data.vendor.name}, total: ${data.invoice.total}, category: ${data.classification.expense_category}, reverse_charge: ${data.classification.is_reverse_charge}, recurring: ${data.classification.is_recurring}`);

    // Step 3: Vendor matching
    let vendorMatch: { id: string; match_type: string; confidence: number } | null = null;
    try {
      vendorMatch = await matchOrCreateVendor(supabase, companyId, data.vendor);
    } catch (e) {
      console.warn("[SMART-IMPORT] Vendor matching failed:", e);
    }

    // Step 4: Tax classification
    const taxResult = await classifyTax(supabase, companyId, data);

    // Step 5: Currency conversion
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

    // Step 6: Recurring detection (next-date calculation)
    const recurring = detectRecurring(data);

    // Step 7: Log AI usage
    if (extraction.usage) {
      try {
        const promptTokens = extraction.usage.prompt_tokens || 0;
        const completionTokens = extraction.usage.completion_tokens || 0;
        const cost = (promptTokens / 1000000) * 0.05 + (completionTokens / 1000000) * 0.08;

        await supabase.from("ai_usage_logs").insert({
          organization_id: companyId,
          user_id: userId,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: extraction.usage.total_tokens || promptTokens + completionTokens,
          cost,
          request_type: "invoice_processing",
          endpoint: "/openai/v1/chat/completions",
          metadata: {
            model_name: "llama-3.1-8b-instant",
            provider: "groq",
            function: "smart-import-invoice",
            extraction_success: true,
            confidence: data.confidence.overall,
          },
        });
      } catch (logError) {
        console.warn("[SMART-IMPORT] Failed to log AI usage:", logError);
      }
    }

    // Return all analysis results for frontend review
    const result = {
      success: true,
      extraction: data,
      vendor_match: vendorMatch,
      tax_classification: taxResult,
      currency_conversion: currencyConversion,
      recurring,
    };

    console.log(
      `[SMART-IMPORT] Done — vendor: ${vendorMatch?.match_type}, tax: ${taxResult.rate}%, recurring: ${recurring.detected}, confidence: ${data.confidence.overall}`
    );

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

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
  paymentDate?: string;
  myCompany?: {
    name?: string;
    vat?: string;
    email?: string;
    address?: string;
    iban?: string;
    kvk?: string;
  };
}

/** Flat shape returned by the LLM — pure extraction, no classification */
interface FlatExtraction {
  supplier_name?: string | null;
  supplier_address?: string | null;
  supplier_country?: string | null;
  supplier_vat?: string | null;
  supplier_kvk?: string | null;
  supplier_email?: string | null;
  supplier_phone?: string | null;
  supplier_website?: string | null;
  supplier_iban?: string | null;
  buyer_name?: string | null;
  buyer_vat?: string | null;
  document_label?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  payment_terms_days?: number | null;
  subtotal?: number | null;
  tax_lines?: Array<{
    rate_percent: number;
    base_amount: number;
    tax_amount: number;
  }>;
  total?: number | null;
  currency?: string | null;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate_percent?: number | null;
    line_total: number;
  }>;
  payment_reference?: string | null;
  notes_on_invoice?: string | null;
  confidence?: number;
}

/** Nested shape expected by the frontend (FinanceSmartImport.jsx) */
interface ExtractionResult {
  vendor: {
    name: string;
    address?: string;
    country?: string;
    vat_number?: string;
    kvk?: string;
    website?: string;
    email?: string;
    phone?: string;
    iban?: string;
  };
  invoice: {
    number?: string;
    date?: string;
    due_date?: string;
    payment_terms_days?: number;
    currency: string;
    subtotal?: number;
    tax_amount?: number;
    total: number;
    document_label?: string;
    payment_reference?: string;
    notes_on_invoice?: string;
  };
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate_percent: number;
    line_total: number;
    category_hint?: string;
  }>;
  tax_lines: Array<{
    rate_percent: number;
    base_amount: number;
    tax_amount: number;
  }>;
  classification: {
    is_recurring: boolean;
    recurring_frequency?: string | null;
    expense_category: string;
    gl_code: string;
    is_reverse_charge: boolean;
  };
  confidence: {
    overall: number;
    vendor: number;
    amounts: number;
    line_items: number;
    tax: number;
    doc_type: number;
  };
}

interface CountryResult {
  code: string;
  isEU: boolean;
  isNL: boolean;
}

interface TaxDecision {
  mechanism: "standard_btw" | "reverse_charge_eu" | "reverse_charge_non_eu" | "import_no_vat";
  rate: number;
  self_assess_rate: number;
  explanation: string;
  supplier_country: string;
  btw_rubric: string | null;
}

type DocumentType = "expense" | "bill" | "credit_note" | "proforma" | "sales_invoice";

// ─── Constants ────────────────────────────────────────────────────────────────

const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "EL", "HU", "IE", "IT", "LV", "LT", "LU", "MT",
  "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

const EU_COUNTRY_NAMES: Record<string, string> = {
  austria: "AT", belgium: "BE", bulgaria: "BG", croatia: "HR", cyprus: "CY",
  "czech republic": "CZ", czechia: "CZ", denmark: "DK", estonia: "EE",
  finland: "FI", france: "FR", germany: "DE", deutschland: "DE",
  greece: "GR", hungary: "HU", ireland: "IE", italy: "IT", italia: "IT",
  latvia: "LV", lithuania: "LT", luxembourg: "LU", malta: "MT",
  netherlands: "NL", nederland: "NL", "the netherlands": "NL",
  poland: "PL", portugal: "PT", romania: "RO", slovakia: "SK",
  slovenia: "SI", spain: "ES", espana: "ES", sweden: "SE",
  // Non-EU
  "united states": "US", usa: "US", "united kingdom": "GB", uk: "GB",
  switzerland: "CH", norway: "NO", canada: "CA", australia: "AU",
  japan: "JP", china: "CN", india: "IN", brazil: "BR",
  "south korea": "KR", singapore: "SG", "hong kong": "HK",
  israel: "IL", "new zealand": "NZ", mexico: "MX",
};

const GL_CODES: Record<string, string> = {
  software: "6100",
  hosting: "6110",
  advertising: "6300",
  telecom: "6400",
  travel: "6200",
  insurance: "6500",
  rent: "6600",
  office_supplies: "5000",
  professional_services: "6700",
  utilities: "6200",
  other: "6900",
};

// ─── LLM Extraction ──────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a data-copying machine. Copy text from the invoice into JSON fields.

CRITICAL RULES for identifying SUPPLIER vs BUYER:
- The SUPPLIER (vendor) is the company that ISSUED/SENT this invoice. They are the seller.
- The BUYER is the company being BILLED. They appear after "Bill to", "Billed to", "Factuur aan", "Invoice to", "Customer", "Client".
- The supplier name usually appears FIRST on the invoice, often at the top-left, BEFORE any "Bill to" section.
- The buyer's address, email, and VAT number appear AFTER the "Bill to" label.
- NEVER put the buyer's name in supplier_name or the buyer's details in supplier fields.
- If you see "Bill to: ACME Corp", then ACME Corp is the BUYER, not the supplier.

Other rules:
- Copy ONLY text you see. If a field is not visible, use null.
- Do not interpret, classify, or add information not present.
- Dates: YYYY-MM-DD. Amounts: numbers only (no currency symbols).
- For buyer_vat: copy the VAT number that appears in the "Bill to" section.
- For supplier_vat: copy the VAT number that appears near the supplier's name/address (NOT in "Bill to").

Respond with ONLY a JSON object (no markdown, no explanation):
{"supplier_name":null,"supplier_address":null,"supplier_country":null,"supplier_vat":null,"supplier_kvk":null,"supplier_email":null,"supplier_phone":null,"supplier_website":null,"supplier_iban":null,"buyer_name":null,"buyer_vat":null,"document_label":null,"invoice_number":null,"invoice_date":null,"due_date":null,"payment_terms_days":null,"subtotal":null,"tax_lines":[{"rate_percent":0,"base_amount":0,"tax_amount":0}],"total":null,"currency":null,"line_items":[{"description":"","quantity":1,"unit_price":0,"tax_rate_percent":null,"line_total":0}],"payment_reference":null,"notes_on_invoice":null,"confidence":0.9}`;

async function callLLM(
  apiKey: string,
  apiUrl: string,
  model: string,
  pdfText: string,
  myCompany?: SmartImportRequest["myCompany"]
): Promise<{ success: boolean; data?: FlatExtraction; error?: string; usage?: any; provider: string }> {
  const provider = apiUrl.includes("together") ? "together" : "groq";
  try {
    console.log(`[EXTRACT] Calling ${provider} (${model}), text length: ${pdfText.length}`);

    // Build prompt with optional company identity block
    let prompt = EXTRACTION_PROMPT;
    if (myCompany?.name) {
      const identityLines = [`\n\nYOUR COMPANY (the company using this system — this is NOT the supplier):`];
      identityLines.push(`Name: "${myCompany.name}"`);
      if (myCompany.vat) identityLines.push(`VAT: "${myCompany.vat}"`);
      if (myCompany.email) identityLines.push(`Email: "${myCompany.email}"`);
      if (myCompany.address) identityLines.push(`Address: "${myCompany.address}"`);
      if (myCompany.iban) identityLines.push(`IBAN: "${myCompany.iban}"`);
      if (myCompany.kvk) identityLines.push(`KVK: "${myCompany.kvk}"`);
      identityLines.push(`\nRULE: If you see this company on the invoice, it is NOT the supplier/vendor.`);
      identityLines.push(`The supplier is the OTHER company. Put the other company in supplier_name/supplier_* fields.`);
      prompt += identityLines.join("\n");
      console.log(`[EXTRACT] Injected company identity: "${myCompany.name}"`);
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a data extraction tool. Output ONLY valid JSON, no explanation." },
          { role: "user", content: prompt + `\n\nHere is the invoice text:\n\n${pdfText}` },
        ],
        max_tokens: 4096,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider} API error: ${response.status} ${errorText}`);
    }

    const apiResponse = await response.json();
    const content = apiResponse.choices?.[0]?.message?.content || "";

    if (!content) {
      return { success: false, error: "No response from AI", provider };
    }

    const parsed = parseJSONResponse(content);
    if (!parsed) {
      return { success: false, error: "Could not parse AI response — invalid JSON", provider };
    }

    const data = sanitizeExtraction(parsed, pdfText, myCompany);

    console.log(`[EXTRACT] Parsed — supplier: ${data.supplier_name}, total: ${data.total}, confidence: ${data.confidence}`);
    return { success: true, data, usage: apiResponse.usage, provider };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[EXTRACT] ${provider} error:`, msg);
    return { success: false, error: msg, provider };
  }
}

async function extractFromText(
  groqApiKey: string,
  pdfText: string,
  myCompany?: SmartImportRequest["myCompany"]
): Promise<{ success: boolean; data?: FlatExtraction; error?: string; usage?: any; provider?: string }> {
  const MAX_RETRIES = 2;

  // Attempt 1-3: Groq with llama-3.3-70b-versatile
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[EXTRACT] Groq retry ${attempt}/${MAX_RETRIES} in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }

    const result = await callLLM(
      groqApiKey,
      "https://api.groq.com/openai/v1/chat/completions",
      "llama-3.3-70b-versatile",
      pdfText,
      myCompany
    );

    if (result.success) return result;

    // Only retry on server errors / timeouts
    const isRetryable =
      result.error?.includes("timeout") || result.error?.includes("timed out") ||
      result.error?.includes("502") || result.error?.includes("503") || result.error?.includes("504");
    if (!isRetryable) break;
  }

  // Fallback: Together.ai with Llama-3.3-70B-Instruct-Turbo
  const togetherKey = Deno.env.get("TOGETHER_API_KEY");
  if (togetherKey) {
    console.log("[EXTRACT] Falling back to Together.ai...");
    const result = await callLLM(
      togetherKey,
      "https://api.together.xyz/v1/chat/completions",
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      pdfText,
      myCompany
    );
    if (result.success) return result;
    return { success: false, error: `All providers failed. Last: ${result.error}` };
  }

  return { success: false, error: "Groq failed and no TOGETHER_API_KEY configured for fallback" };
}

// ─── JSON Parsing ─────────────────────────────────────────────────────────────

function parseJSONResponse(content: string): FlatExtraction | null {
  // Strip markdown code blocks
  let cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find JSON object
  let jsonString: string | null = null;
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonString = cleaned.substring(firstBrace, lastBrace + 1);
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
        if (braceCount === 0) { endIdx = i + 1; break; }
      }
      jsonString = content.substring(startIdx, endIdx);
    }
  }

  if (!jsonString) return null;

  // Clean trailing commas and control chars
  jsonString = jsonString
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\n\s*\n/g, "\n");

  try {
    return JSON.parse(jsonString) as FlatExtraction;
  } catch {
    console.error("[EXTRACT] JSON parse failed");
    return null;
  }
}

// ─── Post-Extraction Sanitization ─────────────────────────────────────────────

function sanitizeExtraction(data: FlatExtraction, pdfText: string, myCompany?: SmartImportRequest["myCompany"]): FlatExtraction {
  const toNum = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    const cleaned = String(v).replace(/[€$£,\s]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };

  // Strip currency symbols from amounts
  data.subtotal = toNum(data.subtotal);
  data.total = toNum(data.total);
  data.payment_terms_days = toNum(data.payment_terms_days);

  if (data.tax_lines) {
    for (const tl of data.tax_lines) {
      tl.rate_percent = toNum(tl.rate_percent) ?? 0;
      tl.base_amount = toNum(tl.base_amount) ?? 0;
      tl.tax_amount = toNum(tl.tax_amount) ?? 0;
    }
    // Remove empty tax lines
    data.tax_lines = data.tax_lines.filter(tl => tl.tax_amount !== 0 || tl.rate_percent !== 0);
  }

  if (data.line_items) {
    for (const item of data.line_items) {
      item.unit_price = toNum(item.unit_price) ?? 0;
      item.line_total = toNum(item.line_total) ?? 0;
      item.quantity = toNum(item.quantity) ?? 1;
      item.tax_rate_percent = toNum(item.tax_rate_percent);
    }
  }

  // Strip VAT prefixes: "NL VAT NL005316291B62" → "NL005316291B62"
  const cleanVat = (v: string | null | undefined): string | null => {
    if (!v || typeof v !== "string") return null;
    return v
      .replace(/^(NL\s+VAT|BTW[- ]?nr\.?|VAT[- ]?(number|nr|no)?\.?|USt[- ]?IdNr\.?|TVA|IVA|MwSt[- ]?Nr\.?)\s*/i, "")
      .trim() || null;
  };
  data.supplier_vat = cleanVat(data.supplier_vat);
  data.buyer_vat = cleanVat(data.buyer_vat);

  // Cross-validate: if supplier_vat matches buyer_vat, null out supplier_vat
  if (data.supplier_vat && data.buyer_vat) {
    const sClean = data.supplier_vat.replace(/[\s.-]/g, "").toUpperCase();
    const bClean = data.buyer_vat.replace(/[\s.-]/g, "").toUpperCase();
    if (sClean === bClean) {
      console.log(`[SANITIZE] supplier_vat matches buyer_vat (${sClean}), nulling supplier_vat`);
      data.supplier_vat = null;
    }
  }

  // ── Identity-based swap: if supplier matches user's own company, swap ──────
  const strip = (s: string) => s.replace(/[\s.\-]/g, "").toUpperCase();

  if (myCompany?.name && data.supplier_name && data.buyer_name) {
    const myName = myCompany.name.toLowerCase().trim();
    const supplierName = data.supplier_name.toLowerCase().trim();

    const isMyCompany =
      supplierName === myName ||
      supplierName.includes(myName) || myName.includes(supplierName) ||
      (myCompany.vat && data.supplier_vat &&
        strip(myCompany.vat) === strip(data.supplier_vat)) ||
      (myCompany.email && data.supplier_email &&
        data.supplier_email.toLowerCase() === myCompany.email.toLowerCase()) ||
      (myCompany.iban && data.supplier_iban &&
        strip(myCompany.iban) === strip(data.supplier_iban));

    if (isMyCompany) {
      console.log(`[SANITIZE] Identity match: supplier "${data.supplier_name}" is user's own company "${myCompany.name}" — swapping with buyer "${data.buyer_name}"`);

      const oldSupplier = {
        name: data.supplier_name,
        address: data.supplier_address,
        country: data.supplier_country,
        vat: data.supplier_vat,
        kvk: data.supplier_kvk,
        email: data.supplier_email,
        phone: data.supplier_phone,
        website: data.supplier_website,
        iban: data.supplier_iban,
      };

      // The real supplier is what the LLM put as buyer
      data.supplier_name = data.buyer_name;
      data.buyer_name = oldSupplier.name;
      data.buyer_vat = oldSupplier.vat || data.buyer_vat;

      // Clear supplier fields — we don't have the real supplier's details yet
      data.supplier_vat = null;
      data.supplier_kvk = null;
      data.supplier_iban = null;
      data.supplier_address = null;
      data.supplier_country = null;
      data.supplier_email = null;
      data.supplier_phone = null;
      data.supplier_website = null;

      // Try to recover real supplier details from PDF text
      const pdfLower = pdfText.toLowerCase();
      const realNameLower = data.supplier_name!.toLowerCase();
      const nameIdx = pdfLower.indexOf(realNameLower);
      if (nameIdx !== -1) {
        const afterName = pdfText.substring(nameIdx + data.supplier_name!.length, nameIdx + data.supplier_name!.length + 500).trim();

        // Recover address: grab lines between the name and the first non-address field
        const addressLines = afterName.split(/\n/).slice(0, 3).map(l => l.trim()).filter(l =>
          l && !/[\w.+-]+@/.test(l) && !/^(kvk|btw|bank|iban|bic)/i.test(l) && !/^(www\.|https?:)/i.test(l)
        );
        if (addressLines.length > 0) {
          data.supplier_address = addressLines.join(", ");
        }

        const emailMatch = afterName.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
        if (emailMatch) data.supplier_email = emailMatch[0];

        const phoneMatch = afterName.match(/(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
        if (phoneMatch) data.supplier_phone = phoneMatch[0];

        const webMatch = afterName.match(/(?:www\.[\w.-]+\.\w{2,}|https?:\/\/[\w.-]+\.\w{2,})/i);
        if (webMatch) data.supplier_website = webMatch[0];

        const ibanMatch = afterName.match(/[A-Z]{2}\d{2}[A-Z0-9]{4,30}/);
        if (ibanMatch) data.supplier_iban = ibanMatch[0];

        const vatMatch = afterName.match(/[A-Z]{2}\d{8,12}[A-Z]?\d{0,2}/);
        if (vatMatch) data.supplier_vat = vatMatch[0];
      }

      console.log(`[SANITIZE] After identity swap — supplier: ${data.supplier_name}, buyer: ${data.buyer_name}`);
    }
  }

  // ── Supplier/Buyer swap detection ──────────────────────────────────────────
  // If the LLM confused supplier and buyer (common in two-column PDF layouts),
  // detect and fix it.
  if (data.supplier_name && data.buyer_name) {
    const pdfLower = pdfText.toLowerCase();
    const supplierLower = data.supplier_name.toLowerCase().trim();
    const buyerLower = data.buyer_name.toLowerCase().trim();

    // Find "Bill to" / "Billed to" / "Invoice to" / "Factuur aan" marker
    const billToMatch = pdfLower.match(/\b(bill\s*to|billed\s*to|invoice\s*to|factuur\s*aan|customer|client)\b/);
    const billToIdx = billToMatch ? pdfLower.indexOf(billToMatch[0]) : -1;

    let shouldSwap = false;

    if (billToIdx !== -1) {
      // Check if supplier_name appears AFTER "Bill to" (it shouldn't)
      const afterBillTo = pdfLower.substring(billToIdx);
      const supplierInBuyerSection = afterBillTo.indexOf(supplierLower) !== -1;
      const buyerBeforeBillTo = pdfLower.substring(0, billToIdx).includes(buyerLower);

      if (supplierInBuyerSection && buyerBeforeBillTo) {
        shouldSwap = true;
        console.log(`[SANITIZE] Supplier "${data.supplier_name}" found in Bill-to section, buyer "${data.buyer_name}" found before it — swapping`);
      } else if (supplierInBuyerSection && !pdfLower.substring(0, billToIdx).includes(supplierLower)) {
        // supplier_name only appears after "Bill to", not before
        shouldSwap = true;
        console.log(`[SANITIZE] Supplier "${data.supplier_name}" only found after Bill-to — swapping`);
      }
    }

    // Additional heuristic: if supplier has the buyer's email domain or vice versa
    if (!shouldSwap && data.supplier_email && data.buyer_name) {
      const supplierEmailDomain = data.supplier_email.split("@")[1]?.toLowerCase() || "";
      if (supplierEmailDomain && buyerLower.includes(supplierEmailDomain.split(".")[0])) {
        // supplier_email domain matches buyer_name — likely swapped
        shouldSwap = true;
        console.log(`[SANITIZE] Supplier email domain matches buyer name — swapping`);
      }
    }

    if (shouldSwap) {
      // Save the OLD (wrong) supplier data — these are actually the buyer's details
      const oldSupplier = {
        name: data.supplier_name,
        address: data.supplier_address,
        country: data.supplier_country,
        vat: data.supplier_vat,
        kvk: data.supplier_kvk,
        email: data.supplier_email,
        phone: data.supplier_phone,
        website: data.supplier_website,
        iban: data.supplier_iban,
      };

      // The real supplier name is what the LLM put as buyer_name
      data.supplier_name = data.buyer_name;
      data.buyer_name = oldSupplier.name;

      // Move old supplier fields (which are actually buyer's) to buyer
      data.buyer_vat = oldSupplier.vat || data.buyer_vat;

      // Now recover the REAL supplier's details from the PDF text
      // The real supplier's info is in the text BEFORE "Bill to"
      data.supplier_vat = null;
      data.supplier_kvk = null;
      data.supplier_iban = null;
      data.supplier_address = null;
      data.supplier_country = null;
      data.supplier_email = null;
      data.supplier_phone = null;
      data.supplier_website = null;

      if (billToIdx !== -1) {
        const beforeBillTo = pdfText.substring(0, billToIdx).trim();
        const pdfLowerBefore = beforeBillTo.toLowerCase();

        // Find the real supplier name in the pre-Bill-to text
        const realNameLower = data.supplier_name!.toLowerCase();
        const nameIdx = pdfLowerBefore.indexOf(realNameLower);

        if (nameIdx !== -1) {
          // Everything after the supplier name until end of pre-Bill-to section = supplier details
          const afterName = beforeBillTo.substring(nameIdx + data.supplier_name!.length).trim();

          // Extract email
          const emailMatch = afterName.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
          if (emailMatch) data.supplier_email = emailMatch[0];

          // Extract phone
          const phoneMatch = afterName.match(/(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
          if (phoneMatch) data.supplier_phone = phoneMatch[0];

          // Extract website
          const webMatch = afterName.match(/(?:www\.[\w.-]+\.\w{2,}|https?:\/\/[\w.-]+\.\w{2,})/i);
          if (webMatch) data.supplier_website = webMatch[0];

          // Extract IBAN
          const ibanMatch = afterName.match(/[A-Z]{2}\d{2}[A-Z0-9]{4,30}/);
          if (ibanMatch) data.supplier_iban = ibanMatch[0];

          // Build address from remaining lines (filter out metadata lines)
          const metadataPattern = /^(invoice|date|due|number|page|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|amount|total|subtotal|qty|description|tax)/i;
          const lines = afterName
            .split(/[\n,]/)
            .map(l => l.trim())
            .filter(l =>
              l.length > 2 &&
              !metadataPattern.test(l) &&
              !l.match(/^[\w.+-]+@/) && // not email
              !l.match(/^(?:www\.|https?:)/) && // not website
              !l.match(/^[A-Z]{2}\d{2}[A-Z0-9]/) // not IBAN
            );

          if (lines.length > 0) {
            data.supplier_address = lines.join(", ");
          }
        }

        // Detect country from the full pre-Bill-to text (more reliable)
        const countryPatterns: [RegExp, string][] = [
          [/\bunited\s+states\b/i, "US"],
          [/\busa\b/i, "US"],
          [/\bu\.s\.a\.?\b/i, "US"],
          [/\b[a-z]{2,}\s*,\s*(?:california|ca|new york|ny|texas|tx|florida|fl|illinois|il|washington|wa|massachusetts|ma|pennsylvania|pa|ohio|oh|georgia|ga|virginia|va|colorado|co|arizona|az|oregon|or|connecticut|ct|maryland|md|new jersey|nj|north carolina|nc)\s+\d{5}/i, "US"],
          [/\bca\s+\d{5}\b/, "US"],
          [/\bnetherlands\b/i, "NL"], [/\bnederland\b/i, "NL"],
          [/\bgermany\b/i, "DE"], [/\bdeutschland\b/i, "DE"],
          [/\bfrance\b/i, "FR"],
          [/\bunited\s+kingdom\b/i, "GB"], [/\bengland\b/i, "GB"],
          [/\bbelgi[ëu]m?\b/i, "BE"],
          [/\bswitzerland\b/i, "CH"], [/\bschweiz\b/i, "CH"],
          [/\bcanada\b/i, "CA"],
          [/\baustralia\b/i, "AU"],
          [/\bjapan\b/i, "JP"],
          [/\bsingapore\b/i, "SG"],
          [/\bisrael\b/i, "IL"],
          [/\bireland\b/i, "IE"],
        ];

        for (const [pattern, code] of countryPatterns) {
          if (pattern.test(pdfLowerBefore) || (data.supplier_address && pattern.test(data.supplier_address.toLowerCase()))) {
            data.supplier_country = code;
            break;
          }
        }
      }

      console.log(`[SANITIZE] After swap — supplier: ${data.supplier_name}, address: ${data.supplier_address}, country: ${data.supplier_country}, email: ${data.supplier_email}`);
    }
  }

  // If supplier_name is still empty but buyer_name exists, check if the PDF has a clear
  // company name before any "Bill to" marker
  if (!data.supplier_name && data.buyer_name) {
    const pdfLower = pdfText.toLowerCase();
    const billToMatch = pdfLower.match(/\b(bill\s*to|billed\s*to|invoice\s*to|factuur\s*aan)\b/);
    if (billToMatch) {
      const beforeBillTo = pdfText.substring(0, pdfLower.indexOf(billToMatch[0])).trim();
      // First substantial line that isn't "Invoice" or a date
      const lines = beforeBillTo.split(/\n/).map(l => l.trim()).filter(l =>
        l.length > 2 && !/^(invoice|date|due|number|page|\d)/i.test(l)
      );
      if (lines.length > 0) {
        data.supplier_name = lines[0];
        console.log(`[SANITIZE] Recovered supplier name from pre-Bill-to text: "${data.supplier_name}"`);
      }
    }
  }

  // Normalize currency
  if (data.currency) {
    const c = data.currency.trim();
    if (c === "€" || c.toUpperCase() === "EUR") data.currency = "EUR";
    else if (c === "$" || c.toUpperCase() === "USD") data.currency = "USD";
    else if (c === "£" || c.toUpperCase() === "GBP") data.currency = "GBP";
    else data.currency = c.toUpperCase();
  }

  return data;
}

// ─── Math Validation ──────────────────────────────────────────────────────────

function validateMath(data: FlatExtraction): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const taxSum = (data.tax_lines || []).reduce((s, tl) => s + tl.tax_amount, 0);

  // subtotal + tax ≈ total (within €0.10)
  if (data.subtotal != null && data.total != null && taxSum > 0) {
    const expected = data.subtotal + taxSum;
    if (Math.abs(expected - data.total) > 0.10) {
      reasons.push(`Subtotal (${data.subtotal}) + tax (${taxSum}) = ${expected}, but total is ${data.total}`);
    }
  }

  // sum(line_items.line_total) ≈ subtotal (within €1.00)
  if (data.line_items && data.line_items.length > 0 && data.subtotal != null) {
    const lineSum = data.line_items.reduce((s, li) => s + (li.line_total || 0), 0);
    if (lineSum > 0 && Math.abs(lineSum - data.subtotal) > 1.00) {
      reasons.push(`Line items sum (${lineSum.toFixed(2)}) doesn't match subtotal (${data.subtotal})`);
    }
  }

  return { valid: reasons.length === 0, reasons };
}

// ─── VAT Validation ──────────────────────────────────────────────────────────

function validateSupplierVat(
  vat: string | null | undefined,
  supplierAddress: string | null | undefined,
  supplierName: string | null | undefined,
  pdfText: string
): string | null {
  if (!vat) return null;

  const vatClean = vat.replace(/[\s.-]/g, "").toUpperCase();
  const vatCountry = vatClean.substring(0, 2);

  // If VAT doesn't start with an EU prefix, return as-is
  if (!EU_COUNTRIES.includes(vatCountry)) return vat;

  const allText = [supplierAddress || "", supplierName || "", pdfText].join(" ").toLowerCase();

  const nonEuPatterns = /\b(united states|usa|u\.s\.a\.?|canada|australia|japan|china|india|brazil|united kingdom|switzerland)\b/;
  const usStatePatterns = /\b(ca|ny|tx|fl|il|wa|ma|pa|oh|ga|nc|nj|va|mi|az|co|mn|wi|or|ct|md|sc|in|tn|mo|al)\s+\d{5}\b/;

  const addr = (supplierAddress || "").toLowerCase();
  const addrHasNonEu = nonEuPatterns.test(addr) || usStatePatterns.test(addr);

  // Check if VAT appears in buyer section
  const pdfLower = pdfText.toLowerCase();
  const vatInBuyerSection = (() => {
    const billToIdx = pdfLower.indexOf("bill to");
    const factuurAanIdx = pdfLower.indexOf("factuur aan");
    const buyerStart = Math.max(billToIdx, factuurAanIdx);
    if (buyerStart === -1) return false;
    const afterBillTo = pdfLower.substring(buyerStart);
    return afterBillTo.includes(vatClean.toLowerCase()) || afterBillTo.includes(vat.toLowerCase());
  })();

  if (addrHasNonEu || vatInBuyerSection) {
    console.log(`[VAT] Discarding VAT ${vat} — supplier appears non-EU or VAT in buyer section`);
    return null;
  }

  // Check context around supplier name
  if (supplierName) {
    const nameIdx = pdfLower.indexOf(supplierName.toLowerCase());
    if (nameIdx !== -1) {
      const context = pdfLower.substring(nameIdx, nameIdx + 200);
      if (nonEuPatterns.test(context) || usStatePatterns.test(context)) {
        console.log(`[VAT] Discarding VAT ${vat} — non-EU country found near supplier name`);
        return null;
      }
    }
  }

  return vat;
}

// ─── Country Detection (Phase 2A) ────────────────────────────────────────────

function detectCountry(flat: FlatExtraction): CountryResult {
  const fallback: CountryResult = { code: "UNKNOWN", isEU: false, isNL: false };

  // Priority 1: supplier_vat prefix
  if (flat.supplier_vat) {
    const prefix = flat.supplier_vat.replace(/[\s.-]/g, "").toUpperCase().substring(0, 2);
    if (/^[A-Z]{2}$/.test(prefix)) {
      const code = prefix === "EL" ? "GR" : prefix;
      return { code, isEU: EU_COUNTRIES.includes(code), isNL: code === "NL" };
    }
  }

  // Priority 2: supplier_country text
  if (flat.supplier_country) {
    const normalized = flat.supplier_country.trim().toLowerCase();
    // Direct ISO match
    if (/^[a-z]{2}$/i.test(normalized)) {
      const code = normalized.toUpperCase();
      return { code, isEU: EU_COUNTRIES.includes(code), isNL: code === "NL" };
    }
    const mapped = EU_COUNTRY_NAMES[normalized];
    if (mapped) {
      return { code: mapped, isEU: EU_COUNTRIES.includes(mapped), isNL: mapped === "NL" };
    }
  }

  // Priority 3: supplier_address regex
  if (flat.supplier_address) {
    const addr = flat.supplier_address;
    const addrLower = addr.toLowerCase();
    // US state+ZIP pattern
    if (/\b[a-z]{2}\s+\d{5}(-\d{4})?\b/.test(addrLower)) {
      return { code: "US", isEU: false, isNL: false };
    }
    // Country names in address
    for (const [name, code] of Object.entries(EU_COUNTRY_NAMES)) {
      if (addrLower.includes(name)) {
        return { code, isEU: EU_COUNTRIES.includes(code), isNL: code === "NL" };
      }
    }
    // Postcode patterns (when no country name is present)
    // NL: 4 digits + 2 uppercase letters (e.g. 3769AV, 1012 AB)
    if (/\b\d{4}\s?[A-Z]{2}\b/.test(addr)) {
      return { code: "NL", isEU: true, isNL: true };
    }
    // UK: e.g. SW1A 1AA, EC2R 8AH
    if (/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/.test(addr)) {
      return { code: "GB", isEU: false, isNL: false };
    }
  }

  // Priority 4: supplier_iban prefix
  if (flat.supplier_iban) {
    const ibanCountry = flat.supplier_iban.replace(/\s/g, "").substring(0, 2).toUpperCase();
    if (/^[A-Z]{2}$/.test(ibanCountry)) {
      return { code: ibanCountry, isEU: EU_COUNTRIES.includes(ibanCountry), isNL: ibanCountry === "NL" };
    }
  }

  return fallback;
}

// ─── Tax Rules Engine (Phase 2B) ─────────────────────────────────────────────

function isReducedRateCategory(text: string): boolean {
  return /\b(food|voedsel|boek|book|magazine|tijdschrift|medicine|medicijn|farmac|hotel|accommodat|verblijf|camping|water\s*supply)\b/i.test(text);
}

function isLikelyService(text: string): boolean {
  return /\b(subscription|abonnement|license|licentie|hosting|saas|cloud|platform|consult|advies|support|maintenance|onderhoud|service|dienst|plan\b|api|credits?\b|seats?\b|per\s*(month|year|maand|jaar)|membership|monthly|yearly|annually|annual|digital|online|streaming|software|download|app\b|tool)\b/i.test(text);
}

function determineTaxDecision(
  country: CountryResult,
  flat: FlatExtraction,
  pdfText: string
): TaxDecision {
  const allText = [
    flat.supplier_name,
    ...(flat.line_items || []).map((li) => li.description),
    pdfText,
  ].filter(Boolean).join(" ");

  const reducedRate = isReducedRateCategory(allText);
  const selfAssessRate = reducedRate ? 9 : 21;

  // NL domestic supplier
  if (country.isNL) {
    // Use rate from invoice tax_lines if available
    let invoiceRate = 21;
    if (flat.tax_lines && flat.tax_lines.length > 0) {
      invoiceRate = flat.tax_lines[0].rate_percent;
    }
    return {
      mechanism: "standard_btw",
      rate: invoiceRate,
      self_assess_rate: 0,
      explanation: `Standaard BTW (${invoiceRate}%) — binnenlandse leverancier`,
      supplier_country: "NL",
      btw_rubric: null, // NL purchase: no rubric, contributes to 5b only
    };
  }

  // EU non-NL
  if (country.isEU) {
    return {
      mechanism: "reverse_charge_eu",
      rate: 0,
      self_assess_rate: selfAssessRate,
      explanation: `Intracommunautaire verwerving — verlegde BTW (${selfAssessRate}%) — leverancier ${country.code}`,
      supplier_country: country.code,
      btw_rubric: "4b", // EU non-NL service → rubriek 4b
    };
  }

  // Non-EU
  if (country.code !== "UNKNOWN") {
    // Determine if service or goods
    // Per Belastingdienst: diensten van buiten de EU → verlegde BTW
    // Report in rubric 4a of BTW aangifte. Claim back as voorbelasting.
    // Non-EU suppliers do NOT need an EU VAT number.
    // Invoice correctly shows €0 tax — Dutch buyer self-assesses.
    if (isLikelyService(allText)) {
      return {
        mechanism: "reverse_charge_non_eu",
        rate: 0,
        self_assess_rate: selfAssessRate,
        explanation: `Dienst van buiten de EU — verlegde BTW (${selfAssessRate}%) — leverancier ${country.code}. Aangeven in rubriek 4a BTW-aangifte, aftrekbaar als voorbelasting.`,
        supplier_country: country.code,
        btw_rubric: "4a", // Non-EU service → rubriek 4a
      };
    }
    return {
      mechanism: "import_no_vat",
      rate: 0,
      self_assess_rate: 0,
      explanation: `Import van buiten de EU — geen BTW (douane apart) — leverancier ${country.code}`,
      supplier_country: country.code,
      btw_rubric: null, // Import goods: customs handles VAT
    };
  }

  // Unknown country — check if supplier has NO VAT number AND the invoice shows no tax.
  // This is a strong signal for a non-EU service provider.
  const invoiceHasNoTax = !flat.tax_lines || flat.tax_lines.length === 0 ||
    flat.tax_lines.every(tl => tl.tax_amount === 0 && tl.rate_percent === 0);
  const noSupplierVat = !flat.supplier_vat;

  if (isLikelyService(allText)) {
    // Service without VAT number and no tax on invoice → likely non-EU
    return {
      mechanism: "reverse_charge_non_eu",
      rate: 0,
      self_assess_rate: selfAssessRate,
      explanation: noSupplierVat && invoiceHasNoTax
        ? `Vermoedelijk buitenlandse dienst (geen BTW-nr, geen BTW op factuur) — verlegde BTW (${selfAssessRate}%). Aangeven in rubriek 4a.`
        : `Vermoedelijk buitenlandse dienst — verlegde BTW (${selfAssessRate}%)`,
      supplier_country: "UNKNOWN",
      btw_rubric: "4a", // Likely non-EU service → rubriek 4a
    };
  }

  // Fallback: if no VAT number and no tax on invoice, assume non-EU
  if (noSupplierVat && invoiceHasNoTax) {
    return {
      mechanism: "reverse_charge_non_eu",
      rate: 0,
      self_assess_rate: selfAssessRate,
      explanation: `Geen BTW-nummer en geen BTW op factuur — vermoedelijk buitenlandse leverancier — verlegde BTW (${selfAssessRate}%)`,
      supplier_country: "UNKNOWN",
      btw_rubric: "4a", // No VAT info → assume non-EU → rubriek 4a
    };
  }

  // True fallback: standard BTW
  return {
    mechanism: "standard_btw",
    rate: 21,
    self_assess_rate: 0,
    explanation: "Standaard BTW (21%) — land onbekend",
    supplier_country: "UNKNOWN",
    btw_rubric: null, // Standard BTW fallback: contributes to 5b only
  };
}

// ─── Document Type Classification (Phase 2C) ─────────────────────────────────

function classifyDocumentType(flat: FlatExtraction, myCompany?: SmartImportRequest["myCompany"]): { type: DocumentType; confidence: number } {
  const label = (flat.document_label || "").toLowerCase();
  const total = flat.total ?? 0;
  const strip = (s: string) => s.replace(/[\s.\-]/g, "").toUpperCase();

  // Credit note detection
  if (
    /credit\s*note|creditnota|gutschrift|avoir|nota\s*di\s*credito/i.test(label) ||
    total < 0
  ) {
    return { type: "credit_note", confidence: 0.95 };
  }

  // Proforma detection
  if (/pro\s*forma|proforma/i.test(label)) {
    return { type: "proforma", confidence: 0.90 };
  }

  // Sales invoice detection: supplier matches user's own company
  if (myCompany?.name && flat.supplier_name) {
    const myName = myCompany.name.toLowerCase().trim();
    const supplierName = flat.supplier_name.toLowerCase().trim();
    const isMySalesInvoice =
      supplierName.includes(myName) || myName.includes(supplierName) ||
      (myCompany.vat && flat.supplier_vat && strip(myCompany.vat) === strip(flat.supplier_vat));
    if (isMySalesInvoice) {
      return { type: "sales_invoice", confidence: 0.90 };
    }
  }

  // Bill detection (has due date or payment terms)
  if (flat.due_date || (flat.payment_terms_days && flat.payment_terms_days > 0)) {
    return { type: "bill", confidence: 0.85 };
  }

  // Default: expense
  return { type: "expense", confidence: 0.80 };
}

// ─── Expense Category + GL Codes (Phase 2D) ──────────────────────────────────

function classifyExpenseCategory(
  vendorName: string | null | undefined,
  lineItems: Array<{ description: string }>,
  invoiceText: string
): { category: string; gl_code: string } {
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
  ];

  for (const [category, pattern] of rules) {
    if (pattern.test(text)) {
      return { category, gl_code: GL_CODES[category] || "6900" };
    }
  }
  return { category: "other", gl_code: "6900" };
}

// ─── Recurring Detection ──────────────────────────────────────────────────────

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
    /\b(subscri|plan\b|monthly plan|annual plan|yearly plan|quarterly plan|recurring|membership|licentie|abonnement|maandelijks|jaarlijks|per maand|per jaar|per kwartaal)\b/;

  // Date range pattern like "Feb 10–Mar 10" or "Jan 1 - Feb 1" = subscription period
  const dateRangePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\s*[–—-]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i;
  const hasDateRange = dateRangePattern.test(text);

  if (!recurringKeywords.test(text) && !hasDateRange) {
    return { is_recurring: false, frequency: null };
  }

  if (/\b(annual|yearly|per year|per jaar|jaarlijks|jaarbasis)\b/.test(text))
    return { is_recurring: true, frequency: "annual" };
  if (/\b(quarterly|per quarter|per kwartaal|kwartaal)\b/.test(text))
    return { is_recurring: true, frequency: "quarterly" };
  if (/\b(weekly|per week|wekelijks)\b/.test(text))
    return { is_recurring: true, frequency: "weekly" };
  return { is_recurring: true, frequency: "monthly" };
}

// ─── Confidence Scoring (Phase 2E) ───────────────────────────────────────────

function calculateConfidence(
  flat: FlatExtraction,
  docType: { type: DocumentType; confidence: number },
  taxDecision: TaxDecision,
  mathValidation: { valid: boolean; reasons: string[] }
): {
  overall: number;
  vendor: number;
  amounts: number;
  line_items: number;
  tax: number;
  doc_type: number;
  requires_review: boolean;
  review_reasons: string[];
} {
  const review_reasons: string[] = [];

  // Vendor: 20% weight
  const vendorFields = [
    flat.supplier_name,
    flat.supplier_address,
    flat.supplier_vat,
    flat.supplier_email,
    flat.supplier_iban,
  ].filter(Boolean);
  const vendorScore = Math.min(1.0, vendorFields.length / 2);
  if (vendorScore < 0.5) review_reasons.push("Incomplete vendor information");

  // Amounts: 30% weight
  let amountsScore = 0;
  if (flat.total != null && flat.total > 0) amountsScore += 0.5;
  if (flat.subtotal != null && flat.subtotal > 0) amountsScore += 0.25;
  if (flat.tax_lines && flat.tax_lines.length > 0) amountsScore += 0.15;
  if (mathValidation.valid) amountsScore += 0.1;
  else {
    review_reasons.push(...mathValidation.reasons);
  }
  amountsScore = Math.min(1.0, amountsScore);

  // Line items: 15% weight
  const items = flat.line_items || [];
  let lineScore = 0;
  if (items.length > 0) {
    const validItems = items.filter(
      (li) => li.description && li.description.length > 1 && li.line_total != null
    );
    lineScore = validItems.length / items.length;
  }

  // Tax: 20% weight
  let taxScore = 0.5; // base
  if (taxDecision.mechanism !== "standard_btw" && !flat.supplier_vat) {
    taxScore = 0.6; // reasonable — non-EU vendors often don't have EU VAT
  }
  if (flat.supplier_vat) taxScore += 0.3;
  if (taxDecision.supplier_country !== "UNKNOWN") taxScore += 0.2;
  taxScore = Math.min(1.0, taxScore);
  if (taxDecision.supplier_country === "UNKNOWN") {
    review_reasons.push("Could not determine supplier country");
  }

  // Doc type: 15% weight
  const docTypeScore = docType.confidence;

  const overall =
    vendorScore * 0.20 +
    amountsScore * 0.30 +
    lineScore * 0.15 +
    taxScore * 0.20 +
    docTypeScore * 0.15;

  const roundedOverall = Math.round(overall * 100) / 100;
  const requires_review = roundedOverall < 0.90 || review_reasons.length > 0;

  return {
    overall: roundedOverall,
    vendor: Math.round(vendorScore * 100) / 100,
    amounts: Math.round(amountsScore * 100) / 100,
    line_items: Math.round(lineScore * 100) / 100,
    tax: Math.round(taxScore * 100) / 100,
    doc_type: Math.round(docTypeScore * 100) / 100,
    requires_review,
    review_reasons,
  };
}

// ─── Build Nested Result ──────────────────────────────────────────────────────

function buildExtractionResult(
  flat: FlatExtraction,
  pdfText: string,
  country: CountryResult,
  taxDecision: TaxDecision,
  mathValidation: { valid: boolean; reasons: string[] },
  docType: { type: DocumentType; confidence: number }
): ExtractionResult {
  const lineItems = (flat.line_items || []).map((li) => ({
    description: li.description || "",
    quantity: li.quantity || 1,
    unit_price: li.unit_price || 0,
    tax_rate_percent: li.tax_rate_percent || 0,
    line_total: li.line_total || 0,
  }));

  const recurringResult = detectRecurringFromText(flat.supplier_name, lineItems, pdfText);
  const validatedVat = validateSupplierVat(flat.supplier_vat, flat.supplier_address, flat.supplier_name, pdfText);
  const { category, gl_code } = classifyExpenseCategory(flat.supplier_name, lineItems, pdfText);
  const totalTax = (flat.tax_lines || []).reduce((s, tl) => s + tl.tax_amount, 0);

  const confidence = calculateConfidence(flat, docType, taxDecision, mathValidation);

  return {
    vendor: {
      name: flat.supplier_name || "",
      address: flat.supplier_address || undefined,
      country: country.code !== "UNKNOWN" ? country.code : undefined,
      vat_number: validatedVat || undefined,
      kvk: flat.supplier_kvk || undefined,
      website: flat.supplier_website || undefined,
      email: flat.supplier_email || undefined,
      phone: flat.supplier_phone || undefined,
      iban: flat.supplier_iban || undefined,
    },
    invoice: {
      number: flat.invoice_number || undefined,
      date: flat.invoice_date || undefined,
      due_date: flat.due_date || undefined,
      payment_terms_days: flat.payment_terms_days ?? undefined,
      currency: detectCurrency(pdfText, flat.currency),
      subtotal: flat.subtotal ?? undefined,
      tax_amount: totalTax || undefined,
      total: flat.total || 0,
      document_label: flat.document_label || undefined,
      payment_reference: flat.payment_reference || undefined,
      notes_on_invoice: flat.notes_on_invoice || undefined,
    },
    line_items: lineItems,
    tax_lines: flat.tax_lines || [],
    classification: {
      is_recurring: recurringResult.is_recurring,
      recurring_frequency: recurringResult.frequency,
      expense_category: category,
      gl_code,
      is_reverse_charge:
        taxDecision.mechanism === "reverse_charge_eu" ||
        taxDecision.mechanism === "reverse_charge_non_eu",
    },
    confidence,
  };
}

function detectCurrency(invoiceText: string, extractedCurrency: string | null | undefined): string {
  if (extractedCurrency) return extractedCurrency.toUpperCase();
  if (/\$\s*\d/.test(invoiceText)) return "USD";
  if (/\u00a3\s*\d/.test(invoiceText)) return "GBP";
  return "EUR";
}

// ─── ECB Currency Conversion ──────────────────────────────────────────────────

async function getECBRate(
  supabase: any,
  currency: string,
  date: string
): Promise<{ rate: number; source: string; rate_date?: string } | null> {
  if (currency === "EUR") return { rate: 1, source: "identity", rate_date: date };

  // 1. Check cache
  const { data: cached } = await supabase
    .from("exchange_rates")
    .select("rate, source, rate_date")
    .eq("currency_from", currency)
    .eq("currency_to", "EUR")
    .eq("rate_date", date)
    .single();

  if (cached) {
    console.log(`[ECB] Cache hit: ${currency}/EUR on ${date} = ${cached.rate}`);
    return { rate: Number(cached.rate), source: "cache", rate_date: cached.rate_date };
  }

  // 2. Primary: Frankfurter API (free, no key, uses ECB data, handles weekends)
  try {
    const url = `https://api.frankfurter.app/${date}?from=${currency}&to=EUR`;
    const resp = await fetch(url);
    if (resp.ok) {
      const json = await resp.json();
      const eurRate = json.rates?.EUR;
      if (eurRate && eurRate > 0) {
        const actualDate = json.date || date; // Frankfurter returns the actual business day used
        await supabase.from("exchange_rates").upsert(
          { currency_from: currency, currency_to: "EUR", rate: eurRate, rate_date: actualDate, source: "frankfurter_ecb" },
          { onConflict: "currency_from,currency_to,rate_date" }
        );
        console.log(`[ECB] Frankfurter: ${currency}/EUR on ${actualDate} = ${eurRate}`);
        return { rate: eurRate, source: "frankfurter_ecb", rate_date: actualDate };
      }
    }
  } catch (e) {
    console.warn("[ECB] Frankfurter API failed:", e);
  }

  // 3. Fallback: ECB SDMX CSV API (official, but no weekend handling)
  try {
    const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${currency}.EUR.SP00.A?format=csvdata&startPeriod=${date}&endPeriod=${date}`;
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
            await supabase.from("exchange_rates").upsert(
              { currency_from: currency, currency_to: "EUR", rate: invertedRate, rate_date: date, source: "ecb_sdmx" },
              { onConflict: "currency_from,currency_to,rate_date" }
            );
            return { rate: invertedRate, source: "ecb_sdmx", rate_date: date };
          }
        }
      }
    }
  } catch (e) {
    console.warn("[ECB] SDMX API failed:", e);
  }

  // 4. Last resort: ECB daily XML feed (today's rate only)
  try {
    const xmlResp = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
    if (xmlResp.ok) {
      const xml = await xmlResp.text();
      const regex = new RegExp(`currency='${currency}'\\s+rate='([\\d.]+)'`);
      const match = xml.match(regex);
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        const invertedRate = 1 / rate;
        await supabase.from("exchange_rates").upsert(
          { currency_from: currency, currency_to: "EUR", rate: invertedRate, rate_date: date, source: "ecb_daily_xml" },
          { onConflict: "currency_from,currency_to,rate_date" }
        );
        return { rate: invertedRate, source: "ecb_daily_xml", rate_date: date };
      }
    }
  } catch (e) {
    console.warn("[ECB] Daily XML feed failed:", e);
  }

  console.error(`[ECB] Could not get rate for ${currency} on ${date}`);
  return null;
}

// ─── Vendor Matching ──────────────────────────────────────────────────────────

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
      console.log(`[VENDOR] Exact VAT match: ${vatMatch.name}`);
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
      return { id: nameMatches[0].id, match_type: "fuzzy_name", confidence: 0.85 };
    }

    // First word match
    const { data: reverseMatches } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("company_id", companyId)
      .filter("name", "ilike", `%${vendorData.name.split(" ")[0]}%`)
      .limit(3);

    if (reverseMatches && reverseMatches.length > 0) {
      return { id: reverseMatches[0].id, match_type: "partial_name", confidence: 0.7 };
    }
  }

  // 3. Create new vendor
  console.log(`[VENDOR] Creating new: ${vendorData.name}`);
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

  if (error) throw new Error(`Failed to create vendor: ${error.message}`);
  return { id: newVendor.id, match_type: "new", confidence: 1.0 };
}

// ─── Prospect Matching (for sales invoices → CRM) ────────────────────────────

interface ProspectMatchResult {
  id: string;
  match_type: "exact_vat" | "exact_email" | "fuzzy_name" | "partial_name" | "new";
  confidence: number;
  prospect_data: {
    company: string | null;
    email: string | null;
    location_country: string | null;
    vat_number: string | null;
    billing_address: string | null;
  };
  alternatives?: Array<{
    id: string;
    company: string | null;
    email: string | null;
    location_country: string | null;
    match_type: string;
  }>;
}

async function matchOrCreateProspect(
  supabase: any,
  companyId: string,
  buyerData: { name?: string; vat_number?: string; email?: string; address?: string; country?: string },
  userId: string
): Promise<ProspectMatchResult> {
  const prospectFields = "id, company, email, location_country, vat_number, billing_address";

  // Tier 1: Exact VAT match
  if (buyerData.vat_number) {
    const { data: vatMatch } = await supabase
      .from("prospects")
      .select(prospectFields)
      .eq("organization_id", companyId)
      .eq("vat_number", buyerData.vat_number)
      .limit(1)
      .maybeSingle();

    if (vatMatch) {
      console.log(`[PROSPECT] Exact VAT match: ${vatMatch.company}`);
      return {
        id: vatMatch.id,
        match_type: "exact_vat",
        confidence: 0.99,
        prospect_data: {
          company: vatMatch.company,
          email: vatMatch.email,
          location_country: vatMatch.location_country,
          vat_number: vatMatch.vat_number,
          billing_address: vatMatch.billing_address,
        },
      };
    }
  }

  // Tier 2: Exact email match
  if (buyerData.email) {
    const { data: emailMatch } = await supabase
      .from("prospects")
      .select(prospectFields)
      .eq("organization_id", companyId)
      .eq("email", buyerData.email.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (emailMatch) {
      console.log(`[PROSPECT] Exact email match: ${emailMatch.company}`);
      return {
        id: emailMatch.id,
        match_type: "exact_email",
        confidence: 0.95,
        prospect_data: {
          company: emailMatch.company,
          email: emailMatch.email,
          location_country: emailMatch.location_country,
          vat_number: emailMatch.vat_number,
          billing_address: emailMatch.billing_address,
        },
      };
    }
  }

  // Tier 3: Fuzzy company name match
  if (buyerData.name) {
    const { data: nameMatches } = await supabase
      .from("prospects")
      .select(prospectFields)
      .eq("organization_id", companyId)
      .ilike("company", `%${buyerData.name}%`)
      .order("updated_date", { ascending: false })
      .limit(5);

    if (nameMatches && nameMatches.length > 0) {
      const best = nameMatches[0];
      const alternatives = nameMatches.length > 1
        ? nameMatches.slice(1).map((m: any) => ({
            id: m.id,
            company: m.company,
            email: m.email,
            location_country: m.location_country,
            match_type: "fuzzy_name",
          }))
        : undefined;

      console.log(`[PROSPECT] Fuzzy name match: ${best.company} (${nameMatches.length} candidates)`);
      return {
        id: best.id,
        match_type: "fuzzy_name",
        confidence: 0.85,
        prospect_data: {
          company: best.company,
          email: best.email,
          location_country: best.location_country,
          vat_number: best.vat_number,
          billing_address: best.billing_address,
        },
        alternatives,
      };
    }

    // Tier 4: First-word match
    const firstWord = buyerData.name.split(/\s+/)[0];
    if (firstWord && firstWord.length > 2) {
      const { data: partialMatches } = await supabase
        .from("prospects")
        .select(prospectFields)
        .eq("organization_id", companyId)
        .ilike("company", `%${firstWord}%`)
        .order("updated_date", { ascending: false })
        .limit(5);

      if (partialMatches && partialMatches.length > 0) {
        const best = partialMatches[0];
        const alternatives = partialMatches.length > 1
          ? partialMatches.slice(1).map((m: any) => ({
              id: m.id,
              company: m.company,
              email: m.email,
              location_country: m.location_country,
              match_type: "partial_name",
            }))
          : undefined;

        console.log(`[PROSPECT] Partial name match: ${best.company}`);
        return {
          id: best.id,
          match_type: "partial_name",
          confidence: 0.7,
          prospect_data: {
            company: best.company,
            email: best.email,
            location_country: best.location_country,
            vat_number: best.vat_number,
            billing_address: best.billing_address,
          },
          alternatives,
        };
      }
    }
  }

  // Tier 5: Create new prospect as customer
  console.log(`[PROSPECT] Creating new CRM customer: ${buyerData.name}`);
  const { data: newProspect, error } = await supabase
    .from("prospects")
    .insert({
      organization_id: companyId,
      company: buyerData.name || "Unknown Customer",
      email: buyerData.email || null,
      vat_number: buyerData.vat_number || null,
      billing_address: buyerData.address || null,
      billing_country: buyerData.country || null,
      location_country: buyerData.country || null,
      contact_type: "customer",
      source: "smart_import",
      stage: "customer",
      owner_id: userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error(`[PROSPECT] Failed to create: ${error.message}`);
    throw new Error(`Failed to create CRM prospect: ${error.message}`);
  }

  return {
    id: newProspect.id,
    match_type: "new",
    confidence: 1.0,
    prospect_data: {
      company: buyerData.name || null,
      email: buyerData.email || null,
      location_country: buyerData.country || null,
      vat_number: buyerData.vat_number || null,
      billing_address: buyerData.address || null,
    },
  };
}

// ─── Tax Rate Lookup ──────────────────────────────────────────────────────────

async function lookupTaxRate(
  supabase: any,
  companyId: string,
  taxDecision: TaxDecision
): Promise<{ rate_id: string | null; rate: number }> {
  const targetRate = taxDecision.mechanism === "standard_btw" ? taxDecision.rate : 0;

  const { data: taxRates } = await supabase
    .from("tax_rates")
    .select("id, name, rate")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (taxRates && taxRates.length > 0) {
    const exactMatch = taxRates.find((tr: any) => Number(tr.rate) === targetRate);
    if (exactMatch) return { rate_id: exactMatch.id, rate: targetRate };
    return { rate_id: taxRates[0].id, rate: Number(taxRates[0].rate) };
  }

  return { rate_id: null, rate: targetRate };
}

// ─── Recurring Detection (next-date) ─────────────────────────────────────────

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
      case "weekly": d.setDate(d.getDate() + 7); break;
      case "monthly": d.setMonth(d.getMonth() + 1); break;
      case "quarterly": d.setMonth(d.getMonth() + 3); break;
      case "annual": case "yearly": d.setFullYear(d.getFullYear() + 1); break;
      default: d.setMonth(d.getMonth() + 1);
    }
    suggestedNextDate = d.toISOString().split("T")[0];
  }

  return { detected: true, frequency, suggested_next_date: suggestedNextDate };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

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
    const { pdfText, fileName, companyId, userId, paymentDate, myCompany } = body;

    if (!pdfText || !companyId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "pdfText, companyId, and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SMART-IMPORT] Processing "${fileName}" for company ${companyId}${myCompany?.name ? ` (identity: ${myCompany.name})` : ""}`);

    // Step 1: LLM extraction (70B model)
    const extraction = await extractFromText(groqApiKey, pdfText, myCompany);
    if (!extraction.success || !extraction.data) {
      return new Response(
        JSON.stringify({ success: false, error: extraction.error || "Extraction failed" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flat = extraction.data;

    // Step 2: Math validation
    const mathValidation = validateMath(flat);
    if (!mathValidation.valid) {
      console.log(`[SMART-IMPORT] Math validation issues: ${mathValidation.reasons.join("; ")}`);
    }

    // Step 3: Country detection
    const country = detectCountry(flat);
    console.log(`[SMART-IMPORT] Country: ${country.code} (EU: ${country.isEU}, NL: ${country.isNL})`);

    // Step 4: Tax rules engine (deterministic, NOT LLM)
    const taxDecision = determineTaxDecision(country, flat, pdfText);
    console.log(`[SMART-IMPORT] Tax: ${taxDecision.mechanism} (rate: ${taxDecision.rate}%, self-assess: ${taxDecision.self_assess_rate}%)`);

    // Step 5: Document type classification
    const docType = classifyDocumentType(flat, myCompany);
    console.log(`[SMART-IMPORT] Doc type: ${docType.type} (confidence: ${docType.confidence})`);

    // Step 6: Build nested result
    const data = buildExtractionResult(flat, pdfText, country, taxDecision, mathValidation, docType);

    console.log(`[SMART-IMPORT] Extraction done — vendor: ${data.vendor.name}, total: ${data.invoice.total}, category: ${data.classification.expense_category}, gl: ${data.classification.gl_code}`);

    // Step 7: Vendor matching (purchase-side) or Prospect matching (sales-side)
    let vendorMatch: { id: string; match_type: string; confidence: number } | null = null;
    let prospectMatch: ProspectMatchResult | null = null;

    if (docType.type === "sales_invoice") {
      // Sales invoice → match/create CRM prospect for the buyer
      try {
        prospectMatch = await matchOrCreateProspect(supabase, companyId, {
          name: data.vendor.name,         // After identity swap, vendor = the buyer/customer
          vat_number: data.vendor.vat_number,
          email: data.vendor.email,
          address: data.vendor.address,
          country: data.vendor.country,
        }, userId);
      } catch (e) {
        console.warn("[SMART-IMPORT] Prospect matching failed:", e);
      }
    } else {
      // Purchase doc → match/create vendor
      try {
        vendorMatch = await matchOrCreateVendor(supabase, companyId, data.vendor);
      } catch (e) {
        console.warn("[SMART-IMPORT] Vendor matching failed:", e);
      }
    }

    // Step 8: Tax rate lookup
    const taxRateResult = await lookupTaxRate(supabase, companyId, taxDecision);

    // Step 9: Currency conversion
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
      }
    }

    // Step 10: Recurring detection
    const recurring = detectRecurring(data);

    // Step 11: Log AI usage
    if (extraction.usage) {
      try {
        const promptTokens = extraction.usage.prompt_tokens || 0;
        const completionTokens = extraction.usage.completion_tokens || 0;
        const model = extraction.provider === "together"
          ? "meta-llama/Llama-3.3-70B-Instruct-Turbo"
          : "llama-3.3-70b-versatile";
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
            model_name: model,
            provider: extraction.provider,
            function: "smart-import-invoice",
            extraction_success: true,
            confidence: data.confidence.overall,
            document_type: docType.type,
            tax_mechanism: taxDecision.mechanism,
          },
        });
      } catch (logError) {
        console.warn("[SMART-IMPORT] Failed to log AI usage:", logError);
      }
    }

    // Build response
    const result = {
      success: true,
      extraction: data,
      document_type: docType.type,
      tax_decision: taxDecision,
      confidence: data.confidence,
      vendor_match: vendorMatch,
      prospect_match: prospectMatch,
      tax_classification: {
        rate_id: taxRateResult.rate_id,
        rate: taxRateResult.rate,
        is_reverse_charge: data.classification.is_reverse_charge,
      },
      currency_conversion: currencyConversion,
      recurring,
    };

    console.log(
      `[SMART-IMPORT] Done — doc: ${docType.type}, vendor: ${vendorMatch?.match_type}, tax: ${taxDecision.mechanism}, confidence: ${data.confidence.overall}, review: ${data.confidence.requires_review}`
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

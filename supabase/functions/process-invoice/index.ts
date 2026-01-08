import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Together from "npm:together-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceData {
  supplier_name?: string;
  supplier_address?: string;
  supplier_vat?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  tax_percent?: number;
  total?: number;
  currency?: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    ean?: string;
  }>;
}

interface ExtractionResult {
  success: boolean;
  data?: InvoiceData;
  confidence: number;
  errors?: string[];
}

const EXTRACTION_PROMPT = `You are an expert invoice data extraction system. Extract structured data from the invoice image.

CRITICAL RULES:
1. Extract ONLY what you can clearly see - never guess or infer
2. For numbers, extract exact values including decimals
3. For dates, use ISO format (YYYY-MM-DD)
4. If a field is not visible or unclear, omit it entirely
5. Line items must have description, quantity, unit_price, and line_total

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "supplier_name": "string or null",
  "supplier_address": "string or null",
  "supplier_vat": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "subtotal": number or null,
  "tax_amount": number or null,
  "tax_percent": number or null,
  "total": number or null,
  "currency": "EUR" or "USD" etc,
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "line_total": number,
      "ean": "string or null"
    }
  ],
  "confidence": 0.0 to 1.0
}`;

async function extractFromImage(client: Together, imageUrl: string): Promise<ExtractionResult> {
  try {
    console.log("Calling Together AI vision model...");
    const response = await client.chat.completions.create({
      model: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    console.log("Together AI response received");
    const content = response.choices[0]?.message?.content;
    console.log("AI content length:", content?.length || 0);

    if (!content) {
      console.log("No content in AI response");
      return { success: false, confidence: 0, errors: ["No response from AI"] };
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, confidence: 0, errors: ["Could not parse AI response"] };
    }

    const data = JSON.parse(jsonMatch[0]) as InvoiceData & { confidence?: number };
    const confidence = data.confidence ?? 0.8;
    delete (data as any).confidence;

    return {
      success: true,
      data,
      confidence,
    };
  } catch (error) {
    console.error("Extraction error:", error);
    return {
      success: false,
      confidence: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    if (!togetherApiKey) {
      throw new Error("TOGETHER_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const together = new Together({ apiKey: togetherApiKey });

    const { storagePath, bucket, companyId, sourceEmailId, imageUrl: directImageUrl } = await req.json();

    console.log("Received request:", { storagePath, bucket, companyId, directImageUrl: !!directImageUrl });

    if ((!storagePath || !bucket) && !directImageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "storagePath/bucket or imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "companyId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get image URL - either from signed URL or direct URL
    let imageUrl = directImageUrl;

    if (!imageUrl && storagePath && bucket) {
      // Create a signed URL for the private storage file
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600); // 1 hour expiration

      if (signedUrlError) {
        console.error("Error creating signed URL:", signedUrlError);
        return new Response(
          JSON.stringify({ success: false, error: "Could not access uploaded file: " + signedUrlError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      imageUrl = signedUrlData.signedUrl;
      console.log("Created signed URL for image");
    }

    // Extract data from image
    console.log("Starting AI extraction with URL:", imageUrl.substring(0, 100) + "...");
    const extraction = await extractFromImage(together, imageUrl);
    console.log("Extraction result:", JSON.stringify({
      success: extraction.success,
      confidence: extraction.confidence,
      hasData: !!extraction.data,
      errors: extraction.errors
    }));

    if (!extraction.success || !extraction.data) {
      return new Response(
        JSON.stringify({
          success: false,
          needsReview: false,
          confidence: 0,
          errors: extraction.errors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MIN_CONFIDENCE = 0.85;
    const needsReview = extraction.confidence < MIN_CONFIDENCE;

    // Create expense record
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        company_id: companyId,
        document_type: "invoice",
        source_type: sourceEmailId ? "email" : "manual",
        source_email_id: sourceEmailId || null,
        original_file_url: imageUrl, // This is a signed URL (1hr expiry)
        external_reference: extraction.data.invoice_number,
        invoice_date: extraction.data.invoice_date,
        due_date: extraction.data.due_date,
        subtotal: extraction.data.subtotal,
        tax_amount: extraction.data.tax_amount,
        tax_percent: extraction.data.tax_percent,
        total: extraction.data.total,
        currency: extraction.data.currency || "EUR",
        ai_extracted_data: extraction.data,
        ai_confidence: extraction.confidence,
        needs_review: needsReview,
        review_status: needsReview ? "pending" : "auto_approved",
        status: needsReview ? "pending_review" : "approved",
      })
      .select()
      .single();

    if (expenseError) {
      console.error("Error creating expense:", expenseError);
      return new Response(
        JSON.stringify({ success: false, error: expenseError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create line items if present
    if (extraction.data.line_items && extraction.data.line_items.length > 0) {
      const lineItems = extraction.data.line_items.map((item) => ({
        expense_id: expense.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        ean: item.ean,
      }));

      const { error: lineItemsError } = await supabase
        .from("expense_line_items")
        .insert(lineItems);

      if (lineItemsError) {
        console.error("Error creating line items:", lineItemsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        needsReview,
        confidence: extraction.confidence,
        expenseId: expense.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process invoice error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

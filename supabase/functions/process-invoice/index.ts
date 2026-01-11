import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    model_number?: string;
    brand?: string;
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
6. For line items, extract model_number if present (often at end like "- 3681N" or "Model: ABC123")
7. Extract brand name if visible (usually the first word of product name)
8. EAN/barcode is typically 13 digits, look for it near line items

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
      "description": "Full product description as shown",
      "quantity": number,
      "unit_price": number,
      "line_total": number,
      "ean": "13-digit barcode if visible, or null",
      "model_number": "Model/article number if present (e.g., 3681N), or null",
      "brand": "Brand name (e.g., BISSELL, Apple, Samsung), or null"
    }
  ],
  "confidence": 0.0 to 1.0
}`;

async function extractFromText(groqApiKey: string, pdfText: string, retryCount = 0): Promise<ExtractionResult> {
  const MAX_RETRIES = 2;

  try {
    console.log(`Calling Groq LLM for text extraction (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
    console.log("Text length:", pdfText.length);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'user',
            content: EXTRACTION_PROMPT + `\n\nHere is the invoice text:\n\n${pdfText}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const apiResponse = await response.json();
    console.log("Groq response received");
    const content = apiResponse.choices?.[0]?.message?.content || '';
    console.log("AI content length:", content?.length || 0);

    if (!content) {
      console.log("No content in AI response");
      return { success: false, confidence: 0, errors: ["No response from AI"] };
    }

    // Clean up response - remove markdown code blocks if present
    let cleanedContent = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Find JSON object
    let jsonString: string | null = null;
    const firstBrace = cleanedContent.indexOf('{');
    const lastBrace = cleanedContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = cleanedContent.substring(firstBrace, lastBrace + 1);
    }

    if (!jsonString) {
      const originalMatch = content.match(/\{[\s\S]*?"supplier_name"[\s\S]*?\}/);
      if (originalMatch) {
        const startIdx = content.indexOf(originalMatch[0]);
        let braceCount = 0;
        let endIdx = startIdx;
        for (let i = startIdx; i < content.length; i++) {
          if (content[i] === '{') braceCount++;
          if (content[i] === '}') braceCount--;
          if (braceCount === 0) {
            endIdx = i + 1;
            break;
          }
        }
        jsonString = content.substring(startIdx, endIdx);
      }
    }

    if (!jsonString) {
      console.log("No JSON found in response");
      return { success: false, confidence: 0, errors: ["Could not parse AI response - no JSON found"] };
    }

    // Clean up JSON
    jsonString = jsonString
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\n\s*\n/g, '\n');

    let data: InvoiceData & { confidence?: number };
    try {
      data = JSON.parse(jsonString) as InvoiceData & { confidence?: number };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return { success: false, confidence: 0, errors: ["Could not parse AI response - invalid JSON"] };
    }

    const confidence = data.confidence ?? 0.9; // Higher confidence for text extraction
    delete (data as any).confidence;

    return { success: true, data, confidence };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Extraction error (attempt ${retryCount + 1}):`, errorMessage);

    // Retry on timeout or server errors
    const isRetryable = errorMessage.includes('timeout') ||
                        errorMessage.includes('timed out') ||
                        errorMessage.includes('ETIMEDOUT') ||
                        errorMessage.includes('502') ||
                        errorMessage.includes('503') ||
                        errorMessage.includes('504');

    if (isRetryable && retryCount < MAX_RETRIES) {
      console.log(`Retrying extraction in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return extractFromText(groqApiKey, pdfText, retryCount + 1);
    }

    return {
      success: false,
      confidence: 0,
      errors: [errorMessage],
    };
  }
}

async function extractFromImage(googleApiKey: string, imageUrl: string, retryCount = 0): Promise<ExtractionResult> {
  const MAX_RETRIES = 2;

  try {
    console.log(`Calling Google Gemini model (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

    // Fetch the image and convert to base64
    console.log("Fetching image from URL:", imageUrl);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    // Convert to base64 without spreading large arrays (prevents stack overflow)
    const bytes = new Uint8Array(imageBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Image = btoa(binary);

    // Determine media type from URL
    const mimeType = imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    console.log(`Image fetched, size: ${imageBuffer.byteLength} bytes, type: ${mimeType}`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: EXTRACTION_PROMPT + "\n\nIMPORTANT: Respond with ONLY the JSON object, nothing else. No markdown, no explanation.",
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Gemini API error: ${response.status} ${errorText}`);
    }

    const apiResponse = await response.json();
    console.log("Google Gemini response received");
    const content = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log("AI content length:", content?.length || 0);

    if (!content) {
      console.log("No content in AI response");
      return { success: false, confidence: 0, errors: ["No response from AI"] };
    }

    // Clean up response - remove markdown code blocks if present
    let cleanedContent = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Find JSON object
    let jsonString: string | null = null;
    const firstBrace = cleanedContent.indexOf('{');
    const lastBrace = cleanedContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = cleanedContent.substring(firstBrace, lastBrace + 1);
    }

    if (!jsonString) {
      const originalMatch = content.match(/\{[\s\S]*?"supplier_name"[\s\S]*?\}/);
      if (originalMatch) {
        const startIdx = content.indexOf(originalMatch[0]);
        let braceCount = 0;
        let endIdx = startIdx;
        for (let i = startIdx; i < content.length; i++) {
          if (content[i] === '{') braceCount++;
          if (content[i] === '}') braceCount--;
          if (braceCount === 0) {
            endIdx = i + 1;
            break;
          }
        }
        jsonString = content.substring(startIdx, endIdx);
      }
    }

    if (!jsonString) {
      console.log("No JSON found in response");
      return { success: false, confidence: 0, errors: ["Could not parse AI response - no JSON found"] };
    }

    // Clean up JSON
    jsonString = jsonString
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\n\s*\n/g, '\n');

    let data: InvoiceData & { confidence?: number };
    try {
      data = JSON.parse(jsonString) as InvoiceData & { confidence?: number };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return { success: false, confidence: 0, errors: ["Could not parse AI response - invalid JSON"] };
    }

    const confidence = data.confidence ?? 0.8;
    delete (data as any).confidence;

    return { success: true, data, confidence };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Extraction error (attempt ${retryCount + 1}):`, errorMessage);

    // Retry on timeout or server errors
    const isRetryable = errorMessage.includes('timeout') ||
                        errorMessage.includes('timed out') ||
                        errorMessage.includes('ETIMEDOUT') ||
                        errorMessage.includes('502') ||
                        errorMessage.includes('503') ||
                        errorMessage.includes('504');

    if (isRetryable && retryCount < MAX_RETRIES) {
      console.log(`Retrying extraction in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return extractFromImage(googleApiKey, imageUrl, retryCount + 1);
    }

    return {
      success: false,
      confidence: 0,
      errors: [errorMessage],
    };
  }
}

// Process the expense asynchronously (called after initial response)
async function processExpenseAsync(
  supabase: any,
  groqApiKey: string,
  googleApiKey: string | undefined,
  expenseId: string,
  imageUrl: string,
  companyId: string,
  pdfText?: string,
) {
  try {
    console.log(`[ASYNC] Starting extraction for expense ${expenseId}`, {
      hasPdfText: !!pdfText,
      pdfTextType: typeof pdfText,
      pdfTextLength: pdfText?.length || 0
    });

    // Extract data from PDF text (preferred) or image (fallback)
    let extraction: ExtractionResult;
    if (pdfText && pdfText.trim().length > 0) {
      console.log(`✅ [ASYNC] Using TEXT extraction with Groq (PDF text: ${pdfText.length} chars)`);
      console.log(`[ASYNC] PDF text preview: ${pdfText.substring(0, 150)}...`);
      extraction = await extractFromText(groqApiKey, pdfText);
    } else {
      console.error(`❌ [ASYNC] FALLBACK to image extraction (pdfText missing or empty!)`);
      console.error(`[ASYNC] pdfText details:`, {
        exists: !!pdfText,
        type: typeof pdfText,
        length: pdfText?.length,
        value: pdfText ? `"${pdfText.substring(0, 50)}..."` : 'null/undefined'
      });
      // Fallback to image extraction using Google Gemini
      if (!googleApiKey) {
        extraction = { success: false, confidence: 0, errors: ["No Google API key configured for image extraction fallback"] };
      } else {
        extraction = await extractFromImage(googleApiKey, imageUrl);
      }
    }
    console.log(`[ASYNC] Extraction complete:`, { success: extraction.success, confidence: extraction.confidence });

    if (!extraction.success || !extraction.data) {
      await supabase
        .from("expenses")
        .update({
          status: 'failed',
          review_status: 'error',
          ai_extracted_data: { error: extraction.errors?.[0] || 'Extraction failed' },
        })
        .eq("id", expenseId);
      return;
    }

    const MIN_CONFIDENCE = 0.85;
    const needsReview = extraction.confidence < MIN_CONFIDENCE;

    // Find or create supplier
    let supplierId: string | null = null;
    if (extraction.data.supplier_name) {
      const { data: existingSuppliers } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("company_id", companyId)
        .ilike("name", `%${extraction.data.supplier_name}%`)
        .limit(1);

      if (existingSuppliers && existingSuppliers.length > 0) {
        supplierId = existingSuppliers[0].id;
      } else {
        const { data: newSupplier } = await supabase
          .from("suppliers")
          .insert({
            company_id: companyId,
            name: extraction.data.supplier_name,
            contact: {
              address: extraction.data.supplier_address || null,
              vat_number: extraction.data.supplier_vat || null,
            },
          })
          .select("id")
          .single();

        if (newSupplier) {
          supplierId = newSupplier.id;
        }
      }
    }

    // Update expense with extracted data
    await supabase
      .from("expenses")
      .update({
        supplier_id: supplierId,
        external_reference: extraction.data.invoice_number,
        invoice_date: extraction.data.invoice_date,
        payment_due_date: extraction.data.due_date,
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
      .eq("id", expenseId);

    // Create line items
    let createdLineItems: any[] = [];
    if (extraction.data.line_items && extraction.data.line_items.length > 0) {
      const lineItems = extraction.data.line_items.map((item) => ({
        expense_id: expenseId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        ean: item.ean,
        model_number: item.model_number,
        brand: item.brand,
        research_status: 'pending',
      }));

      const { data: insertedLineItems, error: lineItemsError } = await supabase
        .from("expense_line_items")
        .insert(lineItems)
        .select("id, ean, quantity, unit_price, description, model_number, brand");

      if (!lineItemsError) {
        createdLineItems = insertedLineItems || [];
      }
    }

    // Create stock_purchases for inventory tracking
    if (createdLineItems.length > 0 && supplierId) {
      console.log(`[ASYNC] Creating stock purchases for ${createdLineItems.length} line items`);

      for (const item of createdLineItems) {
        let productId: string | null = null;

        // Try to match product by EAN if available
        if (item.ean) {
          const { data: matchingProduct } = await supabase
            .from('physical_products')
            .select('product_id')
            .eq('barcode', item.ean)
            .limit(1)
            .single();

          if (matchingProduct) {
            productId = matchingProduct.product_id;
            console.log(`[ASYNC] Matched EAN ${item.ean} to product ${productId}`);
          }
        }

        // Create stock_purchase record (even without product match - EAN stored for later linking)
        const { error: purchaseError } = await supabase
          .from('stock_purchases')
          .insert({
            company_id: companyId,
            product_id: productId,
            supplier_id: supplierId,
            expense_id: expenseId,
            expense_line_item_id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            currency: extraction.data?.currency || 'EUR',
            purchase_date: extraction.data?.invoice_date || new Date().toISOString().split('T')[0],
            invoice_number: extraction.data?.invoice_number,
            ean: item.ean,
            source_type: 'invoice',
          });

        if (purchaseError) {
          console.warn(`[ASYNC] Failed to create stock purchase for line item ${item.id}:`, purchaseError.message);
        }
      }

      console.log(`[ASYNC] Stock purchases created`);
    }

    // Queue line items for product research
    if (createdLineItems.length > 0) {
      const researchQueueItems = createdLineItems.map((item: any) => ({
        company_id: companyId,
        expense_id: expenseId,
        expense_line_item_id: item.id,
        product_description: item.description,
        model_number: item.model_number,
        supplier_name: extraction.data?.supplier_name,
        supplier_id: supplierId,
        extracted_ean: item.ean,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency: extraction.data?.currency || 'EUR',
        purchase_date: extraction.data?.invoice_date,
        invoice_number: extraction.data?.invoice_number,
        status: 'pending',
      }));

      const { data: queuedItems, error: queueError } = await supabase
        .from("product_research_queue")
        .insert(researchQueueItems)
        .select("id, product_description");

      if (!queueError && queuedItems) {
        console.log(`[ASYNC] Queued ${queuedItems.length} items for research`);

        // Trigger research function
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const researchItems = queuedItems.map((q: any, idx: number) => ({
          queueId: q.id,
          productDescription: q.product_description,
          modelNumber: researchQueueItems[idx].model_number,
          supplierName: researchQueueItems[idx].supplier_name,
          extractedEan: researchQueueItems[idx].extracted_ean,
        }));

        fetch(`${supabaseUrl}/functions/v1/research-product`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ items: researchItems }),
        }).catch(err => console.error('[ASYNC] Failed to trigger research:', err));
      }
    }

    console.log(`[ASYNC] Processing complete for expense ${expenseId}`);
  } catch (error) {
    console.error("[ASYNC] Error processing expense:", error);
    await supabase
      .from("expenses")
      .update({
        status: 'failed',
        review_status: 'error',
        ai_extracted_data: { error: error instanceof Error ? error.message : 'Unknown error' },
      })
      .eq("id", expenseId);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Groq API key from env (fast text model for PDF extraction)
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY not configured");
    }

    // Get Google API key for image extraction fallback (optional)
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

    const body = await req.json();
    const { storagePath, bucket, companyId, userId, sourceEmailId, imageUrl: directImageUrl, pdfText, _mode, _expenseId, _imageUrl, _pdfText } = body;

    console.log('Request body keys:', Object.keys(body));
    console.log('PDF text present:', !!pdfText, 'Length:', pdfText?.length || 0);

    // ASYNC MODE: Process existing expense (called by database trigger)
    if (_mode === 'process' && _expenseId && _imageUrl) {
      console.log(`[ASYNC MODE] Processing expense ${_expenseId}`, { hasPdfText: !!_pdfText });
      await processExpenseAsync(supabase, groqApiKey, googleApiKey, _expenseId, _imageUrl, companyId, _pdfText);
      return new Response(
        JSON.stringify({ success: true, processed: true, expenseId: _expenseId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // NORMAL MODE: Create expense and trigger async processing
    console.log("Received request:", { storagePath, bucket, companyId, userId, directImageUrl: !!directImageUrl });

    if ((!storagePath || !bucket) && !directImageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "storagePath/bucket or imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!companyId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "companyId and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get image URL (using public URL for permanent bookkeeping access)
    let imageUrl = directImageUrl;
    if (!imageUrl && storagePath && bucket) {
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      if (!publicUrlData?.publicUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not get public URL for uploaded file" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      imageUrl = publicUrlData.publicUrl;
    }

    // Determine initial status based on whether we have PDF text
    // IMPORTANT: If pdfText exists, use 'text_extraction' status to PREVENT the database trigger
    // from firing. The trigger only fires on status='processing' and would overwrite our results.
    const hasPdfText = pdfText && pdfText.trim().length > 0;
    const initialStatus = hasPdfText ? "text_extraction" : "processing";

    console.log(`Creating expense with status='${initialStatus}' (hasPdfText: ${hasPdfText})`);

    // Create expense record
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        company_id: companyId,
        user_id: userId,
        document_type: "invoice",
        source_type: sourceEmailId ? "email" : "manual",
        source_email_id: sourceEmailId || null,
        original_file_url: imageUrl,
        status: initialStatus,
        review_status: initialStatus,
        ai_confidence: 0,
        needs_review: true,
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

    // If we have PDF text, process immediately (faster and more reliable)
    // The hasPdfText variable was already calculated above to determine initial status
    if (hasPdfText) {
      console.log(`✅ Processing expense ${expense.id} immediately with PDF text (length: ${pdfText.length})`);
      console.log(`PDF text preview (first 200 chars): ${pdfText.substring(0, 200)}`);
      await processExpenseAsync(supabase, groqApiKey, googleApiKey, expense.id, imageUrl, companyId, pdfText);

      return new Response(
        JSON.stringify({
          success: true,
          processing: false,
          expenseId: expense.id,
          message: "Invoice processed successfully.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created expense ${expense.id} - database trigger will handle async processing`);

    // The database trigger (trigger_expense_processing) will automatically call
    // this function with _mode='process' via pg_net when the expense is inserted.
    // This happens asynchronously, so we return immediately.

    return new Response(
      JSON.stringify({
        success: true,
        processing: true,
        expenseId: expense.id,
        message: "Invoice uploaded. Processing will complete in background.",
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

/**
 * Process Order Email Edge Function (EP-6)
 *
 * Classifies and extracts order data from emails captured by the email pool.
 * Creates stock_purchases + line items for order confirmations.
 * Updates expected_deliveries for shipping updates.
 *
 * Called by composio-webhooks when a pool email matches a supplier pattern.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =============================================================================
// CLASSIFICATION
// =============================================================================

const CLASSIFICATION_PROMPT = `You are an email classifier for an e-commerce inventory system.
Classify this email into exactly ONE category:

- ORDER_CONFIRMATION: A new purchase order confirmation (contains order number, items, prices)
- SHIPPING_UPDATE: A shipping/delivery notification (contains tracking code, carrier, delivery date)
- RETURN_NOTIFICATION: A return/refund notification
- OTHER: Not related to purchasing/shipping

Respond with ONLY the category name, nothing else.`;

async function classifyEmail(
  subject: string,
  body: string,
  senderHints?: string
): Promise<{
  classification: string;
  confidence: number;
  method: "pattern_match" | "ai";
}> {
  // Quick pattern match first
  const subjectLower = (subject || "").toLowerCase();
  const bodyLower = (body || "").toLowerCase().substring(0, 500);

  const orderPatterns = [
    /order\s*confirm/i,
    /bestelling.*bevestig/i,
    /orderbevestiging/i,
    /your order/i,
    /je bestelling/i,
    /order\s*#/i,
    /ordernummer/i,
  ];

  const shippingPatterns = [
    /track.*package/i,
    /shipped/i,
    /verzonden/i,
    /bezorgd/i,
    /tracking/i,
    /delivery.*update/i,
    /onderweg/i,
  ];

  for (const p of orderPatterns) {
    if (p.test(subjectLower) || p.test(bodyLower)) {
      return {
        classification: "order_confirmation",
        confidence: 0.85,
        method: "pattern_match",
      };
    }
  }

  for (const p of shippingPatterns) {
    if (p.test(subjectLower) || p.test(bodyLower)) {
      return {
        classification: "shipping_update",
        confidence: 0.80,
        method: "pattern_match",
      };
    }
  }

  // Fall back to AI classification
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: `${CLASSIFICATION_PROMPT}\n\nSubject: ${subject}\n\nBody (first 1000 chars):\n${body.substring(0, 1000)}`,
            },
          ],
          max_tokens: 50,
          temperature: 0,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "[process-order-email] Classification API error:",
        response.status
      );
      return { classification: "other", confidence: 0.5, method: "ai" };
    }

    const result = await response.json();
    const label = (result.choices?.[0]?.message?.content || "")
      .trim()
      .toUpperCase();

    const classMap: Record<string, string> = {
      ORDER_CONFIRMATION: "order_confirmation",
      SHIPPING_UPDATE: "shipping_update",
      RETURN_NOTIFICATION: "return_notification",
      OTHER: "other",
    };

    return {
      classification: classMap[label] || "other",
      confidence: classMap[label] ? 0.75 : 0.5,
      method: "ai",
    };
  } catch (err) {
    console.error("[process-order-email] Classification error:", err);
    return { classification: "other", confidence: 0.3, method: "ai" };
  }
}

// =============================================================================
// EXTRACTION
// =============================================================================

const EXTRACTION_PROMPT = `You are an expert order data extraction system for an e-commerce inventory tool.
Extract structured data from this order confirmation email.

RULES:
1. Extract ONLY what is clearly present - never guess
2. For numbers, extract exact values including decimals
3. For dates, use ISO format (YYYY-MM-DD)
4. Currency is likely EUR unless stated otherwise
5. If a field is unclear, set to null

Respond with ONLY a JSON object (no markdown):
{
  "platform": "Amazon|bol.com|Coolblue|Joybuy|DeLonghi|unknown",
  "order_number": "string or null",
  "order_url": "string or null",
  "order_date": "YYYY-MM-DD or null",
  "estimated_delivery": "YYYY-MM-DD or null",
  "supplier_name": "string or null",
  "line_items": [
    {
      "description": "Full product name",
      "quantity": number,
      "unit_price": number,
      "line_total": number,
      "ean": "13-digit EAN if visible, or null",
      "sku": "SKU/article number if present, or null"
    }
  ],
  "subtotal": number or null,
  "shipping_cost": number or null,
  "tax_amount": number or null,
  "total": number or null,
  "currency": "EUR",
  "confidence": 0.0 to 1.0
}`;

const SHIPPING_EXTRACTION_PROMPT = `Extract shipping/tracking information from this email.

Respond with ONLY a JSON object (no markdown):
{
  "order_number": "string or null",
  "tracking_code": "string or null",
  "carrier": "PostNL|DHL|DPD|GLS|UPS|FedEx|unknown",
  "estimated_delivery": "YYYY-MM-DD or null",
  "tracking_url": "string or null",
  "status": "shipped|out_for_delivery|delivered|unknown",
  "confidence": 0.0 to 1.0
}`;

interface OrderData {
  platform?: string;
  order_number?: string;
  order_url?: string;
  order_date?: string;
  estimated_delivery?: string;
  supplier_name?: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    ean?: string;
    sku?: string;
  }>;
  subtotal?: number;
  shipping_cost?: number;
  tax_amount?: number;
  total?: number;
  currency?: string;
  confidence?: number;
}

interface ShippingData {
  order_number?: string;
  tracking_code?: string;
  carrier?: string;
  estimated_delivery?: string;
  tracking_url?: string;
  status?: string;
  confidence?: number;
}

function parseAIJson<T>(content: string): T | null {
  let cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace)
    return null;

  const jsonString = cleaned
    .substring(firstBrace, lastBrace + 1)
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, " ");

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

async function extractOrderData(
  subject: string,
  body: string,
  hints?: string
): Promise<OrderData | null> {
  try {
    const prompt = hints
      ? `${EXTRACTION_PROMPT}\n\nSupplier hints: ${hints}`
      : EXTRACTION_PROMPT;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: `${prompt}\n\nSubject: ${subject}\n\nEmail body:\n${body.substring(0, 4000)}`,
            },
          ],
          max_tokens: 4096,
          temperature: 0,
        }),
      }
    );

    if (!response.ok) {
      console.error("[process-order-email] Extraction API error:", response.status);
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    return parseAIJson<OrderData>(content);
  } catch (err) {
    console.error("[process-order-email] Extraction error:", err);
    return null;
  }
}

async function extractShippingData(
  subject: string,
  body: string
): Promise<ShippingData | null> {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: `${SHIPPING_EXTRACTION_PROMPT}\n\nSubject: ${subject}\n\nEmail body:\n${body.substring(0, 3000)}`,
            },
          ],
          max_tokens: 1024,
          temperature: 0,
        }),
      }
    );

    if (!response.ok) return null;

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    return parseAIJson<ShippingData>(content);
  } catch {
    return null;
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const {
      company_id,
      email_pool_account_id,
      sync_log_id,
      email_subject,
      email_body,
      email_from,
      email_date,
      matched_supplier,
      auto_approve_orders,
      auto_approve_threshold,
      default_sales_channel,
    } = body;

    if (!company_id || !email_pool_account_id || !sync_log_id) {
      return new Response(
        JSON.stringify({
          error: "company_id, email_pool_account_id, sync_log_id required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[process-order-email] Processing sync_log ${sync_log_id} for company ${company_id}`
    );

    // Update sync log to processing
    await supabase
      .from("email_pool_sync_log")
      .update({ status: "processing" })
      .eq("id", sync_log_id);

    // 1. Classify
    const classification = await classifyEmail(
      email_subject || "",
      email_body || "",
      matched_supplier?.supplier_name
    );

    console.log(
      `[process-order-email] Classification: ${classification.classification} (${classification.confidence})`
    );

    // Update sync log with classification
    await supabase
      .from("email_pool_sync_log")
      .update({
        classification: classification.classification,
        classification_confidence: classification.confidence,
        classification_method: classification.method,
      })
      .eq("id", sync_log_id);

    // Skip non-order/shipping emails
    if (
      classification.classification !== "order_confirmation" &&
      classification.classification !== "shipping_update"
    ) {
      const elapsed = Date.now() - startTime;
      await supabase
        .from("email_pool_sync_log")
        .update({
          status: "skipped",
          processing_time_ms: elapsed,
        })
        .eq("id", sync_log_id);

      // Increment email count
      await supabase.rpc("increment_pool_stat", {
        p_account_id: email_pool_account_id,
        p_stat: "total_emails_received",
      }).catch(() => {
        // RPC may not exist yet, use manual update
        supabase
          .from("email_pool_accounts")
          .update({
            total_emails_received: supabase.rpc("coalesce_increment", {}), // fallback below
            last_email_at: new Date().toISOString(),
          })
          .eq("id", email_pool_account_id);
      });

      return new Response(
        JSON.stringify({
          status: "skipped",
          classification: classification.classification,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Handle SHIPPING_UPDATE
    if (classification.classification === "shipping_update") {
      const shipping = await extractShippingData(
        email_subject || "",
        email_body || ""
      );

      if (shipping?.tracking_code) {
        // Try to find the expected_delivery by order_number
        if (shipping.order_number) {
          const { data: purchase } = await supabase
            .from("stock_purchases")
            .select("id")
            .eq("company_id", company_id)
            .eq("order_number", shipping.order_number)
            .limit(1)
            .maybeSingle();

          if (purchase) {
            // Update expected_deliveries linked to this purchase
            await supabase
              .from("expected_deliveries")
              .update({
                tracking_code: shipping.tracking_code,
                carrier: shipping.carrier || null,
                expected_date: shipping.estimated_delivery || null,
                status:
                  shipping.status === "delivered" ? "delivered" : "in_transit",
                updated_at: new Date().toISOString(),
              })
              .eq("stock_purchase_id", purchase.id);
          }
        }

        await supabase
          .from("email_pool_sync_log")
          .update({
            extracted_data: shipping,
            extraction_confidence: shipping.confidence || 0.7,
            status: "completed",
            processing_time_ms: Date.now() - startTime,
          })
          .eq("id", sync_log_id);
      } else {
        await supabase
          .from("email_pool_sync_log")
          .update({
            status: "completed",
            processing_time_ms: Date.now() - startTime,
          })
          .eq("id", sync_log_id);
      }

      return new Response(
        JSON.stringify({
          status: "completed",
          classification: "shipping_update",
          tracking: shipping,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Handle ORDER_CONFIRMATION — extract order data
    const orderData = await extractOrderData(
      email_subject || "",
      email_body || "",
      matched_supplier?.custom_extraction_hints
    );

    if (!orderData) {
      const elapsed = Date.now() - startTime;
      await supabase
        .from("email_pool_sync_log")
        .update({
          status: "failed",
          error_message: "Failed to extract order data",
          processing_time_ms: elapsed,
        })
        .eq("id", sync_log_id);

      // Increment error count
      await supabase
        .from("email_pool_accounts")
        .update({
          total_errors: supabase.sql`total_errors + 1`,
          last_error_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", email_pool_account_id)
        .catch(() => {});

      return new Response(
        JSON.stringify({
          status: "failed",
          error: "Extraction failed",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Deduplication — check order_number + supplier combo
    if (orderData.order_number) {
      const { data: existing } = await supabase
        .from("stock_purchases")
        .select("id")
        .eq("company_id", company_id)
        .eq("order_number", orderData.order_number)
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log(
          `[process-order-email] Duplicate order ${orderData.order_number}, skipping`
        );
        await supabase
          .from("email_pool_sync_log")
          .update({
            extracted_data: orderData,
            extraction_confidence: orderData.confidence || 0.8,
            status: "duplicate",
            is_duplicate: true,
            processing_time_ms: Date.now() - startTime,
          })
          .eq("id", sync_log_id);

        return new Response(
          JSON.stringify({
            status: "duplicate",
            order_number: orderData.order_number,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 5. Find or create supplier
    let supplierId: string | null = null;
    const supplierName =
      orderData.supplier_name ||
      matched_supplier?.supplier_name ||
      orderData.platform ||
      "Unknown";

    if (matched_supplier?.supplier_id) {
      supplierId = matched_supplier.supplier_id;
    } else {
      const { data: existingSupplier } = await supabase
        .from("suppliers")
        .select("id")
        .eq("company_id", company_id)
        .ilike("name", `%${supplierName}%`)
        .limit(1)
        .maybeSingle();

      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        const { data: newSupplier } = await supabase
          .from("suppliers")
          .insert({
            company_id,
            name: supplierName,
          })
          .select("id")
          .single();

        if (newSupplier) supplierId = newSupplier.id;
      }
    }

    // 6. Determine approval
    const confidence = orderData.confidence || 0.7;
    const threshold = auto_approve_threshold || 0.9;
    const shouldAutoApprove = auto_approve_orders && confidence >= threshold;

    // 7. Create stock_purchase
    const description = [
      supplierName,
      orderData.order_number ? `#${orderData.order_number}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const { data: purchase, error: purchaseError } = await supabase
      .from("stock_purchases")
      .insert({
        company_id,
        user_id: null, // Pool-sourced, no user
        supplier_id: supplierId,
        source_type: "email_pool",
        email_pool_account_id,
        email_pool_sync_log_id: sync_log_id,
        order_number: orderData.order_number || null,
        order_url: orderData.order_url || null,
        country_of_purchase:
          matched_supplier?.country || "NL",
        invoice_date: orderData.order_date || null,
        subtotal: orderData.subtotal || null,
        tax_amount: orderData.tax_amount || null,
        total: orderData.total || null,
        currency: orderData.currency || "EUR",
        description,
        vendor: supplierName,
        amount: orderData.total || 0,
        date: orderData.order_date || new Date().toISOString().split("T")[0],
        category: "inventory",
        ai_extracted_data: orderData,
        ai_confidence: confidence,
        needs_review: !shouldAutoApprove,
        review_status: shouldAutoApprove ? "auto_approved" : "pending",
        status: shouldAutoApprove ? "approved" : "pending_review",
      })
      .select("id")
      .single();

    if (purchaseError) {
      console.error(
        "[process-order-email] Failed to create stock_purchase:",
        purchaseError.message
      );
      await supabase
        .from("email_pool_sync_log")
        .update({
          status: "failed",
          error_message: purchaseError.message,
          processing_time_ms: Date.now() - startTime,
        })
        .eq("id", sync_log_id);

      return new Response(
        JSON.stringify({ status: "failed", error: purchaseError.message }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 8. Create line items
    if (orderData.line_items && orderData.line_items.length > 0) {
      const lineItems = orderData.line_items.map((item, idx) => ({
        stock_purchase_id: purchase.id,
        line_number: idx + 1,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        ean: item.ean || null,
        sku: item.sku || null,
        research_status: "pending",
      }));

      await supabase.from("stock_purchase_line_items").insert(lineItems);
    }

    // 9. If auto-approved, create expected_deliveries
    if (shouldAutoApprove && orderData.estimated_delivery) {
      await supabase.from("expected_deliveries").insert({
        company_id,
        stock_purchase_id: purchase.id,
        supplier_id: supplierId,
        expected_date: orderData.estimated_delivery,
        status: "pending",
        source: "email_pool",
      });
    }

    // 10. Update sync log with success
    const elapsed = Date.now() - startTime;
    await supabase
      .from("email_pool_sync_log")
      .update({
        extracted_data: orderData,
        extraction_confidence: confidence,
        stock_purchase_id: purchase.id,
        status: "completed",
        processing_time_ms: elapsed,
      })
      .eq("id", sync_log_id);

    // 11. Update account stats
    await supabase
      .from("email_pool_accounts")
      .update({
        total_emails_received: supabase.sql`total_emails_received + 1`,
        total_orders_synced: supabase.sql`total_orders_synced + 1`,
        last_email_at: new Date().toISOString(),
        last_order_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", email_pool_account_id)
      .catch(() => {});

    console.log(
      `[process-order-email] Created stock_purchase ${purchase.id} from order ${orderData.order_number} (${elapsed}ms)`
    );

    return new Response(
      JSON.stringify({
        status: "completed",
        stock_purchase_id: purchase.id,
        order_number: orderData.order_number,
        auto_approved: shouldAutoApprove,
        processing_time_ms: elapsed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    console.error("[process-order-email] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

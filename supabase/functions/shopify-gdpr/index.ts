/**
 * Shopify GDPR Compliance Webhooks Edge Function
 *
 * Handles the 3 mandatory GDPR compliance webhooks required by Shopify
 * for all apps distributed via the Shopify App Store (including unlisted).
 *
 * Topics:
 *   - customers/data_request  (GDPR Art. 15 — Subject Access Request)
 *   - customers/redact        (GDPR Art. 17 — Right to Erasure)
 *   - shop/redact             (Shop data erasure after app uninstall)
 *
 * All three are sent as POST with JSON body and verified via HMAC-SHA256.
 * Shopify expects a 200 response within 5 seconds. Actual processing must
 * complete within 30 days.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================
// Configuration
// ============================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHOPIFY_API_SECRET = Deno.env.get("SHOPIFY_API_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================
// HMAC-SHA256 Verification (timing-safe)
// ============================================

async function verifyShopifyHmac(
  bodyText: string,
  hmacHeader: string | null
): Promise<boolean> {
  if (!SHOPIFY_API_SECRET) {
    console.error(
      "[shopify-gdpr] SHOPIFY_API_SECRET not configured — rejecting request"
    );
    return false;
  }
  if (!hmacHeader) {
    console.error("[shopify-gdpr] Missing X-Shopify-Hmac-Sha256 header");
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SHOPIFY_API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(bodyText)
  );

  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));

  // Timing-safe comparison
  if (computed.length !== hmacHeader.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============================================
// GDPR Data Handlers
// ============================================

interface CustomerDataRequestPayload {
  shop_id: number;
  shop_domain: string;
  orders_requested: number[];
  customer: {
    id: number;
    email: string;
    phone: string;
  };
  data_request: {
    id: number;
  };
}

interface CustomerRedactPayload {
  shop_id: number;
  shop_domain: string;
  customer: {
    id: number;
    email: string;
    phone: string;
  };
  orders_to_redact: number[];
}

interface ShopRedactPayload {
  shop_id: number;
  shop_domain: string;
}

/**
 * Handle customers/data_request
 *
 * A customer has requested their data. We need to provide any personal data
 * we store about this customer. iSyncSO stores:
 * - Customer records (name, email, phone) in `customers` table
 * - Order data in `sales_orders` and `sales_order_items`
 *
 * We log the request for manual review and processing within 30 days.
 */
async function handleCustomerDataRequest(
  supabase: ReturnType<typeof createClient>,
  payload: CustomerDataRequestPayload
): Promise<void> {
  const { shop_domain, customer, data_request } = payload;

  console.log(
    `[shopify-gdpr] Customer data request #${data_request.id} from ${shop_domain} for customer ${customer.email}`
  );

  // Find company by shop domain
  const { data: creds } = await supabase
    .from("shopify_credentials")
    .select("company_id")
    .eq("shop_domain", shop_domain)
    .maybeSingle();

  if (!creds) {
    console.warn(
      `[shopify-gdpr] No credentials found for shop ${shop_domain} — data may already be deleted`
    );
    return;
  }

  // Log the GDPR request for audit trail
  await supabase.from("gdpr_requests").insert({
    company_id: creds.company_id,
    request_type: "data_request",
    source: "shopify",
    subject_email: customer.email,
    subject_phone: customer.phone || null,
    external_request_id: String(data_request.id),
    shop_domain,
    payload: payload as unknown as Record<string, unknown>,
    status: "pending",
    created_at: new Date().toISOString(),
    due_by: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }).then(({ error }) => {
    if (error) {
      // Table might not exist yet — log but don't fail the webhook
      console.warn(`[shopify-gdpr] Could not insert GDPR request log: ${error.message}`);
      console.log("[shopify-gdpr] GDPR data request logged to console for manual processing");
    }
  });
}

/**
 * Handle customers/redact
 *
 * A customer has requested their personal data be erased. We must delete or
 * anonymize their data within 30 days, UNLESS we have a legal obligation to
 * retain it (e.g., tax records — typically 7 years).
 *
 * Strategy:
 * - Anonymize customer records (replace PII with placeholders)
 * - Keep order records with anonymized references (tax/legal requirement)
 * - Delete any non-essential personal data
 */
async function handleCustomerRedact(
  supabase: ReturnType<typeof createClient>,
  payload: CustomerRedactPayload
): Promise<void> {
  const { shop_domain, customer, orders_to_redact } = payload;

  console.log(
    `[shopify-gdpr] Customer redact request from ${shop_domain} for customer ${customer.email}, orders: ${orders_to_redact?.length || 0}`
  );

  // Find company by shop domain
  const { data: creds } = await supabase
    .from("shopify_credentials")
    .select("company_id")
    .eq("shop_domain", shop_domain)
    .maybeSingle();

  if (!creds) {
    console.warn(
      `[shopify-gdpr] No credentials found for shop ${shop_domain} — data may already be deleted`
    );
    return;
  }

  const companyId = creds.company_id;

  // Anonymize customer record (keep record for tax compliance, remove PII)
  if (customer.email) {
    const { data: customerRecord } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("email", customer.email)
      .maybeSingle();

    if (customerRecord) {
      await supabase
        .from("customers")
        .update({
          name: "[REDACTED]",
          email: `redacted-${customerRecord.id}@redacted.local`,
          phone: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerRecord.id);

      console.log(
        `[shopify-gdpr] Anonymized customer record ${customerRecord.id}`
      );
    }
  }

  // Anonymize shipping/billing info on related orders
  if (orders_to_redact?.length) {
    for (const shopifyOrderId of orders_to_redact) {
      await supabase
        .from("sales_orders")
        .update({
          shipping_name: "[REDACTED]",
          shipping_address_line1: "[REDACTED]",
          shipping_address_line2: null,
          shipping_city: "[REDACTED]",
          shipping_state: null,
          shipping_postal_code: "[REDACTED]",
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("shopify_order_id", shopifyOrderId);
    }
    console.log(
      `[shopify-gdpr] Anonymized ${orders_to_redact.length} order(s)`
    );
  }

  // Log for audit
  await supabase.from("gdpr_requests").insert({
    company_id: companyId,
    request_type: "customer_redact",
    source: "shopify",
    subject_email: customer.email,
    subject_phone: customer.phone || null,
    shop_domain,
    payload: payload as unknown as Record<string, unknown>,
    status: "completed",
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) {
      console.warn(`[shopify-gdpr] Could not insert GDPR request log: ${error.message}`);
    }
  });
}

/**
 * Handle shop/redact
 *
 * Sent 48 hours after a merchant uninstalls the app. We must delete ALL data
 * associated with this shop within 30 days, unless legally required to retain.
 *
 * Strategy:
 * - Delete shopify_product_mappings for this company
 * - Delete shopify_credentials for this shop
 * - Keep anonymized sales_orders (tax/legal obligation)
 * - Delete any cached Shopify data
 */
async function handleShopRedact(
  supabase: ReturnType<typeof createClient>,
  payload: ShopRedactPayload
): Promise<void> {
  const { shop_domain } = payload;

  console.log(`[shopify-gdpr] Shop redact request for ${shop_domain}`);

  // Find company by shop domain
  const { data: creds } = await supabase
    .from("shopify_credentials")
    .select("company_id, id")
    .eq("shop_domain", shop_domain)
    .maybeSingle();

  if (!creds) {
    console.warn(
      `[shopify-gdpr] No credentials found for shop ${shop_domain} — may already be cleaned up`
    );
    return;
  }

  const companyId = creds.company_id;

  // 1. Delete all product mappings for this company's Shopify connection
  const { count: mappingsDeleted } = await supabase
    .from("shopify_product_mappings")
    .delete({ count: "exact" })
    .eq("company_id", companyId);

  console.log(
    `[shopify-gdpr] Deleted ${mappingsDeleted || 0} product mappings`
  );

  // 2. Clear shopify-specific columns on products
  await supabase
    .from("products")
    .update({ shopify_listed: false })
    .eq("company_id", companyId)
    .eq("shopify_listed", true);

  // 3. Clear external inventory tracking
  await supabase
    .from("inventory")
    .update({ quantity_external_shopify: 0 })
    .eq("company_id", companyId)
    .gt("quantity_external_shopify", 0);

  // 4. Delete the credentials record itself
  await supabase
    .from("shopify_credentials")
    .delete()
    .eq("id", creds.id);

  console.log(
    `[shopify-gdpr] Completed shop redact for ${shop_domain} (company: ${companyId})`
  );

  // Log for audit
  await supabase.from("gdpr_requests").insert({
    company_id: companyId,
    request_type: "shop_redact",
    source: "shopify",
    shop_domain,
    payload: payload as unknown as Record<string, unknown>,
    status: "completed",
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) {
      console.warn(`[shopify-gdpr] Could not insert GDPR request log: ${error.message}`);
    }
  });
}

// ============================================
// Main handler
// ============================================

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read raw body for HMAC verification
    const bodyText = await req.text();
    const hmac = req.headers.get("X-Shopify-Hmac-Sha256");
    const topic = req.headers.get("X-Shopify-Topic");

    // Verify HMAC signature — return 401 if invalid (Shopify requirement)
    const isValid = await verifyShopifyHmac(bodyText, hmac);
    if (!isValid) {
      console.error("[shopify-gdpr] Invalid HMAC signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(bodyText);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(
      `[shopify-gdpr] Received ${topic} for shop ${payload.shop_domain || "unknown"}`
    );

    // Route by topic
    switch (topic) {
      case "customers/data_request":
        await handleCustomerDataRequest(supabase, payload);
        break;

      case "customers/redact":
        await handleCustomerRedact(supabase, payload);
        break;

      case "shop/redact":
        await handleShopRedact(supabase, payload);
        break;

      default:
        console.warn(`[shopify-gdpr] Unknown GDPR topic: ${topic}`);
    }

    // Always respond 200 quickly — Shopify expects response within 5 seconds
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shopify-gdpr] Error:", message);

    // Still return 200 to avoid Shopify retries that could cause duplicate processing
    // Log the error for investigation
    return new Response(JSON.stringify({ ok: true, warning: "Processing error logged" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

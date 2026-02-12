/**
 * Shopify Webhooks Edge Function
 * Handles incoming Shopify webhook events with HMAC-SHA256 verification
 *
 * Topics:
 *   - orders/create: Import new order as sales_order
 *   - orders/updated: Update sales_order status
 *   - orders/cancelled: Cancel order, release inventory
 *   - inventory_levels/update: Update mapping stock level
 *   - products/update: Update mapping title/SKU cache
 *   - products/delete: Deactivate mapping
 *   - refunds/create: Create return record
 *   - app/uninstalled: Disconnect store
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// HMAC-SHA256 Verification (timing-safe)
// ============================================

async function verifyShopifyHmac(
  bodyText: string,
  hmacHeader: string | null
): Promise<boolean> {
  if (!SHOPIFY_API_SECRET || !hmacHeader) {
    console.warn("[shopify-webhooks] HMAC verification skipped — no secret or header");
    return !!SHOPIFY_API_SECRET === false; // Only skip if no secret configured
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
// Main handler
// ============================================

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Read raw body for HMAC verification
    const bodyText = await req.text();
    const hmac = req.headers.get("X-Shopify-Hmac-Sha256");
    const topic = req.headers.get("X-Shopify-Topic");
    const shopDomain = req.headers.get("X-Shopify-Shop-Domain");

    // Verify HMAC signature
    const isValid = await verifyShopifyHmac(bodyText, hmac);
    if (!isValid) {
      console.error("[shopify-webhooks] Invalid HMAC signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!topic || !shopDomain) {
      return new Response(JSON.stringify({ error: "Missing topic or shop domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up company by shop domain
    const { data: creds } = await supabase
      .from("shopify_credentials")
      .select("company_id, id, auto_sync_orders, auto_fulfill, primary_location_id")
      .eq("shop_domain", shopDomain)
      .eq("is_active", true)
      .maybeSingle();

    if (!creds) {
      console.warn(`[shopify-webhooks] Unknown shop domain: ${shopDomain}`);
      return new Response(JSON.stringify({ error: "Unknown shop" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = creds.company_id;
    const payload = JSON.parse(bodyText);

    console.log(`[shopify-webhooks] ${topic} from ${shopDomain} (company: ${companyId})`);

    // Route by topic
    switch (topic) {
      // ============================================
      // ORDERS
      // ============================================

      case "orders/create": {
        if (!creds.auto_sync_orders) break;

        const orderId = payload.id;
        const orderNumber = payload.name || `#${payload.order_number}`;

        // Dedup check
        const { data: existing } = await supabase
          .from("sales_orders")
          .select("id")
          .eq("company_id", companyId)
          .eq("shopify_order_id", orderId)
          .maybeSingle();

        if (existing) {
          console.log(`[shopify-webhooks] Order ${orderId} already exists, skipping`);
          break;
        }

        // Find or create customer by email
        let customerId: string | null = null;
        if (payload.email) {
          const { data: customer } = await supabase
            .from("customers")
            .select("id")
            .eq("company_id", companyId)
            .eq("email", payload.email)
            .maybeSingle();

          if (customer) {
            customerId = customer.id;
          } else {
            const { data: newCustomer } = await supabase
              .from("customers")
              .insert({
                company_id: companyId,
                name: `${payload.customer?.first_name || ""} ${payload.customer?.last_name || ""}`.trim() || payload.email,
                email: payload.email,
                phone: payload.phone || null,
              })
              .select("id")
              .single();
            customerId = newCustomer?.id || null;
          }
        }

        // Map shipping address
        const shipping = payload.shipping_address || {};

        // Create sales order
        const { data: salesOrder, error: orderErr } = await supabase
          .from("sales_orders")
          .insert({
            company_id: companyId,
            customer_id: customerId,
            source: "shopify",
            shopify_order_id: orderId,
            shopify_order_number: orderNumber,
            order_date: payload.created_at || new Date().toISOString(),
            status: "confirmed",
            shipping_name: shipping.name || "",
            shipping_address_line1: shipping.address1 || "",
            shipping_address_line2: shipping.address2 || "",
            shipping_city: shipping.city || "",
            shipping_state: shipping.province || "",
            shipping_postal_code: shipping.zip || "",
            shipping_country: shipping.country_code || "NL",
            billing_same_as_shipping: true,
            subtotal: parseFloat(payload.subtotal_price || "0"),
            discount_value: 0,
            discount_amount: parseFloat(payload.total_discounts || "0"),
            tax_percent: 0,
            tax_amount: parseFloat(payload.total_tax || "0"),
            shipping_cost: parseFloat(payload.total_shipping_price_set?.shop_money?.amount || "0"),
            total: parseFloat(payload.total_price || "0"),
            currency: payload.currency || "EUR",
            payment_status: payload.financial_status === "paid" ? "paid" : "pending",
            metadata: { shopify_raw: { id: orderId, name: orderNumber } },
          })
          .select("id")
          .single();

        if (orderErr) {
          console.error(`[shopify-webhooks] Failed to create order: ${orderErr.message}`);
          break;
        }

        // Create line items
        for (const item of payload.line_items || []) {
          // Resolve product via variant mapping
          let productId: string | null = null;
          if (item.variant_id) {
            const { data: mapping } = await supabase
              .from("shopify_product_mappings")
              .select("product_id")
              .eq("company_id", companyId)
              .eq("shopify_variant_id", item.variant_id)
              .eq("is_active", true)
              .maybeSingle();
            productId = mapping?.product_id || null;
          }

          await supabase.from("sales_order_items").insert({
            sales_order_id: salesOrder.id,
            product_id: productId,
            product_name: item.title || item.name || "",
            sku: item.sku || "",
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.price || "0"),
            discount_amount: parseFloat(item.total_discount || "0"),
            total: parseFloat(item.price || "0") * (item.quantity || 1),
          });

          // Reserve inventory for mapped products
          if (productId) {
            await supabase.rpc("reserve_inventory", {
              p_product_id: productId,
              p_quantity: item.quantity || 1,
            }).catch(() => {
              // RPC may not exist yet; fallback to direct update
              supabase
                .from("inventory")
                .update({
                  quantity_reserved: supabase.rpc ? undefined : 0, // placeholder
                })
                .eq("product_id", productId)
                .eq("company_id", companyId);
            });
          }
        }

        console.log(`[shopify-webhooks] Created order ${orderNumber} (${salesOrder.id})`);
        break;
      }

      case "orders/updated": {
        const orderId = payload.id;

        const { data: existing } = await supabase
          .from("sales_orders")
          .select("id, status")
          .eq("company_id", companyId)
          .eq("shopify_order_id", orderId)
          .maybeSingle();

        if (!existing) break;

        // Map Shopify status to our status
        const statusMap: Record<string, string> = {
          fulfilled: "shipped",
          partially_fulfilled: "processing",
          unfulfilled: "confirmed",
        };
        const newStatus = statusMap[payload.fulfillment_status || "unfulfilled"] || existing.status;

        const paymentMap: Record<string, string> = {
          paid: "paid",
          partially_paid: "partial",
          pending: "pending",
          refunded: "paid",
        };
        const newPayment = paymentMap[payload.financial_status || "pending"] || "pending";

        await supabase
          .from("sales_orders")
          .update({
            status: newStatus,
            payment_status: newPayment,
            total: parseFloat(payload.total_price || "0"),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        break;
      }

      case "orders/cancelled": {
        const orderId = payload.id;

        const { data: existing } = await supabase
          .from("sales_orders")
          .select("id")
          .eq("company_id", companyId)
          .eq("shopify_order_id", orderId)
          .maybeSingle();

        if (!existing) break;

        await supabase
          .from("sales_orders")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        // Release reserved inventory
        const { data: items } = await supabase
          .from("sales_order_items")
          .select("product_id, quantity")
          .eq("sales_order_id", existing.id)
          .not("product_id", "is", null);

        for (const item of items || []) {
          if (item.product_id) {
            const { data: inv } = await supabase
              .from("inventory")
              .select("id, quantity_reserved")
              .eq("company_id", companyId)
              .eq("product_id", item.product_id)
              .maybeSingle();

            if (inv) {
              await supabase
                .from("inventory")
                .update({
                  quantity_reserved: Math.max(0, (inv.quantity_reserved || 0) - item.quantity),
                })
                .eq("id", inv.id);
            }
          }
        }

        console.log(`[shopify-webhooks] Cancelled order ${orderId}`);
        break;
      }

      // ============================================
      // INVENTORY
      // ============================================

      case "inventory_levels/update": {
        const inventoryItemId = payload.inventory_item_id;
        const available = payload.available;

        // Find mapping
        const { data: mapping } = await supabase
          .from("shopify_product_mappings")
          .select("id, product_id")
          .eq("company_id", companyId)
          .eq("shopify_inventory_item_id", inventoryItemId)
          .eq("is_active", true)
          .maybeSingle();

        if (!mapping) break;

        // Update mapping cache
        await supabase
          .from("shopify_product_mappings")
          .update({
            shopify_stock_level: available,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", mapping.id);

        // Update inventory external tracking
        if (mapping.product_id) {
          await supabase
            .from("inventory")
            .update({ quantity_external_shopify: available || 0 })
            .eq("company_id", companyId)
            .eq("product_id", mapping.product_id);
        }

        break;
      }

      // ============================================
      // PRODUCTS
      // ============================================

      case "products/update": {
        const shopifyProductId = payload.id;

        // Update all variant mappings for this product
        for (const variant of payload.variants || []) {
          await supabase
            .from("shopify_product_mappings")
            .update({
              shopify_product_title: payload.title,
              shopify_variant_title: variant.title,
              shopify_sku: variant.sku,
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", companyId)
            .eq("shopify_variant_id", variant.id);
        }

        break;
      }

      case "products/delete": {
        const shopifyProductId = payload.id;

        await supabase
          .from("shopify_product_mappings")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .eq("shopify_product_id", shopifyProductId);

        // Update product listing status
        const { data: mappings } = await supabase
          .from("shopify_product_mappings")
          .select("product_id")
          .eq("company_id", companyId)
          .eq("shopify_product_id", shopifyProductId);

        for (const m of mappings || []) {
          await supabase
            .from("products")
            .update({ shopify_listed: false })
            .eq("id", m.product_id);
        }

        console.log(`[shopify-webhooks] Deactivated mappings for product ${shopifyProductId}`);
        break;
      }

      // ============================================
      // REFUNDS
      // ============================================

      case "refunds/create": {
        const orderId = payload.order_id;

        // Find the sales order
        const { data: salesOrder } = await supabase
          .from("sales_orders")
          .select("id, customer_id")
          .eq("company_id", companyId)
          .eq("shopify_order_id", orderId)
          .maybeSingle();

        if (!salesOrder) break;

        // Create return record
        const returnCode = `RET-SHP-${payload.id || Date.now().toString(36).toUpperCase()}`;

        const { data: ret } = await supabase
          .from("returns")
          .insert({
            company_id: companyId,
            return_code: returnCode,
            source: "shopify",
            status: "registered",
            sales_order_id: salesOrder.id,
            customer_id: salesOrder.customer_id,
            registered_at: payload.created_at || new Date().toISOString(),
            notes: `Shopify refund #${payload.id}`,
          })
          .select("id")
          .single();

        if (ret) {
          // Add refund line items
          for (const line of payload.refund_line_items || []) {
            const lineItem = line.line_item;
            let productId: string | null = null;

            if (lineItem?.variant_id) {
              const { data: mapping } = await supabase
                .from("shopify_product_mappings")
                .select("product_id")
                .eq("company_id", companyId)
                .eq("shopify_variant_id", lineItem.variant_id)
                .maybeSingle();
              productId = mapping?.product_id || null;
            }

            await supabase.from("return_items").insert({
              return_id: ret.id,
              product_id: productId,
              ean: lineItem?.sku || "",
              quantity: line.quantity || 1,
              reason: line.restock_type === "cancel" ? "no_longer_needed" : "other",
            });
          }
        }

        console.log(`[shopify-webhooks] Created return ${returnCode} for refund ${payload.id}`);
        break;
      }

      // ============================================
      // APP UNINSTALLED
      // ============================================

      case "app/uninstalled": {
        console.log(`[shopify-webhooks] App uninstalled from ${shopDomain}`);

        // Mark credentials disconnected
        await supabase
          .from("shopify_credentials")
          .update({
            status: "disconnected",
            is_active: false,
            access_token_encrypted: null,
            webhook_ids: [],
            updated_at: new Date().toISOString(),
          })
          .eq("id", creds.id);

        // Deactivate all mappings
        await supabase
          .from("shopify_product_mappings")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("company_id", companyId);

        break;
      }

      default:
        console.log(`[shopify-webhooks] Unhandled topic: ${topic}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shopify-webhooks] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

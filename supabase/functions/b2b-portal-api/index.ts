import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------------------------------------------------------------------
// Main handler — dispatches by `action` field
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // -----------------------------------------------------------------------
    // ACTION: getOrders — fetch orders for a portal client
    // -----------------------------------------------------------------------
    if (action === "getOrders") {
      const { clientId, limit = 100 } = body;
      if (!clientId) {
        return jsonResponse({ error: "Missing clientId" }, 400);
      }

      const { data, error } = await supabase
        .from("b2b_orders")
        .select(`*, b2b_order_items (*)`)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[b2b-portal-api] getOrders error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, orders: data || [] });
    }

    // -----------------------------------------------------------------------
    // ACTION: getOrder — fetch single order with items
    // -----------------------------------------------------------------------
    if (action === "getOrder") {
      const { orderId, clientId } = body;
      if (!orderId || !clientId) {
        return jsonResponse({ error: "Missing orderId or clientId" }, 400);
      }

      const { data, error } = await supabase
        .from("b2b_orders")
        .select(`*, b2b_order_items (*), portal_clients (id, full_name, email, company_name)`)
        .eq("id", orderId)
        .eq("client_id", clientId)
        .single();

      if (error) {
        console.error("[b2b-portal-api] getOrder error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, order: data });
    }

    // -----------------------------------------------------------------------
    // ACTION: processOrderPlaced — run post-order automation
    // -----------------------------------------------------------------------
    if (action === "processOrderPlaced") {
      const { orderId, organizationId } = body;
      if (!orderId || !organizationId) {
        return jsonResponse({ error: "Missing orderId or organizationId" }, 400);
      }

      const errors: string[] = [];

      // Fetch the order with items and client
      const { data: order, error: orderErr } = await supabase
        .from("b2b_orders")
        .select(`*, b2b_order_items (*), portal_clients (id, full_name, email, company_name)`)
        .eq("id", orderId)
        .single();

      if (orderErr || !order) {
        console.error("[b2b-portal-api] processOrderPlaced: order not found:", orderErr?.message);
        return jsonResponse({ error: `Order not found: ${orderErr?.message}` }, 404);
      }

      const items = order.b2b_order_items || [];
      const client = order.portal_clients || {};

      // Resolve organization_id → company_id and admin user_id
      // Users table links org to the company
      let companyId: string | null = null;
      let adminUserId: string | null = null;

      const { data: orgUser } = await supabase
        .from("users")
        .select("id, company_id")
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();

      if (orgUser) {
        companyId = orgUser.company_id;
        adminUserId = orgUser.id;
      } else {
        // Fallback: use organizationId as company_id (may fail FK)
        companyId = organizationId;
      }

      console.log("[b2b-portal-api] Resolved companyId:", companyId, "adminUserId:", adminUserId);

      // 1. Reserve inventory per item
      for (const item of items) {
        if (!item.product_id) continue;
        try {
          // Decrement available stock
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity, reserved_quantity")
            .eq("id", item.product_id)
            .single();

          if (product) {
            await supabase
              .from("products")
              .update({
                reserved_quantity: (product.reserved_quantity || 0) + (item.quantity || 1),
              })
              .eq("id", item.product_id);
          }
        } catch (err: any) {
          console.warn(`[b2b-portal-api] Inventory reservation failed for ${item.product_id}:`, err?.message);
          errors.push(`Inventory: ${item.product_name} - ${err?.message}`);
        }
      }

      // 2. (Invoice creation moved to merchant confirmation — processOrderConfirmed)

      // 3. Create merchant notification
      try {
        const orderNum = order.order_number || `#${orderId.slice(0, 8)}`;
        const itemCount = items.length;
        const totalFmt = new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR" }).format(Number(order.total) || 0);

        if (!adminUserId) {
          console.warn("[b2b-portal-api] No admin user found, skipping notification");
          errors.push("Notification: No admin user found");
        } else {
          const { error: notifErr } = await supabase.from("user_notifications").insert({
            user_id: adminUserId,
            organization_id: organizationId,
            type: "b2b_order",
            title: `New B2B Order ${orderNum}`,
            message: `Order from ${client.company_name || client.full_name || "client"} — ${totalFmt}, ${itemCount} item${itemCount !== 1 ? "s" : ""}`,
            action_url: `/b2b/orders/${orderId}`,
            metadata: { orderId, orderNumber: orderNum, clientName: client.full_name, severity: "medium" },
          });

          if (notifErr) {
            console.warn("[b2b-portal-api] Notification failed:", notifErr.message);
            errors.push(`Notification: ${notifErr.message}`);
          } else {
            console.log("[b2b-portal-api] Notification created for order", orderNum);
          }
        }
      } catch (err: any) {
        console.warn("[b2b-portal-api] Notification error:", err?.message);
        errors.push(`Notification: ${err?.message}`);
      }

      // 4. Trigger webhook email (order_created)
      try {
        const webhookUrl = `${supabaseUrl}/functions/v1/b2b-order-webhook`;
        const webhookRes = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            event: "order_created",
            orderId,
            organizationId,
          }),
        });

        if (!webhookRes.ok) {
          const errText = await webhookRes.text();
          console.warn("[b2b-portal-api] Webhook returned", webhookRes.status, errText);
          errors.push(`Webhook: HTTP ${webhookRes.status}`);
        } else {
          console.log("[b2b-portal-api] Webhook email triggered for order_created");
        }
      } catch (err: any) {
        console.warn("[b2b-portal-api] Webhook call failed:", err?.message);
        errors.push(`Webhook: ${err?.message}`);
      }

      return jsonResponse({ success: true, errors });
    }

    // -----------------------------------------------------------------------
    // Unknown action
    // -----------------------------------------------------------------------
    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("[b2b-portal-api] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

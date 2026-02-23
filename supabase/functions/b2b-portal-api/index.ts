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

        // Write to `notifications` table (same table the frontend reads)
        const { error: notifErr } = await supabase.from("notifications").insert({
          company_id: companyId || organizationId,
          type: "b2b_order",
          severity: "medium",
          title: `New B2B Order ${orderNum}`,
          message: `Order from ${client.company_name || client.full_name || "client"} — ${totalFmt}, ${itemCount} item${itemCount !== 1 ? "s" : ""}`,
          action_url: `/b2b/orders/${orderId}`,
          context_data: { orderId, orderNumber: orderNum, clientName: client.full_name },
          status: "unread",
        });

        if (notifErr) {
          console.warn("[b2b-portal-api] Notification failed:", notifErr.message);
          errors.push(`Notification: ${notifErr.message}`);
        } else {
          console.log("[b2b-portal-api] Notification created for order", orderNum);
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
    // ACTION: getFavorites — fetch client's favorite products
    // -----------------------------------------------------------------------
    if (action === "getFavorites") {
      const { clientId } = body;
      if (!clientId) {
        return jsonResponse({ error: "Missing clientId" }, 400);
      }

      const { data, error } = await supabase
        .from("client_favorites")
        .select(`
          id,
          product_id,
          created_at,
          products (id, name, featured_image, status),
          physical_products (base_price, currency)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[b2b-portal-api] getFavorites error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, favorites: data || [] });
    }

    // -----------------------------------------------------------------------
    // ACTION: toggleFavorite — add or remove a favorite product
    // -----------------------------------------------------------------------
    if (action === "toggleFavorite") {
      const { clientId, productId } = body;
      if (!clientId || !productId) {
        return jsonResponse({ error: "Missing clientId or productId" }, 400);
      }

      // Check if favorite already exists
      const { data: existing, error: checkErr } = await supabase
        .from("client_favorites")
        .select("id")
        .eq("client_id", clientId)
        .eq("product_id", productId)
        .maybeSingle();

      if (checkErr) {
        console.error("[b2b-portal-api] toggleFavorite check error:", checkErr.message);
        return jsonResponse({ error: checkErr.message }, 500);
      }

      if (existing) {
        // Remove favorite
        const { error: deleteErr } = await supabase
          .from("client_favorites")
          .delete()
          .eq("id", existing.id);

        if (deleteErr) {
          console.error("[b2b-portal-api] toggleFavorite delete error:", deleteErr.message);
          return jsonResponse({ error: deleteErr.message }, 500);
        }

        return jsonResponse({ success: true, removed: true });
      } else {
        // Add favorite
        const { error: insertErr } = await supabase
          .from("client_favorites")
          .insert({ client_id: clientId, product_id: productId });

        if (insertErr) {
          console.error("[b2b-portal-api] toggleFavorite insert error:", insertErr.message);
          return jsonResponse({ error: insertErr.message }, 500);
        }

        return jsonResponse({ success: true, added: true });
      }
    }

    // -----------------------------------------------------------------------
    // ACTION: checkFavorite — check if a product is favorited
    // -----------------------------------------------------------------------
    if (action === "checkFavorite") {
      const { clientId, productId } = body;
      if (!clientId || !productId) {
        return jsonResponse({ error: "Missing clientId or productId" }, 400);
      }

      const { data, error } = await supabase
        .from("client_favorites")
        .select("id")
        .eq("client_id", clientId)
        .eq("product_id", productId)
        .maybeSingle();

      if (error) {
        console.error("[b2b-portal-api] checkFavorite error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, isFavorite: !!data });
    }

    // -----------------------------------------------------------------------
    // ACTION: getTemplates — fetch client's order templates
    // -----------------------------------------------------------------------
    if (action === "getTemplates") {
      const { clientId } = body;
      if (!clientId) {
        return jsonResponse({ error: "Missing clientId" }, 400);
      }

      const { data, error } = await supabase
        .from("client_order_templates")
        .select("*")
        .eq("client_id", clientId)
        .order("last_used_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[b2b-portal-api] getTemplates error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, templates: data || [] });
    }

    // -----------------------------------------------------------------------
    // ACTION: createTemplate — create a new order template
    // -----------------------------------------------------------------------
    if (action === "createTemplate") {
      const { clientId, name, items } = body;
      if (!clientId || !name || !items) {
        return jsonResponse({ error: "Missing clientId, name, or items" }, 400);
      }

      const { data, error } = await supabase
        .from("client_order_templates")
        .insert({
          client_id: clientId,
          name,
          items,
        })
        .select()
        .single();

      if (error) {
        console.error("[b2b-portal-api] createTemplate error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, template: data });
    }

    // -----------------------------------------------------------------------
    // ACTION: updateTemplate — update an existing order template
    // -----------------------------------------------------------------------
    if (action === "updateTemplate") {
      const { templateId, clientId, name, items } = body;
      if (!templateId || !clientId) {
        return jsonResponse({ error: "Missing templateId or clientId" }, 400);
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (items !== undefined) updateData.items = items;

      if (Object.keys(updateData).length === 0) {
        return jsonResponse({ error: "No fields to update" }, 400);
      }

      const { data, error } = await supabase
        .from("client_order_templates")
        .update(updateData)
        .eq("id", templateId)
        .eq("client_id", clientId)
        .select()
        .single();

      if (error) {
        console.error("[b2b-portal-api] updateTemplate error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, template: data });
    }

    // -----------------------------------------------------------------------
    // ACTION: deleteTemplate — delete an order template
    // -----------------------------------------------------------------------
    if (action === "deleteTemplate") {
      const { templateId, clientId } = body;
      if (!templateId || !clientId) {
        return jsonResponse({ error: "Missing templateId or clientId" }, 400);
      }

      const { error } = await supabase
        .from("client_order_templates")
        .delete()
        .eq("id", templateId)
        .eq("client_id", clientId);

      if (error) {
        console.error("[b2b-portal-api] deleteTemplate error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, deleted: true });
    }

    // -----------------------------------------------------------------------
    // ACTION: getNotifications — fetch client notifications
    // -----------------------------------------------------------------------
    if (action === "getNotifications") {
      const { clientId, limit = 50 } = body;
      if (!clientId) {
        return jsonResponse({ error: "Missing clientId" }, 400);
      }

      const { data, error } = await supabase
        .from("client_notifications")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[b2b-portal-api] getNotifications error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, notifications: data || [] });
    }

    // -----------------------------------------------------------------------
    // ACTION: markNotificationRead — mark a single notification as read
    // -----------------------------------------------------------------------
    if (action === "markNotificationRead") {
      const { notificationId, clientId } = body;
      if (!notificationId || !clientId) {
        return jsonResponse({ error: "Missing notificationId or clientId" }, 400);
      }

      const { data, error } = await supabase
        .from("client_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("client_id", clientId)
        .select()
        .single();

      if (error) {
        console.error("[b2b-portal-api] markNotificationRead error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, notification: data });
    }

    // -----------------------------------------------------------------------
    // ACTION: getOrderMessages — fetch messages for an order
    // -----------------------------------------------------------------------
    if (action === "getOrderMessages") {
      const { orderId, clientId } = body;
      if (!orderId || !clientId) {
        return jsonResponse({ error: "Missing orderId or clientId" }, 400);
      }

      // Verify the order belongs to this client
      const { data: order, error: orderErr } = await supabase
        .from("b2b_orders")
        .select("id")
        .eq("id", orderId)
        .eq("client_id", clientId)
        .maybeSingle();

      if (orderErr) {
        console.error("[b2b-portal-api] getOrderMessages order check error:", orderErr.message);
        return jsonResponse({ error: orderErr.message }, 500);
      }

      if (!order) {
        return jsonResponse({ error: "Order not found or does not belong to this client" }, 404);
      }

      // Fetch messages
      const { data: messages, error: msgErr } = await supabase
        .from("b2b_order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (msgErr) {
        console.error("[b2b-portal-api] getOrderMessages error:", msgErr.message);
        return jsonResponse({ error: msgErr.message }, 500);
      }

      return jsonResponse({ success: true, messages: messages || [] });
    }

    // -----------------------------------------------------------------------
    // ACTION: sendOrderMessage — send a message on an order
    // -----------------------------------------------------------------------
    if (action === "sendOrderMessage") {
      const { orderId, clientId, message, senderType = "client" } = body;
      if (!orderId || !clientId || !message) {
        return jsonResponse({ error: "Missing orderId, clientId, or message" }, 400);
      }

      // Verify the order belongs to this client
      const { data: order, error: orderErr } = await supabase
        .from("b2b_orders")
        .select("id")
        .eq("id", orderId)
        .eq("client_id", clientId)
        .maybeSingle();

      if (orderErr) {
        console.error("[b2b-portal-api] sendOrderMessage order check error:", orderErr.message);
        return jsonResponse({ error: orderErr.message }, 500);
      }

      if (!order) {
        return jsonResponse({ error: "Order not found or does not belong to this client" }, 404);
      }

      // Insert the message
      const { data: newMessage, error: insertErr } = await supabase
        .from("b2b_order_messages")
        .insert({
          order_id: orderId,
          sender_type: senderType,
          sender_id: clientId,
          message,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("[b2b-portal-api] sendOrderMessage insert error:", insertErr.message);
        return jsonResponse({ error: insertErr.message }, 500);
      }

      return jsonResponse({ success: true, message: newMessage });
    }

    // -----------------------------------------------------------------------
    // ACTION: markMessagesRead — mark merchant messages as read for an order
    // -----------------------------------------------------------------------
    if (action === "markMessagesRead") {
      const { orderId, clientId } = body;
      if (!orderId || !clientId) {
        return jsonResponse({ error: "Missing orderId or clientId" }, 400);
      }

      // Verify the order belongs to this client
      const { data: order, error: orderErr } = await supabase
        .from("b2b_orders")
        .select("id")
        .eq("id", orderId)
        .eq("client_id", clientId)
        .maybeSingle();

      if (orderErr) {
        console.error("[b2b-portal-api] markMessagesRead order check error:", orderErr.message);
        return jsonResponse({ error: orderErr.message }, 500);
      }

      if (!order) {
        return jsonResponse({ error: "Order not found or does not belong to this client" }, 404);
      }

      // Mark all merchant messages as read
      const { data: updated, error: updateErr } = await supabase
        .from("b2b_order_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("order_id", orderId)
        .eq("sender_type", "merchant")
        .is("read_at", null)
        .select();

      if (updateErr) {
        console.error("[b2b-portal-api] markMessagesRead error:", updateErr.message);
        return jsonResponse({ error: updateErr.message }, 500);
      }

      return jsonResponse({ success: true, markedCount: (updated || []).length });
    }

    // -----------------------------------------------------------------------
    // ACTION: getAnnouncements — fetch active store announcements
    // -----------------------------------------------------------------------
    if (action === "getAnnouncements") {
      const { storeId } = body;
      if (!storeId) {
        return jsonResponse({ error: "Missing storeId" }, 400);
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("store_announcements")
        .select("*")
        .eq("store_id", storeId)
        .eq("active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[b2b-portal-api] getAnnouncements error:", error.message);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ success: true, announcements: data || [] });
    }

    // -----------------------------------------------------------------------
    // ACTION: cancelOrder — cancel a pending order and release inventory
    // -----------------------------------------------------------------------
    if (action === "cancelOrder") {
      const { orderId, clientId, reason } = body;
      if (!orderId || !clientId) {
        return jsonResponse({ error: "Missing orderId or clientId" }, 400);
      }

      // Verify the order belongs to client AND is still pending
      const { data: order, error: orderErr } = await supabase
        .from("b2b_orders")
        .select("id, status, b2b_order_items (*)")
        .eq("id", orderId)
        .eq("client_id", clientId)
        .single();

      if (orderErr || !order) {
        console.error("[b2b-portal-api] cancelOrder order check error:", orderErr?.message);
        return jsonResponse({ error: "Order not found or does not belong to this client" }, 404);
      }

      if (order.status !== "pending") {
        return jsonResponse({ error: `Cannot cancel order with status '${order.status}'. Only pending orders can be cancelled.` }, 400);
      }

      // Update order status to cancelled
      const updateData: Record<string, unknown> = { status: "cancelled" };
      if (reason) {
        updateData.notes = reason;
      }

      const { error: updateErr } = await supabase
        .from("b2b_orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateErr) {
        console.error("[b2b-portal-api] cancelOrder update error:", updateErr.message);
        return jsonResponse({ error: updateErr.message }, 500);
      }

      // Release reserved inventory for each item
      const items = order.b2b_order_items || [];
      const inventoryErrors: string[] = [];

      for (const item of items) {
        if (!item.product_id) continue;
        try {
          const { data: product } = await supabase
            .from("products")
            .select("reserved_quantity")
            .eq("id", item.product_id)
            .single();

          if (product) {
            const newReserved = Math.max(0, (product.reserved_quantity || 0) - (item.quantity || 1));
            await supabase
              .from("products")
              .update({ reserved_quantity: newReserved })
              .eq("id", item.product_id);
          }
        } catch (err: any) {
          console.warn(`[b2b-portal-api] Inventory release failed for ${item.product_id}:`, err?.message);
          inventoryErrors.push(`${item.product_name || item.product_id}: ${err?.message}`);
        }
      }

      return jsonResponse({
        success: true,
        cancelled: true,
        inventoryErrors: inventoryErrors.length > 0 ? inventoryErrors : undefined,
      });
    }

    // -----------------------------------------------------------------------
    // ACTION: getDashboardData — fetch aggregated dashboard stats
    // -----------------------------------------------------------------------
    if (action === "getDashboardData") {
      const { clientId } = body;
      if (!clientId) {
        return jsonResponse({ error: "Missing clientId" }, 400);
      }

      // Run all queries in parallel for performance
      const [
        totalOrdersRes,
        pendingOrdersRes,
        completedOrdersRes,
        favoriteCountRes,
        unreadNotificationsRes,
        recentOrdersRes,
      ] = await Promise.all([
        // Total orders
        supabase
          .from("b2b_orders")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId),

        // Pending orders
        supabase
          .from("b2b_orders")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId)
          .eq("status", "pending"),

        // Completed orders (for totalSpent calculation)
        supabase
          .from("b2b_orders")
          .select("total")
          .eq("client_id", clientId)
          .in("status", ["confirmed", "shipped", "delivered"]),

        // Favorite count
        supabase
          .from("client_favorites")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId),

        // Unread notifications
        supabase
          .from("client_notifications")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId)
          .is("read_at", null),

        // Recent orders (last 5)
        supabase
          .from("b2b_orders")
          .select("id, order_number, status, total, created_at")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Calculate total spent from completed orders
      let totalSpent = 0;
      if (completedOrdersRes.data) {
        totalSpent = completedOrdersRes.data.reduce(
          (sum: number, order: { total: number | string | null }) =>
            sum + (Number(order.total) || 0),
          0
        );
      }

      // Check for any errors
      const queryErrors: string[] = [];
      if (totalOrdersRes.error) queryErrors.push(`totalOrders: ${totalOrdersRes.error.message}`);
      if (pendingOrdersRes.error) queryErrors.push(`pendingOrders: ${pendingOrdersRes.error.message}`);
      if (completedOrdersRes.error) queryErrors.push(`totalSpent: ${completedOrdersRes.error.message}`);
      if (favoriteCountRes.error) queryErrors.push(`favoriteCount: ${favoriteCountRes.error.message}`);
      if (unreadNotificationsRes.error) queryErrors.push(`unreadNotifications: ${unreadNotificationsRes.error.message}`);
      if (recentOrdersRes.error) queryErrors.push(`recentOrders: ${recentOrdersRes.error.message}`);

      if (queryErrors.length > 0) {
        console.error("[b2b-portal-api] getDashboardData errors:", queryErrors);
      }

      return jsonResponse({
        success: true,
        dashboard: {
          totalOrders: totalOrdersRes.count ?? 0,
          pendingOrders: pendingOrdersRes.count ?? 0,
          totalSpent,
          favoriteCount: favoriteCountRes.count ?? 0,
          unreadNotifications: unreadNotificationsRes.count ?? 0,
          recentOrders: recentOrdersRes.data || [],
        },
        errors: queryErrors.length > 0 ? queryErrors : undefined,
      });
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

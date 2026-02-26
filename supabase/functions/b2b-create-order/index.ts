import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderItemPayload {
  productId: string | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discountPercent: number;
  taxPercent: number;
  isPreorder: boolean;
}

interface CreateOrderPayload {
  organizationId: string;
  clientId: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  clientNotes: string;
  paymentTermsDays: number;
  poNumber?: string;
  items: OrderItemPayload[];
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: CreateOrderPayload = await req.json();

    // Validate required fields
    if (!body.organizationId || !body.clientId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: organizationId, clientId" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or empty items array" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine if any items are preorders
    const hasPreorderItems = body.items.some((item) => item.isPreorder);

    // -----------------------------------------------------------------------
    // 1. Create the order
    // -----------------------------------------------------------------------
    console.log("[b2b-create-order] Creating order for org:", body.organizationId, "client:", body.clientId);

    const { data: order, error: orderError } = await supabase
      .from("b2b_orders")
      .insert({
        organization_id: body.organizationId,
        company_id: body.organizationId,
        client_id: body.clientId,
        order_number: "", // trigger auto-generates
        status: "pending",
        subtotal: body.subtotal,
        tax_amount: body.taxAmount,
        shipping_cost: body.shippingCost,
        discount_amount: body.discountAmount,
        total: body.total,
        currency: "EUR",
        payment_status: "unpaid",
        payment_terms_days: body.paymentTermsDays || 30,
        shipping_address: body.shippingAddress || {},
        billing_address: body.billingAddress || {},
        client_notes: body.clientNotes || null,
        has_preorder_items: hasPreorderItems,
        po_number: body.poNumber || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("[b2b-create-order] Order insert failed:", {
        message: orderError.message,
        code: orderError.code,
        details: orderError.details,
        hint: orderError.hint,
      });
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create order: ${orderError.message}` }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    console.log("[b2b-create-order] Order created:", { id: order.id, order_number: order.order_number });

    // -----------------------------------------------------------------------
    // 2. Create order items
    // -----------------------------------------------------------------------
    const orderItems = body.items.map((item) => ({
      b2b_order_id: order.id,
      product_id: item.productId || null,
      product_name: item.productName,
      sku: item.sku || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      discount_percent: item.discountPercent || 0,
      tax_percent: item.taxPercent || 21,
      is_preorder: item.isPreorder || false,
    }));

    console.log("[b2b-create-order] Inserting", orderItems.length, "order items");

    const { data: insertedItems, error: itemsError } = await supabase
      .from("b2b_order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error("[b2b-create-order] Order items insert failed:", {
        message: itemsError.message,
        code: itemsError.code,
        details: itemsError.details,
        hint: itemsError.hint,
      });
      // Order was created but items failed -- return partial success with order data
      return new Response(
        JSON.stringify({
          success: false,
          error: `Order created but items failed: ${itemsError.message}`,
          order,
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    console.log("[b2b-create-order] Order items inserted:", insertedItems?.length);

    // -----------------------------------------------------------------------
    // 3. Re-fetch the order to get the generated order_number and po_number
    // -----------------------------------------------------------------------
    const { data: finalOrder, error: fetchError } = await supabase
      .from("b2b_orders")
      .select("*")
      .eq("id", order.id)
      .single();

    if (fetchError) {
      console.error("[b2b-create-order] Re-fetch failed:", fetchError.message);
      // Still return the original order data
      return new Response(
        JSON.stringify({
          success: true,
          order: { ...order, b2b_order_items: insertedItems },
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    console.log("[b2b-create-order] Final order:", {
      id: finalOrder.id,
      order_number: finalOrder.order_number,
      po_number: finalOrder.po_number,
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: { ...finalOrder, b2b_order_items: insertedItems },
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[b2b-create-order] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", details: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

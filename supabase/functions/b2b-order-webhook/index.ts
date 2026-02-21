import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

interface StoreConfig {
  storeName: string;
  primaryColor: string;
  logoUrl: string;
  bgColor: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  borderColor: string;
}

function getDefaultConfig(): StoreConfig {
  return {
    storeName: "Wholesale Store",
    primaryColor: "#06b6d4",
    logoUrl: "",
    bgColor: "#09090b",
    textColor: "#fafafa",
    mutedColor: "#a1a1aa",
    surfaceColor: "#18181b",
    borderColor: "#27272a",
  };
}

function emailWrapper(config: StoreConfig, bodyHtml: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${config.bgColor};font-family:Inter,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${config.bgColor};">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
      <tr><td style="padding:24px 32px;background-color:${config.surfaceColor};border:1px solid ${config.borderColor};border-radius:12px 12px 0 0;border-bottom:none;">
        ${config.logoUrl ? `<img src="${config.logoUrl}" alt="${config.storeName}" height="32" style="display:block;">` : `<span style="font-size:18px;font-weight:700;color:${config.textColor};">${config.storeName}</span>`}
      </td></tr>
      <tr><td style="padding:32px;background-color:${config.surfaceColor};border:1px solid ${config.borderColor};border-top:none;border-radius:0 0 12px 12px;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:24px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:${config.mutedColor};">&copy; ${year} ${config.storeName}. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function orderCreatedEmail(
  config: StoreConfig,
  order: Record<string, unknown>,
  items: Record<string, unknown>[],
): string {
  const orderNumber = (order.order_number as string) || `#${(order.id as string)?.slice(0, 8)}`;
  const itemsHtml = items.map((item) => `
    <tr>
      <td style="padding:8px 0;color:${config.textColor};font-size:14px;border-bottom:1px solid ${config.borderColor};">${item.product_name || item.name || "Item"}</td>
      <td style="padding:8px 0;color:${config.mutedColor};font-size:14px;text-align:center;border-bottom:1px solid ${config.borderColor};">${item.quantity || 1}</td>
      <td style="padding:8px 0;color:${config.textColor};font-size:14px;text-align:right;border-bottom:1px solid ${config.borderColor};">${formatCurrency(Number(item.total || item.price || 0))}</td>
    </tr>`).join("");

  return emailWrapper(config, `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${config.textColor};">Order Confirmation</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${config.mutedColor};">Thank you for your order! Here are the details.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;background-color:${config.bgColor};border-radius:8px;">
          <p style="margin:0;font-size:12px;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;">Order Number</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${config.primaryColor};">${orderNumber}</p>
        </td>
        <td style="width:16px;"></td>
        <td style="padding:12px 16px;background-color:${config.bgColor};border-radius:8px;">
          <p style="margin:0;font-size:12px;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;">Date</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${config.textColor};">${formatDate(order.created_at as string)}</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th style="padding:8px 0;font-size:11px;font-weight:600;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid ${config.borderColor};">Item</th>
        <th style="padding:8px 0;font-size:11px;font-weight:600;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;text-align:center;border-bottom:1px solid ${config.borderColor};">Qty</th>
        <th style="padding:8px 0;font-size:11px;font-weight:600;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;text-align:right;border-bottom:1px solid ${config.borderColor};">Total</th>
      </tr>
      ${itemsHtml}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:12px 0;font-size:16px;font-weight:700;color:${config.textColor};">Total</td>
        <td style="padding:12px 0;font-size:16px;font-weight:700;color:${config.primaryColor};text-align:right;">${formatCurrency(Number(order.total || 0))}</td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${config.mutedColor};">We will send you another email when your order status changes.</p>
  `);
}

function orderStatusChangedEmail(config: StoreConfig, order: Record<string, unknown>): string {
  const orderNumber = (order.order_number as string) || `#${(order.id as string)?.slice(0, 8)}`;
  const rawStatus = (order.status as string) || "unknown";
  const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

  return emailWrapper(config, `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${config.textColor};">Order Status Update</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${config.mutedColor};">Your order status has been updated.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:20px;background-color:${config.bgColor};border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;">Order ${orderNumber}</p>
          <p style="margin:12px 0 0;font-size:24px;font-weight:700;color:${config.primaryColor};">${status}</p>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${config.mutedColor};">If you have questions about your order, please contact us.</p>
  `);
}

function orderShippedEmail(config: StoreConfig, order: Record<string, unknown>): string {
  const orderNumber = (order.order_number as string) || `#${(order.id as string)?.slice(0, 8)}`;
  const trackingNumber = (order.tracking_number as string) || null;
  const trackingUrl = (order.tracking_url as string) || null;
  const carrier = (order.carrier as string) || "your carrier";

  const trackingBlock = trackingNumber ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:16px;background-color:${config.bgColor};border-radius:8px;">
          <p style="margin:0;font-size:12px;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;">Tracking Number</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${config.primaryColor};">
            ${trackingUrl ? `<a href="${trackingUrl}" style="color:${config.primaryColor};text-decoration:underline;">${trackingNumber}</a>` : trackingNumber}
          </p>
          <p style="margin:4px 0 0;font-size:12px;color:${config.mutedColor};">Via ${carrier}</p>
        </td>
      </tr>
    </table>` : "";

  return emailWrapper(config, `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${config.textColor};">Your Order Has Shipped!</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${config.mutedColor};">Great news -- order ${orderNumber} is on its way.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:20px;background-color:${config.bgColor};border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:32px;">&#128230;</p>
          <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:${config.primaryColor};">Shipped</p>
        </td>
      </tr>
    </table>
    ${trackingBlock}
    <p style="margin:24px 0 0;font-size:13px;color:${config.mutedColor};">You will receive a delivery confirmation once your package arrives.</p>
  `);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { event, orderId, organizationId } = await req.json();

    if (!event || !orderId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event, orderId, organizationId" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("b2b_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError?.message }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Fetch order items
    const { data: items } = await supabase
      .from("b2b_order_items")
      .select("*")
      .eq("order_id", orderId);

    // Fetch client email
    const { data: client } = await supabase
      .from("b2b_clients")
      .select("email, contact_name, company_name")
      .eq("organization_id", organizationId)
      .single();

    if (!client?.email) {
      return new Response(
        JSON.stringify({ error: "Client email not found" }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Fetch store config for branding
    let storeConfig = getDefaultConfig();
    const { data: portalSettings } = await supabase
      .from("portal_settings")
      .select("store_config")
      .eq("organization_id", organizationId)
      .single();

    if (portalSettings?.store_config) {
      const sc = portalSettings.store_config;
      const theme = sc.theme || {};
      storeConfig = {
        storeName: sc.company?.name || sc.name || storeConfig.storeName,
        primaryColor: theme.primaryColor || storeConfig.primaryColor,
        logoUrl: sc.company?.logo || sc.logo || "",
        bgColor: theme.backgroundColor || storeConfig.bgColor,
        textColor: theme.textColor || storeConfig.textColor,
        mutedColor: theme.mutedTextColor || storeConfig.mutedColor,
        surfaceColor: theme.surfaceColor || storeConfig.surfaceColor,
        borderColor: theme.borderColor || storeConfig.borderColor,
      };
    }

    // Build email
    let emailHtml = "";
    let subject = "";

    switch (event) {
      case "order_created":
        subject = `Order Confirmation - ${order.order_number || orderId.slice(0, 8)}`;
        emailHtml = orderCreatedEmail(storeConfig, order, items || []);
        break;
      case "order_status_changed":
        subject = `Order Update - ${order.order_number || orderId.slice(0, 8)} is now ${order.status}`;
        emailHtml = orderStatusChangedEmail(storeConfig, order);
        break;
      case "order_shipped":
        subject = `Your Order Has Shipped - ${order.order_number || orderId.slice(0, 8)}`;
        emailHtml = orderShippedEmail(storeConfig, order);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown event: ${event}` }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
    }

    // Log notification to b2b_order_notifications table
    const { error: logError } = await supabase
      .from("b2b_order_notifications")
      .insert({
        order_id: orderId,
        organization_id: organizationId,
        event,
        recipient_email: client.email,
        subject,
        html_body: emailHtml,
        status: "logged",
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.error("[b2b-order-webhook] Failed to log notification:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        event,
        orderId,
        recipientEmail: client.email,
        subject,
        notificationLogged: !logError,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[b2b-order-webhook] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});

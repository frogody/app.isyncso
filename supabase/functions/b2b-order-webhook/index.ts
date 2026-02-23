import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { encode as base64Encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

function orderConfirmedEmail(
  config: StoreConfig,
  order: Record<string, unknown>,
  items: Record<string, unknown>[],
): string {
  const orderNumber = (order.order_number as string) || `#${(order.id as string)?.slice(0, 8)}`;
  const poNumber = (order.po_number as string) || null;
  const paymentDays = (order.payment_terms_days as number) || 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentDays);
  const dueDateStr = formatDate(dueDate.toISOString());

  const subtotal = Number(order.subtotal || 0);
  const taxAmount = Number(order.tax_amount || 0);
  const discountAmount = Number(order.discount_amount || 0);
  const total = Number(order.total || 0);

  const itemsHtml = items.map((item) => `
    <tr>
      <td style="padding:8px 0;color:${config.textColor};font-size:14px;border-bottom:1px solid ${config.borderColor};">${item.product_name || item.name || "Item"}</td>
      <td style="padding:8px 0;color:${config.mutedColor};font-size:14px;text-align:center;border-bottom:1px solid ${config.borderColor};">${item.quantity || 1}</td>
      <td style="padding:8px 0;color:${config.mutedColor};font-size:14px;text-align:right;border-bottom:1px solid ${config.borderColor};">${formatCurrency(Number(item.unit_price || 0))}</td>
      <td style="padding:8px 0;color:${config.textColor};font-size:14px;text-align:right;border-bottom:1px solid ${config.borderColor};">${formatCurrency(Number(item.line_total || item.total || 0))}</td>
    </tr>`).join("");

  return emailWrapper(config, `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${config.textColor};">Order Confirmed</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${config.mutedColor};">Your order has been confirmed and an invoice has been generated. Please find the details below.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;background-color:${config.bgColor};border-radius:8px;">
          <p style="margin:0;font-size:12px;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;">Order Number</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${config.primaryColor};">${orderNumber}</p>
        </td>
        <td style="width:16px;"></td>
        <td style="padding:12px 16px;background-color:${config.bgColor};border-radius:8px;">
          <p style="margin:0;font-size:12px;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;">${poNumber ? 'PO Number' : 'Date'}</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${config.textColor};">${poNumber || formatDate(order.created_at as string)}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <th style="padding:8px 0;font-size:11px;font-weight:600;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid ${config.borderColor};">Item</th>
        <th style="padding:8px 0;font-size:11px;font-weight:600;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;text-align:center;border-bottom:1px solid ${config.borderColor};">Qty</th>
        <th style="padding:8px 0;font-size:11px;font-weight:600;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;text-align:right;border-bottom:1px solid ${config.borderColor};">Unit Price</th>
        <th style="padding:8px 0;font-size:11px;font-weight:600;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;text-align:right;border-bottom:1px solid ${config.borderColor};">Total</th>
      </tr>
      ${itemsHtml}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background-color:${config.bgColor};border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:16px 20px 12px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.08em;">Price Breakdown</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:${config.mutedColor};">${items.length} item${items.length !== 1 ? 's' : ''} &times; unit price</td>
              <td style="padding:6px 0;font-size:14px;color:${config.textColor};text-align:right;font-weight:500;">${formatCurrency(subtotal)}</td>
            </tr>
            ${discountAmount > 0 ? `<tr>
              <td style="padding:6px 0;font-size:14px;color:${config.mutedColor};">Wholesale discount (10%)</td>
              <td style="padding:6px 0;font-size:14px;color:#22c55e;text-align:right;font-weight:500;">&minus; ${formatCurrency(discountAmount)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:0;"><div style="height:1px;background:${config.borderColor};margin:4px 0;"></div></td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:${config.mutedColor};">After discount</td>
              <td style="padding:6px 0;font-size:14px;color:${config.textColor};text-align:right;font-weight:500;">${formatCurrency(subtotal - discountAmount)}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:6px 0;font-size:14px;color:${config.mutedColor};">VAT 21%</td>
              <td style="padding:6px 0;font-size:14px;color:${config.textColor};text-align:right;font-weight:500;">+ ${formatCurrency(taxAmount)}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 20px;background:linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.06) 100%);border-top:1px solid ${config.borderColor};">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:15px;font-weight:700;color:${config.textColor};">Total Due</td>
              <td style="font-size:20px;font-weight:700;color:${config.primaryColor};text-align:right;">${formatCurrency(total)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="padding:16px;background-color:${config.bgColor};border-radius:8px;">
          <p style="margin:0;font-size:12px;color:${config.mutedColor};text-transform:uppercase;letter-spacing:0.05em;">Payment Terms</p>
          <p style="margin:4px 0 0;font-size:14px;color:${config.textColor};">Net ${paymentDays} days &mdash; due by <strong>${dueDateStr}</strong></p>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:${config.mutedColor};">Thank you for your order. We will notify you when your order has been shipped.</p>
  `);
}

// ---------------------------------------------------------------------------
// PDF Invoice Generator — Premium Brand-Aware Design
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

async function generateInvoicePdf(invoice: any, company: any, storeConfig: StoreConfig): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Brand colors from platform settings ──
  const brandPrimary = hexToRgb(
    company?.invoice_branding?.color_override_primary || storeConfig.primaryColor || "#06b6d4"
  );
  const brandAccent = hexToRgb(
    company?.invoice_branding?.color_override_accent || storeConfig.primaryColor || "#06b6d4"
  );
  const primary = rgb(brandPrimary.r, brandPrimary.g, brandPrimary.b);
  const primaryLight = rgb(brandPrimary.r, brandPrimary.g, brandPrimary.b); // used with opacity via rectangles

  const nearBlack = rgb(0.08, 0.08, 0.1);
  const dark = rgb(0.15, 0.15, 0.18);
  const medGray = rgb(0.42, 0.42, 0.46);
  const lightGray = rgb(0.62, 0.62, 0.66);
  const veryLightBg = rgb(0.975, 0.975, 0.98);
  const tableBg = rgb(0.965, 0.968, 0.975);
  const lineColor = rgb(0.90, 0.90, 0.92);
  const white = rgb(1, 1, 1);

  const ML = 52; // left margin
  const MR = 52; // right margin
  const contentW = width - ML - MR;
  let y = height;

  // ── Drawing helpers ──
  const txt = (str: string, x: number, yp: number, opts: { font?: any; size?: number; color?: any; maxWidth?: number } = {}) => {
    let s = str || "";
    const f = opts.font || fontRegular;
    const sz = opts.size || 9.5;
    if (opts.maxWidth && f.widthOfTextAtSize(s, sz) > opts.maxWidth) {
      while (s.length > 3 && f.widthOfTextAtSize(s + "...", sz) > opts.maxWidth) s = s.slice(0, -1);
      s = s.trimEnd() + "...";
    }
    page.drawText(s, { x, y: yp, font: f, size: sz, color: opts.color || nearBlack });
  };

  const txtRight = (str: string, rightEdge: number, yp: number, opts: { font?: any; size?: number; color?: any } = {}) => {
    const f = opts.font || fontRegular;
    const sz = opts.size || 9.5;
    const w = f.widthOfTextAtSize(str || "", sz);
    txt(str, rightEdge - w, yp, opts);
  };

  const txtCenter = (str: string, centerX: number, yp: number, opts: { font?: any; size?: number; color?: any } = {}) => {
    const f = opts.font || fontRegular;
    const sz = opts.size || 9.5;
    const w = f.widthOfTextAtSize(str || "", sz);
    txt(str, centerX - w / 2, yp, opts);
  };

  const drawRect = (x: number, yp: number, w: number, h: number, color: any, borderRadius?: number) => {
    if (borderRadius) {
      // Simulate rounded rect with overlapping rectangles + circles
      const r = Math.min(borderRadius, h / 2, w / 2);
      page.drawRectangle({ x: x + r, y: yp, width: w - 2 * r, height: h, color });
      page.drawRectangle({ x, y: yp + r, width: w, height: h - 2 * r, color });
      page.drawCircle({ x: x + r, y: yp + r, size: r, color });
      page.drawCircle({ x: x + w - r, y: yp + r, size: r, color });
      page.drawCircle({ x: x + r, y: yp + h - r, size: r, color });
      page.drawCircle({ x: x + w - r, y: yp + h - r, size: r, color });
    } else {
      page.drawRectangle({ x, y: yp, width: w, height: h, color });
    }
  };

  const hLine = (yp: number, x1 = ML, x2 = width - MR, thickness = 0.5, color = lineColor) => {
    page.drawLine({ start: { x: x1, y: yp }, end: { x: x2, y: yp }, thickness, color });
  };

  const rightX = width - MR;
  const ib = company?.invoice_branding || {};
  const companyName = company?.name || storeConfig.storeName || "Wholesale Store";

  // ══════════════════════════════════════════════════════════════════════════
  // TOP ACCENT BAR — full-width brand color strip
  // ══════════════════════════════════════════════════════════════════════════
  drawRect(0, height - 6, width, 6, primary);

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER SECTION — Logo/Company left, INVOICE badge right
  // ══════════════════════════════════════════════════════════════════════════
  y = height - 52;

  // Try to embed company logo
  let logoEmbedded = false;
  const logoUrl = storeConfig.logoUrl || company?.logo_url;
  if (logoUrl) {
    try {
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
        const contentType = logoRes.headers.get("content-type") || "";
        let logoImage;
        if (contentType.includes("png") || logoUrl.toLowerCase().includes(".png")) {
          logoImage = await doc.embedPng(logoBytes);
        } else {
          logoImage = await doc.embedJpg(logoBytes);
        }
        const logoDims = logoImage.scale(1);
        const maxH = 36;
        const maxW = 140;
        const scale = Math.min(maxH / logoDims.height, maxW / logoDims.width, 1);
        page.drawImage(logoImage, {
          x: ML,
          y: y - logoDims.height * scale + 10,
          width: logoDims.width * scale,
          height: logoDims.height * scale,
        });
        logoEmbedded = true;
      }
    } catch (e) {
      console.warn("[PDF] Logo embed failed:", (e as Error).message);
    }
  }

  if (!logoEmbedded) {
    txt(companyName, ML, y, { font: fontBold, size: 20, color: nearBlack });
  }

  // INVOICE badge on top-right — rounded pill with brand color
  const badgeText = "INVOICE";
  const badgeW = 120;
  const badgeH = 32;
  const badgeX = rightX - badgeW;
  const badgeY = y - 8;
  drawRect(badgeX, badgeY, badgeW, badgeH, primary, 6);
  txtCenter(badgeText, badgeX + badgeW / 2, badgeY + 10, { font: fontBold, size: 14, color: white });

  // ── Company details row below logo ──
  y -= 30;
  const companyLine1: string[] = [];
  if (ib.company_address) companyLine1.push(ib.company_address);
  if (companyLine1.length) {
    txt(companyLine1.join(""), ML, y, { size: 8.5, color: medGray });
    y -= 13;
  }
  const companyLine2: string[] = [];
  if (ib.company_email) companyLine2.push(ib.company_email);
  if (ib.company_phone) companyLine2.push(ib.company_phone);
  if (ib.company_vat) companyLine2.push(`VAT ${ib.company_vat}`);
  if (companyLine2.length) {
    txt(companyLine2.join("   ·   "), ML, y, { size: 8, color: lightGray });
    y -= 10;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DIVIDER
  // ══════════════════════════════════════════════════════════════════════════
  y -= 12;
  hLine(y, ML, rightX, 1.2, primary);
  y -= 24;

  // ══════════════════════════════════════════════════════════════════════════
  // INFO CARDS — Two-column grid: Invoice Details (left) + Bill To (right)
  // ══════════════════════════════════════════════════════════════════════════
  const cardW = (contentW - 20) / 2;
  const cardH = 90;
  const cardLeftX = ML;
  const cardRightX = ML + cardW + 20;

  // Left card background
  drawRect(cardLeftX, y - cardH, cardW, cardH, veryLightBg, 8);
  // Right card background
  drawRect(cardRightX, y - cardH, cardW, cardH, veryLightBg, 8);

  // Left card — Invoice Details
  const cardPad = 14;
  let cy = y - cardPad;
  txt("INVOICE DETAILS", cardLeftX + cardPad, cy, { font: fontBold, size: 7.5, color: primary });
  cy -= 18;
  txt("Invoice No.", cardLeftX + cardPad, cy, { size: 7.5, color: lightGray });
  txt(invoice.invoice_number || "—", cardLeftX + cardPad + 70, cy, { font: fontBold, size: 9, color: nearBlack });
  cy -= 15;
  txt("Issue Date", cardLeftX + cardPad, cy, { size: 7.5, color: lightGray });
  txt(formatDate(invoice.created_at || new Date().toISOString()), cardLeftX + cardPad + 70, cy, { size: 9, color: nearBlack });
  cy -= 15;
  txt("Due Date", cardLeftX + cardPad, cy, { size: 7.5, color: lightGray });
  txt(formatDate(invoice.due_date), cardLeftX + cardPad + 70, cy, { font: fontBold, size: 9, color: nearBlack });
  cy -= 15;
  txt("Terms", cardLeftX + cardPad, cy, { size: 7.5, color: lightGray });
  txt(`Net ${invoice.payment_terms_days || 30} days`, cardLeftX + cardPad + 70, cy, { size: 9, color: nearBlack });

  // Right card — Bill To
  cy = y - cardPad;
  txt("BILL TO", cardRightX + cardPad, cy, { font: fontBold, size: 7.5, color: primary });
  cy -= 18;
  txt(invoice.client_name || "Client", cardRightX + cardPad, cy, { font: fontBold, size: 10.5, color: nearBlack });
  cy -= 15;
  if (invoice.client_email) {
    txt(invoice.client_email, cardRightX + cardPad, cy, { size: 9, color: medGray });
    cy -= 14;
  }
  if (invoice.client_address) {
    const addrStr = typeof invoice.client_address === "string"
      ? invoice.client_address
      : [invoice.client_address.street, invoice.client_address.city, invoice.client_address.postal_code, invoice.client_address.country]
          .filter(Boolean).join(", ");
    if (addrStr) {
      txt(addrStr, cardRightX + cardPad, cy, { size: 8.5, color: medGray, maxWidth: cardW - 2 * cardPad });
      cy -= 14;
    }
  }

  y -= cardH + 28;

  // ══════════════════════════════════════════════════════════════════════════
  // LINE ITEMS TABLE — Professional striped table
  // ══════════════════════════════════════════════════════════════════════════
  const colX = {
    item: ML + 12,
    qty: ML + contentW * 0.58,
    price: ML + contentW * 0.72,
    total: rightX - 12,
  };

  // Table header with brand-color background
  const headerH = 28;
  drawRect(ML, y - headerH, contentW, headerH, primary, 6);
  const headerY = y - headerH + 9;
  txt("DESCRIPTION", colX.item, headerY, { font: fontBold, size: 8, color: white });
  txtCenter("QTY", colX.qty, headerY, { font: fontBold, size: 8, color: white });
  txtCenter("UNIT PRICE", colX.price + 20, headerY, { font: fontBold, size: 8, color: white });
  txtRight("AMOUNT", colX.total, headerY, { font: fontBold, size: 8, color: white });
  y -= headerH;

  // Line items
  const lineItems = invoice.items || [];
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    const qty = item.quantity || 1;
    const unitPrice = Number(item.unit_price) || 0;
    const lineTotal = Number(item.total) || qty * unitPrice;
    const rowH = 30;

    // Alternating row background
    if (i % 2 === 0) {
      drawRect(ML, y - rowH, contentW, rowH, tableBg);
    }

    const rowY = y - rowH + 10;
    txt(item.name || "Product", colX.item, rowY, { size: 9.5, color: dark, maxWidth: contentW * 0.48 });
    txtCenter(String(qty), colX.qty, rowY, { size: 9.5, color: nearBlack });
    txtCenter(formatCurrency(unitPrice), colX.price + 20, rowY, { size: 9.5, color: medGray });
    txtRight(formatCurrency(lineTotal), colX.total, rowY, { font: fontBold, size: 9.5, color: nearBlack });

    y -= rowH;
  }

  // Bottom border of table
  hLine(y, ML, rightX, 0.5, lineColor);
  y -= 24;

  // ══════════════════════════════════════════════════════════════════════════
  // TOTALS SECTION — Right-aligned summary block
  // ══════════════════════════════════════════════════════════════════════════
  const subtotal = Number(invoice.subtotal) || 0;
  const discount = Number(invoice.discount_amount) || 0;
  const taxRate = Number(invoice.tax_rate) || 0;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const total = Number(invoice.total) || 0;

  const summaryW = 220;
  const summaryX = rightX - summaryW;
  const labelX = summaryX + 8;
  const valX = rightX - 8;

  // Summary rows
  txt("Subtotal", labelX, y, { size: 9.5, color: medGray });
  txtRight(formatCurrency(subtotal), valX, y, { size: 9.5, color: nearBlack });
  y -= 18;

  if (discount > 0) {
    txt("Discount", labelX, y, { size: 9.5, color: medGray });
    txtRight(`-${formatCurrency(discount)}`, valX, y, { size: 9.5, color: rgb(0.2, 0.75, 0.35) });
    y -= 18;
  }

  if (taxRate > 0) {
    txt(`VAT (${taxRate}%)`, labelX, y, { size: 9.5, color: medGray });
    txtRight(formatCurrency(taxAmount), valX, y, { size: 9.5, color: nearBlack });
    y -= 18;
  }

  // Divider above total
  y -= 4;
  hLine(y + 10, summaryX, rightX, 0.8, lineColor);
  y -= 6;

  // TOTAL — highlighted block with brand color
  const totalBlockH = 36;
  drawRect(summaryX, y - totalBlockH + 12, summaryW, totalBlockH, primary, 6);
  const totalY = y - totalBlockH + 22;
  txt("TOTAL DUE", labelX, totalY, { font: fontBold, size: 10, color: white });
  txtRight(formatCurrency(total), valX, totalY, { font: fontBold, size: 14, color: white });

  y -= totalBlockH + 20;

  // ══════════════════════════════════════════════════════════════════════════
  // PAYMENT INFO — Bank details in a styled card
  // ══════════════════════════════════════════════════════════════════════════
  if (ib.show_bank_details && (ib.iban || ib.bank_name)) {
    const bankCardH = 68;
    drawRect(ML, y - bankCardH, contentW, bankCardH, veryLightBg, 8);

    // Accent left border (4px wide strip)
    drawRect(ML, y - bankCardH, 4, bankCardH, primary, 2);

    const bankPad = 18;
    let by = y - 14;
    txt("PAYMENT INFORMATION", ML + bankPad, by, { font: fontBold, size: 7.5, color: primary });
    by -= 18;

    const col1 = ML + bankPad;
    const col2 = ML + bankPad + 180;

    if (ib.bank_name) {
      txt("Bank", col1, by, { size: 7.5, color: lightGray });
      txt(ib.bank_name, col1 + 45, by, { size: 9, color: nearBlack });
    }
    if (ib.bic) {
      txt("BIC/SWIFT", col2, by, { size: 7.5, color: lightGray });
      txt(ib.bic || "—", col2 + 60, by, { size: 9, color: nearBlack });
    }
    by -= 16;
    if (ib.iban) {
      txt("IBAN", col1, by, { size: 7.5, color: lightGray });
      txt(ib.iban, col1 + 45, by, { font: fontBold, size: 9.5, color: nearBlack });
    }

    y -= bankCardH + 16;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NOTES
  // ══════════════════════════════════════════════════════════════════════════
  if (invoice.notes) {
    txt("NOTES", ML, y, { font: fontBold, size: 7.5, color: lightGray });
    y -= 14;
    txt(invoice.notes, ML, y, { size: 8.5, color: medGray, maxWidth: contentW });
    y -= 20;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER — Centered thank-you + brand accent bar
  // ══════════════════════════════════════════════════════════════════════════
  const footerText = ib.footer_text || "Thank you for your business!";
  const footerY = 52;

  // Thin accent line above footer
  hLine(footerY + 20, ML, rightX, 0.5, lineColor);

  txtCenter(footerText, width / 2, footerY, { font: fontBold, size: 9, color: medGray });
  txtCenter(`${companyName}  ·  ${ib.company_email || ""}  ·  ${ib.company_phone || ""}`, width / 2, footerY - 14, { size: 7.5, color: lightGray });

  // Bottom accent bar
  drawRect(0, 0, width, 4, primary);

  return await doc.save();
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
      .eq("b2b_order_id", orderId);

    // Fetch client email (use order's client_id if available, fall back to org)
    const clientQuery = supabase
      .from("portal_clients")
      .select("email, full_name, company_name");

    if (order.client_id) {
      clientQuery.eq("id", order.client_id);
    } else {
      clientQuery.eq("organization_id", organizationId);
    }

    const { data: client } = await clientQuery.limit(1).single();

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
      case "order_confirmed":
        subject = `Order Confirmed — Invoice for ${order.order_number || orderId.slice(0, 8)}`;
        emailHtml = orderConfirmedEmail(storeConfig, order, items || []);
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

    // Log notification - wrapped in try/catch since table may not exist yet
    let notificationLogged = false;
    try {
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
        console.warn("[b2b-order-webhook] Notification table not available, skipping log:", logError.message);
      } else {
        notificationLogged = true;
      }
    } catch (notifErr) {
      console.warn("[b2b-order-webhook] Could not log notification:", (notifErr as Error).message);
    }

    // Generate PDF invoice attachment for order_confirmed
    let pdfAttachment: { filename: string; content: string } | null = null;
    if (event === "order_confirmed") {
      try {
        // Fetch the invoice created for this order
        const { data: invoice } = await supabase
          .from("invoices")
          .select("*")
          .eq("b2b_order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (invoice) {
          // Fetch company info for PDF header
          const { data: company } = await supabase
            .from("companies")
            .select("*")
            .eq("organization_id", organizationId)
            .limit(1)
            .maybeSingle();

          const pdfBytes = await generateInvoicePdf(invoice, company, storeConfig);
          const pdfBase64 = base64Encode(pdfBytes);
          const invoiceNum = invoice.invoice_number || "invoice";
          pdfAttachment = {
            filename: `${invoiceNum}.pdf`,
            content: pdfBase64,
          };
          console.log("[b2b-order-webhook] PDF generated:", invoiceNum, pdfBytes.length, "bytes");
        } else {
          console.warn("[b2b-order-webhook] No invoice found for order", orderId);
        }
      } catch (pdfErr) {
        console.error("[b2b-order-webhook] PDF generation failed:", (pdfErr as Error).message);
      }
    }

    // Send email via Resend
    let emailSent = false;
    if (!RESEND_API_KEY) {
      console.warn("[b2b-order-webhook] RESEND_API_KEY not set, skipping email send");
    } else {
      try {
        const fromName = storeConfig.storeName || "Wholesale Store";
        const emailPayload: any = {
          from: `${fromName} <noreply@notifications.isyncso.com>`,
          to: [client.email],
          subject,
          html: emailWrapper(storeConfig, emailHtml),
        };

        if (pdfAttachment) {
          emailPayload.attachments = [pdfAttachment];
        }

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          console.error("[b2b-order-webhook] Resend API error:", resendRes.status, errBody);
        } else {
          emailSent = true;
          console.log("[b2b-order-webhook] Email sent to", client.email, "for event", event, pdfAttachment ? "(with PDF)" : "");
        }
      } catch (emailErr) {
        console.error("[b2b-order-webhook] Email send failed:", (emailErr as Error).message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        event,
        orderId,
        recipientEmail: client.email,
        subject,
        notificationLogged,
        emailSent,
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

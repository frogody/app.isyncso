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
// PDF Invoice Generator
// ---------------------------------------------------------------------------

async function generateInvoicePdf(invoice: any, company: any, storeConfig: StoreConfig): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);
  const darkGray = rgb(0.25, 0.25, 0.25);
  const accent = rgb(0.024, 0.714, 0.831); // cyan-500
  const lightBg = rgb(0.96, 0.96, 0.97);
  const lineColor = rgb(0.88, 0.88, 0.9);

  const margin = 50;
  let y = height - margin;

  // Helper: draw text
  const text = (str: string, x: number, yp: number, opts: { font?: any; size?: number; color?: any } = {}) => {
    page.drawText(str || "", {
      x,
      y: yp,
      font: opts.font || fontRegular,
      size: opts.size || 10,
      color: opts.color || black,
    });
  };

  // Helper: right-aligned text
  const textRight = (str: string, yp: number, opts: { font?: any; size?: number; color?: any } = {}) => {
    const f = opts.font || fontRegular;
    const s = opts.size || 10;
    const w = f.widthOfTextAtSize(str || "", s);
    text(str, width - margin - w, yp, opts);
  };

  // Helper: horizontal line
  const hline = (yp: number) => {
    page.drawLine({
      start: { x: margin, y: yp },
      end: { x: width - margin, y: yp },
      thickness: 0.5,
      color: lineColor,
    });
  };

  // ── Company header ──
  const companyName = company?.name || storeConfig.storeName || "Wholesale Store";
  text(companyName, margin, y, { font: fontBold, size: 18, color: black });
  y -= 18;

  if (company?.invoice_branding?.company_address) {
    text(company.invoice_branding.company_address, margin, y, { size: 9, color: gray });
    y -= 13;
  }
  const contactParts: string[] = [];
  if (company?.invoice_branding?.company_email) contactParts.push(company.invoice_branding.company_email);
  if (company?.invoice_branding?.company_phone) contactParts.push(company.invoice_branding.company_phone);
  if (contactParts.length) {
    text(contactParts.join("  |  "), margin, y, { size: 9, color: gray });
    y -= 13;
  }
  if (company?.invoice_branding?.company_vat) {
    text(`VAT: ${company.invoice_branding.company_vat}`, margin, y, { size: 9, color: gray });
    y -= 13;
  }

  // ── INVOICE title ──
  y -= 10;
  textRight("INVOICE", y + 12, { font: fontBold, size: 24, color: accent });
  y -= 30;
  hline(y);
  y -= 20;

  // ── Invoice details (left) + Bill To (right) ──
  const detailsX = margin;
  const billToX = width / 2 + 20;

  text("Invoice Number", detailsX, y, { font: fontBold, size: 8, color: gray });
  text(invoice.invoice_number || "—", detailsX, y - 14, { font: fontBold, size: 11, color: black });

  text("Bill To", billToX, y, { font: fontBold, size: 8, color: gray });
  text(invoice.client_name || "Client", billToX, y - 14, { font: fontBold, size: 11, color: black });

  y -= 32;

  text("Invoice Date", detailsX, y, { font: fontBold, size: 8, color: gray });
  text(formatDate(invoice.created_at || new Date().toISOString()), detailsX, y - 14, { size: 10 });

  if (invoice.client_email) {
    text(invoice.client_email, billToX, y, { size: 9, color: gray });
  }

  y -= 32;

  text("Due Date", detailsX, y, { font: fontBold, size: 8, color: gray });
  text(formatDate(invoice.due_date), detailsX, y - 14, { size: 10 });

  text("Payment Terms", billToX, y, { font: fontBold, size: 8, color: gray });
  text(`Net ${invoice.payment_terms_days || 30} days`, billToX, y - 14, { size: 10 });

  y -= 40;
  hline(y);
  y -= 8;

  // ── Line items table header ──
  const colProduct = margin;
  const colQty = 340;
  const colPrice = 410;
  const colTotal = width - margin;

  // Header background
  page.drawRectangle({ x: margin - 5, y: y - 4, width: width - 2 * margin + 10, height: 18, color: lightBg });

  text("ITEM", colProduct, y, { font: fontBold, size: 8, color: gray });
  text("QTY", colQty, y, { font: fontBold, size: 8, color: gray });
  text("UNIT PRICE", colPrice, y, { font: fontBold, size: 8, color: gray });
  textRight("TOTAL", y, { font: fontBold, size: 8, color: gray });

  y -= 20;

  // ── Line items ──
  const lineItems = invoice.items || [];
  for (const item of lineItems) {
    const qty = item.quantity || 1;
    const unitPrice = Number(item.unit_price) || 0;
    const lineTotal = Number(item.total) || qty * unitPrice;

    // Truncate long product names
    let productName = item.name || "Product";
    if (productName.length > 45) productName = productName.substring(0, 42) + "...";

    text(productName, colProduct, y, { size: 10, color: darkGray });
    text(String(qty), colQty, y, { size: 10 });
    text(formatCurrency(unitPrice), colPrice, y, { size: 10 });
    textRight(formatCurrency(lineTotal), y, { size: 10 });

    y -= 18;
    hline(y + 6);
  }

  y -= 10;

  // ── Summary ──
  const summaryX = colPrice;
  const subtotal = Number(invoice.subtotal) || 0;
  const discount = Number(invoice.discount_amount) || 0;
  const taxRate = Number(invoice.tax_rate) || 0;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const total = Number(invoice.total) || 0;

  text("Subtotal", summaryX, y, { size: 10, color: gray });
  textRight(formatCurrency(subtotal), y, { size: 10 });
  y -= 18;

  if (discount > 0) {
    text("Discount", summaryX, y, { size: 10, color: gray });
    textRight(`-${formatCurrency(discount)}`, y, { size: 10, color: rgb(0.9, 0.2, 0.2) });
    y -= 18;
  }

  if (taxRate > 0) {
    text(`Tax (${taxRate}%)`, summaryX, y, { size: 10, color: gray });
    textRight(formatCurrency(taxAmount), y, { size: 10 });
    y -= 18;
  }

  y -= 4;
  hline(y + 10);
  y -= 8;

  // Total row - bold + accent
  page.drawRectangle({ x: summaryX - 10, y: y - 6, width: width - margin - summaryX + 10, height: 24, color: rgb(0.024, 0.714, 0.831, 0.08) });
  text("Total", summaryX, y, { font: fontBold, size: 12, color: black });
  textRight(formatCurrency(total), y, { font: fontBold, size: 14, color: accent });

  y -= 40;

  // ── Bank details ──
  if (company?.invoice_branding?.show_bank_details) {
    const ib = company.invoice_branding;
    hline(y + 10);
    y -= 10;
    text("BANK DETAILS", margin, y, { font: fontBold, size: 8, color: gray });
    y -= 16;
    if (ib.bank_name) { text(`Bank: ${ib.bank_name}`, margin, y, { size: 9, color: darkGray }); y -= 13; }
    if (ib.iban) { text(`IBAN: ${ib.iban}`, margin, y, { size: 9, color: darkGray }); y -= 13; }
    if (ib.bic) { text(`BIC: ${ib.bic}`, margin, y, { size: 9, color: darkGray }); y -= 13; }
    y -= 10;
  }

  // ── Footer note ──
  if (company?.invoice_branding?.footer_text) {
    text(company.invoice_branding.footer_text, margin, y, { size: 9, color: gray });
    y -= 16;
  }
  if (invoice.notes) {
    text(invoice.notes, margin, y, { size: 8, color: gray });
  }

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

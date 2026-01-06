import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceEmailPayload {
  to: string;
  clientName?: string;
  invoiceNumber: string;
  invoiceId: string;
  senderName?: string;
  senderCompany?: string;
  total: number;
  currency?: string;
  dueDate?: string;
  description?: string;
  items?: Array<{
    name?: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
  }>;
}

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Resend API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: InvoiceEmailPayload = await req.json();
    const {
      to,
      clientName,
      invoiceNumber,
      invoiceId,
      senderName,
      senderCompany,
      total,
      currency = 'EUR',
      dueDate,
      description,
      items = []
    } = payload;

    if (!to || !invoiceNumber || !invoiceId) {
      return new Response(
        JSON.stringify({ error: "Required fields: to, invoiceNumber, invoiceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invoice view URL
    const invoiceUrl = `https://app.isyncso.com/FinanceInvoices?view=${invoiceId}`;
    const formattedTotal = formatCurrency(total, currency);
    const formattedDueDate = dueDate ? formatDate(dueDate) : null;

    // Generate line items HTML
    let itemsHtml = '';
    if (items.length > 0) {
      const itemRows = items.map(item => {
        const qty = item.quantity || 1;
        const price = item.unit_price || 0;
        const lineTotal = qty * price;
        return `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #ffffff; font-size: 14px;">
              ${item.name || item.description || 'Item'}
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 14px; text-align: center;">
              ${qty}
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #27272a; color: #ffffff; font-size: 14px; text-align: right;">
              ${formatCurrency(lineTotal, currency)}
            </td>
          </tr>
        `;
      }).join('');

      itemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr>
              <th style="padding: 12px 0; border-bottom: 1px solid #3f3f46; color: #71717a; font-size: 12px; text-align: left; font-weight: 600;">DESCRIPTION</th>
              <th style="padding: 12px 0; border-bottom: 1px solid #3f3f46; color: #71717a; font-size: 12px; text-align: center; font-weight: 600;">QTY</th>
              <th style="padding: 12px 0; border-bottom: 1px solid #3f3f46; color: #71717a; font-size: 12px; text-align: right; font-weight: 600;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      `;
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ebfb48566133bc1cface8c/3bee25c45_logoisyncso1.png" alt="iSyncSO" style="height: 50px; width: auto;">
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td style="background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; border: 1px solid #27272a; padding: 40px;">

              <!-- Header -->
              <table style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px; color: #f59e0b; font-size: 12px; font-weight: 600; letter-spacing: 1px;">INVOICE</p>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                      ${invoiceNumber}
                    </h1>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0; color: #22d3ee; font-size: 28px; font-weight: 700;">
                      ${formattedTotal}
                    </p>
                    ${formattedDueDate ? `
                    <p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">
                      Due: ${formattedDueDate}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Hi${clientName ? ` ${clientName}` : ''},
              </p>

              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                ${senderName ? `${senderName} from ` : ''}${senderCompany || 'We'} sent you an invoice${description ? ` for ${description}` : ''}.
              </p>

              ${itemsHtml}

              <!-- Total Box -->
              <div style="background: #18181b; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #a1a1aa; font-size: 14px;">Total Amount Due</td>
                    <td style="text-align: right; color: #22d3ee; font-size: 24px; font-weight: 700;">${formattedTotal}</td>
                  </tr>
                  ${formattedDueDate ? `
                  <tr>
                    <td style="color: #71717a; font-size: 13px; padding-top: 8px;">Payment Due Date</td>
                    <td style="text-align: right; color: #ffffff; font-size: 14px; padding-top: 8px;">${formattedDueDate}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${invoiceUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      View Invoice
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #52525b; font-size: 12px; text-align: center;">
                Or copy this link: <br>
                <a href="${invoiceUrl}" style="color: #22d3ee; word-break: break-all;">${invoiceUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <p style="margin: 0; color: #52525b; font-size: 12px;">
                This invoice was sent via iSyncSO${senderCompany ? ` on behalf of ${senderCompany}` : ''}.
              </p>
              <p style="margin: 10px 0 0; color: #3f3f46; font-size: 11px;">
                &copy; ${new Date().getFullYear()} iSyncSO. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${senderCompany || 'iSyncSO'} <noreply@notifications.isyncso.com>`,
        to: [to],
        subject: `Invoice ${invoiceNumber}${senderCompany ? ` from ${senderCompany}` : ''} - ${formattedTotal}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

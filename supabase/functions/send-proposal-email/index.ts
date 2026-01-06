import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProposalEmailPayload {
  to: string;
  clientName?: string;
  proposalTitle: string;
  proposalId: string;
  senderName?: string;
  senderCompany?: string;
  total?: number;
  currency?: string;
  validUntil?: string;
  introduction?: string;
}

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
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

    const payload: ProposalEmailPayload = await req.json();
    const {
      to,
      clientName,
      proposalTitle,
      proposalId,
      senderName,
      senderCompany,
      total,
      currency = 'EUR',
      validUntil,
      introduction
    } = payload;

    if (!to || !proposalTitle || !proposalId) {
      return new Response(
        JSON.stringify({ error: "Required fields: to, proposalTitle, proposalId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate proposal view URL (can be customized for public proposal viewing)
    const proposalUrl = `https://app.isyncso.com/FinanceProposalBuilder?id=${proposalId}`;
    const formattedTotal = total ? formatCurrency(total, currency) : null;
    const formattedDate = validUntil ? new Date(validUntil).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : null;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Proposal: ${proposalTitle}</title>
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
              <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600; text-align: center;">
                New Proposal
              </h1>

              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                Hi${clientName ? ` ${clientName}` : ''},
              </p>

              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                ${senderName ? `${senderName} from ` : ''}${senderCompany || 'We'} sent you a proposal:
              </p>

              <div style="background: #18181b; border-radius: 12px; padding: 24px; margin: 20px 0;">
                <h2 style="margin: 0 0 16px; color: #22d3ee; font-size: 20px; font-weight: 600;">
                  ${proposalTitle}
                </h2>

                ${introduction ? `
                <p style="margin: 0 0 16px; color: #71717a; font-size: 14px; line-height: 1.6;">
                  ${introduction.substring(0, 200)}${introduction.length > 200 ? '...' : ''}
                </p>
                ` : ''}

                <table style="width: 100%; border-collapse: collapse;">
                  ${formattedTotal ? `
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Total Amount</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 16px; font-weight: 600; text-align: right;">${formattedTotal}</td>
                  </tr>
                  ` : ''}
                  ${formattedDate ? `
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Valid Until</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${formattedDate}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${proposalUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      View Proposal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #52525b; font-size: 12px; text-align: center;">
                Or copy this link: <br>
                <a href="${proposalUrl}" style="color: #22d3ee; word-break: break-all;">${proposalUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <p style="margin: 0; color: #52525b; font-size: 12px;">
                This proposal was sent via iSyncSO.
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
        subject: `Proposal: ${proposalTitle}${senderCompany ? ` from ${senderCompany}` : ''}`,
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

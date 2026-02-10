import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LicenseEmailPayload {
  emails: string[];
  appName: string;
  companyName: string;
  grantedBy?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: LicenseEmailPayload = await req.json();
    const { emails, appName, companyName, grantedBy } = payload;

    if (!emails?.length || !appName) {
      return new Response(
        JSON.stringify({ error: "emails and appName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dashboardUrl = "https://app.isyncso.com/dashboard";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New App Access on iSyncSO</title>
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
                New App Access Granted
              </h1>

              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                Great news! Your organization <strong style="color: #22d3ee;">${companyName}</strong>
                has been granted access to <strong style="color: #22d3ee;">${appName}</strong>.
              </p>

              <p style="margin: 0 0 30px; color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
                You can now access all ${appName} features from your dashboard.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Open ${appName}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              ${grantedBy ? `<p style="margin: 0; color: #52525b; font-size: 12px;">Granted by ${grantedBy}</p>` : ""}
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

    const results = [];
    for (const email of emails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "iSyncSO <noreply@notifications.isyncso.com>",
            to: [email],
            subject: `You now have access to ${appName} on iSyncSO`,
            html: emailHtml,
          }),
        });

        const data = await res.json();
        results.push({ email, success: res.ok, messageId: data.id || null });
      } catch (err) {
        results.push({ email, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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

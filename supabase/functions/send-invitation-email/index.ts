import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationPayload {
  email: string;
  inviterName?: string;
  inviterEmail?: string;
  companyName?: string;
  role?: string;
  inviteToken: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: InvitationPayload = await req.json();
    const { email, inviterName, inviterEmail, companyName, role, inviteToken } = payload;

    if (!email || !inviteToken) {
      return new Response(
        JSON.stringify({ error: "Email and inviteToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviteUrl = `https://app.isyncso.com/CompanyInvite?token=${inviteToken}`;
    const displayRole = role?.replace("_", " ") || "team member";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to iSyncSO</title>
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
                You're Invited!
              </h1>

              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                ${inviterName || "Someone"} has invited you to join
                <strong style="color: #22d3ee;">${companyName || "their organization"}</strong>
                on iSyncSO as a <strong style="color: #22d3ee;">${displayRole}</strong>.
              </p>

              <p style="margin: 0 0 30px; color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
                iSyncSO is an AI-powered platform for learning, growth, and team collaboration.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #52525b; font-size: 12px; text-align: center;">
                Or copy this link: <br>
                <a href="${inviteUrl}" style="color: #22d3ee; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <p style="margin: 0; color: #52525b; font-size: 12px;">
                This invitation was sent by ${inviterEmail || "a team member"}.
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
        from: "iSyncSO <noreply@notifications.isyncso.com>",
        to: [email],
        subject: `${inviterName || "Someone"} invited you to join ${companyName || "iSyncSO"}`,
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

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OTP_EXPIRY_MINUTES = 10;

// ---------------------------------------------------------------------------
// Store config & email template (reused from b2b-order-webhook)
// ---------------------------------------------------------------------------

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

function otpEmailBody(config: StoreConfig, code: string): string {
  const digitBoxes = code
    .split("")
    .map(
      (d) =>
        `<td style="width:44px;height:52px;text-align:center;vertical-align:middle;background-color:${config.bgColor};border:2px solid ${config.borderColor};border-radius:8px;font-size:28px;font-weight:700;color:${config.primaryColor};font-family:'Courier New',monospace;">${d}</td>`
    )
    .join(`<td style="width:8px;"></td>`);

  return emailWrapper(
    config,
    `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${config.textColor};">Verify Your Order</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${config.mutedColor};">Enter this code to confirm your wholesale order.</p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 24px;">
      <tr>${digitBoxes}</tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:${config.mutedColor};">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
    <p style="margin:0;font-size:13px;color:${config.mutedColor};">If you did not request this code, please ignore this email.</p>
  `
  );
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOTP(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
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
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, email, organizationId, code } = await req.json();

    if (!action || !email || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, email, organizationId" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // -----------------------------------------------------------------------
    // ACTION: send
    // -----------------------------------------------------------------------
    if (action === "send") {
      // 1. Invalidate previous OTPs for this email+org
      await supabase
        .from("b2b_checkout_otp")
        .update({ expires_at: new Date().toISOString() })
        .eq("email", email.toLowerCase())
        .eq("organization_id", organizationId)
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString());

      // 2. Generate code + hash
      const otp = generateOTP();
      const hash = await hashCode(otp);
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      // 3. Store in DB
      const { error: insertErr } = await supabase.from("b2b_checkout_otp").insert({
        email: email.toLowerCase(),
        organization_id: organizationId,
        code_hash: hash,
        expires_at: expiresAt,
      });

      if (insertErr) {
        console.error("[b2b-checkout-otp] Insert failed:", insertErr.message);
        return new Response(
          JSON.stringify({ error: "Failed to create verification code" }),
          { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // 4. Fetch store branding
      let storeConfig = getDefaultConfig();
      const { data: portalSettings } = await supabase
        .from("portal_settings")
        .select("store_config")
        .eq("organization_id", organizationId)
        .single();

      if (portalSettings?.store_config) {
        const sc = portalSettings.store_config as Record<string, unknown>;
        const theme = (sc.theme || {}) as Record<string, string>;
        const company = (sc.company || {}) as Record<string, string>;
        storeConfig = {
          storeName: company?.name || (sc.name as string) || storeConfig.storeName,
          primaryColor: theme.primaryColor || storeConfig.primaryColor,
          logoUrl: company?.logo || (sc.logo as string) || "",
          bgColor: theme.backgroundColor || storeConfig.bgColor,
          textColor: theme.textColor || storeConfig.textColor,
          mutedColor: theme.mutedTextColor || storeConfig.mutedColor,
          surfaceColor: theme.surfaceColor || storeConfig.surfaceColor,
          borderColor: theme.borderColor || storeConfig.borderColor,
        };
      }

      // 5. Build + send email via Resend
      const emailHtml = otpEmailBody(storeConfig, otp);
      const subject = `${storeConfig.storeName} — Your verification code: ${otp}`;

      if (!RESEND_API_KEY) {
        console.warn("[b2b-checkout-otp] RESEND_API_KEY not set, skipping email send");
        return new Response(
          JSON.stringify({ success: true, expiresAt, warning: "Email send skipped (no API key)" }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${storeConfig.storeName} <noreply@notifications.isyncso.com>`,
          to: [email.toLowerCase()],
          subject,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error("[b2b-checkout-otp] Resend error:", emailRes.status, errBody);
        return new Response(
          JSON.stringify({ error: "Failed to send verification email" }),
          { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, expiresAt }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // ACTION: verify
    // -----------------------------------------------------------------------
    if (action === "verify") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing required field: code" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Find most recent unexpired, unverified OTP
      const { data: otpRow, error: fetchErr } = await supabase
        .from("b2b_checkout_otp")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("organization_id", organizationId)
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchErr || !otpRow) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "no_active_otp",
            message: "No active verification code. Please request a new one.",
          }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Check attempts
      if (otpRow.attempts >= otpRow.max_attempts) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "max_attempts",
            message: "Too many attempts. Please request a new code.",
            attemptsRemaining: 0,
          }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Compare hash
      const submittedHash = await hashCode(code);

      if (submittedHash === otpRow.code_hash) {
        // Correct — mark verified
        await supabase
          .from("b2b_checkout_otp")
          .update({ verified_at: new Date().toISOString() })
          .eq("id", otpRow.id);

        return new Response(
          JSON.stringify({ success: true, verified: true }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Wrong code — increment attempts
      const newAttempts = (otpRow.attempts || 0) + 1;
      await supabase
        .from("b2b_checkout_otp")
        .update({ attempts: newAttempts })
        .eq("id", otpRow.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_code",
          message: `Incorrect code. ${otpRow.max_attempts - newAttempts} attempt${otpRow.max_attempts - newAttempts !== 1 ? "s" : ""} remaining.`,
          attemptsRemaining: otpRow.max_attempts - newAttempts,
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[b2b-checkout-otp] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

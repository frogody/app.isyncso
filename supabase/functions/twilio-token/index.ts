// Supabase Edge Function: twilio-token
// Generates Twilio Access Tokens for browser-based voice calling via @twilio/voice-sdk

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function textToBase64url(text: string): string {
  return base64url(new TextEncoder().encode(text));
}

async function signHS256(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64url(new Uint8Array(signature));
}

async function createTwilioAccessToken(
  accountSid: string,
  apiKeySid: string,
  apiKeySecret: string,
  twimlAppSid: string,
  identity: string,
  ttl: number = 3600
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    typ: "JWT",
    alg: "HS256",
    cty: "twilio-fpa;v=1",
  };

  const payload = {
    jti: `${apiKeySid}-${now}`,
    iss: apiKeySid,
    sub: accountSid,
    exp: now + ttl,
    grants: {
      identity,
      voice: {
        outgoing: { application_sid: twimlAppSid },
        incoming: { allow: true },
      },
    },
  };

  const headerB64 = textToBase64url(JSON.stringify(header));
  const payloadB64 = textToBase64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = await signHS256(signingInput, apiKeySecret);

  return `${signingInput}.${signature}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ACCOUNT_SID = Deno.env.get("TWILIO_MASTER_ACCOUNT_SID");
    const API_KEY_SID = Deno.env.get("TWILIO_API_KEY_SID");
    const API_KEY_SECRET = Deno.env.get("TWILIO_API_KEY_SECRET");
    const TWIML_APP_SID = Deno.env.get("TWILIO_TWIML_APP_SID");

    if (!ACCOUNT_SID || !API_KEY_SID || !API_KEY_SECRET || !TWIML_APP_SID) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Voice calling not configured. Run setup-voice first.",
          missing: {
            TWILIO_MASTER_ACCOUNT_SID: !ACCOUNT_SID,
            TWILIO_API_KEY_SID: !API_KEY_SID,
            TWILIO_API_KEY_SECRET: !API_KEY_SECRET,
            TWILIO_TWIML_APP_SID: !TWIML_APP_SID,
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const identity = `user_${user_id}`;
    const ttl = 3600;

    const token = await createTwilioAccessToken(
      ACCOUNT_SID,
      API_KEY_SID,
      API_KEY_SECRET,
      TWIML_APP_SID,
      identity,
      ttl
    );

    return new Response(
      JSON.stringify({ success: true, token, identity, ttl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Token generation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

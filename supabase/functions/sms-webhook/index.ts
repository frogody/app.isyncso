// Supabase Edge Function: sms-webhook
// Handles Twilio inbound SMS and delivery status webhooks

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Twilio Signature Validation ──────────────────────────────────────────────

async function validateTwilioSignature(
  req: Request,
  params: Record<string, string>,
): Promise<boolean> {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") || Deno.env.get("TWILIO_MASTER_AUTH_TOKEN");
  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is not configured");
  }

  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature) {
    console.error("[sms-webhook] Missing X-Twilio-Signature header");
    return false;
  }

  // Build the validation string: full URL + sorted POST params appended
  const url = req.url;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // HMAC-SHA1 with auth token
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Constant-time comparison
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

// Opt-out keywords (TCPA compliance)
const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    // ── Twilio signature validation (fail closed) ──────────────────────
    try {
      const isValid = await validateTwilioSignature(req, payload);
      if (!isValid) {
        console.error("[sms-webhook] Invalid Twilio signature — rejecting request");
        return new Response("Forbidden", { status: 403 });
      }
    } catch (err) {
      // Auth token not configured — fail closed
      console.error("[sms-webhook] Signature validation error:", err);
      return new Response("Server configuration error", { status: 500 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Twilio webhook received:", JSON.stringify(payload, null, 2));

    const messageSid = payload.MessageSid || payload.SmsSid;
    const messageStatus = payload.MessageStatus || payload.SmsStatus;
    const from = payload.From;
    const to = payload.To;
    const body = payload.Body;

    // Handle delivery status updates
    if (messageStatus && !body) {
      // Find conversation by Twilio SID
      const { data: conversation } = await supabase
        .from("sms_conversations")
        .select("id, status")
        .eq("twilio_conversation_sid", messageSid)
        .single();

      if (conversation) {
        let newStatus = conversation.status;

        if (messageStatus === "delivered") {
          newStatus = "delivered";
        } else if (["failed", "undelivered"].includes(messageStatus)) {
          // Keep as sent but log error
          console.error(`Message ${messageSid} failed: ${messageStatus}`);
        }

        await supabase
          .from("sms_conversations")
          .update({ status: newStatus })
          .eq("id", conversation.id);
      }

      return new Response("OK", { status: 200 });
    }

    // Handle inbound message
    if (body && from) {
      // Find existing conversation by phone number
      const { data: conversation, error: convError } = await supabase
        .from("sms_conversations")
        .select("*")
        .eq("phone_number", from)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (convError || !conversation) {
        console.log("No existing conversation found for:", from);
        return new Response("OK", { status: 200 });
      }

      // Check for opt-out
      const upperBody = body.toUpperCase().trim();
      const isOptOut = OPT_OUT_KEYWORDS.some(keyword => upperBody === keyword);

      if (isOptOut) {
        // Handle opt-out immediately
        await supabase
          .from("sms_conversations")
          .update({
            status: "opted_out",
            opted_out: true,
            opted_out_at: new Date().toISOString(),
            messages: [
              ...(conversation.messages || []),
              {
                role: "candidate",
                content: body,
                timestamp: new Date().toISOString(),
                sid: messageSid,
              },
            ],
          })
          .eq("id", conversation.id);

        // Update candidate record
        await supabase
          .from("candidates")
          .update({ sms_opt_out: true, sms_opt_out_at: new Date().toISOString() })
          .eq("id", conversation.candidate_id);

        console.log(`Opt-out processed for ${from}`);
        return new Response("OK", { status: 200 });
      }

      // Append message to conversation
      const updatedMessages = [
        ...(conversation.messages || []),
        {
          role: "candidate",
          content: body,
          timestamp: new Date().toISOString(),
          sid: messageSid,
        },
      ];

      // Analyze response sentiment
      let newStatus = "responded";
      const lowerBody = body.toLowerCase();

      if (lowerBody.includes("interested") || lowerBody.includes("tell me more") ||
          lowerBody.includes("yes") || lowerBody.includes("sure") ||
          lowerBody.includes("sounds good") || lowerBody.includes("let's talk")) {
        newStatus = "interested";
      } else if (lowerBody.includes("not interested") || lowerBody.includes("no thanks") ||
                 lowerBody.includes("not looking") || lowerBody.includes("pass")) {
        newStatus = "declined";
      } else if (lowerBody.includes("call") || lowerBody.includes("schedule") ||
                 lowerBody.includes("meeting") || lowerBody.includes("available")) {
        newStatus = "scheduled";
      }

      await supabase
        .from("sms_conversations")
        .update({
          status: newStatus,
          messages: updatedMessages,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);

      // Trigger AI response generation (async)
      const aiResponseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-ai-respond`;
      fetch(aiResponseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          conversation_id: conversation.id,
          inbound_message: body,
          candidate_id: conversation.candidate_id,
          organization_id: conversation.organization_id,
        }),
      }).catch(err => console.error("Failed to trigger AI response:", err));

      console.log(`Inbound message processed for conversation ${conversation.id}, status: ${newStatus}`);
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
});

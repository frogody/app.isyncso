// Supabase Edge Function: sms-send
// Sends SMS messages via Twilio
// Supports both iSyncSO-managed numbers and user's own Twilio accounts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSSendRequest {
  conversation_id?: string;
  candidate_id: string;
  organization_id: string;
  campaign_id?: string;
  phone_number: string;
  message: string;
  scheduled_at?: string;
  from_number_id?: string; // Optional: specific org phone number to use
}

interface SMSSendResponse {
  success: boolean;
  conversation_id?: string;
  message_sid?: string;
  error?: string;
}

interface TwilioCredentials {
  account_sid: string;
  auth_token: string;
  from_number: string;
  is_managed: boolean; // true = iSyncSO managed, false = user's own
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: SMSSendRequest = await req.json();
    const { candidate_id, organization_id, campaign_id, phone_number, message, scheduled_at, conversation_id, from_number_id } = body;

    // Validate required fields
    if (!phone_number || !message || !organization_id || !candidate_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: phone_number, message, organization_id, candidate_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Twilio credentials - try organization phone numbers first, then company integrations
    let credentials: TwilioCredentials | null = null;

    // Option 1: Specific org phone number requested
    if (from_number_id) {
      const { data: orgNumber } = await supabase
        .from("organization_phone_numbers")
        .select("*")
        .eq("id", from_number_id)
        .eq("organization_id", organization_id)
        .eq("status", "active")
        .single();

      if (orgNumber) {
        credentials = {
          account_sid: Deno.env.get("TWILIO_MASTER_ACCOUNT_SID")!,
          auth_token: Deno.env.get("TWILIO_MASTER_AUTH_TOKEN")!,
          from_number: orgNumber.phone_number,
          is_managed: true,
        };
      }
    }

    // Option 2: Any active org phone number
    if (!credentials) {
      const { data: orgNumbers } = await supabase
        .from("organization_phone_numbers")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("status", "active")
        .limit(1);

      if (orgNumbers && orgNumbers.length > 0) {
        credentials = {
          account_sid: Deno.env.get("TWILIO_MASTER_ACCOUNT_SID")!,
          auth_token: Deno.env.get("TWILIO_MASTER_AUTH_TOKEN")!,
          from_number: orgNumbers[0].phone_number,
          is_managed: true,
        };
      }
    }

    // Option 3: User's own Twilio integration (legacy)
    if (!credentials) {
      const { data: integration } = await supabase
        .from("company_integrations")
        .select("credentials, status")
        .eq("organization_id", organization_id)
        .eq("toolkit_slug", "twilio")
        .eq("status", "connected")
        .single();

      if (integration?.credentials) {
        const creds = integration.credentials as {
          account_sid: string;
          auth_token: string;
          phone_number: string;
        };

        if (creds.account_sid && creds.auth_token && creds.phone_number) {
          credentials = {
            account_sid: creds.account_sid,
            auth_token: creds.auth_token,
            from_number: creds.phone_number,
            is_managed: false,
          };
        }
      }
    }

    // No credentials found
    if (!credentials) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No phone number configured. Please purchase a number in Settings → Phone Numbers.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate master credentials if using managed numbers
    if (credentials.is_managed && (!credentials.account_sid || !credentials.auth_token)) {
      console.error("Master Twilio credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "SMS service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update conversation record
    let conversationId = conversation_id;
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from("sms_conversations")
        .insert({
          organization_id,
          candidate_id,
          campaign_id,
          phone_number,
          twilio_from_number: credentials.from_number,
          status: scheduled_at ? "queued" : "sent",
          scheduled_send_at: scheduled_at || null,
          messages: [{
            role: "assistant",
            content: message,
            timestamp: new Date().toISOString(),
          }],
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Failed to create conversation:", convError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create conversation record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      conversationId = newConversation.id;
    } else {
      // Append message to existing conversation
      const { data: existingConv } = await supabase
        .from("sms_conversations")
        .select("messages")
        .eq("id", conversationId)
        .single();

      if (existingConv) {
        const updatedMessages = [
          ...(existingConv.messages || []),
          {
            role: "assistant",
            content: message,
            timestamp: new Date().toISOString(),
          },
        ];

        await supabase
          .from("sms_conversations")
          .update({ messages: updatedMessages })
          .eq("id", conversationId);
      }
    }

    // If scheduled for later, don't send now
    if (scheduled_at && new Date(scheduled_at) > new Date()) {
      return new Response(
        JSON.stringify({
          success: true,
          conversation_id: conversationId,
          message_sid: null,
          scheduled: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${credentials.account_sid}/Messages.json`;
    const twilioAuth = btoa(`${credentials.account_sid}:${credentials.auth_token}`);

    const twilioBody = new URLSearchParams({
      To: phone_number,
      From: credentials.from_number,
      Body: message,
      StatusCallback: `${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-webhook`,
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioBody.toString(),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);

      // Update conversation status to failed
      await supabase
        .from("sms_conversations")
        .update({ status: "queued", ai_context: { error: twilioResult.message } })
        .eq("id", conversationId);

      return new Response(
        JSON.stringify({ success: false, error: twilioResult.message || "Failed to send SMS" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update conversation with Twilio SID and status
    await supabase
      .from("sms_conversations")
      .update({
        status: "sent",
        twilio_conversation_sid: twilioResult.sid,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // Update usage stats for managed numbers
    if (credentials.is_managed) {
      await supabase.rpc("increment_sms_sent", {
        p_phone_number: credentials.from_number,
      }).catch(() => {
        // Non-critical, just log
        console.log("Failed to update message count");
      });
    }

    // Log to integration_sync_logs
    await supabase.from("integration_sync_logs").insert({
      organization_id,
      provider_id: "twilio",
      sync_type: "sms_send",
      status: "success",
      records_synced: 1,
      details: {
        message_sid: twilioResult.sid,
        to: phone_number,
        from: credentials.from_number,
        managed: credentials.is_managed,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: conversationId,
        message_sid: twilioResult.sid,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("SMS send error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

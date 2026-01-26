// Supabase Edge Function: twilio-numbers
// Manages phone number purchasing through iSyncSO's master Twilio account

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TwilioNumberRequest {
  action: "search" | "purchase" | "release" | "list" | "update";
  organization_id: string;
  // Search params
  country?: string;
  area_code?: string;
  contains?: string;
  // Purchase/release params
  phone_number?: string;
  number_id?: string;
  friendly_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Master Twilio account credentials (iSyncSO's account)
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_MASTER_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_MASTER_AUTH_TOKEN");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, error: "Twilio master account not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: TwilioNumberRequest = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    switch (action) {
      case "search":
        return await searchAvailableNumbers(body, twilioAuth, TWILIO_ACCOUNT_SID);

      case "purchase":
        return await purchaseNumber(body, supabase, twilioAuth, TWILIO_ACCOUNT_SID);

      case "release":
        return await releaseNumber(body, supabase, twilioAuth, TWILIO_ACCOUNT_SID);

      case "list":
        return await listOrgNumbers(body, supabase);

      case "update":
        return await updateNumber(body, supabase);

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Twilio numbers error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Search available numbers from Twilio
async function searchAvailableNumbers(
  params: TwilioNumberRequest,
  twilioAuth: string,
  accountSid: string
) {
  const { country = "US", area_code, contains } = params;

  let url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${country}/Local.json?SmsEnabled=true&PageSize=20`;

  if (area_code) url += `&AreaCode=${area_code}`;
  if (contains) url += `&Contains=${contains}`;

  const response = await fetch(url, {
    headers: { "Authorization": `Basic ${twilioAuth}` },
  });

  if (!response.ok) {
    const error = await response.json();
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to search numbers" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await response.json();

  // Format numbers for display
  const numbers = data.available_phone_numbers?.map((num: any) => ({
    phone_number: num.phone_number,
    friendly_name: num.friendly_name,
    region: num.region,
    locality: num.locality,
    postal_code: num.postal_code,
    capabilities: {
      sms: num.capabilities?.sms || false,
      mms: num.capabilities?.mms || false,
      voice: num.capabilities?.voice || false,
    },
    // Pricing (iSyncSO markup)
    monthly_cost: 2.00, // $2/month
  })) || [];

  return new Response(
    JSON.stringify({ success: true, numbers }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Purchase a number for an organization
async function purchaseNumber(
  params: TwilioNumberRequest,
  supabase: any,
  twilioAuth: string,
  accountSid: string
) {
  const { organization_id, phone_number, friendly_name } = params;

  if (!phone_number) {
    return new Response(
      JSON.stringify({ success: false, error: "phone_number required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if org already has this number
  const { data: existing } = await supabase
    .from("organization_phone_numbers")
    .select("id")
    .eq("phone_number", phone_number)
    .single();

  if (existing) {
    return new Response(
      JSON.stringify({ success: false, error: "Number already in use" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Webhook URL for incoming SMS
  const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-webhook`;

  // Purchase from Twilio
  const purchaseBody = new URLSearchParams({
    PhoneNumber: phone_number,
    SmsUrl: webhookUrl,
    SmsMethod: "POST",
  });

  if (friendly_name) {
    purchaseBody.append("FriendlyName", friendly_name);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: purchaseBody.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("Twilio purchase error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to purchase number" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const twilioNumber = await response.json();

  // Validate Twilio response has required fields
  if (!twilioNumber.sid || !twilioNumber.phone_number) {
    console.error("Incomplete Twilio response:", {
      hasSid: !!twilioNumber.sid,
      hasPhoneNumber: !!twilioNumber.phone_number,
      responseKeys: Object.keys(twilioNumber),
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: "Twilio returned incomplete data. Number may have been purchased - contact support.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate organization_id is valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!organization_id || !uuidRegex.test(organization_id)) {
    console.error("Invalid organization_id:", organization_id);
    return new Response(
      JSON.stringify({ success: false, error: "Invalid organization ID format" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build insert data with explicit types
  const insertData = {
    organization_id,
    phone_number: twilioNumber.phone_number,
    friendly_name: friendly_name || twilioNumber.friendly_name || null,
    twilio_sid: twilioNumber.sid,
    twilio_account_sid: accountSid,
    capabilities: {
      sms: twilioNumber.capabilities?.sms ?? true,
      mms: twilioNumber.capabilities?.mms ?? false,
      voice: twilioNumber.capabilities?.voice ?? false,
    },
    country_code: twilioNumber.iso_country || "US",
    region: twilioNumber.region || null,
    locality: twilioNumber.locality || null,
    monthly_cost_cents: 200,
    setup_cost_cents: 100,
    status: "active",
  };

  console.log("Attempting to save phone number:", {
    org_id: organization_id,
    phone: twilioNumber.phone_number,
    twilio_sid: twilioNumber.sid,
  });

  // Save to database
  const { data: savedNumber, error: saveError } = await supabase
    .from("organization_phone_numbers")
    .insert(insertData)
    .select()
    .single();

  if (saveError) {
    console.error("Failed to save number to database:", {
      error: saveError,
      code: saveError.code,
      message: saveError.message,
      details: saveError.details,
      hint: saveError.hint,
      twilioSid: twilioNumber.sid,
      phoneNumber: twilioNumber.phone_number,
      organizationId: organization_id,
    });

    // Provide more specific error message based on error code
    let userMessage = "Number purchased but failed to save. Contact support.";
    if (saveError.code === "23502") {
      userMessage = "Database error: Missing required field. Contact support.";
    } else if (saveError.code === "23505") {
      userMessage = "This number is already registered in the system.";
    } else if (saveError.code === "23503") {
      userMessage = "Invalid organization. Please refresh and try again.";
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage,
        twilio_sid: twilioNumber.sid,
        debug_code: saveError.code,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Log the purchase
  await supabase.from("integration_sync_logs").insert({
    organization_id,
    provider_id: "twilio",
    sync_type: "number_purchase",
    status: "success",
    records_synced: 1,
    details: {
      phone_number: twilioNumber.phone_number,
      twilio_sid: twilioNumber.sid,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      number: savedNumber,
      message: `Successfully purchased ${phone_number}`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Release a number back to Twilio
async function releaseNumber(
  params: TwilioNumberRequest,
  supabase: any,
  twilioAuth: string,
  accountSid: string
) {
  const { organization_id, number_id } = params;

  if (!number_id) {
    return new Response(
      JSON.stringify({ success: false, error: "number_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get the number record
  const { data: numberRecord, error: fetchError } = await supabase
    .from("organization_phone_numbers")
    .select("*")
    .eq("id", number_id)
    .eq("organization_id", organization_id)
    .single();

  if (fetchError || !numberRecord) {
    return new Response(
      JSON.stringify({ success: false, error: "Number not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Release from Twilio
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${numberRecord.twilio_sid}.json`,
    {
      method: "DELETE",
      headers: { "Authorization": `Basic ${twilioAuth}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to release number" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update status in database
  await supabase
    .from("organization_phone_numbers")
    .update({ status: "released" })
    .eq("id", number_id);

  // Log the release
  await supabase.from("integration_sync_logs").insert({
    organization_id,
    provider_id: "twilio",
    sync_type: "number_release",
    status: "success",
    records_synced: 1,
    details: {
      phone_number: numberRecord.phone_number,
      twilio_sid: numberRecord.twilio_sid,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: `Released ${numberRecord.phone_number}`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// List organization's numbers
async function listOrgNumbers(params: TwilioNumberRequest, supabase: any) {
  const { organization_id } = params;

  const { data: numbers, error } = await supabase
    .from("organization_phone_numbers")
    .select("*")
    .eq("organization_id", organization_id)
    .neq("status", "released")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, numbers: numbers || [] }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Update number settings
async function updateNumber(params: TwilioNumberRequest, supabase: any) {
  const { organization_id, number_id, friendly_name } = params;

  if (!number_id) {
    return new Response(
      JSON.stringify({ success: false, error: "number_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("organization_phone_numbers")
    .update({ friendly_name })
    .eq("id", number_id)
    .eq("organization_id", organization_id)
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, number: data }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

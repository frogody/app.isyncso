// Supabase Edge Function: sms-ai-respond
// Generates AI responses for SMS conversations using Together.ai

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIRespondRequest {
  conversation_id: string;
  inbound_message: string;
  candidate_id: string;
  organization_id: string;
  auto_send?: boolean; // If true, automatically sends the response
}

const SMS_SYSTEM_PROMPT = `You are a friendly, professional recruiter assistant. Your goal is to have natural conversations via SMS to schedule calls with interested candidates.

CRITICAL RULES:
- Keep responses SHORT: ideally under 160 characters, MAXIMUM 320 characters
- Be conversational and warm, NOT corporate or robotic
- Use the candidate's first name naturally
- If they're interested → suggest scheduling a call
- If they decline → thank them gracefully and close
- If unclear → ask ONE clarifying question
- Never use fake urgency, manipulation, or pressure tactics
- Sound human, like texting a friend about a job opportunity

RESPONSE PATTERNS:
- Interested: "Great to hear, {name}! When works best for a quick 15-min call? I'm flexible this week."
- Scheduling: "Perfect! How about [suggested time]? I'll send a calendar invite."
- Declined: "Totally understand, {name}. Thanks for letting me know. Best of luck!"
- Question: "Happy to share more! What specifically would you like to know?"`;

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

    const body: AIRespondRequest = await req.json();
    const { conversation_id, inbound_message, candidate_id, organization_id, auto_send = false } = body;

    if (!conversation_id || !inbound_message || !candidate_id || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get conversation with messages
    const { data: conversation, error: convError } = await supabase
      .from("sms_conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ success: false, error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if opted out
    if (conversation.opted_out) {
      return new Response(
        JSON.stringify({ success: false, error: "Candidate has opted out" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get candidate details
    const { data: candidate } = await supabase
      .from("candidates")
      .select("first_name, last_name, job_title, company_name, intelligence_score, recommended_approach")
      .eq("id", candidate_id)
      .single();

    // Get campaign context if available
    let campaignContext = "";
    if (conversation.campaign_id) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("name, description, roles(title)")
        .eq("id", conversation.campaign_id)
        .single();

      if (campaign) {
        campaignContext = `\nRole: ${campaign.roles?.title || campaign.name}`;
      }
    }

    // Build conversation history for context
    const recentMessages = (conversation.messages || []).slice(-6);
    const conversationHistory = recentMessages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // Generate AI response
    const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

    if (!TOGETHER_API_KEY) {
      // Fallback response if no API key
      const fallbackResponse = `Thanks for getting back to me! Would you have time for a quick call this week to discuss?`;
      return new Response(
        JSON.stringify({
          success: true,
          response: fallbackResponse,
          auto_sent: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstName = candidate?.first_name || "there";
    const userPrompt = `Generate a response to this SMS from ${firstName} (${candidate?.job_title || "candidate"} at ${candidate?.company_name || "their company"}).${campaignContext}

Their message: "${inbound_message}"

Remember: Keep it SHORT (under 160 chars if possible, max 320), conversational, and focused on scheduling a call if they're interested.`;

    const aiResponse = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshotai/Kimi-K2-Instruct",
        messages: [
          { role: "system", content: SMS_SYSTEM_PROMPT },
          ...conversationHistory,
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Together API error:", errorText);

      // Try fallback model
      const fallbackResponse = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
          messages: [
            { role: "system", content: SMS_SYSTEM_PROMPT },
            ...conversationHistory,
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (!fallbackResponse.ok) {
        return new Response(
          JSON.stringify({ success: false, error: "AI generation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fallbackResult = await fallbackResponse.json();
      const responseText = fallbackResult.choices?.[0]?.message?.content?.trim() || "";

      return await processResponse(supabase, conversation, responseText, auto_send, organization_id, candidate_id);
    }

    const result = await aiResponse.json();
    let responseText = result.choices?.[0]?.message?.content?.trim() || "";

    // Ensure response isn't too long
    if (responseText.length > 320) {
      responseText = responseText.substring(0, 317) + "...";
    }

    return await processResponse(supabase, conversation, responseText, auto_send, organization_id, candidate_id);

  } catch (error) {
    console.error("AI respond error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processResponse(
  supabase: any,
  conversation: any,
  responseText: string,
  autoSend: boolean,
  organizationId: string,
  candidateId: string
) {
  // Store draft response in AI context
  await supabase
    .from("sms_conversations")
    .update({
      ai_context: {
        ...conversation.ai_context,
        draft_response: responseText,
        draft_generated_at: new Date().toISOString(),
      },
    })
    .eq("id", conversation.id);

  // If auto_send is enabled, send the message
  if (autoSend) {
    const sendUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sms-send`;
    const sendResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        conversation_id: conversation.id,
        candidate_id: candidateId,
        organization_id: organizationId,
        phone_number: conversation.phone_number,
        message: responseText,
      }),
    });

    const sendResult = await sendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        auto_sent: true,
        send_result: sendResult,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Return draft for human review
  return new Response(
    JSON.stringify({
      success: true,
      response: responseText,
      auto_sent: false,
      conversation_id: conversation.id,
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

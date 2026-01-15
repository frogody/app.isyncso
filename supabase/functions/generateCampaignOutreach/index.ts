// Supabase Edge Function: generateCampaignOutreach
// Generates personalized outreach messages for recruitment campaigns

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OutreachRequest {
  campaign_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_title?: string;
  candidate_company?: string;
  candidate_skills?: string[];
  match_score?: number;
  match_reasons?: string[];
  stage: "initial" | "follow_up_1" | "follow_up_2";
  campaign_type: "email" | "linkedin" | "cold_call" | "multi_channel";
  organization_id: string;
  custom_context?: string;
}

interface OutreachResponse {
  subject: string;
  content: string;
  stage: string;
  generated_at: string;
}

// Stage-specific message templates
const STAGE_TEMPLATES = {
  initial: {
    context: "This is the first outreach message. Be warm, professional, and introduce the opportunity clearly.",
    tone: "friendly and professional",
    length: "concise but complete",
  },
  follow_up_1: {
    context: "This is a follow-up after 3 days of no response. Be respectful of their time, add value, and gently re-engage.",
    tone: "helpful and understanding",
    length: "brief",
  },
  follow_up_2: {
    context: "This is a second follow-up after 5 more days. Be respectful, provide a final value proposition, and leave the door open.",
    tone: "professional and respectful",
    length: "very brief",
  },
};

// Generate message using AI (Together.ai with Kimi K2)
async function generateWithAI(request: OutreachRequest): Promise<OutreachResponse> {
  const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

  if (!TOGETHER_API_KEY) {
    // Fallback to template-based generation if no API key
    return generateFromTemplate(request);
  }

  const stageConfig = STAGE_TEMPLATES[request.stage] || STAGE_TEMPLATES.initial;
  const firstName = request.candidate_name?.split(" ")[0] || "there";

  const systemPrompt = `You are an expert recruitment outreach specialist. Generate a personalized ${request.campaign_type === "linkedin" ? "LinkedIn message" : "email"} for recruiting a candidate.

IMPORTANT RULES:
- Be genuine and personalized, not generic or spammy
- Focus on the candidate's potential fit and career growth
- Keep the tone ${stageConfig.tone}
- Keep the message ${stageConfig.length}
- Never use fake urgency or manipulation tactics
- Reference specific details about the candidate when available
- ${stageConfig.context}

Output format (JSON):
{
  "subject": "Email subject line (skip for LinkedIn)",
  "content": "The message body"
}`;

  const userPrompt = `Generate a ${request.stage.replace("_", " ")} ${request.campaign_type === "linkedin" ? "LinkedIn message" : "email"} for:

Candidate: ${request.candidate_name}
Current Title: ${request.candidate_title || "Not specified"}
Current Company: ${request.candidate_company || "Not specified"}
Key Skills: ${request.candidate_skills?.slice(0, 5).join(", ") || "Not specified"}
Match Score: ${request.match_score || 0}%
Match Reasons: ${request.match_reasons?.join("; ") || "Strong fit for the role"}
${request.custom_context ? `Additional Context: ${request.custom_context}` : ""}

${request.stage === "follow_up_1" ? "Note: They haven't responded to the initial outreach. Add value and gently re-engage." : ""}
${request.stage === "follow_up_2" ? "Note: This is a final follow-up. Be brief and leave the door open." : ""}

Generate a personalized message that would resonate with ${firstName}.`;

  try {
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshotai/Kimi-K2-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Together.ai error:", errorText);
      // Fallback to template
      return generateFromTemplate(request);
    }

    const result = await response.json();
    const messageContent = result.choices[0]?.message?.content;

    if (!messageContent) {
      return generateFromTemplate(request);
    }

    const parsed = JSON.parse(messageContent);

    return {
      subject: parsed.subject || generateSubject(request),
      content: parsed.content || parsed.message || "Unable to generate message",
      stage: request.stage,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("AI generation error:", error);
    return generateFromTemplate(request);
  }
}

// Generate subject line
function generateSubject(request: OutreachRequest): string {
  const firstName = request.candidate_name?.split(" ")[0] || "there";

  if (request.stage === "follow_up_1") {
    return `Quick follow-up, ${firstName}`;
  }
  if (request.stage === "follow_up_2") {
    return `Final note - ${firstName}`;
  }

  if (request.candidate_title) {
    return `Opportunity for a ${request.candidate_title}`;
  }

  return `Exciting opportunity, ${firstName}`;
}

// Template-based fallback generation
function generateFromTemplate(request: OutreachRequest): OutreachResponse {
  const firstName = request.candidate_name?.split(" ")[0] || "there";
  const skillsText = request.candidate_skills?.slice(0, 3).join(", ") || "your background";

  let subject = "";
  let content = "";

  if (request.stage === "initial") {
    subject = generateSubject(request);

    if (request.campaign_type === "linkedin") {
      content = `Hi ${firstName},

I came across your profile and was impressed by your experience${request.candidate_title ? ` as a ${request.candidate_title}` : ""}${request.candidate_company ? ` at ${request.candidate_company}` : ""}.

${request.match_reasons?.[0] ? `${request.match_reasons[0]}. ` : ""}I think you'd be a great fit for an opportunity we have.

Would you be open to a brief conversation to learn more?

Best regards`;
    } else {
      content = `Hi ${firstName},

I hope this email finds you well. I'm reaching out because I came across your background in ${skillsText}${request.candidate_company ? ` at ${request.candidate_company}` : ""}, and I believe you might be a strong fit for an exciting opportunity.

${request.match_reasons?.slice(0, 2).map(r => `• ${r}`).join("\n") || ""}

I'd love to connect briefly to share more details and see if this aligns with your career goals. Would you have 15 minutes for a quick call this week?

Looking forward to hearing from you.

Best regards`;
    }
  } else if (request.stage === "follow_up_1") {
    subject = `Quick follow-up, ${firstName}`;

    content = `Hi ${firstName},

I wanted to follow up on my previous message. I understand you're busy, but I think this opportunity could be really relevant given your experience${request.candidate_title ? ` in ${request.candidate_title}` : ""}.

${request.match_score && request.match_score >= 70 ? "Based on your profile, you're a strong match for what we're looking for. " : ""}Happy to share more details whenever convenient for you.

Best regards`;
  } else {
    subject = `Final note - ${firstName}`;

    content = `Hi ${firstName},

I wanted to reach out one last time regarding the opportunity I mentioned earlier. I completely understand if the timing isn't right or if this isn't aligned with your current goals.

If things change in the future, feel free to reach out. I'd be happy to connect.

Wishing you all the best!

Best regards`;
  }

  return {
    subject,
    content,
    stage: request.stage,
    generated_at: new Date().toISOString(),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: OutreachRequest = await req.json();

    // Validate required fields
    if (!request.campaign_id || !request.candidate_id || !request.candidate_name) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: campaign_id, candidate_id, and candidate_name are required"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default stage to initial
    if (!request.stage) {
      request.stage = "initial";
    }

    // Default campaign type to email
    if (!request.campaign_type) {
      request.campaign_type = "email";
    }

    // Generate the outreach message
    const result = await generateWithAI(request);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Supabase Edge Function: generateCampaignOutreach
// Generates HYPER-PERSONALIZED outreach messages using full candidate intelligence
// This is the heart of the unified outreach system - no generic templates!

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extended interface to accept full intelligence data
interface OutreachRequest {
  campaign_id: string;
  candidate_id: string;
  organization_id: string;

  // Basic candidate info
  candidate_name: string;
  candidate_title?: string;
  candidate_company?: string;
  candidate_skills?: string[];

  // Match data
  match_score?: number;
  match_reasons?: string[];
  match_details?: Record<string, unknown>;

  // === INTELLIGENCE DATA (The Gold Mine!) ===
  intelligence_score?: number;              // 0-100 receptiveness
  recommended_approach?: "nurture" | "targeted" | "immediate";
  outreach_hooks?: string[];                // Specific angles to use!
  best_outreach_angle?: string;             // Single best hook
  timing_signals?: Array<{
    trigger: string;
    window: string;
    urgency: "low" | "medium" | "high";
  }>;
  company_pain_points?: string[];           // Current frustrations
  key_insights?: string[];                  // Deep understanding
  lateral_opportunities?: string[];         // Career paths they'd consider
  intelligence_factors?: Array<{
    factor: string;
    score: number;
    reason: string;
  }>;

  // === ROLE CONTEXT (From Campaign Wizard) ===
  role_context?: {
    perfect_fit_criteria?: string;
    selling_points?: string;
    must_haves?: string;
    nice_to_haves?: string;
    compensation_range?: string;
    unique_aspects?: string;
  };
  role_title?: string;
  company_name?: string;                    // The hiring company

  // Outreach settings
  stage: "initial" | "follow_up_1" | "follow_up_2";
  campaign_type: "email" | "linkedin" | "cold_call" | "multi_channel" | "sms";
  custom_context?: string;
}

interface OutreachResponse {
  subject: string;
  content: string;
  stage: string;
  generated_at: string;
  intelligence_used: string[];              // Track what data was leveraged
  personalization_score: number;            // 0-100 how personalized
}

// Stage-specific configurations
const STAGE_CONFIG = {
  initial: {
    context: "First outreach. Be warm, specific, and show you've done research.",
    tone: "genuinely interested",
    maxLength: 150, // words
    urgency: "low",
  },
  follow_up_1: {
    context: "Follow-up after no response. Add new value, reference timing signals.",
    tone: "helpful and understanding",
    maxLength: 100,
    urgency: "medium",
  },
  follow_up_2: {
    context: "Final follow-up. Brief, respectful, leave door open.",
    tone: "professional",
    maxLength: 60,
    urgency: "low",
  },
};

// The AI-powered hyper-personalized generator
async function generateHyperPersonalized(request: OutreachRequest): Promise<OutreachResponse> {
  const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

  if (!TOGETHER_API_KEY) {
    console.log("No Together API key - using intelligent fallback");
    return generateIntelligentFallback(request);
  }

  const stageConfig = STAGE_CONFIG[request.stage] || STAGE_CONFIG.initial;
  const firstName = request.candidate_name?.split(" ")[0] || "there";
  const intelligenceUsed: string[] = [];

  // Build intelligence-driven system prompt
  let systemPrompt = `You are a world-class recruiter who writes messages that feel GENUINELY personal - like they came from someone who actually knows the candidate. Never sound like a template.

CRITICAL RULES:
- Open with something SPECIFIC to THIS candidate (not generic "I came across your profile")
- Reference WHY this role fits their trajectory
- Never use fake urgency or manipulation
- Keep it ${stageConfig.tone}
- Max ${stageConfig.maxLength} words
- ${stageConfig.context}

CHANNEL: ${request.campaign_type === "linkedin" ? "LinkedIn InMail (no subject needed)" : request.campaign_type === "sms" ? "SMS (max 280 chars)" : "Professional Email"}
`;

  // Add role context if available
  if (request.role_context?.selling_points || request.role_context?.perfect_fit_criteria) {
    systemPrompt += `
THE OPPORTUNITY:
${request.role_title ? `Role: ${request.role_title}` : ""}
${request.company_name ? `Company: ${request.company_name}` : ""}
${request.role_context?.selling_points ? `Why It's Compelling: ${request.role_context.selling_points}` : ""}
${request.role_context?.perfect_fit_criteria ? `Ideal Fit: ${request.role_context.perfect_fit_criteria}` : ""}
${request.role_context?.unique_aspects ? `Unique: ${request.role_context.unique_aspects}` : ""}
`;
    intelligenceUsed.push("role_context");
  }

  // Build intelligence-rich user prompt
  let userPrompt = `Generate a ${request.stage === "initial" ? "first outreach" : request.stage.replace("_", " ")} message for:

CANDIDATE: ${request.candidate_name}
Current: ${request.candidate_title || "Unknown"} at ${request.candidate_company || "Unknown"}
${request.candidate_skills?.length ? `Key Skills: ${request.candidate_skills.slice(0, 5).join(", ")}` : ""}
`;

  // Add match intelligence
  if (request.match_score || request.match_reasons?.length) {
    userPrompt += `
MATCH ANALYSIS:
Match Score: ${request.match_score || "N/A"}%
${request.match_reasons?.length ? `Why They Match:\n${request.match_reasons.map(r => `• ${r}`).join("\n")}` : ""}
`;
    intelligenceUsed.push("match_data");
  }

  // === THE GOLD MINE - Candidate Intelligence ===

  // Best outreach angle (most important!)
  if (request.best_outreach_angle) {
    userPrompt += `
🎯 PRIMARY HOOK (lead with this!):
${request.best_outreach_angle}
`;
    intelligenceUsed.push("best_outreach_angle");
  }

  // Outreach hooks
  if (request.outreach_hooks?.length) {
    userPrompt += `
💡 PERSONALIZATION ANGLES (use at least one):
${request.outreach_hooks.slice(0, 3).map((h, i) => `${i + 1}. ${h}`).join("\n")}
`;
    intelligenceUsed.push("outreach_hooks");
  }

  // Timing signals - crucial for urgency
  if (request.timing_signals?.length) {
    const highUrgency = request.timing_signals.filter(t => t.urgency === "high");
    const relevantSignals = highUrgency.length > 0 ? highUrgency : request.timing_signals.slice(0, 2);

    userPrompt += `
⏰ TIMING CONTEXT (why NOW matters):
${relevantSignals.map(t => `• ${t.trigger} (window: ${t.window})`).join("\n")}
`;
    intelligenceUsed.push("timing_signals");
  }

  // Company pain points
  if (request.company_pain_points?.length) {
    userPrompt += `
😤 THEIR CURRENT FRUSTRATIONS (acknowledge subtly):
${request.company_pain_points.slice(0, 2).map(p => `• ${p}`).join("\n")}
`;
    intelligenceUsed.push("company_pain_points");
  }

  // Key insights
  if (request.key_insights?.length) {
    userPrompt += `
🔍 INSIGHTS ABOUT THEM:
${request.key_insights.slice(0, 2).map(i => `• ${i}`).join("\n")}
`;
    intelligenceUsed.push("key_insights");
  }

  // Intelligence factors (what drives them)
  if (request.intelligence_factors?.length) {
    const topFactors = request.intelligence_factors
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    userPrompt += `
🎯 WHAT DRIVES THEM:
${topFactors.map(f => `• ${f.factor}: ${f.reason}`).join("\n")}
`;
    intelligenceUsed.push("intelligence_factors");
  }

  // Recommended approach affects tone
  if (request.recommended_approach) {
    const approachGuide = {
      nurture: "Be gentle, focus on long-term relationship. Don't push for immediate action.",
      targeted: "Be direct about fit. Clear value proposition, specific ask.",
      immediate: "Create urgency. Timing is right, be confident about fit.",
    };
    userPrompt += `
📋 APPROACH: ${request.recommended_approach.toUpperCase()}
${approachGuide[request.recommended_approach]}
`;
    intelligenceUsed.push("recommended_approach");
  }

  // Intelligence score affects directness
  if (request.intelligence_score && request.intelligence_score >= 70) {
    userPrompt += `
📊 RECEPTIVENESS: High (${request.intelligence_score}/100) - They're likely open to hearing from you. Be confident!
`;
    intelligenceUsed.push("intelligence_score");
  }

  // Custom context
  if (request.custom_context) {
    userPrompt += `
📝 ADDITIONAL CONTEXT:
${request.custom_context}
`;
    intelligenceUsed.push("custom_context");
  }

  // Stage-specific instructions
  if (request.stage === "follow_up_1") {
    userPrompt += `
⚠️ FOLLOW-UP NOTE: They didn't respond to initial outreach. Reference something NEW (timing signal, hook), add value, don't be pushy.
`;
  } else if (request.stage === "follow_up_2") {
    userPrompt += `
⚠️ FINAL FOLLOW-UP: Keep it short. One compelling point, leave door open, respect their time.
`;
  }

  // Output format
  userPrompt += `
---
Write a message that makes ${firstName} think "wow, they actually know me."
${request.campaign_type === "email" ? 'Output JSON: {"subject": "...", "content": "..."}' : 'Output JSON: {"subject": "", "content": "..."}'}`;

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
        max_tokens: 1200,
        temperature: 0.75,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Together.ai error:", errorText);
      return generateIntelligentFallback(request);
    }

    const result = await response.json();
    const messageContent = result.choices[0]?.message?.content;

    if (!messageContent) {
      return generateIntelligentFallback(request);
    }

    const parsed = JSON.parse(messageContent);

    // Calculate personalization score based on intelligence used
    const maxIntelligence = 10; // total possible intelligence points
    const personalizationScore = Math.min(100, Math.round((intelligenceUsed.length / maxIntelligence) * 100));

    return {
      subject: parsed.subject || generateSmartSubject(request),
      content: parsed.content || parsed.message || "Unable to generate message",
      stage: request.stage,
      generated_at: new Date().toISOString(),
      intelligence_used: intelligenceUsed,
      personalization_score: personalizationScore,
    };
  } catch (error) {
    console.error("AI generation error:", error);
    return generateIntelligentFallback(request);
  }
}

// Smart subject line generator
function generateSmartSubject(request: OutreachRequest): string {
  const firstName = request.candidate_name?.split(" ")[0] || "there";

  // Use best outreach angle for subject if available
  if (request.best_outreach_angle) {
    const hook = request.best_outreach_angle.split(" ").slice(0, 5).join(" ");
    return `${hook}...`;
  }

  if (request.stage === "follow_up_1") {
    return `Quick thought for you, ${firstName}`;
  }
  if (request.stage === "follow_up_2") {
    return `One last note, ${firstName}`;
  }

  // Use timing signal for subject
  if (request.timing_signals?.[0]) {
    return `Timing: ${request.timing_signals[0].trigger.substring(0, 40)}`;
  }

  if (request.role_title) {
    return `${request.role_title} opportunity - ${request.company_name || "Exciting company"}`;
  }

  return `Thought of you, ${firstName}`;
}

// Intelligent fallback that still uses available intelligence
function generateIntelligentFallback(request: OutreachRequest): OutreachResponse {
  const firstName = request.candidate_name?.split(" ")[0] || "there";
  const intelligenceUsed: string[] = [];

  let subject = "";
  let content = "";

  // Get the best hook available
  const primaryHook = request.best_outreach_angle || request.outreach_hooks?.[0];
  if (primaryHook) intelligenceUsed.push("outreach_hooks");

  // Get timing context
  const timingContext = request.timing_signals?.[0];
  if (timingContext) intelligenceUsed.push("timing_signals");

  // Get pain point
  const painPoint = request.company_pain_points?.[0];
  if (painPoint) intelligenceUsed.push("company_pain_points");

  if (request.stage === "initial") {
    subject = generateSmartSubject(request);

    if (request.campaign_type === "linkedin" || request.campaign_type === "sms") {
      // Short format
      content = `${firstName} - `;

      if (primaryHook) {
        content += `${primaryHook}\n\n`;
      } else if (request.match_reasons?.[0]) {
        content += `${request.match_reasons[0]}\n\n`;
        intelligenceUsed.push("match_reasons");
      } else {
        content += `Your background${request.candidate_title ? ` in ${request.candidate_title}` : ""} stood out.\n\n`;
      }

      if (request.role_context?.selling_points) {
        content += `${request.role_context.selling_points.substring(0, 100)}\n\n`;
        intelligenceUsed.push("role_context");
      }

      content += `Worth a 15 min chat?`;
    } else {
      // Email format
      content = `Hi ${firstName},\n\n`;

      // Opening - use hook or specific match reason
      if (primaryHook) {
        content += `${primaryHook}\n\n`;
      } else if (request.candidate_company && request.candidate_title) {
        content += `Your work as ${request.candidate_title} at ${request.candidate_company} caught my attention.\n\n`;
      } else {
        content += `Your background stood out for an opportunity I'm working on.\n\n`;
      }

      // The opportunity - use role context
      if (request.role_context?.selling_points) {
        content += `${request.role_context.selling_points}\n\n`;
        intelligenceUsed.push("role_context");
      } else if (request.role_title && request.company_name) {
        content += `We're looking for a ${request.role_title} at ${request.company_name}.\n\n`;
      }

      // Why them - use match reasons
      if (request.match_reasons?.length) {
        content += `Why you specifically:\n`;
        content += request.match_reasons.slice(0, 2).map(r => `• ${r}`).join("\n");
        content += "\n\n";
        intelligenceUsed.push("match_reasons");
      }

      // Timing context if available
      if (timingContext) {
        content += `Given ${timingContext.trigger.toLowerCase()}, thought this might be interesting timing.\n\n`;
      }

      content += `Would you be open to a brief conversation?\n\nBest regards`;
    }
  } else if (request.stage === "follow_up_1") {
    subject = `Quick thought, ${firstName}`;

    content = `Hi ${firstName},\n\n`;
    content += `Following up on my earlier message. `;

    // Add new value with timing or hook
    if (timingContext && request.stage === "follow_up_1") {
      content += `I noticed ${timingContext.trigger.toLowerCase()} - `;
    }

    if (primaryHook && primaryHook !== request.outreach_hooks?.[0]) {
      // Use a different hook if available
      content += `${primaryHook}\n\n`;
    } else if (request.intelligence_score && request.intelligence_score >= 70) {
      content += `Based on your profile, I genuinely think this could be aligned with where you want to go.\n\n`;
      intelligenceUsed.push("intelligence_score");
    } else {
      content += `I think this could be worth exploring.\n\n`;
    }

    content += `Happy to share more details whenever works for you.\n\nBest regards`;
  } else {
    subject = `One last note, ${firstName}`;

    content = `Hi ${firstName},\n\n`;
    content += `Final follow-up on the ${request.role_title || "opportunity"} I mentioned.\n\n`;

    if (primaryHook) {
      content += `What really stands out is: ${primaryHook}\n\n`;
    }

    content += `No worries if the timing isn't right. Door's always open.\n\nBest regards`;
  }

  const personalizationScore = Math.min(100, Math.round((intelligenceUsed.length / 10) * 100));

  return {
    subject,
    content,
    stage: request.stage,
    generated_at: new Date().toISOString(),
    intelligence_used: intelligenceUsed,
    personalization_score: personalizationScore,
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

    // Generate the hyper-personalized outreach message
    const result = await generateHyperPersonalized(request);

    console.log(`Generated outreach for ${request.candidate_name}:`, {
      stage: request.stage,
      intelligence_used: result.intelligence_used,
      personalization_score: result.personalization_score,
    });

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

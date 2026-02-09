// Supabase Edge Function: generateCampaignOutreach
// Generates HYPER-PERSONALIZED outreach messages using full candidate intelligence
// Phase 2: LinkedIn-specific message types, character limits, data point priorities

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extended interface to accept full intelligence data + Phase 2 outreach preferences
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
  intelligence_score?: number;
  recommended_approach?: "nurture" | "targeted" | "immediate";
  outreach_hooks?: string[];
  best_outreach_angle?: string;
  timing_signals?: Array<{
    trigger: string;
    window: string;
    urgency: "low" | "medium" | "high";
  }>;
  company_pain_points?: string[];
  key_insights?: string[];
  lateral_opportunities?: string[];
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
  company_name?: string;

  // Outreach settings
  stage: "initial" | "follow_up_1" | "follow_up_2";
  campaign_type: "email" | "linkedin" | "cold_call" | "multi_channel" | "sms";
  custom_context?: string;

  // === PHASE 2: Outreach Preferences ===
  message_type?: string;       // 'linkedin_connection' | 'linkedin_inmail' | 'linkedin_message' | 'email'
  char_limit?: number;         // Character limit from preferences
  data_point_priorities?: Record<string, number>; // Priority weights 0-100
  custom_instructions?: string; // Free-form AI instructions
  tone?: string;               // 'professional' | 'casual' | 'friendly' | 'direct'
  language?: string;           // 'en' | 'nl' | 'de' | 'fr'
  formality?: string;          // 'formal' | 'casual' | 'friendly'
}

interface OutreachResponse {
  subject: string | null;
  content: string;
  stage: string;
  generated_at: string;
  intelligence_used: string[];
  personalization_score: number;
  // Phase 2 additions
  message_type?: string;
  char_count?: number;
  char_limit?: number;
  data_points_used?: string[];
  language?: string;
}

// ─── Message Type Configuration ──────────────────────────

interface MessageTypeConfig {
  hasSubject: boolean;
  maxSubjectChars: number;
  defaultMaxChars: number;
  hookCount: number;
  label: string;
  formatInstruction: string;
}

const MESSAGE_TYPE_CONFIGS: Record<string, MessageTypeConfig> = {
  linkedin_connection: {
    hasSubject: false,
    maxSubjectChars: 0,
    defaultMaxChars: 300,
    hookCount: 1,
    label: "LinkedIn Connection Request",
    formatInstruction: "Write 2-3 sentences MAXIMUM. Focus on ONE compelling hook. End with a soft question or value proposition. This is a connection request — be concise and intriguing.",
  },
  linkedin_inmail: {
    hasSubject: true,
    maxSubjectChars: 200,
    defaultMaxChars: 1900,
    hookCount: 3,
    label: "LinkedIn InMail",
    formatInstruction: "Professional format with a compelling subject line (max 200 chars). Include 2-3 personalization points. Clear call to action. This is an InMail to a non-connection.",
  },
  linkedin_message: {
    hasSubject: false,
    maxSubjectChars: 0,
    defaultMaxChars: 8000,
    hookCount: 4,
    label: "LinkedIn Post-Connection Message",
    formatInstruction: "Conversational tone since you're already connected. Reference the connection context. Can be more detailed — include multiple data points. Natural CTA.",
  },
  email: {
    hasSubject: true,
    maxSubjectChars: 200,
    defaultMaxChars: 5000,
    hookCount: 3,
    label: "Email",
    formatInstruction: "Professional email with compelling subject line. Structured with clear opening hook, value proposition, and CTA.",
  },
};

function getMessageTypeConfig(messageType: string): MessageTypeConfig {
  return MESSAGE_TYPE_CONFIGS[messageType] || MESSAGE_TYPE_CONFIGS.email;
}

// ─── Tone / Language / Formality Helpers ─────────────────

function getToneInstruction(tone?: string): string {
  const map: Record<string, string> = {
    professional: "Professional and polished — confident but not stiff",
    casual: "Relaxed and conversational — like a colleague reaching out",
    friendly: "Warm and approachable — genuinely interested in them as a person",
    direct: "Straightforward and concise — respect their time, get to the point",
  };
  return map[tone || "professional"] || map.professional;
}

function getLanguageInstruction(language?: string): string {
  const map: Record<string, string> = {
    en: "Write in English",
    nl: "Write in Dutch (Nederlands). Use natural Dutch phrasing, not translated English.",
    de: "Write in German (Deutsch). Use natural German phrasing and formal Sie form.",
    fr: "Write in French (Fran\u00e7ais). Use natural French phrasing and formal vous form.",
  };
  return map[language || "en"] || map.en;
}

function getFormalityInstruction(formality?: string): string {
  const map: Record<string, string> = {
    formal: "Use formal address and professional language",
    casual: "Use casual but respectful language",
    friendly: "Use warm, first-name-basis language",
  };
  return map[formality || "formal"] || map.formal;
}

// ─── Data Point Priority Ranking ─────────────────────────

interface RankedDataPoint {
  key: string;
  label: string;
  priority: number;
  content: string;
}

function buildDataPointContext(
  request: OutreachRequest,
  priorities: Record<string, number>,
  hookCount: number
): { context: string; dataPointsUsed: string[]; intelligenceUsed: string[] } {
  const dataPoints: RankedDataPoint[] = [];
  const intelligenceUsed: string[] = [];

  // Best outreach angle — always highest priority
  if (request.best_outreach_angle) {
    dataPoints.push({
      key: "best_outreach_angle",
      label: "PRIMARY HOOK",
      priority: 110, // Always on top
      content: request.best_outreach_angle,
    });
    intelligenceUsed.push("best_outreach_angle");
  }

  // Timing signals
  if (request.timing_signals?.length) {
    const highUrgency = request.timing_signals.filter(t => t.urgency === "high");
    const signals = highUrgency.length > 0 ? highUrgency : request.timing_signals.slice(0, 2);
    dataPoints.push({
      key: "timing_signals",
      label: "TIMING",
      priority: priorities.timing_signals ?? 70,
      content: signals.map(t => `${t.trigger} (window: ${t.window})`).join("; "),
    });
    intelligenceUsed.push("timing_signals");
  }

  // Company pain points — use max of company_instability, layoffs, ma_activity
  if (request.company_pain_points?.length) {
    const maxPriority = Math.max(
      priorities.company_instability ?? 0,
      priorities.layoffs ?? 0,
      priorities.ma_activity ?? 0,
      60 // minimum
    );
    dataPoints.push({
      key: "company_pain_points",
      label: "COMPANY PAIN POINTS",
      priority: maxPriority,
      content: request.company_pain_points.slice(0, 2).join("; "),
    });
    intelligenceUsed.push("company_pain_points");
  }

  // Outreach hooks
  if (request.outreach_hooks?.length) {
    dataPoints.push({
      key: "outreach_hooks",
      label: "PERSONALIZATION ANGLES",
      priority: priorities.skill_match ?? 80,
      content: request.outreach_hooks.slice(0, 3).join("; "),
    });
    intelligenceUsed.push("outreach_hooks");
  }

  // Key insights → career_trajectory, work_history
  if (request.key_insights?.length) {
    const maxPriority = Math.max(
      priorities.career_trajectory ?? 0,
      priorities.work_history ?? 0,
      40
    );
    dataPoints.push({
      key: "key_insights",
      label: "CANDIDATE INSIGHTS",
      priority: maxPriority,
      content: request.key_insights.slice(0, 2).join("; "),
    });
    intelligenceUsed.push("key_insights");
  }

  // Match reasons → skill_match
  if (request.match_reasons?.length) {
    dataPoints.push({
      key: "match_reasons",
      label: "MATCH REASONS",
      priority: priorities.skill_match ?? 80,
      content: request.match_reasons.slice(0, 3).join("; "),
    });
    intelligenceUsed.push("match_data");
  }

  // Lateral opportunities
  if (request.lateral_opportunities?.length) {
    dataPoints.push({
      key: "lateral_opportunities",
      label: "LATERAL OPPORTUNITIES",
      priority: priorities.lateral_opportunities ?? 50,
      content: request.lateral_opportunities.slice(0, 3).join(", "),
    });
    intelligenceUsed.push("lateral_opportunities");
  }

  // Intelligence factors (data shape: { signal, insight, weight, impact } or { factor, reason, score })
  if (request.intelligence_factors?.length) {
    const topFactors = [...request.intelligence_factors]
      .sort((a, b) => (b.weight ?? b.score ?? 0) - (a.weight ?? a.score ?? 0))
      .slice(0, 2);
    // Map factor names to priority keys where possible
    const factorPriority = topFactors.reduce((max, f) => {
      const name = f.signal || f.factor || "";
      const key = name.toLowerCase().replace(/\s+/g, "_");
      return Math.max(max, priorities[key] ?? 50);
    }, 50);
    dataPoints.push({
      key: "intelligence_factors",
      label: "DRIVING FACTORS",
      priority: factorPriority,
      content: topFactors.map(f => `${f.signal || f.factor || "Factor"}: ${f.insight || f.reason || ""}`).join("; "),
    });
    intelligenceUsed.push("intelligence_factors");
  }

  // Sort by priority descending, take top N
  dataPoints.sort((a, b) => b.priority - a.priority);
  const topPoints = dataPoints.slice(0, Math.max(hookCount, 2));

  const dataPointsUsed = topPoints.map(d => d.key);

  if (topPoints.length === 0) {
    return { context: "", dataPointsUsed: [], intelligenceUsed };
  }

  const context = `PRIORITIZED PERSONALIZATION DATA (reference these in order of importance):
${topPoints.map((d, i) => `${i + 1}. [PRIORITY: ${d.priority}] ${d.label}: ${d.content}`).join("\n")}`;

  return { context, dataPointsUsed, intelligenceUsed };
}

// ─── Post-Generation Validation ──────────────────────────

function truncateToCharLimit(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  // Try to truncate at last sentence boundary
  const truncated = text.substring(0, maxChars);
  const lastSentence = truncated.lastIndexOf(". ");
  if (lastSentence > maxChars * 0.5) {
    return truncated.substring(0, lastSentence + 1);
  }

  // Fall back to last word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.5) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated.substring(0, maxChars - 3) + "...";
}

function truncateSubject(subject: string, maxChars: number): string {
  if (subject.length <= maxChars) return subject;
  const lastSpace = subject.substring(0, maxChars - 3).lastIndexOf(" ");
  if (lastSpace > 0) return subject.substring(0, lastSpace) + "...";
  return subject.substring(0, maxChars - 3) + "...";
}

// ─── Stage Configuration ─────────────────────────────────

const STAGE_CONFIG: Record<string, { context: string; tone: string; maxLength: number; urgency: string }> = {
  initial: {
    context: "First outreach. Be warm, specific, and show you've done research.",
    tone: "genuinely interested",
    maxLength: 150,
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

// ─── Main Generator ──────────────────────────────────────

async function generateHyperPersonalized(request: OutreachRequest): Promise<OutreachResponse> {
  const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

  if (!TOGETHER_API_KEY) {
    console.log("No Together API key - using intelligent fallback");
    return generateIntelligentFallback(request);
  }

  const stageConfig = STAGE_CONFIG[request.stage] || STAGE_CONFIG.initial;
  const firstName = request.candidate_name?.split(" ")[0] || "there";

  // Phase 2: Resolve message type config
  const msgType = request.message_type || (request.campaign_type === "linkedin" ? "linkedin_inmail" : "email");
  const typeConfig = getMessageTypeConfig(msgType);
  const maxChars = request.char_limit || typeConfig.defaultMaxChars;

  // Phase 2: Build priority-ranked data point context
  const priorities = request.data_point_priorities || {};
  const { context: dataPointContext, dataPointsUsed, intelligenceUsed } = buildDataPointContext(
    request,
    priorities,
    typeConfig.hookCount
  );

  // Phase 2: Tone/language/formality instructions
  const toneInstr = getToneInstruction(request.tone);
  const langInstr = getLanguageInstruction(request.language);
  const formalInstr = getFormalityInstruction(request.formality);

  // ── Build System Prompt ──
  let systemPrompt = `You are a world-class recruiter writing a ${typeConfig.label} message. Your messages feel GENUINELY personal — like they came from someone who actually knows the candidate. Never sound like a template.

MESSAGE TYPE: ${typeConfig.label}
FORMAT: ${typeConfig.formatInstruction}

CHARACTER LIMIT: ${maxChars} characters MAXIMUM. This is a HARD limit${msgType.startsWith("linkedin") ? " — LinkedIn will reject messages over this limit" : ""}. Count every character carefully.
${typeConfig.hasSubject ? `SUBJECT LINE: Required (max ${typeConfig.maxSubjectChars} characters)` : "SUBJECT LINE: None — do NOT include a subject line"}

TONE: ${toneInstr}
FORMALITY: ${formalInstr}
LANGUAGE: ${langInstr}

STAGE: ${stageConfig.context}

CRITICAL RULES:
- Open with something SPECIFIC to THIS candidate (not generic "I came across your profile")
- Reference WHY this role fits their trajectory
- Never use fake urgency or manipulation
- Stay UNDER ${maxChars} characters — count every character
- Reference the TOP ${typeConfig.hookCount} data point(s) from the priority list
- Be specific — use actual names, companies, and data
${msgType === "linkedin_connection" ? "- Keep it to 2-3 sentences max. No fluff. ONE hook only." : ""}
- End with a clear but soft call to action
- Do NOT use generic phrases like "I came across your profile" or "I hope this finds you well"`;

  // Add role context if available
  if (request.role_context?.selling_points || request.role_context?.perfect_fit_criteria) {
    systemPrompt += `

THE OPPORTUNITY:
${request.role_title ? `Role: ${request.role_title}` : ""}
${request.company_name ? `Company: ${request.company_name}` : ""}
${request.role_context?.selling_points ? `Why It's Compelling: ${request.role_context.selling_points}` : ""}
${request.role_context?.perfect_fit_criteria ? `Ideal Fit: ${request.role_context.perfect_fit_criteria}` : ""}
${request.role_context?.unique_aspects ? `Unique: ${request.role_context.unique_aspects}` : ""}`;
    intelligenceUsed.push("role_context");
  }

  // ── Build User Prompt ──
  let userPrompt = `Generate a ${request.stage === "initial" ? "first outreach" : request.stage.replace("_", " ")} ${typeConfig.label} for:

CANDIDATE: ${request.candidate_name}
Current: ${request.candidate_title || "Unknown"} at ${request.candidate_company || "Unknown"}
${request.candidate_skills?.length ? `Key Skills: ${request.candidate_skills.slice(0, 5).join(", ")}` : ""}
${request.match_score ? `Match Score: ${request.match_score}%` : ""}
`;

  // Add priority-ranked data points (Phase 2 enhancement)
  if (dataPointContext) {
    userPrompt += `
${dataPointContext}
`;
  }

  // Recommended approach
  if (request.recommended_approach) {
    const approachGuide: Record<string, string> = {
      nurture: "Be gentle, focus on long-term relationship. Don't push for immediate action.",
      targeted: "Be direct about fit. Clear value proposition, specific ask.",
      immediate: "Create urgency. Timing is right, be confident about fit.",
    };
    userPrompt += `
APPROACH: ${request.recommended_approach.toUpperCase()}
${approachGuide[request.recommended_approach] || ""}
`;
    intelligenceUsed.push("recommended_approach");
  }

  // Intelligence score
  if (request.intelligence_score && request.intelligence_score >= 70) {
    userPrompt += `
RECEPTIVENESS: High (${request.intelligence_score}/100) - They're likely open to hearing from you. Be confident!
`;
    intelligenceUsed.push("intelligence_score");
  }

  // Custom context (existing)
  if (request.custom_context) {
    userPrompt += `
ADDITIONAL CONTEXT: ${request.custom_context}
`;
    intelligenceUsed.push("custom_context");
  }

  // Phase 2: Custom instructions from outreach preferences
  if (request.custom_instructions) {
    userPrompt += `
RECRUITER INSTRUCTIONS: ${request.custom_instructions}
`;
    intelligenceUsed.push("custom_instructions");
  }

  // Stage-specific notes
  if (request.stage === "follow_up_1") {
    userPrompt += `
NOTE: They didn't respond to initial outreach. Reference something NEW, add value, don't be pushy.
`;
  } else if (request.stage === "follow_up_2") {
    userPrompt += `
NOTE: Final follow-up. Keep it short. One compelling point, leave door open, respect their time.
`;
  }

  // Output format
  userPrompt += `
---
Write a message that makes ${firstName} think "wow, they actually know me."
Remember: MAXIMUM ${maxChars} characters for the content.
Output JSON: {${typeConfig.hasSubject ? '"subject": "compelling subject line"' : '"subject": null'}, "content": "your message", "data_points_used": ["key1", "key2"]}`;

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

    // ── Post-Generation Validation (Phase 2) ──
    let content = parsed.content || parsed.message || "Unable to generate message";
    let subject = parsed.subject;

    // Enforce character limit
    if (content.length > maxChars) {
      console.log(`Phase2: Content ${content.length} chars exceeds limit ${maxChars}, truncating`);
      content = truncateToCharLimit(content, maxChars);
    }

    // Subject validation
    if (!typeConfig.hasSubject) {
      subject = null;
    } else {
      subject = subject || generateSmartSubject(request);
      if (subject && subject.length > typeConfig.maxSubjectChars) {
        subject = truncateSubject(subject, typeConfig.maxSubjectChars);
      }
    }

    // Calculate personalization score
    const maxIntelligence = 10;
    const personalizationScore = Math.min(100, Math.round((intelligenceUsed.length / maxIntelligence) * 100));

    return {
      subject,
      content,
      stage: request.stage,
      generated_at: new Date().toISOString(),
      intelligence_used: intelligenceUsed,
      personalization_score: personalizationScore,
      message_type: msgType,
      char_count: content.length,
      char_limit: maxChars,
      data_points_used: parsed.data_points_used || dataPointsUsed,
      language: request.language || "en",
    };
  } catch (error) {
    console.error("AI generation error:", error);
    return generateIntelligentFallback(request);
  }
}

// ─── Smart Subject Line Generator ────────────────────────

function generateSmartSubject(request: OutreachRequest): string {
  const firstName = request.candidate_name?.split(" ")[0] || "there";

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

  if (request.timing_signals?.[0]) {
    return `Timing: ${request.timing_signals[0].trigger.substring(0, 40)}`;
  }

  if (request.role_title) {
    return `${request.role_title} opportunity - ${request.company_name || "Exciting company"}`;
  }

  return `Thought of you, ${firstName}`;
}

// ─── Intelligent Fallback ────────────────────────────────

function generateIntelligentFallback(request: OutreachRequest): OutreachResponse {
  const firstName = request.candidate_name?.split(" ")[0] || "there";
  const intelligenceUsed: string[] = [];
  const msgType = request.message_type || (request.campaign_type === "linkedin" ? "linkedin_inmail" : "email");
  const typeConfig = getMessageTypeConfig(msgType);
  const maxChars = request.char_limit || typeConfig.defaultMaxChars;

  let subject: string | null = "";
  let content = "";

  const primaryHook = request.best_outreach_angle || request.outreach_hooks?.[0];
  if (primaryHook) intelligenceUsed.push("outreach_hooks");

  const timingContext = request.timing_signals?.[0];
  if (timingContext) intelligenceUsed.push("timing_signals");

  const painPoint = request.company_pain_points?.[0];
  if (painPoint) intelligenceUsed.push("company_pain_points");

  if (request.stage === "initial") {
    subject = typeConfig.hasSubject ? generateSmartSubject(request) : null;

    if (msgType === "linkedin_connection") {
      // Ultra-short connection request
      content = `${firstName} - `;
      if (primaryHook) {
        content += `${primaryHook} `;
      } else if (request.candidate_title) {
        content += `Your ${request.candidate_title} background is a great fit. `;
      }
      content += `Worth connecting?`;
    } else if (request.campaign_type === "linkedin" || request.campaign_type === "sms") {
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
      content = `Hi ${firstName},\n\n`;
      if (primaryHook) {
        content += `${primaryHook}\n\n`;
      } else if (request.candidate_company && request.candidate_title) {
        content += `Your work as ${request.candidate_title} at ${request.candidate_company} caught my attention.\n\n`;
      } else {
        content += `Your background stood out for an opportunity I'm working on.\n\n`;
      }
      if (request.role_context?.selling_points) {
        content += `${request.role_context.selling_points}\n\n`;
        intelligenceUsed.push("role_context");
      } else if (request.role_title && request.company_name) {
        content += `We're looking for a ${request.role_title} at ${request.company_name}.\n\n`;
      }
      if (request.match_reasons?.length) {
        content += `Why you specifically:\n`;
        content += request.match_reasons.slice(0, 2).map(r => `\u2022 ${r}`).join("\n");
        content += "\n\n";
        intelligenceUsed.push("match_reasons");
      }
      if (timingContext) {
        content += `Given ${(timingContext.trigger || "recent developments").toLowerCase()}, thought this might be interesting timing.\n\n`;
      }
      content += `Would you be open to a brief conversation?\n\nBest regards`;
    }
  } else if (request.stage === "follow_up_1") {
    subject = typeConfig.hasSubject ? `Quick thought, ${firstName}` : null;
    content = `Hi ${firstName},\n\nFollowing up on my earlier message. `;
    if (timingContext) {
      content += `I noticed ${(timingContext.trigger || "recent changes").toLowerCase()} - `;
    }
    if (primaryHook && primaryHook !== request.outreach_hooks?.[0]) {
      content += `${primaryHook}\n\n`;
    } else if (request.intelligence_score && request.intelligence_score >= 70) {
      content += `Based on your profile, I genuinely think this could be aligned with where you want to go.\n\n`;
      intelligenceUsed.push("intelligence_score");
    } else {
      content += `I think this could be worth exploring.\n\n`;
    }
    content += `Happy to share more details whenever works for you.\n\nBest regards`;
  } else {
    subject = typeConfig.hasSubject ? `One last note, ${firstName}` : null;
    content = `Hi ${firstName},\n\nFinal follow-up on the ${request.role_title || "opportunity"} I mentioned.\n\n`;
    if (primaryHook) {
      content += `What really stands out is: ${primaryHook}\n\n`;
    }
    content += `No worries if the timing isn't right. Door's always open.\n\nBest regards`;
  }

  // Enforce character limit on fallback too
  if (content.length > maxChars) {
    content = truncateToCharLimit(content, maxChars);
  }

  const personalizationScore = Math.min(100, Math.round((intelligenceUsed.length / 10) * 100));

  return {
    subject,
    content,
    stage: request.stage,
    generated_at: new Date().toISOString(),
    intelligence_used: intelligenceUsed,
    personalization_score: personalizationScore,
    message_type: msgType,
    char_count: content.length,
    char_limit: maxChars,
    data_points_used: intelligenceUsed,
    language: request.language || "en",
  };
}

// ─── HTTP Handler ────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: OutreachRequest = await req.json();

    if (!request.candidate_name) {
      return new Response(
        JSON.stringify({ error: "Missing required field: candidate_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!request.campaign_id) request.campaign_id = "direct-outreach";
    if (!request.candidate_id) request.candidate_id = "direct";
    if (!request.stage) request.stage = "initial";
    if (!request.campaign_type) request.campaign_type = "email";

    // Phase 2: Default message_type from campaign_type
    if (!request.message_type) {
      request.message_type = request.campaign_type === "linkedin" ? "linkedin_inmail" : "email";
    }

    const result = await generateHyperPersonalized(request);

    console.log(`Generated ${result.message_type || "outreach"} for ${request.candidate_name}:`, {
      stage: request.stage,
      message_type: result.message_type,
      char_count: result.char_count,
      char_limit: result.char_limit,
      language: result.language,
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

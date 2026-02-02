// Supabase Edge Function: analyzeCampaignProject
// Advanced AI-powered candidate matching with multi-stage ranking
// Uses: Career trajectory analysis, timing signals, semantic matching, culture fit

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoleContext {
  perfect_fit_criteria?: string;
  selling_points?: string;
  must_haves?: string | string[];  // Can be multiline string or array
  nice_to_haves?: string | string[];  // Can be multiline string or array
  deal_breakers?: string | string[];  // Can be multiline string or array
  target_companies?: string[];
  ideal_background?: string;
  salary_range?: string;
  remote_ok?: boolean;
  experience_level?: string; // 'entry', 'mid', 'senior', 'lead', 'executive'
  role_title?: string;  // Denormalized from wizard
  project_name?: string;  // Denormalized from wizard
  outreach_channel?: string;
  criteria_weights?: Partial<CriteriaWeights>;
  signal_filters?: SignalFilter[];
}

interface Role {
  id: string;
  title: string;
  department?: string;
  location?: string;
  requirements?: string;
  responsibilities?: string;
  salary_range?: string;
  employment_type?: string;
}

interface Campaign {
  id: string;
  name: string;
  role_context?: RoleContext;
  role_title?: string;
  company_name?: string;
  nest_id?: string;
}

interface Candidate {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  current_title?: string;
  job_title?: string;
  current_company?: string;
  company_name?: string;
  location?: string;
  person_home_location?: string;
  skills?: string[];
  tags?: string[];
  years_experience?: number;
  education?: any;
  certifications?: string[];
  salary_expectation?: number;
  // Intelligence data from SYNC Intel
  intelligence_score?: number;
  intelligence_level?: string;
  recommended_approach?: string;
  best_outreach_angle?: string;
  timing_signals?: TimingSignal[];
  outreach_hooks?: string[];
  company_pain_points?: PainPoint[];
  key_insights?: string[];
  career_trajectory?: string;
  flight_risk_factors?: string[];
  notes?: string;
}

interface TimingSignal {
  trigger: string;
  urgency: 'high' | 'medium' | 'low';
  explanation?: string;
}

interface PainPoint {
  pain: string;
  opportunity?: string;
}

interface MatchResult {
  candidate_id: string;
  candidate_name: string;
  match_score: number;
  match_reasons: string[];
  ai_analysis?: string;
  priority_rank?: number;
  intelligence_score: number;
  recommended_approach: string;
  best_outreach_angle?: string;
  timing_signals?: TimingSignal[];
  outreach_hooks?: string[];
  company_pain_points?: PainPoint[];
  match_factors?: MatchFactors;
  signals_matched?: Array<{ id: string; boost: number }>;
  signal_boost_applied?: number;
}

interface MatchFactors {
  skills_fit: number;
  experience_fit: number;
  title_fit: number;
  location_fit: number;
  timing_score: number;
  culture_fit: number;
  overall_confidence: number;
}

interface CriteriaWeights {
  skills_fit: number;
  experience_fit: number;
  title_fit: number;
  location_fit: number;
  timing_score: number;
  culture_fit: number;
}

interface SignalFilter {
  id: string;
  enabled: boolean;
  boost: number;
  required: boolean;
}

interface SignalDefinition {
  id: string;
  patterns: string[] | null;
  fields: string[];
}

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: "ma_activity",
    patterns: ["M&A", "merger", "acquisition", "acquired", "acquiring", "buyout"],
    fields: ["timing_signals", "recent_ma_news", "intelligence_factors"],
  },
  {
    id: "layoffs",
    patterns: ["layoff", "restructur", "downsiz", "RIF", "workforce reduction"],
    fields: ["timing_signals", "company_pain_points"],
  },
  {
    id: "leadership_change",
    patterns: ["new CEO", "new CTO", "leadership change", "new management"],
    fields: ["timing_signals", "company_pain_points"],
  },
  {
    id: "funding_round",
    patterns: ["funding", "raised", "Series", "investment round", "IPO"],
    fields: ["timing_signals", "key_insights"],
  },
  {
    id: "recent_promotion",
    patterns: ["promot", "new role", "elevated to"],
    fields: ["timing_signals", "key_insights"],
  },
  {
    id: "tenure_anniversary",
    patterns: ["anniversary", "2 year", "3 year", "5 year", "tenure"],
    fields: ["timing_signals"],
  },
  {
    id: "stagnation",
    patterns: ["stagnant", "no promotion", "same role", "plateau"],
    fields: ["key_insights", "intelligence_factors"],
  },
  {
    id: "high_flight_risk",
    patterns: null,
    fields: ["intelligence_score"],
  },
];

const DEFAULT_WEIGHTS: CriteriaWeights = {
  skills_fit: 20,
  experience_fit: 20,
  title_fit: 15,
  location_fit: 10,
  timing_score: 20,
  culture_fit: 15,
};

function validateAndNormalizeWeights(raw: Partial<CriteriaWeights> | undefined): CriteriaWeights {
  if (!raw) return { ...DEFAULT_WEIGHTS };
  const weights: CriteriaWeights = {
    skills_fit: raw.skills_fit ?? DEFAULT_WEIGHTS.skills_fit,
    experience_fit: raw.experience_fit ?? DEFAULT_WEIGHTS.experience_fit,
    title_fit: raw.title_fit ?? DEFAULT_WEIGHTS.title_fit,
    location_fit: raw.location_fit ?? DEFAULT_WEIGHTS.location_fit,
    timing_score: raw.timing_score ?? DEFAULT_WEIGHTS.timing_score,
    culture_fit: raw.culture_fit ?? DEFAULT_WEIGHTS.culture_fit,
  };
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  if (total === 0) return { ...DEFAULT_WEIGHTS };
  if (total !== 100) {
    const scale = 100 / total;
    for (const key of Object.keys(weights) as (keyof CriteriaWeights)[]) {
      weights[key] = Math.round(weights[key] * scale);
    }
  }
  return weights;
}

function calculateWeightedScore(factors: MatchFactors, weights: CriteriaWeights): number {
  return Math.round(
    factors.skills_fit * (weights.skills_fit / 100) +
    factors.experience_fit * (weights.experience_fit / 100) +
    factors.title_fit * (weights.title_fit / 100) +
    factors.location_fit * (weights.location_fit / 100) +
    factors.timing_score * (weights.timing_score / 100) +
    factors.culture_fit * (weights.culture_fit / 100)
  );
}

// Helper function to normalize string or array values to array
function normalizeToArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Parse multiline string into array, removing bullet points
    return value
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }
  return [];
}

// ============================================
// SIGNAL DETECTION FUNCTIONS
// Detect and score candidates based on career/timing signals
// ============================================
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((curr, key) => curr?.[key], obj);
}

function candidateHasSignal(candidate: any, signalId: string): boolean {
  const signalDef = SIGNAL_DEFINITIONS.find(s => s.id === signalId);
  if (!signalDef) return false;

  if (signalId === "high_flight_risk") {
    return (candidate.intelligence_score || 0) >= 70;
  }

  if (!signalDef.patterns) return false;

  const patternsRegex = new RegExp(signalDef.patterns.join("|"), "i");

  for (const field of signalDef.fields) {
    const value = getNestedValue(candidate, field);

    if (typeof value === "string" && patternsRegex.test(value)) {
      return true;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const text = typeof item === "string" ? item :
                     item?.trigger || item?.reason || JSON.stringify(item);
        if (patternsRegex.test(text)) {
          return true;
        }
      }
    }
  }

  return false;
}

function calculateSignalBoost(candidate: any, signalFilters: SignalFilter[]): { totalBoost: number; matchedSignals: Array<{ id: string; boost: number }> } {
  let totalBoost = 0;
  const matchedSignals: Array<{ id: string; boost: number }> = [];

  for (const filter of signalFilters) {
    if (!filter.enabled) continue;

    const hasSignal = candidateHasSignal(candidate, filter.id);
    if (hasSignal) {
      totalBoost += filter.boost;
      matchedSignals.push({ id: filter.id, boost: filter.boost });
    }
  }

  return { totalBoost, matchedSignals };
}

function passesRequiredSignals(candidate: any, signalFilters: SignalFilter[]): boolean {
  const requiredFilters = signalFilters.filter(f => f.enabled && f.required);

  for (const filter of requiredFilters) {
    if (!candidateHasSignal(candidate, filter.id)) {
      return false;
    }
  }

  return true;
}

// ============================================
// STAGE 1: Quick Pre-Filter (Rule-based)
// Eliminates obviously unqualified candidates
// ============================================
function preFilterCandidate(
  candidate: Candidate,
  role: Role,
  roleContext: RoleContext | undefined
): { passes: boolean; quickScore: number; reasons: string[] } {
  const candidateTitle = (candidate.current_title || candidate.job_title || "").toLowerCase();
  const roleTitle = role.title.toLowerCase();
  const reasons: string[] = [];
  let quickScore = 0;

  // Check deal breakers first (instant disqualification)
  const dealBreakers = normalizeToArray(roleContext?.deal_breakers);
  if (dealBreakers.length > 0) {
    const candidateText = `${candidateTitle} ${candidate.notes || ''} ${candidate.current_company || ''}`.toLowerCase();
    for (const breaker of dealBreakers) {
      if (candidateText.includes(breaker.toLowerCase())) {
        return { passes: false, quickScore: 0, reasons: [`Deal breaker: ${breaker}`] };
      }
    }
  }

  // Check required signals (instant disqualification if missing)
  const signalFilters: SignalFilter[] = roleContext?.signal_filters || [];
  if (!passesRequiredSignals(candidate, signalFilters)) {
    return { passes: false, quickScore: 0, reasons: [`Missing required signals`] };
  }

  // Title relevance check (must have SOME relevance)
  const titleWords = roleTitle.split(/\s+/).filter(w => w.length > 2);
  const titleMatches = titleWords.filter(w => candidateTitle.includes(w)).length;
  const titleRelevance = titleMatches / Math.max(titleWords.length, 1);

  if (titleRelevance > 0) {
    quickScore += 20;
    reasons.push("Title relevant");
  }

  // Skills check (basic)
  if (candidate.skills && role.requirements) {
    const reqLower = role.requirements.toLowerCase();
    const matchedSkills = candidate.skills.filter(s => reqLower.includes(s.toLowerCase()));
    if (matchedSkills.length > 0) {
      quickScore += Math.min(matchedSkills.length * 5, 25);
      reasons.push(`${matchedSkills.length} skills match`);
    }
  }

  // Must-haves check (critical)
  const mustHaves = normalizeToArray(roleContext?.must_haves);
  if (mustHaves.length > 0) {
    const candidateText = `${candidateTitle} ${candidate.skills?.join(' ') || ''} ${candidate.certifications?.join(' ') || ''}`.toLowerCase();
    const matchedMustHaves = mustHaves.filter(mh => candidateText.includes(mh.toLowerCase()));
    const coverage = matchedMustHaves.length / mustHaves.length;

    if (coverage >= 0.5) {
      quickScore += 15;
      reasons.push(`${matchedMustHaves.length}/${mustHaves.length} must-haves`);
    }
  }

  // Intelligence/timing bonus (high value candidates)
  if (candidate.intelligence_score && candidate.intelligence_score >= 60) {
    quickScore += 15;
    reasons.push("High timing score");
  }

  // Target company bonus
  if (roleContext?.target_companies && candidate.current_company) {
    const isTarget = roleContext.target_companies.some(tc =>
      (candidate.current_company || '').toLowerCase().includes(tc.toLowerCase())
    );
    if (isTarget) {
      quickScore += 20;
      reasons.push("From target company");
    }
  }

  // Pass if score is above threshold OR has high intelligence score (good timing)
  const passes = quickScore >= 20 || (candidate.intelligence_score || 0) >= 70;

  return { passes, quickScore, reasons };
}

// ============================================
// STAGE 2: Deep AI Analysis
// Sophisticated matching for shortlisted candidates
// ============================================
async function deepAIAnalysis(
  candidates: Candidate[],
  role: Role,
  roleContext: RoleContext | undefined,
  groqApiKey: string,
  weights: CriteriaWeights = DEFAULT_WEIGHTS
): Promise<Map<string, { score: number; reasons: string[]; analysis: string; factors: MatchFactors }>> {
  const results = new Map();

  // Batch candidates for efficiency (analyze up to 5 at a time in prompt context)
  const batchSize = 5;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);

    const candidateProfiles = batch.map((c, idx) => `
--- CANDIDATE ${idx + 1} (ID: ${c.id}) ---
Name: ${c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown'}
Title: ${c.current_title || c.job_title || 'Unknown'}
Company: ${c.current_company || c.company_name || 'Unknown'}
Location: ${c.location || c.person_home_location || 'Unknown'}
Experience: ${c.years_experience || 'Unknown'} years
Skills: ${c.skills?.join(', ') || 'Not specified'}
Certifications: ${c.certifications?.join(', ') || 'None'}

INTELLIGENCE DATA:
- Flight Risk: ${c.intelligence_score || 0}% ${c.intelligence_level ? `(${c.intelligence_level})` : ''}
- Career Trajectory: ${c.career_trajectory || 'Unknown'}
- Best Outreach Angle: ${c.best_outreach_angle || 'Not analyzed'}
- Timing Signals: ${c.timing_signals?.map(t => `${t.trigger} (${t.urgency})`).join('; ') || 'None'}
- Key Insights: ${c.key_insights?.slice(0, 3).join('; ') || 'None'}
- Outreach Hooks: ${c.outreach_hooks?.slice(0, 2).join('; ') || 'None'}
`).join('\n');

    const roleProfile = `
ROLE: ${role.title}
Department: ${role.department || 'Not specified'}
Location: ${role.location || 'Remote/Flexible'}

REQUIREMENTS:
${role.requirements || 'Not specified'}

RESPONSIBILITIES:
${role.responsibilities || 'Not specified'}

${roleContext ? `
RECRUITER'S CONTEXT:
- Perfect Candidate: ${roleContext.perfect_fit_criteria || 'Not specified'}
- Must-Have Skills/Experience: ${normalizeToArray(roleContext.must_haves).join(', ') || 'Not specified'}
- Deal Breakers: ${normalizeToArray(roleContext.deal_breakers).join(', ') || 'None'}
- Target Companies to Poach From: ${roleContext.target_companies?.join(', ') || 'Any'}
- Ideal Background: ${roleContext.ideal_background || 'Not specified'}
- Experience Level: ${roleContext.experience_level || 'Not specified'}
- Remote OK: ${roleContext.remote_ok !== false ? 'Yes' : 'No'}
` : ''}
`;

    const prompt = `You are an elite executive recruiter with 20+ years of experience. Analyze these candidates for the role.

${roleProfile}

CANDIDATES TO ANALYZE:
${candidateProfiles}

For EACH candidate, provide a comprehensive analysis considering:

1. **SKILLS FIT (0-100)**: How well do their skills match requirements? Consider both explicit matches and transferable skills.

2. **EXPERIENCE FIT (0-100)**: Is their seniority level appropriate? Too junior/senior is a problem.

3. **TITLE FIT (0-100)**: Does their current title align with this role? Consider lateral moves and step-ups.

4. **LOCATION FIT (0-100)**: Are they in the right location or is remote work viable?

5. **TIMING SCORE (0-100)**: Based on flight risk, timing signals - how likely are they to be open to this NOW? This is CRITICAL.

6. **CULTURE FIT (0-100)**: Based on company background, career trajectory - would they thrive here?

7. **OVERALL MATCH**: Weighted combination (Skills ${weights.skills_fit}%, Experience ${weights.experience_fit}%, Title ${weights.title_fit}%, Location ${weights.location_fit}%, Timing ${weights.timing_score}%, Culture ${weights.culture_fit}%)

Respond with JSON array for ALL candidates:
[
  {
    "candidate_id": "<id>",
    "overall_score": <0-100>,
    "factors": {
      "skills_fit": <0-100>,
      "experience_fit": <0-100>,
      "title_fit": <0-100>,
      "location_fit": <0-100>,
      "timing_score": <0-100>,
      "culture_fit": <0-100>,
      "overall_confidence": <0-100>
    },
    "reasons": ["<key reason 1>", "<key reason 2>", "<key reason 3>"],
    "analysis": "<1-2 sentence expert assessment>",
    "red_flags": ["<any concerns>"] or [],
    "why_now": "<why this candidate might be open NOW based on timing signals>"
  }
]

Be discriminating. Most candidates are 40-60. Only truly great fits score 70+. Score 80+ is exceptional.`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an elite executive recruiter. Respond ONLY with valid JSON array. No markdown, no explanation outside JSON. Be critical and discriminating in your analysis.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        console.error("Groq API error:", await response.text());
        // Fall back to rule-based for this batch
        for (const c of batch) {
          const fallback = fallbackDeepAnalysis(c, role, roleContext, weights);
          results.set(c.id, fallback);
        }
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Parse JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const analyses = JSON.parse(jsonMatch[0]);
          for (const analysis of analyses) {
            results.set(analysis.candidate_id, {
              score: Math.min(Math.max(analysis.overall_score || 0, 0), 100),
              reasons: [...(analysis.reasons || []), analysis.why_now].filter(Boolean),
              analysis: analysis.analysis || "",
              factors: analysis.factors || getDefaultFactors(),
            });
          }
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
        }
      }

      // Add fallback for any candidates not in response
      for (const c of batch) {
        if (!results.has(c.id)) {
          results.set(c.id, fallbackDeepAnalysis(c, role, roleContext, weights));
        }
      }
    } catch (error) {
      console.error("AI batch analysis error:", error);
      for (const c of batch) {
        results.set(c.id, fallbackDeepAnalysis(c, role, roleContext, weights));
      }
    }
  }

  return results;
}

function getDefaultFactors(): MatchFactors {
  return {
    skills_fit: 50,
    experience_fit: 50,
    title_fit: 50,
    location_fit: 50,
    timing_score: 50,
    culture_fit: 50,
    overall_confidence: 50,
  };
}

function fallbackDeepAnalysis(
  candidate: Candidate,
  role: Role,
  roleContext: RoleContext | undefined,
  weights: CriteriaWeights = DEFAULT_WEIGHTS
): { score: number; reasons: string[]; analysis: string; factors: MatchFactors } {
  const factors: MatchFactors = getDefaultFactors();
  const reasons: string[] = [];

  const candidateTitle = (candidate.current_title || candidate.job_title || "").toLowerCase();
  const roleTitle = role.title.toLowerCase();

  // Skills fit
  if (candidate.skills && role.requirements) {
    const reqLower = role.requirements.toLowerCase();
    const matchedSkills = candidate.skills.filter(s => reqLower.includes(s.toLowerCase()));
    factors.skills_fit = Math.min(30 + (matchedSkills.length * 15), 100);
    if (matchedSkills.length > 0) {
      reasons.push(`Skills: ${matchedSkills.slice(0, 3).join(", ")}`);
    }
  }

  // Title fit
  const titleWords = roleTitle.split(/\s+/).filter(w => w.length > 2);
  const matchedWords = titleWords.filter(w => candidateTitle.includes(w));
  factors.title_fit = Math.min(30 + (matchedWords.length / Math.max(titleWords.length, 1)) * 70, 100);
  if (matchedWords.length > 0) {
    reasons.push(`Title alignment: ${matchedWords.join(", ")}`);
  }

  // Experience fit
  if (candidate.years_experience) {
    if (candidate.years_experience >= 3 && candidate.years_experience <= 15) {
      factors.experience_fit = 70;
    } else if (candidate.years_experience > 15) {
      factors.experience_fit = 60; // Might be overqualified
    } else {
      factors.experience_fit = 40; // Junior
    }
  }

  // Location fit
  const candidateLoc = (candidate.location || candidate.person_home_location || "").toLowerCase();
  const roleLoc = (role.location || "").toLowerCase();
  if (candidateLoc && roleLoc) {
    if (candidateLoc.includes(roleLoc) || roleLoc.includes(candidateLoc) ||
        roleLoc.includes("remote") || roleContext?.remote_ok) {
      factors.location_fit = 90;
      reasons.push("Location compatible");
    } else {
      factors.location_fit = 40;
    }
  } else {
    factors.location_fit = 70; // Unknown = neutral
  }

  // Timing score (based on intelligence)
  factors.timing_score = candidate.intelligence_score || 50;
  if (factors.timing_score >= 70) {
    reasons.push("Excellent timing - high flight risk");
  } else if (factors.timing_score >= 50) {
    reasons.push("Good timing signals");
  }

  // Culture fit (based on company tier)
  if (roleContext?.target_companies && candidate.current_company) {
    const isTarget = roleContext.target_companies.some(tc =>
      (candidate.current_company || '').toLowerCase().includes(tc.toLowerCase())
    );
    if (isTarget) {
      factors.culture_fit = 85;
      reasons.push(`From target company: ${candidate.current_company}`);
    } else {
      factors.culture_fit = 60;
    }
  }

  // Calculate overall score (weighted)
  const score = calculateWeightedScore(factors, weights);

  factors.overall_confidence = 60; // Rule-based = lower confidence

  return {
    score,
    reasons,
    analysis: reasons.length > 0 ? reasons.slice(0, 2).join(". ") : "Basic match analysis",
    factors,
  };
}

// ============================================
// STAGE 3: Priority Ranking
// Re-rank top candidates considering timing urgency
// ============================================
function priorityRank(matches: MatchResult[]): MatchResult[] {
  return matches.map((m, idx) => {
    // Boost score for high-urgency timing signals
    let timingBoost = 0;
    if (m.timing_signals?.some(t => t.urgency === 'high')) {
      timingBoost = 5;
    }

    // Boost for having outreach hooks (easier to engage)
    const hookBoost = m.outreach_hooks?.length ? Math.min(m.outreach_hooks.length * 2, 5) : 0;

    return {
      ...m,
      match_score: Math.min(m.match_score + timingBoost + hookBoost, 100),
      priority_rank: idx + 1,
    };
  }).sort((a, b) => b.match_score - a.match_score);
}

serve(async (req) => {
  console.log("=== analyzeCampaignProject started ===");
  console.log("Request received at:", new Date().toISOString());

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables first
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY") || "";

    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGroqApiKey: !!groqApiKey,
      groqKeyLength: groqApiKey?.length || 0
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Missing required Supabase environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      project_id,
      campaign_id,
      organization_id,
      role_id,
      role_context,
      nest_id,           // NEW: Filter candidates from specific nest
      candidate_ids,     // NEW: Analyze specific candidates
      min_score = 30,
      limit = 50,
      use_ai = true,
      deep_analysis = true, // Enable multi-stage analysis
    } = requestBody;

    console.log("Request params:", JSON.stringify({
      campaign_id,
      organization_id,
      project_id,
      role_id,
      nest_id,
      candidate_ids_count: candidate_ids?.length || 0,
      min_score,
      limit,
      has_role_context: !!role_context
    }));

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get campaign with role_context if campaign_id provided
    let campaign: Campaign | null = null;
    let effectiveRoleContext = role_context;
    let campaignNestId = nest_id;

    if (campaign_id) {
      console.log("Fetching campaign:", campaign_id);
      try {
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select("id, name, role_context, role_id, project_id, nest_id")
          .eq("id", campaign_id)
          .single();

        if (campaignError) {
          console.error("Campaign query error:", campaignError);
          throw new Error(`Failed to fetch campaign: ${campaignError.message}`);
        }

        console.log("Campaign data:", JSON.stringify({
          id: campaignData?.id,
          name: campaignData?.name,
          has_role_context: !!campaignData?.role_context,
          role_id: campaignData?.role_id,
          project_id: campaignData?.project_id,
          nest_id: campaignData?.nest_id
        }));

        if (campaignData) {
          campaign = campaignData;
          if (!effectiveRoleContext && campaignData.role_context) {
            effectiveRoleContext = campaignData.role_context;
          }
          // Use campaign's nest_id if not provided in request
          if (!campaignNestId && campaignData.nest_id) {
            campaignNestId = campaignData.nest_id;
          }
        }
      } catch (err) {
        console.error("Error fetching campaign:", err);
        throw err;
      }
    }

    // Extract and normalize criteria weights from role_context
    const criteriaWeights = validateAndNormalizeWeights(effectiveRoleContext?.criteria_weights);
    console.log("Using criteria weights:", criteriaWeights);

    // Get roles to match against - be more flexible with role_context
    let roles: Role[] = [];

    console.log("Fetching roles - role_id:", role_id, "project_id:", project_id);

    if (role_id) {
      try {
        const { data, error } = await supabase
          .from("roles")
          .select("*")
          .eq("id", role_id)
          .eq("organization_id", organization_id)
          .single();

        if (error) {
          console.error("Role query error (by role_id):", error);
          // Don't throw - role might not exist yet, try other methods
        }
        if (data) {
          roles = [data];
          console.log("Found role by role_id:", data.id, data.title);
        }
      } catch (err) {
        console.error("Error fetching role by ID:", err);
      }
    }

    if (roles.length === 0 && project_id) {
      try {
        const { data, error } = await supabase
          .from("roles")
          .select("*")
          .eq("project_id", project_id)
          .eq("organization_id", organization_id)
          .in("status", ["open", "active"]);

        if (error) {
          console.error("Roles query error (by project_id):", error);
        }
        roles = data || [];
        console.log("Found", roles.length, "roles by project_id");
      } catch (err) {
        console.error("Error fetching roles by project_id:", err);
      }
    }

    // If still no roles, try campaign role_title or role_context
    if (roles.length === 0 && campaign?.role_title) {
      // Create synthetic role from campaign's role_title
      console.log("Creating synthetic role from campaign role_title:", campaign.role_title);
      roles = [{
        id: "campaign-role",
        title: campaign.role_title,
        requirements: normalizeToArray(effectiveRoleContext?.must_haves).join(", ") || "",
        responsibilities: effectiveRoleContext?.perfect_fit_criteria || "",
      }];
    }

    // If still no roles, try role_context
    if (roles.length === 0 && effectiveRoleContext) {
      // Create synthetic role purely from role_context (for nest-based matching)
      // Try to get a good title from role_context
      const roleTitle = effectiveRoleContext.role_title ||
                        effectiveRoleContext.ideal_background ||
                        effectiveRoleContext.experience_level ||
                        effectiveRoleContext.perfect_fit_criteria?.substring(0, 50) ||
                        "Target Role";
      console.log("Creating synthetic role from role_context:", roleTitle);
      roles = [{
        id: "context-role",
        title: roleTitle,
        requirements: normalizeToArray(effectiveRoleContext.must_haves).join(", ") || effectiveRoleContext.perfect_fit_criteria || "",
        responsibilities: effectiveRoleContext.perfect_fit_criteria || "",
        location: effectiveRoleContext.remote_ok ? "Remote" : undefined,
      }];
    }

    // If still no roles and no way to create one, return error
    if (roles.length === 0) {
      console.log("No roles found and no role_context provided");
      return new Response(
        JSON.stringify({ error: "Either project_id, role_id, role_context, or campaign with role_title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Using roles:", roles.map(r => ({ id: r.id, title: r.title })));

    // Get candidates - with intelligent filtering based on params
    console.log("Building candidate query...");

    let candidateQuery = supabase
      .from("candidates")
      .select("*")
      .eq("organization_id", organization_id)
      .is("excluded_reason", null);

    // NEW: Filter by specific candidate_ids if provided
    if (candidate_ids && Array.isArray(candidate_ids) && candidate_ids.length > 0) {
      candidateQuery = candidateQuery.in("id", candidate_ids);
      console.log(`Filtering to ${candidate_ids.length} specific candidates`);
    }
    // NEW: Filter by nest if nest_id provided
    else if (campaignNestId) {
      // Try both possible storage patterns for nest candidates
      console.log(`Filtering to candidates from nest: ${campaignNestId}`);
      // Note: Candidates from nests might be stored with nest_id directly or import_source
    }

    console.log("Executing candidate query...");
    let allCandidates: Candidate[] = [];
    try {
      const { data, error: candidatesError } = await candidateQuery;

      if (candidatesError) {
        console.error("Candidates query error:", candidatesError);
        throw new Error(`Failed to fetch candidates: ${candidatesError.message}`);
      }

      allCandidates = data || [];
      console.log(`Found ${allCandidates.length} candidates`);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      throw err;
    }

    // Filter out hired/rejected candidates in code (more reliable than complex query)
    const eligibleCandidates = allCandidates.filter(c =>
      !c.stage || !['hired', 'rejected'].includes(c.stage?.toLowerCase())
    );
    console.log(`After stage filter: ${eligibleCandidates.length} eligible candidates`);

    if (eligibleCandidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, matched_candidates: [], message: "No candidates to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use eligibleCandidates for the matching process
    const candidatesToAnalyze = eligibleCandidates;

    console.log(`Starting smart matching: ${candidatesToAnalyze.length} candidates, ${roles.length} role(s)`);

    const primaryRole = roles[0];
    const allMatches: MatchResult[] = [];

    // STAGE 1: Pre-filter all candidates
    const preFilterResults: { candidate: Candidate; quickScore: number; reasons: string[] }[] = [];

    for (const candidate of candidatesToAnalyze) {
      const result = preFilterCandidate(candidate, primaryRole, effectiveRoleContext);
      if (result.passes) {
        preFilterResults.push({
          candidate,
          quickScore: result.quickScore,
          reasons: result.reasons,
        });
      }
    }

    console.log(`Pre-filter: ${preFilterResults.length}/${candidatesToAnalyze.length} candidates passed`);

    // Sort by quick score and take top candidates for deep analysis
    const sortedPreFilter = preFilterResults.sort((a, b) => b.quickScore - a.quickScore);
    const topCandidatesForAI = sortedPreFilter.slice(0, Math.min(50, sortedPreFilter.length));
    const remainingCandidates = sortedPreFilter.slice(50);

    // STAGE 2: Deep AI Analysis on top candidates (if API available)
    const shouldUseAI = use_ai && deep_analysis && groqApiKey && topCandidatesForAI.length > 0;

    let aiResults: Map<string, { score: number; reasons: string[]; analysis: string; factors: MatchFactors }>;

    if (shouldUseAI) {
      console.log(`Running deep AI analysis on ${topCandidatesForAI.length} top candidates`);
      aiResults = await deepAIAnalysis(
        topCandidatesForAI.map(r => r.candidate),
        primaryRole,
        effectiveRoleContext,
        groqApiKey,
        criteriaWeights
      );
    } else {
      // Fallback to rule-based deep analysis
      aiResults = new Map();
      for (const { candidate } of topCandidatesForAI) {
        aiResults.set(candidate.id, fallbackDeepAnalysis(candidate, primaryRole, effectiveRoleContext, criteriaWeights));
      }
    }

    // Extract signal filters from campaign
    const signalFilters: SignalFilter[] = effectiveRoleContext?.signal_filters || [];

    // Build match results from AI analysis
    for (const { candidate, reasons: preReasons } of topCandidatesForAI) {
      const aiResult = aiResults.get(candidate.id);
      if (aiResult && aiResult.score >= min_score) {
        // Calculate signal boost
        const { totalBoost: signalBoost, matchedSignals } = calculateSignalBoost(candidate, signalFilters);

        // Final score (capped at 0-100)
        const finalScore = Math.min(100, Math.max(0, aiResult.score + signalBoost));

        allMatches.push({
          candidate_id: candidate.id,
          candidate_name: candidate.name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim(),
          match_score: finalScore,
          match_reasons: aiResult.reasons,
          ai_analysis: aiResult.analysis,
          match_factors: aiResult.factors,
          intelligence_score: candidate.intelligence_score || 0,
          recommended_approach: candidate.recommended_approach || "nurture",
          best_outreach_angle: candidate.best_outreach_angle,
          timing_signals: candidate.timing_signals,
          outreach_hooks: candidate.outreach_hooks,
          company_pain_points: candidate.company_pain_points,
          signals_matched: matchedSignals,
          signal_boost_applied: signalBoost,
        });
      }
    }

    // Add remaining candidates with quick scores (for completeness)
    for (const { candidate, quickScore, reasons } of remainingCandidates) {
      if (quickScore >= min_score) {
        // Calculate signal boost
        const { totalBoost: signalBoost, matchedSignals } = calculateSignalBoost(candidate, signalFilters);

        // Final score (capped at 0-100)
        const finalScore = Math.min(100, Math.max(0, quickScore + signalBoost));

        allMatches.push({
          candidate_id: candidate.id,
          candidate_name: candidate.name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim(),
          match_score: finalScore,
          match_reasons: reasons,
          ai_analysis: "Quick match (not AI-analyzed)",
          intelligence_score: candidate.intelligence_score || 0,
          recommended_approach: candidate.recommended_approach || "nurture",
          best_outreach_angle: candidate.best_outreach_angle,
          timing_signals: candidate.timing_signals,
          outreach_hooks: candidate.outreach_hooks,
          company_pain_points: candidate.company_pain_points,
          signals_matched: matchedSignals,
          signal_boost_applied: signalBoost,
        });
      }
    }

    // STAGE 3: Priority ranking
    const rankedMatches = priorityRank(allMatches);
    const finalMatches = rankedMatches.slice(0, limit);

    console.log(`Final results: ${finalMatches.length} matches (${shouldUseAI ? 'AI-powered' : 'rule-based'})`);

    // Get project name
    let projectName: string | null = null;
    if (project_id) {
      const { data: projectData } = await supabase
        .from("projects")
        .select("title, name")
        .eq("id", project_id)
        .single();
      projectName = projectData?.title || projectData?.name || null;
    }

    // Update campaign with matches
    if (campaign_id && finalMatches.length > 0) {
      const matchedCandidatesData = finalMatches.map(m => ({
        candidate_id: m.candidate_id,
        candidate_name: m.candidate_name,
        match_score: m.match_score,
        match_reasons: m.match_reasons,
        ai_analysis: m.ai_analysis,
        match_factors: m.match_factors,
        intelligence_score: m.intelligence_score,
        recommended_approach: m.recommended_approach,
        best_outreach_angle: m.best_outreach_angle,
        timing_signals: m.timing_signals,
        outreach_hooks: m.outreach_hooks,
        signals_matched: m.signals_matched,
        signal_boost_applied: m.signal_boost_applied,
        priority_rank: m.priority_rank,
        status: "matched",
        added_at: new Date().toISOString(),
      }));

      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          matched_candidates: matchedCandidatesData,
          last_matched_at: new Date().toISOString(),
        })
        .eq("id", campaign_id);

      if (updateError) {
        console.error("Error updating campaign:", updateError);
      }

      // Store in candidate_campaign_matches table
      const candidateMatchRecords = finalMatches.map(m => ({
        candidate_id: m.candidate_id,
        campaign_id: campaign_id,
        organization_id: organization_id,
        match_score: m.match_score,
        match_reasons: m.match_reasons,
        intelligence_score: m.intelligence_score,
        recommended_approach: m.recommended_approach,
        best_outreach_angle: m.best_outreach_angle,
        timing_signals: m.timing_signals,
        outreach_hooks: m.outreach_hooks,
        company_pain_points: m.company_pain_points,
        signals_matched: m.signals_matched,
        signal_boost_applied: m.signal_boost_applied,
        status: "matched",
        role_id: role_id || primaryRole?.id || null,
        role_title: primaryRole?.title || campaign?.role_title || null,
        project_id: project_id || null,
        project_name: projectName,
        matched_at: new Date().toISOString(),
      }));

      const { error: matchesError } = await supabase
        .from("candidate_campaign_matches")
        .upsert(candidateMatchRecords, {
          onConflict: "candidate_id,campaign_id",
          ignoreDuplicates: false
        });

      if (matchesError) {
        console.error("Error storing candidate matches:", matchesError);
      }
    }

    console.log("=== analyzeCampaignProject completed successfully ===");
    console.log("Results:", {
      roles_analyzed: roles.length,
      candidates_total: candidatesToAnalyze.length,
      candidates_pre_filtered: preFilterResults.length,
      candidates_ai_analyzed: topCandidatesForAI.length,
      matched_count: finalMatches.length,
      ai_powered: shouldUseAI
    });

    return new Response(
      JSON.stringify({
        success: true,
        roles_analyzed: roles.length,
        candidates_total: candidatesToAnalyze.length,
        candidates_pre_filtered: preFilterResults.length,
        candidates_ai_analyzed: topCandidatesForAI.length,
        matched_candidates: finalMatches,
        ai_powered: shouldUseAI,
        role_context_used: !!effectiveRoleContext,
        analysis_method: shouldUseAI ? "multi-stage-ai" : "rule-based",
        weights_used: criteriaWeights,
        // NEW: Include source info for transparency
        source: {
          nest_id: campaignNestId || null,
          candidate_ids_provided: !!(candidate_ids && candidate_ids.length > 0),
          filtered_by_nest: !!campaignNestId,
        },
        matched_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("=== analyzeCampaignProject FAILED ===");
    console.error("Error type:", error?.constructor?.name || "Unknown");
    console.error("Error message:", error?.message || String(error));
    console.error("Error stack:", error?.stack || "No stack trace");

    return new Response(
      JSON.stringify({
        error: error?.message || "Unknown error occurred",
        error_type: error?.constructor?.name || "Unknown",
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

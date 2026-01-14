// Supabase Edge Function: generateCandidateIntelligence
// Analyzes candidate data to generate flight risk intelligence scores

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CandidateData {
  id: string;
  name: string;
  email: string;
  current_title?: string;
  current_company?: string;
  years_experience?: number;
  location?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    start_date?: string;
    end_date?: string;
  }>;
  linkedin_url?: string;
  created_at: string;
}

interface IntelligenceResult {
  intelligence_score: number;
  intelligence_level: "Low" | "Medium" | "High" | "Critical";
  intelligence_urgency: "Low" | "Medium" | "High";
  intelligence_factors: Array<string | { description: string; weight: number; type?: string }>;
  intelligence_timing: Array<string | { description: string; type: string; date?: string }>;
  recommended_approach: "nurture" | "targeted" | "immediate";
  recommended_timeline: string;
  last_intelligence_update: string;
}

// Analyze candidate data to generate intelligence
function analyzeCandidate(candidate: CandidateData): IntelligenceResult {
  const factors: Array<{ description: string; weight: number; type: string }> = [];
  const timing: Array<{ description: string; type: string; date?: string }> = [];
  let baseScore = 30; // Starting baseline

  // Factor 1: Tenure analysis
  if (candidate.experience && candidate.experience.length > 0) {
    const currentRole = candidate.experience[0];
    if (currentRole.start_date) {
      const startDate = new Date(currentRole.start_date);
      const now = new Date();
      const monthsInRole = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                          (now.getMonth() - startDate.getMonth());
      
      if (monthsInRole >= 18 && monthsInRole <= 36) {
        baseScore += 15;
        factors.push({
          description: `In current role for ${Math.round(monthsInRole / 12)} years - typical transition window`,
          weight: 15,
          type: "risk"
        });
      } else if (monthsInRole > 36) {
        baseScore += 20;
        factors.push({
          description: `${Math.round(monthsInRole / 12)}+ years in role - may be seeking new challenges`,
          weight: 20,
          type: "risk"
        });
      }

      // Work anniversary timing signal
      const anniversaryMonth = startDate.getMonth();
      const currentMonth = now.getMonth();
      if (Math.abs(anniversaryMonth - currentMonth) <= 1) {
        timing.push({
          description: "Work anniversary approaching - common reflection period",
          type: "anniversary",
          date: `${startDate.getMonth() + 1}/${startDate.getDate()}`
        });
        baseScore += 5;
      }
    }
  }

  // Factor 2: Title-based signals
  if (candidate.current_title) {
    const title = candidate.current_title.toLowerCase();
    
    if (title.includes("senior") || title.includes("lead") || title.includes("principal")) {
      factors.push({
        description: "Senior-level position - likely evaluating next career move",
        weight: 10,
        type: "risk"
      });
      baseScore += 10;
    }
    
    if (title.includes("manager") || title.includes("director")) {
      factors.push({
        description: "Management role - higher demand in market",
        weight: 8,
        type: "risk"
      });
      baseScore += 8;
    }
  }

  // Factor 3: In-demand skills
  const hotSkills = ["ai", "machine learning", "kubernetes", "react", "python", "golang", "rust", "typescript"];
  if (candidate.skills) {
    const matchedSkills = candidate.skills.filter(skill => 
      hotSkills.some(hot => skill.toLowerCase().includes(hot))
    );
    
    if (matchedSkills.length >= 3) {
      factors.push({
        description: `Strong in-demand skillset: ${matchedSkills.slice(0, 3).join(", ")}`,
        weight: 15,
        type: "risk"
      });
      baseScore += 15;
    } else if (matchedSkills.length > 0) {
      factors.push({
        description: `Has in-demand skills: ${matchedSkills.join(", ")}`,
        weight: 8,
        type: "risk"
      });
      baseScore += 8;
    }
  }

  // Factor 4: Location-based signals
  if (candidate.location) {
    const techHubs = ["san francisco", "new york", "seattle", "austin", "boston", "london", "berlin"];
    const isInTechHub = techHubs.some(hub => 
      candidate.location?.toLowerCase().includes(hub)
    );
    
    if (isInTechHub) {
      factors.push({
        description: "Located in major tech hub - high recruiter activity",
        weight: 10,
        type: "risk"
      });
      baseScore += 10;
    }
  }

  // Factor 5: Career trajectory
  if (candidate.experience && candidate.experience.length >= 3) {
    factors.push({
      description: "Strong career progression with multiple roles",
      weight: 5,
      type: "risk"
    });
    baseScore += 5;
  }

  // Factor 6: LinkedIn presence
  if (candidate.linkedin_url) {
    factors.push({
      description: "Active LinkedIn profile - visible to recruiters",
      weight: 5,
      type: "neutral"
    });
  }

  // Timing signals - Q1/Q4 are common job search periods
  const currentMonth = new Date().getMonth();
  if (currentMonth === 0 || currentMonth === 1) { // January/February
    timing.push({
      description: "Q1 - New year, peak job search period",
      type: "seasonal"
    });
    baseScore += 5;
  } else if (currentMonth >= 9 && currentMonth <= 11) { // Oct-Dec
    timing.push({
      description: "Q4 - Year-end reflection and planning period",
      type: "seasonal"
    });
    baseScore += 3;
  }

  // Cap the score at 100
  const finalScore = Math.min(Math.max(baseScore, 0), 100);

  // Determine intelligence level
  let intelligenceLevel: "Low" | "Medium" | "High" | "Critical";
  if (finalScore >= 80) {
    intelligenceLevel = "Critical";
  } else if (finalScore >= 60) {
    intelligenceLevel = "High";
  } else if (finalScore >= 40) {
    intelligenceLevel = "Medium";
  } else {
    intelligenceLevel = "Low";
  }

  // Determine urgency
  let urgency: "Low" | "Medium" | "High";
  if (finalScore >= 70 || timing.length >= 2) {
    urgency = "High";
  } else if (finalScore >= 50 || timing.length >= 1) {
    urgency = "Medium";
  } else {
    urgency = "Low";
  }

  // Determine recommended approach
  let approach: "nurture" | "targeted" | "immediate";
  let timeline: string;

  if (finalScore >= 75) {
    approach = "immediate";
    timeline = "Engage within 24-48 hours";
  } else if (finalScore >= 50) {
    approach = "targeted";
    timeline = "Reach out within 1-2 weeks";
  } else {
    approach = "nurture";
    timeline = "Build relationship over 2-4 weeks";
  }

  return {
    intelligence_score: finalScore,
    intelligence_level: intelligenceLevel,
    intelligence_urgency: urgency,
    intelligence_factors: factors,
    intelligence_timing: timing,
    recommended_approach: approach,
    recommended_timeline: timeline,
    last_intelligence_update: new Date().toISOString(),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidate_id, organization_id, batch = false } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let candidates: CandidateData[] = [];

    if (batch) {
      // Process all candidates for the organization
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("organization_id", organization_id);

      if (error) throw error;
      candidates = data || [];
    } else if (candidate_id) {
      // Process single candidate
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidate_id)
        .eq("organization_id", organization_id)
        .single();

      if (error) throw error;
      if (data) candidates = [data];
    } else {
      return new Response(
        JSON.stringify({ error: "Either candidate_id or batch=true is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ id: string; success: boolean; intelligence?: IntelligenceResult; error?: string }> = [];

    for (const candidate of candidates) {
      try {
        const intelligence = analyzeCandidate(candidate);

        // Update the candidate record
        const { error: updateError } = await supabase
          .from("candidates")
          .update({
            intelligence_score: intelligence.intelligence_score,
            intelligence_level: intelligence.intelligence_level,
            intelligence_urgency: intelligence.intelligence_urgency,
            intelligence_factors: intelligence.intelligence_factors,
            intelligence_timing: intelligence.intelligence_timing,
            recommended_approach: intelligence.recommended_approach,
            recommended_timeline: intelligence.recommended_timeline,
            last_intelligence_update: intelligence.last_intelligence_update,
          })
          .eq("id", candidate.id);

        if (updateError) throw updateError;

        results.push({
          id: candidate.id,
          success: true,
          intelligence,
        });
      } catch (err) {
        results.push({
          id: candidate.id,
          success: false,
          error: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: batch ? results : results[0],
      }),
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

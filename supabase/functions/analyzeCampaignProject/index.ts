// Supabase Edge Function: analyzeCampaignProject
// Matches candidates to project requirements using AI analysis

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface Candidate {
  id: string;
  name: string;
  email?: string;
  current_title?: string;
  current_company?: string;
  location?: string;
  skills?: string[];
  tags?: string[];
  intelligence_score?: number;
  intelligence_level?: string;
  recommended_approach?: string;
  notes?: string;
}

interface MatchResult {
  candidate_id: string;
  candidate_name: string;
  match_score: number;
  match_reasons: string[];
  intelligence_score: number;
  recommended_approach: string;
}

// Calculate match score between a candidate and role
function calculateMatchScore(candidate: Candidate, role: Role): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Title match
  if (candidate.current_title && role.title) {
    const candidateTitle = candidate.current_title.toLowerCase();
    const roleTitle = role.title.toLowerCase();
    
    // Extract key words from titles
    const roleTitleWords = roleTitle.split(/\s+/).filter(w => w.length > 2);
    const matchedWords = roleTitleWords.filter(word => candidateTitle.includes(word));
    
    if (matchedWords.length > 0) {
      const titleMatchScore = Math.round((matchedWords.length / roleTitleWords.length) * 25);
      score += titleMatchScore;
      reasons.push(`Title alignment: ${matchedWords.join(", ")}`);
    }
  }

  // Location match
  if (candidate.location && role.location) {
    const candidateLoc = candidate.location.toLowerCase();
    const roleLoc = role.location.toLowerCase();
    
    if (candidateLoc.includes(roleLoc) || roleLoc.includes(candidateLoc) || roleLoc.includes("remote")) {
      score += 15;
      reasons.push("Location compatible");
    }
  }

  // Skills/Requirements match
  if (candidate.skills && role.requirements) {
    const requirementsLower = role.requirements.toLowerCase();
    const matchedSkills = candidate.skills.filter(skill => 
      requirementsLower.includes(skill.toLowerCase())
    );
    
    if (matchedSkills.length > 0) {
      const skillScore = Math.min(matchedSkills.length * 8, 30);
      score += skillScore;
      reasons.push(`Skills match: ${matchedSkills.slice(0, 3).join(", ")}`);
    }
  }

  // Tags match with requirements
  if (candidate.tags && role.requirements) {
    const requirementsLower = role.requirements.toLowerCase();
    const matchedTags = candidate.tags.filter(tag => 
      requirementsLower.includes(tag.toLowerCase())
    );
    
    if (matchedTags.length > 0) {
      score += matchedTags.length * 5;
      reasons.push(`Tags match: ${matchedTags.join(", ")}`);
    }
  }

  // Intelligence score bonus
  if (candidate.intelligence_score) {
    if (candidate.intelligence_score >= 70) {
      score += 15;
      reasons.push("High flight risk - good timing for outreach");
    } else if (candidate.intelligence_score >= 50) {
      score += 8;
      reasons.push("Moderate flight risk - worth exploring");
    }
  }

  // Department match (if both have it)
  if (role.department && candidate.current_title) {
    const deptLower = role.department.toLowerCase();
    const titleLower = candidate.current_title.toLowerCase();
    
    const deptKeywords: Record<string, string[]> = {
      engineering: ["engineer", "developer", "software", "tech"],
      marketing: ["marketing", "growth", "brand", "content"],
      sales: ["sales", "account", "business development"],
      design: ["designer", "ux", "ui", "creative"],
      product: ["product", "pm", "manager"],
      finance: ["finance", "accounting", "analyst"],
      hr: ["hr", "human resources", "recruiter", "talent"],
    };

    for (const [dept, keywords] of Object.entries(deptKeywords)) {
      if (deptLower.includes(dept)) {
        const matched = keywords.some(kw => titleLower.includes(kw));
        if (matched) {
          score += 10;
          reasons.push(`Department alignment: ${role.department}`);
          break;
        }
      }
    }
  }

  // Cap score at 100
  return { score: Math.min(score, 100), reasons };
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

    const { 
      project_id, 
      campaign_id, 
      organization_id,
      role_id,
      min_score = 30,
      limit = 50 
    } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get roles to match against
    let roles: Role[] = [];

    if (role_id) {
      // Single role
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("id", role_id)
        .eq("organization_id", organization_id)
        .single();
      
      if (error) throw error;
      if (data) roles = [data];
    } else if (project_id) {
      // All roles for a project
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("project_id", project_id)
        .eq("organization_id", organization_id)
        .eq("status", "active");
      
      if (error) throw error;
      roles = data || [];
    } else {
      return new Response(
        JSON.stringify({ error: "Either project_id or role_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (roles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, matched_candidates: [], message: "No active roles found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get candidates to analyze
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("*")
      .eq("organization_id", organization_id)
      .in("status", ["active", "passive"])
      .not("stage", "in", '("hired","rejected")');

    if (candidatesError) throw candidatesError;

    // Match candidates against roles
    const allMatches: MatchResult[] = [];

    for (const candidate of candidates || []) {
      let bestMatch = { score: 0, reasons: [] as string[] };
      
      // Find best match across all roles
      for (const role of roles) {
        const match = calculateMatchScore(candidate, role);
        if (match.score > bestMatch.score) {
          bestMatch = match;
        }
      }

      if (bestMatch.score >= min_score) {
        allMatches.push({
          candidate_id: candidate.id,
          candidate_name: candidate.name,
          match_score: bestMatch.score,
          match_reasons: bestMatch.reasons,
          intelligence_score: candidate.intelligence_score || 0,
          recommended_approach: candidate.recommended_approach || "nurture",
        });
      }
    }

    // Sort by match score (descending) and limit results
    const sortedMatches = allMatches
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, limit);

    // If campaign_id provided, update the campaign with matched candidates
    if (campaign_id && sortedMatches.length > 0) {
      const matchedCandidatesData = sortedMatches.map(m => ({
        candidate_id: m.candidate_id,
        match_score: m.match_score,
        match_reasons: m.match_reasons,
        status: "matched",
        added_at: new Date().toISOString(),
      }));

      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ matched_candidates: matchedCandidatesData })
        .eq("id", campaign_id);

      if (updateError) {
        console.error("Error updating campaign:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        roles_analyzed: roles.length,
        candidates_analyzed: candidates?.length || 0,
        matched_candidates: sortedMatches,
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

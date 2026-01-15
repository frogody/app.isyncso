// Supabase Edge Function: generateCandidateIntelligence
// AI-powered recruiter intelligence that analyzes candidate data to predict receptiveness

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

interface CandidateData {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  company_name?: string;
  company_size?: string;
  company_employee_count?: number;
  company_type?: string;
  company_hq?: string;
  company_domain?: string;
  company_description?: string;
  industry?: string;
  person_home_location?: string;
  linkedin_profile?: string;
  years_at_company?: number;
  times_promoted?: number;
  times_company_hopped?: number;
  avg_promotion_threshold?: number;
  recent_ma_news?: string;
  career_changes?: string;
  job_satisfaction?: string;
  job_satisfaction_analysis?: string;
  job_satisfaction_reasoning?: string;
  recruitment_urgency?: string;
  outreach_urgency_reasoning?: string;
  salary_range?: number;
  salary_intelligence?: string;
  market_position?: string;
  experience_analysis?: string;
  experience_report?: string;
  estimated_age_range?: string;
  skills?: string[];
}

// Company intelligence from Explorium enrichment
interface CompanyIntelligence {
  firmographics?: {
    industry?: string;
    employee_count_range?: string;
    employee_count?: number;
    revenue_range?: string;
    founded_year?: number;
    company_type?: string;
    headquarters?: string;
  };
  technographics?: {
    tech_stack?: Array<{ category: string; technologies: string[] }>;
    tech_count?: number;
  };
  employee_ratings?: {
    overall_rating?: number;
    culture_rating?: number;
    work_life_balance?: number;
    compensation_rating?: number;
    career_opportunities?: number;
    management_rating?: number;
    recommend_percent?: number;
    ceo_approval?: number;
    review_count?: number;
  };
  funding?: {
    total_funding?: number;
    funding_stage?: string;
    last_funding_date?: string;
    funding_rounds?: Array<{ round_type: string; amount: number; date: string }>;
    is_public?: boolean;
    ipo_date?: string;
  };
  workforce?: {
    total_employees?: number;
    departments?: Array<{ name: string; percentage: number }>;
    growth_rate?: number;
    attrition_rate?: number;
  };
  competitive_landscape?: {
    competitors?: Array<{ name: string; domain?: string; similarity_score?: number }>;
  };
  website_traffic?: {
    monthly_visits?: number;
    unique_visitors?: number;
    bounce_rate?: number;
    rank?: number;
  };
}

interface CompanyCorrelation {
  observation: string;
  inference: string;
  outreach_angle: string;
}

interface IntelligenceFactor {
  signal: string;
  insight: string;
  impact: "positive" | "neutral" | "negative";
  weight: number;
}

interface TimingSignal {
  trigger: string;
  window: string;
  urgency: "high" | "medium" | "low";
}

interface IntelligenceResult {
  intelligence_score: number;
  intelligence_level: "Low" | "Medium" | "High" | "Critical";
  intelligence_urgency: "Low" | "Medium" | "High";
  intelligence_factors: IntelligenceFactor[];
  intelligence_timing: TimingSignal[];
  key_insights: string[];
  outreach_hooks: string[];
  risk_summary: string;
  recommended_approach: "nurture" | "targeted" | "immediate";
  recommended_timeline: string;
  best_outreach_angle: string;
  last_intelligence_update: string;
  // New company-enriched fields
  inferred_skills?: string[];
  company_pain_points?: string[];
  lateral_opportunities?: string[];
  company_correlations?: CompanyCorrelation[];
}

// Helper: Format tech stack for prompt
function formatTechStack(techStack?: Array<{ category: string; technologies: string[] }>): string {
  if (!techStack || techStack.length === 0) return 'Not available';
  return techStack.map(cat => `${cat.category}: ${cat.technologies.join(', ')}`).join('\n');
}

// Helper: Format competitors for prompt
function formatCompetitors(competitors?: Array<{ name: string; similarity_score?: number }>): string {
  if (!competitors || competitors.length === 0) return 'Not available';
  return competitors.slice(0, 5).map(c => c.name).join(', ');
}

// Helper: Format departments for prompt
function formatDepartments(departments?: Array<{ name: string; percentage: number }>): string {
  if (!departments || departments.length === 0) return 'Not available';
  return departments.slice(0, 6).map(d => `${d.name} (${d.percentage}%)`).join(', ');
}

// Build the analysis prompt
function buildPrompt(candidate: CandidateData, companyIntel?: CompanyIntelligence): string {
  const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unknown';

  // Build company intelligence section if available
  const companyIntelSection = companyIntel ? `

EXPLORIUM COMPANY INTELLIGENCE (Use for sophisticated correlations):
====================================================================

TECHNOLOGY STACK:
${formatTechStack(companyIntel.technographics?.tech_stack)}
Total Technologies: ${companyIntel.technographics?.tech_count || 'Unknown'}

EMPLOYEE RATINGS (Glassdoor-style):
Overall: ${companyIntel.employee_ratings?.overall_rating ?? 'N/A'}/5
Culture: ${companyIntel.employee_ratings?.culture_rating ?? 'N/A'}/5
Work-Life Balance: ${companyIntel.employee_ratings?.work_life_balance ?? 'N/A'}/5
Compensation: ${companyIntel.employee_ratings?.compensation_rating ?? 'N/A'}/5
Career Opportunities: ${companyIntel.employee_ratings?.career_opportunities ?? 'N/A'}/5
Management: ${companyIntel.employee_ratings?.management_rating ?? 'N/A'}/5
Would Recommend: ${companyIntel.employee_ratings?.recommend_percent ?? 'N/A'}%
CEO Approval: ${companyIntel.employee_ratings?.ceo_approval ?? 'N/A'}%
Based on ${companyIntel.employee_ratings?.review_count ?? 0} reviews

FUNDING & FINANCIAL:
Stage: ${companyIntel.funding?.funding_stage || 'Unknown'}
Total Raised: ${companyIntel.funding?.total_funding ? `$${(companyIntel.funding.total_funding / 1000000).toFixed(1)}M` : 'Unknown'}
Public Company: ${companyIntel.funding?.is_public ? 'Yes' : 'No'}
${companyIntel.funding?.is_public && companyIntel.funding?.ipo_date ? `IPO Date: ${companyIntel.funding.ipo_date}` : ''}

WORKFORCE:
Total Employees: ${companyIntel.workforce?.total_employees?.toLocaleString() || 'Unknown'}
Growth Rate: ${companyIntel.workforce?.growth_rate !== undefined ? `${companyIntel.workforce.growth_rate}%` : 'Unknown'}
Attrition Rate: ${companyIntel.workforce?.attrition_rate !== undefined ? `${companyIntel.workforce.attrition_rate}%` : 'Unknown'}
Department Breakdown: ${formatDepartments(companyIntel.workforce?.departments)}

WEBSITE TRAFFIC:
Monthly Visits: ${companyIntel.website_traffic?.monthly_visits?.toLocaleString() || 'Unknown'}
Global Rank: ${companyIntel.website_traffic?.rank?.toLocaleString() || 'Unknown'}

COMPETITORS:
${formatCompetitors(companyIntel.competitive_landscape?.competitors)}
` : '';

  const correlationInstructions = companyIntel ? `

COMPANY-CANDIDATE CORRELATION ANALYSIS:
=======================================
You have rich company intelligence data. Generate sophisticated correlations:

1. **TECH STACK + ROLE MATCHING**:
   - Match company technologies to candidate's job title
   - Finance roles + SAP/Oracle/NetSuite/QuickBooks = ERP proficiency
   - Sales roles + Salesforce/HubSpot = CRM expertise
   - Engineering + specific frameworks = direct tech experience
   - HR roles + Workday/BambooHR/ADP = HRIS experience
   - Marketing + HubSpot/Marketo = automation expertise
   - Generate "inferred_skills" based on these matches

2. **EMPLOYEE RATINGS + FLIGHT RISK**:
   - Low ratings (<3.5) + long tenure = potential golden handcuffs
   - Low career opportunities + no promotions = blocked growth
   - Low work-life balance = potential burnout
   - High attrition rate = colleagues leaving, reflection trigger
   - Generate "company_pain_points" from low ratings

3. **FUNDING + COMPENSATION STRATEGY**:
   - Series A/B = startup equity considerations, vesting schedules
   - Series C+ = competitive comp, need strong value prop
   - Public company = RSU vesting cycles affect timing
   - Recent funding = cash-rich, hard to outcompete on salary

4. **WORKFORCE + ROLE VALUE**:
   - Small department % + senior title = specialized critical role
   - Large department % + IC = potentially replaceable
   - High growth rate = scaling experience valuable
   - Declining headcount = layoff risk, proactive timing

5. **COMPETITORS AS OPPORTUNITIES**:
   - List competitors as "lateral_opportunities" for outreach
   - Frame as "similar companies you might consider"
` : '';

  return `You are an elite recruiter intelligence analyst. Your job is to analyze candidate data and determine how likely this person is to respond positively to a job opportunity outreach.

CANDIDATE PROFILE:
==================
Name: ${name}
Current Role: ${candidate.job_title || 'Unknown'}
Company: ${candidate.company_name || 'Unknown'}
Industry: ${candidate.industry || 'Unknown'}
Location: ${candidate.person_home_location || 'Unknown'}
LinkedIn: ${candidate.linkedin_profile ? 'Yes' : 'No'}

CAREER METRICS:
===============
Years at Current Company: ${candidate.years_at_company ?? 'Unknown'}
Times Promoted: ${candidate.times_promoted ?? 'Unknown'}
Company Changes (Job Hopping): ${candidate.times_company_hopped ?? 'Unknown'}
Average Promotion Threshold: ${candidate.avg_promotion_threshold ? `${candidate.avg_promotion_threshold} years` : 'Unknown'}
Estimated Age Range: ${candidate.estimated_age_range || 'Unknown'}

COMPANY INTELLIGENCE:
====================
Company Size: ${candidate.company_size || 'Unknown'}
Employee Count: ${candidate.company_employee_count ?? 'Unknown'}
Company Type: ${candidate.company_type || 'Unknown'}
Headquarters: ${candidate.company_hq || 'Unknown'}
Website: ${candidate.company_domain || 'Unknown'}
Company Description: ${candidate.company_description || 'Not available'}

RECENT M&A / NEWS:
==================
${candidate.recent_ma_news || 'No recent M&A news available'}

CAREER ANALYSIS:
================
Career Changes: ${candidate.career_changes || 'Not available'}
Experience Report: ${candidate.experience_report || 'Not available'}

JOB SATISFACTION SIGNALS:
=========================
${candidate.job_satisfaction || candidate.job_satisfaction_analysis || 'Not analyzed yet'}

COMPENSATION INTELLIGENCE:
==========================
Salary Range: ${candidate.salary_range ? `$${candidate.salary_range.toLocaleString()}` : 'Unknown'}
Market Position: ${candidate.market_position || 'Unknown'}
Salary Intelligence: ${candidate.salary_intelligence || 'Not available'}

SKILLS:
=======
${candidate.skills?.join(', ') || 'Not specified'}
${companyIntelSection}
---

ANALYSIS INSTRUCTIONS:${correlationInstructions}
Analyze ALL the data above and generate a comprehensive recruiter intelligence report. Consider:

1. **STAGNATION SIGNALS**:
   - Has this person been at their company for a long time without promotions?
   - Compare years_at_company vs times_promoted. No promotions in 3+ years = major stagnation signal
   - Is their avg_promotion_threshold being exceeded?

2. **COMPANY INSTABILITY SIGNALS**:
   - Any M&A activity (mergers, acquisitions, layoffs) mentioned in recent_ma_news?
   - Is the company shrinking (negative employee growth)?
   - Has the company been acquired or is undergoing restructuring?
   - These create uncertainty and make people MORE receptive to opportunities

3. **JOB HOPPING PATTERNS**:
   - How many times have they changed companies (times_company_hopped)?
   - Frequent hoppers (3+ changes) are often open to new opportunities
   - Stable employees (0-1 changes) need stronger triggers

4. **CAREER TRAJECTORY**:
   - Are they in a growth phase or plateau?
   - Do their skills match high-demand areas?
   - Is their current role a dead-end or growth position?

5. **COMPENSATION GAPS**:
   - Is their salary below market rate (opportunity to offer more)?
   - Can you provide a meaningful salary bump?

6. **TIMING SIGNALS**:
   - Work anniversaries (1, 2, 3, 5 year marks are common reflection points)
   - Q1 (Jan-Feb) and Q4 (Oct-Dec) are peak job search periods
   - Recent layoffs at their company
   - Post-acquisition uncertainty (6-18 months after M&A)

RESPOND WITH VALID JSON ONLY (no markdown, no explanation outside JSON):
{
  "intelligence_score": <0-100 number, higher = more likely to respond>,
  "intelligence_level": "<Low|Medium|High|Critical>",
  "intelligence_urgency": "<Low|Medium|High>",
  "intelligence_factors": [
    {
      "signal": "<brief signal name>",
      "insight": "<detailed insight about why this matters>",
      "impact": "<positive|neutral|negative for recruitment>",
      "weight": <1-25 points contribution to score>
    }
  ],
  "intelligence_timing": [
    {
      "trigger": "<what event/timing matters>",
      "window": "<when to act>",
      "urgency": "<high|medium|low>"
    }
  ],
  "key_insights": [
    "<3-5 bullet point insights about this candidate's receptiveness>"
  ],
  "outreach_hooks": [
    "<2-3 specific angles to use when reaching out to this person>"
  ],
  "risk_summary": "<one paragraph summary of recruitment potential>",
  "recommended_approach": "<nurture|targeted|immediate>",
  "recommended_timeline": "<specific timeframe like 'Within 48 hours' or 'Over 2-3 weeks'>",
  "best_outreach_angle": "<the single best hook to lead with in outreach>",
  "inferred_skills": [
    "<skills inferred from company tech stack + role match, e.g. 'SAP ERP Administration', 'Salesforce CRM Expert'>"
  ],
  "company_pain_points": [
    "<pain points derived from low ratings to use as outreach hooks, e.g. 'Limited career advancement (2.8/5 rating)'>"
  ],
  "lateral_opportunities": [
    "<competitor company names that could be mentioned as alternative opportunities>"
  ],
  "company_correlations": [
    {
      "observation": "<what data points you connected, e.g. 'Company uses SAP + NetSuite, candidate is Finance Manager'>",
      "inference": "<what this means, e.g. '5+ years likely ERP proficiency with hands-on financial systems experience'>",
      "outreach_angle": "<how to use this in outreach, e.g. 'Highlight opportunity to work with modern cloud-native finance tools'>"
    }
  ]
}

Important scoring guidance:
- 80-100: Critical - Multiple strong signals, act immediately
- 60-79: High - Good signals, prioritize outreach
- 40-59: Medium - Some signals, standard nurturing
- 0-39: Low - Few signals, long-term relationship building

Be specific and actionable. Base your analysis ONLY on the data provided. If data is missing, note that as a limitation but still provide the best analysis possible with available data.`;
}

// Call Together.ai API
async function callLLM(prompt: string): Promise<IntelligenceResult | null> {
  if (!TOGETHER_API_KEY) {
    console.error("TOGETHER_API_KEY not set");
    return null;
  }

  try {
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          {
            role: "system",
            content: "You are a recruiter intelligence analyst. Always respond with valid JSON only, no markdown formatting or code blocks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("LLM API error:", error);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in LLM response");
      return null;
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }

    const result = JSON.parse(jsonStr);
    result.last_intelligence_update = new Date().toISOString();

    return result as IntelligenceResult;
  } catch (error) {
    console.error("LLM call error:", error);
    return null;
  }
}

// Fallback rule-based analysis when LLM fails
function analyzeWithRules(candidate: CandidateData, companyIntel?: CompanyIntelligence): IntelligenceResult {
  const factors: IntelligenceFactor[] = [];
  const timing: TimingSignal[] = [];
  const insights: string[] = [];
  const hooks: string[] = [];
  const inferredSkills: string[] = [];
  const companyPainPoints: string[] = [];
  const lateralOpportunities: string[] = [];
  const companyCorrelations: CompanyCorrelation[] = [];
  let score = 30;

  const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'This candidate';
  const jobTitle = (candidate.job_title || '').toLowerCase();

  // Company intelligence correlations
  if (companyIntel) {
    // Tech Stack + Role Matching
    const techStack = companyIntel.technographics?.tech_stack || [];
    const allTechs = techStack.flatMap(cat => cat.technologies.map(t => t.toLowerCase()));

    // Finance role correlations
    if (jobTitle.includes('finance') || jobTitle.includes('accounting') || jobTitle.includes('controller') || jobTitle.includes('cfo')) {
      const financeTech = ['sap', 'oracle', 'netsuite', 'quickbooks', 'sage', 'workday'];
      const matchedFinanceTech = financeTech.filter(t => allTechs.some(at => at.includes(t)));
      if (matchedFinanceTech.length > 0) {
        inferredSkills.push(...matchedFinanceTech.map(t => `${t.charAt(0).toUpperCase() + t.slice(1)} ERP Administration`));
        companyCorrelations.push({
          observation: `Company uses ${matchedFinanceTech.join(', ')}, candidate is ${candidate.job_title}`,
          inference: `Likely proficient in enterprise ERP/accounting systems with hands-on financial management experience`,
          outreach_angle: `Highlight modern finance tech stack or opportunity to expand ERP expertise`
        });
      }
    }

    // Sales role correlations
    if (jobTitle.includes('sales') || jobTitle.includes('account exec') || jobTitle.includes('business dev') || jobTitle.includes('ae')) {
      const salesTech = ['salesforce', 'hubspot', 'pipedrive', 'zoho'];
      const matchedSalesTech = salesTech.filter(t => allTechs.some(at => at.includes(t)));
      if (matchedSalesTech.length > 0) {
        inferredSkills.push(...matchedSalesTech.map(t => `${t.charAt(0).toUpperCase() + t.slice(1)} CRM Expert`));
        companyCorrelations.push({
          observation: `Company uses ${matchedSalesTech.join(', ')}, candidate is ${candidate.job_title}`,
          inference: `CRM power user with pipeline management and sales process automation experience`,
          outreach_angle: `Emphasize sales tools and tech-enabled selling approach`
        });
      }
    }

    // HR role correlations
    if (jobTitle.includes('hr') || jobTitle.includes('people') || jobTitle.includes('talent') || jobTitle.includes('recruiting')) {
      const hrTech = ['workday', 'bamboohr', 'adp', 'greenhouse', 'lever'];
      const matchedHrTech = hrTech.filter(t => allTechs.some(at => at.includes(t)));
      if (matchedHrTech.length > 0) {
        inferredSkills.push(...matchedHrTech.map(t => `${t.charAt(0).toUpperCase() + t.slice(1)} HRIS Administration`));
        companyCorrelations.push({
          observation: `Company uses ${matchedHrTech.join(', ')}, candidate is ${candidate.job_title}`,
          inference: `HRIS and ATS administration experience with workforce analytics capabilities`,
          outreach_angle: `Highlight HR technology modernization opportunities`
        });
      }
    }

    // Engineering role correlations
    if (jobTitle.includes('engineer') || jobTitle.includes('developer') || jobTitle.includes('devops') || jobTitle.includes('sre')) {
      const engTech = techStack.filter(cat =>
        ['development', 'programming', 'cloud', 'infrastructure', 'devops'].some(k => cat.category.toLowerCase().includes(k))
      ).flatMap(cat => cat.technologies);
      if (engTech.length > 0) {
        inferredSkills.push(...engTech.slice(0, 5).map(t => `${t} Experience`));
        companyCorrelations.push({
          observation: `Company tech stack includes ${engTech.slice(0, 4).join(', ')}`,
          inference: `Direct hands-on experience with these technologies in production environment`,
          outreach_angle: `Match tech stack or highlight opportunity to learn new technologies`
        });
      }
    }

    // Employee ratings pain points
    const ratings = companyIntel.employee_ratings;
    if (ratings) {
      if (ratings.career_opportunities && ratings.career_opportunities < 3.0) {
        companyPainPoints.push(`Limited career advancement opportunities (${ratings.career_opportunities}/5 rating)`);
        score += 10;
        factors.push({
          signal: "Career Growth Blocked",
          insight: `Company has low career opportunities rating (${ratings.career_opportunities}/5) - employees likely seeking growth elsewhere`,
          impact: "positive",
          weight: 10
        });
      }
      if (ratings.management_rating && ratings.management_rating < 3.0) {
        companyPainPoints.push(`Management concerns (${ratings.management_rating}/5 rating)`);
        companyCorrelations.push({
          observation: `Company management rating is ${ratings.management_rating}/5`,
          inference: `Employee frustration with leadership creates openness to better-managed teams`,
          outreach_angle: `Emphasize strong leadership and supportive management culture`
        });
      }
      if (ratings.work_life_balance && ratings.work_life_balance < 3.0) {
        companyPainPoints.push(`Poor work-life balance (${ratings.work_life_balance}/5 rating)`);
        score += 8;
      }
      if (ratings.compensation_rating && ratings.compensation_rating < 3.0) {
        companyPainPoints.push(`Below-market compensation perception (${ratings.compensation_rating}/5 rating)`);
        score += 5;
      }
      if (ratings.overall_rating && ratings.overall_rating < 3.5 && (candidate.years_at_company || 0) > 4) {
        companyCorrelations.push({
          observation: `Low overall rating (${ratings.overall_rating}/5) + ${candidate.years_at_company?.toFixed(1)} years tenure`,
          inference: `Possible golden handcuffs - explore equity/benefits situation, likely frustrated but vested`,
          outreach_angle: `Lead with growth opportunity and team culture, address total comp later`
        });
      }
    }

    // Workforce signals
    const workforce = companyIntel.workforce;
    if (workforce) {
      if (workforce.attrition_rate && workforce.attrition_rate > 20) {
        score += 12;
        factors.push({
          signal: "High Company Attrition",
          insight: `Company has ${workforce.attrition_rate}% attrition rate - colleagues leaving creates reflection moments`,
          impact: "positive",
          weight: 12
        });
        companyCorrelations.push({
          observation: `Company attrition rate is ${workforce.attrition_rate}%`,
          inference: `High turnover means colleagues leaving regularly, triggering career reflection`,
          outreach_angle: `Reference industry opportunities and career advancement`
        });
      }
      if (workforce.growth_rate && workforce.growth_rate < -5) {
        score += 15;
        timing.push({
          trigger: "Company Contraction",
          window: "Immediate - declining headcount signals instability",
          urgency: "high"
        });
      }
    }

    // Funding stage insights
    const funding = companyIntel.funding;
    if (funding) {
      if (funding.funding_stage?.toLowerCase().includes('series a') || funding.funding_stage?.toLowerCase().includes('series b')) {
        companyCorrelations.push({
          observation: `Company is ${funding.funding_stage} stage startup`,
          inference: `Likely has unvested startup equity - timing around vesting schedule matters`,
          outreach_angle: `Discuss equity and timing strategically, consider vesting cliffs`
        });
      }
      if (funding.is_public) {
        companyCorrelations.push({
          observation: `Public company with RSU compensation`,
          inference: `RSU vesting cycles (typically quarterly) affect optimal outreach timing`,
          outreach_angle: `Best timing after vesting periods, lead with compelling growth opportunity`
        });
      }
    }

    // Competitors as lateral opportunities
    const competitors = companyIntel.competitive_landscape?.competitors || [];
    if (competitors.length > 0) {
      lateralOpportunities.push(...competitors.slice(0, 5).map(c => c.name));
    }
  }

  // Stagnation analysis
  if (candidate.years_at_company && candidate.times_promoted !== undefined) {
    const yearsPerPromotion = candidate.times_promoted > 0
      ? candidate.years_at_company / candidate.times_promoted
      : candidate.years_at_company;

    if (candidate.times_promoted === 0 && candidate.years_at_company > 2) {
      score += 25;
      factors.push({
        signal: "Career Stagnation",
        insight: `${candidate.years_at_company.toFixed(1)} years at company with zero promotions suggests limited growth opportunities`,
        impact: "positive",
        weight: 25
      });
      insights.push(`No promotions in ${candidate.years_at_company.toFixed(1)} years - likely frustrated with career growth`);
      hooks.push("Emphasize growth and advancement opportunities in your role");
    } else if (yearsPerPromotion > 3) {
      score += 15;
      factors.push({
        signal: "Slow Progression",
        insight: `Averaging ${yearsPerPromotion.toFixed(1)} years between promotions - below typical career progression`,
        impact: "positive",
        weight: 15
      });
    }
  }

  // Company instability from M&A
  if (candidate.recent_ma_news) {
    const maNews = candidate.recent_ma_news.toLowerCase();
    if (maNews.includes("merger") || maNews.includes("acquisition") || maNews.includes("acquired")) {
      score += 20;
      factors.push({
        signal: "M&A Activity",
        insight: "Recent merger/acquisition creates uncertainty - employees often reassess during transitions",
        impact: "positive",
        weight: 20
      });
      timing.push({
        trigger: "Post-M&A uncertainty",
        window: "6-18 months after announcement",
        urgency: "high"
      });
      insights.push("Company undergoing M&A - perfect time to present stability of a new opportunity");
      hooks.push("Offer stability and clarity while their company is in transition");
    }
    if (maNews.includes("layoff") || maNews.includes("restructur") || maNews.includes("downsiz")) {
      score += 25;
      factors.push({
        signal: "Company Restructuring",
        insight: "Layoffs or restructuring signal instability - employees are actively looking",
        impact: "positive",
        weight: 25
      });
      insights.push("Company instability makes this a high-priority candidate");
    }
  }

  // Job satisfaction signals
  if (candidate.job_satisfaction) {
    const satisfaction = candidate.job_satisfaction.toLowerCase();
    if (satisfaction.includes("switching likelihood: high")) {
      score += 20;
      factors.push({
        signal: "High Switching Intent",
        insight: "Job satisfaction analysis indicates high likelihood of considering new opportunities",
        impact: "positive",
        weight: 20
      });
    } else if (satisfaction.includes("switching likelihood: medium")) {
      score += 10;
      factors.push({
        signal: "Moderate Switching Intent",
        insight: "Some openness to new opportunities detected",
        impact: "positive",
        weight: 10
      });
    }
  }

  // Job hopping pattern
  if (candidate.times_company_hopped !== undefined) {
    if (candidate.times_company_hopped >= 3) {
      score += 15;
      factors.push({
        signal: "Active Job Seeker Pattern",
        insight: `Changed companies ${candidate.times_company_hopped} times - comfortable with job transitions`,
        impact: "positive",
        weight: 15
      });
      insights.push("History of job changes suggests openness to opportunities");
    } else if (candidate.times_company_hopped === 0 && candidate.years_at_company && candidate.years_at_company > 5) {
      factors.push({
        signal: "Loyal Employee",
        insight: "Long tenure with no company changes - may need stronger value proposition",
        impact: "neutral",
        weight: 0
      });
      hooks.push("Focus on what makes this opportunity unique and worth the change");
    }
  }

  // Salary opportunity
  if (candidate.salary_range && candidate.market_position) {
    const position = candidate.market_position.toLowerCase();
    if (position.includes("below") || position.includes("under")) {
      score += 15;
      factors.push({
        signal: "Compensation Gap",
        insight: "Currently paid below market rate - salary increase is a strong motivator",
        impact: "positive",
        weight: 15
      });
      hooks.push(`Highlight competitive compensation above their current $${candidate.salary_range.toLocaleString()}`);
    }
  }

  // Seasonal timing
  const currentMonth = new Date().getMonth();
  if (currentMonth === 0 || currentMonth === 1) {
    timing.push({
      trigger: "New Year Job Search",
      window: "January-February peak hiring season",
      urgency: "high"
    });
    score += 5;
  } else if (currentMonth >= 9 && currentMonth <= 11) {
    timing.push({
      trigger: "Year-End Reflection",
      window: "Q4 career planning period",
      urgency: "medium"
    });
    score += 3;
  }

  // Work anniversary timing
  if (candidate.years_at_company) {
    const years = Math.floor(candidate.years_at_company);
    if ([1, 2, 3, 5, 10].includes(years)) {
      timing.push({
        trigger: `${years}-Year Anniversary`,
        window: "Around anniversary date - common reflection point",
        urgency: "medium"
      });
      insights.push(`${years}-year work anniversary approaching - natural time to consider next steps`);
    }
  }

  // Cap score
  const finalScore = Math.min(Math.max(score, 0), 100);

  // Determine levels
  let level: "Low" | "Medium" | "High" | "Critical";
  let urgency: "Low" | "Medium" | "High";
  let approach: "nurture" | "targeted" | "immediate";
  let timeline: string;

  if (finalScore >= 80) {
    level = "Critical";
    urgency = "High";
    approach = "immediate";
    timeline = "Reach out within 24-48 hours";
  } else if (finalScore >= 60) {
    level = "High";
    urgency = "High";
    approach = "targeted";
    timeline = "Prioritize outreach this week";
  } else if (finalScore >= 40) {
    level = "Medium";
    urgency = "Medium";
    approach = "targeted";
    timeline = "Reach out within 1-2 weeks";
  } else {
    level = "Low";
    urgency = "Low";
    approach = "nurture";
    timeline = "Build relationship over 2-4 weeks";
  }

  // Generate risk summary
  const riskSummary = finalScore >= 60
    ? `${name} shows strong signals of being receptive to new opportunities. ${factors.length > 0 ? factors[0].insight : 'Multiple factors suggest now is a good time to reach out.'}`
    : `${name} shows moderate recruitment potential. Focus on building relationship and identifying trigger events.`;

  // Default hook if none generated
  if (hooks.length === 0) {
    hooks.push("Lead with the opportunity's unique value proposition");
    hooks.push("Mention growth potential and team culture");
  }

  // Default insights if none generated
  if (insights.length === 0) {
    insights.push("Limited data available - recommend gathering more information");
    insights.push("Standard nurturing approach recommended until more signals emerge");
  }

  return {
    intelligence_score: finalScore,
    intelligence_level: level,
    intelligence_urgency: urgency,
    intelligence_factors: factors,
    intelligence_timing: timing,
    key_insights: insights,
    outreach_hooks: hooks,
    risk_summary: riskSummary,
    recommended_approach: approach,
    recommended_timeline: timeline,
    best_outreach_angle: hooks[0] || "Lead with a compelling opportunity description",
    last_intelligence_update: new Date().toISOString(),
    // Company-correlation fields
    inferred_skills: inferredSkills,
    company_pain_points: companyPainPoints,
    lateral_opportunities: lateralOpportunities,
    company_correlations: companyCorrelations,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidate_id, organization_id, batch = false, company_intelligence } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let candidates: CandidateData[] = [];

    if (batch) {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("organization_id", organization_id);

      if (error) throw error;
      candidates = data || [];
    } else if (candidate_id) {
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
        // Try LLM first, fall back to rules
        // Pass company_intelligence for enriched correlations
        const prompt = buildPrompt(candidate, company_intelligence as CompanyIntelligence | undefined);
        let intelligence = await callLLM(prompt);

        if (!intelligence) {
          console.log(`LLM failed for candidate ${candidate.id}, using rule-based fallback`);
          intelligence = analyzeWithRules(candidate, company_intelligence as CompanyIntelligence | undefined);
        }

        // Update the candidate record with all intelligence fields (including new company-correlation fields)
        const { error: updateError } = await supabase
          .from("candidates")
          .update({
            intelligence_score: intelligence.intelligence_score,
            intelligence_level: intelligence.intelligence_level,
            intelligence_urgency: intelligence.intelligence_urgency,
            intelligence_factors: intelligence.intelligence_factors,
            intelligence_timing: intelligence.intelligence_timing,
            key_insights: intelligence.key_insights,
            outreach_hooks: intelligence.outreach_hooks,
            risk_summary: intelligence.risk_summary,
            recommended_approach: intelligence.recommended_approach,
            recommended_timeline: intelligence.recommended_timeline,
            best_outreach_angle: intelligence.best_outreach_angle,
            last_intelligence_update: intelligence.last_intelligence_update,
            // New company-correlation fields
            inferred_skills: intelligence.inferred_skills || [],
            company_pain_points: intelligence.company_pain_points || [],
            lateral_opportunities: intelligence.lateral_opportunities || [],
            company_correlations: intelligence.company_correlations || [],
          })
          .eq("id", candidate.id);

        if (updateError) throw updateError;

        results.push({
          id: candidate.id,
          success: true,
          intelligence,
        });
      } catch (err) {
        console.error(`Error processing candidate ${candidate.id}:`, err);
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

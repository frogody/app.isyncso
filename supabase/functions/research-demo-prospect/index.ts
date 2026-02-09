/**
 * Research Demo Prospect — AI-powered company & prospect research
 *
 * Called from AdminDemos before creating a demo link.
 * Accepts optional Explorium enrichment data for grounded strategy.
 * Uses Together.ai 70B to generate structured demo strategy based on
 * real company data when available, or best-effort inference when not.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

function buildExploriumContext(exploriumData: any, prospectData: any): string {
  if (!exploriumData && !prospectData) return '';

  let ctx = '\n\nVERIFIED DATA FROM EXPLORIUM (use this as ground truth — do NOT contradict it):';

  if (exploriumData?.firmographics) {
    const f = exploriumData.firmographics;
    if (f.description) ctx += `\nCompany Description: ${f.description}`;
    if (f.industry) ctx += `\nIndustry: ${f.industry}`;
    if (f.employee_count_range) ctx += `\nCompany Size: ${f.employee_count_range} employees`;
    if (f.revenue_range) ctx += `\nRevenue: ${f.revenue_range}`;
    if (f.headquarters) ctx += `\nHQ: ${f.headquarters}`;
    if (f.founded_year) ctx += `\nFounded: ${f.founded_year}`;
    if (f.website) ctx += `\nWebsite: ${f.website}`;
  }

  if (exploriumData?.technographics?.tech_stack) {
    const techs = exploriumData.technographics.tech_stack;
    if (Array.isArray(techs) && techs.length > 0) {
      const techList = techs.map((cat: any) =>
        `${cat.category}: ${cat.technologies.slice(0, 5).join(', ')}`
      ).join('; ');
      ctx += `\nTech Stack: ${techList}`;
    }
  }

  if (exploriumData?.funding) {
    const f = exploriumData.funding;
    if (f.total_funding) ctx += `\nTotal Funding: ${f.total_funding}`;
    if (f.funding_stage) ctx += ` (${f.funding_stage})`;
    if (f.last_funding_date) ctx += `\nLast Funding: ${f.last_funding_date}`;
  }

  if (exploriumData?.competitive_landscape?.competitors) {
    const comps = exploriumData.competitive_landscape.competitors.slice(0, 5);
    if (comps.length > 0) {
      ctx += `\nCompetitors: ${comps.map((c: any) => c.name).join(', ')}`;
    }
  }

  if (exploriumData?.workforce?.departments) {
    const depts = exploriumData.workforce.departments.slice(0, 5);
    if (depts.length > 0) {
      ctx += `\nDepartment Breakdown: ${depts.map((d: any) => `${d.name} ${d.percentage}%`).join(', ')}`;
    }
  }

  if (exploriumData?.employee_ratings?.overall_rating) {
    ctx += `\nEmployee Rating: ${exploriumData.employee_ratings.overall_rating}/5`;
    if (exploriumData.employee_ratings.recommend_percent) {
      ctx += ` (${exploriumData.employee_ratings.recommend_percent}% recommend)`;
    }
  }

  if (exploriumData?.website_traffic) {
    const t = exploriumData.website_traffic;
    if (t.monthly_visits) ctx += `\nMonthly Website Visits: ${t.monthly_visits}`;
    if (t.bounce_rate) ctx += ` (bounce rate: ${t.bounce_rate}%)`;
  }

  if (prospectData && !prospectData.error) {
    ctx += '\n\nPROSPECT PROFILE:';
    if (prospectData.job_title) ctx += `\nTitle: ${prospectData.job_title}`;
    if (prospectData.job_department) ctx += `\nDepartment: ${prospectData.job_department}`;
    if (prospectData.job_seniority_level) ctx += `\nSeniority: ${prospectData.job_seniority_level}`;
    if (prospectData.location_city || prospectData.location_country) {
      ctx += `\nLocation: ${[prospectData.location_city, prospectData.location_country].filter(Boolean).join(', ')}`;
    }
    if (Array.isArray(prospectData.skills) && prospectData.skills.length > 0) {
      const skills = prospectData.skills.slice(0, 10).map((s: any) =>
        typeof s === 'string' ? s : (s?.name || s?.skill || '')
      ).filter(Boolean);
      if (skills.length > 0) ctx += `\nSkills: ${skills.join(', ')}`;
    }
    if (Array.isArray(prospectData.work_history) && prospectData.work_history.length > 0) {
      const recent = prospectData.work_history.slice(0, 3).map((j: any) => {
        const title = typeof j.title === 'object' ? j.title?.name : (j.title || j.job_title || '');
        const company = typeof j.company === 'object' ? j.company?.name : (j.company || j.company_name || '');
        return `${title} at ${company}`;
      }).filter((s: string) => s !== ' at ');
      if (recent.length > 0) ctx += `\nRecent Roles: ${recent.join(' → ')}`;
    }
  }

  return ctx;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipientName, recipientEmail, companyName, companyDomain, industry, notes, exploriumData, prospectData } = await req.json();

    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const emailDomain = recipientEmail ? recipientEmail.split('@')[1] : null;
    const exploriumContext = buildExploriumContext(exploriumData, prospectData);
    const hasRealData = !!exploriumData?.firmographics;

    const systemPrompt = hasRealData
      ? `You are a senior sales intelligence analyst preparing a demo strategy briefing. You have VERIFIED company data from Explorium — use it as ground truth. Your job is to craft the most compelling, personalized demo strategy for this specific company and prospect. Be specific, actionable, and reference real data points.`
      : `You are a senior sales intelligence analyst preparing a comprehensive briefing for a sales demo. Your research must be accurate, specific, and actionable. If you're not confident about specific details, say what's likely based on the company name, industry, and context rather than making up false specifics.`;

    let userPrompt = `Research this prospect and company for an upcoming product demo:

PROSPECT: ${recipientName || 'Unknown'}
EMAIL: ${recipientEmail || 'Not provided'}${emailDomain ? ` (domain: ${emailDomain})` : ''}
COMPANY: ${companyName}${companyDomain ? `\nDOMAIN: ${companyDomain}` : ''}
INDUSTRY: ${industry || 'Not specified'}
SALES NOTES: ${notes || 'None provided'}${exploriumContext}

Generate a comprehensive research briefing in this EXACT JSON format. Be specific and actionable:

{
  "company": {
    "description": "2-3 sentence description of what the company does, their market position, and approximate size${hasRealData ? ' — incorporate the verified Explorium data' : ''}",
    "products_services": ["List their main products or services (3-6 items)${hasRealData ? ' — infer from industry, tech stack, and description' : ''}"],
    "target_audience": "Who their customers are — describe the ideal customer profile",
    "business_model": "How they make money (SaaS, services, marketplace, etc.)",
    "estimated_size": "Startup / SMB / Mid-market / Enterprise${hasRealData ? ' — use the verified employee count' : ''}",
    "headquarters": "City/country${hasRealData ? ' — use verified HQ data' : ''}",
    "tech_stack_likely": ["${hasRealData ? 'Include VERIFIED tech from Explorium plus likely additions' : 'Technologies they likely use based on industry and size (3-5)'}"]
  },
  "prospect": {
    "likely_role": "${prospectData?.job_title ? 'Use the verified title: ' + prospectData.job_title : "Best guess at their role/seniority"}",
    "likely_priorities": ["What they probably care about most in their role (2-4 items)${prospectData?.job_department ? ' — they work in ' + prospectData.job_department : ''}"],
    "communication_style": "Formal / Casual / Technical — how to talk to them"
  },
  "competitive_landscape": {
    "likely_tools": ["Tools they probably already use that overlap with iSyncso (2-4)${hasRealData ? ' — reference their actual tech stack' : ''}"],
    "pain_points": ["Their likely operational pain points we can solve (3-5)${hasRealData ? ' — be specific to their size and industry' : ''}"],
    "switching_triggers": ["What would make them switch from current tools (2-3)"]
  },
  "demo_strategy": {
    "opening_hook": "A 1-sentence personalized opening that shows we understand their business${hasRealData ? ' — reference a specific data point' : ''}",
    "priority_modules": ["Which iSyncso modules matter most to them, in order (3-5). Use EXACT keys: growth, crm, talent, finance, learn, create, products, raise, sentinel"],
    "module_angles": {
      "module_key": "Why this specific module matters for their company — 1 sentence each, be SPECIFIC to their business"
    },
    "killer_scenarios": ["2-3 concrete scenarios that would resonate: 'Imagine your team at ${companyName} just...'${hasRealData ? " — use real company context" : ''}"],
    "objections_likely": ["What objections they'll probably raise (2-3)"],
    "closing_angle": "The strongest reason for them to take a next step"
  }
}

IMPORTANT:
- module_angles should have entries for each module in priority_modules
- priority_modules must use exact iSyncso module keys: growth, crm, talent, finance, learn, create, products, raise, sentinel
- killer_scenarios should reference the company by name
- Be specific to THIS company, not generic SaaS advice${hasRealData ? '\n- You have REAL verified data — use specific numbers and facts from Explorium' : ''}
- Return ONLY valid JSON, no markdown wrapping`;

    const llmResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error(`[research-prospect] LLM error ${llmResponse.status}:`, errText);
      throw new Error(`LLM error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content || '{}';

    let research;
    try {
      research = JSON.parse(rawContent);
    } catch (_) {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse research response as JSON');
      }
    }

    console.log(`[research-prospect] Research generated for ${companyName} (explorium: ${hasRealData})`);

    return new Response(
      JSON.stringify({ research }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('[research-prospect] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Research generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

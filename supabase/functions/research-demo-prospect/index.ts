/**
 * Research Demo Prospect — AI-powered company & prospect research
 *
 * Called from AdminDemos before creating a demo link.
 * Uses Together.ai 70B to generate structured research about the
 * prospect's company: products/services, target audience, pain points,
 * competitors, and how iSyncso maps to their needs.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipientName, recipientEmail, companyName, industry, notes } = await req.json();

    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Extract domain from email for extra context
    const emailDomain = recipientEmail ? recipientEmail.split('@')[1] : null;

    const systemPrompt = `You are a senior sales intelligence analyst preparing a comprehensive briefing for a sales demo. Your research must be accurate, specific, and actionable. If you're not confident about specific details, say what's likely based on the company name, industry, and context rather than making up false specifics. Be honest about confidence levels.`;

    const userPrompt = `Research this prospect and company for an upcoming product demo:

PROSPECT: ${recipientName || 'Unknown'}
EMAIL: ${recipientEmail || 'Not provided'}${emailDomain ? ` (domain: ${emailDomain})` : ''}
COMPANY: ${companyName}
INDUSTRY: ${industry || 'Not specified'}
SALES NOTES: ${notes || 'None provided'}

Generate a comprehensive research briefing in this EXACT JSON format. Be specific and actionable:

{
  "company": {
    "description": "2-3 sentence description of what the company does, their market position, and approximate size",
    "products_services": ["List their main products or services (3-6 items)"],
    "target_audience": "Who their customers are — describe the ideal customer profile",
    "business_model": "How they make money (SaaS, services, marketplace, etc.)",
    "estimated_size": "Startup / SMB / Mid-market / Enterprise — with rough employee count if known",
    "headquarters": "City/country if known, otherwise best guess based on domain/name",
    "tech_stack_likely": ["Technologies they likely use based on industry and size (3-5)"]
  },
  "prospect": {
    "likely_role": "Best guess at their role/seniority based on name and company context",
    "likely_priorities": ["What they probably care about most in their role (2-4 items)"],
    "communication_style": "Formal / Casual / Technical — how to talk to them"
  },
  "competitive_landscape": {
    "likely_tools": ["Tools they probably already use that overlap with iSyncso (2-4)"],
    "pain_points": ["Their likely operational pain points we can solve (3-5)"],
    "switching_triggers": ["What would make them switch from current tools (2-3)"]
  },
  "demo_strategy": {
    "opening_hook": "A 1-sentence personalized opening that shows we understand their business",
    "priority_modules": ["Which iSyncso modules matter most to them, in order (3-5). Use EXACT keys: growth, crm, talent, finance, learn, create, products, raise, sentinel"],
    "module_angles": {
      "module_key": "Why this specific module matters for their company — 1 sentence each"
    },
    "killer_scenarios": ["2-3 concrete scenarios that would resonate: 'Imagine your team at ${companyName} just...'"],
    "objections_likely": ["What objections they'll probably raise (2-3)"],
    "closing_angle": "The strongest reason for them to take a next step"
  }
}

IMPORTANT:
- module_angles should have entries for each module in priority_modules
- priority_modules must use exact iSyncso module keys: growth, crm, talent, finance, learn, create, products, raise, sentinel
- killer_scenarios should reference the company by name
- Be specific to THIS company, not generic SaaS advice
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
      // Try to extract JSON from markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse research response as JSON');
      }
    }

    console.log(`[research-prospect] Research generated for ${companyName}`);

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

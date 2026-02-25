import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

const SYSTEM_PROMPT = `You are a senior brand strategist at a top-tier agency. You create brand foundations that are specific, authentic, and actionable — never generic.

Rules:
- Every output must be specific to THIS brand, not interchangeable with any other company
- Values must be behavioral (things you can observe someone doing), not abstract platitudes
- The positioning statement must clearly differentiate from competitors
- The brand story should be narrative, not a list of facts — it should have emotional arc
- Taglines must be 2-7 words, memorable, and not cliché
- If inputs are sparse, make intelligent inferences from the industry and personality but flag them as "suggested"

Return ONLY valid JSON matching the specified schema. No markdown, no explanation.`;

function buildUserPrompt(input: Record<string, any>): string {
  const {
    company_name, tagline, industry, company_stage,
    personality_vector, personality_description,
    problem, ideal_customer, differentiator,
    competitor_brands, must_words, must_not_words,
  } = input;

  const pv = personality_vector || [50, 50, 50, 50, 50];

  let prompt = `Create a complete brand strategy for the following brand:

COMPANY: ${company_name || 'Unknown'}
INDUSTRY: ${industry?.primary || 'General'} — ${industry?.sub || 'General'}
STAGE: ${company_stage || 'startup'}`;

  if (tagline) prompt += `\nTAGLINE: ${tagline}`;

  prompt += `

BRAND PERSONALITY (0-100 scales):
- Classic [${pv[0]}] Modern
- Calm [${pv[1]}] Dynamic
- Serious [${pv[2]}] Playful
- Accessible [${pv[3]}] Premium
- Minimal [${pv[4]}] Rich`;

  if (personality_description) {
    prompt += `\n\nBRAND DESCRIPTION: ${personality_description}`;
  }

  if (problem) prompt += `\n\nPROBLEM THEY SOLVE: ${problem}`;
  if (ideal_customer) prompt += `\nIDEAL CUSTOMER: ${ideal_customer}`;
  if (differentiator) prompt += `\nKEY DIFFERENTIATOR: ${differentiator}`;
  if (competitor_brands?.length) prompt += `\nCOMPETITORS: ${competitor_brands.join(', ')}`;
  if (must_words?.length) prompt += `\nMUST-DESCRIBE WORDS: ${must_words.join(', ')}`;
  if (must_not_words?.length) prompt += `\nMUST-NOT-DESCRIBE WORDS: ${must_not_words.join(', ')}`;

  prompt += `

Return a JSON object with this exact structure:
{
  "mission": "One sentence. Present tense. What you do and for whom.",
  "vision": "One sentence. Future tense. The world you're building toward.",
  "values": [
    {
      "name": "Value name (1-3 words)",
      "description": "What this means for the brand (1-2 sentences)",
      "behavioral_example": "A concrete example of this value in action (1 sentence)"
    }
  ],
  "positioning": {
    "target": "Specific target audience",
    "category": "The market category you compete in",
    "differentiation": "What makes you different",
    "reason_to_believe": "Why the differentiation is credible",
    "statement": "For [target], [brand] is the [category] that [differentiation] because [reason_to_believe]."
  },
  "brand_story": "150-250 word narrative with emotional arc. Third person or first person plural (we).",
  "tagline_options": ["tagline 1", "tagline 2", "tagline 3", "tagline 4", "tagline 5"],
  "elevator_pitch": "30-second version. 3-4 sentences max."
}

Generate 3-5 values. Generate exactly 5 tagline options.`;

  return prompt;
}

function parseJsonResponse(content: string): Record<string, any> {
  // Strip markdown fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse response as JSON');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input = await req.json();

    if (!input.company_name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'company_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = buildUserPrompt(input);

    // Attempt with temperature 0.7, retry at 0.3 on parse failure
    let strategy: Record<string, any> | null = null;
    const temperatures = [0.7, 0.3];

    for (const temp of temperatures) {
      try {
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TOGETHER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            temperature: temp,
            max_tokens: 3000,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Together.ai error (temp=${temp}):`, errText);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          console.error(`Empty response at temp=${temp}`);
          continue;
        }

        strategy = parseJsonResponse(content);
        break;
      } catch (err) {
        console.error(`Parse failed at temp=${temp}:`, err);
        continue;
      }
    }

    if (!strategy) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate strategy after retries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure structure matches expected schema
    const result = {
      mission: strategy.mission || '',
      vision: strategy.vision || '',
      values: Array.isArray(strategy.values) ? strategy.values : [],
      positioning: {
        target: strategy.positioning?.target || '',
        category: strategy.positioning?.category || '',
        differentiation: strategy.positioning?.differentiation || '',
        reason_to_believe: strategy.positioning?.reason_to_believe || '',
        statement: strategy.positioning?.statement || '',
      },
      brand_story: strategy.brand_story || '',
      tagline_options: Array.isArray(strategy.tagline_options) ? strategy.tagline_options : [],
      elevator_pitch: strategy.elevator_pitch || '',
    };

    return new Response(
      JSON.stringify({ strategy: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

// ── System prompts per section ──────────────────────────────────────────

const VOICE_AND_TONE_SYSTEM = `You are a senior brand voice strategist at a world-class branding agency. You create voice profiles that are specific, authentic, and actionable — never generic.

Rules:
- Generate exactly 4 voice attributes
- Each attribute must be a specific behavioral quality ("We explain complex things simply"), not a vague adjective ("Friendly")
- "we_are / we_are_not" spectrums must show a clear boundary — "we_are_not" is NOT the opposite, it's where the brand stops (e.g., we_are: "Confidently direct" → we_are_not: "Aggressive or blunt")
- Example sentences must sound noticeably different from a generic brand and consistent with each other
- Generate exactly 5 tone contexts for: social media, website, email, customer support, formal documents
- Tone slider values (0-100) should reflect realistic variation — not all at 50
- Example paragraphs must be 2-4 sentences of actual sample copy for that context
- Everything must align with the brand personality, industry, and visual identity described below

Return ONLY valid JSON. No markdown, no explanation.`;

const WRITING_GUIDELINES_SYSTEM = `You are a brand writing guidelines expert. Create comprehensive, actionable writing rules that enforce a consistent brand voice.

Rules:
- Generate 8-10 preferred words (with "instead_of" alternatives and reasoning)
- Generate 5-7 banned words (with reasoning)
- Jargon and emoji policies must match brand personality (formal brands avoid both, playful brands embrace emoji)
- Grammar style choices must be internally consistent (a casual brand uses contractions + exclamations, a formal brand doesn't)
- Generate exactly 5 do/don't pairs — each must be a specific, real example, not abstract advice
- Do examples should demonstrate the brand voice; Don't examples should show common mistakes
- All guidelines must reinforce the voice attributes provided

Return ONLY valid JSON. No markdown, no explanation.`;

const MESSAGING_AND_COPY_SYSTEM = `You are a senior brand copywriter at a top creative agency. Write real, usable copy that demonstrates the brand voice perfectly.

Rules:
- Generate exactly 3 audience segments with specific, actionable messaging
- Each segment needs a clear key message (1-2 sentences), 3 proof points, and a tone adjustment note
- Generate all 7 sample copy pieces — each must sound like the SAME brand but adapted to context
- Homepage hero: headline (5-10 words), subheadline (15-25 words), CTA (2-4 words)
- About page intro: 3-4 sentences
- Social media post: platform-ready, 1-3 sentences
- Email newsletter opening: warm, 2-3 sentences
- Product description: persuasive, 2-3 sentences
- 404 page: on-brand personality showing through error handling
- Onboarding welcome: warm, encouraging, 2-3 sentences
- All copy must be specific to THIS brand — not interchangeable with any other company

Return ONLY valid JSON. No markdown, no explanation.`;

// ── Prompt builders ─────────────────────────────────────────────────────

function buildBrandContextBlock(ctx: Record<string, any>): string {
  const pv = ctx.personality_vector || [50, 50, 50, 50, 50];

  let block = `BRAND CONTEXT:
Company: ${ctx.company_name || 'Unknown'}
Industry: ${ctx.industry?.primary || 'General'} — ${ctx.industry?.sub || ''}
Stage: ${ctx.company_stage || 'startup'}

BRAND PERSONALITY (0-100 scales):
- Classic [${pv[0]}] Modern
- Calm [${pv[1]}] Dynamic
- Serious [${pv[2]}] Playful
- Accessible [${pv[3]}] Premium
- Minimal [${pv[4]}] Rich`;

  if (ctx.personality_description) {
    block += `\n\nPersonality Description: ${ctx.personality_description}`;
  }

  if (ctx.strategy) {
    const s = ctx.strategy;
    if (s.mission) block += `\nMission: ${s.mission}`;
    if (s.vision) block += `\nVision: ${s.vision}`;
    if (s.values?.length) {
      block += `\nValues: ${s.values.slice(0, 3).map((v: any) => v.name || v).join(', ')}`;
    }
    if (s.positioning?.statement) block += `\nPositioning: ${s.positioning.statement}`;
    if (s.brand_story) block += `\nBrand Story (excerpt): ${s.brand_story.slice(0, 300)}`;
  }

  if (ctx.competitors?.length) block += `\nCompetitors: ${ctx.competitors.join(', ')}`;
  if (ctx.must_words?.length) block += `\nBrand Must-Describe Words: ${ctx.must_words.join(', ')}`;
  if (ctx.must_not_words?.length) block += `\nBrand Must-NOT-Describe Words: ${ctx.must_not_words.join(', ')}`;

  if (ctx.color_mood) block += `\nVisual Mood (from color palette): ${ctx.color_mood}`;
  if (ctx.font_personality) block += `\nTypography Personality: ${ctx.font_personality}`;
  if (ctx.logo_style) block += `\nLogo Style: ${ctx.logo_style}`;
  if (ctx.logo_rationale) block += `\nLogo Rationale: ${ctx.logo_rationale}`;

  return block;
}

function buildVoiceAndToneUserPrompt(ctx: Record<string, any>): string {
  let prompt = buildBrandContextBlock(ctx);

  if (ctx.voice_tone_words?.length) {
    prompt += `\n\nUSER-SELECTED TONE WORDS: ${ctx.voice_tone_words.join(', ')}`;
  }
  if (ctx.formality_level != null) {
    prompt += `\nFormality Level: ${ctx.formality_level}/100 (0=very casual, 100=very formal)`;
  }
  if (ctx.humor_level != null) {
    prompt += `\nHumor Level: ${ctx.humor_level}/100 (0=very serious, 100=very playful)`;
  }
  if (ctx.target_audiences?.length) {
    prompt += `\nTarget Audiences: ${ctx.target_audiences.join(' | ')}`;
  }

  prompt += `

Generate a voice profile as JSON with this exact structure:
{
  "voice_attributes": [
    {
      "attribute": "Short behavioral name (2-5 words)",
      "description": "What this means in practice (1-2 sentences)",
      "spectrum": {
        "we_are": "Positive boundary description",
        "we_are_not": "Where the brand stops (not the opposite)"
      },
      "example_sentences": {
        "social_media": "Example social media post in this voice",
        "website_hero": "Example website headline/hero text",
        "email_subject": "Example email subject line",
        "error_message": "Example error/empty state message",
        "customer_support": "Example support response opening"
      }
    }
  ],
  "tone_spectrum": [
    {
      "context": "Context name (e.g., Social Media)",
      "formality": 35,
      "humor": 60,
      "technicality": 20,
      "warmth": 80,
      "example_paragraph": "2-4 sentences of sample copy for this context"
    }
  ]
}

Generate exactly 4 voice_attributes and exactly 5 tone_spectrum entries for: Social Media, Website, Email Marketing, Customer Support, Formal Documents.`;

  return prompt;
}

function buildWritingGuidelinesUserPrompt(ctx: Record<string, any>, voiceAttributes: any[]): string {
  let prompt = buildBrandContextBlock(ctx);

  if (voiceAttributes?.length) {
    prompt += `\n\nESTABLISHED VOICE ATTRIBUTES:`;
    for (const attr of voiceAttributes) {
      prompt += `\n- ${attr.attribute}: ${attr.description} (We are: ${attr.spectrum?.we_are} / We are not: ${attr.spectrum?.we_are_not})`;
    }
  }

  prompt += `

Generate writing guidelines as JSON with this exact structure:
{
  "vocabulary": {
    "preferred_words": [
      { "word": "preferred term", "instead_of": "term to avoid", "why": "reason for preference" }
    ],
    "banned_words": [
      { "word": "banned term", "why": "reason it's off-brand" }
    ],
    "jargon_policy": "avoid" | "use_sparingly" | "embrace",
    "emoji_policy": "never" | "sparingly" | "frequently"
  },
  "grammar_style": {
    "oxford_comma": true,
    "sentence_length": "short" | "medium" | "varied",
    "paragraph_length": "brief" | "moderate" | "detailed",
    "active_voice_preference": true,
    "contraction_usage": "never" | "sometimes" | "always",
    "exclamation_marks": "never" | "rarely" | "frequently",
    "capitalization": "sentence_case" | "title_case" | "all_caps_headings"
  },
  "do_dont_pairs": [
    {
      "do_example": { "text": "Example of good copy", "explanation": "Why this works" },
      "dont_example": { "text": "Example of bad copy", "explanation": "Why this fails" }
    }
  ]
}

Generate 8-10 preferred_words, 5-7 banned_words, and exactly 5 do_dont_pairs.`;

  return prompt;
}

function buildMessagingAndCopyUserPrompt(ctx: Record<string, any>, voiceAttributes: any[], guidelines: any): string {
  let prompt = buildBrandContextBlock(ctx);

  if (voiceAttributes?.length) {
    prompt += `\n\nESTABLISHED VOICE ATTRIBUTES:`;
    for (const attr of voiceAttributes) {
      prompt += `\n- ${attr.attribute}: ${attr.description}`;
    }
  }

  if (guidelines?.grammar_style) {
    const g = guidelines.grammar_style;
    prompt += `\n\nWRITING STYLE: Sentences: ${g.sentence_length}, Contractions: ${g.contraction_usage}, Exclamations: ${g.exclamation_marks}, Active voice: ${g.active_voice_preference ? 'preferred' : 'not required'}`;
  }

  if (ctx.target_audiences?.length) {
    prompt += `\nTarget Audiences: ${ctx.target_audiences.join(' | ')}`;
  }

  prompt += `

Generate messaging framework and sample copy as JSON with this exact structure:
{
  "messaging_framework": [
    {
      "audience_segment": "Specific audience description",
      "key_message": "Core message for this audience (1-2 sentences)",
      "proof_points": ["proof point 1", "proof point 2", "proof point 3"],
      "tone_adjustment": "How to adjust tone for this audience"
    }
  ],
  "sample_copy": {
    "homepage_hero": {
      "headline": "5-10 word headline",
      "subheadline": "15-25 word subheadline",
      "cta": "2-4 word CTA button text"
    },
    "about_page_intro": "3-4 sentences about the company",
    "social_media_post": "Platform-ready post, 1-3 sentences",
    "email_newsletter_opening": "Warm newsletter opener, 2-3 sentences",
    "product_description": "Persuasive product description, 2-3 sentences",
    "four_oh_four_page": "On-brand 404 error message",
    "onboarding_welcome": "Welcome message for new users, 2-3 sentences"
  }
}

Generate exactly 3 messaging_framework segments. All sample_copy must be specific to ${ctx.company_name || 'this brand'}.`;

  return prompt;
}

// ── JSON parser ─────────────────────────────────────────────────────────

function parseJsonResponse(content: string): Record<string, any> {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse response as JSON');
  }
}

// ── LLM call (multi-provider with fallback chain) ────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string, maxTokens: number, model: string): Promise<Record<string, any> | null> {
  if (!GOOGLE_API_KEY) return null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Gemini ${model}] ${response.status}:`, errText.slice(0, 200));
      return null;
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) { console.error(`[Gemini ${model}] Empty response`); return null; }
    return parseJsonResponse(content);
  } catch (err) {
    console.error(`[Gemini ${model}] Error:`, err);
    return null;
  }
}

async function callGroq(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<Record<string, any> | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Groq] ${response.status}:`, errText.slice(0, 200));
      return null;
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) { console.error('[Groq] Empty response'); return null; }
    return parseJsonResponse(content);
  } catch (err) {
    console.error('[Groq] Error:', err);
    return null;
  }
}

async function callTogether(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<Record<string, any> | null> {
  if (!TOGETHER_API_KEY) return null;
  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Together] ${response.status}:`, errText.slice(0, 200));
      return null;
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) { console.error('[Together] Empty response'); return null; }
    return parseJsonResponse(content);
  } catch (err) {
    console.error('[Together] Error:', err);
    return null;
  }
}

async function callLLM(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<Record<string, any>> {
  // Try providers in order: Gemini 2.5 Flash → Gemini 2.0 Flash → Groq → Together
  const providers = [
    () => callGemini(systemPrompt, userPrompt, maxTokens, 'gemini-2.5-flash'),
    () => callGemini(systemPrompt, userPrompt, maxTokens, 'gemini-2.0-flash'),
    () => callGroq(systemPrompt, userPrompt, maxTokens),
    () => callTogether(systemPrompt, userPrompt, maxTokens),
  ];

  for (const provider of providers) {
    const result = await provider();
    if (result) {
      console.log('[callLLM] Success with provider');
      return result;
    }
  }

  throw new Error('Failed to generate after retries (all providers failed)');
}

// ── Section handlers ────────────────────────────────────────────────────

async function handleVoiceAndTone(ctx: Record<string, any>) {
  const userPrompt = buildVoiceAndToneUserPrompt(ctx);
  const result = await callLLM(VOICE_AND_TONE_SYSTEM, userPrompt, 4000);

  return {
    voice_attributes: Array.isArray(result.voice_attributes) ? result.voice_attributes : [],
    tone_spectrum: Array.isArray(result.tone_spectrum) ? result.tone_spectrum : [],
  };
}

async function handleWritingGuidelines(ctx: Record<string, any>) {
  const voiceAttributes = ctx._voice_attributes || [];
  const userPrompt = buildWritingGuidelinesUserPrompt(ctx, voiceAttributes);
  const result = await callLLM(WRITING_GUIDELINES_SYSTEM, userPrompt, 3000);

  return {
    vocabulary: {
      preferred_words: Array.isArray(result.vocabulary?.preferred_words) ? result.vocabulary.preferred_words : [],
      banned_words: Array.isArray(result.vocabulary?.banned_words) ? result.vocabulary.banned_words : [],
      jargon_policy: result.vocabulary?.jargon_policy || 'use_sparingly',
      emoji_policy: result.vocabulary?.emoji_policy || 'sparingly',
    },
    grammar_style: {
      oxford_comma: result.grammar_style?.oxford_comma ?? true,
      sentence_length: result.grammar_style?.sentence_length || 'varied',
      paragraph_length: result.grammar_style?.paragraph_length || 'moderate',
      active_voice_preference: result.grammar_style?.active_voice_preference ?? true,
      contraction_usage: result.grammar_style?.contraction_usage || 'sometimes',
      exclamation_marks: result.grammar_style?.exclamation_marks || 'rarely',
      capitalization: result.grammar_style?.capitalization || 'sentence_case',
    },
    do_dont_pairs: Array.isArray(result.do_dont_pairs) ? result.do_dont_pairs : [],
  };
}

async function handleMessagingAndCopy(ctx: Record<string, any>) {
  const voiceAttributes = ctx._voice_attributes || [];
  const guidelines = ctx._writing_guidelines || {};
  const userPrompt = buildMessagingAndCopyUserPrompt(ctx, voiceAttributes, guidelines);
  const result = await callLLM(MESSAGING_AND_COPY_SYSTEM, userPrompt, 4000);

  return {
    messaging_framework: Array.isArray(result.messaging_framework) ? result.messaging_framework : [],
    sample_copy: {
      homepage_hero: result.sample_copy?.homepage_hero || { headline: '', subheadline: '', cta: '' },
      about_page_intro: result.sample_copy?.about_page_intro || '',
      social_media_post: result.sample_copy?.social_media_post || '',
      email_newsletter_opening: result.sample_copy?.email_newsletter_opening || '',
      product_description: result.sample_copy?.product_description || '',
      four_oh_four_page: result.sample_copy?.four_oh_four_page || '',
      onboarding_welcome: result.sample_copy?.onboarding_welcome || '',
    },
  };
}

// ── Main handler ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { section, context } = await req.json();

    if (!section || !context) {
      return new Response(
        JSON.stringify({ error: 'section and context are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: Record<string, any>;

    switch (section) {
      case 'voice_and_tone':
        result = await handleVoiceAndTone(context);
        break;
      case 'writing_guidelines':
        result = await handleWritingGuidelines(context);
        break;
      case 'messaging_and_copy':
        result = await handleMessagingAndCopy(context);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown section: ${section}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ result }),
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

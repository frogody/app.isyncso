import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `You are a social media copywriter for a business professional. You write engaging, authentic social media posts based on journal entries and daily activity logs.

Rules:
1. Write in first person from the user's perspective
2. Be professional but personable — not corporate-speak
3. Include specific details and achievements from the journal data
4. For LinkedIn: professional tone, storytelling format, 1-3 paragraphs, end with a question or call-to-action
5. For Twitter/X: punchy, concise, max 280 characters, conversational
6. Suggest relevant hashtags (3-5 per platform)
7. Never fabricate achievements or stats not present in the journal data
8. Vary your opening hooks — don't always start with "This week..."

Output JSON with this structure:
{
  "posts": {
    "linkedin": { "body": "...", "hashtags": ["...", "..."] },
    "twitter": { "body": "...", "hashtags": ["...", "..."] }
  },
  "source_summary": "Brief summary of what the post is about"
}`;

async function supabaseQuery(table: string, query: string): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase query error: ${err}`);
  }
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      user_id,
      company_id,
      source,        // 'journal' | 'prompt' | 'template'
      journal_ids,   // string[] - daily_journal IDs
      prompt,        // string - custom prompt
      platforms,     // string[] - ['linkedin', 'twitter']
      tone,          // string - optional brand tone
    } = await req.json();

    if (!user_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'user_id and company_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let journalContent = '';
    let brandContext = '';

    // Fetch journal entries if source is journal
    if (source === 'journal' && journal_ids?.length > 0) {
      const idFilter = journal_ids.map((id: string) => `"${id}"`).join(',');
      const journals = await supabaseQuery(
        'daily_journals',
        `id=in.(${idFilter})&select=overview,summary_points,timeline_narrative,highlights,date,weekly_context&order=date.desc`
      );

      if (journals.length > 0) {
        journalContent = journals.map((j: any) => {
          const parts = [];
          if (j.date) parts.push(`Date: ${j.date}`);
          if (j.overview) parts.push(`Overview: ${j.overview}`);
          if (j.summary_points?.length) parts.push(`Key Points:\n${j.summary_points.map((p: string) => `- ${p}`).join('\n')}`);
          if (j.highlights?.length) parts.push(`Highlights:\n${j.highlights.map((h: string) => `- ${h}`).join('\n')}`);
          if (j.timeline_narrative) parts.push(`Narrative: ${j.timeline_narrative}`);
          if (j.weekly_context) parts.push(`Weekly Context: ${j.weekly_context}`);
          return parts.join('\n');
        }).join('\n\n---\n\n');
      }
    }

    // Fetch brand assets for voice/tone context
    try {
      const brandAssets = await supabaseQuery(
        'brand_assets',
        `company_id=eq.${company_id}&select=brand_voice,tone_keywords,company_description&limit=1`
      );
      if (brandAssets.length > 0) {
        const brand = brandAssets[0];
        if (brand.brand_voice) brandContext += `Brand voice: ${brand.brand_voice}. `;
        if (brand.tone_keywords?.length) brandContext += `Tone: ${brand.tone_keywords.join(', ')}. `;
        if (brand.company_description) brandContext += `Company: ${brand.company_description}. `;
      }
    } catch {
      // Brand assets optional
    }

    // Build the user message
    let userMessage = '';

    if (source === 'journal' && journalContent) {
      userMessage = `Based on these journal entries, write social media posts:\n\n${journalContent}`;
    } else if (source === 'prompt' && prompt) {
      userMessage = `Write social media posts about: ${prompt}`;
    } else if (source === 'template') {
      userMessage = `Write social media posts using this template context: ${prompt || 'General business update'}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'No content source provided. Send journal_ids or prompt.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (brandContext) {
      userMessage += `\n\nBrand context: ${brandContext}`;
    }

    if (tone) {
      userMessage += `\nTone: ${tone}`;
    }

    const targetPlatforms = platforms?.length > 0 ? platforms : ['linkedin', 'twitter'];
    userMessage += `\n\nTarget platforms: ${targetPlatforms.join(', ')}`;

    // Call Together.ai LLM
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/Kimi-K2-Instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Together.ai error:', errText);

      // Fallback response
      return new Response(
        JSON.stringify({
          posts: {
            linkedin: {
              body: prompt || 'Check out what we have been working on!',
              hashtags: ['business', 'update'],
            },
            twitter: {
              body: prompt?.slice(0, 280) || 'Exciting things happening! Stay tuned.',
              hashtags: ['business'],
            },
          },
          source_summary: 'Fallback post (AI unavailable)',
          fallback: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    return new Response(
      JSON.stringify(result),
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      product_name,
      product_description,
      product_category,
      product_specs,
      product_price,
      product_currency,
      product_brand,
      product_tags,
      product_ean,
      channel,        // 'shopify', 'bolcom', 'amazon', 'generic'
      language,        // 'en', 'nl', 'de', 'fr'
      tone,            // 'professional', 'casual', 'technical', 'luxury'
      focus_keywords,  // optional user-provided keywords
    } = await req.json();

    if (!product_name) {
      return new Response(
        JSON.stringify({ error: 'product_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      nl: 'Dutch (Nederlands)',
      de: 'German (Deutsch)',
      fr: 'French (Français)',
    };

    const channelGuidelines: Record<string, string> = {
      shopify: `Shopify product listing guidelines:
- Title: max 255 characters, include primary keyword near the start
- Description: HTML-formatted, scannable paragraphs with key features upfront
- SEO title: max 70 characters
- SEO description: max 160 characters
- Use product tags for search discovery`,
      bolcom: `Bol.com product listing guidelines:
- Title: max 500 characters, follow format: Brand + Product Type + Key Feature + Variant
- Description: factual, detailed, Dutch marketplace standard
- Include EAN/barcode reference if available
- Bullet points should highlight specs (dimensions, weight, material)
- Dutch customers value practical information over marketing fluff`,
      amazon: `Amazon product listing guidelines:
- Title: max 200 characters, format: Brand + Model + Product Type + Key Features
- Bullet points: 5 points, each starting with a CAPITALIZED keyword
- Description: A+ content style, benefit-focused
- Backend keywords for search indexing`,
      generic: `General e-commerce listing:
- Clear, benefit-focused title
- Detailed description with features and benefits
- Scannable bullet points
- SEO-optimized meta tags`,
    };

    const toneInstructions: Record<string, string> = {
      professional: 'Write in a professional, authoritative tone. Focus on specifications, reliability, and business value.',
      casual: 'Write in a friendly, approachable tone. Use conversational language that connects with everyday consumers.',
      technical: 'Write in a technical, detailed tone. Emphasize specifications, performance metrics, and engineering quality.',
      luxury: 'Write in an elegant, premium tone. Emphasize craftsmanship, exclusivity, and aspirational lifestyle.',
    };

    const targetLanguage = languageNames[language] || 'English';
    const channelGuide = channelGuidelines[channel] || channelGuidelines.generic;
    const toneGuide = toneInstructions[tone] || toneInstructions.professional;

    const specsText = product_specs
      ? (typeof product_specs === 'string' ? product_specs : JSON.stringify(product_specs, null, 2))
      : 'No specifications provided';

    const prompt = `You are an expert e-commerce copywriter and SEO specialist. Generate a complete, high-converting product listing.

## Product Information
- **Name:** ${product_name}
- **Description:** ${product_description || 'Not provided'}
- **Category:** ${product_category || 'General'}
- **Price:** ${product_price ? `${product_currency || 'EUR'} ${product_price}` : 'Not provided'}
- **Brand:** ${product_brand || 'Not specified'}
- **Tags:** ${product_tags?.join(', ') || 'None'}
- **EAN:** ${product_ean || 'Not provided'}
- **Specifications:** ${specsText}
${focus_keywords ? `- **Focus Keywords:** ${focus_keywords}` : ''}

## Channel Requirements
${channelGuide}

## Tone & Style
${toneGuide}

## Language
Write ALL content in **${targetLanguage}**. Ensure native-level fluency and cultural appropriateness.

## Output Format
Return a JSON object with this exact structure:
{
  "titles": [
    { "text": "Primary optimized title", "character_count": 45 },
    { "text": "Alternative title variation 1", "character_count": 38 },
    { "text": "Alternative title variation 2", "character_count": 52 }
  ],
  "description": "Full rich product description with HTML formatting (<p>, <strong>, <ul>, <li> tags). 200-500 words. Include features, benefits, and use cases.",
  "bullet_points": [
    "Key feature or benefit 1",
    "Key feature or benefit 2",
    "Key feature or benefit 3",
    "Key feature or benefit 4",
    "Key feature or benefit 5"
  ],
  "seo_title": "SEO-optimized page title (max 70 chars)",
  "seo_description": "Compelling meta description with call-to-action (max 160 chars)",
  "search_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"],
  "short_tagline": "A punchy one-liner for the product (max 100 chars)"
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks, no explanation text.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a world-class e-commerce copywriter. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error('Groq API error:', err);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: err }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try extracting JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        listing: parsed,
        model: 'llama-3.3-70b-versatile',
        channel,
        language,
        tone,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('generate-listing-copy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

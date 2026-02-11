import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

const SYSTEM_PROMPT = `You are an expert AI image prompt engineer. Your job is to transform user prompts into highly optimized, detailed prompts that produce stunning images.

RULES:
1. Keep the core intent of the user's prompt
2. Add specific visual details: lighting, composition, camera angle, atmosphere
3. Use professional photography/art terminology
4. Be concise but descriptive (max 200 words)
5. Never mention brand names unless the user did
6. For product shots: focus on the product presentation, not the product features
7. Output ONLY valid JSON, no markdown or explanation
8. DETECT PRODUCT MATERIAL from product name/description/tags and apply material-specific terms:

   JEWELRY/METALLIC (rings, necklaces, watches, bracelets, earrings, pendants, brooches, gold, silver, platinum, silverware):
   - Lighting: soft box diffusion controlling reflections, gradient lighting on metal, black card flagging to shape highlights, tent lighting for even metal coverage
   - Surface: polished mirror finish, brushed metal texture, warm gold tone, crisp specular highlights
   - Technique: focus stacking for macro detail, dark background (NOT white — white kills metal contrast)
   - Negative: no fingerprints, no dust, no color cast on metals, no blown-out highlights

   GEMSTONE/CRYSTAL (diamonds, sapphires, rubies, emeralds, pearls, crystal):
   - Lighting: backlit for translucency and fire, fiber optic spot on facets, dark field illumination
   - Surface: brilliant-cut facet reflections, internal light dispersion, scintillation and sparkle
   - Technique: macro lens f/11-f/16 for facet sharpness

   LUXURY/PREMIUM (haute couture, designer, premium accessories, watches):
   - Background: deep black velvet, dark marble, dark gradient
   - Mood: aspirational exclusive aesthetic, dramatic negative space
   - Quality: editorial high-end feel, ultra-sharp commercial quality

OUTPUT FORMAT (JSON):
{
  "enhanced_prompt": "The fully enhanced prompt text",
  "style_tags": ["tag1", "tag2", "tag3"],
  "negative_prompt": "things to avoid in the image",
  "composition_notes": "brief notes on composition"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      use_case,
      style,
      product_name,
      product_type,
      product_description,
      product_tags,
      product_category,
      brand_mood,
      has_reference_image
    } = await req.json();

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for the AI
    let userMessage = `Transform this prompt for AI image generation:\n\n"${prompt}"`;

    // Add context
    const context: string[] = [];

    if (use_case) {
      const useCaseDescriptions: Record<string, string> = {
        'product_variation': 'Product photography with the exact product preserved, only background/environment changes',
        'product_scene': 'Lifestyle product shot in a real-world context',
        'marketing_creative': 'Marketing/advertising imagery for promotional use',
        'quick_draft': 'Quick concept visualization',
        'premium_quality': 'Ultra high-end commercial photography quality'
      };
      context.push(`Use case: ${useCaseDescriptions[use_case] || use_case}`);
    }

    if (style) {
      const styleDescriptions: Record<string, string> = {
        'photorealistic': 'Ultra-realistic photograph',
        'cinematic': 'Cinematic movie still with dramatic lighting',
        'illustration': 'Artistic illustration style',
        '3d_render': '3D rendered with modern rendering techniques',
        'minimalist': 'Clean minimalist aesthetic',
        'vintage': 'Vintage/retro aesthetic',
        'luxury': 'High-end luxury product photography, dark sophisticated backdrop, controlled reflections, dramatic lighting, aspirational premium aesthetic'
      };
      context.push(`Style: ${styleDescriptions[style] || style}`);
    }

    if (product_name) {
      context.push(`Product: ${product_name} (${product_type || 'physical product'})`);
      if (product_description) context.push(`Description: ${product_description}`);
      if (product_tags?.length) context.push(`Tags: ${product_tags.join(', ')}`);
      if (product_category) context.push(`Category: ${product_category}`);
    }

    if (brand_mood) {
      context.push(`Brand mood/atmosphere: ${brand_mood}`);
    }

    if (has_reference_image) {
      context.push('NOTE: A reference image will be provided. Focus the prompt on the desired SCENE/ENVIRONMENT, not the product itself.');
    }

    if (context.length > 0) {
      userMessage += `\n\nContext:\n${context.map(c => `- ${c}`).join('\n')}`;
    }

    // Call Together.ai for fast inference (using Meta Llama)
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Together.ai API error:', errText);

      // Fallback: return a basic enhancement with error info for debugging
      return new Response(
        JSON.stringify({
          enhanced_prompt: prompt,
          style_tags: [style || 'photorealistic'],
          negative_prompt: 'blurry, low quality, distorted',
          composition_notes: 'Standard composition',
          fallback: true,
          debug_error: errText.slice(0, 200)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let enhanced;
    try {
      enhanced = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enhanced = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    return new Response(
      JSON.stringify({
        enhanced_prompt: enhanced.enhanced_prompt || prompt,
        style_tags: enhanced.style_tags || [],
        negative_prompt: enhanced.negative_prompt || '',
        composition_notes: enhanced.composition_notes || '',
        original_prompt: prompt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);

    // Return original prompt on error
    return new Response(
      JSON.stringify({
        error: error.message,
        enhanced_prompt: null,
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

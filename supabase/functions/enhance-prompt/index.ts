import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

const SYSTEM_PROMPT = `You are a world-class commercial photography prompt engineer. You transform casual image requests into prompts that produce magazine-cover-quality output from AI image generators (FLUX, Stable Diffusion).

YOUR MISSION: Take any vague or simple prompt and turn it into a richly detailed, technically precise prompt that produces stunning, professional images every single time.

CORE RULES:
1. Start with the SUBJECT and SCENE first, then add technique
2. Use specific photography terminology: focal length, aperture, lighting rigs, lens types
3. Specify the EXACT lighting setup (not just "good lighting")
4. Include composition direction: rule of thirds, leading lines, negative space, framing
5. Add atmosphere and mood: color temperature, time of day feel, emotional tone
6. Be concise but packed with visual detail (max 150 words for the enhanced prompt)
7. Never mention brand names unless the user did
8. Output ONLY valid JSON, absolutely no markdown or explanation
9. TEXT & LOGO PRESERVATION (critical for product photography): When a reference image is involved, ALWAYS include in the enhanced prompt: "Preserve all text, logos, brand markings, icons, buttons, and printed labels on the product exactly as they appear — correct spelling, correct font, correct placement." This is the single most important quality signal for e-commerce product photography.

LIGHTING RECIPES (use these specific setups, not vague descriptions):
- Hero product: Key light 45° camera-left with softbox, fill card camera-right, rim light from behind
- Dramatic: Single hard key light from above-left, deep shadows, no fill
- Flatlay: Large overhead softbox for even illumination, slight angle for dimension
- Lifestyle: Natural window light with bounce card, warm color temperature 3200K
- Editorial: Mixed lighting — tungsten key with daylight fill for color contrast

CAMERA & LENS SIMULATION:
- Product close-up: 100mm macro, f/8, focus stacking, tripod-sharp
- Lifestyle: 35mm wide, f/2.8, shallow DOF, environmental context
- Fashion/editorial: 85mm portrait, f/4, compressed perspective
- Overhead/flatlay: 24mm, f/11, everything in focus

MATERIAL-SPECIFIC TECHNIQUES:

METALS & JEWELRY (gold, silver, platinum, rings, necklaces, earrings, watches):
- Tent lighting or large diffused source to control reflections
- Black card flags to shape specular highlights on polished surfaces
- Focus stacking at f/11-f/16 for edge-to-edge sharpness
- Dark gradient or black velvet background to maximize metal contrast
- CRITICAL: Realistic scale — jewelry is SMALL (earrings 1-3cm, rings finger-sized, pendants 1-4cm)
- Never oversized, never disproportionate to human features

GEMSTONES (diamonds, sapphires, rubies, crystals):
- Dark field illumination for maximum brilliance
- Fiber optic spot lights on individual facets
- Backlit for fire and dispersion
- Macro at f/16 for facet detail

GLASS & TRANSPARENT (bottles, perfume, crystal):
- Rim/edge lighting from behind to define transparent edges
- Gradient background (dark to light) for dimension
- Backlit for material clarity and color saturation
- No front-facing flash (kills transparency)

FOOD & BEVERAGE:
- Soft directional key light from back-left (hero angle)
- Low angle shooting to show height and layers
- Shallow DOF f/2.8-f/4 for creamy backgrounds
- Warm color temperature, natural-light feel
- Steam, condensation, or texture details for appetite appeal

TEXTILES & FABRICS:
- Raking light at low angle to reveal texture and weave
- Soft fill to prevent harsh shadows in folds
- Color-accurate lighting (CRI 95+)
- Show natural draping, movement, or structure

OUTPUT FORMAT (strict JSON):
{
  "enhanced_prompt": "The complete enhanced prompt ready for image generation",
  "style_tags": ["3-5 descriptive style tags"],
  "negative_prompt": "Specific things to avoid in this particular image",
  "composition_notes": "Brief composition advice"
}`;

// Deterministic material detection
function detectMaterial(name?: string, description?: string, tags?: string[], category?: string): 'jewelry' | 'gemstone' | 'luxury' | 'glass' | 'food' | 'textile' | 'standard' {
  const signals = [name, description, tags?.join(' '), category].filter(Boolean).join(' ').toLowerCase();
  if (/\b(ring|necklace|bracelet|earring|pendant|brooch|bangle|anklet|tiara|cufflink|gold|silver|platinum|18k|14k|925|sterling|karat|carat|jewel)/i.test(signals)) return 'jewelry';
  if (/\b(diamond|sapphire|ruby|emerald|pearl|opal|topaz|amethyst|gemstone|gem\b|brilliant.cut|facet)/i.test(signals)) return 'gemstone';
  if (/\b(watch|timepiece|luxury|premium|haute|couture|designer|handcrafted|swarovski)/i.test(signals)) return 'luxury';
  if (/\b(glass|crystal|bottle|perfume|fragrance|vase|transparent|translucent)/i.test(signals)) return 'glass';
  if (/\b(food|chocolate|cake|coffee|tea|wine|cheese|bread|organic|gourmet|culinary|spice|honey)/i.test(signals)) return 'food';
  if (/\b(fabric|textile|clothing|dress|shirt|cotton|silk|linen|wool|leather|suede|cashmere)/i.test(signals)) return 'textile';
  return 'standard';
}

// Post-LLM deterministic quality injection — ensures consistent quality keywords
// even if the LLM forgets them
const MATERIAL_QUALITY_BOOST: Record<string, { suffix: string; negative: string }> = {
  jewelry: {
    suffix: ', controlled specular highlights on polished metal, focus stacking for razor-sharp macro detail, realistic jewelry scale and proportions',
    negative: 'fingerprints, dust, color cast on metals, blown-out highlights, flat lighting, oversized jewelry, unrealistic proportions, disproportionate scale, blurry, low quality, watermark'
  },
  gemstone: {
    suffix: ', brilliant-cut facet reflections with internal light dispersion, scintillation and sparkle, macro lens f/16 for facet sharpness',
    negative: 'fingerprints, dust, color cast, blown-out highlights, flat lighting, blurry, low quality, watermark'
  },
  luxury: {
    suffix: ', controlled reflections, dramatic lighting with rich shadows, ultra-sharp commercial quality, editorial high-end feel',
    negative: 'cheap appearance, flat lighting, cluttered background, blurry, low quality, watermark'
  },
  glass: {
    suffix: ', rim lighting defining transparent edges, backlit material clarity, caustic light patterns',
    negative: 'fingerprints, smudges, flat lighting, blurry, low quality, watermark'
  },
  food: {
    suffix: ', appetizing warm tones, natural light feel, texture detail visible, shallow depth of field',
    negative: 'unappetizing colors, artificial looking, flat lighting, blurry, low quality, watermark'
  },
  textile: {
    suffix: ', fabric texture visible with raking light, natural draping, accurate color reproduction',
    negative: 'wrinkled messily, inaccurate colors, flat lighting, blurry, low quality, watermark'
  },
  standard: {
    suffix: ', professional studio lighting, sharp focus throughout, clean composition',
    negative: 'blurry, low quality, distorted, deformed, watermark, text overlay, amateur lighting, noisy, grainy'
  }
};

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
      has_reference_image,
      product_size_scale
    } = await req.json();

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for the AI
    let userMessage = `Transform this into a stunning, detailed image generation prompt:\n\n"${prompt}"`;

    const context: string[] = [];

    if (use_case) {
      const useCaseDescriptions: Record<string, string> = {
        'product_variation': 'Product photography with the exact product preserved, only background/environment changes. Focus prompt on the SCENE, not the product.',
        'product_scene': 'Premium lifestyle product shot in a real-world context with beautiful environment',
        'marketing_creative': 'High-impact marketing/advertising imagery for promotional campaigns, social media, or ads',
        'quick_draft': 'Quick concept visualization — keep it simple but visually appealing',
        'premium_quality': 'Ultra high-end commercial photography, award-winning quality, maximum detail and impact'
      };
      context.push(`Use case: ${useCaseDescriptions[use_case] || use_case}`);
    }

    if (style) {
      const styleDescriptions: Record<string, string> = {
        'photorealistic': 'Ultra-realistic photograph indistinguishable from a real camera shot',
        'cinematic': 'Cinematic movie still with dramatic lighting, color grading, and wide aspect ratio feel',
        'illustration': 'Artistic illustration with clean lines and stylized rendering',
        '3d_render': '3D rendered scene with physically-based materials, global illumination, and ray tracing',
        'minimalist': 'Clean minimalist aesthetic with maximum negative space and single focal point',
        'vintage': 'Vintage film photography with warm muted tones, subtle grain, and nostalgic atmosphere',
        'luxury': 'High-end luxury product photography: dark sophisticated backdrop, controlled reflections, dramatic directional lighting, aspirational premium feel'
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
      context.push('NOTE: A reference image will be provided to the model. Focus the prompt on the desired SCENE, ENVIRONMENT, and LIGHTING — the product appearance is already locked in by the reference image.');
      context.push('CRITICAL TEXT/LOGO PRESERVATION: The reference image contains brand logos, text, icons, and printed markings on the product. Your enhanced prompt MUST include an explicit instruction to preserve ALL text, logos, brand names, and printed details from the reference image exactly as they appear — correct spelling, font, placement, and size. Never blur, distort, or hallucinate any text or logo. This is the #1 priority for product photography.');
    }

    if (product_size_scale) {
      context.push(`CRITICAL SIZE REFERENCE: This product is "${product_size_scale.label}" sized (approximately ${product_size_scale.cm}). ${product_size_scale.desc}. The product MUST appear at this realistic scale relative to any hands, body parts, surfaces, or objects. Do NOT make it larger or smaller.`);
    }

    // Material-specific instructions
    const detectedMaterial = detectMaterial(product_name, product_description, product_tags, product_category);
    const isLuxuryStyle = style === 'luxury';

    if (detectedMaterial === 'jewelry' || detectedMaterial === 'gemstone') {
      const jewelrySignals = [prompt, product_name, product_description, product_tags?.join(' ')].filter(Boolean).join(' ').toLowerCase();
      let sizeGuidance = 'Jewelry must appear at realistic actual size.';
      if (/\bearring/i.test(jewelrySignals)) sizeGuidance += ' Earrings: 1-3cm, proportional to human ear.';
      else if (/\bring\b/i.test(jewelrySignals)) sizeGuidance += ' Ring: finger-sized, not oversized.';
      else if (/\bnecklace|pendant|chain\b/i.test(jewelrySignals)) sizeGuidance += ' Pendant: 1-4cm, chain fits around neck.';
      else if (/\bbracelet|bangle|cuff\b/i.test(jewelrySignals)) sizeGuidance += ' Bracelet: wrist-sized, 6-8cm diameter.';

      if (isLuxuryStyle) {
        context.push(`MANDATORY: Jewelry/precious product with Luxury style. Dark/black background, macro detail, controlled specular highlights, focus stacking, gradient lighting on metal. ${sizeGuidance}`);
      } else {
        context.push(`Jewelry product — add sharp detail and controlled reflections, but follow the selected style for background and mood. ${sizeGuidance}`);
      }
    } else if (detectedMaterial === 'luxury') {
      context.push(isLuxuryStyle
        ? 'LUXURY product. Dark sophisticated backdrop, dramatic lighting, controlled reflections, aspirational aesthetic.'
        : 'Premium product. Add controlled reflections and sharp quality, follow selected style.'
      );
    } else if (detectedMaterial === 'glass') {
      context.push('GLASS/TRANSPARENT product. Rim lighting, backlit edges, gradient background for material definition.');
    } else if (detectedMaterial === 'food') {
      context.push('FOOD product. Warm appetizing tones, natural light feel, shallow DOF, texture detail.');
    } else if (detectedMaterial === 'textile') {
      context.push('TEXTILE product. Raking light for texture, accurate colors, natural draping.');
    }

    if (context.length > 0) {
      userMessage += `\n\nContext:\n${context.map(c => `- ${c}`).join('\n')}`;
    }

    // Use a stronger model for better prompt engineering
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
        temperature: 0.6,  // Slightly lower for more consistent quality
        max_tokens: 600,   // More room for detailed prompts
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Together.ai API error:', errText);

      // Fallback: return a quality-boosted version
      const material = detectMaterial(product_name, product_description, product_tags, product_category);
      const boost = MATERIAL_QUALITY_BOOST[material];
      return new Response(
        JSON.stringify({
          enhanced_prompt: `Ultra high resolution professional photograph, 8K detail, sharp focus throughout. ${prompt}${boost.suffix}`,
          style_tags: [style || 'photorealistic', 'commercial quality'],
          negative_prompt: boost.negative,
          composition_notes: 'Professional composition with strong focal point',
          fallback: true,
          detected_material: material
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    let enhanced;
    try {
      enhanced = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enhanced = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    // ── Deterministic quality boost ──────────────────────────────────
    // Always inject material-specific quality keywords after the LLM output
    const material = detectMaterial(product_name, product_description, product_tags, product_category);
    let finalPrompt = enhanced.enhanced_prompt || prompt;
    let finalNegative = enhanced.negative_prompt || '';

    const boost = MATERIAL_QUALITY_BOOST[material];

    // Always add quality prefix if the LLM didn't include resolution keywords
    if (!/\b(8K|ultra high|high resolution|professional photograph)\b/i.test(finalPrompt)) {
      finalPrompt = `Ultra high resolution professional photograph, 8K detail. ${finalPrompt}`;
    }

    // Add material-specific suffix
    finalPrompt += boost.suffix;

    // Merge negatives
    if (boost.negative) {
      finalNegative = finalNegative ? `${finalNegative}, ${boost.negative}` : boost.negative;
    }

    // Style-aware background enforcement
    if ((material === 'jewelry' || material === 'gemstone') && (style === 'luxury' || !style)) {
      // Force dark background for jewelry in luxury/default style
      finalPrompt = finalPrompt.replace(/\b(white|neutral|light|bright|clean)\s+(background|backdrop|surface)\b/gi, 'deep black velvet background');
    } else if (material === 'jewelry' && style && style !== 'luxury') {
      // Non-luxury style: undo any dark background the LLM may have forced
      finalPrompt = finalPrompt.replace(/\b(dark|black|deep black|velvet)\s+(background|backdrop|surface)\b/gi, 'clean studio background');
    }

    return new Response(
      JSON.stringify({
        enhanced_prompt: finalPrompt,
        style_tags: enhanced.style_tags || [],
        negative_prompt: finalNegative,
        composition_notes: enhanced.composition_notes || '',
        original_prompt: prompt,
        detected_material: material
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);

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

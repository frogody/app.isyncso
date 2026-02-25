/**
 * Builds a structured brand context object from all 4 prior stages
 * for use in LLM prompt generation.
 */

const PERSONALITY_AXES = [
  ['Classic', 'Modern'],
  ['Calm', 'Dynamic'],
  ['Serious', 'Playful'],
  ['Accessible', 'Premium'],
  ['Minimal', 'Rich'],
];

/**
 * Derive a color mood string from the primary palette hue.
 */
function deriveColorMood(palette) {
  if (!palette?.primary?.base) return null;
  const hex = palette.primary.base;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  if ((h >= 0 && h <= 60) || h >= 300) return 'warm (reds, oranges, yellows)';
  if (h >= 180 && h < 270) return 'cool (blues, teals)';
  if (h > 60 && h < 180) return 'natural (greens, limes)';
  return 'neutral';
}

/**
 * Derive font personality from primary font category.
 */
function deriveFontPersonality(typography) {
  const cat = typography?.primary_font?.category;
  if (!cat) return null;
  const map = {
    serif: 'traditional, trustworthy, established',
    'sans-serif': 'modern, clean, approachable',
    display: 'expressive, bold, distinctive',
    handwriting: 'personal, creative, artisanal',
    monospace: 'technical, precise, developer-focused',
  };
  return map[cat] || cat;
}

/**
 * Build the full brand context for LLM prompts.
 */
export function buildBrandContext(project) {
  const dna = project?.brand_dna || {};
  const colorSystem = project?.color_system;
  const typography = project?.typography_system;
  const logo = project?.logo_system;

  const ctx = {
    // Brand DNA
    company_name: dna.company_name || '',
    industry: dna.industry || {},
    company_stage: dna.company_stage || 'startup',
    personality_vector: dna.personality_vector || [50, 50, 50, 50, 50],
    personality_description: dna.personality_description || '',

    // Strategy
    strategy: dna.strategy || null,
    competitors: dna.competitor_brands || [],
    must_words: dna.must_words || [],
    must_not_words: dna.must_not_words || [],

    // Visual identity context
    color_mood: deriveColorMood(colorSystem?.palette),
    font_personality: deriveFontPersonality(typography),
    font_family: typography?.primary_font?.family || null,
    logo_style: logo?.concept?.style || null,
    logo_rationale: logo?.concept?.design_rationale || null,

    // User voice config inputs
    voice_tone_words: dna._voiceToneWords || [],
    formality_level: dna._formalityLevel ?? 50,
    humor_level: dna._humorLevel ?? 30,
    target_audiences: dna._targetAudiences || [],
  };

  return ctx;
}

/**
 * Describe personality vector as readable text.
 */
export function describePersonality(vector) {
  if (!vector || vector.length < 5) return '';
  return PERSONALITY_AXES.map(([low, high], i) => {
    const v = vector[i];
    if (v < 30) return `strongly ${low.toLowerCase()}`;
    if (v < 45) return `leaning ${low.toLowerCase()}`;
    if (v > 70) return `strongly ${high.toLowerCase()}`;
    if (v > 55) return `leaning ${high.toLowerCase()}`;
    return `balanced ${low.toLowerCase()}/${high.toLowerCase()}`;
  }).join(', ');
}

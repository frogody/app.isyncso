/**
 * Curated icon library for logo generation.
 * ~35 geometric SVG icons organized by category with keyword scoring.
 * All icons: 100x100 viewBox, single <path>, geometric, 10px internal padding.
 */

// ── Icon Catalog ──────────────────────────────────────────────────────────────

export const ICON_LIBRARY = [
  // ── Abstract Geometric (10) ───────────────────────────────────────────────
  {
    id: 'circle-ring',
    category: 'abstract-geometric',
    keywords: ['unity', 'cycle', 'continuity', 'wholeness'],
    complexity: 'simple',
    svgPath: 'M50 10a40 40 0 1 1 0 80 40 40 0 0 1 0-80m0 12a28 28 0 1 0 0 56 28 28 0 0 0 0-56z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'triangle-up',
    category: 'abstract-geometric',
    keywords: ['growth', 'direction', 'stability', 'power'],
    complexity: 'simple',
    svgPath: 'M50 12L88 85H12z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'diamond',
    category: 'abstract-geometric',
    keywords: ['premium', 'luxury', 'precision', 'value'],
    complexity: 'simple',
    svgPath: 'M50 10L90 50 50 90 10 50z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'hexagon',
    category: 'abstract-geometric',
    keywords: ['structure', 'connection', 'efficiency', 'technology'],
    complexity: 'simple',
    svgPath: 'M50 10L87 30v40L50 90 13 70V30z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'overlapping-circles',
    category: 'abstract-geometric',
    keywords: ['collaboration', 'synergy', 'partnership', 'unity'],
    complexity: 'medium',
    svgPath: 'M38 25a25 25 0 1 1 0 50 25 25 0 0 1 0-50m24 0a25 25 0 1 1 0 50 25 25 0 0 1 0-50',
    viewBox: '0 0 100 100',
  },
  {
    id: 'square-rotate',
    category: 'abstract-geometric',
    keywords: ['dynamic', 'transformation', 'innovation', 'balance'],
    complexity: 'medium',
    svgPath: 'M50 15L85 50 50 85 15 50zM50 28L72 50 50 72 28 50z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'stacked-layers',
    category: 'abstract-geometric',
    keywords: ['depth', 'layers', 'foundation', 'building'],
    complexity: 'medium',
    svgPath: 'M50 15L85 35 50 55 15 35zM15 45l35 20 35-20M15 55l35 20 35-20',
    viewBox: '0 0 100 100',
  },
  {
    id: 'spiral',
    category: 'abstract-geometric',
    keywords: ['growth', 'evolution', 'creativity', 'infinite'],
    complexity: 'complex',
    svgPath: 'M50 50a5 5 0 0 1 5-5 10 10 0 0 1 10 10 15 15 0 0 1-15 15 20 20 0 0 1-20-20 25 25 0 0 1 25-25 30 30 0 0 1 30 30 35 35 0 0 1-35 35',
    viewBox: '0 0 100 100',
  },
  {
    id: 'cube-iso',
    category: 'abstract-geometric',
    keywords: ['dimension', 'structure', 'solid', 'building'],
    complexity: 'medium',
    svgPath: 'M50 15L85 35v30L50 85 15 65V35zM50 55L85 35M50 55v30M50 55L15 35',
    viewBox: '0 0 100 100',
  },
  {
    id: 'infinity',
    category: 'abstract-geometric',
    keywords: ['infinite', 'continuous', 'endless', 'flow'],
    complexity: 'medium',
    svgPath: 'M30 50c0-11 9-20 20-20s20 9 20 20-9 20-20 20-20-9-20-20m40 0c0-11 9-20 20-20s20 9 20 20-9 20-20 20-20-9-20-20',
    viewBox: '0 0 120 100',
  },

  // ── Tech (8) ──────────────────────────────────────────────────────────────
  {
    id: 'circuit-node',
    category: 'tech',
    keywords: ['technology', 'digital', 'network', 'connection'],
    complexity: 'medium',
    svgPath: 'M50 35a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM50 15v20M50 55v30M15 50h20M55 50h30M22 22l20 20M58 58l20 20M22 78l20-20M58 42l20-20',
    viewBox: '0 0 100 100',
  },
  {
    id: 'code-brackets',
    category: 'tech',
    keywords: ['code', 'development', 'software', 'engineering'],
    complexity: 'simple',
    svgPath: 'M35 20L15 50l20 30M65 20l20 30-20 30M45 80l10-60',
    viewBox: '0 0 100 100',
  },
  {
    id: 'data-flow',
    category: 'tech',
    keywords: ['data', 'analytics', 'flow', 'process'],
    complexity: 'medium',
    svgPath: 'M20 25h15v15H20zM65 25h15v15H65zM42 55h15v15H42zM27 40v15h22M73 40v7l-16 8',
    viewBox: '0 0 100 100',
  },
  {
    id: 'shield',
    category: 'tech',
    keywords: ['security', 'protection', 'trust', 'safety'],
    complexity: 'simple',
    svgPath: 'M50 10L85 25v30c0 18-15 30-35 35C30 85 15 73 15 55V25z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'cloud',
    category: 'tech',
    keywords: ['cloud', 'digital', 'storage', 'platform'],
    complexity: 'simple',
    svgPath: 'M25 65a15 15 0 0 1-3-30 20 20 0 0 1 38-8 15 15 0 0 1 20 15 12 12 0 0 1-5 23z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'bolt',
    category: 'tech',
    keywords: ['speed', 'power', 'energy', 'fast'],
    complexity: 'simple',
    svgPath: 'M55 10L25 55h20L40 90 75 45H55z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'grid-dots',
    category: 'tech',
    keywords: ['platform', 'system', 'modular', 'grid'],
    complexity: 'medium',
    svgPath: 'M25 25a5 5 0 1 0 0 .01M50 25a5 5 0 1 0 0 .01M75 25a5 5 0 1 0 0 .01M25 50a5 5 0 1 0 0 .01M50 50a5 5 0 1 0 0 .01M75 50a5 5 0 1 0 0 .01M25 75a5 5 0 1 0 0 .01M50 75a5 5 0 1 0 0 .01M75 75a5 5 0 1 0 0 .01',
    viewBox: '0 0 100 100',
  },
  {
    id: 'signal-wave',
    category: 'tech',
    keywords: ['communication', 'signal', 'broadcast', 'wireless'],
    complexity: 'medium',
    svgPath: 'M50 60a10 10 0 1 0 0 .01M50 45a25 25 0 0 1 18 7.5M32 52.5a25 25 0 0 1 18-7.5M50 30a40 40 0 0 1 28 12M22 42a40 40 0 0 1 28-12',
    viewBox: '0 0 100 100',
  },

  // ── Finance (5) ───────────────────────────────────────────────────────────
  {
    id: 'ascending-bars',
    category: 'finance',
    keywords: ['growth', 'analytics', 'performance', 'metrics'],
    complexity: 'simple',
    svgPath: 'M15 85V65h15v20zM35 85V50h15v35zM55 85V40h15v45zM75 85V20h15v65z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'arrow-up-right',
    category: 'finance',
    keywords: ['growth', 'progress', 'success', 'upward'],
    complexity: 'simple',
    svgPath: 'M20 75L75 20m0 0H40m35 0v35',
    viewBox: '0 0 100 100',
  },
  {
    id: 'pie-chart',
    category: 'finance',
    keywords: ['analytics', 'data', 'distribution', 'insight'],
    complexity: 'medium',
    svgPath: 'M50 10v40h40a40 40 0 1 1-40-40zM55 10a40 40 0 0 1 35 35H55z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'coins-stack',
    category: 'finance',
    keywords: ['money', 'investment', 'savings', 'wealth'],
    complexity: 'medium',
    svgPath: 'M30 70c0 5 9 10 20 10s20-5 20-10M30 60c0 5 9 10 20 10s20-5 20-10M30 50c0 5 9 10 20 10s20-5 20-10M30 40c0-5 9-10 20-10s20 5 20 10v30c0 5-9 10-20 10S30 75 30 70z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'target',
    category: 'finance',
    keywords: ['goal', 'focus', 'precision', 'target'],
    complexity: 'medium',
    svgPath: 'M50 10a40 40 0 1 0 0 80 40 40 0 0 0 0-80zm0 15a25 25 0 1 1 0 50 25 25 0 0 1 0-50zm0 15a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    viewBox: '0 0 100 100',
  },

  // ── Creative (5) ──────────────────────────────────────────────────────────
  {
    id: 'lightbulb',
    category: 'creative',
    keywords: ['idea', 'innovation', 'creativity', 'inspiration'],
    complexity: 'medium',
    svgPath: 'M50 10a25 25 0 0 0-15 45v10h30V55A25 25 0 0 0 50 10zM38 72h24M40 80h20',
    viewBox: '0 0 100 100',
  },
  {
    id: 'pen-nib',
    category: 'creative',
    keywords: ['design', 'writing', 'craft', 'creative'],
    complexity: 'medium',
    svgPath: 'M50 10L30 55l10 5-5 30 15-15 15 15-5-30 10-5zM50 45a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'star',
    category: 'creative',
    keywords: ['excellence', 'quality', 'premium', 'star'],
    complexity: 'simple',
    svgPath: 'M50 10l12 28h30l-24 18 9 30-27-19-27 19 9-30L8 38h30z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'sparkle',
    category: 'creative',
    keywords: ['magic', 'special', 'premium', 'bright'],
    complexity: 'simple',
    svgPath: 'M50 10L56 40h30L60 55l6 35-16-22-16 22 6-35-26-15h30z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'palette',
    category: 'creative',
    keywords: ['art', 'design', 'color', 'creative'],
    complexity: 'medium',
    svgPath: 'M50 10a40 40 0 0 0 0 80c5 0 10-4 10-10 0-3-1-5-2-7s-2-4-2-7c0-6 4-10 10-10h5c22 0 40-18 40-40A40 40 0 0 0 50 10zM30 40a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm15-15a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm20 0a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm10 15a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
    viewBox: '0 0 110 100',
  },

  // ── Nature (4) ────────────────────────────────────────────────────────────
  {
    id: 'leaf',
    category: 'nature',
    keywords: ['nature', 'growth', 'organic', 'sustainability'],
    complexity: 'simple',
    svgPath: 'M20 80C20 40 50 10 80 10c0 30-20 60-50 65L45 60c15-5 25-20 30-35-15 10-30 25-35 40z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'mountain',
    category: 'nature',
    keywords: ['adventure', 'strength', 'stability', 'peak'],
    complexity: 'simple',
    svgPath: 'M10 80L40 25l15 20L70 20l20 60z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'wave',
    category: 'nature',
    keywords: ['flow', 'ocean', 'movement', 'fluid'],
    complexity: 'medium',
    svgPath: 'M10 50c10-15 20-15 30 0s20 15 30 0 20-15 30 0M10 65c10-15 20-15 30 0s20 15 30 0 20-15 30 0',
    viewBox: '0 0 110 100',
  },
  {
    id: 'sun',
    category: 'nature',
    keywords: ['energy', 'warmth', 'bright', 'positive'],
    complexity: 'medium',
    svgPath: 'M50 30a20 20 0 1 0 0 40 20 20 0 0 0 0-40zM50 10v10M50 80v10M80 50h10M10 50h10M73 27l7-7M20 80l7-7M73 73l7 7M20 20l7 7',
    viewBox: '0 0 100 100',
  },

  // ── Health (3) ────────────────────────────────────────────────────────────
  {
    id: 'heart',
    category: 'health',
    keywords: ['care', 'love', 'health', 'wellness'],
    complexity: 'simple',
    svgPath: 'M50 85L15 50a22 22 0 0 1 35-22 22 22 0 0 1 35 22z',
    viewBox: '0 0 100 100',
  },
  {
    id: 'shield-plus',
    category: 'health',
    keywords: ['health', 'protection', 'medical', 'safety'],
    complexity: 'medium',
    svgPath: 'M50 10L85 25v30c0 18-15 30-35 35C30 85 15 73 15 55V25zM50 38v24M38 50h24',
    viewBox: '0 0 100 100',
  },
  {
    id: 'hand-heart',
    category: 'health',
    keywords: ['care', 'support', 'community', 'giving'],
    complexity: 'complex',
    svgPath: 'M50 45L38 35a10 10 0 0 1 12-10 10 10 0 0 1 12 10zM20 55c0-3 2-5 5-5h10l8 8h14l8-8h10c3 0 5 2 5 5v20H20z',
    viewBox: '0 0 100 100',
  },
];

// ── Category Map ──────────────────────────────────────────────────────────────

export const ICON_CATEGORIES = {
  'abstract-geometric': ICON_LIBRARY.filter(i => i.category === 'abstract-geometric').map(i => i.id),
  'tech': ICON_LIBRARY.filter(i => i.category === 'tech').map(i => i.id),
  'finance': ICON_LIBRARY.filter(i => i.category === 'finance').map(i => i.id),
  'creative': ICON_LIBRARY.filter(i => i.category === 'creative').map(i => i.id),
  'nature': ICON_LIBRARY.filter(i => i.category === 'nature').map(i => i.id),
  'health': ICON_LIBRARY.filter(i => i.category === 'health').map(i => i.id),
};

// ── Keyword Pool ──────────────────────────────────────────────────────────────

export const KEYWORD_POOL = {
  general: ['innovation', 'trust', 'growth', 'quality', 'premium', 'modern', 'minimal', 'bold', 'dynamic', 'elegant'],
  tech: ['technology', 'digital', 'platform', 'data', 'cloud', 'code', 'security', 'speed', 'network', 'AI'],
  finance: ['analytics', 'investment', 'performance', 'wealth', 'metrics', 'goal', 'precision'],
  creative: ['design', 'creativity', 'inspiration', 'art', 'craft', 'magic', 'color'],
  nature: ['sustainability', 'organic', 'nature', 'energy', 'flow', 'adventure'],
  health: ['wellness', 'care', 'health', 'protection', 'community', 'support'],
};

// ── Industry → Category Alignment ─────────────────────────────────────────────

const INDUSTRY_CATEGORY_MAP = {
  technology: ['tech', 'abstract-geometric'],
  software: ['tech', 'abstract-geometric'],
  saas: ['tech', 'abstract-geometric'],
  finance: ['finance', 'abstract-geometric'],
  banking: ['finance', 'abstract-geometric'],
  insurance: ['finance', 'health'],
  healthcare: ['health', 'nature'],
  medical: ['health'],
  creative: ['creative', 'abstract-geometric'],
  design: ['creative'],
  marketing: ['creative', 'tech'],
  education: ['creative', 'nature'],
  environment: ['nature'],
  energy: ['nature', 'tech'],
  retail: ['creative', 'finance'],
  ecommerce: ['tech', 'finance'],
  consulting: ['abstract-geometric', 'finance'],
  legal: ['abstract-geometric'],
  real_estate: ['abstract-geometric', 'nature'],
  food: ['nature', 'creative'],
  fitness: ['health', 'nature'],
  nonprofit: ['health', 'nature'],
};

// ── Scoring Functions ─────────────────────────────────────────────────────────

/**
 * Score an icon against the user's selected keywords and industry.
 * @returns 0-100
 */
export function scoreIconForBrief(icon, selectedKeywords = [], industry = '') {
  let score = 0;

  // Keyword match: +20 per overlap, max 80
  const overlap = icon.keywords.filter(k => selectedKeywords.includes(k)).length;
  score += Math.min(overlap * 20, 80);

  // Industry category alignment: +15
  const normalizedIndustry = industry.toLowerCase().replace(/[^a-z]/g, '_');
  const alignedCategories = INDUSTRY_CATEGORY_MAP[normalizedIndustry] || ['abstract-geometric'];
  if (alignedCategories.includes(icon.category)) {
    score += 15;
  }

  // Normalize to 0-100
  return Math.min(Math.round(score), 100);
}

/**
 * Filter icons by visual style preference.
 */
export function filterIconsByStyle(icons, style) {
  if (!style || style === 'geometric') return icons; // geometric = all icons
  // outlined = simple complexity, filled = complex complexity
  if (style === 'outlined') return icons.filter(i => i.complexity === 'simple' || i.complexity === 'medium');
  if (style === 'filled') return icons.filter(i => i.complexity !== 'simple');
  return icons;
}

/**
 * Get icons by category.
 */
export function getIconsByCategory(category) {
  return ICON_LIBRARY.filter(i => i.category === category);
}

/**
 * Get a flat icon by ID.
 */
export function getIconById(id) {
  return ICON_LIBRARY.find(i => i.id === id) || null;
}

/**
 * Get relevant keyword suggestions based on industry and personality vector.
 * Returns 15-20 keywords, prioritizing industry-relevant ones.
 */
export function getRelevantKeywords(industry = '', personalityVector = [50, 50, 50, 50, 50]) {
  const results = new Set();

  // Industry-specific keywords first
  const normalizedIndustry = industry.toLowerCase().replace(/[^a-z]/g, '_');
  const alignedCategories = INDUSTRY_CATEGORY_MAP[normalizedIndustry] || ['abstract-geometric'];

  for (const cat of alignedCategories) {
    const poolKey = cat === 'abstract-geometric' ? 'general' : cat;
    const pool = KEYWORD_POOL[poolKey] || [];
    for (const kw of pool) results.add(kw);
  }

  // Personality-driven keywords
  const [temporal, energy] = personalityVector;
  if (temporal < 35) {
    results.add('classic'); results.add('heritage'); results.add('tradition');
  } else if (temporal > 65) {
    results.add('modern'); results.add('innovative'); results.add('cutting-edge');
  }
  if (energy > 65) {
    results.add('bold'); results.add('dynamic'); results.add('powerful');
  } else if (energy < 35) {
    results.add('elegant'); results.add('refined'); results.add('subtle');
  }

  // Always include generals
  for (const kw of KEYWORD_POOL.general) results.add(kw);

  // Cap at 20
  return [...results].slice(0, 20);
}

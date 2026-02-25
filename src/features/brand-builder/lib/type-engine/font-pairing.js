/**
 * Font pairing rules: scoring, filtering by This-or-That choices,
 * and top-4 pairing generation.
 */
import { FONT_CATALOG, getSerifs, getSansSerifs } from './font-catalog.js';
import { scoreFontPersonality, rankFontsForRole } from './font-scoring.js';

/**
 * Score a heading + body pairing on contrast, x-height harmony, and weight availability.
 * Returns { score, reasons[] } or null if rejected.
 */
export function scorePairing(headingFont, bodyFont) {
  // Hard filters — reject if insufficient weights
  if (bodyFont.weights_available.length < 4) return null;
  if (headingFont.weights_available.length < 2) return null;

  let score = 0;
  const reasons = [];

  // Classification contrast bonus
  const headSerif = headingFont.classification === 'serif';
  const bodySerif = bodyFont.classification === 'serif';
  if (headSerif !== bodySerif) {
    score += 20;
    reasons.push('Serif + sans-serif contrast');
  }

  // Slab + geometric-sans is a nice pairing
  if (headingFont.subclass === 'slab' && bodyFont.subclass === 'geometric') {
    score += 15;
    reasons.push('Slab serif + geometric sans harmony');
  }

  // Same classification penalty
  if (headingFont.classification === bodyFont.classification) {
    score -= 10;
  }

  // Same font penalty
  if (headingFont.family === bodyFont.family) {
    score -= 30;
    reasons.push('Same font — low contrast');
  }

  // X-height harmony
  const xDiff = Math.abs(headingFont.x_height_ratio - bodyFont.x_height_ratio);
  if (xDiff < 0.05) {
    score += 10;
    reasons.push('Similar x-height for visual harmony');
  } else if (xDiff > 0.10) {
    score -= 5;
  }

  return { score, reasons };
}

/**
 * Filter catalog fonts based on This-or-That choices.
 *
 * choices[0]: 'serif' | 'sans-serif'  (heading classification)
 * choices[1]: subclass based on choice 0:
 *   serif → 'traditional' | 'modern'
 *   sans  → 'geometric' | 'humanist'
 * choices[2]: 'light' | 'bold'  (weight preference)
 */
export function filterByChoices(choices) {
  if (!choices || choices.length < 3) return FONT_CATALOG;

  const [headingClass, subclass, weight] = choices;

  // Filter heading candidates
  let headingPool = FONT_CATALOG.filter(f => {
    if (headingClass === 'serif') return f.classification === 'serif' || f.classification === 'display';
    return f.classification === 'sans-serif' || f.classification === 'display';
  });

  // Subclass filter (prefer but don't hard-filter)
  if (subclass === 'traditional') {
    headingPool.sort((a, b) => (b.is_traditional ? 1 : 0) - (a.is_traditional ? 1 : 0));
  } else if (subclass === 'modern') {
    headingPool.sort((a, b) => (b.is_modern ? 1 : 0) - (a.is_modern ? 1 : 0));
  } else if (subclass === 'geometric') {
    headingPool.sort((a, b) => {
      const aGeo = a.subclass === 'geometric' || a.subclass === 'neo-grotesque' ? 1 : 0;
      const bGeo = b.subclass === 'geometric' || b.subclass === 'neo-grotesque' ? 1 : 0;
      return bGeo - aGeo;
    });
  } else if (subclass === 'humanist') {
    headingPool.sort((a, b) => {
      const aHum = a.subclass === 'humanist' ? 1 : 0;
      const bHum = b.subclass === 'humanist' ? 1 : 0;
      return bHum - aHum;
    });
  }

  // Weight preference: boost scoring in caller, not hard-filter here
  // Return both heading and body pools
  const bodyPool = headingClass === 'serif'
    ? FONT_CATALOG.filter(f => f.classification === 'sans-serif')
    : FONT_CATALOG.filter(f => f.classification === 'serif' || f.classification === 'sans-serif');

  return { headingPool, bodyPool, weightPreference: weight };
}

/**
 * Generate top 4 font pairings based on personality vector, This-or-That choices,
 * color temperature, and direction card fonts.
 */
export function generateFilteredPairings(
  personalityVector,
  thisOrThatChoices,
  colorTemperature,
  directionFontSet
) {
  const { headingPool, bodyPool, weightPreference } = filterByChoices(thisOrThatChoices);

  // Score and rank heading fonts
  const rankedHeadings = rankFontsForRole(
    headingPool, personalityVector, 'heading', colorTemperature, directionFontSet
  ).slice(0, 8); // top 8 headings

  // Score and rank body fonts
  const rankedBodies = rankFontsForRole(
    bodyPool, personalityVector, 'body', colorTemperature, directionFontSet
  ).slice(0, 8); // top 8 bodies

  // Generate all valid pairings
  const pairings = [];
  for (const heading of rankedHeadings) {
    for (const body of rankedBodies) {
      if (heading.family === body.family) continue;

      const pairingResult = scorePairing(heading, body);
      if (!pairingResult) continue;

      // Weight preference adjustment
      let weightBonus = 0;
      if (weightPreference === 'light') {
        if (heading.is_light_optimized) weightBonus += 5;
        if (body.is_light_optimized) weightBonus += 3;
      } else if (weightPreference === 'bold') {
        if (heading.is_bold_optimized) weightBonus += 5;
        if (body.is_bold_optimized) weightBonus += 3;
      }

      const totalScore = heading.score + body.score + pairingResult.score + weightBonus;

      pairings.push({
        heading,
        body,
        score: Math.round(totalScore * 10) / 10,
        reasons: pairingResult.reasons,
        label: `${heading.family} + ${body.family}`,
      });
    }
  }

  // Sort by total score, return top 4
  pairings.sort((a, b) => b.score - a.score);

  // Deduplicate: don't show same heading font twice if possible
  const seen = new Set();
  const result = [];
  for (const p of pairings) {
    if (result.length >= 4) break;
    const key = `${p.heading.family}`;
    if (seen.has(key) && result.length < 3) continue; // allow dupes only for last slot
    seen.add(key);
    result.push(p);
  }

  // If we don't have 4, fill from remaining
  if (result.length < 4) {
    for (const p of pairings) {
      if (result.length >= 4) break;
      if (!result.find(r => r.heading.family === p.heading.family && r.body.family === p.body.family)) {
        result.push(p);
      }
    }
  }

  return result;
}

/**
 * Get alternative fonts for a given role (for the fine-tune dropdown).
 * Returns 3-5 alternatives sorted by personality match.
 */
export function getAlternativeFonts(currentFont, role, personalityVector, colorTemperature, directionFontSet) {
  const pool = role === 'heading'
    ? FONT_CATALOG.filter(f => f.role_suitability.heading >= 0.5)
    : FONT_CATALOG.filter(f => f.role_suitability.body >= 0.6);

  return rankFontsForRole(pool, personalityVector, role, colorTemperature, directionFontSet)
    .filter(f => f.family !== currentFont.family)
    .slice(0, 5);
}

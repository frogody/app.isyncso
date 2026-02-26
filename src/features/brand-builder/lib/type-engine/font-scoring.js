/**
 * Font personality scoring — weighted axis distance from brand personality vector.
 * Color temperature adjusts the temporal axis.
 * Direction card fonts get a bonus.
 */
import { FONT_CATALOG } from './font-catalog.js';
import { DIRECTION_CARDS } from '../../components/stages/brand-dna/DirectionCardsData.js';

const AXIS_WEIGHTS = {
  temporal: 0.30,
  energy:   0.20,
  tone:     0.20,
  market:   0.15,
  density:  0.15,
};

const AXES = ['temporal', 'energy', 'tone', 'market', 'density'];

/**
 * Score how well a font matches the brand personality vector.
 * Returns 0-100 (higher = better match).
 */
export function scoreFontPersonality(font, personalityVector, colorTemperature, directionFontSet) {
  const adjusted = [...(personalityVector || [50, 50, 50, 50, 50])];

  // Color temperature shifts temporal axis
  if (colorTemperature === 'warm')  adjusted[0] = Math.max(0, adjusted[0] - 5);
  if (colorTemperature === 'cool')  adjusted[0] = Math.min(100, adjusted[0] + 5);

  let score = 0;
  for (let i = 0; i < AXES.length; i++) {
    const axis = AXES[i];
    const distance = Math.abs((font.personality_scores[axis] || 50) - (adjusted[i] || 50));
    score += (100 - distance) * AXIS_WEIGHTS[axis];
  }

  // Direction card font bonus
  if (directionFontSet && directionFontSet.has(font.family)) {
    score += 15;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Rank all catalog fonts for a given role (heading, body, accent).
 * Returns sorted array with scores attached.
 */
export function rankFontsForRole(catalog, personalityVector, role, colorTemperature, directionFontSet) {
  return catalog
    .map(font => {
      const personalityScore = scoreFontPersonality(font, personalityVector, colorTemperature, directionFontSet);
      const roleFit = font.role_suitability[role] || 0.5;
      return {
        ...font,
        score: personalityScore * roleFit,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Extract unique font family names from user's selected direction cards.
 * Returns a Set for O(1) lookups.
 */
export function getDirectionCardFonts(selectedDirectionIds) {
  const fonts = new Set();
  if (!selectedDirectionIds?.length) return fonts;

  for (const id of selectedDirectionIds) {
    const card = DIRECTION_CARDS.find(c => c.id === id);
    if (card?.fontPair) {
      if (card.fontPair.heading) fonts.add(card.fontPair.heading);
      if (card.fontPair.body) fonts.add(card.fontPair.body);
    }
  }
  return fonts;
}

/**
 * Builds a structured visual context object from all 5 prior stages
 * for use in LLM prompt generation (photography + illustration).
 */
import { buildBrandContext } from '../verbal-engine/index.js';

/**
 * Build the full visual context for LLM prompts.
 * Extends the verbal-engine context with verbal identity + user visual prefs.
 */
export function buildVisualContext(project) {
  const base = buildBrandContext(project);
  const dna = project?.brand_dna || {};
  const colorSystem = project?.color_system;
  const verbalIdentity = project?.verbal_identity;

  // Verbal identity summary
  let voiceSummary = '';
  if (verbalIdentity?.voice_attributes?.length) {
    voiceSummary = verbalIdentity.voice_attributes
      .slice(0, 3)
      .map(a => a.attribute)
      .join(', ');
  }

  // Palette colors for overlays
  const palette = colorSystem?.palette;
  const primaryColor = palette?.primary?.base || '#000000';
  const secondaryColor = palette?.secondary?.base || '#333333';
  const accentColor = palette?.accent?.base || null;

  return {
    ...base,
    voice_summary: voiceSummary,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    accent_color: accentColor,
    photo_mood_prefs: dna._photoMoodPrefs || [],
    photo_subject_prefs: dna._photoSubjectPrefs || [],
    illustration_style_pref: dna._illustrationStylePref || null,
    icon_style_pref: dna._iconStylePref || 'outlined',
  };
}

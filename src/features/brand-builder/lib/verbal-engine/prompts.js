/**
 * Prompt helpers for client-side use.
 * The actual prompts are built inside the edge function.
 * This module provides the curated tone word list and default config.
 */

export const TONE_WORDS = [
  // Confidence spectrum
  'Bold', 'Confident', 'Authoritative', 'Humble',
  // Warmth spectrum
  'Warm', 'Empathetic', 'Friendly', 'Professional',
  // Energy spectrum
  'Energetic', 'Calm', 'Inspiring', 'Grounded',
  // Communication spectrum
  'Direct', 'Conversational', 'Storytelling', 'Minimal',
  // Style spectrum
  'Witty', 'Sophisticated',
];

export const TONE_WORD_DESCRIPTIONS = {
  Bold: 'Unafraid to take a stand and make strong claims',
  Confident: 'Self-assured without being arrogant',
  Authoritative: 'Expert-level knowledge and trust',
  Humble: 'Down-to-earth and approachable',
  Warm: 'Caring and emotionally connected',
  Empathetic: 'Understanding of pain points and feelings',
  Friendly: 'Like talking to a knowledgeable friend',
  Professional: 'Polished and business-appropriate',
  Energetic: 'High-energy and action-oriented',
  Calm: 'Reassuring and steady',
  Inspiring: 'Motivating and aspirational',
  Grounded: 'Practical and realistic',
  Direct: 'Gets to the point quickly',
  Conversational: 'Natural, human-sounding language',
  Storytelling: 'Uses narrative to engage and persuade',
  Minimal: 'Says more with fewer words',
  Witty: 'Clever and occasionally humorous',
  Sophisticated: 'Refined, elevated language',
};

export const DEFAULT_VOICE_CONFIG = {
  _voiceToneWords: [],
  _formalityLevel: 50,
  _humorLevel: 30,
  _targetAudiences: [],
};

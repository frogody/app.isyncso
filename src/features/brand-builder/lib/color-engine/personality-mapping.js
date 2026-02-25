/**
 * Maps a 5-axis personality vector to base HSL values + mood metadata.
 *
 * Axes (0-100 each):
 *   [0] temporal  — Classic ↔ Modern
 *   [1] energy    — Calm ↔ Dynamic
 *   [2] tone      — Serious ↔ Playful
 *   [3] market    — Accessible ↔ Premium
 *   [4] density   — Minimal ↔ Rich
 */
import { lerp, clampHue } from './color-utils.js';

// ── Industry hue expectations ────────────────────────────────────

export const INDUSTRY_HUE_EXPECTATIONS = {
  'Technology':              { range: [200, 260], default: 220 },
  'Finance & Banking':       { range: [200, 240], default: 215 },
  'Healthcare':              { range: [170, 220], default: 195 },
  'Education':               { range: [200, 260], default: 230 },
  'Food & Beverage':         { range: [10, 50],   default: 25 },
  'Real Estate':             { range: [190, 230], default: 210 },
  'Legal':                   { range: [210, 250], default: 225 },
  'Beauty & Fashion':        { range: [300, 360], default: 330 },
  'Fitness & Wellness':      { range: [140, 190], default: 160 },
  'Entertainment & Media':   { range: [270, 320], default: 290 },
  'Travel & Hospitality':    { range: [170, 210], default: 190 },
  'Energy & Sustainability': { range: [90, 160],  default: 130 },
  'Agriculture':             { range: [70, 140],  default: 100 },
  'Non-profit':              { range: [20, 60],   default: 35 },
  'Manufacturing':           { range: [200, 240], default: 215 },
  'Professional Services':   { range: [210, 250], default: 225 },
  'Retail':                  { range: [0, 30],    default: 15 },
  'Telecommunications':      { range: [190, 250], default: 210 },
  'Construction':            { range: [20, 55],   default: 35 },
  'Automotive':              { range: [0, 20],    default: 5 },
};

// ── Core mapping ─────────────────────────────────────────────────

export function personalityToBaseHSL(vector = [50, 50, 50, 50, 50]) {
  const [temporal = 50, energy = 50, tone = 50, market = 50, density = 50] = vector || [50, 50, 50, 50, 50];

  // Hue: warm (classic/serious) → cool (modern/playful)
  let h = lerp(15, 240, temporal / 100) + lerp(-20, 20, tone / 100);
  h = clampHue(h);

  // Saturation: higher energy → more saturated, premium → desaturated
  let s = lerp(15, 90, energy / 100);
  if (market > 70) s *= lerp(1, 0.65, (market - 70) / 30);

  // Lightness: playful → lighter, premium → darker
  let l = lerp(25, 70, tone / 100);
  if (market > 60) l -= lerp(0, 12, (market - 60) / 40);

  return {
    h: Math.round(clampHue(h)),
    s: Math.round(Math.max(10, Math.min(95, s))),
    l: Math.round(Math.max(20, Math.min(70, l))),
  };
}

// ── Hue range for the given vector ───────────────────────────────

export function getHueRange(vector) {
  const [temporal] = vector;
  const center = lerp(15, 240, temporal / 100);
  return { min: clampHue(center - 40), max: clampHue(center + 40) };
}

// ── Density → preferred harmony method ───────────────────────────

export function getDensityHarmony(density = 50) {
  if (density < 30) return 'analogous';       // minimal → close hues
  if (density < 60) return 'split-complementary';
  return 'triadic';                            // rich → wide spread
}

// ── Mood descriptor ──────────────────────────────────────────────

export function getMoodDescriptor(vector = [50, 50, 50, 50, 50]) {
  const [temporal, energy, tone, market] = vector;

  const adj1 = energy > 60 ? 'Bold' : energy > 35 ? 'Balanced' : 'Calm';
  const adj2 =
    temporal > 65 ? 'Modern'
    : temporal > 35 ? 'Contemporary'
    : 'Classic';
  const adj3 = market > 65 ? 'Premium' : tone > 60 ? 'Playful' : '';

  return [adj1, adj3, adj2].filter(Boolean).join(' & ');
}

// ── Temperature ──────────────────────────────────────────────────

export function getTemperature(hue) {
  // Warm: 0-60, 300-360   Cool: 150-270   Neutral: rest
  if ((hue >= 0 && hue <= 60) || hue >= 300) return 'warm';
  if (hue >= 150 && hue <= 270) return 'cool';
  return 'neutral';
}

// ── Saturation level ─────────────────────────────────────────────

export function getSaturationLevel(sat) {
  if (sat < 35) return 'muted';
  if (sat < 65) return 'moderate';
  return 'vibrant';
}

// ── Industry-safe hue ────────────────────────────────────────────

export function getIndustrySafeHue(industry = '') {
  const entry = INDUSTRY_HUE_EXPECTATIONS[industry];
  if (!entry) return 215; // blue fallback
  return entry.default;
}

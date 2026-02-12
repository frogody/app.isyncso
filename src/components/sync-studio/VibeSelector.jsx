import React from 'react';
import { motion } from 'framer-motion';

export const VIBES = {
  clean_studio: {
    name: 'Clean Studio',
    description: 'White backgrounds, e-commerce perfect',
    gradient: 'from-gray-200 via-gray-100 to-white',
    background_hint: 'Pure white seamless studio background',
    mood_hint: 'Clean, precise, commercial',
    lighting_hint: 'Bright even studio lighting, minimal shadows',
    composition_hint: 'Centered product, generous white space',
  },
  lifestyle: {
    name: 'Lifestyle',
    description: 'Real-world settings, warm & relatable',
    gradient: 'from-amber-300 via-orange-200 to-yellow-100',
    background_hint: 'Natural home or lifestyle environment',
    mood_hint: 'Warm, inviting, relatable',
    lighting_hint: 'Soft natural window light',
    composition_hint: 'Product in context with complementary items',
  },
  luxury: {
    name: 'Luxury',
    description: 'Premium surfaces, dramatic lighting',
    gradient: 'from-amber-800 via-yellow-700 to-amber-600',
    background_hint: 'Premium surfaces: marble, dark wood, velvet',
    mood_hint: 'Aspirational, premium, elegant',
    lighting_hint: 'Dramatic directional lighting with rich shadows',
    composition_hint: 'Generous negative space, editorial framing',
  },
  minimalist: {
    name: 'Minimalist',
    description: 'Less is more, clean simplicity',
    gradient: 'from-zinc-300 via-zinc-200 to-zinc-100',
    background_hint: 'Monochrome surface, subtle texture',
    mood_hint: 'Minimal, serene, refined',
    lighting_hint: 'Soft diffused light, minimal contrast',
    composition_hint: 'Rule of thirds, maximum simplicity',
  },
  bold_vibrant: {
    name: 'Bold & Vibrant',
    description: 'Saturated colors, eye-catching',
    gradient: 'from-pink-500 via-violet-500 to-indigo-500',
    background_hint: 'Bold colored gradient or textured background',
    mood_hint: 'Energetic, playful, attention-grabbing',
    lighting_hint: 'Bright, saturated, high-key lighting',
    composition_hint: 'Dynamic angles, bold crop',
  },
  natural: {
    name: 'Natural',
    description: 'Organic textures, earthy tones',
    gradient: 'from-green-300 via-emerald-200 to-teal-100',
    background_hint: 'Natural materials: linen, wood, stone, plants',
    mood_hint: 'Organic, authentic, earthy',
    lighting_hint: 'Golden hour or soft outdoor light',
    composition_hint: 'Organic arrangement with natural props',
  },
  editorial: {
    name: 'Editorial',
    description: 'Magazine-worthy, artistic styling',
    gradient: 'from-slate-600 via-slate-500 to-slate-400',
    background_hint: 'Architectural or styled editorial set',
    mood_hint: 'Artistic, curated, fashion-forward',
    lighting_hint: 'Dramatic studio lighting with intentional shadows',
    composition_hint: 'Off-center, cropped, magazine-style framing',
  },
  dark_moody: {
    name: 'Dark & Moody',
    description: 'Deep shadows, cinematic atmosphere',
    gradient: 'from-zinc-800 via-zinc-700 to-zinc-600',
    background_hint: 'Dark, deep-toned background with subtle texture',
    mood_hint: 'Moody, cinematic, mysterious',
    lighting_hint: 'Low-key lighting, dramatic rim light, deep shadows',
    composition_hint: 'Chiaroscuro, product emerging from darkness',
  },
};

export const VIBE_KEYS = Object.keys(VIBES);

export default function VibeSelector({ selectedVibe, onSelect, compact = false }) {
  return (
    <div className={`grid ${compact ? 'grid-cols-4 gap-2' : 'grid-cols-2 sm:grid-cols-4 gap-3'}`}>
      {VIBE_KEYS.map((key) => {
        const vibe = VIBES[key];
        const isActive = selectedVibe === key;

        return (
          <motion.button
            key={key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(isActive ? null : key)}
            className={`relative text-left rounded-xl overflow-hidden transition-all duration-200 ${
              isActive
                ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-black'
                : 'ring-1 ring-zinc-800 hover:ring-zinc-600'
            }`}
          >
            {/* Gradient preview */}
            <div className={`h-16 ${compact ? 'h-10' : 'h-16'} bg-gradient-to-r ${vibe.gradient}`} />

            {/* Label */}
            <div className={`bg-zinc-900/90 ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}>
              <p className={`font-semibold text-white ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {vibe.name}
              </p>
              {!compact && (
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{vibe.description}</p>
              )}
            </div>

            {/* Active check */}
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center"
              >
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

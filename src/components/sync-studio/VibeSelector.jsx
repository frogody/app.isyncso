import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/GlobalThemeContext';

export const VIBES = {
  clean_studio: {
    name: 'Clean Studio',
    description: 'White backgrounds, e-commerce perfect',
    gradient: 'from-gray-200 via-gray-100 to-white',
    example_image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop&q=80',
    background_hint: 'Pure white seamless studio background',
    mood_hint: 'Clean, precise, commercial',
    lighting_hint: 'Bright even studio lighting, minimal shadows',
    composition_hint: 'Centered product, generous white space',
  },
  lifestyle: {
    name: 'Lifestyle',
    description: 'Real-world settings, warm & relatable',
    gradient: 'from-amber-300 via-orange-200 to-yellow-100',
    example_image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=300&fit=crop&q=80',
    background_hint: 'Natural home or lifestyle environment',
    mood_hint: 'Warm, inviting, relatable',
    lighting_hint: 'Soft natural window light',
    composition_hint: 'Product in context with complementary items',
  },
  luxury: {
    name: 'Luxury',
    description: 'Premium surfaces, dramatic lighting',
    gradient: 'from-amber-800 via-yellow-700 to-amber-600',
    example_image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop&q=80',
    background_hint: 'Premium surfaces: marble, dark wood, velvet',
    mood_hint: 'Aspirational, premium, elegant',
    lighting_hint: 'Dramatic directional lighting with rich shadows',
    composition_hint: 'Generous negative space, editorial framing',
  },
  minimalist: {
    name: 'Minimalist',
    description: 'Less is more, clean simplicity',
    gradient: 'from-zinc-300 via-zinc-200 to-zinc-100',
    example_image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=300&fit=crop&q=80',
    background_hint: 'Monochrome surface, subtle texture',
    mood_hint: 'Minimal, serene, refined',
    lighting_hint: 'Soft diffused light, minimal contrast',
    composition_hint: 'Rule of thirds, maximum simplicity',
  },
  bold_vibrant: {
    name: 'Bold & Vibrant',
    description: 'Saturated colors, eye-catching',
    gradient: 'from-pink-500 via-violet-500 to-indigo-500',
    example_image: 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&h=300&fit=crop&q=80',
    background_hint: 'Bold colored gradient or textured background',
    mood_hint: 'Energetic, playful, attention-grabbing',
    lighting_hint: 'Bright, saturated, high-key lighting',
    composition_hint: 'Dynamic angles, bold crop',
  },
  natural: {
    name: 'Natural',
    description: 'Organic textures, earthy tones',
    gradient: 'from-green-300 via-emerald-200 to-teal-100',
    example_image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop&q=80',
    background_hint: 'Natural materials: linen, wood, stone, plants',
    mood_hint: 'Organic, authentic, earthy',
    lighting_hint: 'Golden hour or soft outdoor light',
    composition_hint: 'Organic arrangement with natural props',
  },
  editorial: {
    name: 'Editorial',
    description: 'Magazine-worthy, artistic styling',
    gradient: 'from-slate-600 via-slate-500 to-slate-400',
    example_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop&q=80',
    background_hint: 'Architectural or styled editorial set',
    mood_hint: 'Artistic, curated, fashion-forward',
    lighting_hint: 'Dramatic studio lighting with intentional shadows',
    composition_hint: 'Off-center, cropped, magazine-style framing',
  },
  dark_moody: {
    name: 'Dark & Moody',
    description: 'Deep shadows, cinematic atmosphere',
    gradient: 'from-zinc-800 via-zinc-700 to-zinc-600',
    example_image: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&h=300&fit=crop&q=80',
    background_hint: 'Dark, deep-toned background with subtle texture',
    mood_hint: 'Moody, cinematic, mysterious',
    lighting_hint: 'Low-key lighting, dramatic rim light, deep shadows',
    composition_hint: 'Chiaroscuro, product emerging from darkness',
  },
};

export const VIBE_KEYS = Object.keys(VIBES);

function VibeCard({ vibeKey, vibe, isActive, onSelect, compact }) {
  const [imgFailed, setImgFailed] = useState(false);
  const { ct } = useTheme();
  const hasImage = vibe.example_image && !imgFailed;

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(isActive ? null : vibeKey)}
      className={`relative text-left rounded-xl overflow-hidden transition-all duration-200 ${
        isActive
          ? `ring-2 ring-yellow-500 ring-offset-2 ${ct('ring-offset-white', 'ring-offset-black')}`
          : `ring-1 ${ct('ring-slate-200 hover:ring-slate-300', 'ring-zinc-800 hover:ring-zinc-600')}`
      }`}
    >
      {/* Image / Gradient preview area */}
      <div className={`relative ${compact ? 'h-16' : 'h-24'}`}>
        {/* Gradient fallback (always rendered behind the image) */}
        <div className={`absolute inset-0 bg-gradient-to-r ${vibe.gradient}`} />

        {/* Example image overlay */}
        {hasImage && (
          <img
            src={vibe.example_image}
            alt={vibe.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark gradient overlay at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Text overlaid on the image */}
        <div className={`absolute bottom-0 left-0 right-0 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
          <p className={`font-semibold text-white drop-shadow-sm ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {vibe.name}
          </p>
          {!compact && (
            <p className="text-[10px] text-zinc-300 mt-0.5 leading-tight drop-shadow-sm">
              {vibe.description}
            </p>
          )}
        </div>
      </div>

      {/* Active check */}
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg"
        >
          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}

export default function VibeSelector({ selectedVibe, onSelect, compact = false }) {
  return (
    <div className={`grid ${compact ? 'grid-cols-4 gap-2' : 'grid-cols-2 sm:grid-cols-4 gap-3'}`}>
      {VIBE_KEYS.map((key) => (
        <VibeCard
          key={key}
          vibeKey={key}
          vibe={VIBES[key]}
          isActive={selectedVibe === key}
          onSelect={onSelect}
          compact={compact}
        />
      ))}
    </div>
  );
}

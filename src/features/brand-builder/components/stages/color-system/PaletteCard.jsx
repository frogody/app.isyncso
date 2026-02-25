/**
 * Single palette variant card. Shows color bars, mini mockup, a11y badge.
 * Selected state: yellow border + check icon.
 */
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import MiniMockup from './MiniMockup';
import AccessibilityBadge from './AccessibilityBadge';
import { checkContrastPair } from '../../../lib/color-engine/index.js';

export default function PaletteCard({ variant, selected, onSelect }) {
  const { label, description, palette, score } = variant;

  const colors = [
    palette.primary?.base,
    palette.secondary?.base,
    palette.accent?.base,
    palette.neutrals?.near_black,
    palette.neutrals?.light_gray,
  ].filter(Boolean);

  // Check primary-on-white AA compliance
  const primaryCheck = checkContrastPair(palette.primary?.base || '#000', '#FFFFFF');

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`relative text-left rounded-2xl border-2 transition-colors overflow-hidden ${
        selected
          ? 'border-yellow-400/60 bg-yellow-400/[0.04]'
          : 'border-zinc-700/40 bg-zinc-900/40 hover:border-zinc-600/60'
      }`}
    >
      {/* Selected check */}
      {selected && (
        <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
        </div>
      )}

      {/* Color bars */}
      <div className="flex h-3">
        {colors.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>

      {/* Mini mockup */}
      <div className="px-3 pt-3">
        <MiniMockup palette={palette} compact />
      </div>

      {/* Info */}
      <div className="px-3 py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">{label}</p>
          <AccessibilityBadge level="aa" passing={primaryCheck.aa} />
        </div>
        <p className="text-xs text-zinc-500 line-clamp-1">{description}</p>

        {/* Color dots */}
        <div className="flex items-center gap-1.5 pt-1">
          {colors.slice(0, 3).map((c, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border border-white/10"
              style={{ background: c }}
            />
          ))}
          {score != null && (
            <span className="ml-auto text-[10px] text-zinc-600 font-medium">
              Q{score}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

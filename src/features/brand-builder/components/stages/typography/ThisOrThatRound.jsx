/**
 * Single binary choice round — two side-by-side cards.
 * Each card previews a typeface with the brand name + body text.
 */
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function ThisOrThatRound({
  leftOption,
  rightOption,
  selected,
  onSelect,
  brandName,
  bodyText,
  palette,
}) {
  const bg = palette?.neutrals?.white || '#F8F8F8';
  const textColor = palette?.neutrals?.near_black || '#1a1a1a';
  const primary = palette?.primary?.base || '#333';

  return (
    <div className="grid grid-cols-2 gap-4">
      {[leftOption, rightOption].map((option) => {
        const isSelected = selected === option.value;
        return (
          <motion.button
            key={option.value}
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelect(option.value)}
            className={`relative rounded-[16px] border p-4 text-left transition-colors ${
              isSelected
                ? 'border-yellow-400 bg-yellow-400/[0.04]'
                : 'border-white/[0.06] bg-zinc-900/40 hover:border-white/10'
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-black" />
              </div>
            )}

            {/* Preview area */}
            <div
              className="rounded-xl p-5 mb-3 min-h-[120px] flex flex-col justify-center"
              style={{ background: bg }}
            >
              <p
                className="text-lg mb-1 leading-tight"
                style={{
                  fontFamily: `'${option.headingFont}', ${option.isSerif ? 'serif' : 'sans-serif'}`,
                  fontWeight: option.headingWeight || 700,
                  color: primary,
                }}
              >
                {brandName || 'Brand Name'}
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{
                  fontFamily: `'${option.bodyFont}', ${option.isSerif ? 'serif' : 'sans-serif'}`,
                  fontWeight: 400,
                  color: textColor,
                  opacity: 0.8,
                }}
              >
                {bodyText || 'Building a brand that stands the test of time.'}
              </p>
            </div>

            {/* Label */}
            <h4 className="text-sm font-semibold text-white">{option.label}</h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">{option.description}</p>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Single font pairing preview card.
 * Shows brand name in heading font, body text in body font, and type hierarchy stack.
 */
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function PairingCard({ pairing, selected, onSelect, brandName, bodyText, palette }) {
  const bg = palette?.neutrals?.white || '#F8F8F8';
  const textColor = palette?.neutrals?.near_black || '#1a1a1a';
  const primary = palette?.primary?.base || '#333';
  const lightGray = palette?.neutrals?.light_gray || '#eee';

  const headingFamily = `'${pairing.heading.family}', ${pairing.heading.is_serif ? 'serif' : 'sans-serif'}`;
  const bodyFamily = `'${pairing.body.family}', ${pairing.body.is_serif ? 'serif' : 'sans-serif'}`;

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`relative rounded-[16px] border p-4 text-left transition-colors w-full ${
        selected
          ? 'border-yellow-400 bg-yellow-400/[0.04]'
          : 'border-white/[0.06] bg-zinc-900/40 hover:border-white/10'
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center z-10">
          <Check className="w-3.5 h-3.5 text-black" />
        </div>
      )}

      {/* Preview area */}
      <div className="rounded-xl p-4 mb-3" style={{ background: bg }}>
        {/* Brand name in heading font */}
        <p
          className="text-xl leading-tight mb-2"
          style={{ fontFamily: headingFamily, fontWeight: 700, color: primary }}
        >
          {brandName || 'Brand Name'}
        </p>

        {/* Body text */}
        <p
          className="text-xs leading-relaxed mb-3"
          style={{ fontFamily: bodyFamily, fontWeight: 400, color: textColor, opacity: 0.75 }}
        >
          {bodyText || 'Building brands with purpose and precision.'}
        </p>

        {/* Type hierarchy stack */}
        <div className="space-y-1 pt-2 border-t" style={{ borderColor: lightGray }}>
          {[
            { label: 'H1', size: 18, weight: 700, font: headingFamily },
            { label: 'H2', size: 15, weight: 600, font: headingFamily },
            { label: 'H3', size: 13, weight: 600, font: headingFamily },
            { label: 'Body', size: 11, weight: 400, font: bodyFamily },
            { label: 'Caption', size: 9, weight: 400, font: bodyFamily },
          ].map(({ label, size, weight, font }) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="text-[8px] w-8 text-right" style={{ color: textColor, opacity: 0.35 }}>{label}</span>
              <span style={{ fontFamily: font, fontSize: size, fontWeight: weight, color: textColor, lineHeight: 1.3 }}>
                Aa Bb Cc
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">{pairing.label}</span>
        <span className="text-[10px] text-zinc-600">Score: {Math.round(pairing.score)}</span>
      </div>
      {pairing.reasons.length > 0 && (
        <p className="text-[10px] text-zinc-600 mt-1">{pairing.reasons[0]}</p>
      )}
    </motion.button>
  );
}

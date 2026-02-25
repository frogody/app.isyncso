import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function DirectionCard({ card, selected, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative text-left rounded-[20px] overflow-hidden border-2 transition-all duration-200
        ${selected
          ? 'border-yellow-400 shadow-[0_0_24px_-6px_rgba(250,204,21,0.25)]'
          : 'border-zinc-800 hover:border-zinc-600'
        }
      `}
    >
      {/* Selected badge */}
      {selected && (
        <div className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
          <Check className="w-4 h-4 text-black" strokeWidth={3} />
        </div>
      )}

      {/* Color bar header */}
      <div className="flex h-16">
        {card.colors.map((color, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="p-5 bg-zinc-900/80" style={{ borderTop: `3px solid ${card.colors[1]}` }}>
        {/* Color swatches */}
        <div className="flex gap-2 mb-4">
          {card.colors.map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border border-white/10"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Typography sample */}
        <div className="mb-4">
          <p
            className="text-base font-bold text-white mb-1"
            style={{ fontFamily: `${card.fontPair.heading}, sans-serif` }}
          >
            {card.name}
          </p>
          <p
            className="text-xs text-zinc-400 leading-relaxed"
            style={{ fontFamily: `${card.fontPair.body}, sans-serif` }}
          >
            {card.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/5 text-zinc-500 border border-white/5"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

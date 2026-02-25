/**
 * Sub-step 2: Logo Concept Grid.
 * Displays 8-12 generated concepts in a grid with micro-previews and "more like this".
 */
import { motion } from 'framer-motion';
import { Check, Loader2, RefreshCw } from 'lucide-react';

export default function LogoConceptGrid({
  concepts,
  selectedIndex,
  onSelect,
  onMoreLikeThis,
  isLoadingMore,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Your Logo Concepts</h2>
        <p className="text-sm text-zinc-400">
          Choose your favorite, or click &quot;More like this&quot; for variations.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {concepts.map((concept, idx) => (
          <ConceptCard
            key={idx}
            concept={concept}
            index={idx}
            selected={selectedIndex === idx}
            onSelect={() => onSelect(idx)}
            onMoreLikeThis={() => onMoreLikeThis(idx)}
            isLoadingMore={isLoadingMore}
          />
        ))}
      </div>
    </div>
  );
}

function ConceptCard({ concept, index, selected, onSelect, onMoreLikeThis, isLoadingMore }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`group relative rounded-[20px] border-2 p-4 cursor-pointer transition-colors ${
        selected
          ? 'border-yellow-400 bg-yellow-400/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      {/* Main logo preview */}
      <div className="aspect-[4/3] flex items-center justify-center mb-3 rounded-xl bg-white p-4 overflow-hidden">
        <div
          dangerouslySetInnerHTML={{ __html: concept.svg_source }}
          className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
        />
      </div>

      {/* Micro-previews */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <MicroPreview label="Favicon" svg={concept.svg_source} bgClass="bg-zinc-100" size="small" />
        <MicroPreview label="Card" svg={concept.svg_source} bgClass="bg-zinc-50" size="wide" />
        <MicroPreview label="Dark" svg={concept.svg_source} bgClass="bg-zinc-900" size="small" />
      </div>

      {/* Rationale */}
      <p className="text-[10px] text-zinc-600 leading-tight mb-2 line-clamp-2">
        {concept.design_rationale}
      </p>

      {/* More like this */}
      <button
        onClick={(e) => { e.stopPropagation(); onMoreLikeThis(); }}
        disabled={isLoadingMore}
        className="w-full py-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {isLoadingMore ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3" />
        )}
        More like this
      </button>

      {/* Selected badge */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
          <Check className="w-4 h-4 text-black" />
        </div>
      )}
    </motion.div>
  );
}

function MicroPreview({ label, svg, bgClass, size }) {
  return (
    <div className="text-center">
      <div className={`${bgClass} rounded-md overflow-hidden flex items-center justify-center ${
        size === 'wide' ? 'aspect-[3/2] p-1' : 'aspect-square p-1'
      }`}>
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="w-full h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
          style={{ transform: 'scale(0.5)', transformOrigin: 'center' }}
        />
      </div>
      <span className="text-[8px] text-zinc-600 mt-0.5 block">{label}</span>
    </div>
  );
}

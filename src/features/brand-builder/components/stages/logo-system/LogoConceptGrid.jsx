/**
 * Sub-step 2: Logo Concept Grid.
 * Displays SVG concepts + AI-generated logos in a grid with micro-previews and "more like this".
 */
import { motion } from 'framer-motion';
import { Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { SafeHTML } from '@/components/ui/SafeHTML';
import ImageGenerationCard from '../../shared/ImageGenerationCard';
import RegenerateButton from '../../shared/RegenerateButton';

export default function LogoConceptGrid({
  concepts,
  selectedIndex,
  onSelect,
  onMoreLikeThis,
  isLoadingMore,
  // AI logo props
  aiLogos = [],
  aiLogosLoading = false,
  onGenerateAiLogos,
  onRegenerateAiLogo,
  selectedAiLogoIndex = null,
  onSelectAiLogo,
}) {
  const hasAiLogos = aiLogos.some(l => l?.url);
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Your Logo Concepts</h2>
        <p className="text-sm text-zinc-400">
          Choose your favorite, or click &quot;More like this&quot; for variations.
        </p>
      </div>

      {/* AI-Generated Logos Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-white">AI Logo Concepts</h3>
            <span className="text-[10px] text-zinc-600 bg-white/[0.05] px-2 py-0.5 rounded-full">Nano Banana Pro</span>
          </div>
          {aiLogos.length > 0 && (
            <RegenerateButton
              onClick={onGenerateAiLogos}
              isLoading={aiLogosLoading}
              label="Regenerate All"
            />
          )}
        </div>

        {aiLogos.length === 0 && !aiLogosLoading ? (
          <button
            onClick={onGenerateAiLogos}
            disabled={aiLogosLoading}
            className="w-full py-8 rounded-[20px] border-2 border-dashed border-yellow-400/20 bg-yellow-400/[0.03] hover:bg-yellow-400/[0.06] hover:border-yellow-400/30 transition-colors flex flex-col items-center justify-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-sm text-yellow-400 font-medium">Generate AI Logo Concepts</span>
            <span className="text-xs text-zinc-500">Creates 3 unique logo designs using AI</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {aiLogosLoading && aiLogos.length === 0 ? (
              // Loading placeholders
              [0, 1, 2].map((i) => (
                <ImageGenerationCard
                  key={`loading-${i}`}
                  isLoading
                  label="logo"
                  aspectRatio="4/3"
                />
              ))
            ) : (
              aiLogos.map((logo, idx) => (
                <AiLogoCard
                  key={idx}
                  logo={logo}
                  index={idx}
                  isLoading={logo.loading}
                  selected={selectedAiLogoIndex === idx}
                  onSelect={() => onSelectAiLogo?.(idx)}
                  onRegenerate={() => onRegenerateAiLogo(idx)}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* SVG Concept Grid — hidden when AI logos are available */}
      {!hasAiLogos && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Generated Concepts</span>
            <div className="flex-1 h-px bg-white/10" />
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
        </>
      )}
    </div>
  );
}

function AiLogoCard({ logo, index, isLoading, selected, onSelect, onRegenerate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.01 }}
      onClick={logo.url && !isLoading ? onSelect : undefined}
      className={`relative rounded-[20px] overflow-hidden cursor-pointer transition-all duration-200 border-2 ${
        selected
          ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_24px_rgba(250,204,21,0.12)]'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
    >
      <ImageGenerationCard
        imageUrl={logo.url}
        isLoading={isLoading}
        error={logo.error}
        onRetry={onRegenerate}
        label={`AI Logo ${index + 1}`}
        aspectRatio="1/1"
      />
      {logo.url && !isLoading && (
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            {['Symbol Mark', 'Lettermark', 'Wordmark'][index] || `Concept ${index + 1}`}
          </span>
          <RegenerateButton
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            isLoading={isLoading}
            label="Redo"
            size="sm"
          />
        </div>
      )}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
          <Check className="w-4 h-4 text-black" />
        </div>
      )}
    </motion.div>
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
        <SafeHTML
          html={concept.svg_source}
          svg
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
        <SafeHTML
          html={svg}
          svg
          className="w-full h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
          style={{ transform: 'scale(0.5)', transformOrigin: 'center' }}
        />
      </div>
      <span className="text-[8px] text-zinc-600 mt-0.5 block">{label}</span>
    </div>
  );
}

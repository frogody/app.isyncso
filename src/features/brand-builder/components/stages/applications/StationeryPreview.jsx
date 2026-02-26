/**
 * Sub-step 1: Stationery Preview.
 * Shows AI mockups (if generated) + SVG business card front/back, letterhead, and envelope.
 */
import { motion } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { SafeHTML } from '@/components/ui/SafeHTML';
import ImageGenerationCard from '../../shared/ImageGenerationCard';
import RegenerateButton from '../../shared/RegenerateButton';

function MockupCard({ label, svg, aspect, onRegenerate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] bg-white/[0.03] border border-white/10 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        )}
      </div>
      <div
        className="p-6 flex items-center justify-center bg-zinc-900/40"
        style={{ aspectRatio: aspect }}
      >
        <SafeHTML
          html={svg || ''}
          svg
          className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
        />
      </div>
    </motion.div>
  );
}

export default function StationeryPreview({
  stationery,
  onRegenerate,
  aiMockups = {},
  aiMockupsLoading = {},
  onGenerateAiMockup,
  onGenerateAllMockups,
}) {
  if (!stationery) return null;

  const hasAnyAiMockup = aiMockups['business-card'] || aiMockups['letterhead'];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Stationery</h2>
        <p className="text-sm text-zinc-400">
          Your brand applied to print touchpoints — business cards, letterhead, and envelope.
        </p>
      </div>

      {/* AI Mockups Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-white">AI Photorealistic Mockups</h3>
          </div>
          {hasAnyAiMockup && (
            <RegenerateButton
              onClick={onGenerateAllMockups}
              isLoading={Object.values(aiMockupsLoading).some(Boolean)}
              label="Regenerate All"
            />
          )}
        </div>

        {!hasAnyAiMockup && !aiMockupsLoading['business-card'] ? (
          <button
            onClick={onGenerateAllMockups}
            className="w-full py-6 rounded-[20px] border-2 border-dashed border-yellow-400/20 bg-yellow-400/[0.03] hover:bg-yellow-400/[0.06] hover:border-yellow-400/30 transition-colors flex flex-col items-center justify-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-yellow-400 font-medium">Generate AI Mockups</span>
            <span className="text-xs text-zinc-500">Business card, letterhead, social media & website</span>
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Business Card</span>
                <RegenerateButton
                  onClick={() => onGenerateAiMockup('business-card')}
                  isLoading={aiMockupsLoading['business-card']}
                  label="Redo"
                  size="sm"
                />
              </div>
              <ImageGenerationCard
                imageUrl={aiMockups['business-card']}
                isLoading={aiMockupsLoading['business-card']}
                error={aiMockups['business-card_error']}
                onRetry={() => onGenerateAiMockup('business-card')}
                label="Business Card"
                aspectRatio="4/3"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Letterhead</span>
                <RegenerateButton
                  onClick={() => onGenerateAiMockup('letterhead')}
                  isLoading={aiMockupsLoading['letterhead']}
                  label="Redo"
                  size="sm"
                />
              </div>
              <ImageGenerationCard
                imageUrl={aiMockups['letterhead']}
                isLoading={aiMockupsLoading['letterhead']}
                error={aiMockups['letterhead_error']}
                onRetry={() => onGenerateAiMockup('letterhead')}
                label="Letterhead"
                aspectRatio="3/4"
              />
            </div>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Algorithmic Mockups</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Business Cards — side by side */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Business Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MockupCard
            label="Front"
            svg={stationery.business_card_front}
            aspect="1.75"
            onRegenerate={() => onRegenerate('business_card_front')}
          />
          <MockupCard
            label="Back"
            svg={stationery.business_card_back}
            aspect="1.75"
            onRegenerate={() => onRegenerate('business_card_back')}
          />
        </div>
      </section>

      {/* Letterhead */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Letterhead</h3>
        <MockupCard
          label="A4 Letterhead"
          svg={stationery.letterhead}
          aspect="0.707"
          onRegenerate={() => onRegenerate('letterhead')}
        />
      </section>

      {/* Envelope */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Envelope</h3>
        <MockupCard
          label="#10 Envelope"
          svg={stationery.envelope}
          aspect="2.17"
          onRegenerate={() => onRegenerate('envelope')}
        />
      </section>
    </div>
  );
}

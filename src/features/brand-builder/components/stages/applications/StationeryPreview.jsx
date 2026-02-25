/**
 * Sub-step 1: Stationery Preview.
 * Shows business card front/back, letterhead, and envelope.
 */
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

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
        <div
          className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: svg || '' }}
        />
      </div>
    </motion.div>
  );
}

export default function StationeryPreview({ stationery, onRegenerate }) {
  if (!stationery) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Stationery</h2>
        <p className="text-sm text-zinc-400">
          Your brand applied to print touchpoints — business cards, letterhead, and envelope.
        </p>
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

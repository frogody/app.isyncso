/**
 * Sub-step 3: Presentation & Website Preview.
 * Shows slide templates and desktop/mobile website mockups.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Monitor, Smartphone, Maximize2, X, Sparkles } from 'lucide-react';
import { SafeHTML } from '@/components/ui/SafeHTML';
import ImageGenerationCard from '../../shared/ImageGenerationCard';
import RegenerateButton from '../../shared/RegenerateButton';

function SvgPreview({ svg, className = '' }) {
  return (
    <SafeHTML
      html={svg || ''}
      svg
      className={`[&>svg]:w-full [&>svg]:h-auto ${className}`}
    />
  );
}

export default function PresentationWebPreview({ presentation, websiteMockup, onRegenerate, aiMockups = {}, aiMockupsLoading = {}, onGenerateAiMockup }) {
  const [expandedSlide, setExpandedSlide] = useState(null);

  return (
    <div className="space-y-10">
      {/* Presentation Slides */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Presentation Templates</h2>
        <p className="text-sm text-zinc-400">
          Slide templates for your next presentation — title, content, divider, and closing.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Slides</h3>
          <button
            onClick={() => onRegenerate('slides')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(presentation?.slides || []).map((slide, idx) => (
            <motion.div
              key={slide.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-[20px] bg-white/[0.03] border border-white/10 overflow-hidden group"
            >
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.06]">
                <span className="text-xs font-medium text-zinc-400">{slide.name}</span>
                <button
                  onClick={() => setExpandedSlide(expandedSlide === idx ? null : idx)}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 text-zinc-500 transition-all"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4 bg-zinc-900/40" style={{ aspectRatio: '16/9' }}>
                <SvgPreview svg={slide.preview} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Expanded slide overlay */}
        {expandedSlide !== null && presentation?.slides?.[expandedSlide] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
            onClick={() => setExpandedSlide(null)}
          >
            <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setExpandedSlide(null)}
                className="absolute -top-10 right-0 p-1.5 rounded-lg bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <SvgPreview svg={presentation.slides[expandedSlide].preview} />
              </div>
              <p className="text-center text-sm text-zinc-500 mt-3">
                {presentation.slides[expandedSlide].name}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* AI Website Mockup */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3 pt-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-white">AI Website Mockup</h3>
          </div>
          {aiMockups['website'] && (
            <RegenerateButton
              onClick={() => onGenerateAiMockup('website')}
              isLoading={aiMockupsLoading['website']}
              label="Regenerate"
            />
          )}
        </div>
        {!aiMockups['website'] && !aiMockupsLoading['website'] ? (
          <button
            onClick={() => onGenerateAiMockup('website')}
            className="w-full py-6 rounded-[20px] border-2 border-dashed border-yellow-400/20 bg-yellow-400/[0.03] hover:bg-yellow-400/[0.06] hover:border-yellow-400/30 transition-colors flex flex-col items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">Generate AI Website Mockup</span>
          </button>
        ) : (
          <ImageGenerationCard
            imageUrl={aiMockups['website']}
            isLoading={aiMockupsLoading['website']}
            error={aiMockups['website_error']}
            onRetry={() => onGenerateAiMockup('website')}
            label="Website"
            aspectRatio="16/10"
          />
        )}
      </motion.section>

      {/* SVG Website Mockups */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-white mb-1">Website Mockup</h2>
        <p className="text-sm text-zinc-400">
          Your brand applied to a website — desktop and mobile views.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Desktop & Mobile</h3>
          <button
            onClick={() => onRegenerate('website')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>

        <div className="flex gap-6 items-start">
          {/* Desktop — larger */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 rounded-[20px] bg-white/[0.03] border border-white/10 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/[0.06]">
              <Monitor className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400">Desktop</span>
            </div>
            <div className="p-4 bg-zinc-900/40">
              <SvgPreview svg={websiteMockup?.screenshot_desktop} />
            </div>
          </motion.div>

          {/* Mobile — narrower */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="w-48 shrink-0 rounded-[20px] bg-white/[0.03] border border-white/10 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/[0.06]">
              <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400">Mobile</span>
            </div>
            <div className="p-3 bg-zinc-900/40">
              <SvgPreview svg={websiteMockup?.screenshot_mobile} />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/**
 * Sub-step 2: Digital Preview.
 * Shows email signature, social profiles/covers, post template, OG image, zoom bg.
 */
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

function SvgPreview({ svg, className = '' }) {
  return (
    <div
      className={`[&>svg]:w-full [&>svg]:h-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg || '' }}
    />
  );
}

function SectionHeader({ title, onRegenerate }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
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
  );
}

const PLATFORM_LABELS = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

export default function DigitalPreview({ digital, onRegenerate }) {
  if (!digital) return null;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Digital Assets</h2>
        <p className="text-sm text-zinc-400">
          Your brand across digital touchpoints — email, social media, and web.
        </p>
      </div>

      {/* Email Signature */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <SectionHeader title="Email Signature" onRegenerate={() => onRegenerate('email_signature')} />
        <div className="rounded-[20px] bg-white border border-white/10 p-6 overflow-hidden">
          <div
            dangerouslySetInnerHTML={{ __html: digital.email_signature_html || '' }}
          />
        </div>
      </motion.section>

      {/* Social Profiles */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-3"
      >
        <SectionHeader title="Social Profiles" onRegenerate={() => onRegenerate('social_profiles')} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(digital.social_profiles || {}).map(([platform, svg]) => (
            <div key={platform} className="rounded-[16px] bg-white/[0.03] border border-white/10 p-4 text-center">
              <div className="w-20 h-20 mx-auto mb-2">
                <SvgPreview svg={svg} />
              </div>
              <p className="text-[10px] text-zinc-500">{PLATFORM_LABELS[platform] || platform}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Social Covers */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <SectionHeader title="Social Covers" onRegenerate={() => onRegenerate('social_covers')} />
        <div className="space-y-4">
          {Object.entries(digital.social_covers || {}).map(([platform, svg]) => (
            <div key={platform} className="rounded-[20px] bg-white/[0.03] border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-2 border-b border-white/[0.06]">
                <span className="text-xs text-zinc-500">{PLATFORM_LABELS[platform] || platform}</span>
              </div>
              <div className="p-4 bg-zinc-900/40">
                <SvgPreview svg={svg} />
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Social Post Template */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        <SectionHeader title="Social Post Template" onRegenerate={() => onRegenerate('social_post')} />
        <div className="max-w-md">
          <div className="rounded-[20px] bg-white/[0.03] border border-white/10 overflow-hidden">
            <div className="p-4 bg-zinc-900/40 aspect-square">
              <SvgPreview svg={digital.social_post_templates?.[0]} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* OG Image + Zoom Background */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <SectionHeader title="Open Graph Image" onRegenerate={() => onRegenerate('og_image')} />
        <div className="rounded-[20px] bg-white/[0.03] border border-white/10 overflow-hidden">
          <div className="p-4 bg-zinc-900/40" style={{ aspectRatio: '1200/630' }}>
            <SvgPreview svg={digital.og_image} className="h-full" />
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-3"
      >
        <SectionHeader title="Zoom Background" onRegenerate={() => onRegenerate('zoom_background')} />
        <div className="rounded-[20px] bg-white/[0.03] border border-white/10 overflow-hidden">
          <div className="p-4 bg-zinc-900/40" style={{ aspectRatio: '16/9' }}>
            <SvgPreview svg={digital.zoom_background} className="h-full" />
          </div>
        </div>
      </motion.section>
    </div>
  );
}

/**
 * Brand Book — Sub-step 1: Configure.
 * Select sections to include, set metadata (prepared by, version, date).
 */
import { motion } from 'framer-motion';
import { BookOpen, Check } from 'lucide-react';
import { SECTION_META } from '../../../lib/brand-book-engine/index.jsx';

export default function ConfigureStep({ config, setConfig }) {
  const sections = config.sections;

  const toggleSection = (id) => {
    setConfig((prev) => ({
      ...prev,
      sections: { ...prev.sections, [id]: !prev.sections[id] },
    }));
  };

  const setField = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const enabledCount = Object.values(sections).filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Brand Book</h2>
        <p className="text-sm text-zinc-400">
          Configure your brand guidelines document. Select sections to include and set metadata.
        </p>
      </div>

      {/* Section Toggles */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Sections</h3>
          <span className="text-xs text-zinc-500">{enabledCount} of {SECTION_META.length} selected</span>
        </div>

        <div className="space-y-2">
          {SECTION_META.map((section, idx) => {
            const enabled = sections[section.id];
            return (
              <motion.button
                key={section.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-[16px] border transition-all text-left ${
                  enabled
                    ? 'bg-white/[0.05] border-white/20'
                    : 'bg-white/[0.02] border-white/[0.06] opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    enabled
                      ? 'bg-yellow-400/20 border border-yellow-400/40'
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}
                >
                  {enabled && <Check className="w-3.5 h-3.5 text-yellow-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{section.title}</p>
                  <p className="text-xs text-zinc-500">{section.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* Metadata */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-semibold text-white">Document Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Prepared by</label>
            <input
              type="text"
              value={config.preparedBy || ''}
              onChange={(e) => setField('preparedBy', e.target.value)}
              placeholder="Your name or company"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Version</label>
            <input
              type="text"
              value={config.version || '1.0'}
              onChange={(e) => setField('version', e.target.value)}
              placeholder="1.0"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Date</label>
            <input
              type="text"
              value={config.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              onChange={(e) => setField('date', e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>
      </motion.section>

      {/* Quick Reference Toggle */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button
          onClick={() => setField('includeQuickRef', !config.includeQuickRef)}
          className={`w-full flex items-center gap-4 p-4 rounded-[16px] border transition-all text-left ${
            config.includeQuickRef
              ? 'bg-white/[0.05] border-white/20'
              : 'bg-white/[0.02] border-white/[0.06] opacity-70'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              config.includeQuickRef
                ? 'bg-yellow-400/20 border border-yellow-400/40'
                : 'bg-zinc-800 border border-zinc-700'
            }`}
          >
            {config.includeQuickRef && <Check className="w-3.5 h-3.5 text-yellow-400" />}
          </div>
          <div>
            <p className="text-sm font-medium text-white">Quick Reference Card</p>
            <p className="text-xs text-zinc-500">
              Generate a single-page summary with colors, fonts, and key brand elements
            </p>
          </div>
        </button>
      </motion.section>
    </div>
  );
}

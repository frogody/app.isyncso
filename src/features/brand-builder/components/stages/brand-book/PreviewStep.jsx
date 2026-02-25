/**
 * Brand Book — Sub-step 3: Preview & Download.
 * Download buttons, section overview, regenerate option.
 */
import { motion } from 'framer-motion';
import { Download, FileText, RefreshCw, Check, BookOpen } from 'lucide-react';

export default function PreviewStep({ brandBook, pdfUrl, quickRefUrl, onDownload, onRegenerate }) {
  const sections = brandBook?.sections || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Your Brand Book is Ready</h2>
        <p className="text-sm text-zinc-400">
          Download your brand guidelines document and share it with your team.
        </p>
      </div>

      {/* Download Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Main PDF */}
        <button
          onClick={() => onDownload('main')}
          disabled={!pdfUrl}
          className="group flex flex-col items-center gap-4 p-8 rounded-[20px] bg-yellow-400/[0.08] border border-yellow-400/20 hover:bg-yellow-400/[0.12] transition-all text-center disabled:opacity-40"
        >
          <div className="w-14 h-14 rounded-2xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BookOpen className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Brand Guidelines PDF</p>
            <p className="text-xs text-zinc-500 mt-1">
              {sections.length} sections
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-medium">
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </div>
        </button>

        {/* Quick Reference */}
        {quickRefUrl && (
          <button
            onClick={() => onDownload('quickref')}
            className="group flex flex-col items-center gap-4 p-8 rounded-[20px] bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Quick Reference</p>
              <p className="text-xs text-zinc-500 mt-1">1-page summary</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-zinc-300 text-xs font-medium">
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </div>
          </button>
        )}
      </motion.div>

      {/* Section Overview */}
      {sections.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-white">Included Sections</h3>
          <div className="rounded-[16px] bg-white/[0.03] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
            {sections.map((section, idx) => (
              <div key={section.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-5 h-5 rounded-md bg-yellow-400/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-yellow-400" />
                </div>
                <span className="text-sm text-white flex-1">{section.title}</span>
                <span className="text-xs text-zinc-600">
                  p. {section.page_start}–{section.page_end}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Regenerate */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center"
      >
        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate with different settings
        </button>
      </motion.div>
    </div>
  );
}

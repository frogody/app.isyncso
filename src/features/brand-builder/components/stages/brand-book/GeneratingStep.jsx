/**
 * Brand Book — Sub-step 2: Generating.
 * Shows progress bar and step labels during PDF generation.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function GeneratingStep({ progress, progressLabel }) {
  const pct = Math.round((progress || 0) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        {/* Animated icon */}
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Generating Brand Book</h2>
          <p className="text-sm text-zinc-400">
            Compiling your brand guidelines into a professional PDF document...
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-yellow-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              <motion.span
                key={progressLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-zinc-500"
              >
                {progressLabel || 'Starting...'}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-zinc-500 font-mono">{pct}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

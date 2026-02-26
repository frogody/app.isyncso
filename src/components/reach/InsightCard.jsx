import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const INSIGHT_TYPE_STYLES = {
  performance: 'border-cyan-500/20',
  suggestion: 'border-blue-500/20',
  warning: 'border-amber-500/20',
  opportunity: 'border-green-500/20',
};

export default function InsightCard({ insight, onDismiss, className }) {
  if (!insight) return null;

  const { title, description, insight_type, data } = insight;
  const borderClass = INSIGHT_TYPE_STYLES[insight_type] || INSIGHT_TYPE_STYLES.suggestion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative bg-zinc-900/50 backdrop-blur-sm border rounded-2xl p-4',
        borderClass,
        className
      )}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-start gap-3 pr-6">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-sm font-medium text-white mb-0.5">{title}</p>
          )}
          {description && (
            <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
          )}
          {data && typeof data === 'object' && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(data).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300"
                >
                  <span className="text-zinc-500">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

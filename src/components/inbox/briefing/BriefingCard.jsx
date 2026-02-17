/**
 * BriefingCard - Reusable collapsible section card for the morning briefing
 *
 * Displays an icon, title, item count, and collapsible children content
 * with smooth Framer Motion animations and gradient top borders.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Section color map for gradient borders
const SECTION_COLORS = {
  schedule: { from: '#06b6d4', to: '#0891b2' },      // cyan
  messages: { from: '#f59e0b', to: '#d97706' },      // amber
  tasks: { from: '#06b6d4', to: '#0e7490' },          // cyan
  insights: { from: '#8b5cf6', to: '#6d28d9' },       // purple
  preMeeting: { from: '#6366f1', to: '#4f46e5' },     // indigo
  default: { from: '#06b6d4', to: '#0891b2' },        // cyan
};

export default function BriefingCard({
  icon: Icon,
  title,
  count = 0,
  children,
  defaultOpen = true,
  sectionKey = 'default',
  delay = 0,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors = SECTION_COLORS[sectionKey] || SECTION_COLORS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 overflow-hidden"
    >
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
        }}
      />

      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${colors.from}15` }}
            >
              <Icon className="w-4 h-4" style={{ color: colors.from }} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">
              {title}
            </h3>
            {count > 0 && (
              <span className="text-[11px] text-zinc-500 font-medium">
                {count} item{count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
        </motion.div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

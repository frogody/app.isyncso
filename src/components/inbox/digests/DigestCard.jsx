/**
 * DigestCard - Individual digest section card
 *
 * Displays a collapsible section for digest data (decisions, action items, etc.)
 * with icon, title, count badge, and expandable content area.
 * Items show timestamps and author avatars.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Section color map for gradient top borders
const SECTION_COLORS = {
  decisions: { from: '#06b6d4', to: '#0891b2' },
  actionItems: { from: '#f59e0b', to: '#d97706' },
  sentiment: { from: '#8b5cf6', to: '#6d28d9' },
  important: { from: '#f43f5e', to: '#e11d48' },
  questions: { from: '#3b82f6', to: '#2563eb' },
  topics: { from: '#06b6d4', to: '#0e7490' },
  default: { from: '#06b6d4', to: '#0891b2' },
};

/**
 * Format a timestamp into a human-readable relative or absolute string
 */
function formatTimestamp(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Author avatar component (initials fallback)
 */
function AuthorAvatar({ name, avatar, size = 'sm' }) {
  const sizeClasses = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || ''}
        className={`${sizeClasses} rounded-full object-cover border border-zinc-700/50 flex-shrink-0`}
       loading="lazy" decoding="async" />
    );
  }

  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div
      className={`${sizeClasses} rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center font-bold text-zinc-400 flex-shrink-0`}
    >
      {initial}
    </div>
  );
}

export default function DigestCard({
  icon: Icon,
  title,
  count = 0,
  items = [],
  sectionKey = 'default',
  defaultOpen = true,
  delay = 0,
  renderItem,
  emptyMessage = 'Nothing found in this time range.',
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors = SECTION_COLORS[sectionKey] || SECTION_COLORS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800/60 overflow-hidden"
    >
      {/* Gradient top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
        }}
      />

      {/* Header toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left group transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.from}15` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: colors.from }} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
            {count > 0 && (
              <span
                className="min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${colors.from}20`,
                  color: colors.from,
                }}
              >
                {count}
              </span>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
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
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {items.length > 0 ? (
                <div className="space-y-1.5">
                  {items.map((item, idx) => {
                    // Use custom render function if provided
                    if (renderItem) {
                      return (
                        <div key={item.id || idx}>
                          {renderItem(item, idx)}
                        </div>
                      );
                    }

                    // Default item rendering
                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/30 hover:bg-zinc-800/60 transition-colors"
                      >
                        <AuthorAvatar name={item.author} avatar={item.avatar} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold text-zinc-300 truncate">
                              {item.author || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-zinc-600 flex-shrink-0">
                              {formatTimestamp(item.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {item.text || item.content || ''}
                          </p>
                          {item.reason && (
                            <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400">
                              {item.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 py-2">{emptyMessage}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export { AuthorAvatar, formatTimestamp, SECTION_COLORS };

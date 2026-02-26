import React from 'react';
import { motion } from 'framer-motion';

/**
 * Dot-style progress indicator. Hidden on pages 1-2 (hook pages).
 * Shows dots for pages 3-10, with the current dot highlighted.
 */
export default function ProgressDots({ currentPage, totalPages = 10 }) {
  // Hide on hook pages (1 and 2)
  if (currentPage <= 2) return null;

  // Pages 3-10 map to dots 0-7
  const dotCount = totalPages - 2;
  const activeIndex = currentPage - 3;

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: dotCount }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          initial={false}
          animate={{
            width: i === activeIndex ? 24 : 8,
            height: 8,
            backgroundColor: i === activeIndex
              ? 'rgb(6, 182, 212)'        // cyan-500
              : i < activeIndex
                ? 'rgb(6, 182, 212, 0.25)' // cyan-500/25 (visited)
                : 'rgb(39, 39, 42)',       // zinc-800 (future)
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

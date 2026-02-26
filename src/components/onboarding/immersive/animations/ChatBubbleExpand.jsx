import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SYNC_CYAN = '#06b6d4';

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function ChatBubbleExpand() {
  return (
    <div className="flex flex-col items-center" style={{ width: 280, height: 160 }}>
      {/* SYNC avatar circle */}
      <motion.div
        className="rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${SYNC_CYAN}, #6366f1)`,
          boxShadow: `0 0 20px ${SYNC_CYAN}40`,
        }}
        initial={{ width: 40, height: 40 }}
        animate={{ width: 40, height: 40 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span
          className="text-white text-xs font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          S
        </motion.span>
      </motion.div>

      {/* Chat bubble expanding */}
      <motion.div
        className="mt-3 rounded-2xl border border-zinc-700/50 overflow-hidden"
        style={{ backgroundColor: 'rgba(39, 39, 42, 0.6)' }}
        initial={{ width: 40, height: 12, borderRadius: 20, opacity: 0 }}
        animate={{ width: 240, height: 80, borderRadius: 16, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="p-4 h-full flex flex-col justify-center">
          {/* Typing indicator then message */}
          <AnimatePresence mode="wait">
            {/* Typing dots phase */}
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.4, duration: 0.3 }}
            >
              <TypingDots />
            </motion.div>
          </AnimatePresence>

          {/* Message appears */}
          <motion.p
            className="text-sm text-zinc-200 leading-relaxed"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6, duration: 0.5 }}
          >
            Hey! I can help you with that...
          </motion.p>

          {/* Subtle context indicator */}
          <motion.span
            className="text-[10px] text-cyan-500/60 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.2, duration: 0.4 }}
          >
            Based on your recent activity
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}

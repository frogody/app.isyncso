/**
 * CatchUpButton - "Catch me up" button for channel headers
 *
 * Shows unread message count since last visit.
 * Sparkle/AI icon to indicate AI-powered.
 * Opens ChannelDigest overlay/drawer on click.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const CatchUpButton = memo(function CatchUpButton({
  unreadCount = 0,
  onClick,
  compact = false,
  className = '',
}) {
  const hasUnread = unreadCount > 0;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`relative p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 group ${className}`}
        title={hasUnread ? `Catch up on ${unreadCount} messages` : 'Catch me up'}
      >
        <Sparkles className="w-4 h-4" />
        {hasUnread && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-bold bg-cyan-500 text-white rounded-full px-0.5"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
        hasUnread
          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/20 hover:border-cyan-500/40'
          : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/40 hover:text-zinc-200 hover:bg-zinc-800/60'
      } ${className}`}
    >
      <Sparkles className={`w-3.5 h-3.5 ${hasUnread ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
      <span>Catch me up</span>
      {hasUnread && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-cyan-500 text-white rounded-full px-1"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.span>
      )}
    </button>
  );
});

export default CatchUpButton;

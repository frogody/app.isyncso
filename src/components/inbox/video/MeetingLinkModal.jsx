import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Link2, Video, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function MeetingLinkModal({ isOpen, onClose, call, onJoinNow }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyLink = useCallback(() => {
    if (!call?.join_url) return;
    navigator.clipboard.writeText(call.join_url).then(() => {
      setCopiedLink(true);
      toast.success('Meeting link copied');
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => toast.error('Failed to copy'));
  }, [call?.join_url]);

  const handleCopyCode = useCallback(() => {
    if (!call?.join_code) return;
    navigator.clipboard.writeText(call.join_code).then(() => {
      setCopiedCode(true);
      toast.success('Join code copied');
      setTimeout(() => setCopiedCode(false), 2000);
    }).catch(() => toast.error('Failed to copy'));
  }, [call?.join_code]);

  const handleJoinNow = useCallback(() => {
    if (onJoinNow && call?.join_code) {
      onJoinNow(call.join_code);
      onClose();
    }
  }, [onJoinNow, call?.join_code, onClose]);

  return (
    <AnimatePresence>
      {isOpen && call && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800/60 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Link2 className="w-4.5 h-4.5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Meeting Link Created</h2>
                  <p className="text-xs text-zinc-500">{call.title || 'Meeting'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Join Code */}
              <div className="text-center py-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Join Code</div>
                <div className="text-2xl font-mono font-bold text-white tracking-widest">
                  {call.join_code}
                </div>
              </div>

              {/* URL Field */}
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
                <div className="flex-1 min-w-0 px-2">
                  <span className="text-xs text-zinc-400 truncate block">{call.join_url}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-colors shrink-0"
                  title="Copy link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={call.join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-colors shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium border border-zinc-700/40 transition-colors"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
                  Code
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={handleJoinNow}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium border border-zinc-700/40 transition-colors"
              >
                <Video className="w-4 h-4 text-cyan-400" />
                Start Meeting Now
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

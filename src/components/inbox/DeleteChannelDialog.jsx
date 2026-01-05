import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Hash, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeleteChannelDialog({
  isOpen,
  onClose,
  onConfirm,
  channel,
  isDeleting = false
}) {
  if (!isOpen || !channel) return null;

  const Icon = channel.type === 'private' ? Lock : Hash;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white mb-1">
                  Delete Channel
                </h2>
                <p className="text-sm text-zinc-400">
                  This action cannot be undone.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors -mt-1 -mr-1"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-white">#{channel.name}</p>
                  {channel.description && (
                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                      {channel.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed">
              All messages, files, and history in{' '}
              <span className="text-white font-medium">#{channel.name}</span>{' '}
              will be permanently deleted. This includes all thread replies and pinned messages.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-900/80">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isDeleting}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Channel
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

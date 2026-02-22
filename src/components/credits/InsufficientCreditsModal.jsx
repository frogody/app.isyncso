import React from 'react';
import { Zap, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal displayed when an edge function returns 402 (Insufficient Credits).
 *
 * Usage:
 *   const [creditError, setCreditError] = useState(null);
 *
 *   // After edge function call:
 *   if (error?.code === 'INSUFFICIENT_CREDITS') {
 *     setCreditError(error);
 *     return;
 *   }
 *
 *   <InsufficientCreditsModal
 *     error={creditError}
 *     onClose={() => setCreditError(null)}
 *   />
 */
export function InsufficientCreditsModal({ error, onClose }) {
  const navigate = useNavigate();

  if (!error) return null;

  const required = error.required || 0;
  const available = error.available || 0;
  const actionLabel = error.action_label || error.action || 'this action';
  const shortfall = Math.max(0, required - available);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Insufficient Credits</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              You need <span className="text-white font-semibold">{required} credits</span> for{' '}
              <span className="text-cyan-400">{actionLabel}</span>, but you only have{' '}
              <span className="text-white font-semibold">{available} credits</span>.
            </p>

            {/* Credit breakdown */}
            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Required</span>
                <span className="text-white font-medium">{required} credits</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Available</span>
                <span className="text-white font-medium">{available} credits</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between text-sm">
                <span className="text-amber-400 font-medium">Shortfall</span>
                <span className="text-amber-400 font-semibold">{shortfall} credits</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/credits');
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Buy Credits
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Helper to check if an edge function response is a credit error.
 * Use this in your edge function call handlers.
 *
 * Usage:
 *   const { data, error } = await supabase.functions.invoke('generate-image', { body });
 *   const creditError = extractCreditError(data, error);
 *   if (creditError) {
 *     setCreditError(creditError);
 *     return;
 *   }
 */
export function extractCreditError(data, error) {
  // Check if the response data contains a credit error
  if (data?.code === 'INSUFFICIENT_CREDITS') {
    return data;
  }

  // Check if the error message is a JSON credit error
  if (error?.message) {
    try {
      const parsed = typeof error.message === 'string' ? JSON.parse(error.message) : error.message;
      if (parsed?.code === 'INSUFFICIENT_CREDITS') {
        return parsed;
      }
    } catch {
      // Not JSON, ignore
    }
  }

  // Check for 402 status in edge function response
  if (error?.status === 402 || data?.error === 'Insufficient credits') {
    return {
      code: 'INSUFFICIENT_CREDITS',
      required: data?.required || 0,
      available: data?.available || 0,
      action: data?.action || 'unknown',
      action_label: data?.action_label || 'this action',
    };
  }

  return null;
}

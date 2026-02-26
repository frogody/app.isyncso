/**
 * ImageGenerationCard — displays an AI-generated image with loading/error/zoom states.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ZoomIn, X } from 'lucide-react';

export default function ImageGenerationCard({
  imageUrl,
  isLoading,
  error,
  onRetry,
  label,
  aspectRatio = '1/1',
  className = '',
}) {
  const [isZoomed, setIsZoomed] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 ${className}`}
        style={{ aspectRatio }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
          <span className="text-xs text-zinc-500">{label ? `Generating ${label}...` : 'Generating...'}</span>
        </div>
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-shimmer">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-red-400/[0.03] border border-red-400/10 ${className}`}
        style={{ aspectRatio }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <AlertCircle className="w-6 h-6 text-red-400/60" />
          <span className="text-xs text-red-400/60 text-center">Generation failed</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 hover:border-white/20 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!imageUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-white/[0.02] border border-dashed border-white/10 ${className}`}
        style={{ aspectRatio }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-zinc-600">{label || 'No image'}</span>
        </div>
      </div>
    );
  }

  // Image loaded
  return (
    <>
      <motion.div
        className={`relative group overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer hover:border-white/20 transition-colors ${className}`}
        style={{ aspectRatio }}
        onClick={() => setIsZoomed(true)}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15 }}
      >
        <img
          src={imageUrl}
          alt={label || 'Generated brand image'}
          className="w-full h-full object-cover"
          loading="lazy" decoding="async"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
        </div>
        {label && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <span className="text-[10px] text-white/70">{label}</span>
          </div>
        )}
      </motion.div>

      {/* Zoom overlay */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
          >
            <button
              className="absolute top-6 right-6 text-white/60 hover:text-white"
              onClick={() => setIsZoomed(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              src={imageUrl}
              alt={label || 'Generated brand image'}
              className="max-w-full max-h-full object-contain rounded-lg"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

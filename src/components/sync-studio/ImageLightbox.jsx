import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  RefreshCw,
  Maximize2,
} from 'lucide-react';

export default function ImageLightbox({
  images = [],
  initialIndex = 0,
  open = false,
  onClose,
  onRegenerate,
  onDownload,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  const currentImage = images[currentIndex] || null;

  const goNext = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCurrentIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const toggleZoom = useCallback(() => {
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  }, [zoom]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      else if (e.key === ' ' || e.key === 'z') { e.preventDefault(); toggleZoom(); }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, goNext, goPrev, toggleZoom]);

  // Mouse drag for panning when zoomed
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  if (!open || !currentImage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">
              <span className="text-white font-medium tabular-nums">{currentIndex + 1}</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span className="tabular-nums">{images.length}</span>
            </span>
            {currentImage.product_title && (
              <>
                <div className="w-px h-4 bg-zinc-700" />
                <span className="text-sm text-zinc-300 truncate max-w-xs">
                  {currentImage.product_title}
                </span>
              </>
            )}
            {currentImage.shot_number != null && (
              <span className="text-xs text-zinc-500">Shot #{currentImage.shot_number}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onDownload && (
              <button
                onClick={() => onDownload(currentImage)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
                title="Download (D)"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(currentImage)}
                className="p-2 rounded-lg text-zinc-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                title="Regenerate (R)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={toggleZoom}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
              title="Toggle Zoom (Space)"
            >
              {zoom > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Prev button */}
          {images.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute left-4 z-10 p-2 rounded-xl bg-zinc-900/60 border border-zinc-700/40 text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="max-w-[90vw] max-h-[80vh] select-none"
            style={{
              cursor: zoom > 1 ? 'grab' : 'zoom-in',
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
              if (!isDragging.current) toggleZoom();
            }}
          >
            <img
              src={currentImage.image_url}
              alt={currentImage.product_title || `Image ${currentIndex + 1}`}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              }}
              draggable={false}
            />
          </motion.div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={goNext}
              className="absolute right-4 z-10 p-2 rounded-xl bg-zinc-900/60 border border-zinc-700/40 text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="shrink-0 px-4 py-3 flex items-center justify-center gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.image_id || i}
                onClick={() => {
                  setCurrentIndex(i);
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  i === currentIndex
                    ? 'border-yellow-500 ring-1 ring-yellow-500/30'
                    : 'border-zinc-700/40 hover:border-zinc-500/60 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Keyboard hint */}
        <div className="shrink-0 flex items-center justify-center gap-4 pb-3 text-[10px] text-zinc-600">
          <span>Arrow keys to navigate</span>
          <span>Space to zoom</span>
          <span>Esc to close</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

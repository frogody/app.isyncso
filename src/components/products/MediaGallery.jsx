import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, X, Play, Maximize2, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

export default function MediaGallery({
  images = [],
  videos = [],
  featuredImage = null,
  className,
}) {
  const { t } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('images');

  const allImages = [
    ...(featuredImage ? [featuredImage] : []),
    ...images
  ].filter(Boolean);

  const allMedia = activeTab === 'images' ? allImages : videos;

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allMedia.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < allMedia.length - 1 ? prev + 1 : 0));
  };

  const handleThumbnailClick = (index) => {
    setSelectedIndex(index);
  };

  const openLightbox = (index) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  if (allImages.length === 0 && videos.length === 0) {
    return (
      <div className={cn(`rounded-2xl ${t('bg-white shadow-sm', 'bg-zinc-900/50')} border ${t('border-slate-200', 'border-white/5')} p-12 text-center`, className)}>
        <div className={`w-16 h-16 rounded-full ${t('bg-slate-100', 'bg-zinc-800')} flex items-center justify-center mx-auto mb-4`}>
          <ImageIcon className={`w-8 h-8 ${t('text-slate-400', 'text-zinc-600')}`} />
        </div>
        <p className={t('text-slate-500', 'text-zinc-500')}>No media available</p>
      </div>
    );
  }

  const currentMedia = allMedia[selectedIndex] || allMedia[0];
  const isVideo = activeTab === 'videos';

  return (
    <div className={cn("space-y-4", className)}>
      {videos.length > 0 && (
        <div className={`flex items-center gap-2 p-1 rounded-lg ${t('bg-slate-100', 'bg-zinc-800/50')} border ${t('border-slate-200', 'border-white/5')} w-fit`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActiveTab('images'); setSelectedIndex(0); }}
            className={cn(
              "px-4",
              activeTab === 'images'
                ? "bg-cyan-500/20 text-cyan-400"
                : `${t('text-slate-500', 'text-zinc-400')} ${t('hover:text-slate-900', 'hover:text-white')}`
            )}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Images ({allImages.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActiveTab('videos'); setSelectedIndex(0); }}
            className={cn(
              "px-4",
              activeTab === 'videos'
                ? "bg-cyan-500/20 text-cyan-400"
                : `${t('text-slate-500', 'text-zinc-400')} ${t('hover:text-slate-900', 'hover:text-white')}`
            )}
          >
            <Play className="w-4 h-4 mr-2" />
            Videos ({videos.length})
          </Button>
        </div>
      )}

      <div className={`relative rounded-2xl overflow-hidden ${t('bg-white shadow-sm', 'bg-zinc-900/50')} border ${t('border-slate-200', 'border-white/5')}`}>
        <div className="aspect-video relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${selectedIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {isVideo ? (
                currentMedia?.url ? (
                  <video
                    src={currentMedia.url}
                    poster={currentMedia.thumbnail}
                    controls
                    className="w-full h-full object-contain bg-black"
                  />
                ) : currentMedia?.embed_url ? (
                  <iframe
                    src={currentMedia.embed_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${t('bg-slate-100', 'bg-zinc-900')}`}>
                    <Play className={`w-16 h-16 ${t('text-slate-400', 'text-zinc-600')}`} />
                  </div>
                )
              ) : (
                currentMedia?.url ? (
                  <img
                    src={currentMedia.url}
                    alt={currentMedia.alt || `Image ${selectedIndex + 1}`}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => openLightbox(selectedIndex)}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${t('bg-slate-100', 'bg-zinc-900')}`}>
                    <ImageIcon className={`w-16 h-16 ${t('text-slate-400', 'text-zinc-600')}`} />
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>

          {allMedia.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {!isVideo && currentMedia?.url && (
            <button
              onClick={() => openLightbox(selectedIndex)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          )}

          {allMedia.length > 1 && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm">
              {selectedIndex + 1} / {allMedia.length}
            </div>
          )}
        </div>
      </div>

      {allMedia.length > 1 && (
        <div className={`flex gap-2 overflow-x-auto pb-2 ${t('scrollbar-thin scrollbar-thumb-slate-300', 'scrollbar-thin scrollbar-thumb-zinc-700')}`}>
          {allMedia.map((media, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                selectedIndex === index
                  ? "border-cyan-500 ring-2 ring-cyan-500/30"
                  : `${t('border-slate-200', 'border-white/10')} ${t('hover:border-slate-400', 'hover:border-white/30')}`
              )}
            >
              {isVideo ? (
                <div className={`w-full h-full ${t('bg-slate-100', 'bg-zinc-800')} flex items-center justify-center relative`}>
                  {media.thumbnail ? (
                    <img
                      src={media.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={media.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="bg-black border-none max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {allMedia.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {currentMedia?.url && (
              <img
                src={currentMedia.url}
                alt={currentMedia.alt || ''}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {currentMedia?.caption && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/70 backdrop-blur-sm text-white text-sm max-w-lg text-center">
                {currentMedia.caption}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

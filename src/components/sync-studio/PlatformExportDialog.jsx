import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2, Monitor, Smartphone, ShoppingBag, Settings2 } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';

const PLATFORMS = [
  {
    key: 'bolcom',
    name: 'Bol.com',
    icon: ShoppingBag,
    width: 2400,
    height: 2400,
    format: 'jpeg',
    quality: 0.95,
    description: 'Optimal for Bol.com product listings',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    icon: Smartphone,
    width: 1080,
    height: 1080,
    format: 'jpeg',
    quality: 0.92,
    description: 'Square format for feed posts',
  },
  {
    key: 'shopify',
    name: 'Shopify',
    icon: ShoppingBag,
    width: 2048,
    height: 2048,
    format: 'png',
    quality: 1,
    description: 'High-quality PNG for storefronts',
  },
  {
    key: 'web',
    name: 'Web / General',
    icon: Monitor,
    width: 1200,
    height: 1200,
    format: 'jpeg',
    quality: 0.9,
    description: 'Optimized for fast web loading',
  },
  {
    key: 'custom',
    name: 'Custom',
    icon: Settings2,
    width: 1024,
    height: 1024,
    format: 'png',
    quality: 1,
    description: 'Set your own dimensions',
  },
];

async function resizeAndDownload(imageUrl, targetWidth, targetHeight, format, quality, filename) {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      // Fill background for JPEG
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      // Scale to fit (contain)
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (targetWidth - sw) / 2;
      const sy = (targetHeight - sh) / 2;

      ctx.drawImage(img, sx, sy, sw, sh);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas export failed'));
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filename}.${format === 'jpeg' ? 'jpg' : format}`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        },
        `image/${format}`,
        quality,
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

export default function PlatformExportDialog({ open, onClose, images = [] }) {
  const { ct } = useTheme();
  const [selected, setSelected] = useState('bolcom');
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const platform = PLATFORMS.find((p) => p.key === selected);

  const handleExport = useCallback(async () => {
    if (!platform || images.length === 0) return;
    setExporting(true);
    setProgress(0);

    const w = selected === 'custom' ? customWidth : platform.width;
    const h = selected === 'custom' ? customHeight : platform.height;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const name = `${img.product_ean || 'image'}_shot${img.shot_number || i + 1}_${platform.key}`;
      try {
        await resizeAndDownload(img.image_url, w, h, platform.format, platform.quality, name);
      } catch (err) {
        console.warn('Export failed for image:', err);
      }
      setProgress(i + 1);
      // Small delay between downloads
      if (i < images.length - 1) await new Promise((r) => setTimeout(r, 300));
    }

    setExporting(false);
    onClose?.();
  }, [platform, images, selected, customWidth, customHeight, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`${ct('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')} border rounded-2xl max-w-lg w-full shadow-2xl`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${ct('border-slate-200', 'border-zinc-800/50')}`}>
            <div>
              <h3 className={`text-base font-semibold ${ct('text-slate-900', 'text-white')}`}>Export Images</h3>
              <p className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} mt-0.5`}>
                {images.length} image{images.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg ${ct('text-slate-400 hover:text-slate-900 hover:bg-slate-100', 'text-zinc-500 hover:text-white hover:bg-zinc-800')} transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Platform grid */}
          <div className="px-5 py-4 space-y-3">
            <label className={`text-[11px] font-medium ${ct('text-slate-500', 'text-zinc-500')} uppercase tracking-wider`}>
              Platform Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.key}
                    onClick={() => setSelected(p.key)}
                    className={`text-left rounded-xl p-3 transition-all ${
                      selected === p.key
                        ? 'bg-yellow-500/10 border border-yellow-500/30 ring-1 ring-yellow-500/20'
                        : `${ct('bg-slate-50 border-slate-200', 'bg-zinc-800/40 border-zinc-700/30')} hover:border-zinc-600`
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mb-1.5 ${
                        selected === p.key ? 'text-yellow-400' : 'text-zinc-500'
                      }`}
                    />
                    <p
                      className={`text-xs font-semibold ${
                        selected === p.key ? 'text-yellow-300' : 'text-zinc-300'
                      }`}
                    >
                      {p.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {p.key === 'custom'
                        ? `${customWidth}x${customHeight}`
                        : `${p.width}x${p.height}`}{' '}
                      {p.format.toUpperCase()}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom dimensions */}
            {selected === 'custom' && (
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500 mb-1 block">Width</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value) || 1024)}
                    className={`w-full ${ct('bg-white border-slate-300', 'bg-zinc-800/60 border-zinc-700/40')} border rounded-lg px-3 py-1.5 text-sm ${ct('text-slate-900', 'text-white')} tabular-nums focus:outline-none focus:border-yellow-500/40`}
                  />
                </div>
                <span className="text-zinc-600 text-sm mt-4">&times;</span>
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500 mb-1 block">Height</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value) || 1024)}
                    className={`w-full ${ct('bg-white border-slate-300', 'bg-zinc-800/60 border-zinc-700/40')} border rounded-lg px-3 py-1.5 text-sm ${ct('text-slate-900', 'text-white')} tabular-nums focus:outline-none focus:border-yellow-500/40`}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            {platform && (
              <p className="text-xs text-zinc-500 mt-2">{platform.description}</p>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-end gap-3 px-5 py-4 border-t ${ct('border-slate-200', 'border-zinc-800/50')}`}>
            <button
              onClick={onClose}
              disabled={exporting}
              className={`px-4 py-2 text-sm ${ct('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')} transition-colors disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || images.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/20"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting {progress}/{images.length}...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {images.length} Image{images.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

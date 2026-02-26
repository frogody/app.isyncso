import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Smartphone,
  Tablet,
  Monitor,
  Save,
  Globe,
  Loader2,
  Check,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const DEVICES = [
  { key: 'desktop', icon: Monitor, label: 'Desktop' },
  { key: 'tablet', icon: Tablet, label: 'Tablet' },
  { key: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export default function BuilderToolbar({
  onBack,
  storeName = '',
  isDirty = false,
  saving = false,
  onSave,
  onPublish,
  isPublished = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  previewDevice = 'desktop',
  onDeviceChange,
}) {
  const [showUnpublish, setShowUnpublish] = useState(false);
  const unpublishRef = useRef(null);

  // Close unpublish dropdown on outside click
  useEffect(() => {
    if (!showUnpublish) return;

    const handleClickOutside = (e) => {
      if (unpublishRef.current && !unpublishRef.current.contains(e.target)) {
        setShowUnpublish(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUnpublish]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-14 border-b border-zinc-800/60 bg-zinc-950 flex items-center px-4 shrink-0">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors rounded-lg px-2 py-1.5 hover:bg-zinc-800/60 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="hidden sm:block w-px h-5 bg-zinc-800" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-white whitespace-nowrap">
              Store Builder
            </span>
            {storeName && (
              <span className="text-sm text-zinc-500 truncate max-w-[200px]">
                — {storeName}
              </span>
            )}
            <AnimatePresence>
              {isDirty && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 cursor-default"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-200 border-zinc-700 text-xs">
                    You have unsaved changes
                  </TooltipContent>
                </Tooltip>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Center: Undo/Redo + Device toggle */}
        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 rounded-lg transition-colors ${
                  canUndo
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    : 'text-zinc-600 opacity-30 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-200 border-zinc-700 text-xs">
              Undo last change
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 rounded-lg transition-colors ${
                  canRedo
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    : 'text-zinc-600 opacity-30 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-200 border-zinc-700 text-xs">
              Redo last change
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-zinc-800 mx-1" />

          {/* Device toggle */}
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded-lg p-0.5">
            {DEVICES.map(({ key, icon: Icon, label }) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDeviceChange?.(key)}
                    className={`p-2 rounded-lg transition-colors ${
                      previewDevice === key
                        ? 'bg-zinc-800 text-cyan-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-200 border-zinc-700 text-xs">
                  Preview as {label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Save + Publish */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Save</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-200 border-zinc-700 text-xs">
              Save your store configuration
            </TooltipContent>
          </Tooltip>

          {isPublished ? (
            <div className="relative" ref={unpublishRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowUnpublish((prev) => !prev)}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/25 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">Published</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-200 border-zinc-700 text-xs">
                  Your store is live — click to manage
                </TooltipContent>
              </Tooltip>

              <AnimatePresence>
                {showUnpublish && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        setShowUnpublish(false);
                        onPublish?.();
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors whitespace-nowrap w-full"
                    >
                      <Globe className="w-4 h-4" />
                      Unpublish Store
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onPublish}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-cyan-600 text-white hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">Publish</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-200 border-zinc-700 text-xs">
                Make your store publicly accessible
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

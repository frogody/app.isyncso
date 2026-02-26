import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Monitor } from 'lucide-react';

const DEVICE_FRAMES = {
  desktop: {
    width: 'w-full',
    height: 'h-full',
    containerClass: '',
    frameClass: 'rounded-xl',
    bezel: false,
  },
  tablet: {
    width: 'w-[768px]',
    height: 'h-[1024px]',
    containerClass: 'max-h-full',
    frameClass: 'rounded-[2rem]',
    bezel: true,
  },
  mobile: {
    width: 'w-[375px]',
    height: 'h-[812px]',
    containerClass: 'max-h-full',
    frameClass: 'rounded-[2.5rem]',
    bezel: true,
  },
};

function DeviceBezel({ device, children }) {
  if (device === 'desktop') {
    return (
      <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-zinc-700/50">
        {children}
      </div>
    );
  }

  if (device === 'mobile') {
    return (
      <div className="relative bg-zinc-800 rounded-[2.5rem] p-2 shadow-2xl shadow-black/50 border border-zinc-700/50 flex flex-col h-full">
        {/* Notch */}
        <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
          <div className="w-28 h-6 bg-zinc-900 rounded-full" />
        </div>

        {/* Screen */}
        <div className="flex-1 bg-white rounded-[1.75rem] overflow-hidden min-h-0">
          {children}
        </div>

        {/* Home indicator */}
        <div className="flex items-center justify-center py-2 shrink-0">
          <div className="w-32 h-1 bg-zinc-600 rounded-full" />
        </div>
      </div>
    );
  }

  // Tablet
  return (
    <div className="relative bg-zinc-800 rounded-[2rem] p-3 shadow-2xl shadow-black/50 border border-zinc-700/50 flex flex-col h-full">
      {/* Top bezel with camera dot */}
      <div className="flex items-center justify-center py-1.5 shrink-0">
        <div className="w-2.5 h-2.5 bg-zinc-700 rounded-full" />
      </div>

      {/* Screen */}
      <div className="flex-1 bg-white rounded-xl overflow-hidden min-h-0">
        {children}
      </div>

      {/* Bottom bezel */}
      <div className="h-3 shrink-0" />
    </div>
  );
}

export default function BuilderCanvas({
  config,
  organizationId,
  previewDevice = 'desktop',
  iframeRef,
  previewLoading = false,
  onIframeLoad,
}) {
  const frame = DEVICE_FRAMES[previewDevice] || DEVICE_FRAMES.desktop;
  const hasConfig = config && Object.keys(config).length > 0;

  const previewUrl = organizationId
    ? `/store-preview/${organizationId}`
    : 'about:blank';

  return (
    <div
      className="flex-1 bg-zinc-900/30 overflow-hidden flex items-center justify-center p-6 relative"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <AnimatePresence mode="wait">
        {!hasConfig ? (
          /* Empty state */
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
              <Monitor className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-600">Preview will appear here</p>
          </motion.div>
        ) : (
          /* Device frame */
          <motion.div
            key={previewDevice}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`${frame.width} ${frame.height} ${frame.containerClass} relative`}
          >
            <DeviceBezel device={previewDevice}>
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Store preview"
                onLoad={onIframeLoad}
              />
            </DeviceBezel>

            {/* Loading overlay */}
            <AnimatePresence>
              {previewLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm z-10"
                  style={{
                    borderRadius:
                      previewDevice === 'mobile'
                        ? '2.5rem'
                        : previewDevice === 'tablet'
                          ? '2rem'
                          : '0.75rem',
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    <span className="text-xs text-zinc-400">
                      Updating preview...
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

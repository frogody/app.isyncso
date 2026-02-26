import React, { useState, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BannerRenderer
 *
 * Premium notification banner bar for the B2B wholesale storefront.
 * Features shimmer sweep animation, sparkle icon, spring entrance animation,
 * elevated dismiss interaction, and rich promo gradient.
 */

const KEYFRAMES_ID = 'banner-renderer-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes banner-shimmer {
      0% {
        transform: translateX(-100%) skewX(-15deg);
      }
      100% {
        transform: translateX(400%) skewX(-15deg);
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Maps the banner style prop to background CSS.
 * Uses CSS custom properties for theming where appropriate.
 */
function getBannerBackground(style) {
  switch (style) {
    case 'success':
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderColor: 'rgba(34, 197, 94, 0.25)',
        textColor: '#4ade80',
        shimmerColor: 'rgba(34, 197, 94, 0.08)',
      };
    case 'warning':
      return {
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.25)',
        textColor: '#fbbf24',
        shimmerColor: 'rgba(245, 158, 11, 0.08)',
      };
    case 'promo':
      return {
        background: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 55%, #8b5cf6) 50%, var(--ws-primary))`,
        borderColor: 'transparent',
        textColor: '#ffffff',
        shimmerColor: 'rgba(255, 255, 255, 0.12)',
      };
    case 'info':
    default:
      return {
        backgroundColor: 'color-mix(in srgb, var(--ws-primary) 12%, transparent)',
        borderColor: 'color-mix(in srgb, var(--ws-primary) 25%, transparent)',
        textColor: 'var(--ws-primary)',
        shimmerColor: 'color-mix(in srgb, var(--ws-primary) 8%, transparent)',
      };
  }
}

export default function BannerRenderer({ section, theme }) {
  const {
    text,
    link = null,
    linkText = null,
    dismissible = false,
    style = 'info',
    position = 'inline',
  } = section?.props || {};

  const [dismissed, setDismissed] = useState(false);

  useMemo(() => ensureKeyframes(), []);

  if (!text) return null;

  const bannerStyle = getBannerBackground(style);
  const isPromo = style === 'promo';

  const containerStyle = isPromo
    ? {
        background: bannerStyle.background,
        borderColor: bannerStyle.borderColor,
      }
    : {
        backgroundColor: bannerStyle.backgroundColor,
        borderColor: bannerStyle.borderColor,
      };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          className="relative border-b px-4 py-3.5 overflow-hidden"
          style={containerStyle}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        >
          {/* Shimmer sweep animation */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '30%',
                height: '100%',
                background: `linear-gradient(90deg, transparent, ${bannerStyle.shimmerColor}, transparent)`,
                animation: 'banner-shimmer 4s ease-in-out infinite',
              }}
            />
          </div>

          <div className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {/* Sparkle icon */}
            <Sparkles
              className="w-4 h-4 flex-shrink-0"
              style={{
                color: bannerStyle.textColor,
                opacity: 0.8,
              }}
            />

            {/* Banner text */}
            <p
              className="text-center text-sm font-medium"
              style={{
                color: bannerStyle.textColor,
                letterSpacing: '0.025em',
              }}
            >
              {text}
            </p>

            {/* Inline link */}
            {link && linkText && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2 transition-opacity duration-200 hover:opacity-80"
                style={{
                  color: bannerStyle.textColor,
                  letterSpacing: '0.015em',
                }}
              >
                {linkText}
                <span aria-hidden="true">&rarr;</span>
              </a>
            )}
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-all duration-200 hover:ring-2 hover:ring-white/20"
              style={{
                backgroundColor: 'transparent',
              }}
              aria-label="Dismiss banner"
            >
              <X
                className="h-4 w-4 transition-transform duration-200 hover:scale-110"
                style={{ color: bannerStyle.textColor }}
              />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

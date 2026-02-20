import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Maps the banner `style` prop to background CSS.
 * Uses CSS custom properties for theming where appropriate.
 */
function getBannerBackground(style) {
  switch (style) {
    case 'success':
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: 'rgba(34, 197, 94, 0.3)',
        textColor: '#4ade80',
      };
    case 'warning':
      return {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        textColor: '#fbbf24',
      };
    case 'promo':
      return {
        background: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 60%, #8b5cf6))`,
        borderColor: 'transparent',
        textColor: '#ffffff',
      };
    case 'info':
    default:
      return {
        backgroundColor: 'color-mix(in srgb, var(--ws-primary) 15%, transparent)',
        borderColor: 'color-mix(in srgb, var(--ws-primary) 30%, transparent)',
        textColor: 'var(--ws-primary)',
      };
  }
}

/**
 * BannerRenderer
 *
 * Renders a compact notification banner bar with style variants,
 * optional inline link, and optional dismiss button.
 */
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

  if (dismissed || !text) return null;

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
    <div
      className="relative border-b px-4 py-3"
      style={containerStyle}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {/* Banner text */}
        <p
          className="text-center text-sm font-medium"
          style={{ color: bannerStyle.textColor }}
        >
          {text}
        </p>

        {/* Inline link */}
        {link && linkText && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: bannerStyle.textColor }}
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
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition-opacity hover:opacity-70"
          aria-label="Dismiss banner"
        >
          <X
            className="h-4 w-4"
            style={{ color: bannerStyle.textColor }}
          />
        </button>
      )}
    </div>
  );
}

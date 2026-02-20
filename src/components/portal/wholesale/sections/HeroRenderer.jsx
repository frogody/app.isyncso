import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * HeroRenderer
 *
 * Full-width hero section for the B2B wholesale storefront.
 * Supports background images with configurable overlay, gradient fallbacks,
 * flexible text alignment, and primary/secondary CTA buttons.
 */

const ALIGNMENT_CLASSES = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

const BUTTON_ALIGNMENT_CLASSES = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export default function HeroRenderer({ section, theme }) {
  const {
    heading = '',
    subheading = '',
    ctaText = '',
    ctaLink = '#',
    secondaryCtaText = '',
    secondaryCtaLink = '#',
    backgroundImage = null,
    alignment = 'center',
    overlay = true,
    overlayOpacity = 0.5,
  } = section?.props || {};

  const alignClasses = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;
  const buttonAlignClasses = BUTTON_ALIGNMENT_CLASSES[alignment] || BUTTON_ALIGNMENT_CLASSES.center;

  const primaryColor = theme?.primaryColor || 'var(--ws-primary)';

  // Build background style depending on image availability
  const buildBackgroundStyle = () => {
    if (backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }

    // Gradient fallback using theme colors
    return {
      background: `linear-gradient(135deg, var(--ws-bg) 0%, var(--ws-surface) 50%, var(--ws-bg) 100%)`,
    };
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        minHeight: 'max(500px, 60vh)',
        fontFamily: 'var(--ws-font)',
        color: 'var(--ws-text)',
        ...buildBackgroundStyle(),
      }}
    >
      {/* Dark overlay for background images */}
      {backgroundImage && overlay && (
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
        />
      )}

      {/* Decorative gradient accent when no background image */}
      {!backgroundImage && (
        <div
          className="absolute inset-0 z-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, var(--ws-primary), transparent 70%)`,
          }}
        />
      )}

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col ${alignClasses} justify-center h-full px-6 sm:px-10 lg:px-20 py-20`}
        style={{ minHeight: 'max(500px, 60vh)' }}
      >
        <div className="max-w-3xl w-full">
          {heading && (
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6"
              style={{ fontFamily: 'var(--ws-heading-font)' }}
            >
              {heading}
            </h1>
          )}

          {subheading && (
            <p
              className="text-lg sm:text-xl lg:text-2xl leading-relaxed mb-10 max-w-2xl"
              style={{ color: 'var(--ws-muted)' }}
            >
              {subheading}
            </p>
          )}

          {/* CTA Buttons */}
          {(ctaText || secondaryCtaText) && (
            <div
              className={`flex flex-col sm:flex-row gap-4 ${buttonAlignClasses}`}
            >
              {ctaText && (
                <a
                  href={ctaLink}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-base font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--ws-primary)',
                    color: 'var(--ws-bg)',
                  }}
                >
                  {ctaText}
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}

              {secondaryCtaText && (
                <a
                  href={secondaryCtaLink}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-base font-semibold transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
                  style={{
                    border: '1.5px solid var(--ws-primary)',
                    color: 'var(--ws-primary)',
                    backgroundColor: 'transparent',
                  }}
                >
                  {secondaryCtaText}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

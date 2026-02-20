import React from 'react';

/**
 * CTARenderer
 *
 * Renders a Call-to-Action section with heading, subheading, and up to two
 * buttons (primary + secondary). Supports three visual styles: 'banner',
 * 'card', 'minimal'. Text alignment is configurable.
 *
 * Props from section.props:
 * - heading: string
 * - subheading: string
 * - ctaText: string
 * - ctaLink: string
 * - secondaryCtaText: string
 * - secondaryCtaLink: string
 * - style: 'banner'|'card'|'minimal'
 * - alignment: 'left'|'center'|'right'
 */

const ALIGNMENT_CLASSES = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

const BUTTON_ALIGNMENT = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

function CTAButtons({ ctaText, ctaLink, secondaryCtaText, secondaryCtaLink, alignment }) {
  const hasPrimary = ctaText && ctaLink;
  const hasSecondary = secondaryCtaText && secondaryCtaLink;

  if (!hasPrimary && !hasSecondary) return null;

  return (
    <div
      className={`flex flex-wrap gap-4 mt-8 ${BUTTON_ALIGNMENT[alignment] || BUTTON_ALIGNMENT.center}`}
    >
      {hasPrimary && (
        <a
          href={ctaLink}
          className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-base font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg)',
          }}
        >
          {ctaText}
        </a>
      )}
      {hasSecondary && (
        <a
          href={secondaryCtaLink}
          className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-base font-semibold transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--ws-primary)',
            border: '2px solid var(--ws-primary)',
          }}
        >
          {secondaryCtaText}
        </a>
      )}
    </div>
  );
}

function BannerCTA({ heading, subheading, alignment, ...buttonProps }) {
  const align = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
      <div
        className="max-w-6xl mx-auto rounded-2xl py-16 px-6 sm:px-12"
        style={{
          background: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 60%, #000))`,
        }}
      >
        <div className={`flex flex-col ${align} max-w-3xl ${alignment === 'center' ? 'mx-auto' : alignment === 'right' ? 'ml-auto' : ''}`}>
          {heading && (
            <h2
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{
                color: 'var(--ws-bg)',
                fontFamily: 'var(--ws-heading-font)',
              }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p
              className="text-base sm:text-lg opacity-90"
              style={{ color: 'var(--ws-bg)' }}
            >
              {subheading}
            </p>
          )}
          <div className={`flex flex-wrap gap-4 mt-8 ${BUTTON_ALIGNMENT[alignment] || BUTTON_ALIGNMENT.center}`}>
            {buttonProps.ctaText && buttonProps.ctaLink && (
              <a
                href={buttonProps.ctaLink}
                className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-base font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--ws-bg)',
                  color: 'var(--ws-primary)',
                }}
              >
                {buttonProps.ctaText}
              </a>
            )}
            {buttonProps.secondaryCtaText && buttonProps.secondaryCtaLink && (
              <a
                href={buttonProps.secondaryCtaLink}
                className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-base font-semibold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--ws-bg)',
                  border: '2px solid var(--ws-bg)',
                }}
              >
                {buttonProps.secondaryCtaText}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CardCTA({ heading, subheading, alignment, ...buttonProps }) {
  const align = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;

  return (
    <section
      className="w-full py-16 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
    >
      <div
        className="max-w-2xl mx-auto rounded-2xl p-10 sm:p-14 shadow-lg"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div className={`flex flex-col ${align}`}>
          {heading && (
            <h2
              className="text-2xl sm:text-3xl font-bold mb-3"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p
              className="text-base sm:text-lg"
              style={{ color: 'var(--ws-muted)' }}
            >
              {subheading}
            </p>
          )}
          <CTAButtons alignment={alignment} {...buttonProps} />
        </div>
      </div>
    </section>
  );
}

function MinimalCTA({ heading, subheading, alignment, ...buttonProps }) {
  const align = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;

  return (
    <section
      className="w-full py-16 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
    >
      <div
        className={`max-w-3xl ${alignment === 'center' ? 'mx-auto' : alignment === 'right' ? 'ml-auto mr-0' : 'mr-auto ml-0'}`}
      >
        <div className={`flex flex-col ${align}`}>
          {heading && (
            <h2
              className="text-2xl sm:text-3xl font-bold mb-3"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p
              className="text-base sm:text-lg"
              style={{ color: 'var(--ws-muted)' }}
            >
              {subheading}
            </p>
          )}
          <CTAButtons alignment={alignment} {...buttonProps} />
        </div>
      </div>
    </section>
  );
}

export default function CTARenderer({ section, theme }) {
  const {
    heading = '',
    subheading = '',
    ctaText = '',
    ctaLink = '',
    secondaryCtaText = '',
    secondaryCtaLink = '',
    style: variant = 'banner',
    alignment = 'center',
  } = section?.props || {};

  const sharedProps = {
    heading,
    subheading,
    ctaText,
    ctaLink,
    secondaryCtaText,
    secondaryCtaLink,
    alignment,
  };

  if (variant === 'card') {
    return <CardCTA {...sharedProps} />;
  }

  if (variant === 'minimal') {
    return <MinimalCTA {...sharedProps} />;
  }

  // Default: 'banner'
  return <BannerCTA {...sharedProps} />;
}

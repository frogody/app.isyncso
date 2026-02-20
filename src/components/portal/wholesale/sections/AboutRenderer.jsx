import React from 'react';

/**
 * AboutRenderer
 *
 * Renders an About section with heading, content paragraph, optional image,
 * and optional stats row. Image position (left/right) is configurable.
 *
 * Props from section.props:
 * - heading: string
 * - content: string (paragraph text)
 * - image: string|null (URL)
 * - imagePosition: 'left'|'right'
 * - stats: array of { label, value }
 * - showStats: boolean
 */
export default function AboutRenderer({ section, theme }) {
  const {
    heading = '',
    content = '',
    image = null,
    imagePosition = 'right',
    stats = [],
    showStats = false,
  } = section?.props || {};

  const hasImage = !!image;
  const imageOnLeft = imagePosition === 'left';

  return (
    <section
      className="w-full py-16 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--ws-bg)', color: 'var(--ws-text)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Two-column layout: text + image */}
        <div
          className={`flex flex-col ${
            hasImage ? 'lg:flex-row' : ''
          } gap-10 lg:gap-16 items-center`}
        >
          {/* Image column (left position) */}
          {hasImage && imageOnLeft && (
            <div className="w-full lg:w-1/2 flex-shrink-0">
              <img
                src={image}
                alt={heading || 'About'}
                className="w-full h-auto rounded-2xl object-cover max-h-[480px]"
                style={{ border: '1px solid var(--ws-border)' }}
              />
            </div>
          )}

          {/* Text column */}
          <div className={`w-full ${hasImage ? 'lg:w-1/2' : 'lg:max-w-3xl lg:mx-auto'}`}>
            {heading && (
              <h2
                className="text-3xl sm:text-4xl font-bold mb-6 leading-tight"
                style={{
                  color: 'var(--ws-text)',
                  fontFamily: 'var(--ws-heading-font)',
                }}
              >
                {heading}
              </h2>
            )}

            {content && (
              <p
                className="text-base sm:text-lg leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--ws-muted)' }}
              >
                {content}
              </p>
            )}
          </div>

          {/* Image column (right position) */}
          {hasImage && !imageOnLeft && (
            <div className="w-full lg:w-1/2 flex-shrink-0">
              <img
                src={image}
                alt={heading || 'About'}
                className="w-full h-auto rounded-2xl object-cover max-h-[480px]"
                style={{ border: '1px solid var(--ws-border)' }}
              />
            </div>
          )}
        </div>

        {/* Stats row */}
        {showStats && Array.isArray(stats) && stats.length > 0 && (
          <div
            className="mt-12 pt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8"
            style={{ borderTop: '1px solid var(--ws-border)' }}
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className="text-3xl sm:text-4xl font-bold mb-1"
                  style={{ color: 'var(--ws-primary)' }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-sm sm:text-base"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

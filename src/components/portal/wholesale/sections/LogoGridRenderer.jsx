import React from 'react';

/**
 * LogoGridRenderer
 *
 * Renders a logo/brand grid section for the B2B wholesale storefront.
 * Supports grid, carousel (horizontal scroll), and row (flex wrap) layouts.
 * Placeholder boxes are shown when no logos are provided.
 *
 * Props from section.props:
 * - heading: string
 * - subheading: string
 * - logos: array of { url, alt, name } (may be empty)
 * - columns: number (3-8)
 * - grayscale: boolean
 * - showTooltip: boolean
 * - style: 'grid'|'carousel'|'row'
 */

const COLUMN_CLASSES = {
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-3 lg:grid-cols-5',
  6: 'sm:grid-cols-3 lg:grid-cols-6',
  7: 'sm:grid-cols-3 lg:grid-cols-7',
  8: 'sm:grid-cols-4 lg:grid-cols-8',
};

function PlaceholderBox({ index }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg p-6"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px dashed var(--ws-border)',
        minHeight: '80px',
      }}
    >
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--ws-muted)' }}
      >
        Logo {index + 1}
      </span>
    </div>
  );
}

function LogoItem({ logo, grayscale, showTooltip }) {
  const filterStyle = grayscale
    ? { filter: 'grayscale(100%)', transition: 'filter 0.3s ease' }
    : {};

  const hoverProps = grayscale
    ? {
        onMouseEnter: (e) => { e.currentTarget.style.filter = 'grayscale(0%)'; },
        onMouseLeave: (e) => { e.currentTarget.style.filter = 'grayscale(100%)'; },
      }
    : {};

  return (
    <div
      className="flex items-center justify-center p-4 rounded-lg"
      style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
    >
      <img
        src={logo.url}
        alt={logo.alt || logo.name || 'Partner logo'}
        title={showTooltip && logo.name ? logo.name : undefined}
        className="max-h-12 w-auto object-contain"
        style={filterStyle}
        {...hoverProps}
      />
    </div>
  );
}

export default function LogoGridRenderer({ section, theme }) {
  const {
    heading = '',
    subheading = '',
    logos = [],
    columns = 6,
    grayscale = false,
    showTooltip = false,
    style = 'grid',
  } = section?.props || {};

  const hasLogos = Array.isArray(logos) && logos.length > 0;
  const colClass = COLUMN_CLASSES[columns] || COLUMN_CLASSES[6];

  const renderPlaceholders = () => (
    <div className={`grid grid-cols-2 ${COLUMN_CLASSES[6]} gap-4`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <PlaceholderBox key={i} index={i} />
      ))}
    </div>
  );

  const renderGrid = () => (
    <div className={`grid grid-cols-2 ${colClass} gap-4`}>
      {logos.map((logo, i) => (
        <LogoItem
          key={i}
          logo={logo}
          grayscale={grayscale}
          showTooltip={showTooltip}
        />
      ))}
    </div>
  );

  const renderCarousel = () => (
    <div
      className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin"
      style={{ scrollbarColor: 'var(--ws-border) transparent' }}
    >
      {logos.map((logo, i) => (
        <div key={i} className="flex-shrink-0">
          <LogoItem
            logo={logo}
            grayscale={grayscale}
            showTooltip={showTooltip}
          />
        </div>
      ))}
    </div>
  );

  const renderRow = () => (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {logos.map((logo, i) => (
        <div key={i}>
          <LogoItem
            logo={logo}
            grayscale={grayscale}
            showTooltip={showTooltip}
          />
        </div>
      ))}
    </div>
  );

  const styleRenderers = {
    grid: renderGrid,
    carousel: renderCarousel,
    row: renderRow,
  };

  const renderLogos = hasLogos
    ? (styleRenderers[style] || renderGrid)
    : renderPlaceholders;

  return (
    <section
      className="w-full py-16 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: 'var(--ws-bg)',
        color: 'var(--ws-text)',
        fontFamily: 'var(--ws-font)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading + Subheading */}
        {(heading || subheading) && (
          <div className="text-center max-w-2xl mx-auto mb-12">
            {heading && (
              <h2
                className="text-3xl sm:text-4xl font-bold mb-3 leading-tight"
                style={{ fontFamily: 'var(--ws-heading-font)' }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p
                className="text-base sm:text-lg leading-relaxed"
                style={{ color: 'var(--ws-muted)' }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}

        {/* Logos */}
        {renderLogos()}
      </div>
    </section>
  );
}

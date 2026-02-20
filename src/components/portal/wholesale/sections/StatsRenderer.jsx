import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * StatsRenderer
 *
 * Renders a stats/metrics section for the B2B wholesale storefront.
 * Supports three visual styles (simple, card, icon) with configurable
 * column count and text alignment.
 *
 * Props from section.props:
 * - heading: string|null
 * - subheading: string|null
 * - items: array of { value, label }
 * - columns: number (2-6)
 * - style: 'simple'|'card'|'icon'
 * - alignment: 'left'|'center'|'right'
 */

const ALIGNMENT_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const HEADING_ALIGNMENT_CLASSES = {
  left: 'text-left',
  center: 'text-center mx-auto',
  right: 'text-right ml-auto',
};

const COLUMN_CLASSES = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

export default function StatsRenderer({ section, theme }) {
  const {
    heading = null,
    subheading = null,
    items = [],
    columns = 4,
    style = 'simple',
    alignment = 'center',
  } = section?.props || {};

  const alignClass = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;
  const headingAlignClass = HEADING_ALIGNMENT_CLASSES[alignment] || HEADING_ALIGNMENT_CLASSES.center;
  const colClass = COLUMN_CLASSES[columns] || COLUMN_CLASSES[4];

  if (!Array.isArray(items) || items.length === 0) return null;

  const renderSimpleStat = (item, index) => (
    <div key={index} className={`py-4 ${alignClass}`}>
      <div
        className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-1"
        style={{ color: 'var(--ws-primary)' }}
      >
        {item.value}
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--ws-muted)' }}
      >
        {item.label}
      </div>
    </div>
  );

  const renderCardStat = (item, index) => (
    <div
      key={index}
      className={`rounded-xl p-6 transition-colors duration-200 ${alignClass}`}
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <div
        className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-1"
        style={{ color: 'var(--ws-primary)' }}
      >
        {item.value}
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--ws-muted)' }}
      >
        {item.label}
      </div>
    </div>
  );

  const renderIconStat = (item, index) => (
    <div
      key={index}
      className={`rounded-xl p-6 transition-colors duration-200 ${alignClass}`}
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <div
        className={`mb-3 ${alignment === 'center' ? 'flex justify-center' : alignment === 'right' ? 'flex justify-end' : ''}`}
      >
        <TrendingUp
          className="w-6 h-6"
          style={{ color: 'var(--ws-primary)' }}
        />
      </div>
      <div
        className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-1"
        style={{ color: 'var(--ws-primary)' }}
      >
        {item.value}
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--ws-muted)' }}
      >
        {item.label}
      </div>
    </div>
  );

  const renderers = {
    simple: renderSimpleStat,
    card: renderCardStat,
    icon: renderIconStat,
  };

  const renderStat = renderers[style] || renderers.simple;

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
          <div className={`max-w-2xl mb-12 ${headingAlignClass}`}>
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

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 ${colClass} gap-6`}>
          {items.map((item, index) => renderStat(item, index))}
        </div>
      </div>
    </section>
  );
}

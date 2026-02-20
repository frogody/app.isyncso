import React from 'react';

/**
 * TestimonialsRenderer
 *
 * Renders a testimonials section with heading, subheading, and a grid of
 * testimonial cards. Supports three visual styles: 'card', 'minimal', 'quote'.
 *
 * Props from section.props:
 * - heading: string
 * - subheading: string
 * - items: array of { quote, author, company, avatar }
 * - style: 'card'|'minimal'|'quote'
 * - columns: number (1-3)
 * - autoplay: boolean (stored but not implemented)
 */

const QuoteIcon = () => (
  <svg
    className="w-10 h-10 mb-4 opacity-40"
    style={{ color: 'var(--ws-primary)' }}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
  </svg>
);

function TestimonialCard({ item, variant }) {
  const { quote, author, company, avatar } = item;

  if (variant === 'minimal') {
    return (
      <div className="py-6">
        <p
          className="text-base sm:text-lg leading-relaxed mb-4"
          style={{ color: 'var(--ws-text)' }}
        >
          &ldquo;{quote}&rdquo;
        </p>
        <div className="flex items-center gap-3">
          {avatar && (
            <img
              src={avatar}
              alt={author || ''}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              style={{ border: '1px solid var(--ws-border)' }}
            />
          )}
          <div>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--ws-text)' }}
            >
              {author}
            </span>
            {company && (
              <span
                className="text-sm ml-2"
                style={{ color: 'var(--ws-muted)' }}
              >
                {company}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'quote') {
    return (
      <div className="py-6 px-2">
        <QuoteIcon />
        <p
          className="text-base sm:text-lg leading-relaxed italic mb-6"
          style={{ color: 'var(--ws-text)' }}
        >
          {quote}
        </p>
        <div className="flex items-center gap-3">
          {avatar && (
            <img
              src={avatar}
              alt={author || ''}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              style={{ border: '2px solid var(--ws-primary)' }}
            />
          )}
          <div>
            <div
              className="text-sm font-bold"
              style={{ color: 'var(--ws-text)' }}
            >
              {author}
            </div>
            {company && (
              <div
                className="text-xs"
                style={{ color: 'var(--ws-muted)' }}
              >
                {company}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: 'card' style
  return (
    <div
      className="rounded-xl p-6 shadow-sm"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <p
        className="text-base leading-relaxed mb-6"
        style={{ color: 'var(--ws-text)' }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        {avatar && (
          <img
            src={avatar}
            alt={author || ''}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            style={{ border: '1px solid var(--ws-border)' }}
          />
        )}
        <div>
          <div
            className="text-sm font-semibold"
            style={{ color: 'var(--ws-text)' }}
          >
            {author}
          </div>
          {company && (
            <div
              className="text-xs"
              style={{ color: 'var(--ws-muted)' }}
            >
              {company}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Map column count to responsive grid classes */
function getGridClasses(columns) {
  const cols = Math.max(1, Math.min(3, columns || 2));
  const desktopCol = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
  }[cols];

  return `grid grid-cols-1 md:grid-cols-2 ${desktopCol} gap-6`;
}

export default function TestimonialsRenderer({ section, theme }) {
  const {
    heading = '',
    subheading = '',
    items = [],
    style: variant = 'card',
    columns = 2,
    autoplay = false, // stored, not implemented
  } = section?.props || {};

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section
      className="w-full py-16 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--ws-bg)', color: 'var(--ws-text)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        {(heading || subheading) && (
          <div className="text-center mb-12">
            {heading && (
              <h2
                className="text-3xl sm:text-4xl font-bold mb-3"
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
                className="text-base sm:text-lg max-w-2xl mx-auto"
                style={{ color: 'var(--ws-muted)' }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}

        {/* Testimonials grid */}
        <div className={getGridClasses(columns)}>
          {items.map((item, index) => (
            <TestimonialCard
              key={index}
              item={item}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

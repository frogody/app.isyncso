import React from 'react';
import { motion } from 'framer-motion';

/**
 * TestimonialsRenderer
 *
 * Premium testimonials section with heading, subheading, and a grid of
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

/* Star rating row - 5 filled stars */
function StarRating() {
  return (
    <div className="flex items-center gap-0.5 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="w-4 h-4"
          style={{ color: 'var(--ws-primary)' }}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* Avatar with gradient ring, or initials fallback */
function AvatarDisplay({ avatar, author, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const initials = (author || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`${sizeClasses} rounded-full flex-shrink-0 relative`}
      style={{
        background: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 50%, #000))`,
        padding: '2px',
      }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={author || ''}
          className="w-full h-full rounded-full object-cover"
          style={{ border: '2px solid var(--ws-bg)' }}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center ${textSize} font-bold`}
          style={{
            backgroundColor: 'var(--ws-surface)',
            color: 'var(--ws-primary)',
            border: '2px solid var(--ws-bg)',
          }}
        >
          {initials || '?'}
        </div>
      )}
    </div>
  );
}

/* Author attribution line */
function AuthorLine({ author, company, avatar, variant }) {
  return (
    <div className="flex items-center gap-3">
      <AvatarDisplay
        avatar={avatar}
        author={author}
        size={variant === 'minimal' ? 'sm' : 'md'}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-semibold truncate"
            style={{
              color: 'var(--ws-text)',
              ...(variant === 'quote'
                ? {
                    backgroundImage: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 60%, var(--ws-text)))`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textDecorationLine: 'underline',
                    textDecorationColor: 'var(--ws-primary)',
                    textDecorationThickness: '1px',
                    textUnderlineOffset: '3px',
                  }
                : {}),
            }}
          >
            {author}
          </span>
          {company && (
            <>
              <span style={{ color: 'var(--ws-muted)', opacity: 0.5 }} className="text-xs">
                &#183;
              </span>
              <span
                className="text-sm truncate"
                style={{ color: 'var(--ws-muted)' }}
              >
                {company}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Large gradient quote SVG for 'quote' style */
function LargeQuoteSVG() {
  return (
    <svg
      className="mb-5"
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="quoteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--ws-primary)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--ws-primary)', stopOpacity: 0.3 }} />
        </linearGradient>
      </defs>
      <path
        d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"
        fill="url(#quoteGrad)"
      />
    </svg>
  );
}

/* Stylized quote mark for card style */
function CardQuoteMark() {
  return (
    <div
      className="text-5xl font-serif leading-none mb-3 select-none"
      style={{
        backgroundImage: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 40%, transparent))`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      aria-hidden="true"
    >
      &ldquo;
    </div>
  );
}

/* Motion variants */
const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/* Card style testimonial */
function CardTestimonial({ item }) {
  const { quote, author, company, avatar } = item;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="relative rounded-xl p-6 overflow-hidden group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--ws-border)',
      }}
    >
      {/* Gradient left border */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 20%, transparent))`,
        }}
      />
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 20% 20%, color-mix(in srgb, var(--ws-primary) 4%, transparent), transparent 70%)`,
        }}
      />

      <div className="relative">
        <CardQuoteMark />
        <StarRating />
        <p
          className="text-base leading-relaxed mb-6"
          style={{ color: 'var(--ws-text)', lineHeight: '1.75' }}
        >
          &ldquo;{quote}&rdquo;
        </p>
        <AuthorLine author={author} company={company} avatar={avatar} variant="card" />
      </div>
    </motion.div>
  );
}

/* Minimal style testimonial */
function MinimalTestimonial({ item }) {
  const { quote, author, company, avatar } = item;

  return (
    <motion.div
      variants={cardVariants}
      className="py-7 relative"
    >
      {/* Thin bottom border */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, var(--ws-border), transparent)`,
        }}
      />
      <StarRating />
      <p
        className="text-lg sm:text-xl leading-relaxed mb-5 italic"
        style={{ color: 'var(--ws-text)', lineHeight: '1.75', letterSpacing: '-0.01em' }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <AuthorLine author={author} company={company} avatar={avatar} variant="minimal" />
    </motion.div>
  );
}

/* Quote style testimonial */
function QuoteTestimonial({ item }) {
  const { quote, author, company, avatar } = item;

  return (
    <motion.div
      variants={cardVariants}
      className="py-7 px-2"
    >
      <LargeQuoteSVG />
      <StarRating />
      <p
        className="text-lg sm:text-xl leading-relaxed italic mb-6"
        style={{ color: 'var(--ws-text)', lineHeight: '1.8', letterSpacing: '-0.01em' }}
      >
        {quote}
      </p>
      <AuthorLine author={author} company={company} avatar={avatar} variant="quote" />
    </motion.div>
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

function TestimonialCard({ item, variant }) {
  if (variant === 'minimal') return <MinimalTestimonial item={item} />;
  if (variant === 'quote') return <QuoteTestimonial item={item} />;
  return <CardTestimonial item={item} />;
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
      className="w-full py-20 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--ws-bg)', color: 'var(--ws-text)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        {(heading || subheading) && (
          <motion.div
            className="text-center mb-14"
            variants={headerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {heading && (
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight"
                style={{
                  color: 'var(--ws-text)',
                  fontFamily: 'var(--ws-heading-font)',
                }}
              >
                {heading}
              </h2>
            )}
            {/* Gradient underline */}
            <div
              className="mx-auto mt-4 mb-5 rounded-full"
              style={{
                width: 60,
                height: 2,
                background: `linear-gradient(90deg, transparent, var(--ws-primary), transparent)`,
              }}
            />
            {subheading && (
              <p
                className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
                style={{ color: 'var(--ws-muted)' }}
              >
                {subheading}
              </p>
            )}
          </motion.div>
        )}

        {/* Testimonials grid */}
        <motion.div
          className={getGridClasses(columns)}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {items.map((item, index) => (
            <TestimonialCard key={index} item={item} variant={variant} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

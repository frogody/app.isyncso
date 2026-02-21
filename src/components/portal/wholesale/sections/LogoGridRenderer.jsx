import React from 'react';
import { Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

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

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

function PlaceholderBox({ index }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{
        y: -3,
        borderColor: 'var(--ws-primary)',
        transition: { duration: 0.2 },
      }}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border p-6"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        borderColor: 'var(--ws-border)',
        backdropFilter: 'blur(12px)',
        minHeight: '96px',
        transition: 'border-color 0.3s ease',
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{
          background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
        }}
      >
        <Building2
          className="h-5 w-5"
          style={{ color: 'var(--ws-muted)' }}
        />
      </div>
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--ws-muted)' }}
      >
        Partner
      </span>
    </motion.div>
  );
}

function LogoItem({ logo, grayscale, showTooltip }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{
        y: -3,
        transition: { duration: 0.2 },
      }}
      className="group flex items-center justify-center rounded-xl border p-5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        borderColor: 'var(--ws-border)',
        backdropFilter: 'blur(12px)',
        minHeight: '96px',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))';
        e.currentTarget.style.boxShadow = '0 4px 20px color-mix(in srgb, var(--ws-primary) 8%, transparent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <img
        src={logo.url}
        alt={logo.alt || logo.name || 'Partner logo'}
        title={showTooltip && logo.name ? logo.name : undefined}
        className="max-h-12 w-auto object-contain transition-all duration-300"
        style={{
          filter: grayscale ? 'grayscale(100%)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (grayscale) e.currentTarget.style.filter = 'grayscale(0%)';
        }}
        onMouseLeave={(e) => {
          if (grayscale) e.currentTarget.style.filter = 'grayscale(100%)';
        }}
      />
    </motion.div>
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
    <motion.div
      className={`grid grid-cols-2 ${COLUMN_CLASSES[6]} gap-4`}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <PlaceholderBox key={i} index={i} />
      ))}
    </motion.div>
  );

  const renderGrid = () => (
    <motion.div
      className={`grid grid-cols-2 ${colClass} gap-4`}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {logos.map((logo, i) => (
        <LogoItem
          key={i}
          logo={logo}
          grayscale={grayscale}
          showTooltip={showTooltip}
        />
      ))}
    </motion.div>
  );

  const renderCarousel = () => (
    <div className="relative">
      {/* Left fade */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12"
        style={{
          background: `linear-gradient(to right, var(--ws-bg), transparent)`,
        }}
      />
      {/* Right fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12"
        style={{
          background: `linear-gradient(to left, var(--ws-bg), transparent)`,
        }}
      />

      <motion.div
        className="flex gap-4 overflow-x-auto px-2 pb-2 scrollbar-thin"
        style={{ scrollbarColor: 'var(--ws-border) transparent' }}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        {logos.map((logo, i) => (
          <motion.div key={i} className="flex-shrink-0" variants={itemVariants}>
            <LogoItem
              logo={logo}
              grayscale={grayscale}
              showTooltip={showTooltip}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );

  const renderRow = () => (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-4"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {logos.map((logo, i) => (
        <motion.div key={i} variants={itemVariants}>
          <LogoItem
            logo={logo}
            grayscale={grayscale}
            showTooltip={showTooltip}
          />
        </motion.div>
      ))}
    </motion.div>
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

            {/* Decorative centered line */}
            <div className="flex justify-center mb-4">
              <div
                className="h-[2px] w-16 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, var(--ws-primary), transparent)`,
                }}
              />
            </div>

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

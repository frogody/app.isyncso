import React from 'react';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * StatsRenderer
 *
 * Premium stats/metrics section for the B2B wholesale storefront.
 * Features glass-morphism cards with gradient top borders, staggered
 * viewport-triggered animations, gradient icon containers, tabular numerals,
 * and decorative accent lines.
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

const ICON_ALIGN_CLASSES = {
  left: '',
  center: 'flex justify-center',
  right: 'flex justify-end',
};

const ACCENT_ALIGN = {
  left: { marginLeft: '0', marginRight: 'auto' },
  center: { marginLeft: 'auto', marginRight: 'auto' },
  right: { marginLeft: 'auto', marginRight: '0' },
};

// -- Motion variants --

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
};

const headingVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
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
  const iconAlignClass = ICON_ALIGN_CLASSES[alignment] || ICON_ALIGN_CLASSES.center;
  const accentAlign = ACCENT_ALIGN[alignment] || ACCENT_ALIGN.center;

  if (!Array.isArray(items) || items.length === 0) return null;

  // Small decorative accent line above each stat value
  const AccentLine = () => (
    <div
      style={{
        width: '28px',
        height: '3px',
        borderRadius: '999px',
        background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 50%, #8b5cf6))`,
        marginBottom: '14px',
        ...accentAlign,
      }}
    />
  );

  const renderSimpleStat = (item, index) => (
    <motion.div
      key={index}
      variants={cardVariants}
      className={`relative py-5 px-2 ${alignClass}`}
    >
      <AccentLine />
      <div
        className="text-4xl lg:text-5xl font-bold leading-tight mb-2"
        style={{
          color: 'var(--ws-primary)',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--ws-heading-font)',
        }}
      >
        {item.value}
      </div>
      <div
        className="text-sm leading-relaxed font-medium"
        style={{
          color: 'var(--ws-muted)',
          letterSpacing: '0.02em',
        }}
      >
        {item.label}
      </div>

      {/* Gradient divider between items (simple style only) */}
      {style === 'simple' && index < items.length - 1 && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block"
          style={{
            width: '1px',
            height: '50%',
            background: `linear-gradient(to bottom, transparent, color-mix(in srgb, var(--ws-border) 60%, transparent), transparent)`,
          }}
        />
      )}
    </motion.div>
  );

  const renderCardStat = (item, index) => (
    <motion.div
      key={index}
      variants={cardVariants}
      className={`relative rounded-2xl p-7 transition-all duration-300 ${alignClass} group`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 70%, transparent)',
        border: '1px solid var(--ws-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        overflow: 'hidden',
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 12px 40px -8px color-mix(in srgb, var(--ws-primary) 15%, transparent)',
      }}
    >
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '3px',
          background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 50%, #8b5cf6), var(--ws-primary))`,
          borderRadius: '2px 2px 0 0',
        }}
      />

      <AccentLine />

      <div
        className="text-4xl lg:text-5xl font-bold leading-tight mb-2"
        style={{
          color: 'var(--ws-primary)',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--ws-heading-font)',
        }}
      >
        {item.value}
      </div>
      <div
        className="text-sm leading-relaxed font-medium"
        style={{
          color: 'var(--ws-muted)',
          letterSpacing: '0.02em',
        }}
      >
        {item.label}
      </div>
    </motion.div>
  );

  const renderIconStat = (item, index) => (
    <motion.div
      key={index}
      variants={cardVariants}
      className={`relative rounded-2xl p-7 transition-all duration-300 ${alignClass} group`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 70%, transparent)',
        border: '1px solid var(--ws-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        overflow: 'hidden',
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 12px 40px -8px color-mix(in srgb, var(--ws-primary) 15%, transparent)',
      }}
    >
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '3px',
          background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 50%, #8b5cf6), var(--ws-primary))`,
          borderRadius: '2px 2px 0 0',
        }}
      />

      {/* Gradient-filled circular icon container */}
      <div className={`mb-4 ${iconAlignClass}`}>
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 20%, transparent), color-mix(in srgb, #8b5cf6 15%, transparent))`,
            border: '1px solid color-mix(in srgb, var(--ws-primary) 25%, transparent)',
          }}
        >
          <TrendingUp
            className="w-5 h-5"
            style={{ color: 'var(--ws-primary)' }}
          />
        </div>
      </div>

      <div
        className="text-4xl lg:text-5xl font-bold leading-tight mb-2"
        style={{
          color: 'var(--ws-primary)',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--ws-heading-font)',
        }}
      >
        {item.value}
      </div>
      <div
        className="text-sm leading-relaxed font-medium"
        style={{
          color: 'var(--ws-muted)',
          letterSpacing: '0.02em',
        }}
      >
        {item.label}
      </div>
    </motion.div>
  );

  const renderers = {
    simple: renderSimpleStat,
    card: renderCardStat,
    icon: renderIconStat,
  };

  const renderStat = renderers[style] || renderers.simple;

  return (
    <section
      className="w-full py-20 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: 'var(--ws-bg)',
        color: 'var(--ws-text)',
        fontFamily: 'var(--ws-font)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading + Subheading */}
        {(heading || subheading) && (
          <motion.div
            className={`max-w-2xl mb-14 ${headingAlignClass}`}
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {heading && (
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4 leading-tight"
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
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          className={`grid grid-cols-2 ${colClass} gap-6`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {items.map((item, index) => renderStat(item, index))}
        </motion.div>
      </div>
    </section>
  );
}

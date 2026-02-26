import React from 'react';
import { motion } from 'framer-motion';

/**
 * AboutRenderer
 *
 * Premium "About Us" section with heading, content paragraph, optional image,
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

/* Decorative dot grid pattern */
function DotPattern({ position = 'top-right' }) {
  const posClass =
    position === 'top-right'
      ? 'top-0 right-0'
      : position === 'bottom-left'
        ? 'bottom-0 left-0'
        : 'top-0 right-0';

  return (
    <div
      className={`absolute ${posClass} pointer-events-none`}
      style={{ width: 180, height: 180, opacity: 0.04 }}
      aria-hidden="true"
    >
      <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={12 + col * 22}
              cy={12 + row * 22}
              r="2.5"
              fill="currentColor"
              style={{ color: 'var(--ws-text)' }}
            />
          )),
        )}
      </svg>
    </div>
  );
}

/* Decorative glass placeholder when no image is provided */
function ImagePlaceholder() {
  return (
    <div
      className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid transparent',
        backgroundClip: 'padding-box',
      }}
    >
      {/* Gradient border overlay */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          padding: '1px',
          background: 'linear-gradient(135deg, var(--ws-primary), transparent 50%, var(--ws-primary))',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {/* Inner geometric pattern */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.07 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <rect
            x="30"
            y="30"
            width="140"
            height="140"
            rx="4"
            stroke="currentColor"
            strokeWidth="1"
            style={{ color: 'var(--ws-text)' }}
            transform="rotate(15 100 100)"
          />
          <rect
            x="50"
            y="50"
            width="100"
            height="100"
            rx="4"
            stroke="currentColor"
            strokeWidth="1"
            style={{ color: 'var(--ws-text)' }}
            transform="rotate(30 100 100)"
          />
          <rect
            x="70"
            y="70"
            width="60"
            height="60"
            rx="4"
            stroke="currentColor"
            strokeWidth="1"
            style={{ color: 'var(--ws-text)' }}
            transform="rotate(45 100 100)"
          />
          <circle
            cx="100"
            cy="100"
            r="8"
            fill="currentColor"
            style={{ color: 'var(--ws-primary)' }}
          />
        </svg>
      </div>
      {/* Subtle radial gradient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--ws-primary) 6%, transparent), transparent 70%)',
        }}
      />
    </div>
  );
}

/* Motion variants */
const fadeSlideLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const fadeSlideRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const statsContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const statItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

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

  const textVariants = imageOnLeft ? fadeSlideRight : fadeSlideLeft;
  const mediaVariants = imageOnLeft ? fadeSlideLeft : fadeSlideRight;

  /* Build the text column */
  const textColumn = (
    <motion.div
      className={`w-full ${hasImage || true ? 'lg:w-1/2' : 'lg:max-w-3xl lg:mx-auto'}`}
      variants={textVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {/* Gradient accent line */}
      <div
        className="mb-6 rounded-full"
        style={{
          width: 60,
          height: 3,
          background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 40%, transparent))`,
        }}
      />

      {heading && (
        <h2
          className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-[1.15] tracking-tight"
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
          className="text-base sm:text-lg leading-[1.8] whitespace-pre-line"
          style={{
            color: 'var(--ws-muted)',
            letterSpacing: '0.01em',
          }}
        >
          {content}
        </p>
      )}
    </motion.div>
  );

  /* Build the media column */
  const mediaColumn = (
    <motion.div
      className="w-full lg:w-1/2 flex-shrink-0"
      variants={mediaVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {hasImage ? (
        <div className="relative group">
          {/* Gradient glow behind image */}
          <div
            className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 30%, transparent), transparent, color-mix(in srgb, var(--ws-primary) 20%, transparent))`,
            }}
          />
          <img
            src={image}
            alt={heading || 'About'}
            className="relative w-full h-auto rounded-2xl object-cover max-h-[480px] shadow-2xl"
            style={{
              border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, var(--ws-border))',
            }}
           loading="lazy" decoding="async" />
        </div>
      ) : (
        <ImagePlaceholder />
      )}
    </motion.div>
  );

  return (
    <section
      className="w-full py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ backgroundColor: 'var(--ws-bg)', color: 'var(--ws-text)' }}
    >
      {/* Decorative dot patterns */}
      <DotPattern position={imageOnLeft ? 'bottom-left' : 'top-right'} />

      <div className="max-w-6xl mx-auto relative">
        {/* Two-column layout: text + image/placeholder */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {imageOnLeft ? (
            <>
              {mediaColumn}
              {textColumn}
            </>
          ) : (
            <>
              {textColumn}
              {mediaColumn}
            </>
          )}
        </div>

        {/* Stats row */}
        {showStats && Array.isArray(stats) && stats.length > 0 && (
          <motion.div
            className="mt-16 pt-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
            variants={statsContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={statItem}
                className="relative rounded-xl p-6 text-center overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid var(--ws-border)',
                }}
              >
                {/* Gradient top border */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, var(--ws-primary), transparent)`,
                  }}
                />
                <div
                  className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight"
                  style={{ color: 'var(--ws-primary)' }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs sm:text-sm uppercase tracking-wider font-medium"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

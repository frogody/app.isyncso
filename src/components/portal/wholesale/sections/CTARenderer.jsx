import React from 'react';
import { motion } from 'framer-motion';

/**
 * CTARenderer
 *
 * Premium Call-to-Action section with heading, subheading, and up to two
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

/* Gradient animated background keyframes injected via style tag */
const gradientKeyframes = `
@keyframes ctaGradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;

/* Decorative floating dots/circles for banner background */
function FloatingDots() {
  const dots = [
    { size: 6, top: '12%', left: '8%', opacity: 0.12, delay: 0 },
    { size: 4, top: '70%', left: '15%', opacity: 0.08, delay: 0.5 },
    { size: 8, top: '20%', right: '12%', opacity: 0.1, delay: 1 },
    { size: 3, top: '60%', right: '20%', opacity: 0.07, delay: 1.5 },
    { size: 5, top: '85%', left: '40%', opacity: 0.09, delay: 0.3 },
    { size: 10, top: '30%', right: '35%', opacity: 0.05, delay: 0.8 },
    { size: 4, top: '50%', left: '60%', opacity: 0.06, delay: 1.2 },
  ];

  return (
    <>
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: dot.size,
            height: dot.size,
            top: dot.top,
            left: dot.left,
            right: dot.right,
            backgroundColor: 'rgba(255,255,255,' + dot.opacity + ')',
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [dot.opacity, dot.opacity * 1.5, dot.opacity],
          }}
          transition={{
            duration: 3 + dot.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: dot.delay,
          }}
        />
      ))}
    </>
  );
}

/* Decorative gradient orbs for card/minimal backgrounds */
function GradientOrbs() {
  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{
          width: 300,
          height: 300,
          top: '-80px',
          right: '-60px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--ws-primary) 6%, transparent), transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 200,
          height: 200,
          bottom: '-40px',
          left: '-30px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--ws-primary) 4%, transparent), transparent 70%)',
        }}
      />
    </>
  );
}

/* Motion variants */
const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const headingVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const subheadingVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] } },
};

const buttonsVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

/* Primary CTA button */
function PrimaryButton({ text, link, inverted = false }) {
  if (!text || !link) return null;

  return (
    <motion.a
      href={link}
      className="inline-flex items-center justify-center px-10 py-4 rounded-xl text-base font-semibold transition-all duration-300 relative overflow-hidden"
      style={
        inverted
          ? {
              backgroundColor: 'var(--ws-bg)',
              color: 'var(--ws-primary)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }
          : {
              backgroundColor: 'var(--ws-primary)',
              color: 'var(--ws-bg)',
            }
      }
      whileHover={{
        scale: 1.02,
        boxShadow: inverted
          ? '0 8px 32px rgba(255,255,255,0.15)'
          : '0 8px 32px color-mix(in srgb, var(--ws-primary) 30%, transparent)',
      }}
      whileTap={{ scale: 0.98 }}
    >
      {text}
    </motion.a>
  );
}

/* Secondary CTA button with gradient border */
function SecondaryButton({ text, link, inverted = false }) {
  if (!text || !link) return null;

  const textColor = inverted ? 'var(--ws-bg)' : 'var(--ws-primary)';

  return (
    <motion.a
      href={link}
      className="inline-flex items-center justify-center px-10 py-4 rounded-xl text-base font-semibold transition-all duration-300 relative"
      style={{
        background: 'transparent',
        color: textColor,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Gradient border via pseudo-technique with inline background */}
      <span
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          padding: '2px',
          background: inverted
            ? `linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))`
            : `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 40%, transparent))`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {text}
    </motion.a>
  );
}

/* ---- BANNER STYLE ---- */
function BannerCTA({ heading, subheading, alignment, ctaText, ctaLink, secondaryCtaText, secondaryCtaLink }) {
  const align = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;
  const btnAlign = BUTTON_ALIGNMENT[alignment] || BUTTON_ALIGNMENT.center;

  return (
    <motion.section
      className="w-full py-16 px-4 sm:px-6 lg:px-8"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      <style>{gradientKeyframes}</style>
      <div
        className="max-w-6xl mx-auto rounded-2xl py-20 px-6 sm:px-14 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 70%, #000), var(--ws-primary))`,
          backgroundSize: '200% 200%',
          animation: 'ctaGradientShift 6s ease infinite',
        }}
      >
        <FloatingDots />

        <div
          className={`flex flex-col ${align} max-w-3xl relative z-10 ${
            alignment === 'center' ? 'mx-auto' : alignment === 'right' ? 'ml-auto' : ''
          }`}
        >
          {heading && (
            <motion.h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-[1.15] tracking-tight"
              style={{
                color: 'var(--ws-bg)',
                fontFamily: 'var(--ws-heading-font)',
              }}
              variants={headingVariants}
            >
              {heading}
            </motion.h2>
          )}
          {subheading && (
            <motion.p
              className="text-base sm:text-lg opacity-90 leading-relaxed max-w-2xl"
              style={{ color: 'var(--ws-bg)' }}
              variants={subheadingVariants}
            >
              {subheading}
            </motion.p>
          )}
          <motion.div
            className={`flex flex-wrap gap-4 mt-10 ${btnAlign}`}
            variants={buttonsVariants}
          >
            <PrimaryButton text={ctaText} link={ctaLink} inverted />
            <SecondaryButton text={secondaryCtaText} link={secondaryCtaLink} inverted />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

/* ---- CARD STYLE ---- */
function CardCTA({ heading, subheading, alignment, ctaText, ctaLink, secondaryCtaText, secondaryCtaLink }) {
  const align = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;
  const btnAlign = BUTTON_ALIGNMENT[alignment] || BUTTON_ALIGNMENT.center;

  return (
    <motion.section
      className="w-full py-16 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      <div
        className="max-w-3xl mx-auto rounded-2xl p-10 sm:p-16 relative overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--ws-border)',
        }}
      >
        {/* Gradient border glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            padding: '1px',
            background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 30%, transparent), transparent 50%, color-mix(in srgb, var(--ws-primary) 20%, transparent))`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
        {/* Subtle glow shadow */}
        <div
          className="absolute -inset-1 rounded-2xl pointer-events-none blur-2xl"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--ws-primary) 8%, transparent), transparent 70%)`,
          }}
        />

        <GradientOrbs />

        <div className={`flex flex-col ${align} relative z-10`}>
          {heading && (
            <motion.h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 tracking-tight"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
              variants={headingVariants}
            >
              {heading}
            </motion.h2>
          )}
          {subheading && (
            <motion.p
              className="text-base sm:text-lg leading-relaxed max-w-xl"
              style={{ color: 'var(--ws-muted)' }}
              variants={subheadingVariants}
            >
              {subheading}
            </motion.p>
          )}
          <motion.div
            className={`flex flex-wrap gap-4 mt-10 ${btnAlign}`}
            variants={buttonsVariants}
          >
            <PrimaryButton text={ctaText} link={ctaLink} />
            <SecondaryButton text={secondaryCtaText} link={secondaryCtaLink} />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

/* ---- MINIMAL STYLE ---- */
function MinimalCTA({ heading, subheading, alignment, ctaText, ctaLink, secondaryCtaText, secondaryCtaLink }) {
  const align = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;
  const btnAlign = BUTTON_ALIGNMENT[alignment] || BUTTON_ALIGNMENT.center;

  return (
    <motion.section
      className="w-full py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ backgroundColor: 'var(--ws-bg)' }}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      <GradientOrbs />

      <div
        className={`max-w-3xl relative z-10 ${
          alignment === 'center' ? 'mx-auto' : alignment === 'right' ? 'ml-auto mr-0' : 'mr-auto ml-0'
        }`}
      >
        <div className={`flex flex-col ${align}`}>
          {heading && (
            <motion.h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 tracking-tight"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
              variants={headingVariants}
            >
              {heading}
            </motion.h2>
          )}
          {subheading && (
            <motion.p
              className="text-base sm:text-lg leading-relaxed max-w-xl"
              style={{ color: 'var(--ws-muted)' }}
              variants={subheadingVariants}
            >
              {subheading}
            </motion.p>
          )}
          <motion.div
            className={`flex flex-wrap gap-4 mt-10 ${btnAlign}`}
            variants={buttonsVariants}
          >
            <PrimaryButton text={ctaText} link={ctaLink} />
            <SecondaryButton text={secondaryCtaText} link={secondaryCtaLink} />
          </motion.div>
        </div>
      </div>
    </motion.section>
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

import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * HeroRenderer
 *
 * Premium full-width hero section for the B2B wholesale storefront.
 * Features animated mesh gradient background, decorative geometric elements,
 * gradient text effects, glass-morphism buttons, and staggered entrance animations.
 */

const ALIGNMENT_CLASSES = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

const BUTTON_ALIGNMENT_CLASSES = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

// Keyframes injected once via a <style> tag
const KEYFRAMES_ID = 'hero-renderer-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes hero-mesh-shift {
      0%, 100% {
        background-position: 0% 50%, 100% 50%, 50% 0%;
      }
      25% {
        background-position: 30% 20%, 70% 80%, 20% 60%;
      }
      50% {
        background-position: 60% 70%, 30% 20%, 80% 40%;
      }
      75% {
        background-position: 20% 80%, 80% 30%, 50% 70%;
      }
    }

    @keyframes hero-dot-pulse {
      0%, 100% { opacity: 0.03; }
      50% { opacity: 0.07; }
    }

    @keyframes hero-float-a {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(12px, -18px) scale(1.05); }
      66% { transform: translate(-8px, 10px) scale(0.97); }
    }

    @keyframes hero-float-b {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(-15px, 12px) scale(0.95); }
      66% { transform: translate(10px, -14px) scale(1.03); }
    }
  `;
  document.head.appendChild(style);
}

/** Splits heading to apply gradient to the last two words */
function renderGradientHeading(heading, primaryColor) {
  const words = heading.split(' ');
  if (words.length <= 2) {
    return (
      <span
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 60%, #a78bfa))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {heading}
      </span>
    );
  }
  const plain = words.slice(0, -2).join(' ');
  const gradient = words.slice(-2).join(' ');
  return (
    <>
      {plain}{' '}
      <span
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 60%, #a78bfa))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {gradient}
      </span>
    </>
  );
}

export default function HeroRenderer({ section, theme }) {
  const {
    heading = '',
    subheading = '',
    ctaText = '',
    ctaLink = '#',
    secondaryCtaText = '',
    secondaryCtaLink = '#',
    backgroundImage = null,
    alignment = 'center',
    overlay = true,
    overlayOpacity = 0.5,
  } = section?.props || {};

  const alignClasses = ALIGNMENT_CLASSES[alignment] || ALIGNMENT_CLASSES.center;
  const buttonAlignClasses = BUTTON_ALIGNMENT_CLASSES[alignment] || BUTTON_ALIGNMENT_CLASSES.center;
  const primaryColor = theme?.primaryColor || 'var(--ws-primary)';

  // Inject keyframes on first render
  useMemo(() => ensureKeyframes(), []);

  const buildBackgroundStyle = () => {
    if (backgroundImage) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }

    // Animated mesh gradient fallback
    return {
      background: [
        `radial-gradient(ellipse 80% 60% at 20% 40%, color-mix(in srgb, var(--ws-primary) 25%, transparent), transparent)`,
        `radial-gradient(ellipse 70% 50% at 80% 30%, color-mix(in srgb, #8b5cf6 20%, transparent), transparent)`,
        `radial-gradient(ellipse 60% 70% at 50% 80%, color-mix(in srgb, var(--ws-primary) 15%, transparent), transparent)`,
      ].join(', '),
      backgroundColor: 'var(--ws-bg)',
      backgroundSize: '200% 200%, 200% 200%, 200% 200%',
      animation: 'hero-mesh-shift 20s ease-in-out infinite',
    };
  };

  // Dot grid pattern overlay
  const dotGridStyle = {
    backgroundImage: `radial-gradient(circle, var(--ws-muted) 0.8px, transparent 0.8px)`,
    backgroundSize: '28px 28px',
    animation: 'hero-dot-pulse 6s ease-in-out infinite',
  };

  // Motion variants
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const accentLineVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: {
      scaleX: 1,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const headingVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const subheadingVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const buttonVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        minHeight: 'max(550px, 70vh)',
        fontFamily: 'var(--ws-font)',
        color: 'var(--ws-text)',
        ...buildBackgroundStyle(),
      }}
    >
      {/* Dark overlay for background images */}
      {backgroundImage && overlay && (
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
        />
      )}

      {/* Dot grid pattern overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={dotGridStyle}
      />

      {/* Decorative floating geometric elements */}
      {!backgroundImage && (
        <>
          {/* Large circle top-right */}
          <div
            className="absolute z-[1] pointer-events-none rounded-full"
            style={{
              width: '360px',
              height: '360px',
              top: '-60px',
              right: '-80px',
              border: '1px solid color-mix(in srgb, var(--ws-primary) 12%, transparent)',
              animation: 'hero-float-a 14s ease-in-out infinite',
            }}
          />
          {/* Medium circle bottom-left */}
          <div
            className="absolute z-[1] pointer-events-none rounded-full"
            style={{
              width: '220px',
              height: '220px',
              bottom: '40px',
              left: '-40px',
              border: '1px solid color-mix(in srgb, var(--ws-primary) 10%, transparent)',
              animation: 'hero-float-b 16s ease-in-out infinite',
            }}
          />
          {/* Small dot cluster */}
          <div
            className="absolute z-[1] pointer-events-none"
            style={{
              top: '30%',
              right: '12%',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 6px)',
              gap: '10px',
              animation: 'hero-float-a 18s ease-in-out infinite',
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: '3px',
                  height: '3px',
                  backgroundColor: 'var(--ws-primary)',
                  opacity: 0.15,
                }}
              />
            ))}
          </div>
          {/* Small accent ring */}
          <div
            className="absolute z-[1] pointer-events-none rounded-full"
            style={{
              width: '80px',
              height: '80px',
              bottom: '25%',
              right: '20%',
              border: '1.5px solid color-mix(in srgb, var(--ws-primary) 18%, transparent)',
              animation: 'hero-float-b 12s ease-in-out infinite',
            }}
          />
        </>
      )}

      {/* Content */}
      <motion.div
        className={`relative z-10 flex flex-col ${alignClasses} justify-center h-full px-6 sm:px-10 lg:px-20 py-24`}
        style={{ minHeight: 'max(550px, 70vh)' }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-3xl w-full">
          {/* Thin gradient accent line above heading */}
          {heading && (
            <motion.div
              variants={accentLineVariants}
              style={{
                width: alignment === 'center' ? '80px' : '60px',
                height: '3px',
                borderRadius: '999px',
                background: `linear-gradient(90deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 50%, #8b5cf6))`,
                marginBottom: '24px',
                marginLeft: alignment === 'center' ? 'auto' : alignment === 'right' ? 'auto' : '0',
                marginRight: alignment === 'center' ? 'auto' : alignment === 'right' ? '0' : 'auto',
                transformOrigin: alignment === 'right' ? 'right' : alignment === 'center' ? 'center' : 'left',
              }}
            />
          )}

          {heading && (
            <motion.h1
              variants={headingVariants}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-7"
              style={{ fontFamily: 'var(--ws-heading-font)' }}
            >
              {renderGradientHeading(heading, primaryColor)}
            </motion.h1>
          )}

          {subheading && (
            <motion.p
              variants={subheadingVariants}
              className="text-lg sm:text-xl lg:text-2xl leading-relaxed mb-12 max-w-2xl"
              style={{
                color: 'var(--ws-muted)',
                marginLeft: alignment === 'center' ? 'auto' : undefined,
                marginRight: alignment === 'center' ? 'auto' : undefined,
              }}
            >
              {subheading}
            </motion.p>
          )}

          {/* CTA Buttons */}
          {(ctaText || secondaryCtaText) && (
            <div className={`flex flex-col sm:flex-row gap-5 ${buttonAlignClasses}`}>
              {ctaText && (
                <motion.a
                  variants={buttonVariants}
                  href={ctaLink}
                  className="inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl text-base font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: 'var(--ws-primary)',
                    color: 'var(--ws-bg)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: `0 0 0 0 color-mix(in srgb, var(--ws-primary) 40%, transparent)`,
                  }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: `0 0 28px 4px color-mix(in srgb, var(--ws-primary) 35%, transparent)`,
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  {ctaText}
                  <ArrowRight className="w-4 h-4" />
                </motion.a>
              )}

              {secondaryCtaText && (
                <motion.a
                  variants={buttonVariants}
                  href={secondaryCtaLink}
                  className="inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl text-base font-semibold transition-all duration-300"
                  style={{
                    border: '1.5px solid color-mix(in srgb, var(--ws-primary) 50%, transparent)',
                    color: 'var(--ws-primary)',
                    backgroundColor: 'color-mix(in srgb, var(--ws-primary) 6%, transparent)',
                    backdropFilter: 'blur(8px)',
                  }}
                  whileHover={{
                    scale: 1.03,
                    backgroundColor: 'color-mix(in srgb, var(--ws-primary) 12%, transparent)',
                    borderColor: 'var(--ws-primary)',
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  {secondaryCtaText}
                </motion.a>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}

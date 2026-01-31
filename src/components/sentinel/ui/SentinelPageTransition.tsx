import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/sentinel';
import { SentinelThemeProvider, useSentinelTheme } from '@/contexts/SentinelThemeContext';

interface SentinelPageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with enter/exit fade+slide animation and Sentinel theme provider.
 * Toggles data-sentinel-light on <html> so CSS overrides apply to the entire page
 * (including body background) — not just descendants of this component.
 */
export function SentinelPageTransition({ children, className }: SentinelPageTransitionProps) {
  return (
    <SentinelThemeProvider>
      <SentinelPageTransitionInner className={className}>
        {children}
      </SentinelPageTransitionInner>
    </SentinelThemeProvider>
  );
}

function SentinelPageTransitionInner({ children, className }: SentinelPageTransitionProps) {
  const { theme } = useSentinelTheme();

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-sentinel-light', '');
    } else {
      html.removeAttribute('data-sentinel-light');
    }
    return () => {
      html.removeAttribute('data-sentinel-light');
    };
  }, [theme]);

  return (
    <motion.div
      initial={MOTION_VARIANTS.page.initial}
      animate={MOTION_VARIANTS.page.animate}
      exit={MOTION_VARIANTS.page.exit}
      transition={MOTION_VARIANTS.page.transition}
      className={className}
      data-sentinel-light={theme === 'light' ? '' : undefined}
    >
      {children}
    </motion.div>
  );
}

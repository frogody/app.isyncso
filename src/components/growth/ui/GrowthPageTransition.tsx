import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/growth';
import { GrowthThemeProvider, useGrowthTheme } from '@/contexts/GrowthThemeContext';

interface GrowthPageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with enter/exit fade+slide animation and Growth theme provider.
 * Toggles data-growth-light on <html> so CSS overrides apply to the entire page.
 */
export function GrowthPageTransition({ children, className }: GrowthPageTransitionProps) {
  return (
    <GrowthThemeProvider>
      <GrowthPageTransitionInner className={className}>
        {children}
      </GrowthPageTransitionInner>
    </GrowthThemeProvider>
  );
}

function GrowthPageTransitionInner({ children, className }: GrowthPageTransitionProps) {
  const { theme } = useGrowthTheme();

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-growth-light', '');
    } else {
      html.removeAttribute('data-growth-light');
    }
    return () => {
      html.removeAttribute('data-growth-light');
    };
  }, [theme]);

  return (
    <motion.div
      initial={MOTION_VARIANTS.page.initial}
      animate={MOTION_VARIANTS.page.animate}
      exit={MOTION_VARIANTS.page.exit}
      transition={MOTION_VARIANTS.page.transition}
      className={className}
      data-growth-light={theme === 'light' ? '' : undefined}
    >
      {children}
    </motion.div>
  );
}

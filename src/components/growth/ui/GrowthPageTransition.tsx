import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/growth';

interface GrowthPageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const STORAGE_KEY = 'growth-theme';

/**
 * Wraps page content with enter/exit fade+slide animation.
 * Reads theme directly from localStorage and polls for changes
 * so it stays in sync with useGrowthTheme() calls outside the provider.
 */
export function GrowthPageTransition({ children, className }: GrowthPageTransitionProps) {
  const [theme, setTheme] = useState(() =>
    (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'dark'
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem(STORAGE_KEY) || 'dark';
      setTheme(prev => (prev !== stored ? stored : prev));
    }, 100);
    return () => clearInterval(interval);
  }, []);

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

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/finance';
import { FinanceThemeProvider, useFinanceTheme } from '@/contexts/FinanceThemeContext';

interface FinancePageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with enter/exit fade+slide animation and Finance theme provider.
 * Toggles data-finance-light on <html> so CSS overrides apply to the entire page.
 */
export function FinancePageTransition({ children, className }: FinancePageTransitionProps) {
  return (
    <FinanceThemeProvider>
      <FinancePageTransitionInner className={className}>
        {children}
      </FinancePageTransitionInner>
    </FinanceThemeProvider>
  );
}

function FinancePageTransitionInner({ children, className }: FinancePageTransitionProps) {
  const { theme } = useFinanceTheme();

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-finance-light', '');
    } else {
      html.removeAttribute('data-finance-light');
    }
    return () => {
      html.removeAttribute('data-finance-light');
    };
  }, [theme]);

  return (
    <motion.div
      initial={MOTION_VARIANTS.page.initial}
      animate={MOTION_VARIANTS.page.animate}
      exit={MOTION_VARIANTS.page.exit}
      transition={MOTION_VARIANTS.page.transition}
      className={className}
      data-finance-light={theme === 'light' ? '' : undefined}
    >
      {children}
    </motion.div>
  );
}

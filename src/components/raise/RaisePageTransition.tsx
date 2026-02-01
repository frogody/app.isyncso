import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RaiseThemeProvider, useRaiseTheme } from '@/contexts/RaiseThemeContext';

interface RaisePageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps Raise page content with enter/exit fade+slide animation and theme provider.
 * Toggles data-raise-light on <html> so CSS overrides apply globally.
 */
export function RaisePageTransition({ children, className }: RaisePageTransitionProps) {
  return (
    <RaiseThemeProvider>
      <RaisePageTransitionInner className={className}>
        {children}
      </RaisePageTransitionInner>
    </RaiseThemeProvider>
  );
}

function RaisePageTransitionInner({ children, className }: RaisePageTransitionProps) {
  const { theme } = useRaiseTheme();

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-raise-light', '');
    } else {
      html.removeAttribute('data-raise-light');
    }
    return () => {
      html.removeAttribute('data-raise-light');
    };
  }, [theme]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

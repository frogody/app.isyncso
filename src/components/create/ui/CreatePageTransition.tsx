import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/create';
import { CreateThemeProvider, useCreateTheme } from '@/contexts/CreateThemeContext';

interface CreatePageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with enter/exit fade+slide animation and Create theme provider.
 * Toggles data-create-light on <html> so CSS overrides apply to the entire page
 * (including body background) — not just descendants of this component.
 */
export function CreatePageTransition({ children, className }: CreatePageTransitionProps) {
  return (
    <CreateThemeProvider>
      <CreatePageTransitionInner className={className}>
        {children}
      </CreatePageTransitionInner>
    </CreateThemeProvider>
  );
}

function CreatePageTransitionInner({ children, className }: CreatePageTransitionProps) {
  const { theme } = useCreateTheme();

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-create-light', '');
    } else {
      html.removeAttribute('data-create-light');
    }
    return () => {
      html.removeAttribute('data-create-light');
    };
  }, [theme]);

  return (
    <motion.div
      initial={MOTION_VARIANTS.page.initial}
      animate={MOTION_VARIANTS.page.animate}
      exit={MOTION_VARIANTS.page.exit}
      transition={MOTION_VARIANTS.page.transition}
      className={className}
      data-create-light={theme === 'light' ? '' : undefined}
    >
      {children}
    </motion.div>
  );
}

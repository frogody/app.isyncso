import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/create';
import { useTheme } from '@/contexts/GlobalThemeContext';

interface CreatePageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function CreatePageTransition({ children, className }: CreatePageTransitionProps) {
  const { theme } = useTheme();

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

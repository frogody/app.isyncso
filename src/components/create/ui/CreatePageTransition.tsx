import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/create';

interface CreatePageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const STORAGE_KEY = 'create-theme';

export function CreatePageTransition({ children, className }: CreatePageTransitionProps) {
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

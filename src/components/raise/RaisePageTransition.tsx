import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface RaisePageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const STORAGE_KEY = 'raise-theme';

export function RaisePageTransition({ children, className }: RaisePageTransitionProps) {
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

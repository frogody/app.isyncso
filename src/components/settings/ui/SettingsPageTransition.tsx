import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/settings';
import { SettingsThemeProvider, useSettingsTheme } from '@/contexts/SettingsThemeContext';

interface SettingsPageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with enter/exit fade+slide animation and Settings theme provider.
 * Toggles data-settings-light on <html> so CSS overrides apply to the entire page.
 */
export function SettingsPageTransition({ children, className }: SettingsPageTransitionProps) {
  return (
    <SettingsThemeProvider>
      <SettingsPageTransitionInner className={className}>
        {children}
      </SettingsPageTransitionInner>
    </SettingsThemeProvider>
  );
}

function SettingsPageTransitionInner({ children, className }: SettingsPageTransitionProps) {
  const { theme } = useSettingsTheme();

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-settings-light', '');
    } else {
      html.removeAttribute('data-settings-light');
    }
    return () => {
      html.removeAttribute('data-settings-light');
    };
  }, [theme]);

  return (
    <motion.div
      initial={MOTION_VARIANTS.page.initial}
      animate={MOTION_VARIANTS.page.animate}
      exit={MOTION_VARIANTS.page.exit}
      transition={MOTION_VARIANTS.page.transition}
      className={className}
      data-settings-light={theme === 'light' ? '' : undefined}
    >
      {children}
    </motion.div>
  );
}

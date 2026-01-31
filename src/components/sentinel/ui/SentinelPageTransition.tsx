import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/sentinel';
import { SentinelThemeProvider, useSentinelTheme } from '@/contexts/SentinelThemeContext';

interface SentinelPageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with enter/exit fade+slide animation and Sentinel theme provider.
 * Adds data-sentinel-light attribute when in light mode to escape Layout's global dark CSS overrides.
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

  return (
    <motion.div
      initial={MOTION_VARIANTS.page.initial}
      animate={MOTION_VARIANTS.page.animate}
      exit={MOTION_VARIANTS.page.exit}
      transition={MOTION_VARIANTS.page.transition}
      className={className}
      {...(theme === 'light' ? { 'data-sentinel-light': '' } : {})}
    >
      {children}
    </motion.div>
  );
}

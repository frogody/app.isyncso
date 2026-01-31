import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/sentinel';

interface SentinelPageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with enter/exit fade+slide animation.
 * Use at the top level of each Sentinel page component.
 */
export function SentinelPageTransition({ children, className }: SentinelPageTransitionProps) {
  return (
    <motion.div
      initial={MOTION_VARIANTS.page.initial}
      animate={MOTION_VARIANTS.page.animate}
      exit={MOTION_VARIANTS.page.exit}
      transition={MOTION_VARIANTS.page.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

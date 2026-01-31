import { motion } from 'framer-motion';
import { MOTION_VARIANTS } from '@/tokens/create';
import { CreateThemeProvider } from '@/contexts/CreateThemeContext';

interface CreatePageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with enter/exit fade+slide animation and Create theme provider.
 * Use at the top level of each Create page component.
 */
export function CreatePageTransition({ children, className }: CreatePageTransitionProps) {
  return (
    <CreateThemeProvider>
      <motion.div
        initial={MOTION_VARIANTS.page.initial}
        animate={MOTION_VARIANTS.page.animate}
        exit={MOTION_VARIANTS.page.exit}
        transition={MOTION_VARIANTS.page.transition}
        className={className}
      >
        {children}
      </motion.div>
    </CreateThemeProvider>
  );
}

import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useSentinelTheme();
  const isLight = theme === 'light';

  return (
    <motion.button
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl border transition-colors ${
        isLight
          ? 'bg-purple-50 hover:bg-purple-100 border-purple-200/50'
          : 'bg-zinc-800/50 hover:bg-zinc-700/50 border-zinc-700/50'
      }`}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isLight ? 0 : 180 }}
        transition={{ duration: 0.3 }}
      >
        {isLight ? (
          <Sun className="w-4 h-4 text-purple-500" />
        ) : (
          <Moon className="w-4 h-4 text-slate-300" />
        )}
      </motion.div>
    </motion.button>
  );
}

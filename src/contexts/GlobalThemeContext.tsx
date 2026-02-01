import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type Theme = 'dark' | 'light';

type ThemeHelper = (lightClasses: string, darkClasses: string) => string;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  /** Helper: returns lightClasses when light, darkClasses when dark */
  t: ThemeHelper;
  // Module-specific aliases (all point to the same function)
  st: ThemeHelper;   // Settings / Sentinel
  pt: ThemeHelper;   // Projects
  gt: ThemeHelper;   // Growth
  ct: ThemeHelper;   // Create
  ft: ThemeHelper;   // Finance
  rt: ThemeHelper;   // Raise
  lt: ThemeHelper;   // Learn
  crt: ThemeHelper;  // CRM
  syt: ThemeHelper;  // Sync
}

const STORAGE_KEY = 'app-theme';

function getStoredTheme(): Theme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark';
  }
  return 'dark';
}

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function GlobalThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = getStoredTheme();
    applyThemeToDOM(stored);
    return stored;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyThemeToDOM(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const t = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    t,
    st: t,
    pt: t,
    gt: t,
    ct: t,
    ft: t,
    rt: t,
    lt: t,
    crt: t,
    syt: t,
  }), [theme, toggleTheme, t]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a GlobalThemeProvider');
  }
  return context;
}

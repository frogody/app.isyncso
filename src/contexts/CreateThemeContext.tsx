import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type CreateTheme = 'dark' | 'light';

interface CreateThemeContextType {
  theme: CreateTheme;
  toggleTheme: () => void;
  /** Helper: returns lightClasses when light, darkClasses when dark */
  ct: (lightClasses: string, darkClasses: string) => string;
}

const STORAGE_KEY = 'create-theme';

function getStoredTheme(): CreateTheme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as CreateTheme) || 'dark';
  }
  return 'dark';
}

const CreateThemeContext = createContext<CreateThemeContextType | undefined>(undefined);

export function CreateThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<CreateTheme>(getStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const ct = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, ct }), [theme, toggleTheme, ct]);

  return (
    <CreateThemeContext.Provider value={value}>
      {children}
    </CreateThemeContext.Provider>
  );
}

/**
 * Hook that works both inside and outside the provider.
 * Outside the provider it still reads/writes localStorage and triggers re-renders
 * via its own local state — so useCreateTheme() is safe to call anywhere.
 */
export function useCreateTheme(): CreateThemeContextType {
  const context = useContext(CreateThemeContext);

  // Local state fallback for when called outside provider
  const [localTheme, setLocalTheme] = useState<CreateTheme>(getStoredTheme);

  const localToggle = useCallback(() => {
    setLocalTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const localCt = useCallback(
    (lightClasses: string, darkClasses: string) => (localTheme === 'light' ? lightClasses : darkClasses),
    [localTheme],
  );

  if (context) return context;

  return { theme: localTheme, toggleTheme: localToggle, ct: localCt };
}

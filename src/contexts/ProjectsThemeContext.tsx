import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

type ProjectsTheme = 'dark' | 'light';

interface ProjectsThemeContextType {
  theme: ProjectsTheme;
  toggleTheme: () => void;
  pt: (lightClasses: string, darkClasses: string) => string;
}

const STORAGE_KEY = 'projects-theme';

function getStoredTheme(): ProjectsTheme {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(STORAGE_KEY) as ProjectsTheme) || 'dark';
  }
  return 'dark';
}

const ProjectsThemeContext = createContext<ProjectsThemeContextType | undefined>(undefined);

export function ProjectsThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ProjectsTheme>(getStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const pt = useCallback(
    (lightClasses: string, darkClasses: string) => (theme === 'light' ? lightClasses : darkClasses),
    [theme],
  );

  const value = useMemo(() => ({ theme, toggleTheme, pt }), [theme, toggleTheme, pt]);

  return (
    <ProjectsThemeContext.Provider value={value}>
      {children}
    </ProjectsThemeContext.Provider>
  );
}

export function useProjectsTheme(): ProjectsThemeContextType {
  const context = useContext(ProjectsThemeContext);

  const [localTheme, setLocalTheme] = useState<ProjectsTheme>(getStoredTheme);

  const localToggle = useCallback(() => {
    setLocalTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const localPt = useCallback(
    (lightClasses: string, darkClasses: string) => (localTheme === 'light' ? lightClasses : darkClasses),
    [localTheme],
  );

  if (context) return context;

  return { theme: localTheme, toggleTheme: localToggle, pt: localPt };
}

import React, { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '@/components/context/UserContext';
import { useActivityLogger } from '@/hooks/useActivityLogger';

const ActivityLoggerContext = createContext(null);

export function ActivityLoggerProvider({ children }) {
  const { user } = useUser();
  const location = useLocation();
  const { logAction, logPageView, flush } = useActivityLogger(
    user?.id,
    user?.company_id
  );

  // Auto-log page views on route change
  useEffect(() => {
    if (!user?.id) return;

    const pageName = location.pathname.replace('/', '') || 'Home';
    logPageView(pageName, location.pathname);
  }, [location.pathname, user?.id, logPageView]);

  return (
    <ActivityLoggerContext.Provider value={{ logAction, logPageView, flush }}>
      {children}
    </ActivityLoggerContext.Provider>
  );
}

export function useLogAction() {
  const context = useContext(ActivityLoggerContext);
  if (!context) {
    // Return no-op functions if used outside provider (graceful fallback)
    return {
      logAction: () => {},
      logPageView: () => {},
      flush: () => {}
    };
  }
  return context;
}

export default ActivityLoggerContext;

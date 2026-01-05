import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { logError, isRecoverableError, retryWithBackoff } from '@/components/utils/errorHandler';

/**
 * UserContext - Centralized user, company, and settings management
 *
 * Provides:
 * - user: Current authenticated user data
 * - company: User's company entity (linked via company_id)
 * - settings: User preferences from UserSettings entity
 * - isLoading: Combined loading state
 * - error: Any fetch errors
 * - refreshUser: Manually refetch all user data
 * - updateUser: Update user profile
 * - updateCompany: Update company data
 * - updateSettings: Update user settings
 *
 * Features:
 * - Auto-loads on mount with retry logic
 * - Memoized context value to prevent unnecessary re-renders
 * - Handles missing company_id gracefully
 * - Provides optimistic updates for better UX
 */

const UserContext = createContext(null);

// Retry configuration for user data loading
const RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
};

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch user with retry for network errors
      const userData = await retryWithBackoff(
        () => base44.auth.me(),
        RETRY_OPTIONS
      );
      setUser(userData);

      if (!userData) {
        setIsLoading(false);
        return;
      }

      // Load company and settings in parallel with individual error handling
      const results = await Promise.allSettled([
        // Load company if user has company_id - use filter to avoid 404 errors
        userData.company_id
          ? retryWithBackoff(
              async () => {
                const companies = await base44.entities.Company.filter({ id: userData.company_id });
                return companies.length > 0 ? companies[0] : null;
              },
              RETRY_OPTIONS
            )
          : Promise.resolve(null),

        // Load user settings from database (not edge function)
        retryWithBackoff(
          async () => {
            const configs = await base44.entities.UserAppConfig.filter({ user_id: userData.id });
            return configs.length > 0 ? configs[0] : null;
          },
          RETRY_OPTIONS
        ),
      ]);

      // Process company result
      if (results[0].status === 'fulfilled') {
        setCompany(results[0].value);
      } else if (results[0].status === 'rejected') {
        logError('UserContext:company', results[0].reason);
      }

      // Process settings result
      if (results[1].status === 'fulfilled') {
        setSettings(results[1].value || null);
      } else if (results[1].status === 'rejected') {
        logError('UserContext:settings', results[1].reason);
      }

      setLastRefresh(new Date().toISOString());
    } catch (err) {
      logError('UserContext:loadUserData', err);
      setError(err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const refreshUser = useCallback(async () => {
    await loadUserData();
  }, [loadUserData]);

  const updateUser = useCallback(async (updates) => {
    if (!user) {
      throw new Error('No user to update');
    }

    // Optimistic update
    const previousUser = user;
    setUser((prev) => ({ ...prev, ...updates }));

    try {
      await base44.auth.updateMe(updates);
    } catch (err) {
      // Rollback on error
      setUser(previousUser);
      logError('UserContext:updateUser', err);
      throw err;
    }
  }, [user]);

  const updateCompany = useCallback(async (updates) => {
    if (!company?.id) {
      throw new Error('No company to update');
    }

    // Optimistic update
    const previousCompany = company;
    setCompany((prev) => ({ ...prev, ...updates }));

    try {
      await base44.entities.Company.update(company.id, updates);
    } catch (err) {
      // Rollback on error
      setCompany(previousCompany);
      logError('UserContext:updateCompany', err);
      throw err;
    }
  }, [company]);

  const updateSettings = useCallback(async (updates) => {
    // Optimistic update
    const previousSettings = settings;
    setSettings((prev) => ({ ...prev, ...updates }));

    try {
      if (settings?.id) {
        // Update existing settings
        await base44.entities.UserAppConfig.update(settings.id, updates);
      } else if (user?.id) {
        // Create new settings record
        const newSettings = await base44.entities.UserAppConfig.create({
          user_id: user.id,
          ...updates
        });
        setSettings(newSettings);
      }
    } catch (err) {
      // Rollback on error
      setSettings(previousSettings);
      logError('UserContext:updateSettings', err);
      throw err;
    }
  }, [settings, user]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      company,
      settings,
      isLoading,
      error,
      lastRefresh,
      refreshUser,
      updateUser,
      updateCompany,
      updateSettings,
      // Computed properties
      isAuthenticated: !!user,
      hasCompany: !!company,
      userId: user?.id,
      companyId: company?.id,
    }),
    [
      user,
      company,
      settings,
      isLoading,
      error,
      lastRefresh,
      refreshUser,
      updateUser,
      updateCompany,
      updateSettings,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

/**
 * Hook to get only user data (prevents re-renders from company/settings changes)
 */
export function useUserData() {
  const { user, isLoading, error, updateUser } = useUser();
  return useMemo(
    () => ({ user, isLoading, error, updateUser }),
    [user, isLoading, error, updateUser]
  );
}

/**
 * Hook to get only company data
 */
export function useCompanyData() {
  const { company, isLoading, error, updateCompany, hasCompany } = useUser();
  return useMemo(
    () => ({ company, isLoading, error, updateCompany, hasCompany }),
    [company, isLoading, error, updateCompany, hasCompany]
  );
}

/**
 * Hook to get only settings data
 */
export function useSettingsData() {
  const { settings, isLoading, error, updateSettings } = useUser();
  return useMemo(
    () => ({ settings, isLoading, error, updateSettings }),
    [settings, isLoading, error, updateSettings]
  );
}

export default UserContext;
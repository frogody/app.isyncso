import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/api/supabaseClient';
import { supabase } from '@/api/supabaseClient';
import { logError, isRecoverableError, retryWithBackoff } from '@/components/utils/errorHandler';

// All available apps in the system
const ALL_APPS = ['learn', 'growth', 'sentinel', 'finance', 'inbox', 'projects', 'analytics'];

/**
 * UserContext - Centralized user, company, team, and settings management
 *
 * Provides:
 * - user: Current authenticated user data
 * - company: User's company entity (linked via company_id)
 * - settings: User preferences from UserSettings entity
 * - userTeams: Array of teams the user belongs to (with app access info)
 * - effectiveApps: Array of app names the user can access based on teams
 * - isLoading: Combined loading state
 * - error: Any fetch errors
 * - refreshUser: Manually refetch all user data
 * - updateUser: Update user profile
 * - updateCompany: Update company data
 * - updateSettings: Update user settings
 * - hasAppAccess(appName): Check if user has access to specific app
 *
 * Features:
 * - Auto-loads on mount with retry logic
 * - Memoized context value to prevent unnecessary re-renders
 * - Handles missing company_id gracefully
 * - Provides optimistic updates for better UX
 * - Team-based app access control (admins get all apps, others get team apps)
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
  const [userTeams, setUserTeams] = useState([]);
  const [effectiveApps, setEffectiveApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch user with retry for network errors
      const userData = await retryWithBackoff(
        () => db.auth.me(),
        RETRY_OPTIONS
      );
      setUser(userData);

      if (!userData) {
        setIsLoading(false);
        return;
      }

      // Load company, settings, and team data in parallel with individual error handling
      const results = await Promise.allSettled([
        // Load company if user has company_id - use filter to avoid 404 errors
        userData.company_id
          ? retryWithBackoff(
              async () => {
                const companies = await db.entities.Company.filter({ id: userData.company_id });
                return companies.length > 0 ? companies[0] : null;
              },
              RETRY_OPTIONS
            )
          : Promise.resolve(null),

        // Load user settings from database (not edge function)
        retryWithBackoff(
          async () => {
            const configs = await db.entities.UserAppConfig.filter({ user_id: userData.id });
            return configs.length > 0 ? configs[0] : null;
          },
          RETRY_OPTIONS
        ),

        // Load user's team memberships with team and app access data
        retryWithBackoff(
          async () => {
            const { data: teamMemberships, error: teamError } = await supabase
              .from('team_members')
              .select(`
                team_id,
                role,
                teams:team_id (
                  id,
                  name,
                  description,
                  company_id,
                  team_app_access (
                    app_name,
                    is_enabled
                  )
                )
              `)
              .eq('user_id', userData.id);

            if (teamError) throw teamError;
            return teamMemberships || [];
          },
          RETRY_OPTIONS
        ),

        // Get user's effective apps via database function
        retryWithBackoff(
          async () => {
            const { data, error: funcError } = await supabase
              .rpc('get_user_effective_apps', { p_user_id: userData.id });

            if (funcError) throw funcError;
            return data || [];
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

      // Process team memberships result
      if (results[2].status === 'fulfilled') {
        const memberships = results[2].value;
        // Transform to array of team objects with membership role
        const teams = memberships.map(m => ({
          ...m.teams,
          memberRole: m.role,
        })).filter(t => t.id); // Filter out any null teams
        setUserTeams(teams);
      } else if (results[2].status === 'rejected') {
        logError('UserContext:teams', results[2].reason);
        setUserTeams([]);
      }

      // Process effective apps result
      if (results[3].status === 'fulfilled') {
        setEffectiveApps(results[3].value || []);
      } else if (results[3].status === 'rejected') {
        logError('UserContext:effectiveApps', results[3].reason);
        // Fallback: if function fails, give empty apps (minimal access)
        setEffectiveApps([]);
      }

      setLastRefresh(new Date().toISOString());

      // Update last_active_at to track user activity
      if (userData?.id) {
        supabase
          .from('users')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', userData.id)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.warn('[UserContext] Failed to update last_active_at:', updateError.message);
            }
          });
      }
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
      await db.auth.updateMe(updates);
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
      await db.entities.Company.update(company.id, updates);
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
        await db.entities.UserAppConfig.update(settings.id, updates);
      } else if (user?.id) {
        // Create new settings record
        const newSettings = await db.entities.UserAppConfig.create({
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

  // Helper function to check if user has access to specific app
  const hasAppAccess = useCallback((appName) => {
    return effectiveApps.includes(appName);
  }, [effectiveApps]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      company,
      settings,
      userTeams,
      effectiveApps,
      isLoading,
      error,
      lastRefresh,
      refreshUser,
      updateUser,
      updateCompany,
      updateSettings,
      hasAppAccess,
      // Computed properties
      isAuthenticated: !!user,
      hasCompany: !!company,
      hasTeams: userTeams.length > 0,
      userId: user?.id,
      companyId: company?.id,
      // All available apps constant
      allApps: ALL_APPS,
    }),
    [
      user,
      company,
      settings,
      userTeams,
      effectiveApps,
      isLoading,
      error,
      lastRefresh,
      refreshUser,
      updateUser,
      updateCompany,
      updateSettings,
      hasAppAccess,
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

/**
 * Hook to get team membership and app access data
 */
export function useTeamAccess() {
  const { userTeams, effectiveApps, hasAppAccess, hasTeams, allApps, isLoading } = useUser();
  return useMemo(
    () => ({ userTeams, effectiveApps, hasAppAccess, hasTeams, allApps, isLoading }),
    [userTeams, effectiveApps, hasAppAccess, hasTeams, allApps, isLoading]
  );
}

export default UserContext;
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook for managing portal client authentication state
 * Used by external clients accessing the client portal
 */
export function usePortalClient() {
  const [client, setClient] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch client data based on auth user
  const fetchClientData = useCallback(async (authUserId, authEmail) => {
    try {
      // Try finding by auth_user_id first
      let { data, error: fetchError } = await supabase
        .from('portal_clients')
        .select(`
          *,
          organization:organizations(id, name, slug, logo_url)
        `)
        .eq('auth_user_id', authUserId)
        .in('status', ['active', 'invited'])
        .single();

      // If not found by auth_user_id, try by email and link the account
      if (fetchError?.code === 'PGRST116' && authEmail) {
        const { data: emailMatch, error: emailError } = await supabase
          .from('portal_clients')
          .select(`
            *,
            organization:organizations(id, name, slug, logo_url)
          `)
          .eq('email', authEmail.toLowerCase())
          .in('status', ['active', 'invited'])
          .single();

        if (emailMatch && !emailError) {
          // Link auth user to portal client
          await supabase
            .from('portal_clients')
            .update({
              auth_user_id: authUserId,
              status: 'active',
              last_login_at: new Date().toISOString(),
            })
            .eq('id', emailMatch.id);

          data = { ...emailMatch, auth_user_id: authUserId, status: 'active' };
          fetchError = null;
        }
      }

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setClient(null);
          return null;
        }
        throw fetchError;
      }

      setClient(data);

      // Update last login
      await supabase
        .from('portal_clients')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.id);

      return data;
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError(err.message);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Add timeout to prevent infinite loading (5 seconds)
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 5000)
        );

        const sessionPromise = supabase.auth.getSession().then(result => ({
          ...result,
          timedOut: false
        }));

        const result = await Promise.race([sessionPromise, timeoutPromise]);

        if (!isMounted) return;

        // If timed out, just proceed with no session (user will need to log in)
        if (result.timedOut) {
          setSession(null);
          setLoading(false);
          return;
        }

        const currentSession = result.data?.session || null;
        setSession(currentSession);

        if (currentSession?.user) {
          await fetchClientData(currentSession.user.id, currentSession.user.email);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Safety fallback: ensure loading is set to false after 8 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 8000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);

      if (event === 'SIGNED_IN' && newSession?.user) {
        await fetchClientData(newSession.user.id, newSession.user.email);
      } else if (event === 'SIGNED_OUT') {
        setClient(null);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [fetchClientData]);

  // Sign in with magic link
  const signInWithMagicLink = useCallback(async (email, organizationSlug) => {
    try {
      setError(null);

      // First verify the client exists
      // Use organization slug to scope the lookup since user isn't authenticated yet
      let clientData = null;

      if (organizationSlug) {
        // Look up org first, then find client within it
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', organizationSlug)
          .single();

        if (org) {
          const { data, error: clientError } = await supabase
            .from('portal_clients')
            .select('id, email, organization_id, status')
            .eq('email', email.toLowerCase())
            .eq('organization_id', org.id)
            .in('status', ['active', 'invited'])
            .single();

          if (!clientError) clientData = data;
        }
      }

      // Fallback: try without org filter (for backwards compat)
      if (!clientData) {
        const { data, error: clientError } = await supabase
          .from('portal_clients')
          .select('id, email, organization_id, status')
          .eq('email', email.toLowerCase())
          .in('status', ['active', 'invited'])
          .single();

        if (!clientError) clientData = data;
      }

      if (!clientData) {
        throw new Error('No account found with this email. Please contact your agency.');
      }

      // Send magic link
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
          data: {
            portal_client_id: clientData.id,
            organization_id: clientData.organization_id,
          },
        },
      });

      if (authError) throw authError;

      return { success: true, message: 'Check your email for the login link!' };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setClient(null);
      setSession(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get accessible projects for this client
  const getAccessibleProjects = useCallback(async () => {
    if (!client) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('client_project_access')
        .select(`
          permission_level,
          granted_at,
          project:projects(
            id, title, description, status, progress,
            start_date, due_date, budget, spent,
            attachments, milestones, page_content
          )
        `)
        .eq('client_id', client.id)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (fetchError) throw fetchError;

      return data?.map(item => ({
        ...item.project,
        permission_level: item.permission_level,
        granted_at: item.granted_at,
      })) || [];
    } catch (err) {
      console.error('Error fetching accessible projects:', err);
      return [];
    }
  }, [client]);

  // Check if client has specific permission on a project
  const hasProjectPermission = useCallback(async (projectId, requiredLevel = 'view') => {
    if (!client) return false;

    const permissionLevels = ['view', 'comment', 'approve', 'edit'];
    const requiredIndex = permissionLevels.indexOf(requiredLevel);

    try {
      const { data, error: fetchError } = await supabase
        .from('client_project_access')
        .select('permission_level')
        .eq('client_id', client.id)
        .eq('project_id', projectId)
        .or('expires_at.is.null,expires_at.gt.now()')
        .single();

      if (fetchError || !data) return false;

      const clientIndex = permissionLevels.indexOf(data.permission_level);
      return clientIndex >= requiredIndex;
    } catch {
      return false;
    }
  }, [client]);

  return {
    client,
    session,
    loading,
    error,
    isAuthenticated: !!client && !!session,
    signInWithMagicLink,
    signOut,
    getAccessibleProjects,
    hasProjectPermission,
    refetchClient: () => session?.user && fetchClientData(session.user.id, session.user.email),
  };
}

export default usePortalClient;

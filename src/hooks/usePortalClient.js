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

  // Extract org slug from current URL path (e.g. /portal/blinq-recruitment/...)
  const getOrgSlugFromUrl = () => {
    const match = window.location.pathname.match(/^\/portal\/([^/]+)/);
    if (match && match[1] !== 'auth' && match[1] !== 'login') {
      return match[1];
    }
    return null;
  };

  // Fetch client data based on auth user, scoped to the current org when possible
  const fetchClientData = useCallback(async (authUserId, authEmail) => {
    try {
      const orgSlug = getOrgSlugFromUrl();
      let orgId = null;

      // If we know which org portal we're on, scope all lookups to it
      if (orgSlug) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', orgSlug)
          .single();
        if (orgData) orgId = orgData.id;
      }

      const selectFields = `*, organization:organizations(id, name, slug, logo_url)`;

      // Build query — scoped to org if known
      let query = supabase
        .from('portal_clients')
        .select(selectFields)
        .eq('auth_user_id', authUserId)
        .in('status', ['active', 'invited']);
      if (orgId) query = query.eq('organization_id', orgId);

      let { data, error: fetchError } = await query.single();

      // If not found by auth_user_id, try by email and link the account
      if (fetchError?.code === 'PGRST116' && authEmail) {
        let emailQuery = supabase
          .from('portal_clients')
          .select(selectFields)
          .eq('email', authEmail.toLowerCase())
          .in('status', ['active', 'invited']);
        if (orgId) emailQuery = emailQuery.eq('organization_id', orgId);

        const { data: emailMatch, error: emailError } = await emailQuery.single();

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
          const clientResult = await fetchClientData(currentSession.user.id, currentSession.user.email);
          // If there's a session but no portal client, sign out to prevent stale auth locks.
          // BUT: skip sign-out in preview mode (builder iframe) to avoid logging out the admin.
          const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
          if (!clientResult && isMounted && !isPreview) {
            await supabase.auth.signOut();
            setSession(null);
          }
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
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', organizationSlug)
          .single();

        if (orgError) {
          console.warn('Org lookup error (falling back):', orgError.message);
        }

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

      // Build org-scoped redirect so the magic link lands on the correct portal
      const callbackUrl = organizationSlug
        ? `${window.location.origin}/portal/${organizationSlug}/auth/callback`
        : `${window.location.origin}/portal/auth/callback`;

      // Send magic link
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            portal_client_id: clientData.id,
            organization_id: clientData.organization_id,
            organization_slug: organizationSlug,
          },
        },
      });

      if (authError) throw authError;

      return { success: true, message: 'Check your email for the login link!' };
    } catch (err) {
      console.error('signInWithMagicLink error:', err);
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

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

export default function ClientAuthCallback() {
  const navigate = useNavigate();
  const { org: orgSlugFromPath } = useParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError) throw authError;

        if (!session?.user) {
          setError('Authentication failed. Please try again.');
          return;
        }

        // Determine which organization this login is for.
        // Priority: URL path param > user metadata from the magic link
        const targetOrgSlug =
          orgSlugFromPath ||
          session.user.user_metadata?.organization_slug;

        let clientData = null;

        if (targetOrgSlug) {
          // We know which org the user should land on — look up their client record
          // scoped to that specific organization
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', targetOrgSlug)
            .single();

          if (orgData) {
            // Try by auth_user_id first (returning user), scoped to this org
            const { data: byAuthId } = await supabase
              .from('portal_clients')
              .select('id, status, organization_id')
              .eq('auth_user_id', session.user.id)
              .eq('organization_id', orgData.id)
              .in('status', ['active', 'invited'])
              .single();

            if (byAuthId) {
              clientData = byAuthId;
            } else if (session.user.email) {
              // Try by email, scoped to this org
              const { data: byEmail } = await supabase
                .from('portal_clients')
                .select('id, status, organization_id')
                .eq('email', session.user.email.toLowerCase())
                .eq('organization_id', orgData.id)
                .in('status', ['active', 'invited'])
                .single();

              if (byEmail) {
                clientData = byEmail;
              }
            }
          }
        }

        // Fallback: no target org known — find any matching client record (legacy flow)
        if (!clientData) {
          const { data: byAuthId } = await supabase
            .from('portal_clients')
            .select('id, status, organization:organizations(slug)')
            .eq('auth_user_id', session.user.id)
            .in('status', ['active', 'invited'])
            .single();

          if (byAuthId) {
            clientData = byAuthId;
          } else if (session.user.email) {
            const { data: byEmail } = await supabase
              .from('portal_clients')
              .select('id, status, organization:organizations(slug)')
              .eq('email', session.user.email.toLowerCase())
              .in('status', ['active', 'invited'])
              .single();

            if (byEmail) {
              clientData = byEmail;
            }
          }
        }

        if (!clientData) {
          setError('No portal access found for this account. Please contact your agency.');
          return;
        }

        // Link auth user and activate if needed
        const updates = { last_login_at: new Date().toISOString() };
        if (clientData.status === 'invited') {
          updates.status = 'active';
          updates.auth_user_id = session.user.id;
        } else if (!clientData.auth_user_id) {
          updates.auth_user_id = session.user.id;
        }

        await supabase
          .from('portal_clients')
          .update(updates)
          .eq('id', clientData.id);

        // Determine final org slug for redirect
        const orgSlug =
          targetOrgSlug ||
          clientData.organization?.slug;

        if (orgSlug) {
          navigate(`/portal/${orgSlug}`, { replace: true });
        } else {
          setError('No portal access found for this account. Please contact your agency.');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Something went wrong');
      }
    };

    handleCallback();

    // Safety timeout
    const timeout = setTimeout(() => {
      setError('Login timed out. Please try again.');
    }, 10000);

    return () => clearTimeout(timeout);
  }, [navigate, orgSlugFromPath]);

  if (error) {
    const backUrl = orgSlugFromPath ? `/portal/${orgSlugFromPath}/login` : '/portal';

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate(backUrl)}
            className="text-cyan-400 hover:text-cyan-300 text-sm"
          >
            Back to portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      <p className="text-zinc-500 text-sm">Signing you in...</p>
    </div>
  );
}

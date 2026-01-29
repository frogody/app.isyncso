import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

export default function ClientAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError) throw authError;

        if (session?.user) {
          // First try to find client by auth_user_id (returning user)
          let { data: clientData } = await supabase
            .from('portal_clients')
            .select('id, status, organization:organizations(slug)')
            .eq('auth_user_id', session.user.id)
            .in('status', ['active', 'invited'])
            .single();

          // If not found, link by email (first-time login via magic link)
          if (!clientData && session.user.email) {
            const { data: clientByEmail } = await supabase
              .from('portal_clients')
              .select('id, status, organization:organizations(slug)')
              .eq('email', session.user.email.toLowerCase())
              .in('status', ['active', 'invited'])
              .single();

            if (clientByEmail) {
              // Link the auth user to the portal client record
              await supabase
                .from('portal_clients')
                .update({
                  auth_user_id: session.user.id,
                  status: 'active',
                  last_login_at: new Date().toISOString(),
                })
                .eq('id', clientByEmail.id);

              clientData = clientByEmail;
            }
          } else if (clientData && clientData.status === 'invited') {
            // Activate on first login
            await supabase
              .from('portal_clients')
              .update({ status: 'active', last_login_at: new Date().toISOString() })
              .eq('id', clientData.id);
          }

          const orgSlug = clientData?.organization?.slug;
          if (orgSlug) {
            navigate(`/portal/${orgSlug}`, { replace: true });
          } else {
            setError('No portal access found for this account. Please contact your agency.');
          }
        } else {
          setError('Authentication failed. Please try again.');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Something went wrong');
      }
    };

    handleCallback();

    // Safety timeout - redirect to portal login if stuck
    const timeout = setTimeout(() => {
      setError('Login timed out. Please try again.');
    }, 10000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/portal')}
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

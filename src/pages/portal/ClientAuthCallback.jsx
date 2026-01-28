import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

export default function ClientAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the auth code from URL
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        if (code) {
          // Exchange code for session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }

          if (data?.user) {
            // Link auth user to portal client if not already linked
            const { data: client, error: clientError } = await supabase
              .from('portal_clients')
              .select('id, auth_user_id')
              .eq('email', data.user.email.toLowerCase())
              .eq('status', 'active')
              .single();

            if (clientError && clientError.code !== 'PGRST116') {
              console.error('Error fetching client:', clientError);
            }

            if (client && !client.auth_user_id) {
              // Link the auth user to the client
              await supabase
                .from('portal_clients')
                .update({ auth_user_id: data.user.id })
                .eq('id', client.id);
            }

            setStatus('success');

            // Redirect to portal after short delay
            setTimeout(() => {
              navigate('/portal', { replace: true });
            }, 1500);

            return;
          }
        }

        // If we get here without a code, try to get existing session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          setStatus('success');
          setTimeout(() => {
            navigate('/portal', { replace: true });
          }, 1500);
          return;
        }

        // No code or session
        throw new Error('Invalid or expired login link. Please request a new one.');
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setError(err.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Signing you in...</h1>
            <p className="text-zinc-400">Please wait while we verify your login</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Welcome back!</h1>
            <p className="text-zinc-400">Redirecting to your portal...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Authentication failed</h1>
            <p className="text-zinc-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/portal/login')}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

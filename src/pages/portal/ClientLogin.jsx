import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, ArrowRight, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { usePortalClientContext } from '@/components/portal/ClientProvider';

export default function ClientLogin() {
  const navigate = useNavigate();
  const { org: orgSlugFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, signInWithMagicLink, loading: authLoading, client } = usePortalClientContext();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [portalSettings, setPortalSettings] = useState(null);
  const [orgNotFound, setOrgNotFound] = useState(false);

  // Get organization from path params first, fallback to query params for backwards compatibility
  const orgSlug = orgSlugFromPath || searchParams.get('org');

  // Redirect if already authenticated - use org-scoped URL
  useEffect(() => {
    if (isAuthenticated && client?.organization?.slug) {
      navigate(`/portal/${client.organization.slug}`);
    } else if (isAuthenticated && orgSlug) {
      navigate(`/portal/${orgSlug}`);
    }
  }, [isAuthenticated, navigate, orgSlug, client]);

  // Fetch portal settings for branding (if org slug provided)
  useEffect(() => {
    const fetchSettings = async () => {
      if (!orgSlug) {
        // No org provided - show generic portal or error
        return;
      }

      try {
        const { data, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('slug', orgSlug)
          .single();

        if (orgError || !data) {
          setOrgNotFound(true);
          return;
        }

        const { data: settings } = await supabase
          .from('portal_settings')
          .select('*')
          .eq('organization_id', data.id)
          .single();

        setPortalSettings({
          ...settings,
          organization_name: data.name,
          organization_slug: data.slug,
        });
        setOrgNotFound(false);
      } catch (err) {
        console.error('Error fetching portal settings:', err);
        setOrgNotFound(true);
      }
    };

    fetchSettings();
  }, [orgSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Safety timeout: if signInWithMagicLink takes too long, unblock the UI
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ success: false, error: 'Request timed out. Please try again.' }), 15000)
      );

      const result = await Promise.race([
        signInWithMagicLink(email, orgSlug),
        timeoutPromise,
      ]);

      if (result.success) {
        setSent(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-zinc-500 text-sm">Loading portal...</p>
      </div>
    );
  }

  // Organization not found
  if (orgNotFound) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Portal Not Found</h1>
          <p className="text-zinc-400 mb-6">
            We couldn't find a client portal at this address. Please check the URL or contact your agency.
          </p>
          <p className="text-sm text-zinc-600">
            Looking for: <span className="text-zinc-400 font-mono">/portal/{orgSlug}</span>
          </p>
        </div>
      </div>
    );
  }

  // No organization specified - show generic message
  if (!orgSlug) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Client Portal</h1>
          <p className="text-zinc-400 mb-6">
            Please use the portal link provided by your agency to access your projects.
          </p>
          <p className="text-sm text-zinc-600">
            URL format: <span className="text-zinc-400 font-mono">/portal/your-agency</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundColor: portalSettings?.background_color || '#09090b',
        backgroundImage: portalSettings?.login_background_url
          ? `url(${portalSettings.login_background_url})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Subtle gradient mesh background */}
      {!portalSettings?.login_background_url && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-[0.03] blur-3xl"
            style={{ background: portalSettings?.primary_color || '#06b6d4' }}
          />
          <div
            className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-[0.03] blur-3xl"
            style={{ background: portalSettings?.accent_color || '#10b981' }}
          />
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          {portalSettings?.logo_url ? (
            <img
              src={portalSettings.logo_url}
              alt={portalSettings.portal_name || 'Portal'}
              className="h-12 mx-auto mb-4"
            />
          ) : (
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${portalSettings?.primary_color || '#06b6d4'}, ${portalSettings?.accent_color || '#10b981'})`,
              }}
            >
              <span className="text-2xl font-bold text-white">
                {(portalSettings?.portal_name || 'P').charAt(0)}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {portalSettings?.portal_name || 'Client Portal'}
          </h1>
          {portalSettings?.organization_name && (
            <p className="text-zinc-400 mt-1.5">{portalSettings.organization_name}</p>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-zinc-800/60 rounded-3xl p-8 shadow-2xl shadow-black/20">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
              <p className="text-zinc-400 mb-6">
                We sent a login link to <span className="text-white">{email}</span>
              </p>
              <p className="text-sm text-zinc-500">
                Click the link in the email to sign in. The link expires in 1 hour.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="mt-6 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Sign in to your portal</h2>
                <p className="text-zinc-400 text-sm">
                  Enter your email to receive a magic link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: portalSettings?.primary_color
                      ? `linear-gradient(to right, ${portalSettings.primary_color}, ${portalSettings.accent_color || portalSettings.primary_color})`
                      : undefined,
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue with email
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-zinc-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        {portalSettings?.footer_text && (
          <p className="text-center text-sm text-zinc-500 mt-6">
            {portalSettings.footer_text}
          </p>
        )}
      </div>
    </div>
  );
}

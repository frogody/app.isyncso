import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { usePortalClientContext } from '@/components/portal/ClientProvider';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, signInWithMagicLink, loading: authLoading } = usePortalClientContext();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [portalSettings, setPortalSettings] = useState(null);

  // Get organization from URL params if provided
  const orgSlug = searchParams.get('org');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/portal');
    }
  }, [isAuthenticated, navigate]);

  // Fetch portal settings for branding (if org slug provided)
  useEffect(() => {
    const fetchSettings = async () => {
      if (!orgSlug) return;

      try {
        const { data } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('slug', orgSlug)
          .single();

        if (data) {
          const { data: settings } = await supabase
            .from('portal_settings')
            .select('*')
            .eq('organization_id', data.id)
            .single();

          if (settings) {
            setPortalSettings({ ...settings, organization_name: data.name });
          }
        }
      } catch (err) {
        console.error('Error fetching portal settings:', err);
      }
    };

    fetchSettings();
  }, [orgSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const result = await signInWithMagicLink(email, orgSlug);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-zinc-500 text-sm">Loading portal...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: portalSettings?.background_color || '#09090b',
        backgroundImage: portalSettings?.login_background_url
          ? `url(${portalSettings.login_background_url})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          {portalSettings?.logo_url ? (
            <img
              src={portalSettings.logo_url}
              alt={portalSettings.portal_name || 'Portal'}
              className="h-12 mx-auto mb-4"
            />
          ) : (
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
          )}
          <h1 className="text-2xl font-semibold text-white">
            {portalSettings?.portal_name || 'Client Portal'}
          </h1>
          {portalSettings?.organization_name && (
            <p className="text-zinc-400 mt-1">{portalSettings.organization_name}</p>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8">
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
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

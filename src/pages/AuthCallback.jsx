/**
 * Auth Callback Page
 *
 * Handles OAuth callback from Supabase Auth.
 * Processes the auth token and redirects to the appropriate page.
 */

import React, { useEffect, useState } from "react";
import { auth } from "@/api/supabaseClient";
import SyncAvatar from "../components/ui/SyncAvatar";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Handle the OAuth callback
      await auth.handleAuthCallback();

      setStatus('success');

      // Check for stored callback URL or redirect to home
      const callbackUrl = localStorage.getItem('auth_callback_url');
      if (callbackUrl) {
        localStorage.removeItem('auth_callback_url');
        window.location.href = callbackUrl;
      } else {
        // Redirect to dashboard after short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (err) {
      console.error('Auth callback error:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
      `}</style>

      <div className="flex flex-col items-center gap-4">
        <SyncAvatar size={48} />

        {status === 'processing' && (
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>
            Signing you in...
          </p>
        )}

        {status === 'success' && (
          <p className="text-lg font-medium" style={{ color: '#10B981' }}>
            Success! Redirecting...
          </p>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p className="text-lg font-medium" style={{ color: 'var(--accent)' }}>
              Sign in failed
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
              {error || 'An error occurred during sign in'}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{
                background: 'rgba(239,68,68,.12)',
                color: '#FFCCCB',
                border: '1px solid rgba(239,68,68,.3)'
              }}
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

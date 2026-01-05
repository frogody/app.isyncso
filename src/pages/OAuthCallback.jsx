import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Redirect to MCPIntegrations with the OAuth params
    if (code || error) {
      const params = new URLSearchParams();
      if (code) params.set('code', code);
      if (error) params.set('error', error);
      if (state) params.set('state', state);

      navigate(`/MCPIntegrations?${params.toString()}`, { replace: true });
    } else {
      // No code or error, just redirect to integrations
      navigate('/MCPIntegrations', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
        <p className="text-white text-lg">Completing authentication...</p>
        <p className="text-zinc-500 text-sm mt-2">Please wait while we redirect you</p>
      </div>
    </div>
  );
}

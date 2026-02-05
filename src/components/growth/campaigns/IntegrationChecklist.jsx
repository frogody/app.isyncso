import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export default function IntegrationChecklist({ requiredIntegrations = [] }) {
  const { user } = useUser();
  const [connections, setConnections] = useState({});  // { slug: boolean }
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);  // slug currently connecting

  // Fetch user's connected integrations
  useEffect(() => {
    if (!user?.id || requiredIntegrations.length === 0) { setLoading(false); return; }
    async function check() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('user_integrations')
          .select('toolkit_slug, status')
          .eq('user_id', user.id)
          .in('toolkit_slug', requiredIntegrations.map(r => r.slug));

        const connMap = {};
        (data || []).forEach(d => {
          if (d.status === 'connected' || d.status === 'active') {
            connMap[d.toolkit_slug] = true;
          }
        });
        setConnections(connMap);
      } catch (err) {
        console.error('Error checking integrations:', err);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [user?.id, requiredIntegrations]);

  // Start connection flow
  const handleConnect = async (slug) => {
    setConnecting(slug);
    try {
      // Get the user's session token for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Call composio-connect edge function to initiate OAuth
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/composio-connect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action: 'initiateConnection',
            userId: user.id,
            toolkitSlug: slug,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`composio-connect error (${response.status}):`, errorText);
        toast.error(`Connection failed: ${response.status} — check console for details`);
        setConnecting(null);
        return;
      }

      const result = await response.json();
      console.log('composio-connect response:', result);

      if (result.redirectUrl) {
        // Open OAuth popup
        const popup = window.open(result.redirectUrl, 'Connect Integration', 'width=600,height=700');
        // Poll for connection completion
        const pollInterval = setInterval(async () => {
          try {
            const { data } = await supabase
              .from('user_integrations')
              .select('status')
              .eq('user_id', user.id)
              .eq('toolkit_slug', slug)
              .single();
            if (data?.status === 'connected' || data?.status === 'active') {
              clearInterval(pollInterval);
              setConnections(prev => ({ ...prev, [slug]: true }));
              setConnecting(null);
              toast.success(`${slug} connected!`);
              if (popup && !popup.closed) popup.close();
            }
          } catch (e) { /* keep polling */ }
        }, 2000);
        // Timeout after 2 minutes
        setTimeout(() => { clearInterval(pollInterval); setConnecting(null); }, 120000);
      } else {
        const errorMsg = result.error || result.message || 'No redirect URL returned';
        console.error('composio-connect: no redirectUrl. Full response:', result);
        toast.error(`Could not start connection: ${errorMsg}`);
        setConnecting(null);
      }
    } catch (err) {
      console.error('Connection error:', err);
      toast.error(`Failed to connect: ${err.message}`);
      setConnecting(null);
    }
  };

  if (requiredIntegrations.length === 0) return null;

  const allConnected = requiredIntegrations.every(r => connections[r.slug]);

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Link2 className="w-4 h-4 text-cyan-400" />
          Required Integrations
        </h3>
        {allConnected && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> All connected
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking connections...
        </div>
      ) : (
        <div className="space-y-2">
          {requiredIntegrations.map(integration => {
            const isConnected = connections[integration.slug];
            const isConnecting = connecting === integration.slug;

            return (
              <div
                key={integration.slug}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isConnected
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${isConnected ? 'text-green-300' : 'text-red-300'}`}>
                    {integration.label}
                  </span>
                  <span className="text-xs text-zinc-500">for {integration.nodeType} node</span>
                </div>
                {!isConnected && (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(integration.slug)}
                    disabled={isConnecting}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-7 px-3"
                  >
                    {isConnecting ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Connecting...</>
                    ) : (
                      <><ExternalLink className="w-3 h-3 mr-1" /> Connect</>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

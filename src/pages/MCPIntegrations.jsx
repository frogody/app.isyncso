import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plug, CheckCircle, Loader2, Globe, Sparkles, Shield, Unlink,
  Mail, Calendar, FileText, ExternalLink
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import { db } from "@/api/supabaseClient";

// Google OAuth Configuration
const GOOGLE_CONFIG = {
  clientId: "610037054876-hhpom6rqlgcjbkt8v3pgsprt0tmdrspb.apps.googleusercontent.com",
  scopes: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "openid",
    "email",
    "profile"
  ]
};

// Get redirect URI based on current origin
const getRedirectUri = () => {
  if (typeof window === 'undefined') return "https://playground.isyncso.com/oauth/callback";
  return `${window.location.origin}/oauth/callback`;
};

// Storage keys
const STORAGE_KEY = "google_oauth_tokens";
const MCP_INTEGRATIONS_KEY = "mcp_integrations";

// Helper to update MCP integrations for context
const updateMCPIntegrations = (connected, userInfo) => {
  const googleIntegrations = [
    { id: 'gmail', name: 'Gmail', status: connected ? 'active' : 'inactive' },
    { id: 'google-calendar', name: 'Google Calendar', status: connected ? 'active' : 'inactive' },
    { id: 'google-drive', name: 'Google Drive', status: connected ? 'active' : 'inactive' },
    { id: 'google-docs', name: 'Google Docs', status: connected ? 'active' : 'inactive' },
    { id: 'google-sheets', name: 'Google Sheets', status: connected ? 'active' : 'inactive' },
  ];

  if (connected) {
    // Add user info to each integration
    const integrationsWithInfo = googleIntegrations.map(i => ({
      ...i,
      userEmail: userInfo?.email,
      connectedAt: new Date().toISOString()
    }));
    localStorage.setItem(MCP_INTEGRATIONS_KEY, JSON.stringify(integrationsWithInfo));
  } else {
    localStorage.removeItem(MCP_INTEGRATIONS_KEY);
  }

  // Dispatch storage event for MCPContext to pick up
  window.dispatchEvent(new StorageEvent('storage', {
    key: MCP_INTEGRATIONS_KEY,
    newValue: connected ? localStorage.getItem(MCP_INTEGRATIONS_KEY) : null
  }));
};

export default function MCPIntegrations({ embedded = false }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [tokens, setTokens] = useState(null);

  // Check for existing connection on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTokens(data.tokens);
        setUserInfo(data.userInfo);
        setIsConnected(true);
        // Ensure MCP integrations are synced
        updateMCPIntegrations(true, data.userInfo);
      } catch (e) {
        console.error("Failed to parse saved tokens:", e);
      }
    }
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        toast.error(`OAuth error: ${error}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        setIsConnecting(true);
        try {
          // Exchange code for tokens
          const tokenResponse = await exchangeCodeForTokens(code);

          if (tokenResponse.access_token) {
            // Fetch user info
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const userData = await userInfoResponse.json();

            // Save to state and localStorage
            const saveData = {
              tokens: tokenResponse,
              userInfo: userData,
              connectedAt: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
            setTokens(tokenResponse);
            setUserInfo(userData);
            setIsConnected(true);

            // Update MCP integrations for context
            updateMCPIntegrations(true, userData);

            toast.success(`Connected as ${userData.email}!`);
          }
        } catch (err) {
          console.error("Token exchange error:", err);
          toast.error("Failed to complete authentication");
        } finally {
          setIsConnecting(false);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleCallback();
  }, []);

  // Exchange authorization code for tokens
  const exchangeCodeForTokens = async (code) => {
    const response = await db.functions.invoke('googleOAuthCallback', {
      code,
      redirect_uri: getRedirectUri()
    });

    if (!response.data) {
      throw new Error('Token exchange failed');
    }

    return response.data;
  };

  // Initiate Google OAuth
  const handleConnect = () => {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', getRedirectUri());
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_CONFIG.scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    window.location.href = authUrl.toString();
  };

  // Disconnect
  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    updateMCPIntegrations(false, null);
    setTokens(null);
    setUserInfo(null);
    setIsConnected(false);
    toast.success("Disconnected from Google");
  };

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-black p-6 space-y-6"}>
      {!embedded && (
        <PageHeader
          icon={Plug}
          title="MCP Integrations"
          description="Connect Google Workspace to enable AI-powered workflows"
        />
      )}

      {/* Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isConnected ? 'bg-emerald-500/20' : 'bg-zinc-500/20'
            }`}>
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Plug className="w-5 h-5 text-zinc-400" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{isConnected ? 1 : 0}</p>
              <p className="text-xs text-zinc-500">Connected</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">6</p>
              <p className="text-xs text-zinc-500">Google APIs</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">OAuth 2.0</p>
              <p className="text-xs text-zinc-500">Security</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Google Workspace Integration Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl border transition-all ${
          isConnected
            ? "bg-emerald-500/5 border-emerald-500/30"
            : "bg-zinc-900/50 border-zinc-800"
        }`}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">Google Workspace</h2>
                {isConnected ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Connected
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    Not Connected
                  </Badge>
                )}
              </div>
              {isConnected && userInfo && (
                <p className="text-sm text-zinc-400 mt-1">
                  Connected as <span className="text-white">{userInfo.email}</span>
                </p>
              )}
            </div>
          </div>

          {isConnected && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400">Active</span>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <Mail className="w-5 h-5 text-red-400 mb-2" />
            <h4 className="font-medium text-white text-sm">Gmail</h4>
            <p className="text-xs text-zinc-500">Read & send emails</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <Calendar className="w-5 h-5 text-blue-400 mb-2" />
            <h4 className="font-medium text-white text-sm">Calendar</h4>
            <p className="text-xs text-zinc-500">Manage events</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <FileText className="w-5 h-5 text-yellow-400 mb-2" />
            <h4 className="font-medium text-white text-sm">Drive</h4>
            <p className="text-xs text-zinc-500">Access files</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <FileText className="w-5 h-5 text-blue-500 mb-2" />
            <h4 className="font-medium text-white text-sm">Docs</h4>
            <p className="text-xs text-zinc-500">Read documents</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <FileText className="w-5 h-5 text-green-500 mb-2" />
            <h4 className="font-medium text-white text-sm">Sheets</h4>
            <p className="text-xs text-zinc-500">Read spreadsheets</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <Shield className="w-5 h-5 text-purple-400 mb-2" />
            <h4 className="font-medium text-white text-sm">Secure</h4>
            <p className="text-xs text-zinc-500">OAuth 2.0</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <a
            href="https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Documentation
          </a>

          {isConnected ? (
            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 text-white"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Connect Google Workspace
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Connected Info */}
      {isConnected && tokens && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Connection Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Account</p>
              <p className="text-white">{userInfo?.email}</p>
            </div>
            <div>
              <p className="text-zinc-500">Name</p>
              <p className="text-white">{userInfo?.name}</p>
            </div>
            <div>
              <p className="text-zinc-500">Token Type</p>
              <p className="text-white">{tokens.token_type || 'Bearer'}</p>
            </div>
            <div>
              <p className="text-zinc-500">Scopes</p>
              <p className="text-white truncate">{tokens.scope?.split(' ').length || GOOGLE_CONFIG.scopes.length} permissions</p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

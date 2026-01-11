/**
 * Unified Integrations Page
 * Combines Third-Party (Composio), Google Workspace (MCP), and Actions Hub
 */

import React, { useState, useEffect, useCallback, Suspense, lazy, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useComposio } from '@/hooks/useComposio';
import {
  INTEGRATION_CATALOG,
  INTEGRATION_CATEGORIES,
  searchIntegrations,
} from '@/lib/composio';
import { IntegrationCard as ComposioIntegrationCard } from '@/components/integrations/IntegrationCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/GlassCard';
import { PermissionGuard } from '@/components/guards';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Plug,
  Zap,
  Plus,
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Loader2,
  Globe,
  Mail,
  Calendar,
  FileText,
  Shield,
  Unlink,
  Grid3X3,
  List,
  AlertCircle,
  Link as LinkIcon,
  ListTodo,
  Play,
  Settings,
  Sparkles,
  TrendingUp,
  Activity,
  Server,
  Copy,
  Trash2,
  Network,
} from 'lucide-react';

// Lazy load action components
const IntegrationCard = lazy(() => import('@/components/actions/IntegrationCard'));
const ConnectIntegrationModal = lazy(() => import('@/components/actions/ConnectIntegrationModal'));
const ExecuteActionModal = lazy(() => import('@/components/actions/ExecuteActionModal'));
const ActionHistoryList = lazy(() => import('@/components/actions/ActionHistoryList'));
const ActionQueueCard = lazy(() => import('@/components/actions/ActionQueueCard'));
const CreateActionModal = lazy(() => import('@/components/actions/CreateActionModal'));

// Google OAuth Configuration (from MCPIntegrations)
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

const getRedirectUri = () => {
  if (typeof window === 'undefined') return "https://app.isyncso.com/oauth/callback";
  return `${window.location.origin}/oauth/callback`;
};

const GOOGLE_STORAGE_KEY = "google_oauth_tokens";
const MCP_INTEGRATIONS_KEY = "mcp_integrations";

const updateMCPIntegrations = (connected, userInfo) => {
  const googleIntegrations = [
    { id: 'gmail', name: 'Gmail', status: connected ? 'active' : 'inactive' },
    { id: 'google-calendar', name: 'Google Calendar', status: connected ? 'active' : 'inactive' },
    { id: 'google-drive', name: 'Google Drive', status: connected ? 'active' : 'inactive' },
    { id: 'google-docs', name: 'Google Docs', status: connected ? 'active' : 'inactive' },
    { id: 'google-sheets', name: 'Google Sheets', status: connected ? 'active' : 'inactive' },
  ];

  if (connected) {
    const integrationsWithInfo = googleIntegrations.map(i => ({
      ...i,
      userEmail: userInfo?.email,
      connectedAt: new Date().toISOString()
    }));
    localStorage.setItem(MCP_INTEGRATIONS_KEY, JSON.stringify(integrationsWithInfo));
  } else {
    localStorage.removeItem(MCP_INTEGRATIONS_KEY);
  }

  window.dispatchEvent(new StorageEvent('storage', {
    key: MCP_INTEGRATIONS_KEY,
    newValue: connected ? localStorage.getItem(MCP_INTEGRATIONS_KEY) : null
  }));
};

export default function Integrations() {
  const { user, isLoading: userLoading } = useUser();
  const composio = useComposio();

  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Composio state
  const [composioConnections, setComposioConnections] = useState({});
  const [loadingComposio, setLoadingComposio] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [connectionDialog, setConnectionDialog] = useState({
    open: false,
    integration: null,
    status: 'idle',
    message: '',
  });

  // Google/MCP state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);
  const [googleTokens, setGoogleTokens] = useState(null);

  // Actions state
  const [mergeIntegrations, setMergeIntegrations] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [loadingActions, setLoadingActions] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [createActionModalOpen, setCreateActionModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [executingAction, setExecutingAction] = useState(null);

  // MCP Server state
  const [mcpServers, setMcpServers] = useState([]);
  const [loadingMcp, setLoadingMcp] = useState(true);
  const [creatingMcpServer, setCreatingMcpServer] = useState(false);
  const [selectedMcpToolkits, setSelectedMcpToolkits] = useState([]);
  const [newMcpServerName, setNewMcpServerName] = useState('');
  const [createMcpDialogOpen, setCreateMcpDialogOpen] = useState(false);
  const [mcpUrlDialogOpen, setMcpUrlDialogOpen] = useState(false);
  const [selectedMcpServer, setSelectedMcpServer] = useState(null);
  const [mcpServerUrl, setMcpServerUrl] = useState('');

  // Load Composio connections
  const loadComposioConnections = useCallback(async () => {
    if (!user?.id) return;
    setLoadingComposio(true);
    try {
      const data = await composio.getLocalIntegrations(user.id);
      const connectionMap = {};
      for (const conn of data) {
        connectionMap[conn.toolkit_slug] = conn;
      }
      setComposioConnections(connectionMap);
    } catch (err) {
      console.error('Failed to load Composio connections:', err);
    } finally {
      setLoadingComposio(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load Google connection on mount
  useEffect(() => {
    const saved = localStorage.getItem(GOOGLE_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setGoogleTokens(data.tokens);
        setGoogleUserInfo(data.userInfo);
        setGoogleConnected(true);
        updateMCPIntegrations(true, data.userInfo);
      } catch (e) {
        console.error("Failed to parse saved Google tokens:", e);
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
        setGoogleConnecting(true);
        try {
          const tokenResponse = await db.functions.invoke('googleOAuthCallback', {
            code,
            redirect_uri: getRedirectUri()
          });

          if (tokenResponse.data?.access_token) {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
            });
            const userData = await userInfoResponse.json();

            const saveData = {
              tokens: tokenResponse.data,
              userInfo: userData,
              connectedAt: new Date().toISOString()
            };

            localStorage.setItem(GOOGLE_STORAGE_KEY, JSON.stringify(saveData));
            setGoogleTokens(tokenResponse.data);
            setGoogleUserInfo(userData);
            setGoogleConnected(true);
            updateMCPIntegrations(true, userData);

            toast.success(`Connected as ${userData.email}!`);
          }
        } catch (err) {
          console.error("Token exchange error:", err);
          toast.error("Failed to complete Google authentication");
        } finally {
          setGoogleConnecting(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleCallback();
  }, []);

  // Load Merge integrations (Actions)
  const loadMergeIntegrations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await db.entities.MergeIntegration?.list?.({ limit: 50 }).catch(() => []) || [];
      setMergeIntegrations((data || []).filter(i => i.status === 'active'));
    } catch (error) {
      console.warn('Error loading merge integrations:', error.message);
    } finally {
      setLoadingActions(false);
    }
  }, [user]);

  // Load action logs
  const loadActionLogs = useCallback(async () => {
    if (!user) return;
    setLogsLoading(true);
    try {
      const data = await db.entities.ActionLog?.list?.({ limit: 50 }).catch(() => []) || [];
      setActionLogs(data || []);
    } catch (error) {
      console.warn('Error loading action logs:', error.message);
    } finally {
      setLogsLoading(false);
    }
  }, [user]);

  // Load MCP servers
  const loadMcpServers = useCallback(async () => {
    if (!user?.id) return;
    setLoadingMcp(true);
    try {
      const data = await composio.listMcpServers(user.id);
      setMcpServers(data || []);
    } catch (error) {
      console.warn('Error loading MCP servers:', error.message);
    } finally {
      setLoadingMcp(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Create MCP server
  const handleCreateMcpServer = async () => {
    if (!newMcpServerName.trim() || selectedMcpToolkits.length === 0) {
      toast.error('Please provide a server name and select at least one toolkit');
      return;
    }

    setCreatingMcpServer(true);
    try {
      await composio.createMcpServer(user.id, newMcpServerName.trim(), selectedMcpToolkits);
      toast.success('MCP server created successfully!');
      setCreateMcpDialogOpen(false);
      setNewMcpServerName('');
      setSelectedMcpToolkits([]);
      await loadMcpServers();
    } catch (error) {
      toast.error(`Failed to create MCP server: ${error.message}`);
    } finally {
      setCreatingMcpServer(false);
    }
  };

  // Get MCP server URL
  const handleGetMcpUrl = async (server) => {
    setSelectedMcpServer(server);
    setMcpServerUrl('Loading...');
    setMcpUrlDialogOpen(true);

    try {
      const result = await composio.getMcpServerUrl(server.composio_server_id);
      setMcpServerUrl(result.mcpUrl || result.url || 'URL not available');
    } catch (error) {
      setMcpServerUrl(`Error: ${error.message}`);
    }
  };

  // Delete MCP server
  const handleDeleteMcpServer = async (serverId) => {
    if (!confirm('Are you sure you want to delete this MCP server?')) return;

    try {
      await composio.deleteMcpServer(serverId);
      toast.success('MCP server deleted');
      await loadMcpServers();
    } catch (error) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Load all data on mount
  useEffect(() => {
    if (user?.id) {
      loadComposioConnections();
      loadMergeIntegrations();
      loadActionLogs();
      loadMcpServers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Connect Google
  const handleGoogleConnect = () => {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', getRedirectUri());
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_CONFIG.scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    window.location.href = authUrl.toString();
  };

  // Disconnect Google
  const handleGoogleDisconnect = () => {
    localStorage.removeItem(GOOGLE_STORAGE_KEY);
    updateMCPIntegrations(false, null);
    setGoogleTokens(null);
    setGoogleUserInfo(null);
    setGoogleConnected(false);
    toast.success("Disconnected from Google");
  };

  // Composio connect handler
  const handleComposioConnect = useCallback(async (integration) => {
    if (!user?.id) {
      toast.error('Please sign in to connect integrations');
      return;
    }

    setConnectionDialog({
      open: true,
      integration,
      status: 'connecting',
      message: 'Initializing connection...',
    });

    try {
      const authConfigs = await composio.getAuthConfigs(integration.slug);

      if (!authConfigs || authConfigs.length === 0) {
        throw new Error('No authentication method available for this integration');
      }

      const authConfig = authConfigs.find((c) => c.is_composio_managed) || authConfigs[0];

      setConnectionDialog((prev) => ({
        ...prev,
        message: 'Opening authentication window...',
      }));

      const connectionInfo = await composio.connect(user.id, authConfig.id, {
        popup: true,
        callbackUrl: `${window.location.origin}/integrations/callback`,
      });

      setConnectionDialog((prev) => ({
        ...prev,
        status: 'polling',
        message: 'Waiting for authorization...',
      }));

      const result = await composio.waitForConnection(
        connectionInfo.connectedAccountId,
        user.id, // Pass userId so connection is stored in database
        120000
      );

      setComposioConnections((prev) => ({
        ...prev,
        [integration.slug]: {
          toolkit_slug: integration.slug,
          composio_connected_account_id: result.id,
          status: 'ACTIVE',
          connected_at: new Date().toISOString(),
        },
      }));

      setConnectionDialog((prev) => ({
        ...prev,
        status: 'success',
        message: `Successfully connected to ${integration.name}!`,
      }));

      toast.success(`Connected to ${integration.name}`);
      await loadComposioConnections();
    } catch (err) {
      console.error('Connection error:', err);
      setConnectionDialog((prev) => ({
        ...prev,
        status: 'error',
        message: err.message || 'Failed to connect. Please try again.',
      }));
      toast.error(`Failed to connect: ${err.message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Composio disconnect handler
  const handleComposioDisconnect = useCallback(async (connection) => {
    if (!connection?.composio_connected_account_id) return;
    try {
      await composio.disconnect(connection.composio_connected_account_id);
      setComposioConnections((prev) => {
        const updated = { ...prev };
        delete updated[connection.toolkit_slug];
        return updated;
      });
      toast.success('Integration disconnected');
    } catch (err) {
      console.error('Disconnect error:', err);
      toast.error(`Failed to disconnect: ${err.message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Composio refresh handler
  const handleComposioRefresh = useCallback(async (connection) => {
    if (!connection?.composio_connected_account_id) return;
    try {
      await composio.refreshConnection(connection.composio_connected_account_id);
      toast.success('Connection refreshed');
      await loadComposioConnections();
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error(`Failed to refresh: ${err.message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actions handlers
  const handleMergeDisconnect = async (integrationId) => {
    setDisconnecting(integrationId);
    try {
      await db.functions.invoke('mergeDisconnect', { integration_id: integrationId });
      setMergeIntegrations(prev => prev.filter(i => i.id !== integrationId));
      toast.success('Integration disconnected');
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleUseAction = (integration) => {
    setSelectedIntegration(integration);
    setExecuteModalOpen(true);
  };

  const handleExecuteAction = async (action) => {
    setExecutingAction(action.id);
    try {
      await db.entities.ActionLog.update(action.id, {
        status: 'in_progress',
        executed_at: new Date().toISOString()
      });

      setTimeout(async () => {
        await db.entities.ActionLog.update(action.id, { status: 'success' });
        toast.success(`Action "${action.title}" completed!`);
        loadActionLogs();
        setExecutingAction(null);
      }, 1500);
    } catch (error) {
      toast.error('Failed to execute action');
      setExecutingAction(null);
    }
  };

  const handleCancelAction = async (action) => {
    try {
      await db.entities.ActionLog.update(action.id, { status: 'cancelled' });
      toast.success('Action cancelled');
      loadActionLogs();
    } catch (error) {
      toast.error('Failed to cancel action');
    }
  };

  const handleRetryAction = async (action) => {
    try {
      await db.entities.ActionLog.update(action.id, {
        status: 'queued',
        retry_count: (action.retry_count || 0) + 1,
        error_message: null
      });
      toast.success('Action requeued');
      loadActionLogs();
    } catch (error) {
      toast.error('Failed to retry action');
    }
  };

  const handleDeleteAction = async (action) => {
    try {
      await db.entities.ActionLog.delete(action.id);
      toast.success('Action deleted');
      loadActionLogs();
    } catch (error) {
      toast.error('Failed to delete action');
    }
  };

  // Filter Composio integrations
  const filteredIntegrations = useMemo(() => {
    let results = INTEGRATION_CATALOG;
    if (searchQuery) {
      results = searchIntegrations(searchQuery);
    }
    if (activeCategory !== 'all') {
      const category = INTEGRATION_CATEGORIES.find((c) => c.id === activeCategory);
      if (category) {
        results = results.filter((i) => i.category === category.name);
      }
    }
    return results;
  }, [searchQuery, activeCategory]);

  const groupedIntegrations = useMemo(() => {
    const grouped = {};
    for (const integration of filteredIntegrations) {
      if (!grouped[integration.category]) {
        grouped[integration.category] = [];
      }
      grouped[integration.category].push(integration);
    }
    return grouped;
  }, [filteredIntegrations]);

  // Stats calculations
  const composioConnectedCount = Object.values(composioConnections).filter(c => c.status === 'ACTIVE').length;
  const mergeConnectedCount = mergeIntegrations.length;
  const googleConnectedCount = googleConnected ? 1 : 0;
  const totalConnected = composioConnectedCount + mergeConnectedCount + googleConnectedCount;

  const queuedActions = actionLogs.filter(a => a.status === 'queued');
  const inProgressActions = actionLogs.filter(a => a.status === 'in_progress');
  const successfulActions = actionLogs.filter(a => a.status === 'success').length;
  const failedActions = actionLogs.filter(a => a.status === 'failed').length;
  const successRate = actionLogs.length > 0 ? Math.round((successfulActions / actionLogs.length) * 100) : 0;

  const closeDialog = () => {
    setConnectionDialog({ open: false, integration: null, status: 'idle', message: '' });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 w-full bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="integrations.view" showMessage>
      <div className="min-h-screen bg-black relative">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-indigo-900/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 p-6">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-10 bg-purple-600" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl opacity-10 bg-indigo-700" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <Plug className="w-7 h-7 text-purple-400/80" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Integrations</h1>
                    <Badge className="bg-purple-950/40 text-purple-300/80 border-purple-800/30">
                      {totalConnected} Connected
                    </Badge>
                  </div>
                  <p className="text-zinc-500 mt-1">Connect your favorite tools and execute actions seamlessly</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => { loadComposioConnections(); loadMergeIntegrations(); loadActionLogs(); loadMcpServers(); }}
                  className="border border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                    <Plug className="w-5 h-5 text-purple-400/70" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-zinc-100">{composioConnectedCount}</div>
                <div className="text-sm text-zinc-500">Third-Party Apps</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-400/70" />
                  </div>
                  {googleConnected && <Badge className="bg-emerald-950/40 text-emerald-300/80 border-emerald-800/30 text-xs">Active</Badge>}
                </div>
                <div className="text-2xl font-bold text-zinc-100">{googleConnected ? 'Yes' : 'No'}</div>
                <div className="text-sm text-zinc-500">Google Workspace</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-400/70" />
                  </div>
                  {queuedActions.length > 0 && <Badge className="bg-orange-950/40 text-orange-300/80 border-orange-800/30 text-xs">Pending</Badge>}
                </div>
                <div className="text-2xl font-bold text-zinc-100">{queuedActions.length}</div>
                <div className="text-sm text-zinc-500">Queued Actions</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400/70" />
                  </div>
                  <Badge className="bg-emerald-950/40 text-emerald-300/80 border-emerald-800/30 text-xs">{successRate}%</Badge>
                </div>
                <div className="text-2xl font-bold text-zinc-100">{successfulActions}</div>
                <div className="text-sm text-zinc-500">Actions Completed</div>
              </div>
            </motion.div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1.5 gap-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-purple-300/90 text-zinc-500 px-4">
                <Sparkles className="w-4 h-4 mr-2" />Overview
              </TabsTrigger>
              <TabsTrigger value="apps" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-purple-300/90 text-zinc-500 px-4">
                <Plug className="w-4 h-4 mr-2" />Third-Party Apps
                {composioConnectedCount > 0 && <Badge className="ml-2 bg-purple-950/40 text-purple-300/80 border-purple-800/30 text-[10px] px-1.5">{composioConnectedCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="google" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-purple-300/90 text-zinc-500 px-4">
                <Globe className="w-4 h-4 mr-2" />Google Workspace
              </TabsTrigger>
              <TabsTrigger value="actions" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-purple-300/90 text-zinc-500 px-4">
                <Zap className="w-4 h-4 mr-2" />Actions
                {queuedActions.length > 0 && <Badge className="ml-2 bg-orange-950/40 text-orange-300/80 border-orange-800/30 text-[10px] px-1.5">{queuedActions.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-purple-300/90 text-zinc-500 px-4">
                <History className="w-4 h-4 mr-2" />History
              </TabsTrigger>
              <TabsTrigger value="mcp" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-purple-300/90 text-zinc-500 px-4">
                <Server className="w-4 h-4 mr-2" />MCP Servers
                {mcpServers.length > 0 && <Badge className="ml-2 bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-[10px] px-1.5">{mcpServers.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Connected Apps Hero */}
              {totalConnected > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/60 to-purple-950/30 border border-emerald-800/30 p-6"
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/5 rounded-full blur-3xl" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Your Connected Apps</h3>
                        <p className="text-emerald-400/80 text-sm">{totalConnected} integration{totalConnected !== 1 ? 's' : ''} ready to use with SYNC</p>
                      </div>
                    </div>

                    {/* Connected Apps Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {/* Google Workspace */}
                      {googleConnected && (
                        <div className="group relative p-4 rounded-xl bg-zinc-900/60 border border-zinc-700/50 hover:border-emerald-500/40 transition-all cursor-pointer">
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <Globe className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="font-semibold text-white text-sm">Google</h4>
                          <p className="text-[11px] text-zinc-500 truncate">{googleUserInfo?.email?.split('@')[0]}</p>
                          <div className="mt-2 flex gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 text-red-400">Gmail</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400">Cal</span>
                          </div>
                        </div>
                      )}

                      {/* Composio Connected Apps */}
                      {Object.entries(composioConnections).filter(([_, c]) => c.status === 'ACTIVE').map(([slug, conn]) => {
                        const integration = INTEGRATION_CATALOG.find(i => i.slug === slug);
                        if (!integration) return null;
                        return (
                          <div
                            key={slug}
                            className="group relative p-4 rounded-xl bg-zinc-900/60 border border-zinc-700/50 hover:border-emerald-500/40 transition-all cursor-pointer"
                          >
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform"
                              style={{ backgroundColor: integration.color + '25' }}
                            >
                              <span className="text-lg font-bold" style={{ color: integration.color }}>
                                {integration.name.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <h4 className="font-semibold text-white text-sm truncate">{integration.name}</h4>
                            <p className="text-[11px] text-zinc-500 truncate">{integration.category}</p>
                            {integration.popularTools && (
                              <div className="mt-2">
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-700/50 text-zinc-400">
                                  {integration.popularTools.length} actions
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add More Button */}
                      <button
                        onClick={() => setActiveTab('apps')}
                        className="p-4 rounded-xl border-2 border-dashed border-zinc-700/50 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center min-h-[140px]"
                      >
                        <Plus className="w-8 h-8 text-zinc-600 mb-2" />
                        <span className="text-sm text-zinc-500">Add App</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Empty State */}
              {totalConnected === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 rounded-2xl bg-zinc-900/40 border border-zinc-800/60"
                >
                  <div className="w-20 h-20 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto mb-6">
                    <Plug className="w-10 h-10 text-zinc-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Apps Connected Yet</h3>
                  <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                    Connect your favorite tools like Gmail, Slack, HubSpot, and more to unlock powerful automation with SYNC.
                  </p>
                  <Button onClick={() => setActiveTab('apps')} className="bg-purple-600 hover:bg-purple-500">
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Your First App
                  </Button>
                </motion.div>
              )}

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* What You Can Do */}
                <GlassCard hover={false} className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    What You Can Do with SYNC
                  </h3>
                  <div className="space-y-3">
                    {[
                      { icon: Mail, label: 'Send emails via Gmail', color: 'text-red-400', connected: composioConnections['gmail'] || googleConnected },
                      { icon: Calendar, label: 'Schedule calendar events', color: 'text-blue-400', connected: composioConnections['googlecalendar'] || googleConnected },
                      { icon: Activity, label: 'Post to Slack channels', color: 'text-purple-400', connected: !!composioConnections['slack'] },
                      { icon: TrendingUp, label: 'Create HubSpot contacts', color: 'text-orange-400', connected: !!composioConnections['hubspot'] },
                      { icon: FileText, label: 'Add notes to Notion', color: 'text-zinc-400', connected: !!composioConnections['notion'] },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${item.connected ? 'bg-zinc-800/40' : 'bg-zinc-900/30 opacity-50'}`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                        <span className="text-sm text-zinc-300">{item.label}</span>
                        {item.connected ? (
                          <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Ready</Badge>
                        ) : (
                          <Badge className="ml-auto bg-zinc-700/50 text-zinc-500 border-zinc-600/30 text-[10px]">Connect</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-4">
                    💡 Say "Send an email to John" or "Create a Slack message" to SYNC
                  </p>
                </GlassCard>

                {/* Recent Activity */}
                <GlassCard hover={false} className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {actionLogs.slice(0, 5).map((action) => (
                      <div key={action.id} className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {action.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                            {action.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                            {action.status === 'queued' && <Clock className="w-4 h-4 text-orange-400" />}
                            {action.status === 'in_progress' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                            <span className="text-sm text-white">{action.title || 'Action'}</span>
                          </div>
                          <span className="text-xs text-zinc-500">{new Date(action.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {actionLogs.length === 0 && (
                      <div className="text-center py-6">
                        <History className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                        <p className="text-zinc-500 text-sm">No recent activity</p>
                      </div>
                    )}
                    {actionLogs.length > 5 && (
                      <button onClick={() => setActiveTab('history')} className="w-full p-3 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors">
                        View all history
                      </button>
                    )}
                  </div>
                </GlassCard>
              </div>
            </TabsContent>

            {/* Third-Party Apps Tab (Composio) */}
            <TabsContent value="apps" className="mt-6 space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search integrations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-zinc-900/50 border-zinc-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-9 w-9">
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-9 w-9">
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Category Tabs */}
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="flex-wrap h-auto gap-1 bg-zinc-900/50 p-1">
                  <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    All ({INTEGRATION_CATALOG.length})
                  </TabsTrigger>
                  {INTEGRATION_CATEGORIES.map((category) => {
                    const count = INTEGRATION_CATALOG.filter((i) => i.category === category.name).length;
                    return (
                      <TabsTrigger key={category.id} value={category.id} className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        {category.name} ({count})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              {/* Integration Grid */}
              {loadingComposio ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedIntegrations).map(([category, integrations]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-white mb-4">{category}</h3>
                      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
                        {integrations.map((integration) => (
                          <ComposioIntegrationCard
                            key={integration.slug}
                            integration={integration}
                            connection={composioConnections[integration.slug]}
                            onConnect={handleComposioConnect}
                            onDisconnect={handleComposioDisconnect}
                            onRefresh={handleComposioRefresh}
                            isLoading={composio.loading}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredIntegrations.length === 0 && (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                      <p className="text-zinc-400">No integrations found matching your search.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Google Workspace Tab */}
            <TabsContent value="google" className="mt-6 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border transition-all ${googleConnected ? "bg-emerald-500/5 border-emerald-500/30" : "bg-zinc-900/50 border-zinc-800"}`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                      <Globe className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white">Google Workspace</h2>
                        {googleConnected ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Connected</Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Not Connected</Badge>
                        )}
                      </div>
                      {googleConnected && googleUserInfo && (
                        <p className="text-sm text-zinc-400 mt-1">
                          Connected as <span className="text-white">{googleUserInfo.email}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {googleConnected && (
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

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <a href="https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-400 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Documentation
                  </a>
                  {googleConnected ? (
                    <Button onClick={handleGoogleDisconnect} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                      <Unlink className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button onClick={handleGoogleConnect} disabled={googleConnecting} className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 text-white">
                      {googleConnecting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</>
                      ) : (
                        <><Globe className="w-4 h-4 mr-2" />Connect Google Workspace</>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Connection Details */}
              {googleConnected && googleTokens && (
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Connection Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Account</p>
                      <p className="text-white">{googleUserInfo?.email}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Name</p>
                      <p className="text-white">{googleUserInfo?.name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Token Type</p>
                      <p className="text-white">{googleTokens.token_type || 'Bearer'}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Scopes</p>
                      <p className="text-white truncate">{googleTokens.scope?.split(' ').length || GOOGLE_CONFIG.scopes.length} permissions</p>
                    </div>
                  </div>
                </GlassCard>
              )}
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="mt-6">
              <Suspense fallback={<Skeleton className="h-96 bg-zinc-800 rounded-xl" />}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-400" />
                    Action Queue
                  </h3>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={loadActionLogs} className="border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button size="sm" onClick={() => setCreateActionModalOpen(true)} className="bg-orange-600/80 hover:bg-orange-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      New Action
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Queued & In Progress */}
                  <div className="lg:col-span-2 space-y-4">
                    {logsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-xl" />)}
                      </div>
                    ) : [...inProgressActions, ...queuedActions].length === 0 ? (
                      <GlassCard hover={false} className="p-12">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                            <ListTodo className="w-8 h-8 text-zinc-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-white mb-2">No Pending Actions</h4>
                          <p className="text-zinc-500 text-sm mb-6">Create an action to get started</p>
                          <Button onClick={() => setCreateActionModalOpen(true)} className="bg-orange-600/80 hover:bg-orange-600 text-white">
                            <Plus className="w-4 h-4 mr-2" />Create Action
                          </Button>
                        </div>
                      </GlassCard>
                    ) : (
                      <div className="space-y-3">
                        {[...inProgressActions, ...queuedActions].map((action, i) => (
                          <ActionQueueCard
                            key={action.id}
                            action={action}
                            index={i}
                            onExecute={handleExecuteAction}
                            onCancel={handleCancelAction}
                            onRetry={handleRetryAction}
                            onDelete={handleDeleteAction}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Completed */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400/70" />
                      Recently Completed
                    </h3>
                    <GlassCard hover={false} className="p-4 space-y-2">
                      {actionLogs.filter(a => a.status === 'success' || a.status === 'failed').slice(0, 5).length === 0 ? (
                        <p className="text-sm text-zinc-500 text-center py-4">No completed actions yet</p>
                      ) : (
                        actionLogs.filter(a => a.status === 'success' || a.status === 'failed').slice(0, 5).map((action, i) => (
                          <ActionQueueCard key={action.id} action={action} index={i} compact />
                        ))
                      )}
                    </GlassCard>
                  </div>
                </div>
              </Suspense>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              <Suspense fallback={<Skeleton className="h-96 bg-zinc-800 rounded-xl" />}>
                <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                        <History className="w-5 h-5 text-purple-400/70" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-200">Action History</h3>
                        <p className="text-sm text-zinc-500">{actionLogs.length} actions executed</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={loadActionLogs} className="border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                      <RefreshCw className="w-4 h-4 mr-2" />Refresh
                    </Button>
                  </div>
                  <ActionHistoryList actions={actionLogs} loading={logsLoading} />
                </div>
              </Suspense>
            </TabsContent>

            {/* MCP Servers Tab */}
            <TabsContent value="mcp" className="mt-6 space-y-6">
              {/* MCP Hero Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/40 via-zinc-900/60 to-blue-950/30 border border-cyan-800/30 p-6"
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <Network className="w-7 h-7 text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">MCP Servers</h2>
                        <p className="text-cyan-400/80 text-sm">
                          Create managed MCP endpoints to connect SYNC with external AI tools
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setCreateMcpDialogOpen(true)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white"
                      disabled={composioConnectedCount === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Server
                    </Button>
                  </div>

                  {/* Info Alert */}
                  <Alert className="bg-cyan-950/30 border-cyan-700/40 mb-4">
                    <AlertCircle className="w-4 h-4 text-cyan-400" />
                    <AlertDescription className="text-zinc-300">
                      MCP (Model Context Protocol) allows AI assistants like Claude, Cursor, or other tools to connect to your integrated services via a single URL.
                      <a href="https://www.anthropic.com/news/model-context-protocol" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline ml-1">
                        Learn more <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </AlertDescription>
                  </Alert>

                  {composioConnectedCount === 0 && (
                    <Alert className="bg-amber-950/30 border-amber-700/40">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <AlertDescription className="text-zinc-300">
                        Connect at least one third-party app to create an MCP server.
                        <Button
                          variant="link"
                          onClick={() => setActiveTab('apps')}
                          className="text-amber-400 hover:text-amber-300 p-0 h-auto ml-1"
                        >
                          Go to Third-Party Apps →
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </motion.div>

              {/* MCP Servers List */}
              {loadingMcp ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
              ) : mcpServers.length === 0 ? (
                <GlassCard hover={false} className="p-12">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                      <Server className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">No MCP Servers Yet</h4>
                    <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
                      Create an MCP server to expose your connected integrations to AI tools like Claude Desktop or Cursor.
                    </p>
                    <Button
                      onClick={() => setCreateMcpDialogOpen(true)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white"
                      disabled={composioConnectedCount === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />Create Your First Server
                    </Button>
                  </div>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mcpServers.map((server) => (
                    <motion.div
                      key={server.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <Server className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{server.name}</h4>
                            <p className="text-xs text-zinc-500">
                              {server.toolkits?.length || 0} toolkit{(server.toolkits?.length || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <Badge className={`text-xs ${server.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}>
                          {server.status || 'ACTIVE'}
                        </Badge>
                      </div>

                      {/* Toolkits */}
                      {server.toolkits && server.toolkits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {server.toolkits.slice(0, 4).map((toolkit) => (
                            <span key={toolkit} className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-700/50 text-zinc-400">
                              {toolkit}
                            </span>
                          ))}
                          {server.toolkits.length > 4 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-700/50 text-zinc-400">
                              +{server.toolkits.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleGetMcpUrl(server)}
                          className="flex-1 bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Get URL
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteMcpServer(server.composio_server_id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Created Date */}
                      <p className="text-[10px] text-zinc-600 mt-3">
                        Created {new Date(server.created_at).toLocaleDateString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Connection Dialog */}
        <Dialog open={connectionDialog.open} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {connectionDialog.integration && (
                  <>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: connectionDialog.integration.color + '20' }}>
                      <span className="text-sm font-bold" style={{ color: connectionDialog.integration.color }}>
                        {connectionDialog.integration.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    Connect {connectionDialog.integration.name}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>{connectionDialog.message}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-6">
              {connectionDialog.status === 'connecting' && <Loader2 className="w-12 h-12 animate-spin text-purple-500" />}
              {connectionDialog.status === 'polling' && (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
                  <p className="text-sm text-zinc-400 mt-4">Complete the authorization in the popup window...</p>
                </div>
              )}
              {connectionDialog.status === 'success' && (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="text-sm text-zinc-400 mt-4">{connectionDialog.message}</p>
                </div>
              )}
              {connectionDialog.status === 'error' && (
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{connectionDialog.message}</AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            {(connectionDialog.status === 'success' || connectionDialog.status === 'error') && (
              <div className="flex justify-end">
                <Button onClick={closeDialog}>Close</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <Suspense fallback={null}>
          <ConnectIntegrationModal
            open={connectModalOpen}
            onClose={() => setConnectModalOpen(false)}
            onSuccess={() => loadMergeIntegrations()}
            existingIntegrations={mergeIntegrations}
          />
          <ExecuteActionModal
            open={executeModalOpen}
            onClose={() => { setExecuteModalOpen(false); setSelectedIntegration(null); }}
            integration={selectedIntegration}
            onActionComplete={loadActionLogs}
          />
          <CreateActionModal
            open={createActionModalOpen}
            onClose={() => setCreateActionModalOpen(false)}
            onSuccess={() => loadActionLogs()}
            userId={user?.id}
          />
        </Suspense>

        {/* Create MCP Server Dialog */}
        <Dialog open={createMcpDialogOpen} onOpenChange={setCreateMcpDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                Create MCP Server
              </DialogTitle>
              <DialogDescription>
                Create a managed MCP server to expose your connected integrations to AI tools.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Server Name */}
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-2 block">Server Name</label>
                <Input
                  placeholder="My MCP Server"
                  value={newMcpServerName}
                  onChange={(e) => setNewMcpServerName(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-700"
                />
              </div>

              {/* Toolkit Selection */}
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-2 block">
                  Select Toolkits ({selectedMcpToolkits.length} selected)
                </label>
                <div className="max-h-64 overflow-y-auto space-y-2 p-3 rounded-lg bg-zinc-900/50 border border-zinc-700">
                  {Object.entries(composioConnections)
                    .filter(([_, conn]) => conn.status === 'ACTIVE')
                    .map(([slug, conn]) => {
                      const integration = INTEGRATION_CATALOG.find(i => i.slug === slug);
                      const isSelected = selectedMcpToolkits.includes(slug);
                      return (
                        <label
                          key={slug}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border border-cyan-500/40'
                              : 'bg-zinc-800/50 border border-transparent hover:bg-zinc-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedMcpToolkits(prev =>
                                isSelected
                                  ? prev.filter(t => t !== slug)
                                  : [...prev, slug]
                              );
                            }}
                            className="rounded border-zinc-600"
                          />
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: (integration?.color || '#666') + '25' }}
                          >
                            <span className="text-xs font-bold" style={{ color: integration?.color || '#999' }}>
                              {(integration?.name || slug).substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-zinc-300">{integration?.name || slug}</span>
                        </label>
                      );
                    })}

                  {Object.keys(composioConnections).length === 0 && (
                    <p className="text-sm text-zinc-500 text-center py-4">
                      No connected integrations. Connect apps first.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateMcpDialogOpen(false);
                  setNewMcpServerName('');
                  setSelectedMcpToolkits([]);
                }}
                className="border-zinc-700 text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMcpServer}
                disabled={creatingMcpServer || !newMcpServerName.trim() || selectedMcpToolkits.length === 0}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {creatingMcpServer ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Server
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MCP URL Dialog */}
        <Dialog open={mcpUrlDialogOpen} onOpenChange={setMcpUrlDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-400" />
                MCP Server URL
              </DialogTitle>
              <DialogDescription>
                {selectedMcpServer?.name ? `Connection details for "${selectedMcpServer.name}"` : 'MCP server connection details'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* URL Display */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-700">
                <label className="text-xs font-medium text-zinc-500 mb-2 block">MCP Endpoint URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-cyan-400 bg-zinc-800/50 p-3 rounded-lg overflow-x-auto whitespace-nowrap">
                    {mcpServerUrl}
                  </code>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(mcpServerUrl)}
                    disabled={mcpServerUrl.startsWith('Loading') || mcpServerUrl.startsWith('Error')}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Usage Instructions */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <h4 className="text-sm font-medium text-zinc-300 mb-3">How to Use</h4>
                <div className="space-y-3 text-sm text-zinc-400">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">1.</span>
                    <span>Copy the URL above</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">2.</span>
                    <span>Add it to your AI tool's MCP configuration</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">3.</span>
                    <span>The AI will have access to your connected integrations</span>
                  </div>
                </div>
              </div>

              {/* Example Config */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <label className="text-xs font-medium text-zinc-500 mb-2 block">Example: Claude Desktop Config</label>
                <pre className="text-xs text-zinc-400 bg-zinc-800/50 p-3 rounded-lg overflow-x-auto">
{`{
  "mcpServers": {
    "${selectedMcpServer?.name || 'my-server'}": {
      "type": "http",
      "url": "${mcpServerUrl}"
    }
  }
}`}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(`{
  "mcpServers": {
    "${selectedMcpServer?.name || 'my-server'}": {
      "type": "http",
      "url": "${mcpServerUrl}"
    }
  }
}`)}
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Config
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setMcpUrlDialogOpen(false)} className="border-zinc-700 text-zinc-400" variant="outline">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}

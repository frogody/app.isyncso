/**
 * ConnectionManager Component
 * Grid-based UI for managing all Composio integrations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/components/context/UserContext';
import { useComposio } from '@/hooks/useComposio';
import {
  INTEGRATION_CATALOG,
  INTEGRATION_CATEGORIES,
  getGroupedIntegrations,
  searchIntegrations,
} from '@/lib/composio';
import { IntegrationCard } from './IntegrationCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Search,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  Grid3X3,
  List,
} from 'lucide-react';

export function ConnectionManager() {
  const { user } = useUser();
  const composio = useComposio();

  // State
  const [connections, setConnections] = useState({});
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [connectingSlug, setConnectingSlug] = useState(null);
  const [connectionDialog, setConnectionDialog] = useState({
    open: false,
    integration: null,
    status: 'idle', // 'idle' | 'connecting' | 'polling' | 'success' | 'error'
    message: '',
  });

  // Load user's existing connections on mount
  useEffect(() => {
    if (user?.id) {
      loadConnections();
    }
  }, [user?.id]);

  // Load connections from database
  const loadConnections = async () => {
    if (!user?.id) return;

    setLoadingConnections(true);
    try {
      const data = await composio.getLocalIntegrations(user.id);
      const connectionMap = {};
      for (const conn of data) {
        connectionMap[conn.toolkit_slug] = conn;
      }
      setConnections(connectionMap);
    } catch (err) {
      console.error('Failed to load connections:', err);
      toast.error('Failed to load integrations');
    } finally {
      setLoadingConnections(false);
    }
  };

  // Filter integrations based on search and category
  const filteredIntegrations = useMemo(() => {
    let results = INTEGRATION_CATALOG;

    // Filter by search query
    if (searchQuery) {
      results = searchIntegrations(searchQuery);
    }

    // Filter by category
    if (activeCategory !== 'all') {
      const category = INTEGRATION_CATEGORIES.find((c) => c.id === activeCategory);
      if (category) {
        results = results.filter((i) => i.category === category.name);
      }
    }

    return results;
  }, [searchQuery, activeCategory]);

  // Group filtered integrations by category
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

  // Handle connect button click
  const handleConnect = useCallback(
    async (integration) => {
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
        // Get auth configs for this toolkit
        const authConfigs = await composio.getAuthConfigs(integration.slug);

        if (!authConfigs || authConfigs.length === 0) {
          throw new Error('No authentication method available for this integration');
        }

        // Use the first Composio-managed auth config
        const authConfig = authConfigs.find((c) => c.is_composio_managed) || authConfigs[0];

        setConnectionDialog((prev) => ({
          ...prev,
          message: 'Opening authentication window...',
        }));

        // Initiate connection (opens popup)
        const connectionInfo = await composio.connect(user.id, authConfig.id, {
          popup: true,
          callbackUrl: `${window.location.origin}/settings/integrations/callback`,
          toolkitSlug: integration.slug,
        });

        setConnectionDialog((prev) => ({
          ...prev,
          status: 'polling',
          message: 'Waiting for authorization...',
        }));

        // Poll for connection status
        const result = await composio.waitForConnection(
          connectionInfo.connectedAccountId,
          120000 // 2 minute timeout
        );

        // Connection successful - update local state
        setConnections((prev) => ({
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

        // Reload connections to get fresh data
        await loadConnections();
      } catch (err) {
        console.error('Connection error:', err);
        setConnectionDialog((prev) => ({
          ...prev,
          status: 'error',
          message: err.message || 'Failed to connect. Please try again.',
        }));
        toast.error(`Failed to connect: ${err.message}`);
      }
    },
    [user?.id, composio]
  );

  // Handle disconnect
  const handleDisconnect = useCallback(
    async (connection) => {
      if (!connection?.composio_connected_account_id) return;

      try {
        await composio.disconnect(connection.composio_connected_account_id);

        // Update local state
        setConnections((prev) => {
          const updated = { ...prev };
          delete updated[connection.toolkit_slug];
          return updated;
        });

        toast.success('Integration disconnected');
      } catch (err) {
        console.error('Disconnect error:', err);
        toast.error(`Failed to disconnect: ${err.message}`);
      }
    },
    [composio]
  );

  // Handle refresh
  const handleRefresh = useCallback(
    async (connection) => {
      if (!connection?.composio_connected_account_id) return;

      try {
        await composio.refreshConnection(connection.composio_connected_account_id);
        toast.success('Connection refreshed');
        await loadConnections();
      } catch (err) {
        console.error('Refresh error:', err);
        toast.error(`Failed to refresh: ${err.message}`);
      }
    },
    [composio]
  );

  // Close dialog
  const closeDialog = () => {
    setConnectionDialog({
      open: false,
      integration: null,
      status: 'idle',
      message: '',
    });
  };

  // Connection stats
  const stats = useMemo(() => {
    const connectedCount = Object.values(connections).filter(
      (c) => c.status === 'ACTIVE'
    ).length;
    return {
      total: INTEGRATION_CATALOG.length,
      connected: connectedCount,
    };
  }, [connections]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Integrations</h2>
          <p className="text-slate-400 mt-1">
            Connect your favorite tools to SYNC.{' '}
            <span className="text-purple-400">
              {stats.connected} of {stats.total} connected
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConnections}
            disabled={loadingConnections}
            className="border-slate-700"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loadingConnections ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="h-9 w-9"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            className="h-9 w-9"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto gap-1 bg-slate-900/50 p-1">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            All ({INTEGRATION_CATALOG.length})
          </TabsTrigger>
          {INTEGRATION_CATEGORIES.map((category) => {
            const count = INTEGRATION_CATALOG.filter(
              (i) => i.category === category.name
            ).length;
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                {category.name} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Loading state */}
      {loadingConnections && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* Integration Grid */}
      {!loadingConnections && (
        <div className="space-y-8">
          {Object.entries(groupedIntegrations).map(([category, integrations]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-white mb-4">{category}</h3>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-2'
                }
              >
                {integrations.map((integration) => (
                  <IntegrationCard
                    key={integration.slug}
                    integration={integration}
                    connection={connections[integration.slug]}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onRefresh={handleRefresh}
                    isConnecting={connectingSlug === integration.slug}
                    isLoading={composio.loading}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No integrations found matching your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Connection Dialog */}
      <Dialog open={connectionDialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {connectionDialog.integration && (
                <>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: connectionDialog.integration.color + '20',
                    }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: connectionDialog.integration.color }}
                    >
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
            {connectionDialog.status === 'connecting' && (
              <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
            )}
            {connectionDialog.status === 'polling' && (
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-slate-400 mt-4">
                  Complete the authorization in the popup window...
                </p>
              </div>
            )}
            {connectionDialog.status === 'success' && (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-sm text-slate-400 mt-4">{connectionDialog.message}</p>
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
    </div>
  );
}

export default ConnectionManager;

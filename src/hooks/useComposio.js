/**
 * useComposio Hook
 * React hook for managing Composio integrations
 *
 * Provides:
 * - OAuth connection flow with popup
 * - Connection management (list, status, disconnect)
 * - Tool execution with automatic retry
 * - Trigger subscription management
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Default polling configuration
const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds
const DEFAULT_POLL_TIMEOUT = 120000; // 2 minutes

/**
 * Call the composio-connect edge function
 */
async function callComposioFunction(action, params = {}) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/composio-connect`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action, ...params }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Failed to execute ${action}`);
  }

  return data.data;
}

/**
 * Open OAuth popup window
 */
function openOAuthPopup(url, name = 'OAuth') {
  const width = 600;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  return window.open(
    url,
    name,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
  );
}

/**
 * useComposio Hook
 */
export function useComposio() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Get available auth configs for a toolkit
   */
  const getAuthConfigs = useCallback(async (toolkitSlug) => {
    setLoading(true);
    setError(null);

    try {
      const data = await callComposioFunction('listAuthConfigs', { toolkitSlug });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initiate OAuth connection
   * Returns the connection info and optionally opens popup
   */
  const connect = useCallback(async (userId, authConfigId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { popup = true, callbackUrl } = options;

      // Get OAuth URL from edge function
      const data = await callComposioFunction('initiateConnection', {
        userId,
        authConfigId,
        callbackUrl,
        toolkitSlug: options.toolkitSlug,
      });

      // Open popup if requested
      if (popup && data.redirectUrl) {
        const popupWindow = openOAuthPopup(data.redirectUrl, 'Connect Integration');

        // Return connection info with popup reference
        return {
          ...data,
          popupWindow,
        };
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Poll for connection status until active or timeout
   * @param {string} connectedAccountId - The Composio connected account ID
   * @param {string} userId - The user ID (required for storing connection in database)
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  const waitForConnection = useCallback(async (connectedAccountId, userId, timeoutMs = DEFAULT_POLL_TIMEOUT) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await callComposioFunction('getConnectionStatus', {
          connectedAccountId,
          userId, // Pass userId so edge function can store connection when ACTIVE
        });

        if (status.status === 'ACTIVE') {
          return status;
        }

        if (['FAILED', 'EXPIRED'].includes(status.status)) {
          throw new Error(`Connection ${status.status.toLowerCase()}`);
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL));
      } catch (err) {
        // If error is not a status error, throw it
        if (!err.message.includes('INITIATED') && !err.message.includes('PENDING')) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL));
      }
    }

    throw new Error('Connection timeout - please try again');
  }, []);

  /**
   * Get connection status
   */
  const getConnectionStatus = useCallback(async (connectedAccountId) => {
    setLoading(true);
    setError(null);

    try {
      return await callComposioFunction('getConnectionStatus', { connectedAccountId });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List all user's connections
   */
  const listConnections = useCallback(async (userId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const data = await callComposioFunction('listConnections', {
        userId,
        ...options,
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get user's integrations from local database
   */
  const getLocalIntegrations = useCallback(async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .order('connected_at', { ascending: false });

      if (dbError) throw dbError;
      return data || [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Disconnect an account
   */
  const disconnect = useCallback(async (connectedAccountId) => {
    setLoading(true);
    setError(null);

    try {
      await callComposioFunction('disconnectAccount', { connectedAccountId });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh a connection's token
   */
  const refreshConnection = useCallback(async (connectedAccountId) => {
    setLoading(true);
    setError(null);

    try {
      return await callComposioFunction('refreshConnection', { connectedAccountId });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Execute a Composio tool
   */
  const executeTool = useCallback(async (toolSlug, params) => {
    setLoading(true);
    setError(null);

    try {
      const result = await callComposioFunction('executeTool', {
        toolSlug,
        connectedAccountId: params.connectedAccountId,
        arguments: params.arguments,
      });

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List available tools for a toolkit
   */
  const listTools = useCallback(async (toolkitSlug) => {
    setLoading(true);
    setError(null);

    try {
      const data = await callComposioFunction('listTools', { toolkitSlug });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List available triggers for a toolkit
   */
  const listTriggers = useCallback(async (toolkitSlug) => {
    setLoading(true);
    setError(null);

    try {
      const data = await callComposioFunction('listTriggers', { toolkitSlug });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Subscribe to a trigger
   */
  const subscribeTrigger = useCallback(async (triggerSlug, connectedAccountId, webhookUrl, config = {}, userId) => {
    setLoading(true);
    setError(null);

    try {
      return await callComposioFunction('subscribeTrigger', {
        triggerSlug,
        connectedAccountId,
        webhookUrl,
        triggerConfig: config,
        userId,
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Unsubscribe from a trigger
   */
  const unsubscribeTrigger = useCallback(async (subscriptionId) => {
    setLoading(true);
    setError(null);

    try {
      await callComposioFunction('unsubscribeTrigger', {
        connectedAccountId: subscriptionId, // Using this field for subscription ID
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== MCP SERVER OPERATIONS =====

  /**
   * Create a new MCP server
   */
  const createMcpServer = useCallback(async (userId, name, toolkits, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await callComposioFunction('createMcpServer', {
        userId,
        mcpServerName: name,
        toolkits,
        ...options,
      });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get MCP server URL for connecting
   */
  const getMcpServerUrl = useCallback(async (mcpServerId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await callComposioFunction('getMcpServerUrl', {
        mcpServerId,
        ...options,
      });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List all MCP servers for the user
   */
  const listMcpServers = useCallback(async (userId) => {
    setLoading(true);
    setError(null);

    try {
      // Get from local database
      const { data, error: dbError } = await supabase
        .from('user_mcp_servers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      return data || [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete an MCP server
   */
  const deleteMcpServer = useCallback(async (mcpServerId) => {
    setLoading(true);
    setError(null);

    try {
      await callComposioFunction('deleteMcpServer', { mcpServerId });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update an MCP server
   */
  const updateMcpServer = useCallback(async (mcpServerId, updates) => {
    setLoading(true);
    setError(null);

    try {
      return await callComposioFunction('updateMcpServer', {
        mcpServerId,
        ...updates,
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if user has an active connection for a toolkit
   */
  const hasConnection = useCallback(async (userId, toolkitSlug) => {
    try {
      const { data } = await supabase
        .from('user_integrations')
        .select('id, status')
        .eq('user_id', userId)
        .eq('toolkit_slug', toolkitSlug)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      return !!data;
    } catch {
      return false;
    }
  }, []);

  /**
   * Get connection for a specific toolkit
   */
  const getConnection = useCallback(async (userId, toolkitSlug) => {
    try {
      const { data } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('toolkit_slug', toolkitSlug)
        .maybeSingle();

      return data;
    } catch {
      return null;
    }
  }, []);

  return {
    loading,
    error,

    // Auth config operations
    getAuthConfigs,

    // Connection operations
    connect,
    waitForConnection,
    getConnectionStatus,
    listConnections,
    getLocalIntegrations,
    disconnect,
    refreshConnection,
    hasConnection,
    getConnection,

    // Tool operations
    executeTool,
    listTools,

    // Trigger operations
    listTriggers,
    subscribeTrigger,
    unsubscribeTrigger,

    // MCP Server operations
    createMcpServer,
    getMcpServerUrl,
    listMcpServers,
    deleteMcpServer,
    updateMcpServer,
  };
}

export default useComposio;

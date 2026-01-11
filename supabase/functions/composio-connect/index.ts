/**
 * Composio Connect Edge Function
 * Unified endpoint for all Composio integration operations
 *
 * Actions:
 * - listAuthConfigs: Get available auth configs for a toolkit
 * - initiateConnection: Start OAuth flow, return redirect URL
 * - getConnectionStatus: Check if connection is active
 * - listConnections: Get all user's connected accounts
 * - disconnectAccount: Remove a connection
 * - refreshConnection: Force token refresh
 * - executeTool: Execute any Composio tool
 * - listTools: List available tools for a toolkit
 * - listTriggers: List available triggers for a toolkit
 * - subscribeTrigger: Subscribe to a trigger
 * - unsubscribeTrigger: Unsubscribe from a trigger
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================
// Configuration
// ============================================

// Use hybrid API approach:
// - v1 for listing integrations (auth configs), actions, triggers
// - v3 for creating/managing connected accounts
const COMPOSIO_V1_URL = "https://backend.composio.dev/api/v1";
const COMPOSIO_V3_URL = "https://backend.composio.dev/api/v3";
const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Types
// ============================================

type ComposioAction =
  | "listAuthConfigs"
  | "initiateConnection"
  | "getConnectionStatus"
  | "listConnections"
  | "disconnectAccount"
  | "refreshConnection"
  | "executeTool"
  | "listTools"
  | "listTriggers"
  | "subscribeTrigger"
  | "unsubscribeTrigger"
  // MCP Server Management Actions
  | "createMcpServer"
  | "getMcpServerUrl"
  | "listMcpServers"
  | "deleteMcpServer"
  | "updateMcpServer";

interface ComposioRequest {
  action: ComposioAction;
  userId?: string;
  toolkitSlug?: string;
  authConfigId?: string;
  connectedAccountId?: string;
  toolSlug?: string;
  arguments?: Record<string, unknown>;
  callbackUrl?: string;
  triggerSlug?: string;
  webhookUrl?: string;
  triggerConfig?: Record<string, unknown>;
  status?: string;
  // MCP Server fields
  mcpServerName?: string;
  mcpServerId?: string;
  toolkits?: string[];
  authConfigIds?: string[];
  customTools?: string[];
  connectedAccountIds?: string[];
  managedAuth?: boolean;
}

// ============================================
// Composio API Helper
// ============================================

async function composioFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  useV3 = false
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!COMPOSIO_API_KEY) {
    return { success: false, error: "COMPOSIO_API_KEY not configured" };
  }

  const baseUrl = useV3 ? COMPOSIO_V3_URL : COMPOSIO_V1_URL;
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "x-api-key": COMPOSIO_API_KEY,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const text = await response.text();
    let data: T | undefined;

    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      // Response is not JSON
    }

    if (!response.ok) {
      const errorMsg =
        (data as Record<string, unknown>)?.message ||
        (data as Record<string, unknown>)?.error ||
        `HTTP ${response.status}: ${response.statusText}`;
      console.error(`Composio API error: ${endpoint}`, errorMsg);
      return { success: false, error: String(errorMsg) };
    }

    return { success: true, data };
  } catch (error) {
    console.error(`Composio fetch error: ${endpoint}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ============================================
// Action Handlers
// ============================================

/**
 * List available auth configs for a toolkit
 * Uses v3 API for auth_configs (returns nano IDs needed for v3 connection creation)
 */
async function listAuthConfigs(toolkitSlug: string) {
  // v3 API uses /auth_configs - filter by toolkit.slug
  const result = await composioFetch<{
    items?: Array<{
      id: string;
      toolkit?: { slug?: string };
      is_composio_managed?: boolean;
      [key: string]: unknown;
    }>
  }>(
    `/auth_configs`,
    {},
    true // useV3 = true
  );

  if (!result.success) {
    return result;
  }

  // Filter by toolkit slug (v3 API doesn't support app_name filter)
  const allItems = result.data?.items || [];
  const filteredItems = allItems.filter(
    (item) => item.toolkit?.slug?.toLowerCase() === toolkitSlug.toLowerCase()
  );

  return { success: true, data: filteredItems };
}

/**
 * Initiate OAuth connection flow
 * Uses v3 API for creating connections (v1 returns "Please migrate to v3")
 * Note: v3 uses snake_case endpoints (connected_accounts not connectedAccounts)
 */
async function initiateConnection(
  userId: string,
  authConfigId: string,
  callbackUrl?: string
) {
  // v3 API: Create connection via /connected_accounts with nested format
  const linkResult = await composioFetch<{
    id?: string;
    redirect_url?: string;
    redirect_uri?: string;
    status?: string;
    connectionData?: {
      authScheme?: string;
    };
  }>("/connected_accounts", {
    method: "POST",
    body: JSON.stringify({
      auth_config: { id: authConfigId },
      connection: {
        user_id: userId,
        redirect_url: callbackUrl || `${SUPABASE_URL}/functions/v1/composio-connect/callback`,
      },
    }),
  }, true); // useV3 = true

  if (!linkResult.success || !linkResult.data) {
    return linkResult;
  }

  return {
    success: true,
    data: {
      redirectUrl: linkResult.data.redirect_url || linkResult.data.redirect_uri,
      connectedAccountId: linkResult.data.id,
      connectionStatus: linkResult.data.status,
    },
  };
}

/**
 * Get connection status
 * Uses v3 API for connected accounts (snake_case endpoint)
 */
async function getConnectionStatus(connectedAccountId: string) {
  const result = await composioFetch<{
    id: string;
    status: string;
    toolkit?: { slug?: string };
    user_id?: string;
    created_at?: string;
    updated_at?: string;
  }>(`/connected_accounts/${connectedAccountId}`, {}, true); // useV3 = true

  if (!result.success || !result.data) {
    return result;
  }

  return {
    success: true,
    data: {
      id: result.data.id,
      status: result.data.status,
      toolkitSlug: result.data.toolkit?.slug,
      userId: result.data.user_id,
      createdAt: result.data.created_at,
      updatedAt: result.data.updated_at,
    },
  };
}

/**
 * List all user's connections
 * Uses v3 API for connected accounts (snake_case endpoint)
 */
async function listConnections(
  userId: string,
  options?: { toolkitSlug?: string; status?: string }
) {
  // v3 API uses snake_case endpoint and user_id parameter
  let endpoint = `/connected_accounts?user_id=${userId}`;

  if (options?.toolkitSlug) {
    endpoint += `&app_name=${options.toolkitSlug}`;
  }
  if (options?.status) {
    endpoint += `&status=${options.status}`;
  }

  const result = await composioFetch<{ items?: unknown[] }>(endpoint, {}, true); // useV3 = true

  if (!result.success) {
    return result;
  }

  const items = result.data?.items || result.data;
  return { success: true, data: items };
}

/**
 * Disconnect an account
 * Uses v3 API for connected accounts (snake_case endpoint)
 */
async function disconnectAccount(
  connectedAccountId: string,
  supabase: ReturnType<typeof createClient>
) {
  // Delete from Composio - v3 API with snake_case endpoint
  const result = await composioFetch(`/connected_accounts/${connectedAccountId}`, {
    method: "DELETE",
  }, true); // useV3 = true

  if (!result.success) {
    return result;
  }

  // Also remove from our database
  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("composio_connected_account_id", connectedAccountId);

  if (error) {
    console.error("Failed to remove local integration record:", error);
    // Don't fail the operation, Composio deletion succeeded
  }

  return { success: true, data: { disconnected: true } };
}

/**
 * Refresh a connection's token
 * Uses v3 API for connected accounts (snake_case endpoint)
 */
async function refreshConnection(connectedAccountId: string) {
  // v3 API: Get status to trigger any internal refresh
  const result = await composioFetch(`/connected_accounts/${connectedAccountId}`, {
    method: "GET",
  }, true); // useV3 = true

  if (!result.success) {
    return result;
  }

  // Return updated status
  return getConnectionStatus(connectedAccountId);
}

/**
 * Execute a Composio tool
 * v1 API uses /actions/{actionName}/execute endpoint
 */
async function executeTool(
  toolSlug: string,
  connectedAccountId: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  maxRetries = 2
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    // v1 API: /actions/{actionName}/execute
    const result = await composioFetch<{
      successful?: boolean;
      execution_details?: {
        executed: boolean;
      };
      response_data?: unknown;
      data?: unknown;
      error?: string;
    }>(`/actions/${toolSlug}/execute`, {
      method: "POST",
      body: JSON.stringify({
        connectedAccountId: connectedAccountId,
        input: args,
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!result.success) {
      // Check for auth errors that might need token refresh
      const errorMsg = result.error?.toLowerCase() || "";
      if (
        (errorMsg.includes("unauthorized") ||
          errorMsg.includes("token") ||
          errorMsg.includes("expired")) &&
        attempt < maxRetries
      ) {
        console.log(`Attempting token refresh for ${connectedAccountId}`);
        // Just re-fetch status to trigger any refresh
        await getConnectionStatus(connectedAccountId);
        continue;
      }

      return result;
    }

    // Update last_used_at
    await supabase.rpc("update_integration_last_used", {
      p_connected_account_id: connectedAccountId,
    });

    return {
      success: true,
      data: {
        successful: result.data?.successful ?? result.data?.execution_details?.executed ?? true,
        data: result.data?.response_data || result.data?.data || result.data,
        executionTime,
      },
    };
  }

  return { success: false, error: "Max retries exceeded" };
}

/**
 * List available tools for a toolkit
 * v1 API uses /actions endpoint
 */
async function listTools(toolkitSlug: string) {
  // v1 API: /actions with appNames parameter
  const result = await composioFetch<{ items?: unknown[] }>(
    `/actions?appNames=${toolkitSlug}`
  );

  if (!result.success) {
    return result;
  }

  const items = result.data?.items || result.data;
  return { success: true, data: items };
}

/**
 * List available triggers for a toolkit
 * v1 API uses /triggers endpoint with appNames
 */
async function listTriggers(toolkitSlug: string) {
  const result = await composioFetch<{ items?: unknown[] }>(
    `/triggers?appNames=${toolkitSlug}`
  );

  if (!result.success) {
    return result;
  }

  const items = result.data?.items || result.data;
  return { success: true, data: items };
}

/**
 * Subscribe to a trigger
 * v1 API uses /triggers/subscribe endpoint
 */
async function subscribeTrigger(
  triggerSlug: string,
  connectedAccountId: string,
  webhookUrl: string,
  config: Record<string, unknown> = {},
  userId: string,
  supabase: ReturnType<typeof createClient>
) {
  // v1 API: /triggers/{triggerId}/enable
  const result = await composioFetch<{
    triggerId?: string;
    id?: string;
    status: string;
  }>(`/triggers/${triggerSlug}/enable`, {
    method: "POST",
    body: JSON.stringify({
      connectedAccountId: connectedAccountId,
      triggerConfig: config,
    }),
  });

  if (!result.success || !result.data) {
    return result;
  }

  const triggerId = result.data.triggerId || result.data.id;

  // Store subscription in database
  const { error } = await supabase.from("composio_trigger_subscriptions").upsert(
    {
      user_id: userId,
      connected_account_id: connectedAccountId,
      trigger_slug: triggerSlug,
      composio_subscription_id: triggerId,
      webhook_url: webhookUrl,
      status: result.data.status || "ACTIVE",
      config,
    },
    {
      onConflict: "user_id,connected_account_id,trigger_slug",
    }
  );

  if (error) {
    console.error("Failed to store trigger subscription:", error);
  }

  return {
    success: true,
    data: {
      id: triggerId,
      triggerSlug,
      status: result.data.status || "ACTIVE",
    },
  };
}

/**
 * Unsubscribe from a trigger
 * v1 API uses /triggers/{triggerId}/disable endpoint
 */
async function unsubscribeTrigger(
  subscriptionId: string,
  supabase: ReturnType<typeof createClient>
) {
  // v1 API: /triggers/{triggerId}/disable
  const result = await composioFetch(`/triggers/instance/${subscriptionId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ enabled: false }),
  });

  if (!result.success) {
    return result;
  }

  // Remove from database
  await supabase
    .from("composio_trigger_subscriptions")
    .delete()
    .eq("composio_subscription_id", subscriptionId);

  return { success: true, data: { unsubscribed: true } };
}

// ============================================
// MCP Server Management Functions
// ============================================

/**
 * Create a new MCP server with multiple toolkits
 * Uses v3 API: POST /api/v3/mcp/servers/custom
 */
async function createMcpServer(
  name: string,
  toolkits: string[],
  options?: {
    authConfigIds?: string[];
    customTools?: string[];
  }
) {
  const requestBody: Record<string, unknown> = {
    name,
    toolkits,
  };

  if (options?.authConfigIds?.length) {
    requestBody.auth_config_ids = options.authConfigIds;
  }
  if (options?.customTools?.length) {
    requestBody.custom_tools = options.customTools;
  }

  const result = await composioFetch<{
    id: string;
    name: string;
    toolkits: string[];
    created_at: string;
    status?: string;
  }>("/mcp/servers/custom", {
    method: "POST",
    body: JSON.stringify(requestBody),
  }, true); // useV3 = true

  if (!result.success || !result.data) {
    return result;
  }

  return {
    success: true,
    data: {
      id: result.data.id,
      name: result.data.name,
      toolkits: result.data.toolkits,
      createdAt: result.data.created_at,
      status: result.data.status || 'ACTIVE',
    },
  };
}

/**
 * Generate MCP URL for a server
 * Uses v3 API: POST /api/v3/mcp/servers/generate
 */
async function getMcpServerUrl(
  mcpServerId: string,
  options?: {
    managedAuth?: boolean;
    userIds?: string[];
    connectedAccountIds?: string[];
  }
) {
  const requestBody: Record<string, unknown> = {
    mcp_server_id: mcpServerId,
    managed_auth_by_composio: options?.managedAuth ?? false,
  };

  if (options?.userIds?.length) {
    requestBody.user_ids = options.userIds;
  }
  if (options?.connectedAccountIds?.length) {
    requestBody.connected_account_ids = options.connectedAccountIds;
  }

  const result = await composioFetch<{
    mcp_url?: string;
    url?: string;
    server_id?: string;
  }>("/mcp/servers/generate", {
    method: "POST",
    body: JSON.stringify(requestBody),
  }, true); // useV3 = true

  if (!result.success || !result.data) {
    return result;
  }

  const mcpUrl = result.data.mcp_url || result.data.url;

  return {
    success: true,
    data: {
      mcpUrl,
      serverId: result.data.server_id || mcpServerId,
      // Convert SSE to MCP format if needed (SSE is deprecated)
      mcpUrlMcp: mcpUrl?.replace('/sse', '/mcp').replace('?transport=sse', ''),
    },
  };
}

/**
 * List all MCP servers for the project
 * Uses v3 API: GET /api/v3/mcp/servers
 */
async function listMcpServers() {
  const result = await composioFetch<{
    items?: Array<{
      id: string;
      name: string;
      toolkits?: string[];
      created_at?: string;
      status?: string;
    }>;
  }>("/mcp/servers", {}, true); // useV3 = true

  if (!result.success) {
    return result;
  }

  const servers = result.data?.items || [];

  return {
    success: true,
    data: servers.map(server => ({
      id: server.id,
      name: server.name,
      toolkits: server.toolkits || [],
      createdAt: server.created_at,
      status: server.status || 'ACTIVE',
    })),
  };
}

/**
 * Delete an MCP server
 * Uses v3 API: DELETE /api/v3/mcp/servers/{server_id}
 */
async function deleteMcpServer(
  mcpServerId: string,
  supabase: ReturnType<typeof createClient>
) {
  const result = await composioFetch(`/mcp/servers/${mcpServerId}`, {
    method: "DELETE",
  }, true); // useV3 = true

  if (!result.success) {
    return result;
  }

  // Remove from local database
  const { error } = await supabase
    .from("user_mcp_servers")
    .delete()
    .eq("composio_server_id", mcpServerId);

  if (error) {
    console.error("Failed to remove local MCP server record:", error);
  }

  return { success: true, data: { deleted: true } };
}

/**
 * Update an MCP server
 * Uses v3 API: PATCH /api/v3/mcp/servers/{server_id}
 */
async function updateMcpServer(
  mcpServerId: string,
  updates: {
    name?: string;
    toolkits?: string[];
    authConfigIds?: string[];
    customTools?: string[];
  }
) {
  const requestBody: Record<string, unknown> = {};

  if (updates.name) requestBody.name = updates.name;
  if (updates.toolkits) requestBody.toolkits = updates.toolkits;
  if (updates.authConfigIds) requestBody.auth_config_ids = updates.authConfigIds;
  if (updates.customTools) requestBody.custom_tools = updates.customTools;

  const result = await composioFetch<{
    id: string;
    name: string;
    toolkits: string[];
    status?: string;
  }>(`/mcp/servers/${mcpServerId}`, {
    method: "PATCH",
    body: JSON.stringify(requestBody),
  }, true); // useV3 = true

  if (!result.success || !result.data) {
    return result;
  }

  return {
    success: true,
    data: {
      id: result.data.id,
      name: result.data.name,
      toolkits: result.data.toolkits,
      status: result.data.status || 'ACTIVE',
    },
  };
}

/**
 * Store MCP server in local database
 */
async function storeMcpServer(
  userId: string,
  mcpServerId: string,
  name: string,
  toolkits: string[],
  mcpUrl: string,
  supabase: ReturnType<typeof createClient>
) {
  const { data, error } = await supabase
    .from("user_mcp_servers")
    .upsert(
      {
        user_id: userId,
        composio_server_id: mcpServerId,
        name,
        toolkits,
        mcp_url: mcpUrl,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,composio_server_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to store MCP server:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Store connection in database after successful OAuth
 */
async function storeConnection(
  userId: string,
  connectedAccountId: string,
  toolkitSlug: string,
  supabase: ReturnType<typeof createClient>
) {
  const { data, error } = await supabase
    .from("user_integrations")
    .upsert(
      {
        user_id: userId,
        composio_connected_account_id: connectedAccountId,
        toolkit_slug: toolkitSlug,
        status: "ACTIVE",
        connected_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,toolkit_slug",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to store connection:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Parse request
    const body: ComposioRequest = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing action parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Composio action: ${action}`);

    let result: { success: boolean; data?: unknown; error?: string };

    switch (action) {
      case "listAuthConfigs": {
        if (!body.toolkitSlug) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing toolkitSlug" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await listAuthConfigs(body.toolkitSlug);
        break;
      }

      case "initiateConnection": {
        if (!body.userId || !body.authConfigId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing userId or authConfigId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await initiateConnection(
          body.userId,
          body.authConfigId,
          body.callbackUrl
        );
        break;
      }

      case "getConnectionStatus": {
        if (!body.connectedAccountId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing connectedAccountId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await getConnectionStatus(body.connectedAccountId);

        // If connection is now active and we have user info, store it
        if (
          result.success &&
          (result.data as { status?: string })?.status === "ACTIVE" &&
          body.userId
        ) {
          const connData = result.data as {
            toolkitSlug?: string;
            id?: string;
          };
          if (connData.toolkitSlug) {
            await storeConnection(
              body.userId,
              body.connectedAccountId,
              connData.toolkitSlug,
              supabase
            );
          }
        }
        break;
      }

      case "listConnections": {
        if (!body.userId) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing userId" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await listConnections(body.userId, {
          toolkitSlug: body.toolkitSlug,
          status: body.status,
        });
        break;
      }

      case "disconnectAccount": {
        if (!body.connectedAccountId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing connectedAccountId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await disconnectAccount(body.connectedAccountId, supabase);
        break;
      }

      case "refreshConnection": {
        if (!body.connectedAccountId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing connectedAccountId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await refreshConnection(body.connectedAccountId);
        break;
      }

      case "executeTool": {
        if (!body.toolSlug || !body.connectedAccountId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing toolSlug or connectedAccountId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await executeTool(
          body.toolSlug,
          body.connectedAccountId,
          body.arguments || {},
          supabase
        );
        break;
      }

      case "listTools": {
        if (!body.toolkitSlug) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing toolkitSlug" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await listTools(body.toolkitSlug);
        break;
      }

      case "listTriggers": {
        if (!body.toolkitSlug) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing toolkitSlug" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await listTriggers(body.toolkitSlug);
        break;
      }

      case "subscribeTrigger": {
        if (
          !body.triggerSlug ||
          !body.connectedAccountId ||
          !body.webhookUrl ||
          !body.userId
        ) {
          return new Response(
            JSON.stringify({
              success: false,
              error:
                "Missing triggerSlug, connectedAccountId, webhookUrl, or userId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await subscribeTrigger(
          body.triggerSlug,
          body.connectedAccountId,
          body.webhookUrl,
          body.triggerConfig || {},
          body.userId,
          supabase
        );
        break;
      }

      case "unsubscribeTrigger": {
        if (!body.connectedAccountId) {
          // Using connectedAccountId as subscriptionId here
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing subscription ID (connectedAccountId)",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await unsubscribeTrigger(body.connectedAccountId, supabase);
        break;
      }

      // ========================================
      // MCP Server Management Actions
      // ========================================

      case "createMcpServer": {
        if (!body.mcpServerName || !body.toolkits?.length) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing mcpServerName or toolkits array",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Create the MCP server
        const createResult = await createMcpServer(
          body.mcpServerName,
          body.toolkits,
          {
            authConfigIds: body.authConfigIds,
            customTools: body.customTools,
          }
        );

        if (!createResult.success || !createResult.data) {
          result = createResult;
          break;
        }

        // Generate MCP URL for the server
        const urlResult = await getMcpServerUrl(
          createResult.data.id,
          {
            managedAuth: body.managedAuth ?? true,
            userIds: body.userId ? [body.userId] : undefined,
            connectedAccountIds: body.connectedAccountIds,
          }
        );

        if (!urlResult.success || !urlResult.data) {
          result = {
            success: true,
            data: {
              ...createResult.data,
              mcpUrl: null,
              warning: "Server created but URL generation failed",
            },
          };
          break;
        }

        // Store in local database if userId provided
        if (body.userId) {
          await storeMcpServer(
            body.userId,
            createResult.data.id,
            createResult.data.name,
            createResult.data.toolkits,
            urlResult.data.mcpUrl || "",
            supabase
          );
        }

        result = {
          success: true,
          data: {
            ...createResult.data,
            mcpUrl: urlResult.data.mcpUrl,
            mcpUrlMcp: urlResult.data.mcpUrlMcp,
          },
        };
        break;
      }

      case "getMcpServerUrl": {
        if (!body.mcpServerId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing mcpServerId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        result = await getMcpServerUrl(
          body.mcpServerId,
          {
            managedAuth: body.managedAuth,
            userIds: body.userId ? [body.userId] : undefined,
            connectedAccountIds: body.connectedAccountIds,
          }
        );
        break;
      }

      case "listMcpServers": {
        result = await listMcpServers();
        break;
      }

      case "deleteMcpServer": {
        if (!body.mcpServerId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing mcpServerId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        result = await deleteMcpServer(body.mcpServerId, supabase);
        break;
      }

      case "updateMcpServer": {
        if (!body.mcpServerId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing mcpServerId",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        result = await updateMcpServer(body.mcpServerId, {
          name: body.mcpServerName,
          toolkits: body.toolkits,
          authConfigIds: body.authConfigIds,
          customTools: body.customTools,
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Composio connect error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

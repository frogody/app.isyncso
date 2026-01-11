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

// Use v1 API - v3 returns 404 for many endpoints
const COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v1";
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
  | "unsubscribeTrigger";

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
}

// ============================================
// Composio API Helper
// ============================================

async function composioFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!COMPOSIO_API_KEY) {
    return { success: false, error: "COMPOSIO_API_KEY not configured" };
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${COMPOSIO_BASE_URL}${endpoint}`;

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
 * v1 API uses /integrations endpoint
 */
async function listAuthConfigs(toolkitSlug: string) {
  // v1 API uses /integrations with appName parameter
  const result = await composioFetch(
    `/integrations?appName=${toolkitSlug}`
  );

  if (!result.success) {
    return result;
  }

  // Extract items from response
  const items = (result.data as { items?: unknown[] })?.items || result.data;
  return { success: true, data: items };
}

/**
 * Initiate OAuth connection flow
 * v1 API uses /connectedAccounts endpoint
 */
async function initiateConnection(
  userId: string,
  authConfigId: string,
  callbackUrl?: string
) {
  // v1 API: Create connection via /connectedAccounts
  const linkResult = await composioFetch<{
    redirectUrl?: string;
    url?: string;
    connectionStatus?: string;
    connectedAccountId?: string;
    connected_account_id?: string;
  }>("/connectedAccounts", {
    method: "POST",
    body: JSON.stringify({
      integrationId: authConfigId,
      userUuid: userId,
      redirectUri: callbackUrl || `${SUPABASE_URL}/functions/v1/composio-connect/callback`,
    }),
  });

  if (!linkResult.success || !linkResult.data) {
    return linkResult;
  }

  return {
    success: true,
    data: {
      redirectUrl: linkResult.data.redirectUrl || linkResult.data.url,
      connectedAccountId: linkResult.data.connectedAccountId || linkResult.data.connected_account_id,
      connectionStatus: linkResult.data.connectionStatus,
    },
  };
}

/**
 * Get connection status
 * v1 API uses /connectedAccounts endpoint
 */
async function getConnectionStatus(connectedAccountId: string) {
  const result = await composioFetch<{
    id: string;
    status: string;
    appName?: string;
    toolkit_slug?: string;
    userUuid?: string;
    user_id?: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
  }>(`/connectedAccounts/${connectedAccountId}`);

  if (!result.success || !result.data) {
    return result;
  }

  return {
    success: true,
    data: {
      id: result.data.id,
      status: result.data.status,
      toolkitSlug: result.data.appName || result.data.toolkit_slug,
      userId: result.data.userUuid || result.data.user_id,
      createdAt: result.data.createdAt || result.data.created_at,
      updatedAt: result.data.updatedAt || result.data.updated_at,
    },
  };
}

/**
 * List all user's connections
 * v1 API uses /connectedAccounts with userUuid parameter
 */
async function listConnections(
  userId: string,
  options?: { toolkitSlug?: string; status?: string }
) {
  // v1 API uses userUuid parameter
  let endpoint = `/connectedAccounts?userUuid=${userId}`;

  if (options?.toolkitSlug) {
    endpoint += `&appName=${options.toolkitSlug}`;
  }
  if (options?.status) {
    endpoint += `&status=${options.status}`;
  }

  const result = await composioFetch<{ items?: unknown[] }>(endpoint);

  if (!result.success) {
    return result;
  }

  const items = result.data?.items || result.data;
  return { success: true, data: items };
}

/**
 * Disconnect an account
 * v1 API uses /connectedAccounts endpoint
 */
async function disconnectAccount(
  connectedAccountId: string,
  supabase: ReturnType<typeof createClient>
) {
  // Delete from Composio - v1 API
  const result = await composioFetch(`/connectedAccounts/${connectedAccountId}`, {
    method: "DELETE",
  });

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
 * v1 API uses /connectedAccounts endpoint
 */
async function refreshConnection(connectedAccountId: string) {
  // v1 API: Use initiate endpoint with forceNewAccount to refresh
  const result = await composioFetch(`/connectedAccounts/${connectedAccountId}`, {
    method: "GET",
  });

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

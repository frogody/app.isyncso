/**
 * Composio Tool for SYNC Agent
 * Executes actions on third-party services via Composio integrations
 */

import { ActionContext, ActionResult } from './types.ts';

// Composio API configuration
const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY");
const COMPOSIO_BASE_URL = "https://backend.composio.dev";
const COMPOSIO_V3_URL = `${COMPOSIO_BASE_URL}/api/v3`;

// Common toolkit slugs and their popular actions
export const COMPOSIO_INTEGRATIONS: Record<string, { name: string; actions: string[] }> = {
  gmail: {
    name: 'Gmail',
    actions: ['GMAIL_SEND_EMAIL', 'GMAIL_FETCH_EMAILS', 'GMAIL_CREATE_DRAFT', 'GMAIL_SEARCH_EMAILS'],
  },
  slack: {
    name: 'Slack',
    actions: ['SLACK_SEND_MESSAGE', 'SLACK_CREATE_CHANNEL', 'SLACK_LIST_CHANNELS', 'SLACK_LIST_USERS'],
  },
  hubspot: {
    name: 'HubSpot',
    actions: ['HUBSPOT_CREATE_CONTACT', 'HUBSPOT_CREATE_DEAL', 'HUBSPOT_LIST_CONTACTS', 'HUBSPOT_SEND_EMAIL'],
  },
  notion: {
    name: 'Notion',
    actions: ['NOTION_CREATE_PAGE', 'NOTION_UPDATE_PAGE', 'NOTION_SEARCH', 'NOTION_CREATE_DATABASE'],
  },
  googlecalendar: {
    name: 'Google Calendar',
    actions: ['GOOGLECALENDAR_CREATE_EVENT', 'GOOGLECALENDAR_LIST_EVENTS', 'GOOGLECALENDAR_UPDATE_EVENT'],
  },
  googledrive: {
    name: 'Google Drive',
    actions: ['GOOGLEDRIVE_LIST_FILES', 'GOOGLEDRIVE_UPLOAD_FILE', 'GOOGLEDRIVE_SEARCH_FILES'],
  },
  linkedin: {
    name: 'LinkedIn',
    actions: ['LINKEDIN_CREATE_POST', 'LINKEDIN_GET_PROFILE', 'LINKEDIN_SEND_MESSAGE'],
  },
  trello: {
    name: 'Trello',
    actions: ['TRELLO_CREATE_CARD', 'TRELLO_LIST_CARDS', 'TRELLO_UPDATE_CARD', 'TRELLO_CREATE_LIST'],
  },
  asana: {
    name: 'Asana',
    actions: ['ASANA_CREATE_TASK', 'ASANA_LIST_TASKS', 'ASANA_UPDATE_TASK', 'ASANA_CREATE_PROJECT'],
  },
  linear: {
    name: 'Linear',
    actions: ['LINEAR_CREATE_ISSUE', 'LINEAR_LIST_ISSUES', 'LINEAR_UPDATE_ISSUE'],
  },
  github: {
    name: 'GitHub',
    actions: ['GITHUB_CREATE_ISSUE', 'GITHUB_LIST_ISSUES', 'GITHUB_CREATE_PR', 'GITHUB_LIST_REPOS'],
  },
  jira: {
    name: 'Jira',
    actions: ['JIRA_CREATE_ISSUE', 'JIRA_LIST_ISSUES', 'JIRA_UPDATE_ISSUE', 'JIRA_SEARCH'],
  },
};

// SYNC action names that map to Composio
export const COMPOSIO_ACTIONS = [
  // Gmail actions - Basic
  'composio_send_email',
  'composio_fetch_emails',
  'composio_search_emails',

  // Gmail actions - PA Capabilities (NEW!)
  'composio_check_inbox',        // Check inbox for unread emails
  'composio_reply_to_email',     // Reply to a specific email
  'composio_forward_email',      // Forward an email
  'composio_get_email_details',  // Get full email content
  'composio_mark_email_read',    // Mark email as read/unread
  'composio_archive_email',      // Archive an email
  'composio_draft_email',        // Create email draft
  'composio_summarize_inbox',    // Summarize inbox (AI-powered)

  // Plan-Execute mapped actions (for planner compatibility)
  'check_inbox',
  'reply_to_email',
  'send_email',
  'fetch_emails',
  'search_emails',
  'forward_email',
  'draft_email',
  'get_email_details',
  'mark_email_read',
  'archive_email',
  'summarize_inbox',

  // Slack actions
  'composio_send_slack_message',
  'composio_list_slack_channels',

  // HubSpot actions
  'composio_create_hubspot_contact',
  'composio_create_hubspot_deal',

  // Calendar actions
  'composio_create_calendar_event',
  'composio_list_calendar_events',

  // Task management
  'composio_create_notion_page',
  'composio_create_trello_card',
  'composio_create_asana_task',
  'composio_create_linear_issue',

  // Generic Composio action
  'composio_execute_tool',

  // List integrations
  'composio_list_integrations',

  // MCP Server Management
  'mcp_create_server',
  'mcp_list_servers',
  'mcp_delete_server',
  'mcp_get_url',
];

/**
 * Helper to make Composio API calls (v3)
 */
async function composioFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!COMPOSIO_API_KEY) {
    return { success: false, error: "COMPOSIO_API_KEY not configured" };
  }

  const url = endpoint.startsWith("http") ? endpoint : `${COMPOSIO_V3_URL}${endpoint}`;

  try {
    console.log(`[Composio] Calling: ${url}`);
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
      // Not JSON
    }

    if (!response.ok) {
      console.error(`[Composio] Error response (${response.status}):`, text);
      // Extract error message from various formats
      let errorMsg = `HTTP ${response.status}`;
      if (data) {
        const d = data as Record<string, unknown>;
        if (typeof d.message === 'string') errorMsg = d.message;
        else if (typeof d.error === 'string') errorMsg = d.error;
        else if (typeof d.detail === 'string') errorMsg = d.detail;
        else if (d.message && typeof d.message === 'object') errorMsg = JSON.stringify(d.message);
        else if (d.error && typeof d.error === 'object') errorMsg = JSON.stringify(d.error);
        else errorMsg = text || `HTTP ${response.status}`;
      }
      return { success: false, error: errorMsg };
    }

    return { success: true, data };
  } catch (error) {
    console.error(`[Composio] Fetch error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get user's connected Composio integrations
 */
async function getUserIntegrations(ctx: ActionContext): Promise<Array<{
  toolkit_slug: string;
  composio_connected_account_id: string;
  status: string;
}>> {
  if (!ctx.userId) return [];

  const { data, error } = await ctx.supabase
    .from('user_integrations')
    .select('toolkit_slug, composio_connected_account_id, status')
    .eq('user_id', ctx.userId)
    .eq('status', 'ACTIVE');

  if (error) {
    console.error('Failed to fetch user integrations:', error);
    return [];
  }

  return data || [];
}

/**
 * Find connection for a specific toolkit
 */
async function getConnectionForToolkit(
  ctx: ActionContext,
  toolkitSlug: string
): Promise<string | null> {
  const integrations = await getUserIntegrations(ctx);
  const integration = integrations.find(i => i.toolkit_slug === toolkitSlug);
  return integration?.composio_connected_account_id || null;
}

/**
 * Helper to extract error message from various error formats
 * Handles deeply nested error objects common in API responses
 */
function extractErrorMessage(error: unknown, depth = 0): string {
  // Prevent infinite recursion
  if (depth > 5) return JSON.stringify(error);

  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (typeof error === 'number') return String(error);

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Try common error message fields (in order of priority)
    if (typeof err.message === 'string' && err.message) return err.message;
    if (typeof err.detail === 'string' && err.detail) return err.detail;
    if (typeof err.details === 'string' && err.details) return err.details;
    if (typeof err.description === 'string' && err.description) return err.description;
    if (typeof err.reason === 'string' && err.reason) return err.reason;

    // Handle nested error objects
    if (err.message && typeof err.message === 'object') {
      return extractErrorMessage(err.message, depth + 1);
    }
    if (err.error && typeof err.error === 'object') {
      return extractErrorMessage(err.error, depth + 1);
    }
    if (typeof err.error === 'string' && err.error) {
      return err.error;
    }

    // Handle array of errors
    if (Array.isArray(err.errors) && err.errors.length > 0) {
      return extractErrorMessage(err.errors[0], depth + 1);
    }

    // Try to find any string value in the object
    for (const key of ['msg', 'err', 'errorMessage', 'error_message', 'statusText']) {
      if (typeof err[key] === 'string' && err[key]) {
        return err[key] as string;
      }
    }

    // Fallback to JSON stringify (pretty print for readability, but truncate)
    const jsonStr = JSON.stringify(error, null, 0);
    return jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;
  }

  return String(error);
}

/**
 * Execute a Composio tool action (v3 API)
 */
async function executeComposioTool(
  connectedAccountId: string,
  toolSlug: string,
  args: Record<string, unknown>,
  entityId?: string
): Promise<ActionResult> {
  console.log(`[Composio] Executing tool: ${toolSlug}`);
  console.log(`[Composio] connected_account_id: ${connectedAccountId}`);
  console.log(`[Composio] entity_id: ${entityId}`);
  console.log(`[Composio] Arguments:`, JSON.stringify(args));

  // v3 API endpoint format: /tools/execute/{tool_slug}
  const requestBody: Record<string, unknown> = {
    connected_account_id: connectedAccountId,
    arguments: args,
  };

  // Add entity_id if provided (required by v3 API)
  if (entityId) {
    requestBody.entity_id = entityId;
  }

  const result = await composioFetch<{
    successful?: boolean;
    data?: unknown;
    error?: unknown;
    log_id?: string;
    message?: string;
  }>(`/tools/execute/${toolSlug}`, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  console.log(`[Composio] Raw result:`, JSON.stringify(result, null, 2));

  if (!result.success) {
    const errorMsg = extractErrorMessage(result.error);
    console.log(`[Composio] Error (fetch failed):`, errorMsg);
    return {
      success: false,
      error: errorMsg,
      message: `Failed to execute ${toolSlug}: ${errorMsg}`,
    };
  }

  // Parse the response data carefully
  const responseData = result.data as Record<string, unknown> | undefined;
  console.log(`[Composio] Response data type:`, typeof responseData);
  console.log(`[Composio] Response data keys:`, responseData ? Object.keys(responseData) : 'undefined');

  // Check for error in response
  if (responseData?.error) {
    const errorMsg = extractErrorMessage(responseData.error);
    console.log(`[Composio] Error in response.error:`, errorMsg);
    return {
      success: false,
      error: errorMsg,
      message: `Failed to execute ${toolSlug}: ${errorMsg}`,
    };
  }

  // Check for successful flag being false
  if (responseData?.successful === false) {
    const errorMsg = extractErrorMessage(responseData?.message || responseData?.error || responseData);
    console.log(`[Composio] Error (successful=false):`, errorMsg);
    return {
      success: false,
      error: errorMsg,
      message: `Failed to execute ${toolSlug}: ${errorMsg}`,
    };
  }

  // Check if the data field contains the actual result
  if (responseData?.data !== undefined) {
    return {
      success: true,
      result: responseData.data,
      message: `Successfully executed ${toolSlug}`,
    };
  }

  return {
    success: true,
    result: result.data?.data || result.data,
    message: `Successfully executed ${toolSlug}`,
  };
}

/**
 * Main Composio action executor
 */
export async function executeComposioAction(
  ctx: ActionContext,
  actionName: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  switch (actionName) {
    // ========================================
    // List user's connected integrations
    // ========================================
    case 'composio_list_integrations': {
      const integrations = await getUserIntegrations(ctx);

      if (integrations.length === 0) {
        return {
          success: true,
          result: [],
          message: "You don't have any third-party integrations connected yet. Would you like me to help you connect one? You can connect apps like Gmail, Slack, HubSpot, Notion, and more.",
          link: '/Integrations',
        };
      }

      const formatted = integrations.map(i => ({
        name: COMPOSIO_INTEGRATIONS[i.toolkit_slug as keyof typeof COMPOSIO_INTEGRATIONS]?.name || i.toolkit_slug,
        slug: i.toolkit_slug,
        status: i.status,
        availableActions: COMPOSIO_INTEGRATIONS[i.toolkit_slug as keyof typeof COMPOSIO_INTEGRATIONS]?.actions || [],
      }));

      return {
        success: true,
        result: formatted,
        message: `You have ${integrations.length} integration(s) connected: ${formatted.map(i => i.name).join(', ')}. I can help you use these to send emails, create tasks, post messages, and more!`,
      };
    }

    // ========================================
    // Gmail Actions
    // ========================================
    case 'composio_send_email': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first in the Integrations page.",
          link: '/Integrations',
        };
      }

      const { to, subject, body, cc, bcc } = data as {
        to: string;
        subject: string;
        body: string;
        cc?: string;
        bcc?: string;
      };

      // Provide specific error messages for missing fields
      const missing: string[] = [];
      if (!to) missing.push('recipient email (to)');
      if (!subject) missing.push('subject');
      if (!body) missing.push('body');

      if (missing.length > 0) {
        console.log(`[Composio] Missing email fields: ${missing.join(', ')}`);
        console.log(`[Composio] Received data:`, JSON.stringify({ to, subject, body: body?.substring(0, 50) }));
        return {
          success: false,
          message: missing.length === 1
            ? `Missing ${missing[0]} for the email. The client may not have an email address on file.`
            : `Missing required fields: ${missing.join(', ')}`,
        };
      }

      return executeComposioTool(connId, 'GMAIL_SEND_EMAIL', {
        recipient_email: to,
        subject,
        body,
        cc,
        bcc,
      }, ctx.userId);
    }

    case 'composio_fetch_emails': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { query, max_results } = data as { query?: string; max_results?: number };

      const result = await executeComposioTool(connId, 'GMAIL_FETCH_EMAILS', {
        query: query || 'in:inbox',
        max_results: max_results || 10,
      }, ctx.userId);

      // Format the email results nicely
      if (result.success && result.result) {
        const rawData = result.result as Record<string, unknown>;
        const emails = Array.isArray(result.result) ? result.result :
          rawData?.messages ||
          rawData?.data ||
          (rawData?.response_data as Record<string, unknown>)?.messages ||
          [];

        if (Array.isArray(emails) && emails.length > 0) {
          const formattedEmails = emails.slice(0, 5).map((email: Record<string, unknown>, i: number) => {
            // Extract headers from various possible formats
            const headers = (email.payload as Record<string, unknown>)?.headers as Array<{name: string; value: string}> || [];
            const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

            // Get email fields - try multiple possible locations
            let from = email.from || email.sender || getHeader('From') || 'Unknown sender';
            let subject = email.subject || getHeader('Subject') || '(No subject)';
            let snippet = email.snippet || email.preview || email.body_preview || '';

            // Clean up the from field to just show name/email
            if (typeof from === 'string' && from.includes('<')) {
              const match = from.match(/^([^<]+)/);
              if (match) from = match[1].trim();
            }

            // Clean up snippet - ensure it's a string and truncate
            if (typeof snippet !== 'string') snippet = '';
            snippet = snippet.replace(/\s+/g, ' ').trim();
            if (snippet.length > 80) snippet = snippet.substring(0, 80) + '...';

            return `📧 **${i + 1}. ${subject}**\n   From: ${from}${snippet ? `\n   "${snippet}"` : ''}`;
          }).join('\n\n');

          const totalCount = emails.length;
          const shownCount = Math.min(5, totalCount);

          return {
            success: true,
            result: emails,
            message: `📬 **Your Recent Emails** (showing ${shownCount} of ${totalCount})\n\n${formattedEmails}${totalCount > 5 ? `\n\n_...and ${totalCount - 5} more emails_` : ''}`,
          };
        }

        return {
          success: true,
          result: result.result,
          message: "📭 No emails found matching your criteria.",
        };
      }

      return result;
    }

    case 'composio_search_emails':
    case 'search_emails': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { query, max_results } = data as { query: string; max_results?: number };

      if (!query) {
        return {
          success: false,
          message: "Please provide a search query for emails.",
        };
      }

      return executeComposioTool(connId, 'GMAIL_SEARCH_EMAILS', {
        query,
        max_results: max_results || 20,
      }, ctx.userId);
    }

    // ========================================
    // Gmail PA Actions (Personal Assistant)
    // ========================================

    case 'composio_check_inbox':
    case 'check_inbox': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "📧 Gmail is not connected. Connect it in the Integrations page to use email features.",
          link: '/Integrations',
        };
      }

      const { limit, unread_only, from, subject_contains } = data as {
        limit?: number;
        unread_only?: boolean;
        from?: string;
        subject_contains?: string;
      };

      // Build Gmail search query
      let query = 'in:inbox';
      if (unread_only !== false) query += ' is:unread'; // Default to unread only
      if (from) query += ` from:${from}`;
      if (subject_contains) query += ` subject:${subject_contains}`;

      const result = await executeComposioTool(connId, 'GMAIL_FETCH_EMAILS', {
        query,
        max_results: limit || 10,
      }, ctx.userId);

      // Format the inbox summary nicely
      if (result.success && result.result) {
        const rawData = result.result as Record<string, unknown>;
        const emails = Array.isArray(result.result) ? result.result :
          rawData?.messages ||
          rawData?.data ||
          (rawData?.response_data as Record<string, unknown>)?.messages ||
          [];

        if (Array.isArray(emails) && emails.length > 0) {
          const unreadCount = emails.filter((e: any) =>
            e.labelIds?.includes('UNREAD') || e.is_unread || e.unread
          ).length;

          const formattedEmails = emails.slice(0, 5).map((email: Record<string, unknown>, i: number) => {
            const headers = (email.payload as Record<string, unknown>)?.headers as Array<{name: string; value: string}> || [];
            const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

            let from = email.from || email.sender || getHeader('From') || 'Unknown';
            let subject = email.subject || getHeader('Subject') || '(No subject)';
            let snippet = (email.snippet || email.preview || '') as string;
            const isUnread = email.labelIds?.includes('UNREAD') || email.is_unread || email.unread;

            // Clean up
            if (typeof from === 'string' && from.includes('<')) {
              const match = from.match(/^([^<]+)/);
              if (match) from = match[1].trim();
            }
            snippet = (snippet as string).replace(/\s+/g, ' ').trim();
            if (snippet.length > 60) snippet = snippet.substring(0, 60) + '...';

            const unreadMarker = isUnread ? '🔵 ' : '';
            return `${unreadMarker}**${i + 1}. ${subject}**\n   From: ${from}${snippet ? `\n   "${snippet}"` : ''}`;
          }).join('\n\n');

          return {
            success: true,
            result: {
              emails,
              count: emails.length,
              unread_count: unreadCount,
            },
            message: `📬 **Inbox Summary**\n\n${unreadCount > 0 ? `You have **${unreadCount} unread** email(s)` : 'No unread emails'}${emails.length > unreadCount ? ` and ${emails.length - unreadCount} read` : ''}.\n\n${formattedEmails}${emails.length > 5 ? `\n\n_...and ${emails.length - 5} more_` : ''}\n\nWant me to reply to any of these, or get more details about a specific email?`,
          };
        }

        return {
          success: true,
          result: { emails: [], count: 0, unread_count: 0 },
          message: "📭 Your inbox is clear! No unread emails.",
        };
      }

      return result;
    }

    case 'composio_reply_to_email':
    case 'reply_to_email': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { message_id, thread_id, body, to } = data as {
        message_id?: string;
        thread_id?: string;
        body: string;
        to?: string;
      };

      if (!body) {
        return {
          success: false,
          message: "Please provide the reply message body.",
        };
      }

      if (!message_id && !thread_id && !to) {
        return {
          success: false,
          message: "Please provide either a message_id, thread_id, or recipient email to reply to.",
        };
      }

      // Use Gmail reply functionality
      const result = await executeComposioTool(connId, 'GMAIL_REPLY_TO_EMAIL', {
        message_id,
        thread_id,
        body,
        to,
      }, ctx.userId);

      if (result.success) {
        return {
          success: true,
          result: result.result,
          message: `✉️ Reply sent successfully!`,
        };
      }

      return result;
    }

    case 'composio_forward_email':
    case 'forward_email': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { message_id, to, additional_message } = data as {
        message_id: string;
        to: string;
        additional_message?: string;
      };

      if (!message_id || !to) {
        return {
          success: false,
          message: "Please provide the message_id to forward and recipient email.",
        };
      }

      const result = await executeComposioTool(connId, 'GMAIL_FORWARD_EMAIL', {
        message_id,
        to,
        body: additional_message || '',
      }, ctx.userId);

      if (result.success) {
        return {
          success: true,
          result: result.result,
          message: `📤 Email forwarded to ${to}!`,
        };
      }

      return result;
    }

    case 'composio_get_email_details':
    case 'get_email_details': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { message_id } = data as { message_id: string };

      if (!message_id) {
        return {
          success: false,
          message: "Please provide the message_id to get details for.",
        };
      }

      const result = await executeComposioTool(connId, 'GMAIL_GET_MESSAGE', {
        message_id,
        format: 'full',
      }, ctx.userId);

      if (result.success && result.result) {
        const email = result.result as Record<string, unknown>;
        const headers = (email.payload as Record<string, unknown>)?.headers as Array<{name: string; value: string}> || [];
        const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

        const from = getHeader('From') || 'Unknown sender';
        const to = getHeader('To') || '';
        const subject = getHeader('Subject') || '(No subject)';
        const date = getHeader('Date') || '';
        const body = (email.snippet || email.body || '') as string;

        return {
          success: true,
          result: {
            id: email.id,
            thread_id: email.threadId,
            from,
            to,
            subject,
            date,
            body,
            labels: email.labelIds,
          },
          message: `📧 **${subject}**\n\nFrom: ${from}\nTo: ${to}\nDate: ${date}\n\n${body}`,
        };
      }

      return result;
    }

    case 'composio_mark_email_read':
    case 'mark_email_read': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { message_id, mark_as } = data as {
        message_id: string;
        mark_as?: 'read' | 'unread';
      };

      if (!message_id) {
        return {
          success: false,
          message: "Please provide the message_id to mark.",
        };
      }

      const markRead = mark_as !== 'unread';
      const result = await executeComposioTool(connId, 'GMAIL_MODIFY_LABELS', {
        message_id,
        add_labels: markRead ? [] : ['UNREAD'],
        remove_labels: markRead ? ['UNREAD'] : [],
      }, ctx.userId);

      if (result.success) {
        return {
          success: true,
          result: result.result,
          message: `✓ Email marked as ${markRead ? 'read' : 'unread'}`,
        };
      }

      return result;
    }

    case 'composio_archive_email':
    case 'archive_email': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { message_id } = data as { message_id: string };

      if (!message_id) {
        return {
          success: false,
          message: "Please provide the message_id to archive.",
        };
      }

      const result = await executeComposioTool(connId, 'GMAIL_MODIFY_LABELS', {
        message_id,
        remove_labels: ['INBOX'],
      }, ctx.userId);

      if (result.success) {
        return {
          success: true,
          result: result.result,
          message: `📥 Email archived`,
        };
      }

      return result;
    }

    case 'composio_draft_email':
    case 'draft_email': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { to, subject, body } = data as {
        to: string;
        subject: string;
        body: string;
      };

      if (!to || !subject || !body) {
        return {
          success: false,
          message: "Please provide: to, subject, and body for the draft.",
        };
      }

      const result = await executeComposioTool(connId, 'GMAIL_CREATE_DRAFT', {
        recipient_email: to,
        subject,
        body,
      }, ctx.userId);

      if (result.success) {
        return {
          success: true,
          result: result.result,
          message: `📝 Draft created! Subject: "${subject}" to ${to}`,
        };
      }

      return result;
    }

    case 'composio_summarize_inbox':
    case 'summarize_inbox': {
      const connId = await getConnectionForToolkit(ctx, 'gmail');
      if (!connId) {
        return {
          success: false,
          message: "Gmail is not connected. Please connect Gmail first.",
          link: '/Integrations',
        };
      }

      const { period } = data as { period?: 'today' | 'week' | 'all' };

      // Build query based on period
      let query = 'in:inbox';
      if (period === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query += ` after:${today}`;
      } else if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query += ` after:${weekAgo.toISOString().split('T')[0]}`;
      }

      const result = await executeComposioTool(connId, 'GMAIL_FETCH_EMAILS', {
        query,
        max_results: 50,
      }, ctx.userId);

      if (result.success && result.result) {
        const rawData = result.result as Record<string, unknown>;
        const emails = Array.isArray(result.result) ? result.result :
          rawData?.messages || rawData?.data || [];

        if (Array.isArray(emails) && emails.length > 0) {
          // Categorize emails
          const unread = emails.filter((e: any) => e.labelIds?.includes('UNREAD') || e.is_unread);
          const important = emails.filter((e: any) => e.labelIds?.includes('IMPORTANT'));

          // Group by sender
          const bySender: Record<string, number> = {};
          for (const email of emails) {
            const headers = (email.payload as Record<string, unknown>)?.headers as Array<{name: string; value: string}> || [];
            const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || email.from || 'Unknown';
            const senderName = typeof from === 'string' && from.includes('<')
              ? from.match(/^([^<]+)/)?.[1]?.trim() || from
              : from;
            bySender[senderName] = (bySender[senderName] || 0) + 1;
          }

          // Top senders
          const topSenders = Object.entries(bySender)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => `  • ${name}: ${count} email(s)`)
            .join('\n');

          const periodLabel = period === 'today' ? 'Today' : period === 'week' ? 'This week' : 'Total';

          return {
            success: true,
            result: {
              total: emails.length,
              unread: unread.length,
              important: important.length,
              top_senders: bySender,
            },
            message: `📊 **Inbox Summary** (${periodLabel})\n\n` +
              `📬 **${emails.length}** total emails\n` +
              `🔵 **${unread.length}** unread\n` +
              `⭐ **${important.length}** marked important\n\n` +
              `**Top Senders:**\n${topSenders}\n\n` +
              `Would you like me to:\n` +
              `• Show unread emails?\n` +
              `• Search for specific emails?\n` +
              `• Reply to or draft something?`,
          };
        }

        return {
          success: true,
          result: { total: 0, unread: 0, important: 0 },
          message: `📭 No emails found for the selected period.`,
        };
      }

      return result;
    }

    case 'send_email': {
      // Map to existing composio_send_email
      return executeComposioAction(ctx, 'composio_send_email', data);
    }

    case 'fetch_emails': {
      // Map to existing composio_fetch_emails
      return executeComposioAction(ctx, 'composio_fetch_emails', data);
    }

    // ========================================
    // Slack Actions
    // ========================================
    case 'composio_send_slack_message': {
      const connId = await getConnectionForToolkit(ctx, 'slack');
      if (!connId) {
        return {
          success: false,
          message: "Slack is not connected. Please connect Slack first.",
          link: '/Integrations',
        };
      }

      const { channel, message } = data as { channel: string; message: string };

      if (!channel || !message) {
        return {
          success: false,
          message: "Please provide: channel (name or ID) and message to send.",
        };
      }

      return executeComposioTool(connId, 'SLACK_SEND_MESSAGE', {
        channel,
        text: message,
      }, ctx.userId);
    }

    case 'composio_list_slack_channels': {
      const connId = await getConnectionForToolkit(ctx, 'slack');
      if (!connId) {
        return {
          success: false,
          message: "Slack is not connected. Please connect Slack first.",
          link: '/Integrations',
        };
      }

      return executeComposioTool(connId, 'SLACK_LIST_CHANNELS', {}, ctx.userId);
    }

    // ========================================
    // HubSpot Actions
    // ========================================
    case 'composio_create_hubspot_contact': {
      const connId = await getConnectionForToolkit(ctx, 'hubspot');
      if (!connId) {
        return {
          success: false,
          message: "HubSpot is not connected. Please connect HubSpot first.",
          link: '/Integrations',
        };
      }

      const { email, first_name, last_name, company, phone } = data as {
        email: string;
        first_name?: string;
        last_name?: string;
        company?: string;
        phone?: string;
      };

      if (!email) {
        return {
          success: false,
          message: "Please provide at least an email address for the contact.",
        };
      }

      return executeComposioTool(connId, 'HUBSPOT_CREATE_CONTACT', {
        email,
        firstname: first_name,
        lastname: last_name,
        company,
        phone,
      }, ctx.userId);
    }

    case 'composio_create_hubspot_deal': {
      const connId = await getConnectionForToolkit(ctx, 'hubspot');
      if (!connId) {
        return {
          success: false,
          message: "HubSpot is not connected. Please connect HubSpot first.",
          link: '/Integrations',
        };
      }

      const { name, amount, stage, close_date } = data as {
        name: string;
        amount?: number;
        stage?: string;
        close_date?: string;
      };

      if (!name) {
        return {
          success: false,
          message: "Please provide a name for the deal.",
        };
      }

      return executeComposioTool(connId, 'HUBSPOT_CREATE_DEAL', {
        dealname: name,
        amount,
        dealstage: stage || 'appointmentscheduled',
        closedate: close_date,
      }, ctx.userId);
    }

    // ========================================
    // Calendar Actions
    // ========================================
    case 'composio_create_calendar_event': {
      const connId = await getConnectionForToolkit(ctx, 'googlecalendar');
      if (!connId) {
        return {
          success: false,
          message: "Google Calendar is not connected. Please connect it first.",
          link: '/Integrations',
        };
      }

      const { title, start_time, end_time, description, attendees } = data as {
        title: string;
        start_time: string;
        end_time: string;
        description?: string;
        attendees?: string[];
      };

      if (!title || !start_time || !end_time) {
        return {
          success: false,
          message: "Please provide: title, start_time, and end_time for the event.",
        };
      }

      return executeComposioTool(connId, 'GOOGLECALENDAR_CREATE_EVENT', {
        summary: title,
        start: { dateTime: start_time },
        end: { dateTime: end_time },
        description,
        attendees: attendees?.map(email => ({ email })),
      }, ctx.userId);
    }

    case 'composio_list_calendar_events': {
      const connId = await getConnectionForToolkit(ctx, 'googlecalendar');
      if (!connId) {
        return {
          success: false,
          message: "Google Calendar is not connected. Please connect it first.",
          link: '/Integrations',
        };
      }

      const { time_min, time_max, max_results } = data as {
        time_min?: string;
        time_max?: string;
        max_results?: number;
      };

      return executeComposioTool(connId, 'GOOGLECALENDAR_LIST_EVENTS', {
        timeMin: time_min || new Date().toISOString(),
        timeMax: time_max,
        maxResults: max_results || 10,
      }, ctx.userId);
    }

    // ========================================
    // Notion Actions
    // ========================================
    case 'composio_create_notion_page': {
      const connId = await getConnectionForToolkit(ctx, 'notion');
      if (!connId) {
        return {
          success: false,
          message: "Notion is not connected. Please connect Notion first.",
          link: '/Integrations',
        };
      }

      const { title, content, parent_id } = data as {
        title: string;
        content?: string;
        parent_id?: string;
      };

      if (!title) {
        return {
          success: false,
          message: "Please provide a title for the Notion page.",
        };
      }

      return executeComposioTool(connId, 'NOTION_CREATE_PAGE', {
        title,
        content,
        parent_id,
      }, ctx.userId);
    }

    // ========================================
    // Trello Actions
    // ========================================
    case 'composio_create_trello_card': {
      const connId = await getConnectionForToolkit(ctx, 'trello');
      if (!connId) {
        return {
          success: false,
          message: "Trello is not connected. Please connect Trello first.",
          link: '/Integrations',
        };
      }

      const { name, description, list_id } = data as {
        name: string;
        description?: string;
        list_id: string;
      };

      if (!name || !list_id) {
        return {
          success: false,
          message: "Please provide: name and list_id for the Trello card.",
        };
      }

      return executeComposioTool(connId, 'TRELLO_CREATE_CARD', {
        name,
        desc: description,
        idList: list_id,
      }, ctx.userId);
    }

    // ========================================
    // Asana Actions
    // ========================================
    case 'composio_create_asana_task': {
      const connId = await getConnectionForToolkit(ctx, 'asana');
      if (!connId) {
        return {
          success: false,
          message: "Asana is not connected. Please connect Asana first.",
          link: '/Integrations',
        };
      }

      const { name, notes, project_id, due_date } = data as {
        name: string;
        notes?: string;
        project_id?: string;
        due_date?: string;
      };

      if (!name) {
        return {
          success: false,
          message: "Please provide a name for the Asana task.",
        };
      }

      return executeComposioTool(connId, 'ASANA_CREATE_TASK', {
        name,
        notes,
        projects: project_id ? [project_id] : undefined,
        due_on: due_date,
      }, ctx.userId);
    }

    // ========================================
    // Linear Actions
    // ========================================
    case 'composio_create_linear_issue': {
      const connId = await getConnectionForToolkit(ctx, 'linear');
      if (!connId) {
        return {
          success: false,
          message: "Linear is not connected. Please connect Linear first.",
          link: '/Integrations',
        };
      }

      const { title, description, team_id, priority } = data as {
        title: string;
        description?: string;
        team_id?: string;
        priority?: number;
      };

      if (!title) {
        return {
          success: false,
          message: "Please provide a title for the Linear issue.",
        };
      }

      return executeComposioTool(connId, 'LINEAR_CREATE_ISSUE', {
        title,
        description,
        teamId: team_id,
        priority,
      }, ctx.userId);
    }

    // ========================================
    // Generic Tool Execution
    // ========================================
    case 'composio_execute_tool': {
      const { toolkit, tool_name, arguments: toolArgs } = data as {
        toolkit: string;
        tool_name: string;
        arguments: Record<string, unknown>;
      };

      if (!toolkit || !tool_name) {
        return {
          success: false,
          message: "Please provide: toolkit (e.g., 'gmail') and tool_name (e.g., 'GMAIL_SEND_EMAIL').",
        };
      }

      const connId = await getConnectionForToolkit(ctx, toolkit);
      if (!connId) {
        return {
          success: false,
          message: `${toolkit} is not connected. Please connect it first in the Integrations page.`,
          link: '/Integrations',
        };
      }

      return executeComposioTool(connId, tool_name, toolArgs || {}, ctx.userId);
    }

    // ========================================
    // MCP Server Management Actions
    // ========================================
    case 'mcp_create_server': {
      const { name, toolkits } = data as {
        name: string;
        toolkits?: string[];
      };

      if (!name) {
        return {
          success: false,
          message: "Please provide a name for the MCP server.",
        };
      }

      // Get connected integrations if no toolkits specified
      let selectedToolkits = toolkits;
      if (!selectedToolkits || selectedToolkits.length === 0) {
        // Get user's connected integrations
        const { data: integrations, error: intError } = await ctx.supabase
          .from('user_integrations')
          .select('toolkit_slug')
          .eq('user_id', ctx.userId)
          .eq('status', 'ACTIVE');

        if (intError || !integrations || integrations.length === 0) {
          return {
            success: false,
            message: "No connected integrations found. Please connect apps in the Integrations page first.",
            link: '/Integrations',
          };
        }

        selectedToolkits = integrations.map(i => i.toolkit_slug);
      }

      // Create MCP server via Composio
      const createResult = await composioFetch<{id: string; name: string; created_at: string}>(
        '/mcp/servers/custom',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            toolkits: selectedToolkits,
          }),
        }
      );

      if (!createResult.success || !createResult.data) {
        return {
          success: false,
          message: `Failed to create MCP server: ${createResult.error || 'Unknown error'}`,
        };
      }

      // Store in database
      const { error: dbError } = await ctx.supabase
        .from('user_mcp_servers')
        .insert({
          user_id: ctx.userId,
          composio_server_id: createResult.data.id,
          name: createResult.data.name,
          toolkits: selectedToolkits,
          status: 'ACTIVE',
        });

      if (dbError) {
        console.error('[MCP] Failed to store server:', dbError);
      }

      return {
        success: true,
        result: {
          serverId: createResult.data.id,
          name: createResult.data.name,
          toolkits: selectedToolkits,
        },
        message: `🖥️ **MCP Server Created!**\n\n` +
          `**Name:** ${createResult.data.name}\n` +
          `**Toolkits:** ${selectedToolkits.join(', ')}\n\n` +
          `Your MCP server is ready! You can use it with Claude Desktop, Cursor, or other MCP-compatible AI tools.\n\n` +
          `Say "Get MCP URL for ${createResult.data.name}" to get the connection URL.`,
        link: '/Integrations?tab=mcp',
      };
    }

    case 'mcp_list_servers': {
      const { data: servers, error } = await ctx.supabase
        .from('user_mcp_servers')
        .select('*')
        .eq('user_id', ctx.userId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          message: `Failed to list MCP servers: ${error.message}`,
        };
      }

      if (!servers || servers.length === 0) {
        return {
          success: true,
          result: [],
          message: `📡 **No MCP Servers Yet**\n\n` +
            `You haven't created any MCP servers yet. MCP servers allow you to connect external AI tools like Claude Desktop or Cursor to your integrations.\n\n` +
            `Say "Create an MCP server" to get started!`,
        };
      }

      const serverList = servers.map((s, i) =>
        `${i + 1}. **${s.name}** (${s.toolkits?.length || 0} toolkits)\n` +
        `   Status: ${s.status}\n` +
        `   Created: ${new Date(s.created_at).toLocaleDateString()}`
      ).join('\n\n');

      return {
        success: true,
        result: servers,
        message: `🖥️ **Your MCP Servers** (${servers.length})\n\n${serverList}\n\n` +
          `Say "Get MCP URL for [server name]" to get the connection URL.`,
        link: '/Integrations?tab=mcp',
      };
    }

    case 'mcp_delete_server': {
      const { server_name, server_id } = data as {
        server_name?: string;
        server_id?: string;
      };

      if (!server_name && !server_id) {
        return {
          success: false,
          message: "Please specify which MCP server to delete (by name or ID).",
        };
      }

      // Find the server
      const { data: server, error: findError } = await ctx.supabase
        .from('user_mcp_servers')
        .select('*')
        .eq('user_id', ctx.userId)
        .or(server_id ? `composio_server_id.eq.${server_id}` : `name.ilike.%${server_name}%`)
        .maybeSingle();

      if (findError || !server) {
        return {
          success: false,
          message: `Could not find MCP server "${server_name || server_id}". Say "List my MCP servers" to see available servers.`,
        };
      }

      // Delete from Composio
      const deleteResult = await composioFetch(
        `/mcp/servers/${server.composio_server_id}`,
        { method: 'DELETE' }
      );

      if (!deleteResult.success) {
        console.warn('[MCP] Composio delete failed:', deleteResult.error);
        // Continue to delete from local DB anyway
      }

      // Delete from database
      const { error: dbError } = await ctx.supabase
        .from('user_mcp_servers')
        .delete()
        .eq('id', server.id);

      if (dbError) {
        return {
          success: false,
          message: `Failed to delete MCP server: ${dbError.message}`,
        };
      }

      return {
        success: true,
        result: { deleted: server.name },
        message: `🗑️ MCP server "${server.name}" has been deleted.`,
      };
    }

    case 'mcp_get_url': {
      const { server_name, server_id } = data as {
        server_name?: string;
        server_id?: string;
      };

      if (!server_name && !server_id) {
        return {
          success: false,
          message: "Please specify which MCP server (by name or ID).",
        };
      }

      // Find the server
      const { data: server, error: findError } = await ctx.supabase
        .from('user_mcp_servers')
        .select('*')
        .eq('user_id', ctx.userId)
        .or(server_id ? `composio_server_id.eq.${server_id}` : `name.ilike.%${server_name}%`)
        .maybeSingle();

      if (findError || !server) {
        return {
          success: false,
          message: `Could not find MCP server "${server_name || server_id}". Say "List my MCP servers" to see available servers.`,
        };
      }

      // Get URL from Composio
      const urlResult = await composioFetch<{mcp_url?: string; url?: string}>(
        '/mcp/servers/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            mcp_server_id: server.composio_server_id,
          }),
        }
      );

      if (!urlResult.success || !urlResult.data) {
        return {
          success: false,
          message: `Failed to get MCP URL: ${urlResult.error || 'Unknown error'}`,
        };
      }

      const mcpUrl = urlResult.data.mcp_url || urlResult.data.url;

      // Update stored URL
      if (mcpUrl) {
        await ctx.supabase
          .from('user_mcp_servers')
          .update({ mcp_url: mcpUrl })
          .eq('id', server.id);
      }

      return {
        success: true,
        result: { url: mcpUrl, serverName: server.name },
        message: `🔗 **MCP Server URL for "${server.name}"**\n\n` +
          `\`\`\`\n${mcpUrl}\n\`\`\`\n\n` +
          `**How to use:**\n` +
          `1. Copy the URL above\n` +
          `2. Add it to your AI tool's MCP configuration\n\n` +
          `**Example for Claude Desktop:**\n` +
          `\`\`\`json\n{\n  "mcpServers": {\n    "${server.name}": {\n      "type": "http",\n      "url": "${mcpUrl}"\n    }\n  }\n}\n\`\`\`\n\n` +
          `Your connected tools (${server.toolkits?.join(', ')}) will be accessible through this MCP endpoint.`,
      };
    }

    default:
      return {
        success: false,
        message: `Unknown Composio action: ${actionName}`,
      };
  }
}

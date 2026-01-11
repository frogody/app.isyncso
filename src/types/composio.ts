/**
 * Composio Integration Types
 * Type definitions for the Composio REST API integration
 */

// ============================================
// Connection & Auth Types
// ============================================

export type ConnectionStatus =
  | 'ACTIVE'    // Ready to use
  | 'INACTIVE'  // Temporarily disabled
  | 'PENDING'   // Being processed
  | 'INITIATED' // OAuth started, awaiting user
  | 'EXPIRED'   // Needs re-authentication
  | 'FAILED';   // Connection failed

export interface AuthConfig {
  id: string;
  toolkit_slug: string;
  auth_mode: 'OAUTH2' | 'API_KEY' | 'BASIC';
  is_composio_managed: boolean;
  name: string;
  scopes?: string[];
}

export interface Connection {
  id: string;
  user_id: string;
  toolkit_slug: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface OAuthInitResponse {
  redirectUrl: string;
  linkToken: string;
  connectedAccountId: string;
  expiresAt: string;
}

// ============================================
// Tool Execution Types
// ============================================

export interface ExecuteToolParams {
  connectedAccountId: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  successful: boolean;
  data?: unknown;
  error?: string;
  executionTime?: number;
}

export interface AvailableTool {
  slug: string;
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  required_params: string[];
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

// ============================================
// Trigger/Webhook Types
// ============================================

export interface Trigger {
  id: string;
  slug: string;
  name: string;
  description: string;
  toolkit_slug: string;
  config_schema?: Record<string, unknown>;
}

export interface TriggerSubscription {
  id: string;
  trigger_slug: string;
  connected_account_id: string;
  webhook_url: string;
  status: 'ACTIVE' | 'PAUSED' | 'FAILED';
  created_at: string;
}

export interface WebhookPayload {
  trigger_slug: string;
  connected_account_id: string;
  user_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ============================================
// Request/Response Types for Edge Function
// ============================================

export interface ComposioRequest {
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

export type ComposioAction =
  | 'listAuthConfigs'
  | 'initiateConnection'
  | 'getConnectionStatus'
  | 'listConnections'
  | 'disconnectAccount'
  | 'refreshConnection'
  | 'executeTool'
  | 'listTools'
  | 'listTriggers'
  | 'subscribeTrigger'
  | 'unsubscribeTrigger';

export interface ComposioResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Integration Catalog Types
// ============================================

export interface IntegrationCategory {
  id: string;
  name: string;
  description: string;
  integrations: IntegrationConfig[];
}

export interface IntegrationConfig {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  popularTools?: string[];
  triggers?: string[];
}

// ============================================
// Database Types (user_integrations table)
// ============================================

export interface UserIntegration {
  id: string;
  user_id: string;
  composio_connected_account_id: string;
  toolkit_slug: string;
  status: ConnectionStatus;
  connected_at: string;
  last_used_at: string | null;
  metadata: Record<string, unknown>;
}

// ============================================
// Hook Types
// ============================================

export interface UseComposioReturn {
  loading: boolean;
  error: string | null;

  // Auth config operations
  getAuthConfigs: (toolkitSlug: string) => Promise<AuthConfig[]>;

  // Connection operations
  connect: (
    userId: string,
    authConfigId: string,
    options?: { popup?: boolean; callbackUrl?: string }
  ) => Promise<Connection>;
  waitForConnection: (
    connectedAccountId: string,
    timeoutMs?: number
  ) => Promise<Connection>;
  getConnectionStatus: (connectedAccountId: string) => Promise<Connection>;
  listConnections: (
    userId: string,
    options?: { toolkitSlug?: string; status?: ConnectionStatus }
  ) => Promise<Connection[]>;
  disconnect: (connectedAccountId: string) => Promise<void>;
  refreshConnection: (connectedAccountId: string) => Promise<Connection>;

  // Tool operations
  executeTool: (
    toolSlug: string,
    params: ExecuteToolParams
  ) => Promise<ToolResult>;
  listTools: (toolkitSlug: string) => Promise<AvailableTool[]>;

  // Trigger operations
  listTriggers: (toolkitSlug: string) => Promise<Trigger[]>;
  subscribeTrigger: (
    triggerSlug: string,
    connectedAccountId: string,
    webhookUrl: string,
    config?: Record<string, unknown>
  ) => Promise<TriggerSubscription>;
  unsubscribeTrigger: (subscriptionId: string) => Promise<void>;
}

// ============================================
// Integration Catalog
// ============================================

export const INTEGRATION_CATALOG: IntegrationConfig[] = [
  // CRM & Sales
  {
    slug: 'hubspot',
    name: 'HubSpot',
    description: 'CRM, marketing automation, sales tools',
    icon: 'hubspot',
    color: '#FF7A59',
    category: 'CRM & Sales',
    popularTools: ['HUBSPOT_CREATE_CONTACT', 'HUBSPOT_CREATE_DEAL', 'HUBSPOT_SEND_EMAIL'],
    triggers: ['HUBSPOT_NEW_CONTACT', 'HUBSPOT_DEAL_STAGE_CHANGE'],
  },
  {
    slug: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise CRM platform',
    icon: 'salesforce',
    color: '#00A1E0',
    category: 'CRM & Sales',
    popularTools: ['SALESFORCE_CREATE_LEAD', 'SALESFORCE_UPDATE_OPPORTUNITY'],
  },
  {
    slug: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sales pipeline management',
    icon: 'pipedrive',
    color: '#21A97E',
    category: 'CRM & Sales',
  },
  {
    slug: 'zohocrm',
    name: 'Zoho CRM',
    description: 'Customer relationship management',
    icon: 'zoho',
    color: '#DC2626',
    category: 'CRM & Sales',
  },

  // Communication
  {
    slug: 'slack',
    name: 'Slack',
    description: 'Team messaging and collaboration',
    icon: 'slack',
    color: '#4A154B',
    category: 'Communication',
    popularTools: ['SLACK_SEND_MESSAGE', 'SLACK_CREATE_CHANNEL', 'SLACK_LIST_CHANNELS'],
    triggers: ['SLACK_NEW_MESSAGE'],
  },
  {
    slug: 'microsoft_teams',
    name: 'Microsoft Teams',
    description: 'Team collaboration and video calls',
    icon: 'microsoft-teams',
    color: '#5059C9',
    category: 'Communication',
  },
  {
    slug: 'discord',
    name: 'Discord',
    description: 'Community chat platform',
    icon: 'discord',
    color: '#5865F2',
    category: 'Communication',
  },
  {
    slug: 'zoom',
    name: 'Zoom',
    description: 'Video conferencing',
    icon: 'zoom',
    color: '#2D8CFF',
    category: 'Communication',
    popularTools: ['ZOOM_CREATE_MEETING', 'ZOOM_LIST_MEETINGS'],
  },

  // Email & Calendar
  {
    slug: 'gmail',
    name: 'Gmail',
    description: 'Email service by Google',
    icon: 'gmail',
    color: '#EA4335',
    category: 'Email & Calendar',
    popularTools: ['GMAIL_SEND_EMAIL', 'GMAIL_FETCH_EMAILS', 'GMAIL_CREATE_DRAFT'],
    triggers: ['GMAIL_NEW_MESSAGE_RECEIVED'],
  },
  {
    slug: 'googlecalendar',
    name: 'Google Calendar',
    description: 'Calendar and scheduling',
    icon: 'google-calendar',
    color: '#4285F4',
    category: 'Email & Calendar',
    popularTools: ['GOOGLECALENDAR_CREATE_EVENT', 'GOOGLECALENDAR_LIST_EVENTS'],
    triggers: ['GOOGLECALENDAR_EVENT_CREATED'],
  },
  {
    slug: 'outlook',
    name: 'Outlook',
    description: 'Microsoft email and calendar',
    icon: 'outlook',
    color: '#0078D4',
    category: 'Email & Calendar',
    popularTools: ['OUTLOOK_SEND_EMAIL', 'OUTLOOK_LIST_EMAILS'],
  },

  // Project Management
  {
    slug: 'notion',
    name: 'Notion',
    description: 'All-in-one workspace',
    icon: 'notion',
    color: '#000000',
    category: 'Project Management',
    popularTools: ['NOTION_CREATE_PAGE', 'NOTION_QUERY_DATABASE', 'NOTION_UPDATE_PAGE'],
  },
  {
    slug: 'asana',
    name: 'Asana',
    description: 'Work management platform',
    icon: 'asana',
    color: '#F06A6A',
    category: 'Project Management',
    popularTools: ['ASANA_CREATE_TASK', 'ASANA_LIST_PROJECTS'],
  },
  {
    slug: 'trello',
    name: 'Trello',
    description: 'Kanban-style boards',
    icon: 'trello',
    color: '#0079BF',
    category: 'Project Management',
  },
  {
    slug: 'jira',
    name: 'Jira',
    description: 'Issue and project tracking',
    icon: 'jira',
    color: '#0052CC',
    category: 'Project Management',
    popularTools: ['JIRA_CREATE_ISSUE', 'JIRA_UPDATE_ISSUE', 'JIRA_LIST_ISSUES'],
  },
  {
    slug: 'monday',
    name: 'Monday.com',
    description: 'Work OS platform',
    icon: 'monday',
    color: '#FF3D57',
    category: 'Project Management',
  },
  {
    slug: 'clickup',
    name: 'ClickUp',
    description: 'Productivity platform',
    icon: 'clickup',
    color: '#7B68EE',
    category: 'Project Management',
  },
  {
    slug: 'linear',
    name: 'Linear',
    description: 'Issue tracking for modern teams',
    icon: 'linear',
    color: '#5E6AD2',
    category: 'Project Management',
    popularTools: ['LINEAR_CREATE_ISSUE', 'LINEAR_UPDATE_ISSUE'],
  },

  // File Storage
  {
    slug: 'googledrive',
    name: 'Google Drive',
    description: 'Cloud file storage',
    icon: 'google-drive',
    color: '#4285F4',
    category: 'File Storage',
    popularTools: ['GOOGLEDRIVE_UPLOAD_FILE', 'GOOGLEDRIVE_LIST_FILES'],
  },
  {
    slug: 'dropbox',
    name: 'Dropbox',
    description: 'File hosting service',
    icon: 'dropbox',
    color: '#0061FF',
    category: 'File Storage',
  },
  {
    slug: 'onedrive',
    name: 'OneDrive',
    description: 'Microsoft cloud storage',
    icon: 'onedrive',
    color: '#0078D4',
    category: 'File Storage',
  },
  {
    slug: 'box',
    name: 'Box',
    description: 'Secure cloud content management',
    icon: 'box',
    color: '#0061D5',
    category: 'File Storage',
  },

  // Finance
  {
    slug: 'quickbooks',
    name: 'QuickBooks',
    description: 'Accounting software',
    icon: 'quickbooks',
    color: '#2CA01C',
    category: 'Finance',
    popularTools: ['QUICKBOOKS_CREATE_INVOICE', 'QUICKBOOKS_LIST_CUSTOMERS'],
  },
  {
    slug: 'stripe',
    name: 'Stripe',
    description: 'Payment processing',
    icon: 'stripe',
    color: '#635BFF',
    category: 'Finance',
    popularTools: ['STRIPE_CREATE_CUSTOMER', 'STRIPE_LIST_PAYMENTS'],
  },
  {
    slug: 'xero',
    name: 'Xero',
    description: 'Cloud accounting',
    icon: 'xero',
    color: '#13B5EA',
    category: 'Finance',
  },

  // Support
  {
    slug: 'zendesk',
    name: 'Zendesk',
    description: 'Customer service platform',
    icon: 'zendesk',
    color: '#03363D',
    category: 'Support',
    popularTools: ['ZENDESK_CREATE_TICKET', 'ZENDESK_LIST_TICKETS'],
  },
  {
    slug: 'intercom',
    name: 'Intercom',
    description: 'Customer messaging platform',
    icon: 'intercom',
    color: '#1F8CEB',
    category: 'Support',
  },
  {
    slug: 'freshdesk',
    name: 'Freshdesk',
    description: 'Customer support software',
    icon: 'freshdesk',
    color: '#25C16F',
    category: 'Support',
  },

  // Social
  {
    slug: 'linkedin',
    name: 'LinkedIn',
    description: 'Professional networking',
    icon: 'linkedin',
    color: '#0A66C2',
    category: 'Social',
    popularTools: ['LINKEDIN_SEND_MESSAGE', 'LINKEDIN_SEARCH_PEOPLE'],
  },
  {
    slug: 'twitter',
    name: 'Twitter/X',
    description: 'Social media platform',
    icon: 'twitter',
    color: '#000000',
    category: 'Social',
    popularTools: ['TWITTER_POST_TWEET', 'TWITTER_SEARCH_TWEETS'],
  },

  // Other
  {
    slug: 'airtable',
    name: 'Airtable',
    description: 'Spreadsheet-database hybrid',
    icon: 'airtable',
    color: '#18BFFF',
    category: 'Other',
    popularTools: ['AIRTABLE_CREATE_RECORD', 'AIRTABLE_LIST_RECORDS'],
  },
  {
    slug: 'github',
    name: 'GitHub',
    description: 'Code hosting platform',
    icon: 'github',
    color: '#181717',
    category: 'Other',
    popularTools: ['GITHUB_CREATE_ISSUE', 'GITHUB_CREATE_PR'],
    triggers: ['GITHUB_PUSH', 'GITHUB_PR_CREATED'],
  },
  {
    slug: 'shopify',
    name: 'Shopify',
    description: 'E-commerce platform',
    icon: 'shopify',
    color: '#7AB55C',
    category: 'Other',
    popularTools: ['SHOPIFY_CREATE_ORDER', 'SHOPIFY_LIST_PRODUCTS'],
  },
];

// Group integrations by category
export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  {
    id: 'crm-sales',
    name: 'CRM & Sales',
    description: 'Customer relationship and sales management',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'CRM & Sales'),
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Team messaging and collaboration',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'Communication'),
  },
  {
    id: 'email-calendar',
    name: 'Email & Calendar',
    description: 'Email and scheduling services',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'Email & Calendar'),
  },
  {
    id: 'project-management',
    name: 'Project Management',
    description: 'Task and project tracking',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'Project Management'),
  },
  {
    id: 'file-storage',
    name: 'File Storage',
    description: 'Cloud storage and file sharing',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'File Storage'),
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Accounting and payment processing',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'Finance'),
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Customer service platforms',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'Support'),
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Social media platforms',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'Social'),
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Additional integrations',
    integrations: INTEGRATION_CATALOG.filter(i => i.category === 'Other'),
  },
];

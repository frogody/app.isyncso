/**
 * Composio Utility Functions
 * Helper functions for working with Composio integrations
 */

// ============================================
// Integration Catalog
// ============================================

/**
 * All available integrations with their configuration
 */
export const INTEGRATION_CATALOG = [
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
    popularTools: ['MICROSOFT_TEAMS_SEND_MESSAGE', 'MICROSOFT_TEAMS_CREATE_MEETING', 'MICROSOFT_TEAMS_LIST_CHATS', 'MICROSOFT_TEAMS_GET_CHAT_MESSAGES'],
    triggers: ['MICROSOFT_TEAMS_NEW_MESSAGE'],
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
    triggers: ['OUTLOOK_MESSAGE_TRIGGER', 'OUTLOOK_CALENDAR_EVENT_TRIGGER', 'OUTLOOK_CONTACT_TRIGGER', 'OUTLOOK_MAIL_FOLDER_TRIGGER', 'OUTLOOK_DRAFT_TRIGGER'],
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
    slug: 'googlesheets',
    name: 'Google Sheets',
    description: 'Spreadsheet and data management',
    icon: 'google-sheets',
    color: '#0F9D58',
    category: 'File Storage',
    popularTools: ['GOOGLESHEETS_ADD_ROW', 'GOOGLESHEETS_GET_VALUES', 'GOOGLESHEETS_UPDATE_CELL', 'GOOGLESHEETS_CREATE_SPREADSHEET'],
    triggers: ['GOOGLESHEETS_ROW_ADDED'],
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

/**
 * Get integration categories
 */
export const INTEGRATION_CATEGORIES = [
  { id: 'crm-sales', name: 'CRM & Sales', description: 'Customer relationship and sales management' },
  { id: 'communication', name: 'Communication', description: 'Team messaging and collaboration' },
  { id: 'email-calendar', name: 'Email & Calendar', description: 'Email and scheduling services' },
  { id: 'project-management', name: 'Project Management', description: 'Task and project tracking' },
  { id: 'file-storage', name: 'File Storage', description: 'Cloud storage and file sharing' },
  { id: 'finance', name: 'Finance', description: 'Accounting and payment processing' },
  { id: 'support', name: 'Support', description: 'Customer service platforms' },
  { id: 'social', name: 'Social', description: 'Social media platforms' },
  { id: 'other', name: 'Other', description: 'Additional integrations' },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get integration config by slug
 */
export function getIntegration(slug) {
  return INTEGRATION_CATALOG.find((i) => i.slug === slug);
}

/**
 * Get integrations by category
 */
export function getIntegrationsByCategory(category) {
  return INTEGRATION_CATALOG.filter((i) => i.category === category);
}

/**
 * Get all category names
 */
export function getCategoryNames() {
  return [...new Set(INTEGRATION_CATALOG.map((i) => i.category))];
}

/**
 * Group integrations by category
 */
export function getGroupedIntegrations() {
  const grouped = {};
  for (const integration of INTEGRATION_CATALOG) {
    if (!grouped[integration.category]) {
      grouped[integration.category] = [];
    }
    grouped[integration.category].push(integration);
  }
  return grouped;
}

/**
 * Search integrations
 */
export function searchIntegrations(query) {
  const lowerQuery = query.toLowerCase();
  return INTEGRATION_CATALOG.filter(
    (i) =>
      i.name.toLowerCase().includes(lowerQuery) ||
      i.slug.toLowerCase().includes(lowerQuery) ||
      i.description.toLowerCase().includes(lowerQuery) ||
      i.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Format connection status for display
 */
export function formatConnectionStatus(status) {
  const statusMap = {
    ACTIVE: { label: 'Connected', color: 'green', icon: 'check-circle' },
    INACTIVE: { label: 'Inactive', color: 'gray', icon: 'pause-circle' },
    PENDING: { label: 'Pending', color: 'yellow', icon: 'clock' },
    INITIATED: { label: 'Connecting...', color: 'blue', icon: 'loader' },
    EXPIRED: { label: 'Expired', color: 'red', icon: 'alert-circle' },
    FAILED: { label: 'Failed', color: 'red', icon: 'x-circle' },
  };

  return statusMap[status] || { label: status, color: 'gray', icon: 'help-circle' };
}

/**
 * Build tool slug from toolkit and action
 */
export function buildToolSlug(toolkitSlug, action) {
  return `${toolkitSlug.toUpperCase()}_${action.toUpperCase()}`;
}

/**
 * Parse tool slug to get toolkit and action
 */
export function parseToolSlug(toolSlug) {
  const parts = toolSlug.split('_');
  if (parts.length < 2) return { toolkit: toolSlug, action: '' };

  const toolkit = parts[0].toLowerCase();
  const action = parts.slice(1).join('_');
  return { toolkit, action };
}

/**
 * Get webhook URL for triggers
 */
export function getWebhookUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
  return `${supabaseUrl}/functions/v1/composio-webhooks`;
}

/**
 * Common tool argument helpers
 */
export const ToolHelpers = {
  /**
   * Gmail: Send email
   */
  gmail: {
    sendEmail: (to, subject, body, isHtml = false) => ({
      toolSlug: 'GMAIL_SEND_EMAIL',
      arguments: {
        recipient_email: to,
        subject,
        body,
        is_html: isHtml,
      },
    }),

    fetchEmails: (maxResults = 10, query = '') => ({
      toolSlug: 'GMAIL_FETCH_EMAILS',
      arguments: { max_results: maxResults, query },
    }),
  },

  /**
   * Slack: Send message
   */
  slack: {
    sendMessage: (channel, text) => ({
      toolSlug: 'SLACK_SEND_MESSAGE',
      arguments: { channel, text },
    }),

    createChannel: (name, isPrivate = false) => ({
      toolSlug: 'SLACK_CREATE_CHANNEL',
      arguments: { name, is_private: isPrivate },
    }),
  },

  /**
   * HubSpot: CRM operations
   */
  hubspot: {
    createContact: (email, firstName, lastName, company = '') => ({
      toolSlug: 'HUBSPOT_CREATE_CONTACT',
      arguments: {
        email,
        firstname: firstName,
        lastname: lastName,
        company,
      },
    }),

    createDeal: (name, amount, stage = 'appointmentscheduled') => ({
      toolSlug: 'HUBSPOT_CREATE_DEAL',
      arguments: { dealname: name, amount, dealstage: stage },
    }),
  },

  /**
   * Google Calendar: Calendar operations
   */
  googleCalendar: {
    createEvent: (summary, startDateTime, endDateTime, attendees = []) => ({
      toolSlug: 'GOOGLECALENDAR_CREATE_EVENT',
      arguments: {
        summary,
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        attendees,
      },
    }),

    listEvents: (maxResults = 10) => ({
      toolSlug: 'GOOGLECALENDAR_LIST_EVENTS',
      arguments: { max_results: maxResults },
    }),
  },

  /**
   * Notion: Workspace operations
   */
  notion: {
    createPage: (parentId, title, content = '') => ({
      toolSlug: 'NOTION_CREATE_PAGE',
      arguments: {
        parent_id: parentId,
        title,
        content,
      },
    }),

    queryDatabase: (databaseId, filter = {}) => ({
      toolSlug: 'NOTION_QUERY_DATABASE',
      arguments: { database_id: databaseId, filter },
    }),
  },

  /**
   * Jira: Issue tracking
   */
  jira: {
    createIssue: (projectKey, summary, issueType = 'Task', description = '') => ({
      toolSlug: 'JIRA_CREATE_ISSUE',
      arguments: {
        project_key: projectKey,
        summary,
        issue_type: issueType,
        description,
      },
    }),
  },

  /**
   * LinkedIn: Social posting
   */
  linkedin: {
    createPost: (text, mediaUrl = null) => ({
      toolSlug: 'LINKEDIN_CREATE_POST',
      arguments: {
        text,
        ...(mediaUrl && { media_url: mediaUrl }),
      },
    }),
  },

  /**
   * Twitter/X: Social posting
   */
  twitter: {
    postTweet: (text, mediaUrl = null) => ({
      toolSlug: 'TWITTER_POST_TWEET',
      arguments: {
        text,
        ...(mediaUrl && { media_url: mediaUrl }),
      },
    }),
  },

  /**
   * Google Sheets: Spreadsheet operations
   */
  googleSheets: {
    createSpreadsheet: (title) => ({
      toolSlug: 'GOOGLESHEETS_CREATE_SPREADSHEET',
      arguments: { title },
    }),

    addRow: (spreadsheetId, values, sheetName = 'Sheet1') => ({
      toolSlug: 'GOOGLESHEETS_ADD_ROW',
      arguments: {
        spreadsheet_id: spreadsheetId,
        values,
        sheet_name: sheetName,
      },
    }),

    updateCell: (spreadsheetId, cell, value) => ({
      toolSlug: 'GOOGLESHEETS_UPDATE_CELL',
      arguments: {
        spreadsheet_id: spreadsheetId,
        cell,  // e.g., "A1" or "Sheet1!B2"
        value,
      },
    }),

    getValues: (spreadsheetId, range) => ({
      toolSlug: 'GOOGLESHEETS_GET_VALUES',
      arguments: {
        spreadsheet_id: spreadsheetId,
        range,  // e.g., "Sheet1!A1:D10"
      },
    }),

    searchSpreadsheets: (query = '') => ({
      toolSlug: 'GOOGLESHEETS_SEARCH_SPREADSHEETS',
      arguments: { query },
    }),

    deleteRow: (spreadsheetId, rowIndex, sheetName = 'Sheet1') => ({
      toolSlug: 'GOOGLESHEETS_DELETE_ROW',
      arguments: {
        spreadsheet_id: spreadsheetId,
        row_index: rowIndex,
        sheet_name: sheetName,
      },
    }),

    getSheetNames: (spreadsheetId) => ({
      toolSlug: 'GOOGLESHEETS_GET_SHEET_NAMES',
      arguments: { spreadsheet_id: spreadsheetId },
    }),
  },

  /**
   * Microsoft Teams: Team collaboration
   */
  microsoftTeams: {
    sendMessage: (chatIdOrChannelId, message, isChatId = true) => ({
      toolSlug: 'MICROSOFT_TEAMS_SEND_MESSAGE',
      arguments: {
        [isChatId ? 'chat_id' : 'channel_id']: chatIdOrChannelId,
        message,
        content_type: 'text',
      },
    }),

    createMeeting: (subject, startTime, endTime, attendees = []) => ({
      toolSlug: 'MICROSOFT_TEAMS_CREATE_MEETING',
      arguments: {
        subject,
        start_time: startTime,
        end_time: endTime,
        attendees,
      },
    }),

    listChats: () => ({
      toolSlug: 'MICROSOFT_TEAMS_LIST_CHATS',
      arguments: {},
    }),

    getChatMessages: (chatId, limit = 20) => ({
      toolSlug: 'MICROSOFT_TEAMS_GET_CHAT_MESSAGES',
      arguments: {
        chat_id: chatId,
        limit,
      },
    }),

    createTeam: (displayName, description = '', visibility = 'private') => ({
      toolSlug: 'MICROSOFT_TEAMS_CREATE_TEAM',
      arguments: {
        display_name: displayName,
        description,
        visibility,
      },
    }),

    addMember: (teamId, userEmail, role = 'member') => ({
      toolSlug: 'MICROSOFT_TEAMS_ADD_MEMBER',
      arguments: {
        team_id: teamId,
        user_email: userEmail,
        role,
      },
    }),

    createChannel: (teamId, displayName, description = '', membershipType = 'standard') => ({
      toolSlug: 'MICROSOFT_TEAMS_CREATE_CHANNEL',
      arguments: {
        team_id: teamId,
        display_name: displayName,
        description,
        membership_type: membershipType,
      },
    }),
  },
};

export default {
  INTEGRATION_CATALOG,
  INTEGRATION_CATEGORIES,
  getIntegration,
  getIntegrationsByCategory,
  getCategoryNames,
  getGroupedIntegrations,
  searchIntegrations,
  formatConnectionStatus,
  buildToolSlug,
  parseToolSlug,
  getWebhookUrl,
  ToolHelpers,
};

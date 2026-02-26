/**
 * Composio Utility Functions
 * Helper functions for working with Composio integrations
 */

// ============================================
// Inline SVG logos for brands removed from SimpleIcons CDN
// ============================================
const INLINE_LOGOS = {
  salesforce: (color) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${color}"><path d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.159 5.22c-.45 0-.884-.06-1.305-.165a3.975 3.975 0 0 1-3.39 1.905 3.97 3.97 0 0 1-1.8-.435A4.499 4.499 0 0 1 8.1 20.1a4.501 4.501 0 0 1-1.65-.315 3.705 3.705 0 0 1-3.39 2.235C1.38 22.02 0 20.64 0 18.96c0-1.005.51-1.905 1.275-2.46A4.426 4.426 0 0 1 .96 15.18c0-1.59.855-2.985 2.13-3.78a3.87 3.87 0 0 1-.345-1.62c0-2.22 1.8-4.02 4.02-4.02 1.2 0 2.295.54 3.045 1.395l.195.255z"/></svg>`)}`,
  microsoftteams: (color) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${color}"><path d="M20.625 7.5h-1.5V6a2.25 2.25 0 0 0-2.25-2.25h-.75a1.875 1.875 0 1 1 2.625-1.688A1.875 1.875 0 0 1 21.375 4.5h.75A1.875 1.875 0 0 1 24 6.375v2.25A1.875 1.875 0 0 1 22.125 10.5h-.375a3 3 0 0 0-1.125-3zm-4.5 0h-2.25V6A2.25 2.25 0 0 0 11.625 3.75h-4.5a.75.75 0 0 0-.75.75v6.75a.75.75 0 0 0 .75.75h4.5a2.25 2.25 0 0 0 2.25-2.25V7.5zm-9 1.5v6.75A2.25 2.25 0 0 0 9.375 18h4.5a.75.75 0 0 0 .75-.75V10.5a.75.75 0 0 0-.75-.75h-4.5a2.25 2.25 0 0 0-2.25 2.25zM16.125 10.5v5.25A3.375 3.375 0 0 1 12.75 19.125h-3.375A3 3 0 0 0 12 21h6a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-1.875z"/></svg>`)}`,
  microsoftoutlook: (color) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${color}"><path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.01V2.62q0-.46.33-.8.33-.33.8-.33h14.54q.46 0 .8.34.32.33.32.8zM7.01 11.54q0-.74-.14-1.36-.14-.62-.44-1.06-.3-.44-.76-.7-.46-.24-1.08-.24-.63 0-1.08.25-.46.26-.76.7-.3.44-.43 1.06-.14.62-.14 1.35t.14 1.35q.14.62.43 1.06.3.44.77.7.45.25 1.07.25.62 0 1.08-.25.45-.26.76-.7.3-.45.44-1.07.14-.62.14-1.34zm9.99 7.16V8.25h-5v1.12q.47-.6 1.09-.93.63-.32 1.45-.32.93 0 1.6.43.7.42 1.15 1.1.47.69.69 1.54.22.85.22 1.76 0 .78-.15 1.53-.16.74-.51 1.33-.34.6-.88.96-.54.36-1.3.36-.57 0-1.03-.18-.46-.18-.84-.49-.38-.3-.63-.72-.25-.4-.35-.84v.27l-.01 1.53V21h-2V8.25H8v10.45zm2.59-4.66q0-.42-.06-.84-.06-.42-.21-.76-.14-.34-.38-.57-.24-.22-.6-.22-.38 0-.63.24-.25.24-.4.6-.14.36-.2.77-.05.42-.05.82 0 .39.05.79.05.4.2.73.15.33.4.54.24.21.63.21.35 0 .6-.22.24-.22.38-.58.15-.35.21-.77.06-.42.06-.78z"/></svg>`)}`,
  mondaydotcom: (color) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${color}"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-3.6 14.4a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zm3.6-3a3 3 0 0 1-3-3V7.8a1.2 1.2 0 0 1 2.4 0v2.6a.6.6 0 0 0 1.2 0V7.8a1.2 1.2 0 0 1 2.4 0v2.6a3 3 0 0 1-3 3zm5.4 3a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6z"/></svg>`)}`,
  microsoftonedrive: (color) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${color}"><path d="M19.453 9.95A5.998 5.998 0 0 0 8.01 8.16a4.8 4.8 0 0 0-1.778 9.238l.026.008h12.569l.025-.008A3.6 3.6 0 0 0 19.453 9.95zM18.852 16.2H6.258l-.013-.004a3.6 3.6 0 0 1 1.34-6.937l.373.037.201-.317A4.798 4.798 0 0 1 17.1 10.2v.006l.205-.006.347.032a2.4 2.4 0 0 1 1.2 4.568z"/></svg>`)}`,
  linkedin: (color) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${color}"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`)}`,
  pipedrive: (color) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${color}"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1.8 14.4h-1.2v1.8a1.2 1.2 0 0 1-2.4 0v-1.8H9a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h1.2V4.8a1.2 1.2 0 0 1 2.4 0V6H13.8a3 3 0 0 1 3 3v4.4a3 3 0 0 1-3 3zm.6-7.4a.6.6 0 0 0-.6-.6H9a.6.6 0 0 0-.6.6v4.4a.6.6 0 0 0 .6.6h4.8a.6.6 0 0 0 .6-.6V9z"/></svg>`)}`,
  freshdesk: (color) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${color}"><path d="M21 7.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V12a9 9 0 0 0 18 0V7.5zM9 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>`)}`,
};

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
    logoUrl: 'https://cdn.simpleicons.org/hubspot/FF7A59',
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
    logoUrl: INLINE_LOGOS.salesforce('00A1E0'),
    category: 'CRM & Sales',
  },
  {
    slug: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sales pipeline management',
    icon: 'pipedrive',
    color: '#21A97E',
    logoUrl: INLINE_LOGOS.pipedrive('21A97E'),
    category: 'CRM & Sales',
  },
  {
    slug: 'zohocrm',
    name: 'Zoho CRM',
    description: 'Customer relationship management',
    icon: 'zoho',
    color: '#DC2626',
    logoUrl: 'https://cdn.simpleicons.org/zoho/DC2626',
    category: 'CRM & Sales',
  },

  // Communication
  {
    slug: 'slack',
    name: 'Slack',
    description: 'Team messaging and collaboration',
    icon: 'slack',
    color: '#4A154B',
    logoUrl: 'https://cdn.simpleicons.org/slack/4A154B',
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
    logoUrl: INLINE_LOGOS.microsoftteams('5059C9'),
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
    logoUrl: 'https://cdn.simpleicons.org/discord/5865F2',
    category: 'Communication',
  },
  {
    slug: 'zoom',
    name: 'Zoom',
    description: 'Video conferencing',
    icon: 'zoom',
    color: '#2D8CFF',
    logoUrl: 'https://cdn.simpleicons.org/zoom/2D8CFF',
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
    logoUrl: 'https://cdn.simpleicons.org/gmail/EA4335',
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
    logoUrl: 'https://cdn.simpleicons.org/googlecalendar/4285F4',
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
    logoUrl: INLINE_LOGOS.microsoftoutlook('0078D4'),
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
    logoUrl: 'https://cdn.simpleicons.org/notion/ffffff',
    category: 'Project Management',
    popularTools: ['NOTION_CREATE_PAGE', 'NOTION_QUERY_DATABASE', 'NOTION_UPDATE_PAGE'],
  },
  {
    slug: 'asana',
    name: 'Asana',
    description: 'Work management platform',
    icon: 'asana',
    color: '#F06A6A',
    logoUrl: 'https://cdn.simpleicons.org/asana/F06A6A',
    category: 'Project Management',
    popularTools: ['ASANA_CREATE_TASK', 'ASANA_LIST_PROJECTS'],
  },
  {
    slug: 'trello',
    name: 'Trello',
    description: 'Kanban-style boards',
    icon: 'trello',
    color: '#0079BF',
    logoUrl: 'https://cdn.simpleicons.org/trello/0079BF',
    category: 'Project Management',
  },
  {
    slug: 'jira',
    name: 'Jira',
    description: 'Issue and project tracking',
    icon: 'jira',
    color: '#0052CC',
    logoUrl: 'https://cdn.simpleicons.org/jira/0052CC',
    category: 'Project Management',
    popularTools: ['JIRA_CREATE_ISSUE', 'JIRA_UPDATE_ISSUE', 'JIRA_LIST_ISSUES'],
  },
  {
    slug: 'monday',
    name: 'Monday.com',
    description: 'Work OS platform',
    icon: 'monday',
    color: '#FF3D57',
    logoUrl: INLINE_LOGOS.mondaydotcom('FF3D57'),
    category: 'Project Management',
  },
  {
    slug: 'clickup',
    name: 'ClickUp',
    description: 'Productivity platform',
    icon: 'clickup',
    color: '#7B68EE',
    logoUrl: 'https://cdn.simpleicons.org/clickup/7B68EE',
    category: 'Project Management',
  },
  {
    slug: 'linear',
    name: 'Linear',
    description: 'Issue tracking for modern teams',
    icon: 'linear',
    color: '#5E6AD2',
    logoUrl: 'https://cdn.simpleicons.org/linear/5E6AD2',
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
    logoUrl: 'https://cdn.simpleicons.org/googledrive/4285F4',
    category: 'File Storage',
    popularTools: ['GOOGLEDRIVE_UPLOAD_FILE', 'GOOGLEDRIVE_LIST_FILES'],
  },
  {
    slug: 'googlesheets',
    name: 'Google Sheets',
    description: 'Spreadsheet and data management',
    icon: 'google-sheets',
    color: '#0F9D58',
    logoUrl: 'https://cdn.simpleicons.org/googlesheets/0F9D58',
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
    logoUrl: 'https://cdn.simpleicons.org/dropbox/0061FF',
    category: 'File Storage',
  },
  {
    slug: 'onedrive',
    name: 'OneDrive',
    description: 'Microsoft cloud storage',
    icon: 'onedrive',
    color: '#0078D4',
    logoUrl: INLINE_LOGOS.microsoftonedrive('0078D4'),
    category: 'File Storage',
  },
  {
    slug: 'box',
    name: 'Box',
    description: 'Secure cloud content management',
    icon: 'box',
    color: '#0061D5',
    logoUrl: 'https://cdn.simpleicons.org/box/0061D5',
    category: 'File Storage',
  },

  // Finance
  {
    slug: 'quickbooks',
    name: 'QuickBooks',
    description: 'Accounting software',
    icon: 'quickbooks',
    color: '#2CA01C',
    logoUrl: 'https://cdn.simpleicons.org/quickbooks/2CA01C',
    category: 'Finance',
    popularTools: ['QUICKBOOKS_CREATE_INVOICE', 'QUICKBOOKS_LIST_CUSTOMERS'],
  },
  {
    slug: 'stripe',
    name: 'Stripe',
    description: 'Payment processing',
    icon: 'stripe',
    color: '#635BFF',
    logoUrl: 'https://cdn.simpleicons.org/stripe/635BFF',
    category: 'Finance',
    popularTools: ['STRIPE_CREATE_CUSTOMER', 'STRIPE_LIST_PAYMENTS'],
  },
  {
    slug: 'xero',
    name: 'Xero',
    description: 'Cloud accounting',
    icon: 'xero',
    color: '#13B5EA',
    logoUrl: 'https://cdn.simpleicons.org/xero/13B5EA',
    category: 'Finance',
  },

  // Support
  {
    slug: 'zendesk',
    name: 'Zendesk',
    description: 'Customer service platform',
    icon: 'zendesk',
    color: '#03363D',
    logoUrl: 'https://cdn.simpleicons.org/zendesk/ffffff',
    category: 'Support',
    popularTools: ['ZENDESK_CREATE_TICKET', 'ZENDESK_LIST_TICKETS'],
  },
  {
    slug: 'intercom',
    name: 'Intercom',
    description: 'Customer messaging platform',
    icon: 'intercom',
    color: '#1F8CEB',
    logoUrl: 'https://cdn.simpleicons.org/intercom/1F8CEB',
    category: 'Support',
  },
  {
    slug: 'freshdesk',
    name: 'Freshdesk',
    description: 'Customer support software',
    icon: 'freshdesk',
    color: '#25C16F',
    logoUrl: INLINE_LOGOS.freshdesk('25C16F'),
    category: 'Support',
  },

  // Social
  {
    slug: 'linkedin',
    name: 'LinkedIn',
    description: 'Professional networking',
    icon: 'linkedin',
    color: '#0A66C2',
    logoUrl: INLINE_LOGOS.linkedin('0A66C2'),
    category: 'Social',
    popularTools: ['LINKEDIN_SEND_MESSAGE', 'LINKEDIN_SEARCH_PEOPLE'],
  },
  {
    slug: 'twitter',
    name: 'Twitter/X',
    description: 'Social media platform',
    icon: 'twitter',
    color: '#000000',
    logoUrl: 'https://cdn.simpleicons.org/x/ffffff',
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
    logoUrl: 'https://cdn.simpleicons.org/airtable/18BFFF',
    category: 'Other',
    popularTools: ['AIRTABLE_CREATE_RECORD', 'AIRTABLE_LIST_RECORDS'],
  },
  {
    slug: 'github',
    name: 'GitHub',
    description: 'Code hosting platform',
    icon: 'github',
    color: '#181717',
    logoUrl: 'https://cdn.simpleicons.org/github/ffffff',
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
    logoUrl: 'https://cdn.simpleicons.org/shopify/7AB55C',
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
   * Outlook: Email
   */
  outlook: {
    sendEmail: (to, subject, body) => ({
      toolSlug: 'OUTLOOK_SEND_EMAIL',
      arguments: { recipient_email: to, subject, body },
    }),
  },

  /**
   * Outlook Calendar: Calendar operations
   */
  outlookCalendar: {
    createEvent: (subject, start, end, attendees = []) => ({
      toolSlug: 'OUTLOOKCALENDAR_CREATE_CALENDAR_EVENT',
      arguments: {
        subject,
        start_date_time: start,
        end_date_time: end,
        attendees,
      },
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

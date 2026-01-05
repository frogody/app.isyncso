import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const INTEGRATIONS_STORAGE_KEY = 'mcp_integrations';

const MCPContext = createContext(null);

export function MCPProvider({ children }) {
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load saved integrations on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
      if (saved) {
        setConnectedIntegrations(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load MCP integrations:', e);
    }
    setLoading(false);
  }, []);

  // Listen for updates from MCPIntegrations page
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === INTEGRATIONS_STORAGE_KEY) {
        try {
          const updated = e.newValue ? JSON.parse(e.newValue) : [];
          setConnectedIntegrations(updated);
        } catch (err) {
          console.error('Failed to parse updated integrations:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Get integration by ID
  const getIntegration = useCallback((id) => {
    return connectedIntegrations.find(i => i.id === id);
  }, [connectedIntegrations]);

  // Check if an integration is connected
  const isConnected = useCallback((id) => {
    return connectedIntegrations.some(i => i.id === id);
  }, [connectedIntegrations]);

  // Get active integrations (status === 'active')
  const getActiveIntegrations = useCallback(() => {
    return connectedIntegrations.filter(i => i.status === 'active');
  }, [connectedIntegrations]);

  // Get integration summary for AI context
  const getIntegrationContext = useCallback(() => {
    if (connectedIntegrations.length === 0) {
      return null;
    }

    const integrations = connectedIntegrations.map(i => ({
      name: i.name,
      type: i.isCustom ? 'custom' : 'standard',
      status: i.status,
      capabilities: getCapabilitiesForIntegration(i.id)
    }));

    return {
      count: integrations.length,
      integrations,
      summary: `Connected tools: ${integrations.map(i => i.name).join(', ')}`
    };
  }, [connectedIntegrations]);

  // Get capabilities based on integration ID
  const getCapabilitiesForIntegration = (id) => {
    const capabilitiesMap = {
      // CRM & Sales
      'hubspot': ['Manage contacts', 'Create deals', 'Track emails', 'View pipeline'],
      'salesforce': ['Manage leads', 'View opportunities', 'Access accounts', 'Run reports'],
      'pipedrive': ['Manage deals', 'Track activities', 'View pipeline', 'Contact management'],

      // Microsoft 365
      'microsoft-outlook': ['Send emails', 'Manage calendar', 'Search inbox', 'Create tasks'],
      'microsoft-teams': ['Send messages', 'Create channels', 'Schedule meetings', 'Share files'],
      'microsoft-sharepoint': ['Access files', 'Manage lists', 'Search documents', 'Share content'],
      'dynamics-365': ['View accounts', 'Manage leads', 'Track activities', 'Run reports'],
      'microsoft-word': ['Create documents', 'Edit text', 'Apply templates', 'Collaborate'],
      'microsoft-excel': ['Create spreadsheets', 'Use formulas', 'Build charts', 'Analyze data'],
      'microsoft-powerpoint': ['Create slides', 'Edit presentations', 'Add animations', 'Collaborate'],
      'microsoft-onenote': ['Create notes', 'Organize sections', 'Add tags', 'Search notes'],
      'microsoft-planner': ['Create plans', 'Assign tasks', 'Track progress', 'View charts'],
      'microsoft-todo': ['Create tasks', 'Set reminders', 'Manage lists', 'Track due dates'],
      'microsoft-power-bi': ['View dashboards', 'Run reports', 'Query datasets', 'Share insights'],
      'microsoft-power-automate': ['Create flows', 'Trigger actions', 'Automate tasks', 'Connect apps'],
      'microsoft-azure-devops': ['View repos', 'Manage pipelines', 'Track work items', 'View builds'],
      'microsoft-forms': ['Create forms', 'Collect responses', 'View analytics', 'Share surveys'],
      'microsoft-bookings': ['Schedule appointments', 'Manage staff', 'Set availability', 'Send reminders'],

      // Google Workspace
      'gmail': ['Read emails', 'Send emails', 'Search messages', 'Manage labels'],
      'google-calendar': ['View events', 'Create meetings', 'Check availability', 'Set reminders'],
      'google-drive': ['Search files', 'Upload documents', 'Share files', 'Create folders'],
      'google-docs': ['Create documents', 'Edit text', 'Add comments', 'Collaborate'],
      'google-sheets': ['Create spreadsheets', 'Use formulas', 'Build charts', 'Analyze data'],
      'google-slides': ['Create presentations', 'Add slides', 'Apply templates', 'Collaborate'],
      'google-meet': ['Schedule meetings', 'Join calls', 'Share screen', 'Record sessions'],
      'google-forms': ['Create forms', 'Collect responses', 'View analytics', 'Share surveys'],
      'google-tasks': ['Create tasks', 'Set due dates', 'Organize lists', 'Track progress'],
      'google-keep': ['Create notes', 'Make lists', 'Add labels', 'Set reminders'],
      'google-chat': ['Send messages', 'Create spaces', 'Share files', 'Start threads'],
      'google-contacts': ['Manage contacts', 'Create groups', 'Add labels', 'Sync contacts'],
      'google-sites': ['Create sites', 'Add pages', 'Publish content', 'Apply themes'],
      'google-analytics': ['View reports', 'Track visitors', 'Analyze behavior', 'Set goals'],
      'youtube': ['Manage videos', 'View analytics', 'Read comments', 'Track subscribers'],
      'google-ads': ['View campaigns', 'Track performance', 'Manage keywords', 'Run reports'],

      // Calendar & Scheduling
      'calendly': ['Create event types', 'View bookings', 'Set availability', 'Send reminders'],
      'cal-com': ['Schedule meetings', 'Create event types', 'Set workflows', 'Manage teams'],
      'acuity-scheduling': ['Book appointments', 'Manage clients', 'Set availability', 'Process payments'],
      'doodle': ['Create polls', 'Find availability', 'Schedule groups', 'Book meetings'],
      'savvycal': ['Create links', 'Set availability', 'Personalize scheduling', 'Manage teams'],
      'reclaim': ['Smart scheduling', 'Set habits', 'Sync tasks', 'Add buffer time'],
      'clockwise': ['Optimize calendar', 'Create focus time', 'Flexible meetings', 'Team analytics'],

      // Productivity
      'notion': ['Search pages', 'Create documents', 'Query databases', 'Add blocks'],
      'airtable': ['Query tables', 'Create records', 'Update data', 'Search bases'],
      'monday': ['Manage boards', 'Create items', 'Track updates', 'Run automations'],
      'todoist': ['View tasks', 'Create todos', 'Manage projects', 'Set reminders'],

      // Communication
      'slack': ['Send messages', 'Search conversations', 'Manage channels', 'Share files'],

      // Finance
      'stripe': ['View payments', 'List customers', 'Check invoices', 'View subscriptions'],
      'xero': ['Manage invoices', 'Track expenses', 'View reports', 'Reconcile accounts'],

      // Developer
      'github': ['View repos', 'Create issues', 'Review PRs', 'Check actions'],
      'jira': ['Create issues', 'Update tickets', 'View sprints', 'Search projects'],
      'confluence': ['Search pages', 'Create content', 'View spaces', 'Add comments']
    };

    return capabilitiesMap[id] || ['General operations'];
  };

  // Refresh integrations from storage
  const refreshIntegrations = useCallback(() => {
    try {
      const saved = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
      if (saved) {
        setConnectedIntegrations(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to refresh integrations:', e);
    }
  }, []);

  const value = {
    connectedIntegrations,
    loading,
    getIntegration,
    isConnected,
    getActiveIntegrations,
    getIntegrationContext,
    refreshIntegrations
  };

  return (
    <MCPContext.Provider value={value}>
      {children}
    </MCPContext.Provider>
  );
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (!context) {
    // Return a fallback when not wrapped in provider
    return {
      connectedIntegrations: [],
      loading: false,
      getIntegration: () => null,
      isConnected: () => false,
      getActiveIntegrations: () => [],
      getIntegrationContext: () => null,
      refreshIntegrations: () => {}
    };
  }
  return context;
}

export default MCPContext;

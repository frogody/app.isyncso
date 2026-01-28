import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import usePortalClient from '@/hooks/usePortalClient';

// Context for portal client state
const PortalClientContext = createContext(null);

// Context for portal settings (branding, theme)
const PortalSettingsContext = createContext(null);

/**
 * Provider component for the client portal
 * Wraps portal pages and provides client auth state + portal branding
 */
export function ClientProvider({ children }) {
  const portalClient = usePortalClient();
  const [portalSettings, setPortalSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Fetch portal settings when client is available
  useEffect(() => {
    const fetchSettings = async () => {
      if (!portalClient.client?.organization_id) {
        setSettingsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('portal_settings')
          .select('*')
          .eq('organization_id', portalClient.client.organization_id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching portal settings:', error);
        }

        setPortalSettings(data || getDefaultSettings());
      } catch (err) {
        console.error('Error fetching portal settings:', err);
        setPortalSettings(getDefaultSettings());
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, [portalClient.client?.organization_id]);

  // Apply theme CSS variables
  useEffect(() => {
    if (portalSettings) {
      document.documentElement.style.setProperty('--portal-primary', portalSettings.primary_color || '#06b6d4');
      document.documentElement.style.setProperty('--portal-accent', portalSettings.accent_color || '#10b981');
      document.documentElement.style.setProperty('--portal-bg', portalSettings.background_color || '#09090b');
    }
  }, [portalSettings]);

  const value = {
    ...portalClient,
    portalSettings,
    settingsLoading: settingsLoading || portalClient.loading,
  };

  return (
    <PortalClientContext.Provider value={value}>
      <PortalSettingsContext.Provider value={portalSettings}>
        {children}
      </PortalSettingsContext.Provider>
    </PortalClientContext.Provider>
  );
}

/**
 * Hook to access portal client context
 */
export function usePortalClientContext() {
  const context = useContext(PortalClientContext);
  if (!context) {
    throw new Error('usePortalClientContext must be used within ClientProvider');
  }
  return context;
}

/**
 * Hook to access portal settings/theme
 */
export function usePortalSettings() {
  const context = useContext(PortalSettingsContext);
  return context || getDefaultSettings();
}

/**
 * Default portal settings
 */
function getDefaultSettings() {
  return {
    portal_name: 'Client Portal',
    logo_url: null,
    favicon_url: null,
    primary_color: '#06b6d4',
    accent_color: '#10b981',
    background_color: '#09090b',
    welcome_message: 'Welcome to your project portal',
    login_background_url: null,
    footer_text: null,
    enable_comments: true,
    enable_approvals: true,
    enable_notifications: true,
    enable_file_sharing: true,
    require_approval_for_downloads: false,
  };
}

export default ClientProvider;

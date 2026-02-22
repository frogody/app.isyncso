// ---------------------------------------------------------------------------
// useBuilderPreview.js -- Manages iframe communication for the live preview
// of the B2B storefront inside the store builder.
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import supabase from '@/api/supabaseClient';

const DEVICE_DIMENSIONS = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '812px' },
};

export function useBuilderPreview() {
  const iframeRef = useRef(null);
  const [previewDevice, setPreviewDeviceState] = useState('desktop');
  const [previewLoading, setPreviewLoading] = useState(true);

  // ---- Device switching -----------------------------------------------------

  const setPreviewDevice = useCallback((device) => {
    if (DEVICE_DIMENSIONS[device]) {
      setPreviewDeviceState(device);
    }
  }, []);

  // ---- Iframe messaging -----------------------------------------------------

  /**
   * Posts a CONFIG_UPDATE message to the preview iframe so it can re-render
   * with the latest store configuration.
   */
  const sendConfigToPreview = useCallback(async (config, organizationId) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !config) return;

    // Get the current auth session token so the preview iframe can make
    // authenticated Supabase queries (products, companies are RLS-protected).
    let accessToken = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token || null;
    } catch {}

    try {
      iframe.contentWindow.postMessage(
        { type: 'CONFIG_UPDATE', config, organizationId: organizationId || null, accessToken },
        '*',
      );
    } catch (err) {
      console.error('[useBuilderPreview] Failed to post CONFIG_UPDATE:', err);
    }
  }, []);

  /**
   * Tells the preview iframe to switch to a different store page.
   */
  const navigateToPage = useCallback((pageId) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ type: 'NAVIGATE_TO_PAGE', pageId }, '*');
    } catch (err) {
      console.error('[useBuilderPreview] Failed to post NAVIGATE_TO_PAGE:', err);
    }
  }, []);

  /**
   * Posts a REFRESH message telling the preview iframe to fully reload
   * its current state.
   */
  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    setPreviewLoading(true);

    try {
      iframe.contentWindow.postMessage({ type: 'REFRESH' }, '*');
    } catch (err) {
      console.error('[useBuilderPreview] Failed to post REFRESH:', err);
    }
  }, []);

  // ---- Listen for messages from the preview iframe --------------------------

  useEffect(() => {
    const handleMessage = (event) => {
      // Basic safety: only handle objects with a `type` field
      if (!event.data || typeof event.data !== 'object' || !event.data.type) {
        return;
      }

      switch (event.data.type) {
        case 'SECTION_CLICK':
          window.dispatchEvent(
            new CustomEvent('builder:section-click', {
              detail: {
                sectionId: event.data.sectionId,
                sectionType: event.data.sectionType,
                sectionLabel: event.data.sectionLabel,
              },
            }),
          );
          break;

        case 'PREVIEW_READY':
          setPreviewLoading(false);
          break;

        case 'PREVIEW_LOADED':
          setPreviewLoading(false);
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Callback to pass as onLoad prop to the iframe element
  const onIframeLoad = useCallback(() => {
    setPreviewLoading(false);
  }, []);

  // Safety timeout: if preview hasn't signaled after 8s, clear loading
  useEffect(() => {
    if (!previewLoading) return;
    const timer = setTimeout(() => setPreviewLoading(false), 8000);
    return () => clearTimeout(timer);
  }, [previewLoading]);

  // ---- Computed dimensions for the current device ---------------------------

  const deviceDimensions = useMemo(
    () => DEVICE_DIMENSIONS[previewDevice] || DEVICE_DIMENSIONS.desktop,
    [previewDevice],
  );

  // ---- Return ---------------------------------------------------------------

  return {
    iframeRef,
    previewDevice,
    previewLoading,
    setPreviewDevice,
    sendConfigToPreview,
    navigateToPage,
    refreshPreview,
    onIframeLoad,
    deviceDimensions,
  };
}

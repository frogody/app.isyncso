// ---------------------------------------------------------------------------
// useBuilderPreview.js -- Manages iframe communication for the live preview
// of the B2B storefront inside the store builder.
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

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
  const sendConfigToPreview = useCallback((config) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !config) return;

    try {
      iframe.contentWindow.postMessage(
        { type: 'CONFIG_UPDATE', config },
        '*',
      );
    } catch (err) {
      console.error('[useBuilderPreview] Failed to post CONFIG_UPDATE:', err);
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
          // The preview communicates which section the user clicked on.
          // External consumers can listen via a custom event or the caller
          // can wire this up via onSectionClick prop if desired.
          // For now we dispatch a CustomEvent on `window`.
          window.dispatchEvent(
            new CustomEvent('builder:section-click', {
              detail: { sectionId: event.data.sectionId },
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

  // Mark loading false when the iframe fires its native load event
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => setPreviewLoading(false);
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, []);

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
    refreshPreview,
    deviceDimensions,
  };
}

// ---------------------------------------------------------------------------
// useStoreBuilder.js -- Main state management hook for the B2B Store Builder.
// Manages the full StoreConfig lifecycle: load, edit, save, publish.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from 'react';
import { updateStoreConfig, getStoreConfig } from '@/lib/db/queries/b2b';
import { DEFAULT_STORE_CONFIG, createDefaultSection } from '../utils/storeDefaults';

/**
 * Deep-merge `source` into `target`. Arrays are replaced, not concatenated.
 * Returns a new object -- never mutates inputs.
 */
function deepMerge(target, source) {
  if (!source) return target;
  if (!target) return source;

  const result = { ...target };

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      result[key] = srcVal;
    }
  }

  return result;
}

export function useStoreBuilder(organizationId) {
  // ---- Core state -----------------------------------------------------------
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [activePanel, setActivePanel] = useState('sections');
  const [storeVersion, setStoreVersion] = useState(0);

  // ---- Load config on mount -------------------------------------------------
  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await getStoreConfig(organizationId);

        if (cancelled) return;

        if (result?.store_config && Object.keys(result.store_config).length > 0) {
          // Merge persisted config with defaults so new keys are always present
          setConfig(deepMerge(DEFAULT_STORE_CONFIG, result.store_config));
          setStoreVersion(result.store_version || 0);
        } else {
          setConfig({ ...DEFAULT_STORE_CONFIG });
          setStoreVersion(0);
        }
      } catch (err) {
        console.error('[useStoreBuilder] Failed to load store config:', err);
        if (!cancelled) {
          setConfig({ ...DEFAULT_STORE_CONFIG });
          setStoreVersion(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // ---- Generic updater (marks dirty) ----------------------------------------
  const patchConfig = useCallback((patcher) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = typeof patcher === 'function' ? patcher(prev) : patcher;
      return next;
    });
    setIsDirty(true);
  }, []);

  // ---- Top-level config merge -----------------------------------------------
  const updateConfig = useCallback(
    (partialConfig) => {
      patchConfig((prev) => deepMerge(prev, partialConfig));
    },
    [patchConfig],
  );

  // ---- Scoped updaters ------------------------------------------------------
  const updateTheme = useCallback(
    (themeUpdates) => updateConfig({ theme: themeUpdates }),
    [updateConfig],
  );

  const updateNavigation = useCallback(
    (navUpdates) => updateConfig({ navigation: navUpdates }),
    [updateConfig],
  );

  const updateFooter = useCallback(
    (footerUpdates) => updateConfig({ footer: footerUpdates }),
    [updateConfig],
  );

  const updateCatalog = useCallback(
    (catalogUpdates) => updateConfig({ catalog: catalogUpdates }),
    [updateConfig],
  );

  const updateProductDetail = useCallback(
    (detailUpdates) => updateConfig({ productDetail: detailUpdates }),
    [updateConfig],
  );

  const updateSeo = useCallback(
    (seoUpdates) => updateConfig({ seo: seoUpdates }),
    [updateConfig],
  );

  // ---- Section CRUD ---------------------------------------------------------

  const addSection = useCallback(
    (type) => {
      patchConfig((prev) => {
        const newSection = createDefaultSection(type, prev.sections.length);
        return { ...prev, sections: [...prev.sections, newSection] };
      });
    },
    [patchConfig],
  );

  const removeSection = useCallback(
    (sectionId) => {
      patchConfig((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }));
      // Clear selection if the removed section was selected
      setSelectedSectionId((prev) => (prev === sectionId ? null : prev));
    },
    [patchConfig],
  );

  const updateSection = useCallback(
    (sectionId, updates) => {
      patchConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, ...updates } : s,
        ),
      }));
    },
    [patchConfig],
  );

  const updateSectionProps = useCallback(
    (sectionId, propUpdates) => {
      patchConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId
            ? { ...s, props: { ...s.props, ...propUpdates } }
            : s,
        ),
      }));
    },
    [patchConfig],
  );

  const reorderSections = useCallback(
    (newOrder) => {
      patchConfig((prev) => {
        const sectionMap = Object.fromEntries(
          prev.sections.map((s) => [s.id, s]),
        );
        const reordered = newOrder
          .map((id, index) => {
            const section = sectionMap[id];
            if (!section) return null;
            return { ...section, order: index };
          })
          .filter(Boolean);
        return { ...prev, sections: reordered };
      });
    },
    [patchConfig],
  );

  const toggleSectionVisibility = useCallback(
    (sectionId) => {
      patchConfig((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, visible: !s.visible } : s,
        ),
      }));
    },
    [patchConfig],
  );

  const selectSection = useCallback((sectionId) => {
    setSelectedSectionId(sectionId);
  }, []);

  // ---- Computed: selected section -------------------------------------------
  const selectedSection = useMemo(() => {
    if (!config || !selectedSectionId) return null;
    return config.sections.find((s) => s.id === selectedSectionId) || null;
  }, [config, selectedSectionId]);

  // ---- Persistence ----------------------------------------------------------

  const saveConfig = useCallback(async () => {
    if (!organizationId || !config) return;

    setSaving(true);
    try {
      const nextVersion = storeVersion + 1;
      await updateStoreConfig(organizationId, {
        store_config: config,
        store_version: nextVersion,
      });
      setStoreVersion(nextVersion);
      setIsDirty(false);
    } catch (err) {
      console.error('[useStoreBuilder] Failed to save config:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [organizationId, config, storeVersion]);

  const publishStore = useCallback(async () => {
    if (!organizationId) return;

    setSaving(true);
    try {
      await updateStoreConfig(organizationId, {
        store_published: true,
        store_published_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[useStoreBuilder] Failed to publish store:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [organizationId]);

  const unpublishStore = useCallback(async () => {
    if (!organizationId) return;

    setSaving(true);
    try {
      await updateStoreConfig(organizationId, {
        store_published: false,
      });
    } catch (err) {
      console.error('[useStoreBuilder] Failed to unpublish store:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [organizationId]);

  const applyTemplate = useCallback(
    (templateConfig) => {
      patchConfig(deepMerge(DEFAULT_STORE_CONFIG, templateConfig));
    },
    [patchConfig],
  );

  // ---- Return ---------------------------------------------------------------

  return {
    config,
    loading,
    saving,
    isDirty,
    selectedSectionId,
    selectedSection,
    activePanel,
    setActivePanel,
    updateConfig,
    updateTheme,
    updateNavigation,
    updateFooter,
    updateCatalog,
    updateProductDetail,
    updateSeo,
    addSection,
    removeSection,
    updateSection,
    updateSectionProps,
    reorderSections,
    toggleSectionVisibility,
    selectSection,
    saveConfig,
    publishStore,
    unpublishStore,
    applyTemplate,
  };
}

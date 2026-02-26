// ---------------------------------------------------------------------------
// useStoreBuilder.js -- Main state management hook for the B2B Store Builder.
// Manages the full StoreConfig lifecycle: load, edit, save, publish.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from 'react';
import { updateStoreConfig, getStoreConfig } from '@/lib/db/queries/b2b';
import { DEFAULT_STORE_CONFIG, DEFAULT_SECTION_PROPS, createDefaultSection } from '../utils/storeDefaults';

// Current config version — bump this when adding new default sections.
const CURRENT_CONFIG_VERSION = '1.1';

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

/**
 * Upgrade an existing config's sections to include missing section types
 * from DEFAULT_STORE_CONFIG. Preserves all existing user sections and adds
 * any missing types at the end.
 */
function upgradeConfigSections(config) {
  if (!config?.sections) return config;

  const existingTypes = new Set(config.sections.map((s) => s.type));
  const defaultSections = DEFAULT_STORE_CONFIG.sections;
  const missing = defaultSections.filter((s) => !existingTypes.has(s.type));

  if (missing.length === 0) return config;

  // Append missing sections after existing ones, renumbering order
  let nextOrder = config.sections.length;
  const newSections = missing.map((s) => {
    const fresh = createDefaultSection(s.type, nextOrder);
    // Carry over the default's background preference
    if (s.background && s.background !== 'default') {
      fresh.background = s.background;
    }
    nextOrder++;
    return fresh;
  });

  return {
    ...config,
    version: CURRENT_CONFIG_VERSION,
    sections: [...config.sections, ...newSections],
  };
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
  const [isPublished, setIsPublished] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [versionHistory, setVersionHistory] = useState([]);
  const [storeSubdomain, setStoreSubdomain] = useState(null);

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
          let merged = deepMerge(DEFAULT_STORE_CONFIG, result.store_config);

          // Auto-upgrade: if saved config is older than current version,
          // add any missing default sections so existing stores get the full
          // storefront experience.
          if (merged.version !== CURRENT_CONFIG_VERSION) {
            merged = upgradeConfigSections(merged);
            // Persist the upgrade so it only happens once
            try {
              await updateStoreConfig(organizationId, {
                store_config: merged,
                store_version: (result.store_version || 0) + 1,
              });
            } catch (upgradeErr) {
              console.warn('[useStoreBuilder] Failed to persist section upgrade:', upgradeErr);
            }
          }

          setConfig(merged);
          setStoreVersion(result.store_version || 0);
          setIsPublished(result.store_published === true);

          // Resolve subdomain — backfill if store is published but has no subdomain yet
          let resolvedSubdomain = result.store_subdomain || merged?.storeSettings?.store_subdomain || null;
          if (result.store_published && !resolvedSubdomain) {
            const sName = merged?.navigation?.companyName || merged?.name || 'store';
            resolvedSubdomain = sName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
              .slice(0, 48);
            if (resolvedSubdomain.length < 3) resolvedSubdomain = `store-${resolvedSubdomain || Date.now()}`;
            // Persist so it only happens once
            try {
              await updateStoreConfig(organizationId, { store_subdomain: resolvedSubdomain });
            } catch (subErr) {
              console.warn('[useStoreBuilder] Failed to backfill subdomain:', subErr);
            }
          }
          setStoreSubdomain(resolvedSubdomain);

          if (Array.isArray(result.store_builder_chat_history) && result.store_builder_chat_history.length > 0) {
            setChatHistory(result.store_builder_chat_history);
          }
          if (Array.isArray(result.store_builder_version_history) && result.store_builder_version_history.length > 0) {
            setVersionHistory(result.store_builder_version_history);
          }
        } else {
          // No config exists yet — seed with full default B2B template
          const seedConfig = { ...DEFAULT_STORE_CONFIG };
          setConfig(seedConfig);
          setStoreVersion(0);
          // Persist immediately so the preview iframe can load it
          try {
            await updateStoreConfig(organizationId, {
              store_config: seedConfig,
              store_version: 1,
              enable_wholesale: true,
            });
            setStoreVersion(1);
          } catch (seedErr) {
            console.error('[useStoreBuilder] Failed to seed default config:', seedErr);
          }
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
      const updates = {
        store_config: config,
        store_version: nextVersion,
      };
      // Sync subdomain from config settings to the dedicated column
      const configSubdomain = config?.storeSettings?.store_subdomain;
      if (configSubdomain && configSubdomain !== storeSubdomain) {
        updates.store_subdomain = configSubdomain;
        setStoreSubdomain(configSubdomain);
      }
      await updateStoreConfig(organizationId, updates);
      setStoreVersion(nextVersion);
      setIsDirty(false);
    } catch (err) {
      console.error('[useStoreBuilder] Failed to save config:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [organizationId, config, storeVersion, storeSubdomain]);

  const publishStore = useCallback(async () => {
    if (!organizationId) return;

    setSaving(true);
    try {
      // Auto-generate subdomain if not already set
      let subdomain = storeSubdomain || config?.storeSettings?.store_subdomain;
      if (!subdomain) {
        const storeName = config?.navigation?.companyName || config?.name || 'store';
        subdomain = storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 48);
        if (subdomain.length < 3) subdomain = `store-${subdomain || Date.now()}`;
      }

      await updateStoreConfig(organizationId, {
        store_published: true,
        store_published_at: new Date().toISOString(),
        store_subdomain: subdomain,
      });
      setIsPublished(true);
      setStoreSubdomain(subdomain);
    } catch (err) {
      console.error('[useStoreBuilder] Failed to publish store:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [organizationId, storeSubdomain, config]);

  const unpublishStore = useCallback(async () => {
    if (!organizationId) return;

    setSaving(true);
    try {
      await updateStoreConfig(organizationId, {
        store_published: false,
      });
      setIsPublished(false);
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

  // ---- Chat history persistence ---------------------------------------------

  const saveChatHistory = useCallback(async (serializableMessages) => {
    if (!organizationId) return;
    try {
      await updateStoreConfig(organizationId, {
        store_builder_chat_history: serializableMessages,
      });
    } catch (err) {
      console.warn('[useStoreBuilder] Failed to save chat history:', err);
    }
  }, [organizationId]);

  // ---- Version history persistence ------------------------------------------

  const saveVersionHistory = useCallback(async (entries) => {
    if (!organizationId) return;
    try {
      await updateStoreConfig(organizationId, {
        store_builder_version_history: entries,
      });
    } catch (err) {
      console.warn('[useStoreBuilder] Failed to save version history:', err);
    }
  }, [organizationId]);

  // ---- Return ---------------------------------------------------------------

  return {
    config,
    loading,
    saving,
    isDirty,
    selectedSectionId,
    selectedSection,
    isPublished,
    storeSubdomain,
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
    chatHistory,
    saveChatHistory,
    versionHistory,
    saveVersionHistory,
  };
}

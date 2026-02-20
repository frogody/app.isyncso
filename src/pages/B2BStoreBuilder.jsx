// ---------------------------------------------------------------------------
// B2BStoreBuilder.jsx -- Route wrapper page for the B2B Store Builder.
//
// Flow:
//  1. Loads user context + checks for existing store config in portal_settings.
//  2. If no store exists (enable_wholesale=false or no config) → shows SetupWizard.
//  3. If store exists → renders the 3-panel StoreBuilder IDE.
//  4. Handles SetupWizard completion by persisting config + transitioning to builder.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useUser } from '@/components/context/UserContext';
import { getStoreConfig, updateStoreConfig } from '@/lib/db/queries/b2b';
import StoreBuilder from '@/components/store-builder/StoreBuilder';
import SetupWizard from '@/components/store-builder/SetupWizard';

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function B2BStoreBuilder() {
  const { user, company } = useUser();
  const navigate = useNavigate();

  // ---- State ---------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasStore, setHasStore] = useState(false);
  const [storeName, setStoreName] = useState('B2B Store');

  // Resolve organization ID from user context
  const organizationId = user?.organization_id || company?.organization_id || null;

  // ---- Check for existing store config on mount ----------------------------
  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkStoreConfig() {
      try {
        setLoading(true);
        setError(null);

        const config = await getStoreConfig(organizationId);

        if (cancelled) return;

        // Store exists if enable_wholesale is true AND there is a non-empty store_config
        const storeExists =
          config &&
          config.enable_wholesale === true &&
          config.store_config &&
          typeof config.store_config === 'object' &&
          Object.keys(config.store_config).length > 0;

        setHasStore(storeExists);

        // Try to derive a store name from config or company
        if (storeExists && config.store_config?.navigation?.title) {
          setStoreName(config.store_config.navigation.title);
        } else if (company?.name) {
          setStoreName(`${company.name} Store`);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('B2BStoreBuilder: Failed to load store config', err);
          setError(err.message || 'Failed to load store configuration');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkStoreConfig();

    return () => {
      cancelled = true;
    };
  }, [organizationId, company?.name]);

  // ---- Handle SetupWizard completion ---------------------------------------
  const handleSetupComplete = useCallback(
    async (finalConfig) => {
      if (!organizationId) return;

      try {
        // Persist the initial store config to portal_settings
        await updateStoreConfig(organizationId, {
          store_config: finalConfig,
          enable_wholesale: true,
          store_version: 1,
        });

        // Derive store name from the new config
        if (finalConfig?.navigation?.title) {
          setStoreName(finalConfig.navigation.title);
        }

        // Transition to the builder
        setHasStore(true);
      } catch (err) {
        console.error('B2BStoreBuilder: Failed to save initial config', err);
        setError(err.message || 'Failed to save store configuration');
      }
    },
    [organizationId],
  );

  // ---- Navigate back to main app -------------------------------------------
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // ---- Loading state -------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#09090b] items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm text-zinc-400">Checking store configuration...</p>
      </div>
    );
  }

  // ---- Missing organization ID ---------------------------------------------
  if (!organizationId) {
    return (
      <div className="flex flex-col min-h-screen bg-[#09090b] items-center justify-center px-4">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800/60 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Organization Not Found
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Your account is not linked to an organization. Please contact your
            administrator to set up your organization before using the Store
            Builder.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ---- Error state ----------------------------------------------------------
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-[#09090b] items-center justify-center px-4">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800/60 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Something Went Wrong
          </h2>
          <p className="text-sm text-zinc-400 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- No store yet → show SetupWizard -------------------------------------
  if (!hasStore) {
    return (
      <div className="min-h-screen bg-[#09090b]">
        <SetupWizard onComplete={handleSetupComplete} user={user} />
      </div>
    );
  }

  // ---- Store exists → show 3-panel StoreBuilder ----------------------------
  return (
    <StoreBuilder
      organizationId={organizationId}
      storeName={storeName}
      onBack={handleBack}
    />
  );
}

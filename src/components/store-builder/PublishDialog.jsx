/**
 * PublishDialog - Publish modal for the B2B store builder.
 *
 * Pre-publish checklist (store name set, sections exist, products assigned,
 * price list created, domain configured), each with green check or red X.
 * Publish button disabled until checks pass. Loading -> success flow.
 * Shows live URL with copy button. Unpublish option.
 * Props: isOpen, onClose, config, organizationId.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  AlertCircle,
  Loader2,
  Globe,
  Copy,
  ExternalLink,
  Rocket,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ChecklistItem
// ---------------------------------------------------------------------------

function ChecklistItem({ label, description, passed, loading }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 shrink-0">
        {loading ? (
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        ) : passed ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-400" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-3 h-3 text-red-400" />
          </div>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${passed ? 'text-zinc-300' : 'text-zinc-400'}`}>{label}</p>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PublishDialog({ isOpen, onClose, config, organizationId }) {
  const [checks, setChecks] = useState({
    storeName: false,
    sections: false,
    products: false,
    priceList: false,
    domain: false,
  });
  const [checkLoading, setCheckLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(config?.published === true);
  const [unpublishing, setUnpublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // -----------------------------------------------------------------------
  // Run checklist
  // -----------------------------------------------------------------------
  const runChecks = useCallback(async () => {
    if (!organizationId || !isOpen) return;
    setCheckLoading(true);

    try {
      // Check 1: Store name set
      const hasName = !!(config?.navigation?.companyName || config?.name || config?.company?.name);

      // Check 2: Sections exist
      const hasSections = Array.isArray(config?.sections) && config.sections.length > 0;

      // Check 3: Products assigned to wholesale channel
      const { count: productCount } = await supabase
        .from('product_sales_channels')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('channel', 'b2b')
        .eq('enabled', true);

      const hasProducts = (productCount || 0) > 0;

      // Check 4: Price list created
      const { count: priceListCount } = await supabase
        .from('b2b_price_lists')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const hasPriceList = (priceListCount || 0) > 0;

      // Check 5: Domain configured (check portal_settings columns)
      let hasDomain = !!(config?.subdomain || config?.custom_domain);
      if (!hasDomain) {
        const { data: ps } = await supabase
          .from('portal_settings')
          .select('store_subdomain, custom_domain')
          .eq('organization_id', organizationId)
          .single();
        hasDomain = !!(ps?.store_subdomain || ps?.custom_domain);
      }

      setChecks({
        storeName: hasName,
        sections: hasSections,
        products: hasProducts,
        priceList: hasPriceList,
        domain: hasDomain,
      });
    } catch (err) {
      console.error('[PublishDialog] check error:', err);
    } finally {
      setCheckLoading(false);
    }
  }, [organizationId, config, isOpen]);

  useEffect(() => {
    if (isOpen) runChecks();
  }, [isOpen, runChecks]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------
  const allPassed = useMemo(
    () => Object.values(checks).every(Boolean),
    [checks]
  );

  const storeUrl = useMemo(() => {
    if (config?.custom_domain) return `https://${config.custom_domain}`;
    if (config?.subdomain) return `https://${config.subdomain}.isyncso.com`;
    return null;
  }, [config]);

  // -----------------------------------------------------------------------
  // Publish
  // -----------------------------------------------------------------------
  const handlePublish = async () => {
    if (!allPassed) return;
    setPublishing(true);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from('portal_settings')
        .update({
          store_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);

      if (updateErr) throw updateErr;
      setPublished(true);
    } catch (err) {
      console.error('[PublishDialog] publish error:', err);
      setError(err.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  // -----------------------------------------------------------------------
  // Unpublish
  // -----------------------------------------------------------------------
  const handleUnpublish = async () => {
    setUnpublishing(true);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from('portal_settings')
        .update({
          store_published: false,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);

      if (updateErr) throw updateErr;
      setPublished(false);
    } catch (err) {
      console.error('[PublishDialog] unpublish error:', err);
      setError(err.message || 'Failed to unpublish');
    } finally {
      setUnpublishing(false);
    }
  };

  // -----------------------------------------------------------------------
  // Copy URL
  // -----------------------------------------------------------------------
  const copyUrl = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-cyan-400" />
                Publish Store
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {published ? (
                /* Published state */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Store is Live</h3>
                  <p className="text-sm text-zinc-400 mb-5">Your wholesale store is now published and accessible.</p>

                  {/* Live URL */}
                  {storeUrl && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700 mb-5">
                      <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-sm text-cyan-400 font-mono truncate flex-1">{storeUrl}</span>
                      <button
                        onClick={copyUrl}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="Copy URL"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="Open store"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Unpublish */}
                  <button
                    onClick={handleUnpublish}
                    disabled={unpublishing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors"
                  >
                    {unpublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
                    Unpublish Store
                  </button>
                </motion.div>
              ) : (
                /* Pre-publish checklist */
                <>
                  <p className="text-sm text-zinc-400 mb-4">
                    Review the checklist below before publishing your store.
                  </p>

                  {/* Checklist */}
                  <div className="divide-y divide-zinc-800/60 mb-5">
                    <ChecklistItem
                      label="Store name configured"
                      description="Your store needs a name"
                      passed={checks.storeName}
                      loading={checkLoading}
                    />
                    <ChecklistItem
                      label="Store sections added"
                      description="At least one section in the builder"
                      passed={checks.sections}
                      loading={checkLoading}
                    />
                    <ChecklistItem
                      label="Products in wholesale catalog"
                      description="Products enabled for wholesale channel"
                      passed={checks.products}
                      loading={checkLoading}
                    />
                    <ChecklistItem
                      label="Price list created"
                      description="At least one wholesale price list"
                      passed={checks.priceList}
                      loading={checkLoading}
                    />
                    <ChecklistItem
                      label="Domain configured"
                      description="Subdomain or custom domain set"
                      passed={checks.domain}
                      loading={checkLoading}
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs mb-4">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={!allPassed || publishing || checkLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-colors"
                    >
                      {publishing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Rocket className="w-4 h-4" />
                      )}
                      Publish Store
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

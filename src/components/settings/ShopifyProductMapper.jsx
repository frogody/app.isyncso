/**
 * ShopifyProductMapper — Modal UI for mapping unmapped Shopify products to local products (SH-16)
 *
 * Shown after "Sync Products" returns unmapped items.
 * Each Shopify variant gets its own row with search + map/create/skip actions.
 *
 * Props:
 * - unmappedProducts: array from syncProducts result.data.unmappedProducts
 *   Each item: { shopifyProductId, shopifyVariantId, shopifyInventoryItemId,
 *                title, variantTitle, barcode, sku, price }
 * - companyId: the company_id
 * - onClose: callback to dismiss the modal
 * - onMapped / onComplete: callback when all items resolved (accepts either name)
 */

import React, { useState, useCallback } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { toast } from "sonner";
import {
  Search, Link2, Plus, SkipForward, Loader2, X,
  Package, Check, ChevronDown, ChevronUp, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/api/supabaseClient";
import { sanitizeSearchInput } from "@/utils/validation";

/**
 * Single unmapped product/variant row
 */
function UnmappedProductRow({ item, companyId, t, onResolved }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [resolvedAction, setResolvedAction] = useState(null);

  const mutedClass = t("text-gray-500", "text-zinc-500");

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const cleanSearch = sanitizeSearchInput(searchQuery);
      if (!cleanSearch) {
        setSearchResults([]);
        setExpanded(true);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, ean")
        .eq("company_id", companyId)
        .or(`name.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%,ean.ilike.%${cleanSearch}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
      setExpanded(true);
    } catch (err) {
      toast.error("Search failed: " + (err.message || "Unknown error"));
    } finally {
      setSearching(false);
    }
  }, [searchQuery, companyId]);

  const handleMap = useCallback(async (localProduct) => {
    setMapping(true);
    try {
      const { error } = await supabase
        .from("shopify_product_mappings")
        .upsert({
          company_id: companyId,
          product_id: localProduct.id,
          shopify_product_id: item.shopifyProductId,
          shopify_variant_id: item.shopifyVariantId,
          shopify_inventory_item_id: item.shopifyInventoryItemId,
          shopify_product_title: item.title,
          shopify_variant_title: item.variantTitle,
          shopify_sku: item.sku,
          matched_by: "manual",
          is_active: true,
          sync_inventory: true,
        }, { onConflict: "company_id,shopify_variant_id" });

      if (error) throw error;
      setResolved(true);
      setResolvedAction(`Mapped to ${localProduct.name}`);
      toast.success(`Mapped "${item.title}" → "${localProduct.name}"`);
      onResolved?.(item.shopifyVariantId);
    } catch (err) {
      toast.error("Failed to create mapping: " + (err.message || "Unknown error"));
    } finally {
      setMapping(false);
    }
  }, [item, companyId, onResolved]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const productName = item.title +
        (item.variantTitle && item.variantTitle !== "Default Title" ? ` - ${item.variantTitle}` : "");

      const { data: newProduct, error } = await supabase
        .from("products")
        .insert({
          company_id: companyId,
          name: productName,
          sku: item.sku || null,
          ean: item.barcode || null,
          price: item.price ? parseFloat(item.price) : null,
          type: "physical",
          status: "active",
        })
        .select("id, name")
        .single();

      if (error) throw error;

      const { error: mapError } = await supabase
        .from("shopify_product_mappings")
        .upsert({
          company_id: companyId,
          product_id: newProduct.id,
          shopify_product_id: item.shopifyProductId,
          shopify_variant_id: item.shopifyVariantId,
          shopify_inventory_item_id: item.shopifyInventoryItemId,
          shopify_product_title: item.title,
          shopify_variant_title: item.variantTitle,
          shopify_sku: item.sku,
          matched_by: "auto_created",
          is_active: true,
          sync_inventory: true,
        }, { onConflict: "company_id,shopify_variant_id" });

      if (mapError) throw mapError;

      setResolved(true);
      setResolvedAction(`Created "${newProduct.name}"`);
      toast.success(`Created product and mapped "${item.title}"`);
      onResolved?.(item.shopifyVariantId);
    } catch (err) {
      toast.error("Failed to create product: " + (err.message || "Unknown error"));
    } finally {
      setCreating(false);
    }
  }, [item, companyId, onResolved]);

  const handleSkip = useCallback(() => {
    setResolved(true);
    setResolvedAction("Skipped");
    onResolved?.(item.shopifyVariantId);
  }, [item.shopifyVariantId, onResolved]);

  if (resolved) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${t("bg-gray-50", "bg-zinc-800/30")}`}>
        <Check className="w-4 h-4 text-green-400 shrink-0" />
        <span className={`text-sm truncate ${t("text-gray-700", "text-zinc-300")}`}>{item.title}</span>
        {item.variantTitle && item.variantTitle !== "Default Title" && (
          <span className={`text-xs ${mutedClass}`}>({item.variantTitle})</span>
        )}
        <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 shrink-0">
          {resolvedAction}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${t("border-gray-200 bg-white", "border-zinc-800 bg-zinc-900/40")} overflow-hidden`}>
      {/* Product info header */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Shopify product thumbnail */}
        {item.imageSrc ? (
          <img
            src={item.imageSrc}
            alt={item.title}
            className="w-10 h-10 rounded-md object-cover shrink-0 border border-zinc-700"
          />
        ) : (
          <div className={`w-10 h-10 rounded-md shrink-0 flex items-center justify-center ${t("bg-gray-100", "bg-zinc-800")}`}>
            <ImageIcon className={`w-4 h-4 ${mutedClass}`} />
          </div>
        )}

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${t("text-gray-900", "text-white")}`}>
              {item.title}
            </span>
            {item.variantTitle && item.variantTitle !== "Default Title" && (
              <Badge variant="outline" className={`text-xs shrink-0 ${t("border-gray-300 text-gray-600", "border-zinc-700 text-zinc-400")}`}>
                {item.variantTitle}
              </Badge>
            )}
          </div>
          <div className={`flex items-center gap-3 mt-0.5 text-xs ${mutedClass}`}>
            {item.sku && <span>SKU: {item.sku}</span>}
            {item.barcode && <span>EAN: {item.barcode}</span>}
            {item.price && <span>Price: &euro;{item.price}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            onClick={handleCreate}
            disabled={creating || mapping}
            size="sm"
            variant="outline"
            className={`gap-1 text-xs ${t("border-gray-200 text-gray-700", "border-zinc-700 text-zinc-300")}`}
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Create
          </Button>
          <Button
            onClick={handleSkip}
            size="sm"
            variant="ghost"
            className={`gap-1 text-xs ${mutedClass}`}
          >
            <SkipForward className="w-3 h-3" />
            Skip
          </Button>
          <Button
            onClick={() => setExpanded(!expanded)}
            size="sm"
            variant="ghost"
            className={mutedClass}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Expandable search panel */}
      {expanded && (
        <div className={`px-4 py-3 border-t ${t("border-gray-100 bg-gray-50/50", "border-zinc-800 bg-zinc-900/60")}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${mutedClass}`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by name, SKU, or EAN..."
                className={`pl-8 text-sm h-8 ${t("bg-white border-gray-200", "bg-zinc-900 border-zinc-700")}`}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1 h-8"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Search
            </Button>
          </div>

          {searchResults.length > 0 ? (
            <div className="space-y-1.5">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg ${t("bg-white border border-gray-100", "bg-zinc-800/50 border border-zinc-700/50")}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${t("text-gray-900", "text-white")}`}>{product.name}</span>
                    <div className={`flex items-center gap-2 text-xs ${mutedClass}`}>
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.ean && <span>EAN: {product.ean}</span>}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleMap(product)}
                    disabled={mapping}
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1 text-xs"
                  >
                    {mapping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                    Map
                  </Button>
                </div>
              ))}
            </div>
          ) : searchQuery && !searching ? (
            <p className={`text-xs ${mutedClass}`}>
              No matching products found. Try a different search or click "Create" to add a new product.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Main ShopifyProductMapper modal
 */
export default function ShopifyProductMapper({
  unmappedProducts = [],
  companyId,
  onClose,
  onMapped,
  onComplete,
}) {
  const { t } = useTheme();
  const [resolvedIds, setResolvedIds] = useState(new Set());

  const mutedClass = t("text-gray-500", "text-zinc-500");
  const remaining = unmappedProducts.length - resolvedIds.size;

  // Accept either onMapped or onComplete as the completion callback
  const completionCallback = onMapped || onComplete;

  const handleResolved = useCallback((variantId) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(variantId);
      if (next.size === unmappedProducts.length) {
        completionCallback?.();
      }
      return next;
    });
  }, [unmappedProducts.length, completionCallback]);

  const handleSkipAll = useCallback(() => {
    const allIds = new Set(unmappedProducts.map((p) => p.shopifyVariantId));
    setResolvedIds(allIds);
    completionCallback?.();
    toast.info("All unmapped products skipped");
  }, [unmappedProducts, completionCallback]);

  if (unmappedProducts.length === 0) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent
        className={`sm:max-w-2xl max-h-[85vh] flex flex-col ${t("bg-white", "bg-zinc-950 border-zinc-800")}`}
        hideClose
      >
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className={`text-sm font-semibold flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
              <Package className="w-4 h-4 text-cyan-400" />
              Map Unmapped Products
              <Badge variant="secondary" className="text-xs">
                {remaining} remaining
              </Badge>
            </DialogTitle>
            <div className="flex items-center gap-2">
              {remaining > 0 && (
                <Button
                  onClick={handleSkipAll}
                  variant="ghost"
                  size="sm"
                  className={`gap-1 text-xs ${mutedClass}`}
                >
                  <SkipForward className="w-3 h-3" />
                  Skip All
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className={mutedClass}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className={`text-xs mt-1 ${mutedClass}`}>
            These Shopify products couldn't be matched by EAN or SKU. Search and map them to local products, create new ones, or skip.
          </p>
        </DialogHeader>

        {/* Product list — scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
          {unmappedProducts.map((item) => (
            <UnmappedProductRow
              key={item.shopifyVariantId}
              item={item}
              companyId={companyId}
              t={t}
              onResolved={handleResolved}
            />
          ))}
        </div>

        {/* Completion state */}
        {remaining === 0 && (
          <div className={`p-3 rounded-lg text-center ${t("bg-green-50", "bg-green-500/10")}`}>
            <Check className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className={`text-sm font-medium ${t("text-green-700", "text-green-400")}`}>
              All products resolved
            </p>
            <Button
              onClick={onClose}
              size="sm"
              className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              Done
            </Button>
          </div>
        )}

        {/* Footer with Save Mappings hint */}
        {remaining > 0 && (
          <div className={`flex items-center justify-between pt-3 border-t ${t("border-gray-200", "border-zinc-800")}`}>
            <p className={`text-xs ${mutedClass}`}>
              Expand each row to search and map, or use Create to add a new local product.
            </p>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className={`gap-1 text-xs ${t("border-gray-200 text-gray-700", "border-zinc-700 text-zinc-300")}`}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

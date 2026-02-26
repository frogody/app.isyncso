/**
 * PriceListEditor - Edit individual price list and its items.
 *
 * Header: name, status toggle, validity dates
 * Product pricing table: Product Name | SKU | Base Price | B2B Price | Min Qty | Max Qty | Actions
 * Inline editing for price and quantity fields
 * Add product via search dropdown, save changes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { sanitizeSearchInput } from '@/utils/validation';
import { useUser } from '@/components/context/UserContext';
import ConfirmDialog from './shared/ConfirmDialog';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  Check,
  X,
  Loader2,
  Package,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

function StatusToggle({ active, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="inline-flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
    >
      {active ? (
        <>
          <ToggleRight className="w-6 h-6 text-cyan-400" />
          <span className="text-cyan-400 font-medium">Active</span>
        </>
      ) : (
        <>
          <ToggleLeft className="w-6 h-6 text-zinc-500" />
          <span className="text-zinc-500 font-medium">Inactive</span>
        </>
      )}
    </button>
  );
}

function ProductSearchDropdown({ onSelect, existingProductIds, companyId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        let q = supabase
          .from('products')
          .select('id, name, sku, price, featured_image')
          .limit(20);

        const cleanSearch = sanitizeSearchInput(query);
        if (cleanSearch) {
          q = q.or(`name.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%`);
        }

        if (companyId) {
          q = q.eq('company_id', companyId);
        }

        const { data, error } = await q;
        if (!error) {
          setResults(
            (data || []).filter((p) => !existingProductIds.includes(p.id))
          );
        }
      } catch {
        // silently ignore search errors
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, existingProductIds, companyId]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder="Search products by name or SKU..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
          )}
        </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl max-h-64 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                onSelect(product);
                setQuery('');
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors text-left border-b border-zinc-800 last:border-b-0"
            >
              {product.featured_image ? (
                <img
                  src={product.featured_image}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover bg-zinc-800"
                 loading="lazy" decoding="async" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Package className="w-4 h-4 text-zinc-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{product.name}</p>
                <p className="text-xs text-zinc-500">
                  {product.sku || 'No SKU'} &middot; Base: &euro;{(product.price || 0).toFixed(2)}
                </p>
              </div>
              <Plus className="w-4 h-4 text-cyan-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && !searching && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">No products found</p>
        </div>
      )}
    </div>
  );
}

export default function PriceListEditor() {
  const { id: priceListId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const companyId = user?.company_id;

  const [priceList, setPriceList] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [dirtyItems, setDirtyItems] = useState(new Set());
  const [deleteItemConfirm, setDeleteItemConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    if (!priceListId) return;
    setLoading(true);
    setError(null);

    try {
      const [plRes, itemsRes] = await Promise.all([
        supabase
          .from('b2b_price_lists')
          .select('*')
          .eq('id', priceListId)
          .single(),
        supabase
          .from('b2b_price_list_items')
          .select(`
            *,
            products (id, name, sku, price, featured_image)
          `)
          .eq('price_list_id', priceListId)
          .order('min_quantity'),
      ]);

      if (plRes.error) throw plRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setPriceList(plRes.data);
      setItems(itemsRes.data || []);
      setDirtyItems(new Set());
    } catch (err) {
      console.error('[PriceListEditor] fetch error:', err);
      setError(err.message || 'Failed to load price list');
    } finally {
      setLoading(false);
    }
  }, [priceListId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async () => {
    if (!priceList) return;
    const newStatus = priceList.status === 'active' ? 'inactive' : 'active';

    try {
      const { error: upErr } = await supabase
        .from('b2b_price_lists')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', priceList.id);

      if (upErr) throw upErr;
      setPriceList((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleItemChange = (itemId, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
    setDirtyItems((prev) => new Set(prev).add(itemId));
  };

  const handleAddProduct = (product) => {
    const newItem = {
      id: `temp-${Date.now()}`,
      price_list_id: priceListId,
      product_id: product.id,
      unit_price: product.price || 0,
      min_quantity: 1,
      max_quantity: null,
      currency: priceList?.currency || 'EUR',
      notes: null,
      products: product,
      _isNew: true,
    };
    setItems((prev) => [...prev, newItem]);
    setDirtyItems((prev) => new Set(prev).add(newItem.id));
  };

  const handleDeleteItem = (item) => {
    if (item._isNew) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      return;
    }
    setDeleteItemConfirm(item);
  };

  const executeDeleteItem = async () => {
    const item = deleteItemConfirm;
    setDeleteItemConfirm(null);
    if (!item) return;

    try {
      const { error: delErr } = await supabase
        .from('b2b_price_list_items')
        .delete()
        .eq('id', item.id);

      if (delErr) throw delErr;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err.message || 'Failed to delete item');
    }
  };

  const handleSaveAll = async () => {
    if (dirtyItems.size === 0) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const dirtyList = items.filter((item) => dirtyItems.has(item.id));

      for (const item of dirtyList) {
        const payload = {
          price_list_id: priceListId,
          product_id: item.product_id,
          unit_price: parseFloat(item.unit_price) || 0,
          min_quantity: parseInt(item.min_quantity) || 1,
          max_quantity: item.max_quantity ? parseInt(item.max_quantity) : null,
          currency: item.currency || 'EUR',
          notes: item.notes || null,
        };

        if (item._isNew) {
          const { data, error: insErr } = await supabase
            .from('b2b_price_list_items')
            .insert(payload)
            .select(`*, products (id, name, sku, price, featured_image)`)
            .single();

          if (insErr) throw insErr;

          // Replace temp item with real one
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? data : i))
          );
        } else {
          const { error: upErr } = await supabase
            .from('b2b_price_list_items')
            .update({
              unit_price: payload.unit_price,
              min_quantity: payload.min_quantity,
              max_quantity: payload.max_quantity,
              notes: payload.notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          if (upErr) throw upErr;
        }
      }

      setDirtyItems(new Set());
      setSuccessMsg('All changes saved successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('[PriceListEditor] save error:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const existingProductIds = items.map((i) => i.product_id);

  const formatCurrency = (amount) => `\u20AC${(parseFloat(amount) || 0).toFixed(2)}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-64 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-48 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-12 text-center">
            <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Price list not found</p>
            <button
              onClick={() => navigate('/b2b/price-lists')}
              className="mt-4 text-sm text-cyan-400 hover:text-cyan-300"
            >
              Back to Price Lists
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/b2b/price-lists')}
              className="p-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-white">{priceList.name}</h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                {priceList.description || 'No description'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusToggle
              active={priceList.status === 'active'}
              onToggle={handleToggleStatus}
            />
            <button
              onClick={handleSaveAll}
              disabled={saving || dirtyItems.size === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
              {dirtyItems.size > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-xs">
                  {dirtyItems.size}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
            <Check className="w-5 h-5 shrink-0" />
            <p className="text-sm">{successMsg}</p>
          </div>
        )}

        {/* Validity dates */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3.5 flex items-center gap-6 text-sm">
          <span className="text-zinc-500">Valid From:</span>
          <span className="text-zinc-300">
            {priceList.valid_from
              ? new Date(priceList.valid_from).toLocaleDateString('en-GB')
              : 'No start date'}
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">Valid Until:</span>
          <span className="text-zinc-300">
            {priceList.valid_until
              ? new Date(priceList.valid_until).toLocaleDateString('en-GB')
              : 'No end date'}
          </span>
        </div>

        {/* Add product */}
        <ProductSearchDropdown
          onSelect={handleAddProduct}
          existingProductIds={existingProductIds}
          companyId={companyId}
        />

        {/* Items table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <div className="col-span-3">Product</div>
            <div className="col-span-1">SKU</div>
            <div className="col-span-2 text-right">Base Price</div>
            <div className="col-span-2 text-right">B2B Price</div>
            <div className="col-span-1 text-center">Min Qty</div>
            <div className="col-span-1 text-center">Max Qty</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No products in this price list</p>
              <p className="text-xs text-zinc-600 mt-1">
                Search and add products above
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 gap-4 px-5 py-3 items-center transition-colors ${
                    dirtyItems.has(item.id) ? 'bg-cyan-500/5' : 'hover:bg-zinc-800/30'
                  }`}
                >
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    {item.products?.featured_image ? (
                      <img
                        src={item.products.featured_image}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover bg-zinc-800 shrink-0"
                       loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-zinc-600" />
                      </div>
                    )}
                    <span className="text-sm text-white truncate">
                      {item.products?.name || 'Unknown Product'}
                    </span>
                  </div>
                  <div className="col-span-1 text-sm text-zinc-500 truncate">
                    {item.products?.sku || '--'}
                  </div>
                  <div className="col-span-2 text-right text-sm text-zinc-400">
                    {formatCurrency(item.products?.price)}
                  </div>
                  <div className="col-span-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(item.id, 'unit_price', e.target.value)}
                      className="w-full text-right px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="1"
                      value={item.min_quantity}
                      onChange={(e) => handleItemChange(item.id, 'min_quantity', e.target.value)}
                      className="w-full text-center px-2 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="0"
                      value={item.max_quantity || ''}
                      onChange={(e) =>
                        handleItemChange(
                          item.id,
                          'max_quantity',
                          e.target.value || null
                        )
                      }
                      placeholder="--"
                      className="w-full text-center px-2 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {dirtyItems.has(item.id) && (
                      <span className="text-xs text-cyan-400">Modified</span>
                    )}
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove from price list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteItemConfirm}
        onOpenChange={(open) => { if (!open) setDeleteItemConfirm(null); }}
        title="Remove product?"
        description={`Remove ${deleteItemConfirm?.products?.name || 'this product'} from this price list? This cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={executeDeleteItem}
      />
    </div>
  );
}

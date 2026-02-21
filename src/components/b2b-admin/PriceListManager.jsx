/**
 * PriceListManager - CRUD interface for B2B price lists.
 *
 * Table: name, description, status, is_default, valid_from/until, item count
 * Create/edit modal with name, description, valid_from, valid_until
 * Click row to navigate to PriceListEditor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  X,
  Check,
  AlertCircle,
  Search,
  ChevronRight,
  Star,
  Loader2,
} from 'lucide-react';

import { ACTIVE_STATUS_COLORS, DEFAULT_STATUS_COLOR } from './shared/b2bConstants';
import ConfirmDialog from './shared/ConfirmDialog';

function StatusBadge({ status }) {
  const colorClass = ACTIVE_STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}

function PriceListModal({ isOpen, onClose, onSave, priceList, saving }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    valid_from: '',
    valid_until: '',
  });

  useEffect(() => {
    if (priceList) {
      setForm({
        name: priceList.name || '',
        description: priceList.description || '',
        valid_from: priceList.valid_from
          ? priceList.valid_from.split('T')[0]
          : '',
        valid_until: priceList.valid_until
          ? priceList.valid_until.split('T')[0]
          : '',
      });
    } else {
      setForm({ name: '', description: '', valid_from: '', valid_until: '' });
    }
  }, [priceList, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-medium text-white">
            {priceList ? 'Edit Price List' : 'Create Price List'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Wholesale Standard"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Valid From</label>
              <input
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Valid Until</label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {priceList ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PriceListManager() {
  const navigate = useNavigate();
  const { user } = useUser();
  const organizationId = user?.organization_id || user?.company_id;

  const [priceLists, setPriceLists] = useState([]);
  const [itemCounts, setItemCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchPriceLists = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('b2b_price_lists')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (fetchErr) throw fetchErr;
      setPriceLists(data || []);

      // Fetch item counts for each price list
      if (data && data.length > 0) {
        const ids = data.map((pl) => pl.id);
        const { data: items, error: countErr } = await supabase
          .from('b2b_price_list_items')
          .select('price_list_id')
          .in('price_list_id', ids);

        if (!countErr && items) {
          const counts = {};
          items.forEach((item) => {
            counts[item.price_list_id] = (counts[item.price_list_id] || 0) + 1;
          });
          setItemCounts(counts);
        }
      }
    } catch (err) {
      console.error('[PriceListManager] fetch error:', err);
      setError(err.message || 'Failed to load price lists');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPriceLists();
  }, [fetchPriceLists]);

  const handleSave = async (formData) => {
    if (!organizationId) return;
    setSaving(true);

    try {
      if (editingList) {
        const { error: updateErr } = await supabase
          .from('b2b_price_lists')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingList.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('b2b_price_lists')
          .insert({
            ...formData,
            organization_id: organizationId,
            company_id: user?.company_id || organizationId,
            status: 'active',
            currency: 'EUR',
            is_default: false,
            discount_type: 'fixed',
            global_discount_percent: 0,
          });

        if (insertErr) throw insertErr;
      }

      setModalOpen(false);
      setEditingList(null);
      await fetchPriceLists();
    } catch (err) {
      console.error('[PriceListManager] save error:', err);
      setError(err.message || 'Failed to save price list');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const executeDelete = async () => {
    const id = deleteConfirm;
    setDeleteConfirm(null);
    if (!id) return;
    setDeletingId(id);

    try {
      await supabase.from('b2b_price_list_items').delete().eq('price_list_id', id);
      const { error: delErr } = await supabase.from('b2b_price_lists').delete().eq('id', id);
      if (delErr) throw delErr;

      setPriceLists((prev) => prev.filter((pl) => pl.id !== id));
    } catch (err) {
      console.error('[PriceListManager] delete error:', err);
      setError(err.message || 'Failed to delete price list');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredLists = priceLists.filter((pl) =>
    pl.name.toLowerCase().includes(search.toLowerCase()) ||
    (pl.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-12 bg-zinc-800/60 rounded-xl animate-pulse" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900/60 rounded-xl border border-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Price Lists</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage B2B pricing for your wholesale clients
            </p>
          </div>
          <button
            onClick={() => {
              setEditingList(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Price List
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search price lists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          />
        </div>

        {/* Table */}
        {filteredLists.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-16 text-center">
            <Tag className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">
              {search ? 'No price lists match your search' : 'No price lists yet'}
            </p>
            {!search && (
              <p className="text-xs text-zinc-600 mt-1">
                Create your first price list to start configuring B2B pricing
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Default</div>
              <div className="col-span-2">Valid From</div>
              <div className="col-span-2">Valid Until</div>
              <div className="col-span-1 text-center">Items</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-zinc-800">
              {filteredLists.map((pl) => (
                <div
                  key={pl.id}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/b2b/price-lists/${pl.id}`)}
                >
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                    {pl.description && (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{pl.description}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <StatusBadge status={pl.status} />
                  </div>
                  <div className="col-span-1 text-center">
                    {pl.is_default && (
                      <Star className="w-4 h-4 text-amber-400 mx-auto" />
                    )}
                  </div>
                  <div className="col-span-2 text-sm text-zinc-400">
                    {formatDate(pl.valid_from)}
                  </div>
                  <div className="col-span-2 text-sm text-zinc-400">
                    {formatDate(pl.valid_until)}
                  </div>
                  <div className="col-span-1 text-center text-sm text-zinc-400">
                    {itemCounts[pl.id] || 0}
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingList(pl);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(pl.id);
                      }}
                      disabled={deletingId === pl.id}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === pl.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal */}
        <PriceListModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingList(null);
          }}
          onSave={handleSave}
          priceList={editingList}
          saving={saving}
        />

        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
          title="Delete price list?"
          description="This will delete the price list and all its items. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={executeDelete}
        />
      </div>
    </div>
  );
}

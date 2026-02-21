/**
 * ClientGroupManager - Manage B2B client groups.
 *
 * Cards/table: group name, client count, assigned price list, group discount %
 * Create/edit group modal: name, price_list_id (dropdown), discount_percent
 * View members list
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  X,
  AlertCircle,
  Search,
  Loader2,
  Tag,
  Percent,
  ChevronDown,
  ChevronUp,
  UserCircle,
} from 'lucide-react';

function GroupModal({ isOpen, onClose, onSave, group, priceLists, saving }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price_list_id: '',
    discount_percentage: 0,
    can_preorder: false,
    max_credit: 0,
  });

  useEffect(() => {
    if (group) {
      setForm({
        name: group.name || '',
        description: group.description || '',
        price_list_id: group.price_list_id || '',
        discount_percentage: group.discount_percentage || 0,
        can_preorder: group.can_preorder || false,
        max_credit: group.max_credit || 0,
      });
    } else {
      setForm({
        name: '',
        description: '',
        price_list_id: '',
        discount_percentage: 0,
        can_preorder: false,
        max_credit: 0,
      });
    }
  }, [group, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_list_id: form.price_list_id || null,
      discount_percentage: parseFloat(form.discount_percentage) || 0,
      can_preorder: form.can_preorder,
      max_credit: parseFloat(form.max_credit) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-medium text-white">
            {group ? 'Edit Client Group' : 'Create Client Group'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Group Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Premium Retailers"
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
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Assigned Price List</label>
            <select
              value={form.price_list_id}
              onChange={(e) => setForm((f) => ({ ...f, price_list_id: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors [color-scheme:dark]"
            >
              <option value="">No price list</option>
              {priceLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Group Discount %
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.discount_percentage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_percentage: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Credit Limit (&euro;)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={form.max_credit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_credit: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="can_preorder"
              checked={form.can_preorder}
              onChange={(e) =>
                setForm((f) => ({ ...f, can_preorder: e.target.checked }))
              }
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500/20"
            />
            <label htmlFor="can_preorder" className="text-sm text-zinc-300">
              Allow pre-order access
            </label>
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
              {group ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientGroupManager() {
  const { user } = useUser();
  const organizationId = user?.organization_id || user?.company_id;

  const [groups, setGroups] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Expanded group for member list
  const [expandedId, setExpandedId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);

    try {
      const [groupsRes, priceListsRes, clientsRes] = await Promise.all([
        supabase
          .from('b2b_client_groups')
          .select('*')
          .eq('organization_id', organizationId)
          .order('name'),
        supabase
          .from('b2b_price_lists')
          .select('id, name')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('portal_clients')
          .select('id, client_group_id')
          .eq('organization_id', organizationId),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      setGroups(groupsRes.data || []);
      setPriceLists(priceListsRes.data || []);

      // Count members per group
      const counts = {};
      (clientsRes.data || []).forEach((client) => {
        if (client.client_group_id) {
          counts[client.client_group_id] = (counts[client.client_group_id] || 0) + 1;
        }
      });
      setMemberCounts(counts);
    } catch (err) {
      console.error('[ClientGroupManager] fetch error:', err);
      setError(err.message || 'Failed to load client groups');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchMembers = async (groupId) => {
    setMembersLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('portal_clients')
        .select('id, name, email, company_name, status')
        .eq('client_group_id', groupId)
        .order('name');

      if (err) throw err;
      setMembers(data || []);
    } catch (err) {
      console.error('[ClientGroupManager] members fetch error:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const toggleExpand = (groupId) => {
    if (expandedId === groupId) {
      setExpandedId(null);
      setMembers([]);
    } else {
      setExpandedId(groupId);
      fetchMembers(groupId);
    }
  };

  const handleSave = async (formData) => {
    if (!organizationId) return;
    setSaving(true);

    try {
      if (editingGroup) {
        const { error: upErr } = await supabase
          .from('b2b_client_groups')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingGroup.id);

        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from('b2b_client_groups')
          .insert({
            ...formData,
            organization_id: organizationId,
            company_id: user?.company_id || organizationId,
          });

        if (insErr) throw insErr;
      }

      setModalOpen(false);
      setEditingGroup(null);
      await fetchData();
    } catch (err) {
      console.error('[ClientGroupManager] save error:', err);
      setError(err.message || 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client group? Clients in this group will be unassigned.')) return;
    setDeletingId(id);

    try {
      // Unassign clients first
      await supabase
        .from('portal_clients')
        .update({ client_group_id: null })
        .eq('client_group_id', id);

      const { error: delErr } = await supabase
        .from('b2b_client_groups')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
        setMembers([]);
      }
    } catch (err) {
      console.error('[ClientGroupManager] delete error:', err);
      setError(err.message || 'Failed to delete group');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const getPriceListName = (plId) => {
    const pl = priceLists.find((p) => p.id === plId);
    return pl?.name || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
            ))}
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
          <div>
            <h1 className="text-2xl font-semibold text-white">Client Groups</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Organize clients into groups with shared pricing and permissions
            </p>
          </div>
          <button
            onClick={() => {
              setEditingGroup(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Group
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
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          />
        </div>

        {/* Groups */}
        {filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-16 text-center">
            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">
              {search ? 'No groups match your search' : 'No client groups yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const isExpanded = expandedId === group.id;
              const plName = getPriceListName(group.price_list_id);
              const count = memberCounts[group.id] || 0;

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
                >
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-medium text-white truncate">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-white">{count}</p>
                        <p className="text-xs text-zinc-500">Clients</p>
                      </div>
                      {plName && (
                        <div className="text-center hidden md:block">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700">
                            <Tag className="w-3 h-3 text-cyan-400" />
                            <span className="text-xs text-zinc-300">{plName}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">Price List</p>
                        </div>
                      )}
                      {group.discount_percentage > 0 && (
                        <div className="text-center hidden md:block">
                          <div className="inline-flex items-center gap-1 text-cyan-400">
                            <Percent className="w-3.5 h-3.5" />
                            <span className="text-base font-semibold">
                              {group.discount_percentage}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">Discount</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleExpand(group.id)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                          title="View members"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingGroup(group);
                            setModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          disabled={deletingId === group.id}
                          className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === group.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded members list */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-5 py-4">
                      {membersLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                        </div>
                      ) : members.length === 0 ? (
                        <p className="text-sm text-zinc-500 text-center py-4">
                          No clients in this group
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                            Group Members ({members.length})
                          </p>
                          {members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/40"
                            >
                              <UserCircle className="w-5 h-5 text-zinc-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-white truncate">
                                  {member.name || member.company_name || 'Unnamed'}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                              </div>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  member.status === 'active'
                                    ? 'bg-cyan-500/10 text-cyan-400'
                                    : 'bg-zinc-700 text-zinc-400'
                                }`}
                              >
                                {member.status || 'active'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        <GroupModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingGroup(null);
          }}
          onSave={handleSave}
          group={editingGroup}
          priceLists={priceLists}
          saving={saving}
        />
      </div>
    </div>
  );
}

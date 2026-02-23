/**
 * FeedMasterRules — Cross-channel master rule groups.
 *
 * Master rules are shared rule sets that can be assigned to multiple feeds/channels.
 * They execute BEFORE channel-specific rules.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit3, Loader2, BookOpen, Zap,
  Check, X, ChevronDown, ChevronUp, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/api/supabaseClient";
import FeedRulesEditor from "./FeedRulesEditor";

export default function FeedMasterRules() {
  const { user } = useUser();
  const companyId = user?.company_id;

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_feed_master_rules")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (data) setGroups(data);
    if (error) toast.error("Failed to load master rules");
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreate = async () => {
    if (!newGroupName.trim()) return toast.error("Enter a name");
    const { error } = await supabase
      .from("product_feed_master_rules")
      .insert({
        company_id: companyId,
        name: newGroupName.trim(),
        rules: [],
      });
    if (error) return toast.error("Failed to create");
    toast.success("Master rule group created");
    setNewGroupName("");
    setShowCreate(false);
    loadGroups();
  };

  const handleDelete = async (group) => {
    if (!confirm(`Delete master rule group "${group.name}"?`)) return;
    const { error } = await supabase
      .from("product_feed_master_rules")
      .delete()
      .eq("id", group.id);
    if (error) return toast.error("Failed to delete");
    toast.success("Deleted");
    loadGroups();
  };

  const handleToggleActive = async (group) => {
    const { error } = await supabase
      .from("product_feed_master_rules")
      .update({ is_active: !group.is_active })
      .eq("id", group.id);
    if (error) return toast.error("Failed to update");
    toast.success(group.is_active ? "Paused" : "Activated");
    loadGroups();
  };

  const handleSaveRules = async (groupId, rules) => {
    const { error } = await supabase
      .from("product_feed_master_rules")
      .update({ rules, updated_at: new Date().toISOString() })
      .eq("id", groupId);
    if (error) return toast.error("Failed to save rules");
    toast.success("Rules saved");
    loadGroups();
  };

  const handleUpdateDescription = async (groupId, description) => {
    const { error } = await supabase
      .from("product_feed_master_rules")
      .update({ description })
      .eq("id", groupId);
    if (error) toast.error("Failed to update");
    else loadGroups();
  };

  const handleDuplicate = async (group) => {
    const { error } = await supabase
      .from("product_feed_master_rules")
      .insert({
        company_id: companyId,
        name: `${group.name} (copy)`,
        description: group.description,
        rules: group.rules,
      });
    if (error) return toast.error("Failed to duplicate");
    toast.success("Duplicated");
    loadGroups();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            Master Rules
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Shared rule groups that apply across all feed channels
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> New Group
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name, e.g. bol nederland"
            className="flex-1 bg-zinc-800/60 border-zinc-700/40 text-sm"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8" size="sm">
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => setShowCreate(false)} variant="outline" className="border-zinc-700/40 text-zinc-400 text-xs h-8" size="sm">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Groups List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />Loading...
        </div>
      ) : groups.length === 0 && !showCreate ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-zinc-700/40">
          <BookOpen className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No master rule groups</p>
          <p className="text-xs text-zinc-600 mt-1">Create a group to share rules across feeds</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 overflow-hidden">
              {/* Group header */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${group.is_active ? "bg-cyan-400" : "bg-zinc-600"}`} />
                  <span className={`text-sm font-medium ${group.is_active ? "text-zinc-200" : "text-zinc-500 line-through"}`}>
                    {group.name}
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    {(group.rules || []).length} rules
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleActive(group)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors" title={group.is_active ? "Pause" : "Activate"}>
                    {group.is_active ? <span className="text-xs">‖</span> : <Zap className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDuplicate(group)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(group)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {expandedGroup === group.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded: description + rules editor */}
              {expandedGroup === group.id && (
                <div className="border-t border-zinc-700/30 p-4 space-y-3">
                  <div>
                    <label className="text-[11px] text-zinc-500 mb-1 block">Description</label>
                    <Input
                      value={group.description || ""}
                      onChange={(e) => handleUpdateDescription(group.id, e.target.value)}
                      placeholder="What does this rule group do?"
                      className="bg-zinc-900/40 border-zinc-700/40 text-xs"
                    />
                  </div>

                  <FeedRulesEditor
                    rules={group.rules || []}
                    onChange={(newRules) => handleSaveRules(group.id, newRules)}
                    sourceFields={[]}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

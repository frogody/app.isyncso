/**
 * AdminFeatureFlags Page
 * Manage feature flags for gradual rollout
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Flag,
  Plus,
  Search,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Percent,
  Users,
  Building2,
  Pencil,
  Trash2,
  X,
  Save,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function FeatureFlagCard({ flag, onEdit, onToggle, onDelete, disabled }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card
        className={cn(
          'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all',
          flag.is_enabled && 'border-l-2 border-l-green-500'
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-white">{flag.name}</h3>
                <Badge
                  className={cn(
                    'text-xs',
                    flag.is_enabled
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                  )}
                >
                  {flag.is_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {flag.rollout_percentage < 100 && flag.is_enabled && (
                  <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                    <Percent className="w-3 h-3 mr-1" />
                    {flag.rollout_percentage}%
                  </Badge>
                )}
              </div>

              <p className="text-sm text-zinc-500 font-mono mb-2">{flag.slug}</p>

              {flag.description && (
                <p className="text-sm text-zinc-400 mb-3">{flag.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-zinc-500">
                {flag.targeted_user_ids?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {flag.targeted_user_ids.length} users
                  </span>
                )}
                {flag.targeted_org_ids?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {flag.targeted_org_ids.length} orgs
                  </span>
                )}
                <span>
                  Updated {new Date(flag.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Switch
                checked={flag.is_enabled}
                onCheckedChange={(checked) => onToggle(flag, checked)}
                disabled={disabled}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(flag)}
                disabled={disabled}
                className="text-zinc-400 hover:text-white"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(flag)}
                disabled={disabled}
                className="text-zinc-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FeatureFlagModal({ flag, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_enabled: false,
    rollout_percentage: 100,
    targeted_user_ids: [],
    targeted_org_ids: [],
    metadata: {},
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (flag) {
      setFormData({
        name: flag.name || '',
        slug: flag.slug || '',
        description: flag.description || '',
        is_enabled: flag.is_enabled || false,
        rollout_percentage: flag.rollout_percentage ?? 100,
        targeted_user_ids: flag.targeted_user_ids || [],
        targeted_org_ids: flag.targeted_org_ids || [],
        metadata: flag.metadata || {},
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        is_enabled: false,
        rollout_percentage: 100,
        targeted_user_ids: [],
        targeted_org_ids: [],
        metadata: {},
      });
    }
  }, [flag, isOpen]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData, flag?.id);
      onClose();
    } catch (error) {
      console.error('[FeatureFlagModal] Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {flag ? 'Edit Feature Flag' : 'Create Feature Flag'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  name,
                  slug: prev.slug || generateSlug(name),
                }));
              }}
              placeholder="e.g., New Dashboard"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Slug (unique identifier)</Label>
            <Input
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                }))
              }
              placeholder="e.g., new_dashboard"
              className="bg-zinc-800 border-zinc-700 text-white font-mono"
              disabled={!!flag}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="What does this flag control?"
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label className="text-zinc-300">Enabled</Label>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_enabled: checked }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Rollout Percentage</Label>
              <span className="text-sm text-white font-mono">
                {formData.rollout_percentage}%
              </span>
            </div>
            <Slider
              value={[formData.rollout_percentage]}
              onValueChange={([value]) =>
                setFormData((prev) => ({ ...prev, rollout_percentage: value }))
              }
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-zinc-500">
              Gradually roll out to a percentage of users
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {flag ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminFeatureFlags() {
  const { adminRole } = useAdmin();
  const [flags, setFlags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFlag, setEditingFlag] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingFlag, setDeletingFlag] = useState(null);

  const isSuperAdmin = adminRole === 'super_admin';
  const canModify = isSuperAdmin || adminRole === 'admin';

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('[AdminFeatureFlags] Error fetching flags:', error);
      toast.error('Failed to load feature flags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (flag, enabled) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', flag.id);

      if (error) throw error;

      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: enabled } : f))
      );

      toast.success(`${flag.name} ${enabled ? 'enabled' : 'disabled'}`);

      // Log the change
      await supabase.from('admin_audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: enabled ? 'feature_flag_enabled' : 'feature_flag_disabled',
        resource_type: 'feature_flags',
        resource_id: flag.id,
        details: { flag_slug: flag.slug },
      });
    } catch (error) {
      console.error('[AdminFeatureFlags] Error toggling flag:', error);
      toast.error('Failed to update flag');
    }
  };

  const handleSave = async (formData, flagId) => {
    try {
      if (flagId) {
        // Update existing
        const { error } = await supabase
          .from('feature_flags')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', flagId);

        if (error) throw error;
        toast.success('Feature flag updated');
      } else {
        // Create new
        const { error } = await supabase.from('feature_flags').insert(formData);

        if (error) throw error;
        toast.success('Feature flag created');
      }

      await fetchFlags();
    } catch (error) {
      console.error('[AdminFeatureFlags] Error saving flag:', error);
      toast.error('Failed to save feature flag');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingFlag) return;

    try {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('id', deletingFlag.id);

      if (error) throw error;

      setFlags((prev) => prev.filter((f) => f.id !== deletingFlag.id));
      toast.success('Feature flag deleted');

      // Log the deletion
      await supabase.from('admin_audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'feature_flag_deleted',
        resource_type: 'feature_flags',
        resource_id: deletingFlag.id,
        details: { flag_slug: deletingFlag.slug },
      });
    } catch (error) {
      console.error('[AdminFeatureFlags] Error deleting flag:', error);
      toast.error('Failed to delete feature flag');
    } finally {
      setDeletingFlag(null);
    }
  };

  const filteredFlags = flags.filter(
    (flag) =>
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enabledCount = flags.filter((f) => f.is_enabled).length;

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Flag className="w-8 h-8 text-red-400" />
              Feature Flags
            </h1>
            <p className="text-zinc-400 mt-1">
              Control feature rollouts and A/B testing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={fetchFlags}
              variant="outline"
              className="border-zinc-700 text-zinc-300"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            {canModify && (
              <Button
                onClick={() => {
                  setEditingFlag(null);
                  setIsModalOpen(true);
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Flag
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Total Flags</p>
              <p className="text-2xl font-bold text-white">{flags.length}</p>
            </div>
            <Flag className="w-8 h-8 text-zinc-600" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Enabled</p>
              <p className="text-2xl font-bold text-green-400">{enabledCount}</p>
            </div>
            <ToggleRight className="w-8 h-8 text-green-500/50" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Disabled</p>
              <p className="text-2xl font-bold text-zinc-400">
                {flags.length - enabledCount}
              </p>
            </div>
            <ToggleLeft className="w-8 h-8 text-zinc-600" />
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flags..."
            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
          />
        </div>
      </div>

      {/* Flags List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-red-400 animate-spin" />
        </div>
      ) : filteredFlags.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Flag className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchQuery ? 'No flags found' : 'No feature flags yet'}
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              {searchQuery
                ? 'Try a different search term.'
                : 'Create your first feature flag to control feature rollouts.'}
            </p>
            {!searchQuery && canModify && (
              <Button
                onClick={() => {
                  setEditingFlag(null);
                  setIsModalOpen(true);
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Flag
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredFlags.map((flag) => (
              <FeatureFlagCard
                key={flag.id}
                flag={flag}
                onEdit={(f) => {
                  setEditingFlag(f);
                  setIsModalOpen(true);
                }}
                onToggle={handleToggle}
                onDelete={setDeletingFlag}
                disabled={!canModify}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit/Create Modal */}
      <FeatureFlagModal
        flag={editingFlag}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFlag(null);
        }}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFlag} onOpenChange={() => setDeletingFlag(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Feature Flag</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{deletingFlag?.name}"? This action cannot be
              undone and may affect users currently using this feature.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

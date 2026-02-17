import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, Settings, Hash, Lock, ChevronDown, ChevronRight,
  Link2, Sparkles, Bell, BellOff, Users, Trash2, Archive,
  Save, Loader2, AlertTriangle, Headset
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { CHANNEL_CATEGORIES } from './ChannelCategoryManager';

// Notification level options
const NOTIFICATION_LEVELS = [
  { id: 'all', label: 'All messages', description: 'Get notified for every message' },
  { id: 'mentions', label: 'Mentions only', description: 'Only when you are @mentioned' },
  { id: 'none', label: 'Nothing', description: 'Mute all notifications' },
];

// Digest schedule options
const DIGEST_SCHEDULES = [
  { id: 'none', label: 'No digest' },
  { id: 'daily', label: 'Daily summary' },
  { id: 'weekly', label: 'Weekly summary' },
];

// Collapsible section component
function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-zinc-800/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/30 transition-colors"
      >
        <Icon className="w-4 h-4 text-zinc-500" />
        <span className="flex-1 text-left">{title}</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// Simple labeled input
function FieldLabel({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function ChannelSettingsPanel({
  channel,
  onClose,
  onUpdateChannel,
  onArchiveChannel,
  onDeleteChannel,
  user,
  teamMembers = [],
}) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('general');
  const [linkedEntityType, setLinkedEntityType] = useState('');
  const [linkedEntityId, setLinkedEntityId] = useState('');
  const [autoSummary, setAutoSummary] = useState(false);
  const [digestSchedule, setDigestSchedule] = useState('none');
  const [syncSummary, setSyncSummary] = useState('');
  const [notificationLevel, setNotificationLevel] = useState('all');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load channel data into form
  useEffect(() => {
    if (!channel) return;
    setName(channel.name || '');
    setDescription(channel.description || '');
    setTopic(channel.topic || channel.settings?.topic || '');
    setCategory(channel.category || 'general');
    setLinkedEntityType(channel.linked_entity_type || '');
    setLinkedEntityId(channel.linked_entity_id || '');
    setAutoSummary(channel.settings?.auto_summary || false);
    setDigestSchedule(channel.sync_digest_schedule || 'none');
    setSyncSummary(channel.sync_summary || '');
    setNotificationLevel(channel.settings?.notification_level || 'all');
    setConfirmDelete(false);
  }, [channel]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!channel?.id) return;
    setSaving(true);

    try {
      const updates = {
        name: name.trim(),
        description: description.trim(),
        category,
        linked_entity_type: linkedEntityType || null,
        linked_entity_id: linkedEntityId || null,
        sync_digest_schedule: digestSchedule,
        sync_summary: syncSummary || null,
        settings: {
          ...(channel.settings || {}),
          topic: topic.trim() || null,
          auto_summary: autoSummary,
          notification_level: notificationLevel,
        },
      };

      const { error } = await supabase
        .from('channels')
        .update(updates)
        .eq('id', channel.id);

      if (error) throw error;

      // Also update local muted channels list if notification level is 'none'
      try {
        const stored = localStorage.getItem('inbox_muted_channels');
        const muted = stored ? JSON.parse(stored) : [];
        if (notificationLevel === 'none' && !muted.includes(channel.id)) {
          localStorage.setItem('inbox_muted_channels', JSON.stringify([...muted, channel.id]));
        } else if (notificationLevel !== 'none' && muted.includes(channel.id)) {
          localStorage.setItem('inbox_muted_channels', JSON.stringify(muted.filter(id => id !== channel.id)));
        }
      } catch {}

      if (onUpdateChannel) {
        onUpdateChannel(updates);
      }

      toast.success('Channel settings saved');
    } catch (err) {
      console.error('Failed to save channel settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [channel, name, description, topic, category, linkedEntityType, linkedEntityId, autoSummary, digestSchedule, syncSummary, notificationLevel, onUpdateChannel]);

  // Handle archive
  const handleArchive = useCallback(() => {
    if (onArchiveChannel && channel) {
      onArchiveChannel(channel);
      onClose();
    }
  }, [channel, onArchiveChannel, onClose]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDeleteChannel && channel) {
      onDeleteChannel(channel);
      onClose();
    }
  }, [confirmDelete, channel, onDeleteChannel, onClose]);

  const isOwner = channel?.created_by === user?.email || channel?.user_id === user?.id;
  const channelIcon = channel?.type === 'support' ? Headset : channel?.type === 'private' ? Lock : Hash;
  const ChannelIcon = channelIcon;

  // Categories without 'all'
  const editableCategories = CHANNEL_CATEGORIES.filter(c => c.id !== 'all');

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-[360px] border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-white text-sm">Channel Settings</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Channel info bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/30">
        <ChannelIcon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-300 truncate">{channel?.name}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Basic Section */}
        <Section title="Basic Info" icon={Hash} defaultOpen={true}>
          <FieldLabel label="Channel Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/60 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-cyan-600/50 focus:outline-none transition-all"
              placeholder="channel-name"
            />
          </FieldLabel>

          <FieldLabel label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/60 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-cyan-600/50 focus:outline-none transition-all resize-none"
              placeholder="What's this channel about?"
            />
          </FieldLabel>

          <FieldLabel label="Topic">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/60 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-cyan-600/50 focus:outline-none transition-all"
              placeholder="Current topic of discussion"
            />
          </FieldLabel>

          <FieldLabel label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/60 rounded-lg text-xs text-white focus:border-cyan-600/50 focus:outline-none transition-all appearance-none"
            >
              {editableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </FieldLabel>
        </Section>

        {/* Linked Entity */}
        <Section title="Linked Entity" icon={Link2}>
          <p className="text-[11px] text-zinc-500 mb-2">
            Link this channel to a project, client, or task for context.
          </p>

          <FieldLabel label="Entity Type">
            <select
              value={linkedEntityType}
              onChange={(e) => setLinkedEntityType(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/60 rounded-lg text-xs text-white focus:border-cyan-600/50 focus:outline-none transition-all appearance-none"
            >
              <option value="">None</option>
              <option value="project">Project</option>
              <option value="client">Client</option>
              <option value="task">Task</option>
            </select>
          </FieldLabel>

          {linkedEntityType && (
            <FieldLabel label="Entity ID">
              <input
                type="text"
                value={linkedEntityId}
                onChange={(e) => setLinkedEntityId(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/60 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-cyan-600/50 focus:outline-none transition-all"
                placeholder="UUID of linked entity"
              />
            </FieldLabel>
          )}
        </Section>

        {/* Sync AI */}
        <Section title="Sync AI" icon={Sparkles}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-300">Auto-Summary</p>
              <p className="text-[10px] text-zinc-500">Generate AI summaries of conversations</p>
            </div>
            <button
              onClick={() => setAutoSummary(!autoSummary)}
              className={`relative w-8 h-4.5 rounded-full transition-colors ${
                autoSummary ? 'bg-cyan-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  autoSummary ? 'left-[calc(100%-16px)]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <FieldLabel label="Digest Schedule">
            <div className="flex gap-1.5">
              {DIGEST_SCHEDULES.map((sched) => (
                <button
                  key={sched.id}
                  onClick={() => setDigestSchedule(sched.id)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    digestSchedule === sched.id
                      ? 'bg-cyan-600/20 text-cyan-300 ring-1 ring-cyan-500/40'
                      : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {sched.label}
                </button>
              ))}
            </div>
          </FieldLabel>

          {syncSummary && (
            <div className="p-2.5 bg-zinc-800/30 rounded-lg border border-zinc-700/40">
              <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1">AI Summary Preview</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{syncSummary}</p>
            </div>
          )}
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <div className="space-y-1.5">
            {NOTIFICATION_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setNotificationLevel(level.id)}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all ${
                  notificationLevel === level.id
                    ? 'bg-cyan-600/10 ring-1 ring-cyan-500/30'
                    : 'bg-zinc-800/30 hover:bg-zinc-800/50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  notificationLevel === level.id
                    ? 'border-cyan-500'
                    : 'border-zinc-600'
                }`}>
                  {notificationLevel === level.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-300">{level.label}</p>
                  <p className="text-[10px] text-zinc-500">{level.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Members preview */}
        <Section title="Members" icon={Users}>
          <div className="space-y-1">
            {channel?.members?.length > 0 ? (
              <>
                <p className="text-[11px] text-zinc-500">
                  {channel.members.length} member{channel.members.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(teamMembers || [])
                    .filter(m => channel.members?.includes(m.id))
                    .slice(0, 10)
                    .map(member => (
                      <div
                        key={member.id}
                        className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-md"
                      >
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                            {member.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="text-[10px] text-zinc-400 truncate max-w-[100px]">
                          {member.full_name || member.email}
                          {member.id === channel.user_id && (
                            <span className="ml-1 text-cyan-500/70">admin</span>
                          )}
                        </span>
                      </div>
                    ))}
                  {channel.members.length > 10 && (
                    <span className="text-[10px] text-zinc-600 px-2 py-1">
                      +{channel.members.length - 10} more
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-zinc-500">Open channel - all team members can access</p>
            )}
          </div>
        </Section>

        {/* Danger Zone */}
        {isOwner && (
          <Section title="Danger Zone" icon={AlertTriangle}>
            <div className="space-y-2">
              <button
                onClick={handleArchive}
                className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-amber-400 transition-all"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive channel
              </button>

              <button
                onClick={handleDelete}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  confirmDelete
                    ? 'bg-red-600/20 text-red-400 ring-1 ring-red-500/40'
                    : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-red-400'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {confirmDelete ? 'Click again to confirm delete' : 'Delete channel'}
              </button>

              {confirmDelete && (
                <p className="text-[10px] text-red-400/70 px-1">
                  This action cannot be undone. All messages will be lost.
                </p>
              )}
            </div>
          </Section>
        )}
      </div>

      {/* Save button footer */}
      <div className="px-4 py-3 border-t border-zinc-800/60 bg-zinc-950/80">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

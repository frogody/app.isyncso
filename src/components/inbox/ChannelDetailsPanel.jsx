import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Hash, Lock, Users, Calendar, Edit2, Trash2, Archive, Bell, BellOff, Clock, Shield, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useModeration } from './hooks/useModeration';
import { useChannelRoles } from './hooks/useChannelRoles';

export default function ChannelDetailsPanel({
  channel,
  memberCount = 0,
  messageCount = 0,
  isOwner = false,
  currentUserId,
  onClose,
  onUpdateChannel,
  onArchiveChannel,
  onDeleteChannel,
  onLeaveChannel
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(channel?.name || '');
  const [editDescription, setEditDescription] = useState(channel?.description || '');
  const [showModerationSettings, setShowModerationSettings] = useState(false);

  // Mute state — syncs with localStorage (shared with ChannelSidebar)
  const MUTED_KEY = 'inbox_muted_channels';
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const stored = localStorage.getItem(MUTED_KEY);
      const muted = stored ? JSON.parse(stored) : [];
      return channel?.id ? muted.includes(channel.id) : false;
    } catch {
      return false;
    }
  });

  // Re-sync muted state when channel changes
  useEffect(() => {
    if (!channel?.id) return;
    try {
      const stored = localStorage.getItem(MUTED_KEY);
      const muted = stored ? JSON.parse(stored) : [];
      setIsMuted(muted.includes(channel.id));
    } catch {
      setIsMuted(false);
    }
  }, [channel?.id]);

  const toggleMute = useCallback(() => {
    if (!channel?.id) return;
    try {
      const stored = localStorage.getItem(MUTED_KEY);
      const muted = stored ? JSON.parse(stored) : [];
      const newMuted = isMuted
        ? muted.filter(id => id !== channel.id)
        : [...muted, channel.id];
      localStorage.setItem(MUTED_KEY, JSON.stringify(newMuted));
      setIsMuted(!isMuted);
    } catch {
      // silently fail
    }
  }, [channel?.id, isMuted]);

  // Rate limit settings form state
  const [messagesPerMinute, setMessagesPerMinute] = useState(30);
  const [messagesPerHour, setMessagesPerHour] = useState(200);
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0);

  // Moderation hooks - pass null-safe channelId
  const channelId = channel?.id || null;
  const { rateLimits, updateRateLimits, loading: moderationLoading } = useModeration(channelId, currentUserId);
  const { isAdmin, members: channelMembers, loading: membersLoading } = useChannelRoles(channelId, currentUserId);

  // Use accurate member count from channel_members table, fallback to prop
  const actualMemberCount = channelMembers?.length > 0 ? channelMembers.length : memberCount;

  // Sync rate limits to form when loaded
  useEffect(() => {
    if (rateLimits) {
      setMessagesPerMinute(rateLimits.messages_per_minute || 30);
      setMessagesPerHour(rateLimits.messages_per_hour || 200);
      setSlowmodeSeconds(rateLimits.slowmode_seconds || 0);
    }
  }, [rateLimits]);

  // Guard: Don't render if channel is not available (after all hooks)
  if (!channel) {
    return null;
  }

  const handleSaveRateLimits = async () => {
    await updateRateLimits({
      messagesPerMinute: parseInt(messagesPerMinute) || 30,
      messagesPerHour: parseInt(messagesPerHour) || 200,
      slowmodeSeconds: slowmodeSeconds ? parseInt(slowmodeSeconds) : null
    });
  };

  const handleSave = async () => {
    if (editName.trim()) {
      await onUpdateChannel?.({
        name: editName.trim(),
        description: editDescription.trim()
      });
      setIsEditing(false);
    }
  };

  const isDM = channel?.type === 'dm';

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          {isDM ? 'Conversation Details' : 'Channel Details'}
        </h3>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              {channel?.type === 'private' ? (
                <Lock className="w-6 h-6 text-rose-400" />
              ) : (
                <Hash className="w-6 h-6 text-zinc-400" />
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white h-8"
                />
              ) : (
                <h4 className="font-semibold text-white">{channel?.name}</h4>
              )}
              <div className="text-xs text-zinc-500 capitalize">{channel?.type} channel</div>
            </div>
            {!isDM && isOwner && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-zinc-400" />
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
                className="bg-zinc-800 border-zinc-700 text-white text-sm min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500">
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="border-zinc-700">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              {channel?.description || 'No description'}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-zinc-800 grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-zinc-900/50">
            <Users className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              {membersLoading ? '...' : actualMemberCount}
            </div>
            <div className="text-xs text-zinc-500">Members</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-zinc-900/50">
            <Calendar className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="text-sm font-medium text-white">
              {(() => {
                try {
                  return channel?.created_date ? format(new Date(channel.created_date), 'MMM d, yyyy') : 'Unknown';
                } catch {
                  return 'Unknown';
                }
              })()}
            </div>
            <div className="text-xs text-zinc-500">Created</div>
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 space-y-2">
          <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Settings</h5>
          
          <button
            onClick={toggleMute}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors text-left"
          >
            {isMuted ? (
              <BellOff className="w-5 h-5 text-zinc-400" />
            ) : (
              <Bell className="w-5 h-5 text-zinc-400" />
            )}
            <div className="flex-1">
              <div className="text-sm text-white">{isMuted ? 'Unmute' : 'Mute'} channel</div>
              <div className="text-xs text-zinc-500">
                {isMuted ? 'Get notified of new messages' : 'Stop notifications'}
              </div>
            </div>
          </button>

          {!isDM && (
            <>
              {isOwner && (
                <button
                  onClick={() => onArchiveChannel?.(channel)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <Archive className="w-5 h-5 text-zinc-400" />
                  <div className="flex-1">
                    <div className="text-sm text-white">Archive channel</div>
                    <div className="text-xs text-zinc-500">Hide from channel list</div>
                  </div>
                </button>
              )}

              {isOwner && (
                <button
                  onClick={() => onDeleteChannel?.(channel)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 transition-colors text-left group"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <div className="flex-1">
                    <div className="text-sm text-red-400">Delete channel</div>
                    <div className="text-xs text-zinc-500">This cannot be undone</div>
                  </div>
                </button>
              )}
            </>
          )}
        </div>

        {/* Moderation Settings (Admin only) */}
        {!isDM && isAdmin && (
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={() => setShowModerationSettings(!showModerationSettings)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors text-left"
            >
              <Shield className="w-5 h-5 text-cyan-400" />
              <div className="flex-1">
                <div className="text-sm text-white font-medium">Moderation Settings</div>
                <div className="text-xs text-zinc-500">Rate limits & slowmode</div>
              </div>
              {showModerationSettings ? (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            <AnimatePresence>
              {showModerationSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-4 bg-zinc-900/50 rounded-lg p-4">
                    {/* Slowmode */}
                    <div>
                      <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Slowmode (seconds between messages)
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {[0, 5, 10, 30, 60, 120].map((sec) => (
                          <button
                            key={sec}
                            onClick={() => setSlowmodeSeconds(sec)}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                              slowmodeSeconds === sec
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                            }`}
                          >
                            {sec === 0 ? 'Off' : `${sec}s`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Messages per minute */}
                    <div>
                      <label className="text-xs text-zinc-400 mb-2 block">Messages per minute</label>
                      <Input
                        type="number"
                        value={messagesPerMinute}
                        onChange={(e) => setMessagesPerMinute(e.target.value)}
                        min={1}
                        max={100}
                        className="bg-zinc-800 border-zinc-700 text-white h-9"
                      />
                    </div>

                    {/* Messages per hour */}
                    <div>
                      <label className="text-xs text-zinc-400 mb-2 block">Messages per hour</label>
                      <Input
                        type="number"
                        value={messagesPerHour}
                        onChange={(e) => setMessagesPerHour(e.target.value)}
                        min={1}
                        max={1000}
                        className="bg-zinc-800 border-zinc-700 text-white h-9"
                      />
                    </div>

                    {/* Save button */}
                    <Button
                      onClick={handleSaveRateLimits}
                      disabled={moderationLoading}
                      className="w-full bg-cyan-600 hover:bg-cyan-500"
                    >
                      {moderationLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Save Settings
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
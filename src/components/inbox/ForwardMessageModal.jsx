/**
 * ForwardMessageModal - Modal for forwarding messages to other channels
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Hash, Users, Lock, Forward, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export default function ForwardMessageModal({
  isOpen,
  onClose,
  message,
  channels = [],
  directMessages = [],
  currentUser,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [addComment, setAddComment] = useState('');
  const [forwarding, setForwarding] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedChannelId(null);
      setAddComment('');
    }
  }, [isOpen]);

  // Filter channels by search
  const filteredChannels = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return channels.filter(ch =>
      ch.name?.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  const filteredDMs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return directMessages.filter(dm =>
      dm.name?.toLowerCase().includes(query)
    );
  }, [directMessages, searchQuery]);

  const handleForward = async () => {
    if (!selectedChannelId || !message || !currentUser) return;

    setForwarding(true);
    try {
      // Find the target channel
      const targetChannel = [...channels, ...directMessages].find(c => c.id === selectedChannelId);

      // Create forwarded message
      const { error } = await supabase.from('messages').insert({
        channel_id: selectedChannelId,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name || currentUser.email,
        sender_avatar: currentUser.avatar_url,
        content: addComment
          ? `${addComment}\n\n---\n**Forwarded message from ${message.sender_name}:**\n${message.content}`
          : `**Forwarded message from ${message.sender_name}:**\n${message.content}`,
        type: message.type === 'image' || message.type === 'file' ? message.type : 'text',
        metadata: message.metadata || {},
        is_forwarded: true,
        original_message_id: message.id,
        forwarded_from_channel: message.channel_name || 'another channel',
      });

      if (error) throw error;

      toast.success(`Message forwarded to #${targetChannel?.name || 'channel'}`);
      onClose();
    } catch (error) {
      console.error('[Forward] Failed:', error);
      toast.error('Failed to forward message');
    }
    setForwarding(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Forward className="w-5 h-5 text-cyan-400" />
              Forward Message
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Message Preview */}
          <div className="p-4 border-b border-zinc-800">
            <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center gap-2 mb-2">
                {message?.sender_avatar ? (
                  <img src={message.sender_avatar} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                    {message?.sender_name?.charAt(0) || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-white">{message?.sender_name}</span>
              </div>
              <p className="text-sm text-zinc-300 line-clamp-3">{message?.content}</p>
            </div>
          </div>

          {/* Add Comment */}
          <div className="p-4 border-b border-zinc-800">
            <label className="text-sm text-zinc-400 mb-2 block">Add a comment (optional)</label>
            <textarea
              value={addComment}
              onChange={(e) => setAddComment(e.target.value)}
              placeholder="Add a note to go with the message..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Channel Search */}
          <div className="p-4 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Channel List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredChannels.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-xs text-zinc-500 font-semibold uppercase">Channels</div>
                {filteredChannels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      selectedChannelId === channel.id
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'hover:bg-zinc-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      {channel.type === 'private' ? (
                        <Lock className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <Hash className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                    <span className="text-sm text-white">{channel.name}</span>
                  </button>
                ))}
              </div>
            )}

            {filteredDMs.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs text-zinc-500 font-semibold uppercase">Direct Messages</div>
                {filteredDMs.map(dm => (
                  <button
                    key={dm.id}
                    onClick={() => setSelectedChannelId(dm.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      selectedChannelId === dm.id
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'hover:bg-zinc-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <Users className="w-4 h-4 text-zinc-400" />
                    </div>
                    <span className="text-sm text-white">{dm.name}</span>
                  </button>
                ))}
              </div>
            )}

            {filteredChannels.length === 0 && filteredDMs.length === 0 && (
              <div className="text-center py-8">
                <p className="text-zinc-500 text-sm">No channels found</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={!selectedChannelId || forwarding}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {forwarding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Forwarding...
                </>
              ) : (
                <>
                  <Forward className="w-4 h-4" />
                  Forward
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

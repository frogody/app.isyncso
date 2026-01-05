import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hash, Lock, X, Loader2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

export default function CreateChannelModal({ 
  open, 
  onClose, 
  onCreate,
  teamMembers = []
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setCreating(true);
    try {
      await onCreate({
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        type: isPrivate ? 'private' : 'public',
        members: isPrivate ? selectedMembers : []
      });

      // Reset form only on success
      setName('');
      setDescription('');
      setIsPrivate(false);
      setSelectedMembers([]);
      onClose();
    } catch (error) {
      // Error is already handled in onCreate, just keep modal open
      console.error('[CreateChannelModal] Channel creation failed:', error);
    } finally {
      setCreating(false);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isPrivate ? <Lock className="w-5 h-5 text-rose-400" /> : <Hash className="w-5 h-5 text-cyan-400" />}
            Create a channel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-zinc-400">
            Channels are where your team communicates. They're best organized around a topic — #marketing, for example.
          </p>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                placeholder="e.g. marketing"
                className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
                maxLength={80}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {80 - name.length} characters remaining
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description <span className="text-zinc-500">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          {/* Private toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-center gap-3">
              <Lock className={`w-5 h-5 ${isPrivate ? 'text-rose-400' : 'text-zinc-500'}`} />
              <div>
                <div className="text-sm font-medium text-white">Make private</div>
                <div className="text-xs text-zinc-500">Only invited members can see this channel</div>
              </div>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {/* Member selection for private channels */}
          {isPrivate && teamMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Add members
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                {teamMembers.map(member => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="rounded border-zinc-600 bg-zinc-700 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                      {member.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm text-white">{member.full_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Channel'
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
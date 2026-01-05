import React from 'react';
import { motion } from 'framer-motion';
import { X, Users, Crown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MembersPanel({ 
  channel, 
  members = [], 
  onClose,
  onStartDM,
  currentUserId
}) {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-72 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Members
        </h3>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {members.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No members found
          </div>
        ) : (
          members.map(member => (
            <div 
              key={member.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="relative">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                    {member.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-zinc-950" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate flex items-center gap-1">
                  {member.full_name || 'Unknown'}
                  {member.role === 'admin' && (
                    <Crown className="w-3 h-3 text-amber-400" />
                  )}
                </div>
                <div className="text-xs text-zinc-500 truncate">{member.email}</div>
              </div>
              {member.id !== currentUserId && onStartDM && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onStartDM(member)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                  title="Send direct message"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 text-center">
          {members.length} member{members.length !== 1 ? 's' : ''} in this {channel?.type === 'dm' ? 'conversation' : 'channel'}
        </div>
      </div>
    </motion.div>
  );
}
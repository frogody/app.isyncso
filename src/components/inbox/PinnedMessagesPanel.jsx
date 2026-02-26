import React from 'react';
import { motion } from 'framer-motion';
import { X, Pin, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function PinnedMessagesPanel({ 
  pinnedMessages = [], 
  onClose,
  onJumpToMessage 
}) {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Pin className="w-4 h-4 text-violet-400" />
          Pinned Messages
        </h3>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pinnedMessages.length === 0 ? (
          <div className="text-center py-12">
            <Pin className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No pinned messages yet</p>
            <p className="text-zinc-600 text-xs mt-1">Pin important messages to find them later</p>
          </div>
        ) : (
          pinnedMessages.map(message => (
            <div 
              key={message.id}
              onClick={() => onJumpToMessage?.(message)}
              className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                {message.sender_avatar ? (
                  <img src={message.sender_avatar} alt="" className="w-5 h-5 rounded-full"  loading="lazy" decoding="async" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {message.sender_name?.charAt(0) || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-white">{message.sender_name}</span>
                <span className="text-xs text-zinc-500">
                  {format(new Date(message.created_date), 'MMM d')}
                </span>
              </div>
              <p className="text-sm text-zinc-300 line-clamp-3">{message.content}</p>
              <div className="mt-2 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to jump to message
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
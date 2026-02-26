import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Hash, MessageSquare } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ThreadPanel({ 
  parentMessage, 
  replies, 
  currentUserId,
  channelName,
  onClose,
  onSendReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  isLoading
}) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-96 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Thread
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            <Hash className="w-3 h-3 inline" /> {channelName}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Parent message */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-3">
          {parentMessage.sender_avatar ? (
            <img src={parentMessage.sender_avatar} alt="" className="w-9 h-9 rounded-full"  loading="lazy" decoding="async" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-sm font-bold text-white">
              {parentMessage.sender_name?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-white text-sm">{parentMessage.sender_name}</span>
            </div>
            <p className="text-sm text-zinc-300 mt-1">{parentMessage.content}</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto">
        {replies.map(reply => (
          <div key={reply.id} className="px-4 py-3 hover:bg-zinc-800/30 transition-colors">
            <div className="flex gap-3">
              {reply.sender_avatar ? (
                <img src={reply.sender_avatar} alt="" className="w-8 h-8 rounded-full"  loading="lazy" decoding="async" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                  {reply.sender_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-white text-sm">{reply.sender_name}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(reply.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 mt-0.5">{reply.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply input */}
      <MessageInput
        channelName="thread"
        placeholder="Reply..."
        onSend={(msg) => onSendReply({ ...msg, thread_id: parentMessage.id })}
      />
    </motion.div>
  );
}
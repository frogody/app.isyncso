// ---------------------------------------------------------------------------
// AIChatPanel.jsx -- Expandable AI conversation panel for the B2B Store
// Builder. Slides in from the right, shows full chat history, and lets users
// send follow-up prompts directly from the panel.
// ---------------------------------------------------------------------------

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowUp, Loader2, Image as ImageIcon, Paperclip } from 'lucide-react';

// ---------------------------------------------------------------------------
// Relative-time helper
// ---------------------------------------------------------------------------

function formatRelativeTime(date) {
  if (!date) return '';

  const now = Date.now();
  const then = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return '';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const d = new Date(then);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Typing indicator (three bouncing dots)
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-4 pb-4">
      <div className="w-7 h-7 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
      </div>
      <div className="bg-zinc-800/60 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-1.5 h-1.5 rounded-full bg-zinc-400"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single chat message bubble
// ---------------------------------------------------------------------------

function ChatBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 pb-3`}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5 mr-2.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        </div>
      )}

      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-cyan-500/15 text-white rounded-2xl rounded-tr-md'
              : 'bg-zinc-800/60 text-zinc-300 rounded-2xl rounded-tl-md'
          }`}
        >
          {message.content}
        </div>

        {message.timestamp && (
          <span className="text-[10px] text-zinc-600 mt-1 px-1 select-none">
            {formatRelativeTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AIChatPanel({
  messages = [],
  isProcessing = false,
  isOpen = false,
  onClose,
  onSendPrompt,
}) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isProcessing;

  const handleAddFiles = useCallback((files) => {
    const newAttachments = Array.from(files).map((file) => ({
      id: Math.random().toString(36).slice(2, 10),
      file,
      name: file.name,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleRemoveAttachment = useCallback((id) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive or processing state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to let the slide animation start
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const prompt = value.trim();
    if ((!prompt && attachments.length === 0) || isProcessing) return;

    const currentAttachments = [...attachments];
    setValue('');
    setAttachments([]);
    currentAttachments.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview); });

    let fullPrompt = prompt;
    if (currentAttachments.length > 0) {
      const fileNames = currentAttachments.map((a) => a.name).join(', ');
      fullPrompt = prompt ? `${prompt}\n\n[Attached files: ${fileNames}]` : `[Attached files: ${fileNames}]`;
    }

    try {
      await onSendPrompt(fullPrompt);
    } catch (err) {
      console.error('AIChatPanel: send failed', err);
    }
  }, [value, attachments, isProcessing, onSendPrompt]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="fixed top-0 right-0 z-40 w-[380px] h-full bg-zinc-900 border-l border-zinc-800/60 flex flex-col shadow-2xl"
        >
          {/* ---- Header ---- */}
          <div className="shrink-0 h-14 flex items-center justify-between px-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4.5 h-4.5 text-cyan-400" />
              <span className="text-sm font-semibold text-white">AI Assistant</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ---- Messages area ---- */}
          <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {messages.length === 0 && !isProcessing && (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-sm font-medium text-zinc-300 mb-1">No messages yet</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Use the prompt bar below or the main input to start a conversation with the AI assistant.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <ChatBubble key={msg.id || idx} message={msg} />
            ))}

            {isProcessing && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* ---- Input area ---- */}
          <div className="shrink-0 border-t border-zinc-800/60 p-3">
            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleAddFiles(e.target.files); e.target.value = ''; }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv,.json,.svg"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleAddFiles(e.target.files); e.target.value = ''; }}
            />

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1.5"
                  >
                    {att.preview ? (
                      <img src={att.preview} alt={att.name} className="w-7 h-7 rounded object-cover" />
                    ) : (
                      <Paperclip className="w-3 h-3 text-zinc-500" />
                    )}
                    <span className="text-[10px] text-zinc-400 max-w-[80px] truncate">{att.name}</span>
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="w-3.5 h-3.5 rounded-full bg-zinc-700 hover:bg-red-500/80 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Textarea with action bar */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:border-cyan-500/30 transition-all">
              <textarea
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                placeholder="Describe what you want to build or change..."
                rows={3}
                className="w-full bg-transparent px-3.5 pt-2.5 pb-1 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50 resize-none"
                style={{ minHeight: '80px', maxHeight: '160px' }}
              />

              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60 transition-colors disabled:opacity-40"
                    title="Attach image"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60 transition-colors disabled:opacity-40"
                    title="Attach file"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isProcessing ? (
                  <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      canSend
                        ? 'bg-cyan-500 text-white hover:bg-cyan-400 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

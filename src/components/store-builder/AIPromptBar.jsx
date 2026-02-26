// ---------------------------------------------------------------------------
// AIPromptBar.jsx -- Bottom bar for AI chat input in the B2B Store Builder.
// Accepts user prompts, shows quick suggestion chips, supports image/file
// attachments, and indicates processing state.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowUp,
  Loader2,
  MessageSquare,
  Image as ImageIcon,
  Paperclip,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SUGGESTIONS = [
  'Make it dark themed',
  'Add a testimonials section',
  'Change hero text',
  'Make it more minimal',
  'Add company stats',
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AIPromptBar({
  onSendPrompt,
  isProcessing = false,
  suggestions = DEFAULT_SUGGESTIONS,
  onExpandChat,
}) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState([]);
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

  const handleSend = useCallback(async () => {
    const prompt = value.trim();
    if ((!prompt && attachments.length === 0) || isProcessing) return;

    const currentAttachments = [...attachments];
    const savedPrompt = prompt;
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
      console.error('AIPromptBar: send failed', err);
      setValue(savedPrompt);
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

  const handleSuggestionClick = useCallback(
    (suggestion) => {
      setValue(suggestion);
      inputRef.current?.focus();
    },
    [],
  );

  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const displaySuggestions = suggestions && suggestions.length > 0;

  return (
    <div className="shrink-0">
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

      {/* Suggestion chips */}
      <AnimatePresence>
        {displaySuggestions && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto scrollbar-none"
          >
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="shrink-0 text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white rounded-full px-3 py-1 transition-colors whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1"
            >
              {att.preview ? (
                <img src={att.preview} alt={att.name} className="w-6 h-6 rounded object-cover"  loading="lazy" decoding="async" />
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

      {/* Input bar */}
      <div className="border-t border-zinc-800/60 bg-zinc-950 px-4 py-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:border-cyan-500/30 transition-all">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="Describe what you want to build or change..."
            rows={3}
            className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50 resize-none"
            style={{ minHeight: '80px', maxHeight: '160px' }}
          />

          {/* Bottom bar: attach + expand + send */}
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-0.5">
              <button
                onClick={onExpandChat}
                className="p-1.5 rounded-lg text-cyan-400 hover:bg-zinc-800 transition-colors"
                title="Open AI chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60 transition-colors disabled:opacity-40"
                title="Attach image"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-[11px] hidden sm:inline">Image</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60 transition-colors disabled:opacity-40"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-[11px] hidden sm:inline">File</span>
              </button>
            </div>

            {isProcessing ? (
              <div className="w-9 h-9 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  canSend
                    ? 'bg-cyan-500 text-white hover:bg-cyan-400 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

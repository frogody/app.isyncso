import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Plus, Smile, Code, Bold, Italic,
  Link, List, X, Loader2, Paperclip, VolumeX, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import AutocompletePopup, { EMOJI_SHORTCODES } from './AutocompletePopup';
import { AVAILABLE_AGENTS } from './AgentMentionHandler';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🙌', '👏', '🤝', '🙏', '💪', '🤷', '💯'],
  'Objects': ['⭐', '🔥', '💡', '💯', '🎉', '🎊', '🎁', '🏆', '🚀', '💻', '📱', '📧', '📎', '✅', '❌', '❤️'],
};

export default function MessageInput({
  channelName,
  channelId,
  onSend,
  disabled,
  placeholder,
  onTyping,
  onStopTyping,
  typingText,
  typingUsers = [],
  replyingTo,
  onCancelReply,
  members = [],
  channels = [],
  onEditLastMessage,
  // Moderation props
  isMuted = false,
  rateLimits = null,
  checkRateLimit,
  slowmodeSeconds = 0
}) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const [autocomplete, setAutocomplete] = useState({
    show: false,
    type: null,
    query: '',
    selectedIndex: 0,
    triggerPos: 0
  });

  // Draft auto-save
  useEffect(() => {
    if (channelId) {
      const draft = localStorage.getItem(`inbox_draft_${channelId}`);
      if (draft) {
        // Clean up known pollution patterns from formatting buttons
        const cleanDraft = draft
          .replace(/\[\]\(url\)/g, '') // Empty link
          .replace(/\*\*\*\*/g, '')     // Empty bold
          .replace(/__/g, '')           // Empty italic
          .replace(/``/g, '')           // Empty code
          .trim();
        setMessage(cleanDraft);
      }
    }
  }, [channelId]);

  useEffect(() => {
    if (channelId && message) {
      localStorage.setItem(`inbox_draft_${channelId}`, message);
    }
  }, [message, channelId]);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown > 0) {
      const timer = setInterval(() => {
        setRateLimitCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimitCountdown]);

  const handleSend = async () => {
    if (!message.trim() && files.length === 0) return;

    // Check if user is muted
    if (isMuted) {
      toast.error('You are muted in this channel');
      return;
    }

    // Check rate limit
    if (checkRateLimit) {
      const rateCheck = await checkRateLimit();
      if (!rateCheck.allowed) {
        toast.error(rateCheck.message || 'Rate limit exceeded');
        if (rateCheck.retry_after) {
          setRateLimitCountdown(rateCheck.retry_after);
        }
        return;
      }
    }
    
    let fileUrl = null;
    let fileName = null;
    let messageType = 'text';

    if (files.length > 0) {
      setUploading(true);
      try {
        const result = await db.integrations.Core.UploadFile({ file: files[0] });
        fileUrl = result.file_url;
        fileName = files[0].name;
        messageType = files[0].type.startsWith('image/') ? 'image' : 'file';
      } catch (error) {
        toast.error('Failed to upload file');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSend({
      content: message.trim(),
      type: messageType,
      file_url: fileUrl,
      file_name: fileName,
      thread_id: replyingTo?.id,
      mentions: mentionedUsers
    });

    setMessage('');
    setFiles([]);
    setMentionedUsers([]);
    onCancelReply?.();
    onStopTyping?.();

    if (channelId) {
      localStorage.removeItem(`inbox_draft_${channelId}`);
    }
  };

  const handleKeyDown = (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    if (autocomplete.show) {
      const items = getAutocompleteItems();
      const itemCount = items.length;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, selectedIndex: itemCount > 0 ? (prev.selectedIndex + 1) % itemCount : 0 }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, selectedIndex: itemCount > 0 ? (prev.selectedIndex - 1 + itemCount) % itemCount : 0 }));
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (items.length > 0) {
          handleAutocompleteSelect(items[autocomplete.selectedIndex % itemCount]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocomplete();
        return;
      }
    }

    if (cmdKey && e.key === 'b') { e.preventDefault(); formatText('bold'); return; }
    if (cmdKey && e.key === 'i') { e.preventDefault(); formatText('italic'); return; }
    if (cmdKey && e.key === 'k') { e.preventDefault(); formatText('link'); return; }
    if (cmdKey && e.key === 'u') { e.preventDefault(); fileInputRef.current?.click(); return; }

    if (e.key === 'Escape') {
      if (replyingTo) {
        onCancelReply?.();
      }
      closeAutocomplete();
      return;
    }

    if (e.key === 'ArrowUp' && !message.trim() && onEditLastMessage) {
      e.preventDefault();
      onEditLastMessage();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setMessage(value);
    onTyping?.();

    const textBeforeCursor = value.slice(0, cursorPos);
    
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setAutocomplete({
        show: true,
        type: 'mention',
        query: mentionMatch[1],
        selectedIndex: 0,
        triggerPos: cursorPos - mentionMatch[0].length
      });
      return;
    }

    const channelMatch = textBeforeCursor.match(/#(\w*)$/);
    if (channelMatch) {
      setAutocomplete({
        show: true,
        type: 'channel',
        query: channelMatch[1],
        selectedIndex: 0,
        triggerPos: cursorPos - channelMatch[0].length
      });
      return;
    }

    const emojiMatch = textBeforeCursor.match(/:(\w{2,})$/);
    if (emojiMatch) {
      setAutocomplete({
        show: true,
        type: 'emoji',
        query: emojiMatch[1],
        selectedIndex: 0,
        triggerPos: cursorPos - emojiMatch[0].length
      });
      return;
    }

    if (value.startsWith('/')) {
      const commandMatch = value.match(/^\/(\w*)$/);
      if (commandMatch) {
        setAutocomplete({
          show: true,
          type: 'command',
          query: commandMatch[1],
          selectedIndex: 0,
          triggerPos: 0
        });
        return;
      }
    }

    closeAutocomplete();
  };

  const closeAutocomplete = () => {
    setAutocomplete({ show: false, type: null, query: '', selectedIndex: 0, triggerPos: 0 });
  };

  const handleAutocompleteSelect = (item) => {
    if (!autocomplete.show) return;
    
    const { type, triggerPos } = autocomplete;
    let insertText = '';
    const cursorPos = textareaRef.current?.selectionStart || message.length;

    const items = getAutocompleteItems();
    if (!item && items.length > 0) {
      item = items[autocomplete.selectedIndex % items.length];
    }
    
    if (!item) {
      closeAutocomplete();
      return;
    }

    switch (type) {
      case 'mention':
        if (item.type === 'agent') {
          insertText = `@${item.agentType} `;
        } else {
          const displayName = item.full_name || item.email?.split('@')[0] || 'user';
          insertText = `@${displayName} `;
          if (item.id) {
            setMentionedUsers(prev => [...prev, item.id]);
          }
        }
        break;
      case 'channel':
        insertText = `#${item.name} `;
        break;
      case 'emoji':
        insertText = `${item.emoji} `;
        break;
      case 'command':
        insertText = `${item.command} `;
        break;
      default:
        closeAutocomplete();
        return;
    }

    const before = message.slice(0, triggerPos);
    const after = message.slice(cursorPos);
    const newMessage = before + insertText + after;
    
    setMessage(newMessage);
    closeAutocomplete();
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = triggerPos + insertText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const getAutocompleteItems = () => {
    const q = autocomplete.query.toLowerCase();
    switch (autocomplete.type) {
      case 'mention':
        const filteredUsers = members.filter(u => 
          u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
        ).slice(0, 4);
        
        const filteredAgents = Object.entries(AVAILABLE_AGENTS)
          .filter(([key, agent]) => 
            key.includes(q) || agent.displayName.toLowerCase().includes(q)
          )
          .map(([key, agent]) => ({
            id: `agent_${key}`,
            type: 'agent',
            agentType: key,
            full_name: agent.displayName,
            description: agent.description,
            icon: agent.icon,
            color: agent.color,
            bgColor: agent.bgColor
          }))
          .slice(0, 3);
        
        return [...filteredAgents, ...filteredUsers];
      case 'channel':
        return channels.filter(ch => ch.name?.toLowerCase().includes(q)).slice(0, 6);
      case 'emoji':
        return Object.entries(EMOJI_SHORTCODES)
          .filter(([code]) => code.includes(q))
          .map(([code, emoji]) => ({ code, emoji }))
          .slice(0, 6);
      case 'command':
        return [
          { command: '/giphy', description: 'Search for a GIF' },
          { command: '/remind', description: 'Set a reminder' },
          { command: '/status', description: 'Set your status' },
          { command: '/mute', description: 'Mute this channel' },
          { command: '/leave', description: 'Leave this channel' },
        ].filter(cmd => cmd.command.includes(q)).slice(0, 6);
      default:
        return [];
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
    }
  };

  const insertEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const formatText = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);

    let formattedText = '';
    // Use placeholder text if nothing is selected
    const text = selectedText || (format === 'link' ? 'link text' : 'text');
    switch (format) {
      case 'bold': formattedText = `**${text}**`; break;
      case 'italic': formattedText = `_${text}_`; break;
      case 'code': formattedText = `\`${text}\``; break;
      case 'link': formattedText = `[${text}](url)`; break;
      default: return;
    }

    setMessage(prev => prev.substring(0, start) + formattedText + prev.substring(end));
    textarea.focus();
  };

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-950">
      {/* Reply indicator */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 sm:px-6 pt-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-cyan-400 font-medium">Replying to {replyingTo.sender_name}</span>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{replyingTo.content}</p>
              </div>
              <button
                onClick={onCancelReply}
                className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File preview */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 sm:px-6 pt-3 overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              {files[0].type.startsWith('image/') ? (
                <img 
                  src={URL.createObjectURL(files[0])} 
                  alt="" 
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center">
                  <Paperclip className="w-6 h-6 text-cyan-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate font-medium">{files[0].name}</p>
                <p className="text-xs text-zinc-500">{(files[0].size / 1024).toFixed(1)} KB</p>
              </div>
              <button 
                onClick={() => setFiles([])}
                className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 sm:px-6 overflow-hidden"
          >
            <div className="flex items-center gap-2 py-2">
              {typingUsers.length > 0 && typingUsers[0]?.avatar ? (
                <img
                  src={typingUsers[0].avatar}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
              ) : typingUsers.length > 0 ? (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-[9px] font-bold text-white">
                  {typingUsers[0]?.name?.charAt(0) || '?'}
                </div>
              ) : null}
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                {typingText}
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Muted indicator */}
      <AnimatePresence>
        {isMuted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 sm:px-6 overflow-hidden"
          >
            <div className="flex items-center gap-2 py-2 px-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <VolumeX className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span className="text-sm text-orange-400">You are muted in this channel</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slowmode / Rate limit indicator */}
      <AnimatePresence>
        {(slowmodeSeconds > 0 || rateLimitCountdown > 0) && !isMuted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 sm:px-6 overflow-hidden"
          >
            <div className="flex items-center gap-2 py-2 px-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-sm text-cyan-400">
                {rateLimitCountdown > 0
                  ? `Wait ${rateLimitCountdown}s before sending another message`
                  : `Slowmode enabled: ${slowmodeSeconds}s between messages`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="px-3 py-2 sm:px-4">
        <div className="relative bg-zinc-900/50 rounded-lg">
          {/* Formatting toolbar - hidden on mobile */}
          <AnimatePresence>
            {showFormatting && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="hidden sm:flex items-center gap-0.5 px-2 py-2 border-b border-zinc-700/50"
              >
                {[
                  { icon: Bold, action: 'bold', title: 'Bold (⌘B)' },
                  { icon: Italic, action: 'italic', title: 'Italic (⌘I)' },
                  { icon: Code, action: 'code', title: 'Code' },
                  { icon: Link, action: 'link', title: 'Link (⌘K)' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => formatText(item.action)}
                    className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
                    title={item.title}
                  >
                    <item.icon className="w-4 h-4 text-zinc-400" />
                  </button>
                ))}
                <div className="h-4 w-px bg-zinc-700 mx-1" />
                <button className="p-2 hover:bg-zinc-800 rounded-md transition-colors" title="List">
                  <List className="w-4 h-4 text-zinc-400" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text input */}
          <div className="flex items-end gap-1.5 p-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors flex-shrink-0"
              title="Attach file (⌘U)"
            >
              <Plus className="w-4 h-4 text-zinc-400" />
            </button>

            <div className="flex-1 relative">
              <AnimatePresence>
                {autocomplete.show && (
                  <AutocompletePopup
                    type={autocomplete.type}
                    query={autocomplete.query}
                    items={autocomplete.type === 'mention' ? members : autocomplete.type === 'channel' ? channels : []}
                    selectedIndex={autocomplete.selectedIndex}
                    onSelect={handleAutocompleteSelect}
                    onClose={closeAutocomplete}
                  />
                )}
              </AnimatePresence>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || `Message #${channelName || 'channel'}`}
                disabled={disabled || uploading || isMuted || rateLimitCountdown > 0}
                rows={1}
                className="inbox-textarea w-full resize-none text-sm max-h-32 min-h-[24px] py-1 leading-relaxed focus:outline-none focus:ring-0 placeholder:text-zinc-500"
                style={{ 
                  height: 'auto', 
                  border: 'none !important', 
                  outline: 'none !important', 
                  boxShadow: 'none !important',
                  background: 'transparent !important',
                  backgroundColor: 'transparent !important',
                  color: '#e4e4e7',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                }}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />

            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {/* Formatting button - hidden on mobile */}
              <button
                onClick={() => setShowFormatting(!showFormatting)}
                className={`hidden sm:block p-2 rounded-lg transition-all ${
                  showFormatting
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'hover:bg-zinc-800 text-zinc-400'
                }`}
                title="Formatting options"
              >
                <Bold className="w-4 h-4" />
              </button>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-lg transition-colors" title="Add emoji">
                    <Smile className="w-5 h-5 text-zinc-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="bg-zinc-900 border-zinc-700 w-72 sm:w-80 p-0" align="end">
                  <div className="max-h-72 overflow-y-auto p-3 scrollbar-hide">
                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                      <div key={category} className="mb-4">
                        <h4 className="text-xs text-zinc-500 font-semibold mb-2 px-1 uppercase tracking-wide">{category}</h4>
                        <div className="grid grid-cols-8 gap-1">
                          {emojis.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => insertEmoji(emoji)}
                              className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-lg text-lg sm:text-xl transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <button
                onClick={handleSend}
                disabled={(!message.trim() && files.length === 0) || uploading || isMuted || rateLimitCountdown > 0}
                className="p-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-all"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreHorizontal, Reply, Smile, Bookmark, Share, Pin, Edit2,
  Trash2, MessageSquare, Loader2, Forward,
  ChevronDown, ChevronUp, Send, CornerDownRight, CheckCheck, BookmarkCheck
} from 'lucide-react';
import FilePreview from './FilePreview';
import { format, isToday, isYesterday } from 'date-fns';
import { AVAILABLE_AGENTS } from './AgentMentionHandler';
import { PollMessage, DecisionMessage, ActionItemMessage, VoiceNote, EntityCard } from './messages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '💯', '🙏'];

// Parse and render message content with subtle mention highlighting
const renderMessageContent = (content, teamMembers = []) => {
  if (!content) return null;

  // Pattern to match @mentions (usernames, agents) and #channels
  const mentionPattern = /(@\w+(?:\s+\w+)?|#\w+)/g;
  const parts = content.split(mentionPattern);

  return parts.map((part, index) => {
    // Check if this part is a mention
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300/90 font-medium text-sm cursor-pointer hover:bg-cyan-500/20 transition-colors"
        >
          {part}
        </span>
      );
    }

    // Check if this part is a channel reference
    if (part.startsWith('#')) {
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-700/40 text-zinc-400 font-medium text-sm cursor-pointer hover:bg-zinc-700/60 transition-colors"
        >
          {part}
        </span>
      );
    }

    // Regular text
    return <span key={index}>{part}</span>;
  });
};

function MessageBubble({
  message,
  isOwn,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onOpenThread,
  onLoadReplies,
  onSendReply,
  replies = [],
  repliesLoading = false,
  showThread = true,
  currentUserId,
  teamMembers = [],
  currentUser,
  readReceipts = [],
  readStatusText,
  onBookmark,
  onForward,
  isBookmarked = false,
  onVote,
  onDecide,
  onSupport,
  onToggleComplete,
  onAssign,
}) {
  const [showActions, setShowActions] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Load replies when thread is expanded
  const handleToggleThread = async () => {
    if (!threadExpanded && message.reply_count > 0 && onLoadReplies) {
      await onLoadReplies(message.id);
    }
    setThreadExpanded(!threadExpanded);
  };

  // Send inline reply
  const handleSendReply = async () => {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await onSendReply?.(message.id, replyText.trim());
      setReplyText('');
    } finally {
      setSendingReply(false);
    }
  };

  const handleReplyKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, h:mm a');
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleReaction = (emoji) => {
    onReact(message.id, emoji);
  };

  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, users]) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all ${
              users.includes(currentUserId)
                ? 'bg-zinc-700 border border-zinc-600 text-zinc-200'
                : 'bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 border border-zinc-700/50'
            }`}
          >
            <span>{emoji}</span>
            <span>{users.length}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderAttachment = () => {
    // Support both legacy file_url and new attachments array
    if (message.attachments?.length > 0) {
      return message.attachments.map((att, i) => (
        <FilePreview
          key={i}
          type={att.type || message.type}
          url={att.url}
          filename={att.name || att.filename}
          fileSize={att.size}
        />
      ));
    }
    if (!message.file_url) return null;
    return (
      <FilePreview
        type={message.type}
        url={message.file_url}
        filename={message.file_name}
        fileSize={message.file_size}
      />
    );
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-3">
        <span className="text-xs text-zinc-500 bg-zinc-800/50 px-4 py-1.5 rounded-full border border-zinc-700/50">
          {message.content}
        </span>
      </div>
    );
  }

  // Agent message styling
  const isAgentMessage = message.type === 'agent' && message.agent_type;
  const agent = isAgentMessage ? AVAILABLE_AGENTS[message.agent_type] : null;

  // Typing indicator for agents
  if (message.isTyping && isAgentMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex gap-2.5 px-4 sm:px-5 py-1.5 bg-zinc-900/30"
      >
        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
          {agent?.icon || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-zinc-300 truncate">
              {message.sender_name}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20 flex-shrink-0">
              AI
            </span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex ${isOwn ? 'flex-row-reverse' : ''} gap-2.5 px-4 sm:px-5 py-1.5 ${!isOwn ? 'hover:bg-zinc-800/20' : ''} transition-colors ${
        message.is_pinned ? 'bg-zinc-800/30 border-l-2 border-zinc-600' : ''
      } ${isAgentMessage ? 'bg-cyan-950/10 border-l border-cyan-500/20' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => !dropdownOpen && !emojiPopoverOpen && setShowActions(false)}
    >
      {/* Avatar - only for other people's messages */}
      {!isOwn && (
        <div className="flex-shrink-0 mt-0.5">
          {isAgentMessage ? (
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm relative">
              {agent?.icon || '🤖'}
              {message.sender_avatar && (
                <img
                  src={message.sender_avatar}
                  alt=""
                  className="w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-zinc-950"
                />
              )}
            </div>
          ) : message.sender_avatar ? (
            <img src={message.sender_avatar} alt="" className="w-7 h-7 rounded-full border border-zinc-700/50" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
              {message.sender_name?.charAt(0) || '?'}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={isOwn ? "max-w-[75%] flex flex-col items-end" : "flex-1 min-w-0"}>
        <div className={`flex items-center gap-2 flex-wrap ${isOwn ? 'justify-end' : ''}`}>
          {!isOwn && (
            <span className="font-semibold text-sm text-white">
              {message.sender_name}
            </span>
          )}
          {!isOwn && isAgentMessage && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20">
              AI
            </span>
          )}
          <span className="text-xs text-zinc-500">{formatTime(message.created_date)}</span>
          {message.is_edited && <span className="text-xs text-zinc-600">(edited)</span>}
          {message.is_pinned && <Pin className="w-3 h-3 text-zinc-500" />}
        </div>

        {/* Message bubble — only show bg/border/padding when there's text content or editing */}
        {(() => {
          const hasText = message.content && message.content.trim().length > 0;
          const hasAttachment = (message.attachments?.length > 0) || message.file_url;
          const attachmentOnly = !hasText && hasAttachment && !isEditing;

          return (
            <div className={`mt-1 ${attachmentOnly ? '' : `rounded-2xl px-3.5 py-2 ${
              isOwn
                ? 'bg-cyan-600/15 border border-cyan-500/20 rounded-tr-sm'
                : 'bg-zinc-800/60 border border-zinc-700/40 rounded-tl-sm'
            }`}`}>
              {isEditing ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-zinc-800 border border-cyan-500 rounded-lg p-3 text-sm text-white focus:outline-none resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-1.5 bg-cyan-500 text-white text-xs rounded-lg hover:bg-cyan-400 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : hasText ? (
                <p className={`text-[13px] whitespace-pre-wrap break-words leading-normal ${isOwn ? 'text-zinc-100' : 'text-zinc-200'}`}>
                  {renderMessageContent(message.content, teamMembers)}
                </p>
              ) : null}
              {renderAttachment()}

              {/* Special message formats */}
              {message.metadata?.message_format === 'poll' && message.metadata?.poll && (
                <div className="mt-2">
                  <PollMessage
                    messageId={message.id}
                    poll={message.metadata.poll}
                    currentUserId={currentUserId}
                    onVote={onVote}
                  />
                </div>
              )}
              {message.metadata?.message_format === 'decision' && message.metadata?.decision && (
                <div className="mt-2">
                  <DecisionMessage
                    messageId={message.id}
                    decision={message.metadata.decision}
                    currentUserId={currentUserId}
                    onSupport={onSupport}
                    onDecide={onDecide}
                  />
                </div>
              )}
              {message.metadata?.message_format === 'action_item' && message.metadata?.action_item && (
                <div className="mt-2">
                  <ActionItemMessage
                    messageId={message.id}
                    actionItem={message.metadata.action_item}
                    onToggleComplete={onToggleComplete}
                    onAssign={onAssign}
                  />
                </div>
              )}
              {message.metadata?.message_format === 'voice' && message.metadata?.voice && (
                <div className="mt-2">
                  <VoiceNote
                    audioUrl={message.metadata.voice.audioUrl || message.file_url}
                    duration={message.metadata.voice.duration}
                    transcript={message.metadata.voice.transcript}
                    senderName={message.sender_name}
                  />
                </div>
              )}
              {message.metadata?.entities?.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {message.metadata.entities.map((entity, i) => (
                    <EntityCard key={entity.id || i} entity={entity} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        {renderReactions()}

        {/* Read receipts indicator (only for own messages) */}
        {isOwn && readStatusText && (
          <div className="flex items-center gap-1.5 mt-1">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
                  <CheckCheck className="w-3 h-3 text-cyan-400" />
                  <span>{readStatusText}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="bg-zinc-900 border-zinc-700 p-3 w-56" align="start">
                <div className="text-xs text-zinc-400 mb-2 font-medium">Read by</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {readReceipts.map((reader) => (
                    <div key={reader.user_id} className="flex items-center gap-2">
                      {reader.user_avatar ? (
                        <img src={reader.user_avatar} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                          {reader.user_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="text-sm text-zinc-300 flex-1 truncate">{reader.user_name}</span>
                      <span className="text-xs text-zinc-500">
                        {format(new Date(reader.read_at), 'h:mm a')}
                      </span>
                    </div>
                  ))}
                  {readReceipts.length === 0 && (
                    <div className="text-xs text-zinc-500">No one has read this message yet</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Thread indicator & inline replies */}
        {showThread && (message.reply_count > 0 || threadExpanded) && (
          <div className="mt-1.5">
            {/* Thread toggle button */}
            <button
              onClick={handleToggleThread}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
                threadExpanded
                  ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
              {threadExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              )}
            </button>

            {/* Inline thread expansion */}
            <AnimatePresence>
              {threadExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 ml-4 pl-4 border-l border-zinc-700 space-y-3">
                    {/* Loading state */}
                    {repliesLoading && (
                      <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading replies...
                      </div>
                    )}

                    {/* Replies list */}
                    {!repliesLoading && replies.map((reply) => (
                      <motion.div
                        key={reply.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2.5 group/reply"
                      >
                        <div className="flex-shrink-0">
                          {reply.sender_avatar ? (
                            <img src={reply.sender_avatar} alt="" className="w-7 h-7 rounded-full border border-zinc-700/50" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                              {reply.sender_name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{reply.sender_name}</span>
                            <span className="text-xs text-zinc-500">{formatTime(reply.created_date)}</span>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words mt-0.5">
                            {renderMessageContent(reply.content, teamMembers)}
                          </p>
                        </div>
                      </motion.div>
                    ))}

                    {/* Inline reply input */}
                    <div className="flex gap-2.5 pt-2">
                      <div className="flex-shrink-0">
                        {currentUser?.avatar_url ? (
                          <img src={currentUser.avatar_url} alt="" className="w-7 h-7 rounded-full border border-zinc-700/50" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                            {currentUser?.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={handleReplyKeyDown}
                          placeholder="Reply to thread..."
                          className="flex-1 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
                        />
                        <button
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sendingReply}
                          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          {sendingReply ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Actions */}
      <AnimatePresence>
        {showActions && !isEditing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className={`absolute -top-3 ${isOwn ? 'left-6' : 'right-6'} flex items-center gap-0.5 bg-zinc-900 border border-zinc-700 rounded-lg p-0.5 shadow-2xl`}
          >
            {/* Quick reactions */}
            <Popover open={emojiPopoverOpen} onOpenChange={setEmojiPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="p-2 hover:bg-zinc-800 rounded-md transition-colors">
                  <Smile className="w-4 h-4 text-zinc-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="bg-zinc-900 border-zinc-700 p-2 w-auto" align="start">
                <div className="flex gap-1">
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleReaction(emoji);
                        setEmojiPopoverOpen(false);
                      }}
                      className="p-2 hover:bg-zinc-800 rounded-md text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <button
              onClick={handleToggleThread}
              className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
              title="Reply in thread"
            >
              <Reply className="w-4 h-4 text-zinc-400" />
            </button>

            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-zinc-800 rounded-md transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700" align="end">
                <DropdownMenuItem
                  onClick={handleToggleThread}
                  className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                >
                  <Reply className="w-4 h-4 mr-2" /> Reply in thread
                </DropdownMenuItem>
                {onOpenThread && (
                  <DropdownMenuItem
                    onClick={() => onOpenThread(message)}
                    className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> Open thread panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-zinc-700" />
                <DropdownMenuItem
                  onClick={() => onPin(message.id)}
                  className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                >
                  <Pin className="w-4 h-4 mr-2" />
                  {message.is_pinned ? 'Unpin message' : 'Pin to channel'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onBookmark?.(message.id)}
                  className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                >
                  {isBookmarked ? (
                    <><BookmarkCheck className="w-4 h-4 mr-2 text-cyan-400" /> Saved</>
                  ) : (
                    <><Bookmark className="w-4 h-4 mr-2" /> Save message</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onForward?.(message)}
                  className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                >
                  <Forward className="w-4 h-4 mr-2" /> Forward message
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-700" />
                    <DropdownMenuItem 
                      onClick={() => setIsEditing(true)}
                      className="text-zinc-300 hover:text-white focus:text-white focus:bg-zinc-800"
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> Edit message
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(message.id)}
                      className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete message
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MessageList({
  messages,
  currentUserId,
  currentUser,
  teamMembers = [],
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onOpenThread,
  onLoadReplies,
  onSendReply,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  getMessageReaders,
  getReadStatusText,
  onBookmark,
  onForward,
  isBookmarked,
  onVote,
  onDecide,
  onSupport,
  onToggleComplete,
  onAssign,
}) {
  const userMap = React.useMemo(() => {
    const map = {};
    if (currentUser) map[currentUser.id] = currentUser;
    teamMembers.forEach(m => { map[m.id] = m; });
    return map;
  }, [currentUser, teamMembers]);

  const containerRef = useRef(null);
  const loadMoreTriggerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevMessagesLength = useRef(messages.length);
  const prevScrollHeight = useRef(0);

  // State for inline thread replies
  const [threadReplies, setThreadReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});

  // Load replies for a message's inline thread
  const handleLoadReplies = async (messageId) => {
    if (loadingReplies[messageId]) return;

    setLoadingReplies(prev => ({ ...prev, [messageId]: true }));
    try {
      const replies = await onLoadReplies?.(messageId);
      if (replies) {
        setThreadReplies(prev => ({ ...prev, [messageId]: replies }));
      }
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [messageId]: false }));
    }
  };

  // Send reply in inline thread
  const handleSendReply = async (parentMessageId, content) => {
    try {
      const newReply = await onSendReply?.(parentMessageId, content);
      if (newReply) {
        setThreadReplies(prev => ({
          ...prev,
          [parentMessageId]: [...(prev[parentMessageId] || []), newReply]
        }));
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      throw error;
    }
  };

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Maintain scroll position when loading older messages
  useEffect(() => {
    if (containerRef.current && messages.length > prevMessagesLength.current) {
      const isLoadingOlder = prevScrollHeight.current > 0;
      if (isLoadingOlder && !autoScroll) {
        // Messages were prepended - maintain scroll position
        const newScrollHeight = containerRef.current.scrollHeight;
        const scrollDiff = newScrollHeight - prevScrollHeight.current;
        containerRef.current.scrollTop = scrollDiff;
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, autoScroll]);

  // Infinite scroll - detect when user scrolls near top
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Track scroll position for maintaining position on load
    prevScrollHeight.current = scrollHeight;

    // Auto-scroll detection (near bottom)
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);

    // Load more when near top (within 200px)
    if (scrollTop < 200 && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  const formatDateDivider = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950/50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-zinc-950/50 scrollbar-hide"
    >
      <div className="py-2">
        {/* Loading more indicator at top */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-full border border-zinc-700/50">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-sm text-zinc-400">Loading older messages...</span>
            </div>
          </div>
        )}

        {/* Load more trigger at top */}
        {hasMore && !isLoadingMore && (
          <div ref={loadMoreTriggerRef} className="h-1" />
        )}

        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 px-5 py-2">
              <div className="flex-1 h-px bg-zinc-800/40" />
              <span className="text-[11px] text-zinc-500 font-medium px-2.5 py-0.5 bg-zinc-800/40 rounded-full">
                {formatDateDivider(date)}
              </span>
              <div className="flex-1 h-px bg-zinc-800/40" />
            </div>

            {dateMessages.map(message => {
              const sender = userMap[message.sender_id];
              const messageWithAvatar = {
                ...message,
                sender_avatar: sender?.avatar_url || message.sender_avatar,
                sender_name: sender?.full_name || message.sender_name
              };
              return (
                <MessageBubble
                  key={message.id}
                  message={messageWithAvatar}
                  isOwn={message.sender_id === currentUserId}
                  currentUserId={currentUserId}
                  currentUser={currentUser}
                  teamMembers={teamMembers}
                  onReply={onReply}
                  onReact={onReact}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPin={onPin}
                  onOpenThread={onOpenThread}
                  onLoadReplies={handleLoadReplies}
                  onSendReply={handleSendReply}
                  replies={threadReplies[message.id] || []}
                  repliesLoading={loadingReplies[message.id] || false}
                  readReceipts={getMessageReaders?.(message.id) || []}
                  readStatusText={getReadStatusText?.(message.id, message.sender_id)}
                  onBookmark={onBookmark}
                  onForward={onForward}
                  isBookmarked={isBookmarked?.(message.id)}
                  onVote={onVote}
                  onDecide={onDecide}
                  onSupport={onSupport}
                  onToggleComplete={onToggleComplete}
                  onAssign={onAssign}
                />
              );
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
            <div className="text-center">
              <MessageSquare className="w-6 h-6 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 font-medium">No messages yet</p>
              <p className="text-xs text-zinc-600 mt-1">Start the conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
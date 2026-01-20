/**
 * BookmarksPanel - Panel showing user's saved/bookmarked messages
 */

import React from 'react';
import { motion } from 'framer-motion';
import { X, Bookmark, Hash, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export default function BookmarksPanel({
  bookmarks = [],
  loading = false,
  onClose,
  onRemoveBookmark,
  onJumpToMessage,
}) {
  const formatDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "'Today at' h:mm a");
    if (isYesterday(d)) return format(d, "'Yesterday at' h:mm a");
    return format(d, "MMM d, yyyy 'at' h:mm a");
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-cyan-400" />
          Saved Messages
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No saved messages</p>
            <p className="text-zinc-600 text-xs mt-1">
              Click the bookmark icon on any message to save it here
            </p>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.bookmark_id}
              className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors group"
            >
              {/* Channel & Date */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Hash className="w-3 h-3" />
                  <span>{bookmark.channel_name || 'Unknown channel'}</span>
                </div>
                <span className="text-xs text-zinc-600">
                  {formatDate(bookmark.bookmarked_at)}
                </span>
              </div>

              {/* Sender */}
              <div className="flex items-center gap-2 mb-2">
                {bookmark.sender_avatar ? (
                  <img
                    src={bookmark.sender_avatar}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                    {bookmark.sender_name?.charAt(0) || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-white">
                  {bookmark.sender_name}
                </span>
              </div>

              {/* Content */}
              <p className="text-sm text-zinc-300 line-clamp-3 mb-3">
                {bookmark.content}
              </p>

              {/* Note (if any) */}
              {bookmark.note && (
                <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50 mb-3">
                  <p className="text-xs text-zinc-400">
                    <span className="text-zinc-500">Note:</span> {bookmark.note}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onJumpToMessage?.(bookmark)}
                  className="flex-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Go to message
                </button>
                <button
                  onClick={() => onRemoveBookmark?.(bookmark.message_id)}
                  className="p-1.5 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-zinc-400 transition-colors"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {bookmarks.length > 0 && (
        <div className="p-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 text-center">
            {bookmarks.length} saved message{bookmarks.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </motion.div>
  );
}

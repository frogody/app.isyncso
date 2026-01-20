import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Loader2, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/api/supabaseClient';

export default function SearchPanel({
  channelId,
  onClose,
  onJumpToMessage
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchScope, setSearchScope] = useState('channel'); // 'channel' or 'all'

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch();
      } else {
        setResults([]);
        setSearched(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchScope]);

  // Perform full-text search using PostgreSQL function
  const performSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      // Use the PostgreSQL full-text search function
      const { data, error } = await supabase.rpc('search_messages', {
        p_query: searchTerm.trim(),
        p_channel_id: searchScope === 'channel' ? channelId : null,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) {
        console.error('[SearchPanel] Search error:', error);
        // Fallback to simple ILIKE search if FTS fails
        const fallbackQuery = supabase
          .from('messages')
          .select('*')
          .ilike('content', `%${searchTerm}%`)
          .order('created_date', { ascending: false })
          .limit(50);

        if (searchScope === 'channel' && channelId) {
          fallbackQuery.eq('channel_id', channelId);
        }

        const { data: fallbackData } = await fallbackQuery;
        setResults(fallbackData || []);
      } else {
        setResults(data || []);
      }
    } catch (error) {
      console.error('[SearchPanel] Search failed:', error);
      setResults([]);
    }
    setLoading(false);
  }, [searchTerm, channelId, searchScope]);

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full"
    >
      <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400" />
          Search Messages
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none text-sm"
            autoFocus
          />
        </div>

        {/* Search scope toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchScope('channel')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              searchScope === 'channel'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-300'
            }`}
          >
            This channel
          </button>
          <button
            onClick={() => setSearchScope('all')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              searchScope === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-300'
            }`}
          >
            <Globe className="w-3 h-3" />
            All channels
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              {searched ? 'No messages found' : 'Search for messages'}
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              {searched ? 'Try different keywords' : 'Type at least 2 characters'}
            </p>
          </div>
        ) : (
          results.map(message => (
            <div
              key={message.id}
              onClick={() => onJumpToMessage?.(message)}
              className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-1">
                {message.sender_avatar ? (
                  <img src={message.sender_avatar} alt="" className="w-4 h-4 rounded-full" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-[8px] font-bold text-white">
                    {message.sender_name?.charAt(0) || '?'}
                  </div>
                )}
                <span className="text-xs font-medium text-white">{message.sender_name}</span>
                <span className="text-xs text-zinc-500">
                  {format(new Date(message.created_date), 'MMM d, h:mm a')}
                </span>
                {/* Show relevance rank if available */}
                {message.rank !== undefined && message.rank > 0.1 && (
                  <span className="ml-auto text-[10px] text-cyan-400/60">
                    {Math.round(message.rank * 100)}% match
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-300 line-clamp-2">
                {highlightMatch(message.content, searchTerm)}
              </p>
            </div>
          ))
        )}
      </div>

      {results.length > 0 && (
        <div className="p-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 text-center">
            {results.length} result{results.length !== 1 ? 's' : ''} found
            {searchScope === 'all' && ' across all channels'}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function highlightMatch(text, term) {
  if (!term || !text) return text;
  try {
    // Escape special regex characters in the search term
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedTerm})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase()
        ? <span key={i} className="bg-cyan-500/30 text-cyan-300 px-0.5 rounded">{part}</span>
        : part
    );
  } catch {
    return text;
  }
}

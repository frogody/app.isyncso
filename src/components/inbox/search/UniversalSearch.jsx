import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Loader2,
  MessageSquare,
  Calendar,
  Video,
  Hash,
  Clock,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Trash2,
} from 'lucide-react';
import useUniversalSearch from './useUniversalSearch';
import SearchResultItem from './SearchResultItem';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'calls', label: 'Calls', icon: Video },
  { id: 'channels', label: 'Channels', icon: Hash },
];

const CATEGORY_CONFIG = {
  messages: { label: 'Messages', icon: MessageSquare },
  events: { label: 'Events', icon: Calendar },
  calls: { label: 'Calls', icon: Video },
  channels: { label: 'Channels', icon: Hash },
};

export default function UniversalSearch({ open, onClose, onResultSelect }) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const {
    results,
    loading,
    search,
    clearResults,
    recentSearches,
    clearRecentSearches,
  } = useUniversalSearch();

  // Build flat list for keyboard navigation
  const flatResults = useMemo(() => {
    const items = [];
    const categories = ['messages', 'events', 'calls', 'channels'];
    for (const cat of categories) {
      if (activeFilter !== 'all' && activeFilter !== cat) continue;
      const catResults = results[cat] || [];
      for (const item of catResults) {
        items.push({ type: cat, data: item });
      }
    }
    return items;
  }, [results, activeFilter]);

  // Trigger search when query or filter changes
  useEffect(() => {
    if (!open) return;
    const types =
      activeFilter === 'all'
        ? ['messages', 'events', 'calls', 'channels']
        : [activeFilter];
    search(query, { types });
  }, [query, activeFilter, open, search]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveFilter('all');
      setSelectedIndex(0);
      clearResults();
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, clearResults]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= flatResults.length) {
      setSelectedIndex(Math.max(0, flatResults.length - 1));
    }
  }, [flatResults.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const selectedEl = resultsRef.current.querySelector(
      `[data-result-index="${selectedIndex}"]`
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            const { type, data } = flatResults[selectedIndex];
            handleResultClick(type, data);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
        default:
          break;
      }
    },
    [flatResults, selectedIndex, onClose]
  );

  const handleResultClick = useCallback(
    (type, data) => {
      onResultSelect?.(type, data);
      onClose?.();
    },
    [onResultSelect, onClose]
  );

  const handleRecentSearchClick = useCallback(
    (term) => {
      setQuery(term);
    },
    []
  );

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [onClose]
  );

  // Count results per category for filter badges
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const cat of ['messages', 'events', 'calls', 'channels']) {
      counts[cat] = (results[cat] || []).length;
    }
    counts.all = results.total || 0;
    return counts;
  }, [results]);

  // Track which category a flat index belongs to (for section headers)
  const categoryBreaks = useMemo(() => {
    const breaks = {};
    let idx = 0;
    for (const cat of ['messages', 'events', 'calls', 'channels']) {
      if (activeFilter !== 'all' && activeFilter !== cat) continue;
      const catResults = results[cat] || [];
      if (catResults.length > 0) {
        breaks[idx] = cat;
      }
      idx += catResults.length;
    }
    return breaks;
  }, [results, activeFilter]);

  const showRecentSearches =
    query.trim().length < 2 && recentSearches.length > 0;
  const showNoResults =
    query.trim().length >= 2 && !loading && flatResults.length === 0;
  const showResults = flatResults.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-zinc-950/80 backdrop-blur-sm"
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-4 bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/60">
              {loading ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
              ) : (
                <Search className="w-5 h-5 text-zinc-500 flex-shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search messages, events, calls..."
                className="flex-1 bg-transparent text-lg text-white placeholder-zinc-500 focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    clearResults();
                    inputRef.current?.focus();
                  }}
                  className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              )}
              <div className="flex-shrink-0 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-500 font-mono">
                ESC
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-zinc-800/40 overflow-x-auto">
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.id;
                const count = categoryCounts[tab.id] || 0;
                const TabIcon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveFilter(tab.id);
                      setSelectedIndex(0);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40 hover:text-zinc-300 hover:border-zinc-600/60'
                    }`}
                  >
                    {TabIcon && <TabIcon className="w-3 h-3" />}
                    {tab.label}
                    {query.trim().length >= 2 && count > 0 && (
                      <span
                        className={`text-[10px] ${
                          isActive ? 'text-cyan-400' : 'text-zinc-600'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Results area */}
            <div
              ref={resultsRef}
              className="max-h-[50vh] overflow-y-auto bg-zinc-900/80"
            >
              {/* Recent searches */}
              {showRecentSearches && (
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase text-zinc-500 tracking-wider font-medium">
                      Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => handleRecentSearchClick(term)}
                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors group"
                      >
                        <Clock className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                        <span className="text-sm text-zinc-400 group-hover:text-zinc-200">
                          {term}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {showNoResults && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">
                    No results for "{query}"
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Try different keywords or filters
                  </p>
                </div>
              )}

              {/* Search results */}
              {showResults && (
                <div className="py-2">
                  <AnimatePresence mode="popLayout">
                    {(() => {
                      let globalIdx = 0;
                      const elements = [];

                      for (const cat of [
                        'messages',
                        'events',
                        'calls',
                        'channels',
                      ]) {
                        if (activeFilter !== 'all' && activeFilter !== cat)
                          continue;
                        const catResults = results[cat] || [];
                        if (catResults.length === 0) continue;

                        const config = CATEGORY_CONFIG[cat];
                        const CatIcon = config.icon;

                        // Category header
                        elements.push(
                          <motion.div
                            key={`header-${cat}`}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2 px-5 pt-3 pb-1"
                          >
                            <CatIcon className="w-3 h-3 text-zinc-600" />
                            <span className="text-xs uppercase text-zinc-500 tracking-wider font-medium">
                              {config.label}
                            </span>
                            <span className="text-[10px] text-zinc-600">
                              ({catResults.length})
                            </span>
                          </motion.div>
                        );

                        for (const item of catResults) {
                          const idx = globalIdx;
                          elements.push(
                            <motion.div
                              key={`${cat}-${item.id}`}
                              data-result-index={idx}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              transition={{
                                duration: 0.15,
                                delay: Math.min(idx * 0.02, 0.2),
                              }}
                              className="px-1"
                            >
                              <SearchResultItem
                                type={cat}
                                data={item}
                                query={query}
                                isSelected={selectedIndex === idx}
                                onClick={handleResultClick}
                              />
                            </motion.div>
                          );
                          globalIdx++;
                        }
                      }

                      return elements;
                    })()}
                  </AnimatePresence>
                </div>
              )}

              {/* Empty state when no query */}
              {query.trim().length < 2 && !showRecentSearches && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">
                    Search across all your communication
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Messages, calendar events, calls, and channels
                  </p>
                </div>
              )}
            </div>

            {/* Footer with keyboard hints */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-t border-zinc-800/60 bg-zinc-900/60">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[10px]">
                  <ArrowUp className="w-2.5 h-2.5 inline" />
                </kbd>
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[10px]">
                  <ArrowDown className="w-2.5 h-2.5 inline" />
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[10px]">
                  <CornerDownLeft className="w-2.5 h-2.5 inline" />
                </kbd>
                <span>Open</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[10px]">
                  ESC
                </kbd>
                <span>Close</span>
              </div>
              {flatResults.length > 0 && (
                <span className="ml-auto text-[11px] text-zinc-600">
                  {flatResults.length} result
                  {flatResults.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

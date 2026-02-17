import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const RECENT_SEARCHES_KEY = 'isyncso_recent_searches';
const MAX_RECENT_SEARCHES = 10;
const DEBOUNCE_MS = 300;

function getRecentSearches() {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // localStorage might be full or unavailable
  }
}

function addRecentSearch(query) {
  if (!query || query.trim().length < 2) return;
  const trimmed = query.trim();
  const current = getRecentSearches();
  const filtered = current.filter((s) => s !== trimmed);
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  saveRecentSearches(updated);
}

export default function useUniversalSearch() {
  const [results, setResults] = useState({
    messages: [],
    events: [],
    calls: [],
    channels: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const executeSearch = useCallback(async (query, filters = {}) => {
    if (!query || query.trim().length < 2) {
      setResults({ messages: [], events: [], calls: [], channels: [], total: 0 });
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const searchTerm = query.trim();
    const activeTypes = filters.types || ['messages', 'events', 'calls', 'channels'];

    try {
      const promises = [];

      // Messages search
      if (activeTypes.includes('messages')) {
        let msgQuery = supabase
          .from('messages')
          .select('id, content, sender_name, sender_avatar, channel_id, created_date')
          .ilike('content', `%${searchTerm}%`)
          .order('created_date', { ascending: false })
          .limit(20);

        if (filters.channelId) {
          msgQuery = msgQuery.eq('channel_id', filters.channelId);
        }
        if (filters.dateRange?.from) {
          msgQuery = msgQuery.gte('created_date', filters.dateRange.from);
        }
        if (filters.dateRange?.to) {
          msgQuery = msgQuery.lte('created_date', filters.dateRange.to);
        }

        promises.push(
          msgQuery.then(({ data, error }) => ({
            type: 'messages',
            data: error ? [] : (data || []),
          }))
        );
      } else {
        promises.push(Promise.resolve({ type: 'messages', data: [] }));
      }

      // Calendar events search
      if (activeTypes.includes('events')) {
        let evtQuery = supabase
          .from('calendar_events')
          .select('id, title, description, start_time, end_time, attendees, color')
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .order('start_time', { ascending: false })
          .limit(15);

        if (filters.dateRange?.from) {
          evtQuery = evtQuery.gte('start_time', filters.dateRange.from);
        }
        if (filters.dateRange?.to) {
          evtQuery = evtQuery.lte('start_time', filters.dateRange.to);
        }

        promises.push(
          evtQuery.then(({ data, error }) => ({
            type: 'events',
            data: error ? [] : (data || []),
          }))
        );
      } else {
        promises.push(Promise.resolve({ type: 'events', data: [] }));
      }

      // Video calls search
      if (activeTypes.includes('calls')) {
        let callQuery = supabase
          .from('video_calls')
          .select('id, title, started_at, ended_at, participants, status, duration')
          .ilike('title', `%${searchTerm}%`)
          .order('started_at', { ascending: false })
          .limit(10);

        promises.push(
          callQuery.then(({ data, error }) => ({
            type: 'calls',
            data: error ? [] : (data || []),
          }))
        );
      } else {
        promises.push(Promise.resolve({ type: 'calls', data: [] }));
      }

      // Channels search
      if (activeTypes.includes('channels')) {
        let chQuery = supabase
          .from('channels')
          .select('id, name, description, type, member_count, created_date')
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .order('name', { ascending: true })
          .limit(10);

        promises.push(
          chQuery.then(({ data, error }) => ({
            type: 'channels',
            data: error ? [] : (data || []),
          }))
        );
      } else {
        promises.push(Promise.resolve({ type: 'channels', data: [] }));
      }

      const settled = await Promise.all(promises);

      // Check if aborted
      if (controller.signal.aborted) return;

      const grouped = {
        messages: [],
        events: [],
        calls: [],
        channels: [],
        total: 0,
      };

      for (const result of settled) {
        grouped[result.type] = result.data;
        grouped.total += result.data.length;
      }

      setResults(grouped);

      // Save to recent searches
      addRecentSearch(searchTerm);
      setRecentSearches(getRecentSearches());
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[useUniversalSearch] Search failed:', err);
        setResults({ messages: [], events: [], calls: [], channels: [], total: 0 });
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const search = useCallback((query, filters) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setResults({ messages: [], events: [], calls: [], channels: [], total: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      executeSearch(query, filters);
    }, DEBOUNCE_MS);
  }, [executeSearch]);

  const clearResults = useCallback(() => {
    setResults({ messages: [], events: [], calls: [], channels: [], total: 0 });
    setLoading(false);
  }, []);

  const clearRecentSearches = useCallback(() => {
    saveRecentSearches([]);
    setRecentSearches([]);
  }, []);

  return {
    results,
    loading,
    search,
    clearResults,
    recentSearches,
    clearRecentSearches,
  };
}

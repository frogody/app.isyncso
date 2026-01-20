/**
 * useBookmarks - Hook for managing message bookmarks
 *
 * Provides functions to save, remove, and list bookmarked messages.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useBookmarks(userId) {
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch user's bookmarks
  const fetchBookmarks = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_bookmarks', {
        p_limit: 100,
        p_offset: 0,
      });

      if (error) throw error;

      setBookmarks(data || []);
      setBookmarkedIds(new Set(data?.map(b => b.message_id) || []));
    } catch (error) {
      console.error('[Bookmarks] Failed to fetch:', error);
    }
    setLoading(false);
  }, [userId]);

  // Load bookmarks on mount
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Toggle bookmark
  const toggleBookmark = useCallback(async (messageId, note = null) => {
    if (!userId || !messageId) return;

    try {
      const { data: isNowBookmarked, error } = await supabase.rpc('toggle_bookmark', {
        p_message_id: messageId,
        p_note: note,
        p_tags: [],
      });

      if (error) throw error;

      // Update local state
      if (isNowBookmarked) {
        setBookmarkedIds(prev => new Set([...prev, messageId]));
        toast.success('Message saved');
      } else {
        setBookmarkedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        toast.success('Bookmark removed');
      }

      // Refresh bookmarks list
      fetchBookmarks();

      return isNowBookmarked;
    } catch (error) {
      console.error('[Bookmarks] Toggle failed:', error);
      toast.error('Failed to update bookmark');
      return null;
    }
  }, [userId, fetchBookmarks]);

  // Check if message is bookmarked
  const isBookmarked = useCallback((messageId) => {
    return bookmarkedIds.has(messageId);
  }, [bookmarkedIds]);

  // Remove bookmark
  const removeBookmark = useCallback(async (messageId) => {
    if (!userId || !messageId) return;

    try {
      const { error } = await supabase
        .from('message_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('message_id', messageId);

      if (error) throw error;

      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      setBookmarks(prev => prev.filter(b => b.message_id !== messageId));
      toast.success('Bookmark removed');
    } catch (error) {
      console.error('[Bookmarks] Remove failed:', error);
      toast.error('Failed to remove bookmark');
    }
  }, [userId]);

  return {
    bookmarks,
    bookmarkedIds,
    loading,
    toggleBookmark,
    isBookmarked,
    removeBookmark,
    refreshBookmarks: fetchBookmarks,
  };
}

export default useBookmarks;

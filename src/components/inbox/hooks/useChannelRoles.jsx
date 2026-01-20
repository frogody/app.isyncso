/**
 * useChannelRoles - Hook for managing channel member roles
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useChannelRoles(channelId, userId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Load members with roles
  const loadMembers = useCallback(async () => {
    if (!channelId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_channel_members_with_roles', {
        p_channel_id: channelId
      });

      if (error) throw error;
      setMembers(data || []);

      // Find current user's role
      const currentUserMember = data?.find(m => m.user_id === userId);
      setUserRole(currentUserMember?.role || null);
    } catch (error) {
      console.error('[ChannelRoles] Failed to load members:', error);
      // Fallback to legacy members array if RPC fails
      setMembers([]);
      setUserRole(null);
    }
    setLoading(false);
  }, [channelId, userId]);

  // Load on mount and channel change
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!channelId) return;

    const subscription = supabase
      .channel(`channel_members:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_members',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channelId, loadMembers]);

  // Check if user is admin
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const isModerator = isAdmin || userRole === 'moderator';
  const isOwner = userRole === 'owner';

  // Set member role
  const setMemberRole = useCallback(async (targetUserId, newRole) => {
    if (!isAdmin) {
      toast.error('You do not have permission to change roles');
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('set_channel_member_role', {
        p_channel_id: channelId,
        p_user_id: targetUserId,
        p_role: newRole
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to update role');
        return false;
      }

      toast.success(`Role updated to ${newRole}`);
      await loadMembers();
      return true;
    } catch (error) {
      console.error('[ChannelRoles] Failed to set role:', error);
      toast.error('Failed to update role');
      return false;
    }
  }, [channelId, isAdmin, loadMembers]);

  // Kick member
  const kickMember = useCallback(async (targetUserId) => {
    if (!isModerator) {
      toast.error('You do not have permission to kick members');
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('kick_channel_member', {
        p_channel_id: channelId,
        p_user_id: targetUserId
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to remove member');
        return false;
      }

      toast.success('Member removed');
      await loadMembers();
      return true;
    } catch (error) {
      console.error('[ChannelRoles] Failed to kick member:', error);
      toast.error('Failed to remove member');
      return false;
    }
  }, [channelId, isModerator, loadMembers]);

  // Add member
  const addMember = useCallback(async (targetUserId, role = 'member') => {
    try {
      const { data, error } = await supabase.rpc('add_channel_member', {
        p_channel_id: channelId,
        p_user_id: targetUserId,
        p_role: role
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || 'Failed to add member');
        return false;
      }

      toast.success('Member added');
      await loadMembers();
      return true;
    } catch (error) {
      console.error('[ChannelRoles] Failed to add member:', error);
      toast.error('Failed to add member');
      return false;
    }
  }, [channelId, loadMembers]);

  // Get role badge color
  const getRoleBadgeColor = useCallback((role) => {
    switch (role) {
      case 'owner': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'admin': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'moderator': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  }, []);

  // Get available roles for dropdown
  const getAvailableRoles = useCallback((targetRole) => {
    // Owners can assign any role except owner (transfer ownership separately)
    if (isOwner) {
      return ['admin', 'moderator', 'member'].filter(r => r !== targetRole);
    }
    // Admins can only assign moderator and member
    if (isAdmin) {
      return ['moderator', 'member'].filter(r => r !== targetRole && targetRole !== 'admin');
    }
    return [];
  }, [isOwner, isAdmin]);

  return {
    members,
    loading,
    userRole,
    isAdmin,
    isModerator,
    isOwner,
    setMemberRole,
    kickMember,
    addMember,
    getRoleBadgeColor,
    getAvailableRoles,
    refreshMembers: loadMembers,
  };
}

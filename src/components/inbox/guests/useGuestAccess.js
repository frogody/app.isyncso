/**
 * useGuestAccess - Hook for managing guest access in channels
 * Handles inviting, revoking, and updating guest permissions.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

function generateAccessToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

export function useGuestAccess(channelId = null) {
  const { user } = useUser();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch guests for a specific channel
  const getChannelGuests = useCallback(async (targetChannelId) => {
    const cId = targetChannelId || channelId;
    if (!cId) return [];

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('channel_guests')
        .select('*')
        .eq('channel_id', cId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[useGuestAccess] getChannelGuests error:', err);
      toast.error('Failed to load guests');
      return [];
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  // Load guests when channelId changes
  useEffect(() => {
    if (!channelId) return;

    let cancelled = false;

    const load = async () => {
      const data = await getChannelGuests(channelId);
      if (!cancelled) setGuests(data);
    };

    load();
    return () => { cancelled = true; };
  }, [channelId, getChannelGuests]);

  // Invite a guest to a channel
  const inviteGuest = useCallback(async ({ channelId: cId, email, name, permissions, expiresInDays }) => {
    if (!user?.company_id) {
      toast.error('Company context required');
      return null;
    }

    const targetChannelId = cId || channelId;
    if (!targetChannelId) {
      toast.error('No channel selected');
      return null;
    }

    try {
      setLoading(true);
      const accessToken = generateAccessToken();

      let expiresAt = null;
      if (expiresInDays) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(expiresInDays));
        expiresAt = d.toISOString();
      }

      const guestData = {
        channel_id: targetChannelId,
        company_id: user.company_id,
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        access_token: accessToken,
        permissions: permissions || { can_message: true, can_upload: false, can_call: false },
        invited_by: user.id,
        expires_at: expiresAt,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('channel_guests')
        .insert(guestData)
        .select()
        .single();

      if (error) throw error;

      // Update channel guest flag and count
      const { data: currentGuests } = await supabase
        .from('channel_guests')
        .select('id')
        .eq('channel_id', targetChannelId)
        .in('status', ['pending', 'accepted']);

      const guestCount = currentGuests?.length || 1;

      await supabase
        .from('channels')
        .update({ is_guest_channel: true, guest_count: guestCount })
        .eq('id', targetChannelId);

      // Refresh the guests list
      setGuests(prev => [data, ...prev]);

      toast.success(`Guest invite sent to ${email}`);
      return data;
    } catch (err) {
      console.error('[useGuestAccess] inviteGuest error:', err);
      if (err.code === '23505') {
        toast.error('This email already has a guest invite for this channel');
      } else {
        toast.error('Failed to invite guest');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [channelId, user]);

  // Revoke guest access
  const revokeGuest = useCallback(async (guestId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('channel_guests')
        .update({ status: 'revoked' })
        .eq('id', guestId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, status: 'revoked' } : g));

      // Update channel guest count
      if (data?.channel_id) {
        const { data: activeGuests } = await supabase
          .from('channel_guests')
          .select('id')
          .eq('channel_id', data.channel_id)
          .in('status', ['pending', 'accepted']);

        const guestCount = activeGuests?.length || 0;

        await supabase
          .from('channels')
          .update({
            guest_count: guestCount,
            is_guest_channel: guestCount > 0,
          })
          .eq('id', data.channel_id);
      }

      toast.success('Guest access revoked');
      return data;
    } catch (err) {
      console.error('[useGuestAccess] revokeGuest error:', err);
      toast.error('Failed to revoke access');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update guest permissions
  const updateGuestPermissions = useCallback(async (guestId, permissions) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('channel_guests')
        .update({ permissions })
        .eq('id', guestId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, permissions } : g));

      toast.success('Guest permissions updated');
      return data;
    } catch (err) {
      console.error('[useGuestAccess] updateGuestPermissions error:', err);
      toast.error('Failed to update permissions');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get channels that have guests
  const getGuestChannels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('is_guest_channel', true)
        .gt('guest_count', 0);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[useGuestAccess] getGuestChannels error:', err);
      return [];
    }
  }, []);

  // Refetch guests
  const refetch = useCallback(async () => {
    if (!channelId) return;
    const data = await getChannelGuests(channelId);
    setGuests(data);
  }, [channelId, getChannelGuests]);

  return {
    guests,
    loading,
    inviteGuest,
    revokeGuest,
    updateGuestPermissions,
    getChannelGuests,
    getGuestChannels,
    refetch,
  };
}

export default useGuestAccess;

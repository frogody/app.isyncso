/**
 * useVideoCall - Main hook for video call management
 *
 * Manages video_calls and call_participants rows in Supabase,
 * tracks real-time participant changes, and exposes toggle helpers
 * for mute/camera/screen-share state.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { createVideoProvider } from './VideoProvider';

// ---------------------------------------------------------------------------
// Join code generator  (format: SYN-XXX-XXX)
// ---------------------------------------------------------------------------
function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  const segment = () =>
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SYN-${segment()}-${segment()}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useVideoCall(userId, companyId) {
  // Call state
  const [currentCall, setCurrentCall] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Provider ref (mock for now)
  const providerRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Lazily initialize provider
  const getProvider = useCallback(() => {
    if (!providerRef.current) {
      providerRef.current = createVideoProvider('mock');
    }
    return providerRef.current;
  }, []);

  // ------------------------------------------------------------------
  // Real-time subscription for call_participants changes
  // ------------------------------------------------------------------
  const subscribeToParticipants = useCallback((callId) => {
    // Clean up previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel(`call_participants:${callId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_participants',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT') {
            setParticipants(prev => {
              if (prev.some(p => p.id === newRow.id)) return prev;
              return [...prev, newRow];
            });
          } else if (eventType === 'UPDATE') {
            setParticipants(prev =>
              prev.map(p => (p.id === newRow.id ? newRow : p))
            );
          } else if (eventType === 'DELETE') {
            setParticipants(prev =>
              prev.filter(p => p.id !== oldRow.id)
            );
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, []);

  // ------------------------------------------------------------------
  // Load initial participants for a call
  // ------------------------------------------------------------------
  const loadParticipants = useCallback(async (callId) => {
    const { data, error } = await supabase
      .from('call_participants')
      .select('*')
      .eq('call_id', callId)
      .is('left_at', null)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[useVideoCall] Failed to load participants:', error);
      return;
    }
    setParticipants(data || []);
  }, []);

  // ------------------------------------------------------------------
  // createCall — insert a video_calls row, return join_code
  // ------------------------------------------------------------------
  const createCall = useCallback(async ({ title, channelId }) => {
    if (!userId || !companyId) throw new Error('Not authenticated');

    setLoading(true);
    try {
      const joinCode = generateJoinCode();

      const { data: call, error } = await supabase
        .from('video_calls')
        .insert({
          company_id: companyId,
          channel_id: channelId || null,
          initiated_by: userId,
          title: title || 'Video Call',
          join_code: joinCode,
          provider: 'livekit',
          status: 'waiting',
          settings: {},
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join the creator
      const { data: participant, error: pError } = await supabase
        .from('call_participants')
        .insert({
          call_id: call.id,
          user_id: userId,
          display_name: 'You',
          role: 'host',
          joined_at: new Date().toISOString(),
          is_muted: false,
          is_camera_off: false,
          is_screen_sharing: false,
        })
        .select()
        .single();

      if (pError) console.error('[useVideoCall] Failed to add creator as participant:', pError);

      // Update call status to active
      await supabase
        .from('video_calls')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', call.id);

      // Connect provider
      const provider = getProvider();
      await provider.connect(call.id, null);

      setCurrentCall({ ...call, status: 'active' });
      setIsInCall(true);
      setIsMuted(false);
      setIsCameraOff(false);
      setIsScreenSharing(false);

      // Start real-time subscription & load participants
      await loadParticipants(call.id);
      subscribeToParticipants(call.id);

      toast.success('Video call started');
      return call;
    } catch (error) {
      console.error('[useVideoCall] Failed to create call:', error);
      toast.error('Failed to start video call');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userId, companyId, getProvider, loadParticipants, subscribeToParticipants]);

  // ------------------------------------------------------------------
  // joinCall — look up by join_code, add user to call_participants
  // ------------------------------------------------------------------
  const joinCall = useCallback(async (joinCode) => {
    if (!userId) throw new Error('Not authenticated');

    setLoading(true);
    try {
      // Find the call
      const { data: call, error: callError } = await supabase
        .from('video_calls')
        .select('*')
        .eq('join_code', joinCode.toUpperCase().trim())
        .in('status', ['waiting', 'active'])
        .single();

      if (callError || !call) {
        toast.error('Call not found or has ended');
        throw new Error('Call not found');
      }

      // Check if already a participant
      const { data: existing } = await supabase
        .from('call_participants')
        .select('id')
        .eq('call_id', call.id)
        .eq('user_id', userId)
        .is('left_at', null)
        .maybeSingle();

      if (!existing) {
        // Add as participant
        await supabase
          .from('call_participants')
          .insert({
            call_id: call.id,
            user_id: userId,
            display_name: 'Participant',
            role: 'participant',
            joined_at: new Date().toISOString(),
            is_muted: false,
            is_camera_off: false,
            is_screen_sharing: false,
          });
      }

      // If call was waiting, set active
      if (call.status === 'waiting') {
        await supabase
          .from('video_calls')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', call.id);
      }

      // Connect provider
      const provider = getProvider();
      await provider.connect(call.id, null);

      setCurrentCall(call);
      setIsInCall(true);
      setIsMuted(false);
      setIsCameraOff(false);
      setIsScreenSharing(false);

      await loadParticipants(call.id);
      subscribeToParticipants(call.id);

      toast.success('Joined video call');
      return call;
    } catch (error) {
      console.error('[useVideoCall] Failed to join call:', error);
      if (!error.message?.includes('Call not found')) {
        toast.error('Failed to join video call');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userId, getProvider, loadParticipants, subscribeToParticipants]);

  // ------------------------------------------------------------------
  // leaveCall — set left_at on the user's participant row
  // ------------------------------------------------------------------
  const leaveCall = useCallback(async () => {
    if (!currentCall || !userId) return;

    try {
      // Mark participant as left
      await supabase
        .from('call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('call_id', currentCall.id)
        .eq('user_id', userId)
        .is('left_at', null);

      // Disconnect provider
      const provider = getProvider();
      await provider.disconnect();

      // Clean up subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      setCurrentCall(null);
      setParticipants([]);
      setIsInCall(false);
      setIsMuted(false);
      setIsCameraOff(false);
      setIsScreenSharing(false);

      toast.success('Left video call');
    } catch (error) {
      console.error('[useVideoCall] Failed to leave call:', error);
      toast.error('Failed to leave call');
    }
  }, [currentCall, userId, getProvider]);

  // ------------------------------------------------------------------
  // endCall — set status='ended' and ended_at on the video_calls row
  // ------------------------------------------------------------------
  const endCall = useCallback(async (callId) => {
    const targetId = callId || currentCall?.id;
    if (!targetId) return;

    try {
      await supabase
        .from('video_calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', targetId);

      // Mark all remaining participants as left
      await supabase
        .from('call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('call_id', targetId)
        .is('left_at', null);

      // Disconnect provider if this is our current call
      if (currentCall?.id === targetId) {
        const provider = getProvider();
        await provider.disconnect();

        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }

        setCurrentCall(null);
        setParticipants([]);
        setIsInCall(false);
      }

      toast.success('Video call ended');
    } catch (error) {
      console.error('[useVideoCall] Failed to end call:', error);
      toast.error('Failed to end call');
    }
  }, [currentCall, getProvider]);

  // ------------------------------------------------------------------
  // Toggle helpers — update both local state and call_participants row
  // ------------------------------------------------------------------
  const _updateMyParticipant = useCallback(async (updates) => {
    if (!currentCall || !userId) return;
    await supabase
      .from('call_participants')
      .update(updates)
      .eq('call_id', currentCall.id)
      .eq('user_id', userId)
      .is('left_at', null);
  }, [currentCall, userId]);

  const toggleMute = useCallback(async () => {
    const newState = !isMuted;
    setIsMuted(newState);
    const provider = getProvider();
    provider.toggleAudio(!newState);
    await _updateMyParticipant({ is_muted: newState });
  }, [isMuted, getProvider, _updateMyParticipant]);

  const toggleCamera = useCallback(async () => {
    const newState = !isCameraOff;
    setIsCameraOff(newState);
    const provider = getProvider();
    provider.toggleVideo(!newState);
    await _updateMyParticipant({ is_camera_off: newState });
  }, [isCameraOff, getProvider, _updateMyParticipant]);

  const toggleScreenShare = useCallback(async () => {
    const newState = !isScreenSharing;
    setIsScreenSharing(newState);
    const provider = getProvider();
    await provider.toggleScreen(newState);
    await _updateMyParticipant({ is_screen_sharing: newState });
  }, [isScreenSharing, getProvider, _updateMyParticipant]);

  // ------------------------------------------------------------------
  // getActiveCallsForChannel — query active calls in a channel
  // ------------------------------------------------------------------
  const getActiveCallsForChannel = useCallback(async (channelId) => {
    if (!channelId) return [];

    const { data, error } = await supabase
      .from('video_calls')
      .select(`
        *,
        call_participants (*)
      `)
      .eq('channel_id', channelId)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[useVideoCall] Failed to get active calls:', error);
      return [];
    }

    // Filter to only include participants who haven't left
    return (data || []).map(call => ({
      ...call,
      call_participants: (call.call_participants || []).filter(p => !p.left_at),
    }));
  }, []);

  // ------------------------------------------------------------------
  // Active participant count (only those still in the call)
  // ------------------------------------------------------------------
  const activeParticipants = useMemo(
    () => participants.filter(p => !p.left_at),
    [participants]
  );

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (providerRef.current?.isConnected) {
        providerRef.current.disconnect().catch(() => {});
      }
    };
  }, []);

  return {
    // State
    currentCall,
    participants: activeParticipants,
    isInCall,
    isMuted,
    isCameraOff,
    isScreenSharing,
    loading,

    // Actions
    createCall,
    joinCall,
    leaveCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    getActiveCallsForChannel,
  };
}

export default useVideoCall;

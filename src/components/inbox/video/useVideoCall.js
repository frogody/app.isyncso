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
import { useWebRTCPeers } from './useWebRTCPeers';

// Force re-render helper for stream updates
function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick(t => t + 1), []);
}

// Synthetic self-participant (fallback when DB query returns empty)
function createSelfParticipant(userId, call, displayName) {
  return {
    id: `self-${userId}`,
    call_id: call?.id,
    user_id: userId,
    display_name: displayName || 'You',
    role: call?.initiated_by === userId ? 'host' : 'participant',
    joined_at: new Date().toISOString(),
    left_at: null,
    is_muted: false,
    is_camera_off: false,
    is_screen_sharing: false,
    connection_quality: 'good',
  };
}

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
export function useVideoCall(userId, companyId, userName) {
  // Call state
  const [currentCall, setCurrentCall] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Provider ref (real browser media)
  const providerRef = useRef(null);
  const subscriptionRef = useRef(null);
  const updateParticipantRef = useRef(null);
  const replaceVideoTrackRef = useRef(null);
  const forceUpdate = useForceUpdate();

  // Track local speaker state
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  // Expose real MediaStreams from the provider (declared early so useWebRTCPeers can use localStream)
  const localStream = providerRef.current?.localStream || null;
  const screenStream = providerRef.current?.screenStream || null;

  // ---- WebRTC Peers (P2P media transport) ----
  const {
    remoteStreams,
    addPeer,
    removePeer,
    removeAllPeers,
    replaceVideoTrack,
  } = useWebRTCPeers({
    callId: currentCall?.id,
    userId,
    localStream,
    enabled: isInCall,
  });

  // Keep replaceVideoTrack ref in sync for event handler
  replaceVideoTrackRef.current = replaceVideoTrack;

  // Lazily initialize provider
  const getProvider = useCallback(() => {
    if (!providerRef.current) {
      providerRef.current = createVideoProvider();

      // Listen for browser "Stop sharing" event
      providerRef.current.on('screenShareEnded', () => {
        setIsScreenSharing(false);
        if (updateParticipantRef.current) {
          updateParticipantRef.current({ is_screen_sharing: false }).catch(() => {});
        }
        forceUpdate();
      });

      // Force re-render when tracks change so consumers get fresh streams
      providerRef.current.on('trackToggled', () => forceUpdate());
      providerRef.current.on('connected', (info) => {
        // Show warnings for missing permissions
        if (!info.hasAudio) {
          toast.warning('Microphone access denied — others won\'t hear you');
        }
        if (!info.hasVideo) {
          toast.warning('Camera access denied — showing avatar instead');
        }
        forceUpdate();
      });
      providerRef.current.on('disconnected', () => forceUpdate());

      // Permission error handler
      providerRef.current.on('permissionError', ({ kind, error }) => {
        if (error?.name === 'NotAllowedError') {
          toast.error(`${kind === 'audio' ? 'Microphone' : 'Camera'} permission denied. Check browser settings.`);
        }
      });

      // Active speaker detection
      providerRef.current.on('speakingChanged', ({ isSpeaking }) => {
        setIsLocalSpeaking(isSpeaking);
      });

      // Track change (screen share start/stop) — replace video track on all peers
      providerRef.current.on('trackChanged', ({ track }) => {
        if (track) {
          replaceVideoTrackRef.current?.(track);
        }
      });
    }
    return providerRef.current;
  }, [forceUpdate]);

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
            if (oldRow.user_id) removePeer(oldRow.user_id);
            setParticipants(prev =>
              prev.filter(p => p.id !== oldRow.id)
            );
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, [removePeer]);

  // ------------------------------------------------------------------
  // Add/remove WebRTC peers when participants change
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isInCall || !userId) return;

    // Add peer connections for each remote participant
    participants.forEach((p) => {
      if (p.user_id && p.user_id !== userId && !p.left_at) {
        addPeer(p.user_id);
      }
    });
  }, [participants, isInCall, userId, addPeer]);

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
          creator_id: userId,
          initiated_by: userId,
          title: title || 'Video Call',
          join_code: joinCode,
          room_id: joinCode,
          join_url: `${window.location.origin}/call/${joinCode}`,
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
          display_name: userName || 'You',
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
  // createMeetingLink — insert a video_calls row WITHOUT joining
  // ------------------------------------------------------------------
  const createMeetingLink = useCallback(async ({ title } = {}) => {
    if (!userId || !companyId) throw new Error('Not authenticated');

    setLoading(true);
    try {
      const joinCode = generateJoinCode();

      const { data: call, error } = await supabase
        .from('video_calls')
        .insert({
          company_id: companyId,
          channel_id: null,
          creator_id: userId,
          initiated_by: userId,
          title: title || 'Meeting',
          join_code: joinCode,
          room_id: joinCode,
          join_url: `${window.location.origin}/call/${joinCode}`,
          provider: 'livekit',
          status: 'waiting',
          settings: {},
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Meeting link created');
      return call;
    } catch (error) {
      console.error('[useVideoCall] Failed to create meeting link:', error);
      toast.error('Failed to create meeting link');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userId, companyId]);

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
            display_name: userName || 'Participant',
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
      // Mark participant as left — best-effort
      await supabase
        .from('call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('call_id', currentCall.id)
        .eq('user_id', userId)
        .is('left_at', null);

      toast.success('Left video call');
    } catch (error) {
      console.error('[useVideoCall] Failed to leave call:', error);
      toast.error('Failed to leave call');
    } finally {
      // ALWAYS clean up local state and media, even if DB call fails
      removeAllPeers();
      try {
        const provider = getProvider();
        await provider.disconnect();
      } catch (e) {
        console.warn('[useVideoCall] Provider disconnect error:', e);
      }

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
    }
  }, [currentCall, userId, getProvider, removeAllPeers]);

  // ------------------------------------------------------------------
  // endCall — set status='ended' and ended_at on the video_calls row
  // ------------------------------------------------------------------
  const endCall = useCallback(async (callId) => {
    const targetId = callId || currentCall?.id;
    if (!targetId) return;

    const isCurrentCall = currentCall?.id === targetId;

    try {
      // DB updates — best-effort, don't block UI cleanup
      await Promise.allSettled([
        supabase
          .from('video_calls')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', targetId),
        supabase
          .from('call_participants')
          .update({ left_at: new Date().toISOString() })
          .eq('call_id', targetId)
          .is('left_at', null),
      ]);

      toast.success('Video call ended');
    } catch (error) {
      console.error('[useVideoCall] Failed to end call:', error);
      toast.error('Failed to end call');
    } finally {
      // ALWAYS clean up local state and media, even if DB calls fail
      if (isCurrentCall) {
        removeAllPeers();
        try {
          const provider = getProvider();
          await provider.disconnect();
        } catch (e) {
          console.warn('[useVideoCall] Provider disconnect error:', e);
        }

        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }

        setCurrentCall(null);
        setParticipants([]);
        setIsInCall(false);
      }
    }
  }, [currentCall, getProvider, removeAllPeers]);

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

  // Keep ref in sync so event listeners always have the latest
  updateParticipantRef.current = _updateMyParticipant;

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
    const provider = getProvider();
    if (!isScreenSharing) {
      // Start screen share — user might cancel the picker
      const started = await provider.toggleScreen(true);
      if (started) {
        setIsScreenSharing(true);
        await _updateMyParticipant({ is_screen_sharing: true });
      }
      // If user cancelled, started === false, do nothing
    } else {
      // Stop screen share
      await provider.toggleScreen(false);
      setIsScreenSharing(false);
      await _updateMyParticipant({ is_screen_sharing: false });
    }
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
  // getMyMeetingLinks — fetch recent meeting links created by this user
  // ------------------------------------------------------------------
  const getMyMeetingLinks = useCallback(async () => {
    if (!userId || !companyId) return [];

    const { data, error } = await supabase
      .from('video_calls')
      .select('id, title, join_code, join_url, status, created_at, started_at, ended_at')
      .eq('creator_id', userId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[useVideoCall] Failed to fetch meeting links:', error);
      return [];
    }
    return data || [];
  }, [userId, companyId]);

  // ------------------------------------------------------------------
  // Active participant count (only those still in the call)
  // Guarantees the local user always appears even if DB query returned empty
  // ------------------------------------------------------------------
  const activeParticipants = useMemo(() => {
    const active = participants.filter(p => !p.left_at);
    // If we're in a call but the local user isn't in the list, add a synthetic one
    if (isInCall && userId && !active.some(p => p.user_id === userId)) {
      active.unshift(createSelfParticipant(userId, currentCall, 'You'));
    }
    return active;
  }, [participants, isInCall, userId, currentCall]);

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
    isLocalSpeaking,
    loading,

    // Media streams
    localStream,
    screenStream,
    remoteStreams,

    // Actions
    createCall,
    createMeetingLink,
    joinCall,
    leaveCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    getActiveCallsForChannel,
    getMyMeetingLinks,
  };
}

export default useVideoCall;

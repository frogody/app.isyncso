/**
 * useWebRTCPeers — Peer-to-peer WebRTC hook with Supabase Realtime Broadcast signaling.
 *
 * Manages one RTCPeerConnection per remote participant (mesh topology).
 * Uses Supabase Realtime Broadcast channel for SDP offer/answer and ICE candidate exchange.
 * Exposes a `remoteStreams` map that VideoGrid uses to render remote video/audio.
 *
 * Supports 2-6 participants (mesh). For larger meetings, swap this hook with a
 * LiveKit/SFU-based provider while keeping the same remoteStreams interface.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export function useWebRTCPeers({ callId, userId, localStream, enabled }) {
  const [remoteStreams, setRemoteStreams] = useState({});

  // Refs for mutable state (avoid stale closures in event handlers)
  const peerConnectionsRef = useRef(new Map()); // userId -> RTCPeerConnection
  const iceCandidateBufferRef = useRef(new Map()); // userId -> RTCIceCandidate[]
  const retryCountRef = useRef(new Map()); // userId -> number
  const channelRef = useRef(null);
  const localStreamRef = useRef(localStream);
  const userIdRef = useRef(userId);
  const enabledRef = useRef(enabled);

  // Keep refs in sync
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // ---- Helpers ----

  const broadcast = useCallback((payload) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload,
    });
  }, []);

  // ---- Peer Connection Factory ----

  const createPeerConnection = useCallback((remoteUserId) => {
    const existing = peerConnectionsRef.current.get(remoteUserId);
    if (existing && existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
      return existing;
    }

    // Close any previous connection
    if (existing) {
      existing.close();
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks to the connection
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams((prev) => {
          // Only update if the stream is actually new/different
          if (prev[remoteUserId] === remoteStream) return prev;
          return { ...prev, [remoteUserId]: remoteStream };
        });
      }
    };

    // Send ICE candidates to the remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        broadcast({
          type: 'ice-candidate',
          from: userIdRef.current,
          to: remoteUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;

      if (state === 'failed') {
        const retries = retryCountRef.current.get(remoteUserId) || 0;
        if (retries < MAX_RETRIES) {
          retryCountRef.current.set(remoteUserId, retries + 1);
          console.warn(`[WebRTC] Connection to ${remoteUserId} failed, retrying (${retries + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            if (!enabledRef.current) return;
            pc.close();
            peerConnectionsRef.current.delete(remoteUserId);
            // Re-create and re-negotiate
            const isInitiator = userIdRef.current < remoteUserId;
            if (isInitiator) {
              initiateOffer(remoteUserId);
            }
          }, RETRY_DELAY);
        } else {
          console.error(`[WebRTC] Connection to ${remoteUserId} failed after ${MAX_RETRIES} retries`);
        }
      }

      if (state === 'connected') {
        retryCountRef.current.set(remoteUserId, 0);
      }

      if (state === 'closed') {
        setRemoteStreams((prev) => {
          if (!(remoteUserId in prev)) return prev;
          const next = { ...prev };
          delete next[remoteUserId];
          return next;
        });
      }
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  }, [broadcast]);

  // ---- Negotiation ----

  const initiateOffer = useCallback(async (remoteUserId) => {
    const pc = createPeerConnection(remoteUserId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      broadcast({
        type: 'offer',
        from: userIdRef.current,
        to: remoteUserId,
        sdp: offer.sdp,
      });
    } catch (err) {
      console.error(`[WebRTC] Failed to create offer for ${remoteUserId}:`, err);
    }
  }, [createPeerConnection, broadcast]);

  const handleOffer = useCallback(async (fromUserId, sdp) => {
    const pc = createPeerConnection(fromUserId);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));

      // Flush buffered ICE candidates
      const buffered = iceCandidateBufferRef.current.get(fromUserId) || [];
      for (const candidate of buffered) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      iceCandidateBufferRef.current.delete(fromUserId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      broadcast({
        type: 'answer',
        from: userIdRef.current,
        to: fromUserId,
        sdp: answer.sdp,
      });
    } catch (err) {
      console.error(`[WebRTC] Failed to handle offer from ${fromUserId}:`, err);
    }
  }, [createPeerConnection, broadcast]);

  const handleAnswer = useCallback(async (fromUserId, sdp) => {
    const pc = peerConnectionsRef.current.get(fromUserId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));

      // Flush buffered ICE candidates
      const buffered = iceCandidateBufferRef.current.get(fromUserId) || [];
      for (const candidate of buffered) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      iceCandidateBufferRef.current.delete(fromUserId);
    } catch (err) {
      console.error(`[WebRTC] Failed to handle answer from ${fromUserId}:`, err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (fromUserId, candidateData) => {
    const pc = peerConnectionsRef.current.get(fromUserId);
    const candidate = new RTCIceCandidate(candidateData);

    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn(`[WebRTC] Failed to add ICE candidate from ${fromUserId}:`, err);
      }
    } else {
      // Buffer until remote description is set
      if (!iceCandidateBufferRef.current.has(fromUserId)) {
        iceCandidateBufferRef.current.set(fromUserId, []);
      }
      iceCandidateBufferRef.current.get(fromUserId).push(candidate);
    }
  }, []);

  // ---- Signal handler (dispatches to offer/answer/ice) ----

  const handleSignal = useCallback((message) => {
    const { payload } = message;
    if (!payload || payload.to !== userIdRef.current) return;

    switch (payload.type) {
      case 'offer':
        handleOffer(payload.from, payload.sdp);
        break;
      case 'answer':
        handleAnswer(payload.from, payload.sdp);
        break;
      case 'ice-candidate':
        handleIceCandidate(payload.from, payload.candidate);
        break;
    }
  }, [handleOffer, handleAnswer, handleIceCandidate]);

  // ---- Public API ----

  const addPeer = useCallback((remoteUserId) => {
    if (!enabledRef.current || !userIdRef.current) return;
    if (remoteUserId === userIdRef.current) return;

    // Deterministic initiator: lower userId creates the offer
    const isInitiator = userIdRef.current < remoteUserId;

    if (isInitiator) {
      initiateOffer(remoteUserId);
    }
    // If not initiator, we wait for their offer via signaling
  }, [initiateOffer]);

  const removePeer = useCallback((remoteUserId) => {
    const pc = peerConnectionsRef.current.get(remoteUserId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(remoteUserId);
    }
    iceCandidateBufferRef.current.delete(remoteUserId);
    retryCountRef.current.delete(remoteUserId);
    setRemoteStreams((prev) => {
      if (!(remoteUserId in prev)) return prev;
      const next = { ...prev };
      delete next[remoteUserId];
      return next;
    });
  }, []);

  const removeAllPeers = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    iceCandidateBufferRef.current.clear();
    retryCountRef.current.clear();
    setRemoteStreams({});
  }, []);

  const replaceVideoTrack = useCallback((newTrack) => {
    if (!newTrack) return;
    peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack).catch((err) => {
          console.warn('[WebRTC] replaceTrack failed:', err);
        });
      }
    });
  }, []);

  // ---- Signaling channel lifecycle ----

  useEffect(() => {
    if (!callId || !userId || !enabled) {
      // Cleanup if disabled
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      removeAllPeers();
      return;
    }

    const channel = supabase
      .channel(`webrtc-signal:${callId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'webrtc-signal' }, handleSignal)
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      removeAllPeers();
    };
  }, [callId, userId, enabled, handleSignal, removeAllPeers]);

  // ---- Re-add local tracks when localStream changes (e.g. after reconnect) ----

  useEffect(() => {
    if (!localStream || !enabled) return;

    peerConnectionsRef.current.forEach((pc, remoteUserId) => {
      const senders = pc.getSenders();
      const streamTracks = localStream.getTracks();

      streamTracks.forEach((track) => {
        const existingSender = senders.find((s) => s.track?.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track).catch(() => {});
        } else {
          pc.addTrack(track, localStream);
        }
      });
    });
  }, [localStream, enabled]);

  return {
    remoteStreams,
    addPeer,
    removePeer,
    removeAllPeers,
    replaceVideoTrack,
  };
}

/**
 * useWebRTCPeers — Peer-to-peer WebRTC hook with Supabase Realtime Broadcast signaling.
 *
 * Manages one RTCPeerConnection per remote participant (mesh topology).
 * Uses Supabase Realtime Broadcast channel for SDP offer/answer and ICE candidate exchange.
 * Exposes a `remoteStreams` map that VideoGrid uses to render remote video/audio.
 *
 * Includes a peer-join handshake to handle async channel subscription timing.
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
  const channelReadyRef = useRef(false);
  const pendingPeersRef = useRef(new Set()); // peers queued before channel ready
  const localStreamRef = useRef(localStream);
  const userIdRef = useRef(userId);
  const enabledRef = useRef(enabled);

  // Keep refs in sync
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // ---- Helpers ----

  const broadcast = useCallback((payload) => {
    const ch = channelRef.current;
    if (!ch) return;
    if (!channelReadyRef.current) {
      // Channel not subscribed yet — message would be lost
      console.warn('[WebRTC] Broadcast skipped (channel not ready):', payload.type);
      return;
    }
    ch.send({
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

    console.log(`[WebRTC] Creating peer connection to ${remoteUserId.slice(0, 8)}...`);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks to the connection
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      console.log(`[WebRTC] Added ${stream.getTracks().length} local track(s) to peer connection`);
    } else {
      console.warn('[WebRTC] No local stream available when creating peer connection');
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log(`[WebRTC] Received remote track from ${remoteUserId.slice(0, 8)}: ${event.track.kind}`);
        setRemoteStreams((prev) => {
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

    // Log ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state (${remoteUserId.slice(0, 8)}): ${pc.iceGatheringState}`);
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Connection state (${remoteUserId.slice(0, 8)}): ${state}`);

      if (state === 'failed') {
        const retries = retryCountRef.current.get(remoteUserId) || 0;
        if (retries < MAX_RETRIES) {
          retryCountRef.current.set(remoteUserId, retries + 1);
          console.warn(`[WebRTC] Connection to ${remoteUserId.slice(0, 8)} failed, retrying (${retries + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            if (!enabledRef.current) return;
            pc.close();
            peerConnectionsRef.current.delete(remoteUserId);
            const isInitiator = userIdRef.current < remoteUserId;
            if (isInitiator) {
              initiateOffer(remoteUserId);
            }
          }, RETRY_DELAY);
        } else {
          console.error(`[WebRTC] Connection to ${remoteUserId.slice(0, 8)} failed after ${MAX_RETRIES} retries`);
        }
      }

      if (state === 'connected') {
        retryCountRef.current.set(remoteUserId, 0);
        console.log(`[WebRTC] ✅ Connected to ${remoteUserId.slice(0, 8)}`);
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
    console.log(`[WebRTC] Creating offer for ${remoteUserId.slice(0, 8)}...`);
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
      console.log(`[WebRTC] Sent offer to ${remoteUserId.slice(0, 8)}`);
    } catch (err) {
      console.error(`[WebRTC] Failed to create offer for ${remoteUserId.slice(0, 8)}:`, err);
    }
  }, [createPeerConnection, broadcast]);

  const handleOffer = useCallback(async (fromUserId, sdp) => {
    console.log(`[WebRTC] Received offer from ${fromUserId.slice(0, 8)}`);
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
      console.log(`[WebRTC] Sent answer to ${fromUserId.slice(0, 8)}`);
    } catch (err) {
      console.error(`[WebRTC] Failed to handle offer from ${fromUserId.slice(0, 8)}:`, err);
    }
  }, [createPeerConnection, broadcast]);

  const handleAnswer = useCallback(async (fromUserId, sdp) => {
    console.log(`[WebRTC] Received answer from ${fromUserId.slice(0, 8)}`);
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
      console.error(`[WebRTC] Failed to handle answer from ${fromUserId.slice(0, 8)}:`, err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (fromUserId, candidateData) => {
    const pc = peerConnectionsRef.current.get(fromUserId);
    const candidate = new RTCIceCandidate(candidateData);

    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn(`[WebRTC] Failed to add ICE candidate from ${fromUserId.slice(0, 8)}:`, err);
      }
    } else {
      // Buffer until remote description is set
      if (!iceCandidateBufferRef.current.has(fromUserId)) {
        iceCandidateBufferRef.current.set(fromUserId, []);
      }
      iceCandidateBufferRef.current.get(fromUserId).push(candidate);
    }
  }, []);

  // ---- Peer join handshake ----
  // When a peer's channel is ready, they broadcast peer-join.
  // On receiving peer-join, we respond with peer-ready so both sides
  // know the other is subscribed. Then the initiator sends the offer.

  const tryNegotiate = useCallback((remoteUserId) => {
    if (remoteUserId === userIdRef.current) return;

    // Skip if already connected or connecting
    const existing = peerConnectionsRef.current.get(remoteUserId);
    if (existing && existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
      return;
    }

    const isInitiator = userIdRef.current < remoteUserId;
    if (isInitiator) {
      initiateOffer(remoteUserId);
    }
    // If not initiator, we just wait for their offer
  }, [initiateOffer]);

  // ---- Signal handler (dispatches to offer/answer/ice/peer-join/peer-ready) ----

  const handleSignal = useCallback((message) => {
    const { payload } = message;
    if (!payload) return;

    // peer-join and peer-ready are broadcast to all (no `to` field)
    if (payload.type === 'peer-join') {
      if (payload.from === userIdRef.current) return;
      console.log(`[WebRTC] Received peer-join from ${payload.from?.slice(0, 8)}`);
      // Respond so they know we're here
      broadcast({
        type: 'peer-ready',
        from: userIdRef.current,
        to: payload.from,
      });
      // Negotiate if we're the initiator
      tryNegotiate(payload.from);
      return;
    }

    if (payload.type === 'peer-ready') {
      if (payload.from === userIdRef.current) return;
      console.log(`[WebRTC] Received peer-ready from ${payload.from?.slice(0, 8)}`);
      // The other side confirmed they're subscribed — negotiate if we're the initiator
      tryNegotiate(payload.from);
      return;
    }

    // Directed messages (offer/answer/ice) — must be addressed to us
    if (payload.to !== userIdRef.current) return;

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
  }, [handleOffer, handleAnswer, handleIceCandidate, broadcast, tryNegotiate]);

  // ---- Public API ----

  const addPeer = useCallback((remoteUserId) => {
    if (!enabledRef.current || !userIdRef.current) return;
    if (remoteUserId === userIdRef.current) return;

    if (!channelReadyRef.current) {
      // Channel not subscribed yet — queue for when it's ready
      pendingPeersRef.current.add(remoteUserId);
      console.log(`[WebRTC] Queued peer ${remoteUserId.slice(0, 8)} (channel not ready)`);
      return;
    }

    tryNegotiate(remoteUserId);
  }, [tryNegotiate]);

  const removePeer = useCallback((remoteUserId) => {
    const pc = peerConnectionsRef.current.get(remoteUserId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(remoteUserId);
    }
    iceCandidateBufferRef.current.delete(remoteUserId);
    retryCountRef.current.delete(remoteUserId);
    pendingPeersRef.current.delete(remoteUserId);
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
    pendingPeersRef.current.clear();
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
      channelReadyRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      removeAllPeers();
      return;
    }

    console.log(`[WebRTC] Subscribing to signaling channel for call ${callId.slice(0, 8)}...`);

    channelReadyRef.current = false;

    const channel = supabase
      .channel(`webrtc-signal:${callId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'webrtc-signal' }, handleSignal)
      .subscribe((status) => {
        console.log(`[WebRTC] Channel subscription status: ${status}`);

        if (status === 'SUBSCRIBED') {
          channelReadyRef.current = true;
          channelRef.current = channel;

          // Process any peers that were queued before channel was ready
          if (pendingPeersRef.current.size > 0) {
            console.log(`[WebRTC] Flushing ${pendingPeersRef.current.size} queued peer(s)`);
            pendingPeersRef.current.forEach((remoteUserId) => {
              const isInitiator = userIdRef.current < remoteUserId;
              if (isInitiator) {
                initiateOffer(remoteUserId);
              }
            });
            pendingPeersRef.current.clear();
          }

          // Announce presence to any peers already in the channel
          channel.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: { type: 'peer-join', from: userIdRef.current },
          });
          console.log(`[WebRTC] Sent peer-join announcement`);
        }
      });

    // Set the ref immediately so cleanup works, but broadcast() checks channelReadyRef
    channelRef.current = channel;

    return () => {
      console.log('[WebRTC] Cleaning up signaling channel');
      channelReadyRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
      removeAllPeers();
    };
  }, [callId, userId, enabled, handleSignal, removeAllPeers, initiateOffer]);

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

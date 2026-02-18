import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useTwilioDevice(userId) {
  const [device, setDevice] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle | connecting | ringing | connected
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  const deviceRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  // Fetch access token from edge function
  const fetchToken = useCallback(async () => {
    if (!userId) return null;
    try {
      const res = await fetch(`${EDGE_URL}/twilio-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Token fetch failed');
      return data.token;
    } catch (err) {
      console.error('Failed to fetch Twilio token:', err);
      setError(err.message);
      return null;
    }
  }, [userId]);

  // Start duration timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setCallDuration(Math.floor((Date.now() - start) / 1000));
      }
    }, 1000);
  }, []);

  // Stop duration timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset call state
  const resetCallState = useCallback(() => {
    setActiveCall(null);
    setCallStatus('idle');
    setIsMuted(false);
    setCallDuration(0);
    stopTimer();
  }, [stopTimer]);

  // Initialize the Twilio Device
  const initDevice = useCallback(async () => {
    const token = await fetchToken();
    if (!token || !mountedRef.current) return;

    try {
      // Destroy existing device
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }

      const newDevice = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        closeProtection: true,
        logLevel: 1,
      });

      // Device events
      newDevice.on('registered', () => {
        console.log('[Twilio] Device registered');
        if (mountedRef.current) setIsReady(true);
      });

      newDevice.on('unregistered', () => {
        console.log('[Twilio] Device unregistered');
        if (mountedRef.current) setIsReady(false);
      });

      newDevice.on('error', (err) => {
        console.error('[Twilio] Device error:', err);
        if (mountedRef.current) setError(err.message);
      });

      newDevice.on('incoming', (call) => {
        console.log('[Twilio] Incoming call from:', call.parameters?.From);
        if (mountedRef.current) {
          setIncomingCall(call);
          setCallStatus('ringing');

          call.on('cancel', () => {
            if (mountedRef.current) {
              setIncomingCall(null);
              resetCallState();
            }
          });

          call.on('disconnect', () => {
            if (mountedRef.current) {
              setIncomingCall(null);
              resetCallState();
            }
          });
        }
      });

      newDevice.on('tokenWillExpire', async () => {
        console.log('[Twilio] Token expiring, refreshing...');
        const newToken = await fetchToken();
        if (newToken) newDevice.updateToken(newToken);
      });

      // Register the device
      await newDevice.register();
      deviceRef.current = newDevice;
      if (mountedRef.current) setDevice(newDevice);

    } catch (err) {
      console.error('[Twilio] Device init error:', err);
      if (mountedRef.current) setError(err.message);
    }
  }, [fetchToken, resetCallState]);

  // Make an outbound call
  const makeCall = useCallback(async (toNumber, fromNumber) => {
    if (!deviceRef.current || !isReady) {
      console.error('[Twilio] Device not ready');
      return null;
    }

    // Prevent duplicate calls if one is already active or connecting
    if (activeCall || callStatus !== 'idle') {
      console.warn('[Twilio] Call already active, ignoring duplicate connect');
      return null;
    }

    try {
      setCallStatus('connecting');

      const call = await deviceRef.current.connect({
        params: {
          To: toNumber,
          From: `client:user_${userId}`,
          CallerNumber: fromNumber || '',
          FromNumber: fromNumber || '',
        },
      });

      setActiveCall(call);

      call.on('ringing', () => {
        if (mountedRef.current) setCallStatus('ringing');
      });

      call.on('accept', () => {
        if (mountedRef.current) {
          setCallStatus('connected');
          startTimer();
        }
      });

      call.on('disconnect', () => {
        if (mountedRef.current) resetCallState();
      });

      call.on('cancel', () => {
        if (mountedRef.current) resetCallState();
      });

      call.on('error', (err) => {
        console.error('[Twilio] Call error:', err);
        if (mountedRef.current) {
          setError(err.message);
          resetCallState();
        }
      });

      return call;
    } catch (err) {
      console.error('[Twilio] Make call error:', err);
      setError(err.message);
      resetCallState();
      return null;
    }
  }, [userId, isReady, activeCall, callStatus, startTimer, resetCallState]);

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;

    incomingCall.accept();
    setActiveCall(incomingCall);
    setIncomingCall(null);
    setCallStatus('connected');
    startTimer();

    incomingCall.on('disconnect', () => {
      if (mountedRef.current) resetCallState();
    });
  }, [incomingCall, startTimer, resetCallState]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    incomingCall.reject();
    setIncomingCall(null);
    resetCallState();
  }, [incomingCall, resetCallState]);

  // Hang up active call
  const hangup = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
    }
    if (incomingCall) {
      incomingCall.reject();
      setIncomingCall(null);
    }
    resetCallState();
  }, [activeCall, incomingCall, resetCallState]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!activeCall) return;
    const newMuted = !isMuted;
    activeCall.mute(newMuted);
    setIsMuted(newMuted);
  }, [activeCall, isMuted]);

  // Init on mount when userId available
  useEffect(() => {
    mountedRef.current = true;
    if (userId) {
      initDevice();
    }
    return () => {
      mountedRef.current = false;
      stopTimer();
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
    };
  }, [userId]); // Only depend on userId, not initDevice to avoid loops

  return {
    device,
    isReady,
    activeCall,
    incomingCall,
    callStatus,
    isMuted,
    callDuration,
    error,
    makeCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
  };
}

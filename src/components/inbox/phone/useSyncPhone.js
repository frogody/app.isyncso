import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';
import { useTwilioDevice } from './useTwilioDevice';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useSyncPhone() {
  const { user, company } = useUser();
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [smsHistory, setSmsHistory] = useState([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const mountedRef = useRef(true);

  const companyId = company?.id || user?.company_id;
  // organization_phone_numbers uses organization_id (FK to organizations table)
  // RLS policy now checks auth_organization_id() which returns users.organization_id
  const orgId = user?.organization_id || companyId;
  const userId = user?.id;

  // Initialize Twilio Voice SDK device
  const twilioDevice = useTwilioDevice(userId);

  // Fetch user's assigned Sync phone number
  const fetchPhoneNumber = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_phone_numbers')
        .select('*')
        .eq('organization_id', orgId)
        .neq('status', 'released')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (mountedRef.current) {
        setPhoneNumber(data?.[0] || null);
      }
    } catch (err) {
      console.error('Failed to fetch phone number:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [orgId]);

  // Request (provision) a new phone number
  const requestPhoneNumber = useCallback(async (areaCode) => {
    if (!orgId) {
      toast.error('No organization found');
      return null;
    }
    setProvisioning(true);
    try {
      const searchRes = await fetch(`${EDGE_URL}/twilio-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'search',
          organization_id: orgId,
          country: 'US',
          area_code: areaCode || undefined,
        }),
      });

      const searchData = await searchRes.json();
      if (!searchData.success || !searchData.numbers?.length) {
        toast.error('No phone numbers available in that area');
        return null;
      }

      const numberToPurchase = searchData.numbers[0];
      const purchaseRes = await fetch(`${EDGE_URL}/twilio-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'purchase',
          organization_id: orgId,
          phone_number: numberToPurchase.phone_number,
          friendly_name: `Sync Phone - ${user?.full_name || 'Main'}`,
        }),
      });

      const purchaseData = await purchaseRes.json();
      if (!purchaseData.success) {
        toast.error(purchaseData.error || 'Failed to provision number');
        return null;
      }

      toast.success(`Phone number ${numberToPurchase.phone_number} provisioned`);
      if (mountedRef.current) {
        setPhoneNumber(purchaseData.number);
      }
      return purchaseData.number;
    } catch (err) {
      console.error('Failed to provision number:', err);
      toast.error('Failed to provision phone number');
      return null;
    } finally {
      if (mountedRef.current) setProvisioning(false);
    }
  }, [orgId, user]);

  // Release a phone number
  const releasePhoneNumber = useCallback(async (numberId) => {
    if (!orgId || !numberId) return;
    try {
      const res = await fetch(`${EDGE_URL}/twilio-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'release',
          organization_id: orgId,
          number_id: numberId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to release number');
        return;
      }

      toast.success('Phone number released');
      if (mountedRef.current) setPhoneNumber(null);
    } catch (err) {
      console.error('Failed to release number:', err);
      toast.error('Failed to release phone number');
    }
  }, [orgId]);

  // Fetch call history from sync_phone_calls
  const fetchCallHistory = useCallback(async () => {
    if (!userId) return;
    setCallsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sync_phone_calls')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('sync_phone_calls query failed:', error.message);
        if (mountedRef.current) setCallHistory([]);
        return;
      }
      if (mountedRef.current) setCallHistory(data || []);
    } catch (err) {
      console.warn('Failed to fetch call history:', err);
      if (mountedRef.current) setCallHistory([]);
    } finally {
      if (mountedRef.current) setCallsLoading(false);
    }
  }, [userId]);

  // Fetch SMS history
  const fetchSmsHistory = useCallback(async () => {
    if (!orgId) return;
    setSmsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_conversations')
        .select('*')
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('sms_conversations query failed:', error.message);
        if (mountedRef.current) setSmsHistory([]);
        return;
      }
      if (mountedRef.current) setSmsHistory(data || []);
    } catch (err) {
      console.warn('Failed to fetch SMS history:', err);
      if (mountedRef.current) setSmsHistory([]);
    } finally {
      if (mountedRef.current) setSmsLoading(false);
    }
  }, [orgId]);

  // Make outbound call via Twilio Device
  const makeCall = useCallback(async (toNumber) => {
    if (!twilioDevice.isReady) {
      toast.error('Phone not ready. Please wait a moment.');
      return null;
    }
    if (!phoneNumber?.phone_number) {
      toast.error('No phone number configured');
      return null;
    }
    const call = await twilioDevice.makeCall(toNumber, phoneNumber.phone_number);
    if (call) {
      toast.info(`Calling ${toNumber}...`);
    }
    return call;
  }, [twilioDevice, phoneNumber]);

  // Call Sync AI
  const callSync = useCallback(async () => {
    if (!twilioDevice.isReady) {
      toast.error('Phone not ready. Please wait a moment.');
      return null;
    }
    const call = await twilioDevice.makeCall('sync-ai', phoneNumber?.phone_number || '');
    if (call) {
      toast.info('Connecting to Sync AI...');
    }
    return call;
  }, [twilioDevice, phoneNumber]);

  // Send SMS
  const sendSMS = useCallback(async (toNumber, body) => {
    if (!orgId || !phoneNumber) {
      toast.error('No phone number configured');
      return null;
    }
    try {
      const res = await fetch(`${EDGE_URL}/sms-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          organization_id: orgId,
          candidate_id: 'manual',
          phone_number: toNumber,
          message: body,
          from_number_id: phoneNumber.id,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to send SMS');
        return null;
      }

      toast.success('SMS sent');
      await fetchSmsHistory();
      return data;
    } catch (err) {
      console.error('Failed to send SMS:', err);
      toast.error('Failed to send SMS');
      return null;
    }
  }, [orgId, phoneNumber, fetchSmsHistory]);

  // Update phone number metadata (settings)
  const updateSettings = useCallback(async (metadata) => {
    if (!phoneNumber?.id || !orgId) return;
    try {
      const { error } = await supabase
        .from('organization_phone_numbers')
        .update({ metadata })
        .eq('id', phoneNumber.id)
        .eq('organization_id', orgId);

      if (error) throw error;
      if (mountedRef.current) {
        setPhoneNumber(prev => ({ ...prev, metadata }));
      }
      return true;
    } catch (err) {
      console.error('Failed to update settings:', err);
      toast.error('Failed to save settings');
      return false;
    }
  }, [phoneNumber, orgId]);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchPhoneNumber(),
      fetchCallHistory(),
      fetchSmsHistory(),
    ]);
  }, [fetchPhoneNumber, fetchCallHistory, fetchSmsHistory]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    if (orgId) {
      fetchPhoneNumber();
      fetchCallHistory();
      fetchSmsHistory();
    }
    return () => { mountedRef.current = false; };
  }, [orgId, fetchPhoneNumber, fetchCallHistory, fetchSmsHistory]);

  return {
    // Phone number
    phoneNumber,
    loading,
    provisioning,
    requestPhoneNumber,
    releasePhoneNumber,
    // History
    callHistory,
    smsHistory,
    callsLoading,
    smsLoading,
    // Calling (Twilio Device)
    isDeviceReady: twilioDevice.isReady,
    callStatus: twilioDevice.callStatus,
    isMuted: twilioDevice.isMuted,
    callDuration: twilioDevice.callDuration,
    incomingCall: twilioDevice.incomingCall,
    activeCall: twilioDevice.activeCall,
    makeCall,
    callSync,
    acceptCall: twilioDevice.acceptCall,
    rejectCall: twilioDevice.rejectCall,
    hangupCall: twilioDevice.hangup,
    toggleMute: twilioDevice.toggleMute,
    // SMS
    sendSMS,
    // Settings
    updateSettings,
    refetch,
  };
}

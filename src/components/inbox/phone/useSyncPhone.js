import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

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
  // RLS policies on organization_phone_numbers check auth_company_id() which returns
  // users.company_id, so we must use companyId here — not organization_id
  const orgId = companyId;

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
      // First search for available numbers
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

      // Purchase the first available number
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

  // Fetch call history
  const fetchCallHistory = useCallback(async () => {
    if (!orgId) return;
    setCallsLoading(true);
    try {
      const { data, error } = await supabase
        .from('phone_calls')
        .select('*')
        .eq('company_id', companyId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        // Table may not exist yet, silently handle
        console.warn('phone_calls query failed:', error.message);
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
  }, [companyId, orgId]);

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

  // Make outbound call (placeholder for Twilio client SDK)
  const makeCall = useCallback(async (toNumber) => {
    toast.info('Outbound calling will be available in the next update');
    return null;
  }, []);

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
      // Refresh SMS history
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
    phoneNumber,
    loading,
    provisioning,
    callHistory,
    smsHistory,
    callsLoading,
    smsLoading,
    requestPhoneNumber,
    releasePhoneNumber,
    makeCall,
    sendSMS,
    updateSettings,
    refetch,
  };
}

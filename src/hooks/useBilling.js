import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useBilling() {
  const { user, company } = useUser();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [creditPacks, setCreditPacks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditTransactions, setCreditTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.company_id) return;
    setIsLoading(true);

    try {
      // Fetch in parallel
      const [plansRes, packsRes, subRes, invoicesRes, userRes, transactionsRes] = await Promise.all([
        supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true }),
        supabase
          .from('credit_packs')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('company_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('company_id', user.company_id)
          .maybeSingle(),
        supabase
          .from('invoices')
          .select('*')
          .eq('company_id', user.company_id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single(),
        supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
          .then(r => r, (err) => {
            console.warn('[useBilling] credit_transactions table not available:', err.message);
            return { data: [], error: null };
          }),
      ]);

      if (plansRes.data) setPlans(plansRes.data);
      if (packsRes.data) setCreditPacks(packsRes.data);
      if (subRes.data) setSubscription(subRes.data);
      if (invoicesRes.data) setInvoices(invoicesRes.data);
      if (userRes.data) setCreditBalance(userRes.data.credits || 0);
      if (transactionsRes.data) setCreditTransactions(transactionsRes.data);
    } catch (err) {
      console.error('[useBilling] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.company_id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createCheckout = useCallback(async (type, slug, billingCycle) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      const body = type === 'subscription'
        ? { type, plan_slug: slug, billing_cycle: billingCycle }
        : { type, pack_slug: slug };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error('[useBilling] checkout error:', err);
      toast.error(err.message || 'Failed to create checkout');
    }
  }, []);

  const openPortal = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-billing-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    } catch (err) {
      console.error('[useBilling] portal error:', err);
      toast.error(err.message || 'Failed to open billing portal');
    }
  }, []);

  return {
    subscription,
    plans,
    creditPacks,
    invoices,
    creditBalance,
    creditTransactions,
    isLoading,
    createCheckout,
    openPortal,
    refresh: fetchAll,
  };
}

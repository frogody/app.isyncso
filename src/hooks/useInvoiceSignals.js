import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useInvoiceSignals(companyId) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSignals = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/invoice-signals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ company_id: companyId }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      setSignals(result.signals || []);
    } catch (err) {
      console.error('[useInvoiceSignals] Error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Mark a proposal as converted after creating an invoice from it
  const markProposalConverted = useCallback(async (proposalId, invoiceId) => {
    await supabase
      .from('proposals')
      .update({ converted_to_invoice_id: invoiceId, converted_at: new Date().toISOString() })
      .eq('id', proposalId);
    // Remove from local signals
    setSignals(prev => prev.filter(s => !(s.type === 'accepted_proposal' && s.source_id === proposalId)));
  }, []);

  // Mark a sales order as invoiced
  const markOrderInvoiced = useCallback(async (orderId, invoiceId) => {
    await supabase
      .from('sales_orders')
      .update({ invoice_id: invoiceId })
      .eq('id', orderId);
    setSignals(prev => prev.filter(s => !(s.type === 'delivered_order' && s.source_id === orderId)));
  }, []);

  // Dismiss a signal locally (for won deals or recurring that user doesn't want to act on now)
  const dismissSignal = useCallback((sourceId) => {
    setSignals(prev => prev.filter(s => s.source_id !== sourceId));
  }, []);

  return {
    signals,
    loading,
    error,
    refresh: fetchSignals,
    markProposalConverted,
    markOrderInvoiced,
    dismissSignal,
  };
}

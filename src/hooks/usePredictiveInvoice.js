import { useState, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

export function usePredictiveInvoice() {
  const [lineItems, setLineItems] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const generateDraft = useCallback(async (prospectId, companyId, dateFrom, dateTo) => {
    setIsLoading(true);
    setError(null);
    setLineItems([]);
    setTotalHours(0);
    setMeta(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/predictive-invoice-draft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            prospect_id: prospectId,
            company_id: companyId,
            date_from: dateFrom,
            date_to: dateTo,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      setLineItems(result.line_items || []);
      setTotalHours(result.total_hours || 0);
      setMeta({
        dateRange: result.date_range,
        entityNamesUsed: result.entity_names_used,
        threadsMatched: result.threads_matched,
        activitiesFound: result.activities_found,
        message: result.message,
      });

      return result;
    } catch (err) {
      const msg = err.message || 'Failed to generate predictive invoice draft';
      setError(msg);
      console.error('[usePredictiveInvoice] Error:', msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLineItems([]);
    setTotalHours(0);
    setError(null);
    setMeta(null);
  }, []);

  return {
    generateDraft,
    lineItems,
    totalHours,
    isLoading,
    error,
    meta,
    reset,
  };
}

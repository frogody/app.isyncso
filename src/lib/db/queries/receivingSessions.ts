/**
 * Receiving Sessions Queries
 */

import { supabase } from '@/api/supabaseClient';
import type {
  ReceivingSession,
  ReceivingSessionInsert,
  ReceivingSessionUpdate,
  ReceivingLog,
} from '../schema';

// =============================================================================
// RECEIVING SESSIONS
// =============================================================================

export async function createReceivingSession(
  session: ReceivingSessionInsert
): Promise<ReceivingSession> {
  const { data, error } = await supabase
    .from('receiving_sessions')
    .insert(session)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReceivingSession(
  id: string
): Promise<ReceivingSession | null> {
  const { data, error } = await supabase
    .from('receiving_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateReceivingSession(
  id: string,
  updates: ReceivingSessionUpdate
): Promise<ReceivingSession> {
  const { data, error } = await supabase
    .from('receiving_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listReceivingSessions(
  companyId: string,
  status?: string
): Promise<ReceivingSession[]> {
  let query = supabase
    .from('receiving_sessions')
    .select('*')
    .eq('company_id', companyId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('started_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function closeReceivingSession(
  id: string,
  closedBy: string,
  notes?: string
): Promise<ReceivingSession> {
  // Count total items and distinct EANs from receiving_log for this session
  const { data: logs, error: logsError } = await supabase
    .from('receiving_log')
    .select('quantity_received, ean_scanned')
    .eq('receiving_session_id', id);

  if (logsError) throw logsError;

  const totalItems = (logs || []).reduce(
    (sum, log) => sum + (log.quantity_received || 0),
    0
  );
  const uniqueEans = new Set(
    (logs || []).map((log) => log.ean_scanned).filter(Boolean)
  );

  const { data, error } = await supabase
    .from('receiving_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: closedBy,
      total_items_received: totalItems,
      total_eans_scanned: uniqueEans.size,
      notes: notes || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSessionReceivingLogs(
  sessionId: string
): Promise<ReceivingLog[]> {
  const { data, error } = await supabase
    .from('receiving_log')
    .select(`
      *,
      products (id, name, sku, ean)
    `)
    .eq('receiving_session_id', sessionId)
    .order('received_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

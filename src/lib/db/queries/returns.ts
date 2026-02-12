/**
 * Returns & Return Items Queries
 */

import { supabase } from '@/api/supabaseClient';
import type {
  Return,
  ReturnInsert,
  ReturnUpdate,
  ReturnItem,
  ReturnItemInsert,
  ReturnItemUpdate,
} from '../schema';

// =============================================================================
// RETURNS
// =============================================================================

interface ReturnFilters {
  status?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export async function listReturns(
  companyId: string,
  filters?: ReturnFilters
): Promise<Return[]> {
  let query = supabase
    .from('returns')
    .select(`
      *,
      customers (id, name, email),
      sales_orders (id, order_number),
      return_items (
        id, product_id, ean, quantity, reason, action, action_completed,
        products (id, name, sku, ean)
      )
    `)
    .eq('company_id', companyId)
    .order('registered_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.source) {
    query = query.eq('source', filters.source);
  }
  if (filters?.dateFrom) {
    query = query.gte('registered_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('registered_at', filters.dateTo);
  }
  if (filters?.search) {
    query = query.or(`return_code.ilike.%${filters.search}%,bol_return_id.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getReturn(id: string): Promise<Return | null> {
  const { data, error } = await supabase
    .from('returns')
    .select(`
      *,
      customers (id, name, email),
      sales_orders (id, order_number),
      return_items (
        id, product_id, ean, quantity, reason, reason_notes, action, action_completed, receiving_log_id,
        products (id, name, sku, ean)
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createReturn(ret: ReturnInsert): Promise<Return> {
  const { data, error } = await supabase
    .from('returns')
    .insert(ret)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReturn(id: string, updates: ReturnUpdate): Promise<Return> {
  const { data, error } = await supabase
    .from('returns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// RETURN ITEMS
// =============================================================================

export async function listReturnItems(returnId: string): Promise<ReturnItem[]> {
  const { data, error } = await supabase
    .from('return_items')
    .select(`
      *,
      products (id, name, sku, ean)
    `)
    .eq('return_id', returnId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createReturnItem(item: ReturnItemInsert): Promise<ReturnItem> {
  const { data, error } = await supabase
    .from('return_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReturnItem(id: string, updates: ReturnItemUpdate): Promise<ReturnItem> {
  const { data, error } = await supabase
    .from('return_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// HELPERS
// =============================================================================

export function generateReturnCode(source: string, bolReturnId?: string): string {
  if (source === 'bolcom' && bolReturnId) {
    return `RET-BOL-${bolReturnId}`;
  }
  const ts = Date.now().toString(36).toUpperCase();
  return `RET-${source.toUpperCase().slice(0, 3)}-${ts}`;
}

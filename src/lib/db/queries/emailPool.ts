/**
 * Email Pool Queries
 *
 * CRUD operations for email_pool_accounts, email_pool_sync_log,
 * and supplier_email_patterns tables.
 */

import { supabase } from '@/api/supabaseClient';
import type {
  EmailPoolAccount,
  EmailPoolAccountInsert,
  EmailPoolAccountUpdate,
  EmailPoolSyncLog,
  EmailPoolSyncLogInsert,
  EmailPoolSyncLogUpdate,
  SupplierEmailPattern,
  SupplierEmailPatternInsert,
  SupplierEmailPatternUpdate,
} from '../schema';

// =============================================================================
// EMAIL POOL ACCOUNTS
// =============================================================================

export async function listEmailPoolAccounts(companyId: string): Promise<EmailPoolAccount[]> {
  const { data, error } = await supabase
    .from('email_pool_accounts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getEmailPoolAccount(id: string): Promise<EmailPoolAccount | null> {
  const { data, error } = await supabase
    .from('email_pool_accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createEmailPoolAccount(
  account: EmailPoolAccountInsert
): Promise<EmailPoolAccount> {
  const { data, error } = await supabase
    .from('email_pool_accounts')
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEmailPoolAccount(
  id: string,
  updates: EmailPoolAccountUpdate
): Promise<EmailPoolAccount> {
  const { data, error } = await supabase
    .from('email_pool_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEmailPoolAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('email_pool_accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =============================================================================
// EMAIL POOL SYNC LOG
// =============================================================================

export async function listSyncLog(
  companyId: string,
  filters?: {
    accountId?: string;
    classification?: string;
    status?: string;
    limit?: number;
  }
): Promise<EmailPoolSyncLog[]> {
  let query = supabase
    .from('email_pool_sync_log')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (filters?.accountId) {
    query = query.eq('email_pool_account_id', filters.accountId);
  }
  if (filters?.classification) {
    query = query.eq('classification', filters.classification);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createSyncLogEntry(
  entry: EmailPoolSyncLogInsert
): Promise<EmailPoolSyncLog> {
  const { data, error } = await supabase
    .from('email_pool_sync_log')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSyncLogEntry(
  id: string,
  updates: EmailPoolSyncLogUpdate
): Promise<EmailPoolSyncLog> {
  const { data, error } = await supabase
    .from('email_pool_sync_log')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// SUPPLIER EMAIL PATTERNS
// =============================================================================

export async function listSupplierPatterns(companyId: string): Promise<SupplierEmailPattern[]> {
  const { data, error } = await supabase
    .from('supplier_email_patterns')
    .select('*')
    .eq('company_id', companyId)
    .order('supplier_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createSupplierPattern(
  pattern: SupplierEmailPatternInsert
): Promise<SupplierEmailPattern> {
  const { data, error } = await supabase
    .from('supplier_email_patterns')
    .insert(pattern)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSupplierPattern(
  id: string,
  updates: SupplierEmailPatternUpdate
): Promise<SupplierEmailPattern> {
  const { data, error } = await supabase
    .from('supplier_email_patterns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSupplierPattern(id: string): Promise<void> {
  const { error } = await supabase
    .from('supplier_email_patterns')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

const DEFAULT_SUPPLIER_PATTERNS: Omit<SupplierEmailPatternInsert, 'company_id'>[] = [
  {
    supplier_name: 'Amazon',
    sender_patterns: ['@amazon.nl', '@amazon.de', '@amazon.com', '@amazon.co.uk'],
    subject_patterns: ['Your Amazon.* order', 'Bestelling.*Amazon', 'Order Confirmation'],
    country: 'NL',
    default_sales_channel: 'b2c',
    is_active: true,
  },
  {
    supplier_name: 'bol.com',
    sender_patterns: ['@bol.com', 'noreply@bol.com'],
    subject_patterns: ['Bestelling.*bol\\.com', 'Orderbevestiging', 'Je bestelling'],
    country: 'NL',
    default_sales_channel: 'b2c',
    is_active: true,
  },
  {
    supplier_name: 'Coolblue',
    sender_patterns: ['@coolblue.nl', '@coolblue.be'],
    subject_patterns: ['Coolblue.*bestelling', 'orderbevestiging'],
    country: 'NL',
    default_sales_channel: 'b2c',
    is_active: true,
  },
  {
    supplier_name: 'Joybuy',
    sender_patterns: ['@joybuy.com', '@jd.com'],
    subject_patterns: ['order.*confirm', 'JoyBuy.*order'],
    country: 'CN',
    default_sales_channel: 'b2b',
    is_active: true,
  },
  {
    supplier_name: "De'Longhi",
    sender_patterns: ['@delonghi.com', '@delonghi.nl'],
    subject_patterns: ['order.*Longhi', "De'Longhi.*order"],
    country: 'NL',
    default_sales_channel: 'b2b',
    is_active: true,
  },
];

export async function seedDefaultSupplierPatterns(companyId: string): Promise<void> {
  // Check if any patterns exist for this company
  const { data: existing } = await supabase
    .from('supplier_email_patterns')
    .select('id')
    .eq('company_id', companyId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const rows = DEFAULT_SUPPLIER_PATTERNS.map((p) => ({
    ...p,
    company_id: companyId,
  }));

  const { error } = await supabase
    .from('supplier_email_patterns')
    .insert(rows);

  if (error) throw error;
}

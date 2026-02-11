/**
 * bol.com Integration Queries (Phase 4)
 */

import { supabase } from '@/api/supabaseClient';
import type {
  BolcomCredentials,
  BolcomCredentialsInsert,
  BolcomCredentialsUpdate,
  BolcomOfferMapping,
  BolcomOfferMappingInsert,
  BolcomOfferMappingUpdate,
  BolcomPendingProcessStatus,
  BolcomPendingProcessStatusInsert,
} from '../schema';

// =============================================================================
// CREDENTIALS
// =============================================================================

export async function getBolcomCredentials(companyId: string): Promise<BolcomCredentials | null> {
  const { data, error } = await supabase
    .from('bolcom_credentials')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertBolcomCredentials(
  creds: BolcomCredentialsInsert
): Promise<BolcomCredentials> {
  const { data, error } = await supabase
    .from('bolcom_credentials')
    .upsert(creds, { onConflict: 'company_id,environment' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBolcomCredentials(
  id: string,
  updates: BolcomCredentialsUpdate
): Promise<BolcomCredentials> {
  const { data, error } = await supabase
    .from('bolcom_credentials')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBolcomCredentials(id: string): Promise<void> {
  const { error } = await supabase
    .from('bolcom_credentials')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =============================================================================
// OFFER MAPPINGS
// =============================================================================

export async function listOfferMappings(
  companyId: string,
  filters?: { activeOnly?: boolean }
): Promise<BolcomOfferMapping[]> {
  let query = supabase
    .from('bolcom_offer_mappings')
    .select('*')
    .eq('company_id', companyId);

  if (filters?.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertOfferMapping(
  mapping: BolcomOfferMappingInsert
): Promise<BolcomOfferMapping> {
  const { data, error } = await supabase
    .from('bolcom_offer_mappings')
    .upsert(mapping, { onConflict: 'company_id,ean' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOfferMapping(
  id: string,
  updates: BolcomOfferMappingUpdate
): Promise<BolcomOfferMapping> {
  const { data, error } = await supabase
    .from('bolcom_offer_mappings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOfferMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('bolcom_offer_mappings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getOfferMappingByEan(
  companyId: string,
  ean: string
): Promise<BolcomOfferMapping | null> {
  const { data, error } = await supabase
    .from('bolcom_offer_mappings')
    .select('*')
    .eq('company_id', companyId)
    .eq('ean', ean)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// =============================================================================
// PENDING PROCESS STATUSES
// =============================================================================

export async function listPendingProcessStatuses(
  companyId: string
): Promise<BolcomPendingProcessStatus[]> {
  const { data, error } = await supabase
    .from('bolcom_pending_process_statuses')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertProcessStatus(
  status: BolcomPendingProcessStatusInsert
): Promise<BolcomPendingProcessStatus> {
  const { data, error } = await supabase
    .from('bolcom_pending_process_statuses')
    .upsert(status, { onConflict: 'company_id,process_status_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function resolveProcessStatus(
  id: string,
  status: 'success' | 'failure' | 'timeout',
  resultData?: unknown,
  errorMessage?: string
): Promise<BolcomPendingProcessStatus> {
  const { data, error } = await supabase
    .from('bolcom_pending_process_statuses')
    .update({
      status,
      result_data: resultData || null,
      error_message: errorMessage || null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProcessStatusByEntity(
  companyId: string,
  entityType: string,
  entityId: string
): Promise<BolcomPendingProcessStatus | null> {
  const { data, error } = await supabase
    .from('bolcom_pending_process_statuses')
    .select('*')
    .eq('company_id', companyId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

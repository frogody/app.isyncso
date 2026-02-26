/**
 * Customer Queries
 */

import { supabase } from '@/api/supabaseClient';
import { sanitizeSearchInput } from '@/utils/validation';
import type { Customer, CustomerInsert, CustomerUpdate } from '../schema';

export async function listCustomers(companyId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createCustomer(customer: CustomerInsert): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, updates: CustomerUpdate): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function searchCustomers(companyId: string, query: string): Promise<Customer[]> {
  const cleanSearch = sanitizeSearchInput(query);

  let q = supabase
    .from('customers')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
    .limit(20);

  if (cleanSearch) {
    q = q.or(`name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,contact_name.ilike.%${cleanSearch}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

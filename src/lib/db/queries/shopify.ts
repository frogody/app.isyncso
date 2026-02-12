/**
 * Shopify Integration Queries
 */

import { supabase } from '@/api/supabaseClient';
import type {
  ShopifyCredentials,
  ShopifyCredentialsInsert,
  ShopifyCredentialsUpdate,
  ShopifyProductMapping,
  ShopifyProductMappingInsert,
  ShopifyProductMappingUpdate,
} from '../schema';

// =============================================================================
// CREDENTIALS
// =============================================================================

export async function getShopifyCredentials(
  companyId: string
): Promise<ShopifyCredentials | null> {
  const { data, error } = await supabase
    .from('shopify_credentials')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertShopifyCredentials(
  creds: ShopifyCredentialsInsert
): Promise<ShopifyCredentials> {
  const { data, error } = await supabase
    .from('shopify_credentials')
    .upsert(creds, { onConflict: 'company_id,shop_domain' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShopifyCredentials(
  id: string,
  updates: ShopifyCredentialsUpdate
): Promise<ShopifyCredentials> {
  const { data, error } = await supabase
    .from('shopify_credentials')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteShopifyCredentials(id: string): Promise<void> {
  const { error } = await supabase
    .from('shopify_credentials')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =============================================================================
// PRODUCT MAPPINGS
// =============================================================================

export async function listShopifyMappings(
  companyId: string,
  filters?: { activeOnly?: boolean }
): Promise<ShopifyProductMapping[]> {
  let query = supabase
    .from('shopify_product_mappings')
    .select(`
      *,
      products (id, name, sku, ean)
    `)
    .eq('company_id', companyId);

  if (filters?.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertShopifyMapping(
  mapping: ShopifyProductMappingInsert
): Promise<ShopifyProductMapping> {
  const { data, error } = await supabase
    .from('shopify_product_mappings')
    .upsert(mapping, { onConflict: 'company_id,shopify_variant_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShopifyMapping(
  id: string,
  updates: ShopifyProductMappingUpdate
): Promise<ShopifyProductMapping> {
  const { data, error } = await supabase
    .from('shopify_product_mappings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteShopifyMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('shopify_product_mappings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getShopifyMappingByProductId(
  companyId: string,
  productId: string
): Promise<ShopifyProductMapping | null> {
  const { data, error } = await supabase
    .from('shopify_product_mappings')
    .select('*')
    .eq('company_id', companyId)
    .eq('product_id', productId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getShopifyMappingByShopifyId(
  companyId: string,
  shopifyVariantId: number
): Promise<ShopifyProductMapping | null> {
  const { data, error } = await supabase
    .from('shopify_product_mappings')
    .select('*')
    .eq('company_id', companyId)
    .eq('shopify_variant_id', shopifyVariantId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

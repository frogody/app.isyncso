/**
 * Inventory Queries
 */

import { supabase } from '@/api/supabaseClient';
import type { Inventory, InventoryInsert, InventoryUpdate, ReceivingLog, ReceivingLogInsert, ExpectedDelivery, ExpectedDeliveryInsert } from '../schema';

// =============================================================================
// INVENTORY
// =============================================================================

export async function listInventory(companyId: string): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      products (id, name, sku, ean, price)
    `)
    .eq('company_id', companyId);

  if (error) throw error;
  return data || [];
}

export async function getInventoryByProduct(companyId: string, productId: string): Promise<Inventory | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('company_id', companyId)
    .eq('product_id', productId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateInventory(id: string, updates: InventoryUpdate): Promise<Inventory> {
  const { data, error } = await supabase
    .from('inventory')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLowStockItems(companyId: string): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      products (id, name, sku, ean, price)
    `)
    .eq('company_id', companyId)
    .lt('quantity_on_hand', supabase.rpc('get_reorder_point'))
    .order('quantity_on_hand');

  // Fallback: filter client-side if RPC doesn't work
  if (error) {
    const { data: allData, error: allError } = await supabase
      .from('inventory')
      .select(`
        *,
        products (id, name, sku, ean, price)
      `)
      .eq('company_id', companyId);

    if (allError) throw allError;
    return (allData || []).filter(i => i.quantity_on_hand <= i.reorder_point);
  }

  return data || [];
}

// =============================================================================
// RECEIVING
// =============================================================================

export async function receiveStock(receipt: ReceivingLogInsert): Promise<ReceivingLog> {
  const { data, error } = await supabase
    .from('receiving_log')
    .insert(receipt)
    .select()
    .single();

  if (error) throw error;

  // The trigger will automatically update inventory
  return data;
}

export async function getReceivingHistory(companyId: string, limit = 50): Promise<ReceivingLog[]> {
  const { data, error } = await supabase
    .from('receiving_log')
    .select(`
      *,
      products (id, name, sku, ean),
      expected_deliveries (id, quantity_expected, status)
    `)
    .eq('company_id', companyId)
    .order('received_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// =============================================================================
// EXPECTED DELIVERIES
// =============================================================================

export async function listExpectedDeliveries(companyId: string, status?: string): Promise<ExpectedDelivery[]> {
  let query = supabase
    .from('expected_deliveries')
    .select(`
      *,
      products (id, name, sku, ean),
      suppliers (id, name),
      expenses (id, expense_number, external_reference)
    `)
    .eq('company_id', companyId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('expected_date');

  if (error) throw error;
  return data || [];
}

export async function createExpectedDelivery(delivery: ExpectedDeliveryInsert): Promise<ExpectedDelivery> {
  const { data, error } = await supabase
    .from('expected_deliveries')
    .insert(delivery)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function matchDeliveryByEAN(companyId: string, ean: string): Promise<ExpectedDelivery | null> {
  // Find expected delivery by EAN barcode
  const { data, error } = await supabase
    .from('expected_deliveries')
    .select(`
      *,
      products!inner (id, name, sku, ean),
      suppliers (id, name)
    `)
    .eq('company_id', companyId)
    .eq('products.ean', ean)
    .in('status', ['pending', 'partial'])
    .order('expected_date')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// =============================================================================
// BARCODE SCANNING
// =============================================================================

export interface ScanResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    sku?: string;
    ean: string;
  };
  expectedDelivery?: ExpectedDelivery;
  currentStock?: Inventory;
}

export async function scanBarcode(companyId: string, ean: string): Promise<ScanResult> {
  // 1. Find product by EAN
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, sku, ean')
    .eq('company_id', companyId)
    .eq('ean', ean)
    .single();

  if (productError && productError.code !== 'PGRST116') throw productError;

  if (!product) {
    return { found: false };
  }

  // 2. Find expected delivery
  const expectedDelivery = await matchDeliveryByEAN(companyId, ean);

  // 3. Get current stock
  const currentStock = await getInventoryByProduct(companyId, product.id);

  return {
    found: true,
    product,
    expectedDelivery: expectedDelivery || undefined,
    currentStock: currentStock || undefined,
  };
}

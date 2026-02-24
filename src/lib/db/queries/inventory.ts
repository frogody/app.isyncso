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

export async function listExpectedDeliveries(companyId: string, status?: string | string[]): Promise<ExpectedDelivery[]> {
  let query = supabase
    .from('expected_deliveries')
    .select(`
      *,
      products (id, name, sku, ean),
      suppliers (id, name)
    `)
    .eq('company_id', companyId);

  if (status) {
    if (Array.isArray(status)) {
      // Multiple statuses - use .in()
      query = query.in('status', status);
    } else if (status === 'pending') {
      // When asking for 'pending', also include 'partial' (items still awaiting full delivery)
      query = query.in('status', ['pending', 'partial']);
    } else {
      query = query.eq('status', status);
    }
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

export async function updateExpectedDelivery(
  id: string,
  updates: { quantity_received?: number; status?: 'pending' | 'partial' | 'completed' | 'cancelled' }
): Promise<ExpectedDelivery> {
  const { data, error } = await supabase
    .from('expected_deliveries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getExpectedDeliveryById(id: string): Promise<ExpectedDelivery | null> {
  const { data, error } = await supabase
    .from('expected_deliveries')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
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
  // Normalize barcode - remove any non-digit characters
  const cleanEan = ean.replace(/\D/g, '');

  // Build list of possible EAN variants to try
  // This handles the UPC-A (12 digit) vs EAN-13 (13 digit) discrepancy
  const eanVariants = [cleanEan];

  // If 12 digits (UPC-A), also try with leading zero (EAN-13)
  if (cleanEan.length === 12) {
    eanVariants.push('0' + cleanEan);
  }
  // If 13 digits starting with 0, also try without leading zero (UPC-A)
  if (cleanEan.length === 13 && cleanEan.startsWith('0')) {
    eanVariants.push(cleanEan.substring(1));
  }

  // 1. Find product by EAN in products table (try all variants)
  let product: { id: string; name: string; sku?: string; ean: string } | null = null;

  for (const variant of eanVariants) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, ean')
      .eq('company_id', companyId)
      .eq('ean', variant)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (data) {
      product = data;
      break;
    }
  }

  // 2. If not found in products.ean, try physical_products.barcode
  if (!product) {
    for (const variant of eanVariants) {
      const { data, error } = await supabase
        .from('physical_products')
        .select('product_id, barcode, products!inner(id, name, sku, ean, company_id)')
        .eq('barcode', variant)
        .eq('products.company_id', companyId)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.products) {
        const p = data.products as unknown as { id: string; name: string; sku?: string; ean: string };
        product = {
          id: p.id,
          name: p.name,
          sku: p.sku,
          ean: data.barcode || p.ean,
        };
        break;
      }
    }
  }

  // 3. If not found by EAN or barcode, try matching by SKU (some labels use SKU barcodes)
  if (!product) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, ean')
      .eq('company_id', companyId)
      .eq('sku', cleanEan)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (data) {
      product = data;
    }
  }

  if (!product) {
    return { found: false };
  }

  // 3. Find expected delivery (try all EAN variants)
  let expectedDelivery: ExpectedDelivery | null = null;
  for (const variant of eanVariants) {
    expectedDelivery = await matchDeliveryByEAN(companyId, variant);
    if (expectedDelivery) break;
  }

  // 4. Get current stock
  const currentStock = await getInventoryByProduct(companyId, product.id);

  return {
    found: true,
    product,
    expectedDelivery: expectedDelivery || undefined,
    currentStock: currentStock || undefined,
  };
}

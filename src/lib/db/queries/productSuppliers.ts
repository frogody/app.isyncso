/**
 * Product Suppliers & Stock Purchases Queries
 *
 * Manages the many-to-many relationship between products and suppliers,
 * and tracks purchase history with exact batch pricing for profit/loss calculations.
 */

import { supabase } from '@/api/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export interface ProductSupplier {
  id: string;
  company_id: string;
  product_id: string;
  supplier_id: string;
  supplier_sku?: string;
  supplier_ean?: string;
  last_purchase_price?: number;
  last_purchase_date?: string;
  average_purchase_price?: number;
  is_preferred: boolean;
  is_active: boolean;
  lead_time_days: number;
  min_order_quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  suppliers?: {
    id: string;
    name: string;
    contact?: Record<string, unknown>;
  };
}

export interface ProductSupplierInsert {
  company_id: string;
  product_id: string;
  supplier_id: string;
  supplier_sku?: string;
  supplier_ean?: string;
  is_preferred?: boolean;
  is_active?: boolean;
  lead_time_days?: number;
  min_order_quantity?: number;
  notes?: string;
}

export interface StockPurchase {
  id: string;
  company_id: string;
  product_id?: string;
  supplier_id?: string;
  expense_id?: string;
  expense_line_item_id?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  purchase_date: string;
  received_date?: string;
  invoice_number?: string;
  batch_reference?: string;
  ean?: string;
  source_type: 'invoice' | 'manual' | 'adjustment';
  created_at: string;
  // Joined data
  suppliers?: {
    id: string;
    name: string;
  };
  products?: {
    id: string;
    name: string;
    ean?: string;
  };
}

export interface StockPurchaseInsert {
  company_id: string;
  product_id?: string;
  supplier_id?: string;
  expense_id?: string;
  expense_line_item_id?: string;
  quantity: number;
  unit_price: number;
  currency?: string;
  purchase_date: string;
  received_date?: string;
  invoice_number?: string;
  batch_reference?: string;
  ean?: string;
  source_type?: 'invoice' | 'manual' | 'adjustment';
}

// =============================================================================
// PRODUCT SUPPLIERS
// =============================================================================

/**
 * Get all suppliers for a product with their pricing info
 */
export async function getProductSuppliers(productId: string): Promise<ProductSupplier[]> {
  const { data, error } = await supabase
    .from('product_suppliers')
    .select(`
      *,
      suppliers (id, name, contact)
    `)
    .eq('product_id', productId)
    .order('is_preferred', { ascending: false })
    .order('last_purchase_date', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all products supplied by a specific supplier
 */
export async function getSupplierProducts(supplierId: string): Promise<ProductSupplier[]> {
  const { data, error } = await supabase
    .from('product_suppliers')
    .select(`
      *,
      products (id, name, ean)
    `)
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .order('last_purchase_date', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

/**
 * Add a supplier to a product
 */
export async function addProductSupplier(data: ProductSupplierInsert): Promise<ProductSupplier> {
  const { data: result, error } = await supabase
    .from('product_suppliers')
    .insert(data)
    .select(`
      *,
      suppliers (id, name, contact)
    `)
    .single();

  if (error) throw error;
  return result;
}

/**
 * Update a product-supplier relationship
 */
export async function updateProductSupplier(
  productId: string,
  supplierId: string,
  updates: Partial<ProductSupplierInsert>
): Promise<ProductSupplier> {
  const { data, error } = await supabase
    .from('product_suppliers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('product_id', productId)
    .eq('supplier_id', supplierId)
    .select(`
      *,
      suppliers (id, name, contact)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a supplier from a product
 */
export async function removeProductSupplier(productId: string, supplierId: string): Promise<void> {
  const { error } = await supabase
    .from('product_suppliers')
    .delete()
    .eq('product_id', productId)
    .eq('supplier_id', supplierId);

  if (error) throw error;
}

/**
 * Set a supplier as preferred for a product
 * (Automatically unsets other preferred suppliers via database trigger)
 */
export async function setPreferredSupplier(productId: string, supplierId: string): Promise<void> {
  const { error } = await supabase
    .from('product_suppliers')
    .update({ is_preferred: true, updated_at: new Date().toISOString() })
    .eq('product_id', productId)
    .eq('supplier_id', supplierId);

  if (error) throw error;
}

/**
 * Get the preferred supplier for a product
 */
export async function getPreferredSupplier(productId: string): Promise<ProductSupplier | null> {
  const { data, error } = await supabase
    .from('product_suppliers')
    .select(`
      *,
      suppliers (id, name, contact)
    `)
    .eq('product_id', productId)
    .eq('is_preferred', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// =============================================================================
// STOCK PURCHASES
// =============================================================================

/**
 * Get purchase history for a product
 */
export async function getProductPurchaseHistory(
  productId: string,
  options?: {
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
): Promise<StockPurchase[]> {
  let query = supabase
    .from('stock_purchases')
    .select(`
      *,
      suppliers (id, name)
    `)
    .eq('product_id', productId)
    .order('purchase_date', { ascending: false });

  if (options?.supplierId) {
    query = query.eq('supplier_id', options.supplierId);
  }
  if (options?.dateFrom) {
    query = query.gte('purchase_date', options.dateFrom);
  }
  if (options?.dateTo) {
    query = query.lte('purchase_date', options.dateTo);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get all purchases from a supplier
 */
export async function getSupplierPurchaseHistory(
  supplierId: string,
  options?: {
    productId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
): Promise<StockPurchase[]> {
  let query = supabase
    .from('stock_purchases')
    .select(`
      *,
      products (id, name, ean)
    `)
    .eq('supplier_id', supplierId)
    .order('purchase_date', { ascending: false });

  if (options?.productId) {
    query = query.eq('product_id', options.productId);
  }
  if (options?.dateFrom) {
    query = query.gte('purchase_date', options.dateFrom);
  }
  if (options?.dateTo) {
    query = query.lte('purchase_date', options.dateTo);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Add a manual stock purchase
 */
export async function addStockPurchase(data: StockPurchaseInsert): Promise<StockPurchase> {
  const purchaseData = {
    ...data,
    source_type: data.source_type || 'manual',
  };

  const { data: result, error } = await supabase
    .from('stock_purchases')
    .insert(purchaseData)
    .select(`
      *,
      suppliers (id, name)
    `)
    .single();

  if (error) throw error;
  return result;
}

/**
 * Get price history for a product from a specific supplier
 */
export async function getSupplierPriceHistory(
  productId: string,
  supplierId: string,
  limit: number = 10
): Promise<Array<{ purchase_date: string; unit_price: number; quantity: number }>> {
  const { data, error } = await supabase
    .from('stock_purchases')
    .select('purchase_date, unit_price, quantity')
    .eq('product_id', productId)
    .eq('supplier_id', supplierId)
    .order('purchase_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get recent purchases for a company (dashboard/overview)
 */
export async function getRecentPurchases(
  companyId: string,
  limit: number = 10
): Promise<StockPurchase[]> {
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(`
      *,
      suppliers (id, name),
      products (id, name, ean)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get purchase statistics for a product
 */
export async function getProductPurchaseStats(productId: string): Promise<{
  total_quantity: number;
  total_spent: number;
  average_price: number;
  min_price: number;
  max_price: number;
  supplier_count: number;
} | null> {
  const { data, error } = await supabase
    .rpc('get_product_purchase_stats', { p_product_id: productId });

  if (error) {
    // Function might not exist, calculate manually
    const { data: purchases } = await supabase
      .from('stock_purchases')
      .select('quantity, unit_price, total_amount, supplier_id')
      .eq('product_id', productId);

    if (!purchases || purchases.length === 0) return null;

    const uniqueSuppliers = new Set(purchases.map(p => p.supplier_id).filter(Boolean));
    const prices = purchases.map(p => Number(p.unit_price));
    const totalQty = purchases.reduce((sum, p) => sum + Number(p.quantity), 0);
    const totalSpent = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0);

    return {
      total_quantity: totalQty,
      total_spent: totalSpent,
      average_price: totalSpent / totalQty,
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      supplier_count: uniqueSuppliers.size,
    };
  }

  return data;
}

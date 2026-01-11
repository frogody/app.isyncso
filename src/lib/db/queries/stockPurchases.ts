/**
 * Stock Purchase Queries
 *
 * Queries for managing stock purchases (supplier invoices for inventory)
 * Separated from business expenses (Finance module)
 */

import { supabase } from '@/api/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export interface StockPurchase {
  id: string;
  company_id: string;
  user_id: string;
  supplier_id?: string;

  // Invoice identification
  invoice_number?: string;
  external_reference?: string;
  document_type?: string;
  invoice_date?: string;
  payment_due_date?: string;

  // Document source
  source_type?: string;
  source_email_id?: string;
  original_file_url?: string;

  // Financials
  subtotal?: number;
  tax_percent?: number;
  tax_amount?: number;
  total?: number;
  currency?: string;
  payment_status?: string;

  // AI Processing
  ai_extracted_data?: Record<string, unknown>;
  ai_confidence?: number;
  ai_processed_at?: string;

  // Review workflow
  needs_review?: boolean;
  review_status?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;

  // Status
  status?: string;

  // Finance-compatible fields
  description?: string;
  amount?: number;
  date?: string;
  vendor?: string;
  category?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Relations
  suppliers?: { id: string; name: string; contact?: Record<string, unknown> };
  stock_purchase_line_items?: StockPurchaseLineItem[];
}

export interface StockPurchaseLineItem {
  id: string;
  stock_purchase_id: string;
  product_id?: string;
  line_number?: number;
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  tax_amount?: number;
  line_total?: number;
  sku?: string;
  ean?: string;
  model_number?: string;
  brand?: string;
  is_physical_product?: boolean;
  expected_delivery_id?: string;
  research_status?: string;
  ai_confidence?: Record<string, unknown>;
  created_at?: string;
}

export type StockPurchaseInsert = Omit<StockPurchase, 'id' | 'created_at' | 'updated_at' | 'suppliers' | 'stock_purchase_line_items'>;
export type StockPurchaseUpdate = Partial<StockPurchaseInsert>;
export type StockPurchaseLineItemInsert = Omit<StockPurchaseLineItem, 'id' | 'created_at'>;

// =============================================================================
// STOCK PURCHASES
// =============================================================================

export async function listStockPurchases(
  companyId: string,
  filters?: {
    status?: string;
    needsReview?: boolean;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<StockPurchase[]> {
  let query = supabase
    .from('stock_purchases')
    .select(`
      *,
      suppliers (id, name),
      stock_purchase_line_items (
        id, description, quantity, unit_price, line_total, ean
      )
    `)
    .eq('company_id', companyId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.needsReview !== undefined) {
    query = query.eq('needs_review', filters.needsReview);
  }
  if (filters?.supplierId) {
    query = query.eq('supplier_id', filters.supplierId);
  }
  if (filters?.dateFrom) {
    query = query.gte('invoice_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('invoice_date', filters.dateTo);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStockPurchase(id: string): Promise<StockPurchase | null> {
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(`
      *,
      suppliers (id, name, contact),
      stock_purchase_line_items (
        id, line_number, description, quantity, unit, unit_price, discount_percent,
        discount_amount, tax_percent, tax_amount, line_total, sku, ean,
        model_number, brand, is_physical_product, expected_delivery_id,
        research_status, ai_confidence
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createStockPurchase(purchase: StockPurchaseInsert): Promise<StockPurchase> {
  const { data, error } = await supabase
    .from('stock_purchases')
    .insert(purchase)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStockPurchase(id: string, updates: StockPurchaseUpdate): Promise<StockPurchase> {
  const { data, error } = await supabase
    .from('stock_purchases')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStockPurchase(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_purchases')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function approveStockPurchase(id: string, userId: string, notes?: string): Promise<StockPurchase> {
  return updateStockPurchase(id, {
    review_status: 'approved',
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    review_notes: notes,
    needs_review: false,
    status: 'approved',
  });
}

export async function rejectStockPurchase(id: string, userId: string, notes: string): Promise<StockPurchase> {
  return updateStockPurchase(id, {
    review_status: 'rejected',
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    review_notes: notes,
    needs_review: false,
    status: 'archived',
  });
}

// =============================================================================
// STOCK PURCHASE LINE ITEMS
// =============================================================================

export async function createStockPurchaseLineItems(items: StockPurchaseLineItemInsert[]): Promise<StockPurchaseLineItem[]> {
  const { data, error } = await supabase
    .from('stock_purchase_line_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateStockPurchaseLineItem(id: string, updates: Partial<StockPurchaseLineItemInsert>): Promise<StockPurchaseLineItem> {
  const { data, error } = await supabase
    .from('stock_purchase_line_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// REVIEW QUEUE
// =============================================================================

export async function getStockPurchaseReviewQueue(companyId: string): Promise<StockPurchase[]> {
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(`
      *,
      suppliers (id, name),
      stock_purchase_line_items (
        id, description, quantity, unit_price, line_total, ai_confidence
      )
    `)
    .eq('company_id', companyId)
    .eq('needs_review', true)
    .eq('review_status', 'pending')
    .order('created_at');

  if (error) throw error;
  return data || [];
}

// =============================================================================
// AI PROCESSING
// =============================================================================

export interface AIExtractionResult {
  supplier_name?: string;
  external_reference?: string;
  invoice_date?: string;
  subtotal?: number;
  tax_amount?: number;
  total?: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    ean?: string;
    confidence: Record<string, number>;
  }>;
  overall_confidence: number;
}

export async function saveAIExtraction(
  stockPurchaseId: string,
  extraction: AIExtractionResult
): Promise<StockPurchase> {
  const needsReview = extraction.overall_confidence < 0.95;

  return updateStockPurchase(stockPurchaseId, {
    ai_extracted_data: extraction as unknown as Record<string, unknown>,
    ai_confidence: extraction.overall_confidence,
    ai_processed_at: new Date().toISOString(),
    needs_review: needsReview,
    status: needsReview ? 'pending_review' : 'approved',
    external_reference: extraction.external_reference,
    invoice_date: extraction.invoice_date,
    subtotal: extraction.subtotal || 0,
    tax_amount: extraction.tax_amount || 0,
    total: extraction.total || 0,
  });
}

// =============================================================================
// STATISTICS
// =============================================================================

export async function getStockPurchaseStats(companyId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  needsReview: number;
  totalValue: number;
}> {
  const { data, error } = await supabase
    .from('stock_purchases')
    .select('id, status, needs_review, total')
    .eq('company_id', companyId);

  if (error) throw error;

  const purchases = data || [];
  return {
    total: purchases.length,
    pending: purchases.filter(p => p.status === 'pending' || p.status === 'processing').length,
    approved: purchases.filter(p => p.status === 'approved').length,
    needsReview: purchases.filter(p => p.needs_review).length,
    totalValue: purchases.reduce((sum, p) => sum + (p.total || 0), 0),
  };
}

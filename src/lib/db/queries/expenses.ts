/**
 * Expense Queries
 */

import { supabase } from '@/api/supabaseClient';
import type { Expense, ExpenseInsert, ExpenseUpdate, ExpenseLineItem, ExpenseLineItemInsert } from '../schema';

// =============================================================================
// EXPENSES
// =============================================================================

export async function listExpenses(
  companyId: string,
  filters?: {
    status?: string;
    needsReview?: boolean;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      suppliers (id, name),
      expense_line_items (
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

export async function getExpense(id: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      suppliers (id, name, contact),
      expense_line_items (
        id, description, quantity, unit, unit_price, discount_percent,
        discount_amount, tax_percent, tax_amount, line_total, sku, ean,
        is_physical_product, expected_delivery_id, ai_confidence, line_number
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createExpense(expense: ExpenseInsert): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, updates: ExpenseUpdate): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveExpense(id: string, userId: string, notes?: string): Promise<Expense> {
  return updateExpense(id, {
    review_status: 'approved',
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    review_notes: notes,
    needs_review: false,
    status: 'approved',
  });
}

export async function rejectExpense(id: string, userId: string, notes: string): Promise<Expense> {
  return updateExpense(id, {
    review_status: 'rejected',
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    review_notes: notes,
    needs_review: false,
    status: 'archived',
  });
}

// =============================================================================
// EXPENSE LINE ITEMS
// =============================================================================

export async function createExpenseLineItems(items: ExpenseLineItemInsert[]): Promise<ExpenseLineItem[]> {
  const { data, error } = await supabase
    .from('expense_line_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateExpenseLineItem(id: string, updates: Partial<ExpenseLineItemInsert>): Promise<ExpenseLineItem> {
  const { data, error } = await supabase
    .from('expense_line_items')
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

export async function getReviewQueue(companyId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      suppliers (id, name),
      expense_line_items (
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
  expenseId: string,
  extraction: AIExtractionResult
): Promise<Expense> {
  const needsReview = extraction.overall_confidence < 0.95;

  return updateExpense(expenseId, {
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

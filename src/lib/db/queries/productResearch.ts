/**
 * Product Research Queue Queries
 *
 * Manages the product research queue for automatic product creation from invoices.
 */

import { supabase } from '@/api/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export interface ProductResearchQueueItem {
  id: string;
  company_id: string;
  expense_id?: string;
  expense_line_item_id?: string;
  product_description: string;
  model_number?: string;
  supplier_name?: string;
  supplier_id?: string;
  extracted_ean?: string;
  quantity?: number;
  unit_price?: number;
  currency: string;
  purchase_date?: string;
  invoice_number?: string;
  status: 'pending' | 'researching' | 'completed' | 'failed' | 'manual_review';
  research_attempts: number;
  last_research_at?: string;
  error_message?: string;
  researched_ean?: string;
  researched_name?: string;
  researched_description?: string;
  researched_brand?: string;
  researched_category?: string;
  researched_images?: string[];
  researched_specifications?: Array<{ name: string; value: string }>;
  researched_weight?: number;
  researched_dimensions?: { length?: number; width?: number; height?: number };
  researched_source_url?: string;
  research_confidence?: number;
  matched_product_id?: string;
  created_product_id?: string;
  action_taken?: 'matched_existing' | 'created_new' | 'skipped' | 'manual';
  created_at: string;
  updated_at: string;
  // Joined data
  expenses?: {
    id: string;
    external_reference?: string;
    invoice_date?: string;
  };
  suppliers?: {
    id: string;
    name: string;
  };
  products?: {
    id: string;
    name: string;
    slug: string;
  };
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all research queue items for an expense
 */
export async function getExpenseResearchQueue(expenseId: string): Promise<ProductResearchQueueItem[]> {
  const { data, error } = await supabase
    .from('product_research_queue')
    .select(`
      *,
      suppliers (id, name),
      matched_product:products!matched_product_id (id, name, slug),
      created_product:products!created_product_id (id, name, slug)
    `)
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get pending research items for a company
 */
export async function getPendingResearchItems(companyId: string, limit: number = 50): Promise<ProductResearchQueueItem[]> {
  const { data, error } = await supabase
    .from('product_research_queue')
    .select(`
      *,
      suppliers (id, name),
      expenses (id, external_reference, invoice_date)
    `)
    .eq('company_id', companyId)
    .in('status', ['pending', 'researching'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get items needing manual review
 */
export async function getManualReviewItems(companyId: string, limit: number = 50): Promise<ProductResearchQueueItem[]> {
  const { data, error } = await supabase
    .from('product_research_queue')
    .select(`
      *,
      suppliers (id, name),
      expenses (id, external_reference, invoice_date)
    `)
    .eq('company_id', companyId)
    .eq('status', 'manual_review')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get research queue statistics for a company
 */
export async function getResearchQueueStats(companyId: string): Promise<{
  pending: number;
  researching: number;
  completed: number;
  failed: number;
  manual_review: number;
}> {
  const { data, error } = await supabase
    .from('product_research_queue')
    .select('status')
    .eq('company_id', companyId);

  if (error) throw error;

  const stats = {
    pending: 0,
    researching: 0,
    completed: 0,
    failed: 0,
    manual_review: 0,
  };

  (data || []).forEach(item => {
    if (item.status in stats) {
      stats[item.status as keyof typeof stats]++;
    }
  });

  return stats;
}

/**
 * Retry a failed research item
 */
export async function retryResearchItem(queueId: string): Promise<void> {
  const { error } = await supabase
    .from('product_research_queue')
    .update({
      status: 'pending',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId);

  if (error) throw error;

  // Trigger research function
  await triggerResearch([queueId]);
}

/**
 * Manually approve a research result and create/match product
 */
export async function approveResearchResult(
  queueId: string,
  updates?: {
    ean?: string;
    name?: string;
    description?: string;
    brand?: string;
    category?: string;
  }
): Promise<{ success: boolean; productId?: string; action?: string }> {
  // Get the queue item
  const { data: queueItem, error: fetchError } = await supabase
    .from('product_research_queue')
    .select('*')
    .eq('id', queueId)
    .single();

  if (fetchError) throw fetchError;

  // Merge updates with existing researched data
  const finalData = {
    p_queue_id: queueId,
    p_ean: updates?.ean ?? queueItem.researched_ean,
    p_name: updates?.name ?? queueItem.researched_name,
    p_description: updates?.description ?? queueItem.researched_description,
    p_brand: updates?.brand ?? queueItem.researched_brand,
    p_category: updates?.category ?? queueItem.researched_category,
    p_images: queueItem.researched_images || [],
    p_specifications: queueItem.researched_specifications || [],
    p_weight: queueItem.researched_weight,
    p_dimensions: queueItem.researched_dimensions,
    p_source_url: queueItem.researched_source_url,
    p_confidence: 1.0, // Manual approval = high confidence
  };

  const { data, error } = await supabase.rpc('process_research_result', finalData);

  if (error) throw error;
  return data;
}

/**
 * Skip a research item (don't create product)
 */
export async function skipResearchItem(queueId: string): Promise<void> {
  const { error } = await supabase
    .from('product_research_queue')
    .update({
      status: 'completed',
      action_taken: 'skipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId);

  if (error) throw error;
}

/**
 * Trigger research for specific queue items
 */
export async function triggerResearch(queueIds: string[]): Promise<void> {
  // Get queue items with their details
  const { data: queueItems, error: fetchError } = await supabase
    .from('product_research_queue')
    .select('id, product_description, model_number, supplier_name, extracted_ean')
    .in('id', queueIds);

  if (fetchError) throw fetchError;
  if (!queueItems || queueItems.length === 0) return;

  const researchItems = queueItems.map(q => ({
    queueId: q.id,
    productDescription: q.product_description,
    modelNumber: q.model_number,
    supplierName: q.supplier_name,
    extractedEan: q.extracted_ean,
  }));

  // Call the research function
  const { error } = await supabase.functions.invoke('research-product', {
    body: { items: researchItems },
  });

  if (error) {
    console.error('Failed to trigger research:', error);
    throw error;
  }
}

/**
 * Get recent research activity
 */
export async function getRecentResearchActivity(
  companyId: string,
  limit: number = 20
): Promise<ProductResearchQueueItem[]> {
  const { data, error } = await supabase
    .from('product_research_queue')
    .select(`
      *,
      suppliers (id, name),
      matched_product:products!matched_product_id (id, name, slug),
      created_product:products!created_product_id (id, name, slug)
    `)
    .eq('company_id', companyId)
    .in('status', ['completed', 'failed'])
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

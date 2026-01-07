/**
 * Sales Order Queries
 */

import { supabase } from '@/api/supabaseClient';
import type {
  SalesOrder,
  SalesOrderInsert,
  SalesOrderUpdate,
  SalesOrderItem,
  SalesOrderItemInsert,
  ShippingTask,
  ShippingTaskInsert,
  ShippingTaskUpdate,
  Customer
} from '../schema';
import { DEFAULT_PAYMENT_DAYS_AFTER_DELIVERY } from '../schema';

// =============================================================================
// SALES ORDERS
// =============================================================================

export async function listSalesOrders(
  companyId: string,
  filters?: {
    status?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<SalesOrder[]> {
  let query = supabase
    .from('sales_orders')
    .select(`
      *,
      customers (id, name, email, payment_days_after_delivery, tracking_alert_days),
      sales_order_items (
        id, description, quantity, unit_price, line_total,
        products (id, name, sku, ean)
      ),
      shipping_tasks (id, task_number, status, track_trace_code, carrier)
    `)
    .eq('company_id', companyId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  if (filters?.dateFrom) {
    query = query.gte('order_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('order_date', filters.dateTo);
  }

  const { data, error } = await query.order('order_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSalesOrder(id: string): Promise<SalesOrder | null> {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      *,
      customers (id, name, email, phone, payment_days_after_delivery, tracking_alert_days),
      sales_order_items (
        id, description, quantity, quantity_reserved, quantity_shipped,
        unit_price, discount_percent, discount_amount, tax_percent, tax_amount, line_total,
        sku, ean, line_number,
        products (id, name, sku, ean, price)
      ),
      shipping_tasks (
        id, task_number, status, carrier, service_type, track_trace_code, tracking_url,
        shipped_at, delivered_at, tracking_job_id
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createSalesOrder(order: SalesOrderInsert): Promise<SalesOrder> {
  const { data, error } = await supabase
    .from('sales_orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSalesOrder(id: string, updates: SalesOrderUpdate): Promise<SalesOrder> {
  const { data, error } = await supabase
    .from('sales_orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Confirm an order and reserve stock
 * The database trigger will handle the inventory reservation
 */
export async function confirmSalesOrder(id: string): Promise<SalesOrder> {
  return updateSalesOrder(id, { status: 'confirmed' });
}

/**
 * Calculate payment due date based on customer settings
 */
export function calculatePaymentDueDate(
  deliveredAt: Date,
  customer?: Customer
): Date {
  const paymentDays = customer?.payment_days_after_delivery || DEFAULT_PAYMENT_DAYS_AFTER_DELIVERY;
  const dueDate = new Date(deliveredAt);
  dueDate.setDate(dueDate.getDate() + paymentDays);
  return dueDate;
}

// =============================================================================
// SALES ORDER ITEMS
// =============================================================================

export async function createSalesOrderItems(items: SalesOrderItemInsert[]): Promise<SalesOrderItem[]> {
  const { data, error } = await supabase
    .from('sales_order_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateSalesOrderItem(id: string, updates: Partial<SalesOrderItemInsert>): Promise<SalesOrderItem> {
  const { data, error } = await supabase
    .from('sales_order_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// SHIPPING TASKS
// =============================================================================

export async function listShippingTasks(
  companyId: string,
  filters?: { status?: string }
): Promise<ShippingTask[]> {
  let query = supabase
    .from('shipping_tasks')
    .select(`
      *,
      sales_orders (
        id, order_number, customer_id,
        customers (id, name, email)
      )
    `)
    .eq('company_id', companyId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getShippingTask(id: string): Promise<ShippingTask | null> {
  const { data, error } = await supabase
    .from('shipping_tasks')
    .select(`
      *,
      sales_orders (
        id, order_number, customer_id,
        shipping_name, shipping_address_line1, shipping_address_line2,
        shipping_city, shipping_postal_code, shipping_country,
        customers (id, name, email, phone, tracking_alert_days)
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createShippingTask(task: ShippingTaskInsert): Promise<ShippingTask> {
  const { data, error } = await supabase
    .from('shipping_tasks')
    .insert(task)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShippingTask(id: string, updates: ShippingTaskUpdate): Promise<ShippingTask> {
  const { data, error } = await supabase
    .from('shipping_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete shipping - REQUIRES track_trace_code
 * This is the gate that prevents shipping without tracking
 */
export async function completeShipping(
  taskId: string,
  trackTraceCode: string,
  carrier?: string,
  userId?: string
): Promise<ShippingTask> {
  // CRITICAL: Track & trace is REQUIRED
  if (!trackTraceCode?.trim()) {
    throw new Error('Track & trace code is verplicht om te kunnen verzenden');
  }

  const now = new Date().toISOString();

  const task = await updateShippingTask(taskId, {
    track_trace_code: trackTraceCode.trim(),
    carrier,
    status: 'shipped',
    shipped_at: now,
    shipped_by: userId,
  });

  // Update the sales order as well
  if (task.sales_order_id) {
    await updateSalesOrder(task.sales_order_id, {
      status: 'shipped',
      shipped_at: now,
    });
  }

  return task;
}

// =============================================================================
// PENDING SHIPMENTS
// =============================================================================

export async function getPendingShipments(companyId: string): Promise<ShippingTask[]> {
  const { data, error } = await supabase
    .from('shipping_tasks')
    .select(`
      *,
      sales_orders (
        id, order_number, customer_id, total,
        customers (id, name)
      )
    `)
    .eq('company_id', companyId)
    .in('status', ['pending', 'ready_to_ship'])
    .order('ship_by_date');

  if (error) throw error;
  return data || [];
}

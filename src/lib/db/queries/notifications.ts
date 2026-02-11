/**
 * Notification Queries
 */

import { supabase } from '@/api/supabaseClient';
import type {
  Notification,
  NotificationInsert,
  NotificationUpdate,
  NotificationType,
  NotificationSeverity
} from '../schema';

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export async function listNotifications(
  companyId: string,
  filters?: {
    status?: string;
    type?: NotificationType;
    severity?: NotificationSeverity;
    assignedTo?: string;
    unreadOnly?: boolean;
  }
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('company_id', companyId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters?.unreadOnly) {
    query = query.eq('status', 'unread');
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getNotification(id: string): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createNotification(notification: NotificationInsert): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNotification(id: string, updates: NotificationUpdate): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// STATUS UPDATES
// =============================================================================

export async function markAsRead(id: string): Promise<Notification> {
  return updateNotification(id, {
    status: 'read',
    read_at: new Date().toISOString(),
  });
}

export async function markAsAcknowledged(id: string): Promise<Notification> {
  return updateNotification(id, {
    status: 'acknowledged',
    acknowledged_at: new Date().toISOString(),
  });
}

export async function resolveNotification(
  id: string,
  userId: string,
  notes?: string
): Promise<Notification> {
  return updateNotification(id, {
    status: 'resolved',
    resolved_at: new Date().toISOString(),
    resolved_by: userId,
    resolution_notes: notes,
  });
}

export async function dismissNotification(id: string): Promise<Notification> {
  return updateNotification(id, {
    status: 'dismissed',
  });
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

export async function markAllAsRead(companyId: string, userId?: string): Promise<void> {
  let query = supabase
    .from('notifications')
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)
    .eq('status', 'unread');

  if (userId) {
    query = query.eq('assigned_to', userId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function getUnreadCount(companyId: string, userId?: string): Promise<number> {
  let query = supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'unread');

  if (userId) {
    query = query.eq('assigned_to', userId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

// =============================================================================
// NOTIFICATION CREATORS
// =============================================================================

/**
 * Create a low confidence notification for expense review
 */
export async function createLowConfidenceNotification(
  companyId: string,
  expenseId: string,
  confidence: number,
  supplierName?: string
): Promise<Notification> {
  return createNotification({
    company_id: companyId,
    type: 'low_confidence',
    severity: confidence < 0.7 ? 'high' : 'medium',
    expense_id: expenseId,
    title: 'Invoice has low confidence',
    message: `AI extraction of ${supplierName || 'an invoice'} has a confidence of ${Math.round(confidence * 100)}%. Manual review required.`,
    action_required: 'Review and approve extracted data',
    action_url: `/expenses/${expenseId}`,
    context_data: { confidence, supplier_name: supplierName },
    status: 'unread',
  });
}

/**
 * Create a delivery overdue notification
 */
export async function createDeliveryOverdueNotification(
  companyId: string,
  trackingJobId: string,
  shippingTaskId: string,
  orderNumber: string,
  customerName: string,
  daysSinceShipped: number
): Promise<Notification> {
  return createNotification({
    company_id: companyId,
    type: 'delivery_overdue',
    severity: daysSinceShipped > 21 ? 'critical' : 'high',
    tracking_job_id: trackingJobId,
    shipping_task_id: shippingTaskId,
    title: `Delivery in transit for ${daysSinceShipped} days`,
    message: `Order ${orderNumber} for ${customerName} has been in transit for ${daysSinceShipped} days without confirmed delivery.`,
    action_required: 'Check tracking status and contact customer if needed',
    action_url: `/shipping/${shippingTaskId}`,
    context_data: { days_since_shipped: daysSinceShipped, order_number: orderNumber, customer_name: customerName },
    status: 'unread',
  });
}

/**
 * Create a partial delivery notification
 */
export async function createPartialDeliveryNotification(
  companyId: string,
  expectedDeliveryId: string,
  productName: string,
  expectedQty: number,
  receivedQty: number
): Promise<Notification> {
  return createNotification({
    company_id: companyId,
    type: 'partial_delivery',
    severity: 'medium',
    product_id: undefined, // Can be added if needed
    title: 'Partial delivery received',
    message: `${productName}: ${receivedQty} of ${expectedQty} items received.`,
    action_required: 'Check if remaining items are still being delivered',
    action_url: `/receiving?delivery=${expectedDeliveryId}`,
    context_data: { expected_qty: expectedQty, received_qty: receivedQty, product_name: productName },
    status: 'unread',
  });
}

/**
 * Create a stock alert notification
 */
export async function createStockAlertNotification(
  companyId: string,
  productId: string,
  productName: string,
  currentStock: number,
  reorderPoint: number
): Promise<Notification> {
  const isCritical = currentStock === 0;

  return createNotification({
    company_id: companyId,
    type: 'stock_alert',
    severity: isCritical ? 'critical' : 'high',
    product_id: productId,
    title: isCritical ? 'Product out of stock' : 'Low stock alert',
    message: isCritical
      ? `${productName} is sold out! Immediate action required.`
      : `${productName} has ${currentStock} items in stock (below reorder point of ${reorderPoint}).`,
    action_required: 'Order new stock from supplier',
    action_url: `/inventory?product=${productId}`,
    context_data: { current_stock: currentStock, reorder_point: reorderPoint, product_name: productName },
    status: 'unread',
  });
}

/**
 * Create a payment overdue notification
 */
export async function createPaymentOverdueNotification(
  companyId: string,
  salesOrderId: string,
  customerId: string,
  orderNumber: string,
  customerName: string,
  dueDate: string,
  amount: number,
  currency: string
): Promise<Notification> {
  const now = new Date();
  const due = new Date(dueDate);
  const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  return createNotification({
    company_id: companyId,
    type: 'payment_overdue',
    severity: daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium',
    sales_order_id: salesOrderId,
    customer_id: customerId,
    title: `Payment ${daysOverdue} days overdue`,
    message: `Order ${orderNumber} from ${customerName}: ${currency} ${amount.toFixed(2)} is ${daysOverdue} days past due date.`,
    action_required: 'Send reminder to customer',
    action_url: `/orders/${salesOrderId}`,
    context_data: {
      days_overdue: daysOverdue,
      due_date: dueDate,
      amount,
      currency,
      order_number: orderNumber,
      customer_name: customerName
    },
    status: 'unread',
  });
}

/**
 * Create a receiving session closed notification
 */
export async function createReceivingSessionNotification(
  companyId: string,
  sessionId: string,
  sessionName: string,
  closedByName: string,
  totalItems: number,
  totalEans: number
): Promise<Notification> {
  return createNotification({
    company_id: companyId,
    type: 'receiving_session_closed',
    severity: 'low',
    title: `Receiving session closed: ${sessionName}`,
    message: `${closedByName} completed a receiving session. ${totalItems} ${totalItems === 1 ? 'item' : 'items'} received across ${totalEans} ${totalEans === 1 ? 'product' : 'products'}.`,
    action_url: `/inventoryreceiving?session=${sessionId}`,
    context_data: { session_id: sessionId, total_items: totalItems, total_eans: totalEans },
    status: 'unread',
  });
}

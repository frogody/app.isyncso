// ---------------------------------------------------------------------------
// processB2BOrder.ts -- Order lifecycle automation for B2B wholesale.
//
// Three entry points:
//   processOrderPlaced    → reserve inventory, notify, email
//   processOrderConfirmed → create invoice, create shipping task, notify, email
//   processOrderShipped   → update order, update shipping task, email
//
// All functions are non-blocking: errors are caught so the primary action
// (order creation / approval / ship) always succeeds even if automation
// partially fails.
// ---------------------------------------------------------------------------

import { supabase } from '@/api/supabaseClient';
import { getB2BOrder, reserveB2BInventory } from '@/lib/db/queries/b2b';
import { createShippingTask, updateShippingTask } from '@/lib/db/queries/sales-orders';
import { createNotification } from '@/lib/db/queries/notifications';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(val || 0);
}

async function callWebhook(event: string, orderId: string, organizationId: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/b2b-order-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ event, orderId, organizationId }),
    });
    if (!res.ok) {
      console.warn(`[processB2BOrder] Webhook ${event} returned ${res.status}`);
    }
    return res;
  } catch (err) {
    console.warn(`[processB2BOrder] Webhook ${event} failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// processOrderPlaced
// ---------------------------------------------------------------------------

export async function processOrderPlaced(orderId: string, organizationId: string) {
  const order = await getB2BOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  const items = (order as any).b2b_order_items || [];
  const client = (order as any).portal_clients || {};
  const errors: string[] = [];

  // 1. Reserve inventory per item
  for (const item of items) {
    if (!item.product_id) continue;
    try {
      await reserveB2BInventory(
        item.product_id,
        organizationId,
        item.quantity || 1,
      );
    } catch (err: any) {
      console.warn(`[processOrderPlaced] Inventory reservation failed for ${item.product_id}:`, err?.message);
      errors.push(`Inventory: ${item.product_name || item.product_id} - ${err?.message}`);
    }
  }

  // 2. (Invoice creation moved to processOrderConfirmed — merchant must confirm first)

  // 3. Create merchant notification
  try {
    const orderNum = (order as any).order_number || `#${orderId.slice(0, 8)}`;
    const itemCount = items.length;
    await createNotification({
      company_id: organizationId,
      type: 'b2b_order',
      severity: 'medium',
      title: `New B2B Order ${orderNum}`,
      message: `Order from ${client.company_name || client.full_name || 'client'} — ${formatCurrency(Number(order.total) || 0)}, ${itemCount} item${itemCount !== 1 ? 's' : ''}`,
      action_url: `/b2b/orders/${orderId}`,
      context_data: { orderId, orderNumber: orderNum, clientName: client.full_name },
      status: 'unread',
    });
  } catch (err: any) {
    console.warn('[processOrderPlaced] Notification creation failed:', err?.message);
    errors.push(`Notification: ${err?.message}`);
  }

  // 4. Trigger webhook email
  await callWebhook('order_created', orderId, organizationId);

  if (errors.length > 0) {
    console.warn('[processOrderPlaced] Completed with partial errors:', errors);
  }

  return { success: true, errors };
}

// ---------------------------------------------------------------------------
// processOrderConfirmed
// ---------------------------------------------------------------------------

export async function processOrderConfirmed(
  orderId: string,
  organizationId: string,
  userId?: string,
  companyId?: string,
) {
  const order = await getB2BOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  const items = (order as any).b2b_order_items || [];
  const client = (order as any).portal_clients || {};
  const errors: string[] = [];

  // 1. Create invoice
  try {
    const subtotal = Number(order.subtotal) || 0;
    const taxAmount = Number(order.tax_amount) || 0;
    const total = Number(order.total) || 0;
    const paymentDays = (order as any).payment_terms_days || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentDays);

    const lineItems = items.map((it: any) => ({
      name: it.product_name || 'Product',
      quantity: it.quantity || 1,
      unit_price: Number(it.unit_price) || 0,
      total: Number(it.line_total) || (Number(it.unit_price) || 0) * (it.quantity || 1),
    }));

    const { error: invErr } = await supabase.from('invoices').insert({
      company_id: companyId || organizationId,
      user_id: userId || null,
      invoice_type: 'customer',
      b2b_order_id: orderId,
      client_name: client.company_name || client.full_name || 'B2B Client',
      client_email: client.email || '',
      client_address: order.billing_address || null,
      items: lineItems,
      subtotal,
      tax_rate: 21,
      tax_amount: taxAmount,
      total,
      status: 'pending',
      due_date: dueDate.toISOString().split('T')[0],
      notes: `Auto-generated from B2B order ${(order as any).order_number || orderId.slice(0, 8)}`,
    });

    if (invErr) {
      console.warn('[processOrderConfirmed] Invoice creation failed:', invErr.message);
      errors.push(`Invoice: ${invErr.message}`);
    } else {
      console.log('[processOrderConfirmed] Invoice created for order', (order as any).order_number);
    }
  } catch (err: any) {
    console.warn('[processOrderConfirmed] Invoice creation error:', err?.message);
    errors.push(`Invoice: ${err?.message}`);
  }

  // 2. Create shipping task
  try {
    await createShippingTask({
      company_id: organizationId,
      b2b_order_id: orderId,
      sales_order_id: null,
      status: 'pending',
      priority: 'normal',
      package_count: 1,
      shipping_notes: (order as any).client_notes || null,
    });
  } catch (err: any) {
    console.warn('[processOrderConfirmed] Shipping task creation failed:', err?.message);
    errors.push(`ShippingTask: ${err?.message}`);
  }

  // 3. Notification
  try {
    const orderNum = (order as any).order_number || `#${orderId.slice(0, 8)}`;
    await createNotification({
      company_id: organizationId,
      type: 'b2b_order',
      severity: 'low',
      title: `Order ${orderNum} Confirmed`,
      message: `Order for ${client.company_name || client.full_name || 'client'} is confirmed — ready for fulfillment`,
      action_url: `/b2b/orders/${orderId}`,
      context_data: { orderId, orderNumber: orderNum, event: 'confirmed' },
      status: 'unread',
    });
  } catch (err: any) {
    console.warn('[processOrderConfirmed] Notification failed:', err?.message);
    errors.push(`Notification: ${err?.message}`);
  }

  // 4. Webhook email (sends invoice confirmation to client)
  await callWebhook('order_confirmed', orderId, organizationId);

  if (errors.length > 0) {
    console.warn('[processOrderConfirmed] Completed with partial errors:', errors);
  }

  return { success: true, errors };
}

// ---------------------------------------------------------------------------
// processOrderShipped
// ---------------------------------------------------------------------------

export async function processOrderShipped(
  orderId: string,
  organizationId: string,
  trackingCode: string,
  carrier?: string,
  userId?: string,
) {
  const now = new Date().toISOString();
  const errors: string[] = [];

  // 1. Update order status + shipped_at + tracking
  try {
    const { error: orderErr } = await supabase
      .from('b2b_orders')
      .update({
        status: 'shipped',
        shipped_at: now,
        tracking_number: trackingCode,
        tracking_url: null,
        updated_at: now,
      })
      .eq('id', orderId);

    if (orderErr) throw orderErr;
  } catch (err: any) {
    console.warn('[processOrderShipped] Order status update failed:', err?.message);
    errors.push(`OrderUpdate: ${err?.message}`);
  }

  // 2. Update shipping task if it exists
  try {
    const { data: tasks } = await supabase
      .from('shipping_tasks')
      .select('id')
      .eq('b2b_order_id', orderId)
      .limit(1);

    if (tasks && tasks.length > 0) {
      await updateShippingTask(tasks[0].id, {
        track_trace_code: trackingCode,
        carrier: carrier || null,
        status: 'shipped',
        shipped_at: now,
        shipped_by: userId || null,
      });
    }
  } catch (err: any) {
    console.warn('[processOrderShipped] Shipping task update failed:', err?.message);
    errors.push(`ShippingTask: ${err?.message}`);
  }

  // 3. Notification
  try {
    const { data: order } = await supabase
      .from('b2b_orders')
      .select('order_number')
      .eq('id', orderId)
      .single();

    const orderNum = order?.order_number || `#${orderId.slice(0, 8)}`;
    await createNotification({
      company_id: organizationId,
      type: 'b2b_order',
      severity: 'low',
      title: `Order ${orderNum} Shipped`,
      message: `Tracking: ${trackingCode}${carrier ? ` (${carrier})` : ''}`,
      action_url: `/b2b/orders/${orderId}`,
      context_data: { orderId, orderNumber: orderNum, event: 'shipped', trackingCode, carrier },
      status: 'unread',
    });
  } catch (err: any) {
    console.warn('[processOrderShipped] Notification failed:', err?.message);
    errors.push(`Notification: ${err?.message}`);
  }

  // 4. Webhook email
  await callWebhook('order_shipped', orderId, organizationId);

  // 5. Add order note
  try {
    await supabase.from('b2b_order_notes').insert({
      order_id: orderId,
      content: `Order shipped — tracking: ${trackingCode}${carrier ? ` via ${carrier}` : ''}`,
      author_name: 'System',
      note_type: 'shipping',
    });
  } catch (_) {}

  if (errors.length > 0) {
    console.warn('[processOrderShipped] Completed with partial errors:', errors);
  }

  return { success: true, errors };
}

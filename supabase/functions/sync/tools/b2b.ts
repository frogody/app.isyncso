/**
 * B2B Wholesale Store Tool Functions for SYNC
 *
 * Actions:
 * - b2b_list_orders
 * - b2b_get_order
 * - b2b_update_order_status
 * - b2b_get_store_stats
 * - b2b_list_clients
 * - b2b_get_client
 * - b2b_list_price_lists
 * - b2b_update_price_list
 * - b2b_list_inquiries
 * - b2b_respond_inquiry
 * - b2b_send_order_message
 * - b2b_create_announcement
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { ActionResult, ActionContext } from './types.ts';
import { successResult, errorResult, formatCurrency } from '../utils/helpers.ts';

// ============================================================================
// List B2B Orders
// ============================================================================

async function listOrders(
  ctx: ActionContext,
  data: { status?: string; clientId?: string; limit?: number }
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('b2b_orders')
      .select('*, b2b_order_items(*), portal_clients(full_name, company_name)')
      .eq('company_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(data.limit || 20);

    if (data.status) {
      query = query.eq('status', data.status);
    }
    if (data.clientId) {
      query = query.eq('client_id', data.clientId);
    }

    const { data: orders, error } = await query;

    if (error) {
      return errorResult(`Failed to list B2B orders: ${error.message}`, error.message);
    }

    if (!orders || orders.length === 0) {
      return successResult('No B2B orders found matching your criteria.', []);
    }

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const pendingNote = pendingCount > 0 ? ` ${pendingCount} pending.` : '';

    return successResult(
      `${orders.length} B2B orders.${pendingNote}`,
      orders,
      '/b2b/orders'
    );
  } catch (err) {
    return errorResult(`Exception listing B2B orders: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get B2B Order
// ============================================================================

async function getOrder(
  ctx: ActionContext,
  data: { orderId: string }
): Promise<ActionResult> {
  try {
    if (!data.orderId) {
      return errorResult('Order ID is required', 'Missing orderId');
    }

    const { data: order, error } = await ctx.supabase
      .from('b2b_orders')
      .select('*, b2b_order_items(*), portal_clients(full_name, company_name, email)')
      .eq('id', data.orderId)
      .eq('company_id', ctx.companyId)
      .single();

    if (error || !order) {
      return errorResult('B2B order not found', 'Not found');
    }

    const clientName = (order as any).portal_clients?.company_name || (order as any).portal_clients?.full_name || 'Unknown';
    const itemCount = (order as any).b2b_order_items?.length || 0;

    return successResult(
      `**Order ${order.id}**\n- Client: ${clientName}\n- Status: ${order.status}\n- Total: ${formatCurrency(order.total || 0)}\n- Items: ${itemCount}`,
      order,
      `/b2b/orders/${data.orderId}`
    );
  } catch (err) {
    return errorResult(`Exception getting B2B order: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Update B2B Order Status
// ============================================================================

async function updateOrderStatus(
  ctx: ActionContext,
  data: { orderId: string; status: string }
): Promise<ActionResult> {
  try {
    if (!data.orderId) {
      return errorResult('Order ID is required', 'Missing orderId');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(data.status)) {
      return errorResult(
        `Invalid status. Use one of: ${validStatuses.join(', ')}`,
        'Invalid status'
      );
    }

    // Verify order belongs to this company
    const { data: existing, error: findError } = await ctx.supabase
      .from('b2b_orders')
      .select('id, status')
      .eq('id', data.orderId)
      .eq('company_id', ctx.companyId)
      .single();

    if (findError || !existing) {
      return errorResult('B2B order not found', 'Not found');
    }

    const { data: updated, error: updateError } = await ctx.supabase
      .from('b2b_orders')
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq('id', data.orderId)
      .select()
      .single();

    if (updateError) {
      return errorResult(`Failed to update order status: ${updateError.message}`, updateError.message);
    }

    return successResult(
      `Order status updated!\n\n**Order ${data.orderId}**\n- Status: ${existing.status} -> **${data.status}**`,
      updated,
      `/b2b/orders/${data.orderId}`
    );
  } catch (err) {
    return errorResult(`Exception updating B2B order status: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get B2B Store Stats
// ============================================================================

async function getStoreStats(
  ctx: ActionContext,
  data: { period?: string }
): Promise<ActionResult> {
  try {
    const now = new Date();
    let startDate: Date;

    switch (data.period || 'month') {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const startDateStr = startDate.toISOString();
    const periodLabel = data.period === 'week' ? 'This Week' : data.period === 'quarter' ? 'This Quarter' : 'This Month';

    const { data: orders, error } = await ctx.supabase
      .from('b2b_orders')
      .select('id, status, total, client_id')
      .eq('company_id', ctx.companyId)
      .gte('created_at', startDateStr);

    if (error) {
      return errorResult(`Failed to get store stats: ${error.message}`, error.message);
    }

    const allOrders = orders || [];
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
    const activeClients = new Set(allOrders.map(o => o.client_id).filter(Boolean)).size;

    return successResult(
      `**B2B Store Stats - ${periodLabel}**\n\n` +
      `- Total Orders: ${totalOrders}\n` +
      `- Revenue: ${formatCurrency(totalRevenue)}\n` +
      `- Pending Orders: ${pendingOrders}\n` +
      `- Active Clients: ${activeClients}`,
      {
        period: periodLabel,
        totalOrders,
        totalRevenue,
        pendingOrders,
        activeClients,
      },
      '/b2b'
    );
  } catch (err) {
    return errorResult(`Exception getting B2B store stats: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List B2B Clients
// ============================================================================

async function listClients(
  ctx: ActionContext,
  data: { search?: string; limit?: number }
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('portal_clients')
      .select('*')
      .eq('organization_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(data.limit || 20);

    if (data.search) {
      query = query.or(
        `full_name.ilike.%${data.search}%,email.ilike.%${data.search}%,company_name.ilike.%${data.search}%`
      );
    }

    const { data: clients, error } = await query;

    if (error) {
      return errorResult(`Failed to list B2B clients: ${error.message}`, error.message);
    }

    if (!clients || clients.length === 0) {
      return successResult('No B2B clients found matching your criteria.', []);
    }

    return successResult(
      `${clients.length} B2B clients found.`,
      clients,
      '/b2b/clients'
    );
  } catch (err) {
    return errorResult(`Exception listing B2B clients: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get B2B Client
// ============================================================================

async function getClient(
  ctx: ActionContext,
  data: { clientId: string }
): Promise<ActionResult> {
  try {
    if (!data.clientId) {
      return errorResult('Client ID is required', 'Missing clientId');
    }

    const { data: client, error } = await ctx.supabase
      .from('portal_clients')
      .select('*')
      .eq('id', data.clientId)
      .eq('organization_id', ctx.companyId)
      .single();

    if (error || !client) {
      return errorResult('B2B client not found', 'Not found');
    }

    // Count client orders
    const { count: orderCount, error: countError } = await ctx.supabase
      .from('b2b_orders')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', data.clientId)
      .eq('company_id', ctx.companyId);

    const clientName = client.company_name || client.full_name || 'Unknown';

    return successResult(
      `**${clientName}**\n` +
      (client.email ? `- Email: ${client.email}\n` : '') +
      (client.phone ? `- Phone: ${client.phone}\n` : '') +
      `- Total Orders: ${orderCount || 0}`,
      { ...client, order_count: orderCount || 0 },
      `/b2b/clients/${data.clientId}`
    );
  } catch (err) {
    return errorResult(`Exception getting B2B client: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List B2B Price Lists
// ============================================================================

async function listPriceLists(
  ctx: ActionContext,
  data: { limit?: number }
): Promise<ActionResult> {
  try {
    const { data: priceLists, error } = await ctx.supabase
      .from('b2b_price_lists')
      .select('*')
      .eq('company_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(data.limit || 20);

    if (error) {
      return errorResult(`Failed to list price lists: ${error.message}`, error.message);
    }

    if (!priceLists || priceLists.length === 0) {
      return successResult('No B2B price lists found.', []);
    }

    return successResult(
      `${priceLists.length} price lists found.`,
      priceLists,
      '/b2b/price-lists'
    );
  } catch (err) {
    return errorResult(`Exception listing price lists: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Update B2B Price List
// ============================================================================

async function updatePriceList(
  ctx: ActionContext,
  data: { priceListId: string; name?: string; description?: string; status?: string }
): Promise<ActionResult> {
  try {
    if (!data.priceListId) {
      return errorResult('Price list ID is required', 'Missing priceListId');
    }

    const updates: Record<string, any> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;

    if (Object.keys(updates).length === 0) {
      return errorResult('No update fields provided. Provide at least one of: name, description, status.', 'No updates');
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await ctx.supabase
      .from('b2b_price_lists')
      .update(updates)
      .eq('id', data.priceListId)
      .eq('company_id', ctx.companyId)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to update price list: ${error.message}`, error.message);
    }

    if (!updated) {
      return errorResult('Price list not found or does not belong to your company', 'Not found');
    }

    return successResult(
      `Price list updated!\n\n**${updated.name}**\nUpdated fields: ${Object.keys(updates).filter(k => k !== 'updated_at').join(', ')}`,
      updated,
      '/b2b/price-lists'
    );
  } catch (err) {
    return errorResult(`Exception updating price list: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List B2B Inquiries
// ============================================================================

async function listInquiries(
  ctx: ActionContext,
  data: { status?: string; limit?: number }
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('b2b_inquiries')
      .select('*, portal_clients(full_name, company_name)')
      .eq('company_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(data.limit || 20);

    if (data.status) {
      query = query.eq('status', data.status);
    }

    const { data: inquiries, error } = await query;

    if (error) {
      return errorResult(`Failed to list B2B inquiries: ${error.message}`, error.message);
    }

    if (!inquiries || inquiries.length === 0) {
      return successResult('No B2B inquiries found matching your criteria.', []);
    }

    const pendingCount = inquiries.filter(i => i.status === 'pending').length;
    const pendingNote = pendingCount > 0 ? ` ${pendingCount} awaiting response.` : '';

    return successResult(
      `${inquiries.length} B2B inquiries.${pendingNote}`,
      inquiries,
      '/b2b/inquiries'
    );
  } catch (err) {
    return errorResult(`Exception listing B2B inquiries: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Respond to B2B Inquiry
// ============================================================================

async function respondInquiry(
  ctx: ActionContext,
  data: { inquiryId: string; response: string; status?: string }
): Promise<ActionResult> {
  try {
    if (!data.inquiryId) {
      return errorResult('Inquiry ID is required', 'Missing inquiryId');
    }
    if (!data.response) {
      return errorResult('Response message is required', 'Missing response');
    }

    // Verify inquiry belongs to this company
    const { data: existing, error: findError } = await ctx.supabase
      .from('b2b_inquiries')
      .select('id, status')
      .eq('id', data.inquiryId)
      .eq('company_id', ctx.companyId)
      .single();

    if (findError || !existing) {
      return errorResult('B2B inquiry not found', 'Not found');
    }

    const { data: updated, error: updateError } = await ctx.supabase
      .from('b2b_inquiries')
      .update({
        merchant_response: data.response,
        status: data.status || 'responded',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.inquiryId)
      .select()
      .single();

    if (updateError) {
      return errorResult(`Failed to respond to inquiry: ${updateError.message}`, updateError.message);
    }

    return successResult(
      `Inquiry responded!\n\n**Inquiry ${data.inquiryId}**\n- Status: ${existing.status} -> **${data.status || 'responded'}**`,
      updated,
      `/b2b/inquiries/${data.inquiryId}`
    );
  } catch (err) {
    return errorResult(`Exception responding to B2B inquiry: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Send B2B Order Message
// ============================================================================

async function sendOrderMessage(
  ctx: ActionContext,
  data: { orderId: string; message: string }
): Promise<ActionResult> {
  try {
    if (!data.orderId) {
      return errorResult('Order ID is required', 'Missing orderId');
    }
    if (!data.message) {
      return errorResult('Message is required', 'Missing message');
    }

    // Verify order belongs to this company
    const { data: order, error: findError } = await ctx.supabase
      .from('b2b_orders')
      .select('id')
      .eq('id', data.orderId)
      .eq('company_id', ctx.companyId)
      .single();

    if (findError || !order) {
      return errorResult('B2B order not found', 'Not found');
    }

    const { data: msg, error: insertError } = await ctx.supabase
      .from('b2b_order_messages')
      .insert({
        order_id: data.orderId,
        sender_type: 'merchant',
        sender_id: ctx.userId || null,
        message: data.message,
      })
      .select()
      .single();

    if (insertError) {
      return errorResult(`Failed to send order message: ${insertError.message}`, insertError.message);
    }

    return successResult(
      `Message sent on order ${data.orderId}!`,
      msg,
      `/b2b/orders/${data.orderId}`
    );
  } catch (err) {
    return errorResult(`Exception sending B2B order message: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create B2B Announcement
// ============================================================================

async function createAnnouncement(
  ctx: ActionContext,
  data: {
    storeId: string;
    title: string;
    content: string;
    type?: string;
    priority?: number;
    startsAt?: string;
    endsAt?: string;
  }
): Promise<ActionResult> {
  try {
    if (!data.storeId) {
      return errorResult('Store ID is required', 'Missing storeId');
    }
    if (!data.title) {
      return errorResult('Announcement title is required', 'Missing title');
    }
    if (!data.content) {
      return errorResult('Announcement content is required', 'Missing content');
    }

    const { data: announcement, error } = await ctx.supabase
      .from('store_announcements')
      .insert({
        store_id: data.storeId,
        company_id: ctx.companyId,
        title: data.title,
        content: data.content,
        type: data.type || 'info',
        priority: data.priority ?? 0,
        starts_at: data.startsAt || new Date().toISOString(),
        ends_at: data.endsAt || null,
      })
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create announcement: ${error.message}`, error.message);
    }

    return successResult(
      `Announcement created!\n\n**${announcement.title}**\n- Type: ${announcement.type}\n- Priority: ${announcement.priority}`,
      announcement,
      '/b2b/announcements'
    );
  } catch (err) {
    return errorResult(`Exception creating B2B announcement: ${String(err)}`, String(err));
  }
}

// ============================================================================
// B2B Action Router
// ============================================================================

export async function executeB2BAction(
  ctx: ActionContext,
  actionName: string,
  data: any
): Promise<ActionResult> {
  switch (actionName) {
    case 'b2b_list_orders':
      return listOrders(ctx, data);
    case 'b2b_get_order':
      return getOrder(ctx, data);
    case 'b2b_update_order_status':
      return updateOrderStatus(ctx, data);
    case 'b2b_get_store_stats':
      return getStoreStats(ctx, data);
    case 'b2b_list_clients':
      return listClients(ctx, data);
    case 'b2b_get_client':
      return getClient(ctx, data);
    case 'b2b_list_price_lists':
      return listPriceLists(ctx, data);
    case 'b2b_update_price_list':
      return updatePriceList(ctx, data);
    case 'b2b_list_inquiries':
      return listInquiries(ctx, data);
    case 'b2b_respond_inquiry':
      return respondInquiry(ctx, data);
    case 'b2b_send_order_message':
      return sendOrderMessage(ctx, data);
    case 'b2b_create_announcement':
      return createAnnouncement(ctx, data);
    default:
      return errorResult(`Unknown B2B action: ${actionName}`, 'Unknown action');
  }
}

/**
 * B2B Wholesale Storefront — Database Queries
 *
 * CRUD operations for all B2B tables + price resolution + inventory reservation
 */

import { supabase } from '@/api/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export interface B2BClientGroup {
  id: string;
  company_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price_list_id: string | null;
  discount_percentage: number;
  can_preorder: boolean;
  max_credit: number;
  created_at: string;
  updated_at: string;
}

export interface B2BPriceList {
  id: string;
  company_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  currency: string;
  is_default: boolean;
  valid_from: string | null;
  valid_until: string | null;
  discount_type: string;
  global_discount_percent: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface B2BPriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  unit_price: number;
  min_quantity: number;
  max_quantity: number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  products?: { id: string; name: string; sku: string; ean: string; price: number; featured_image: string };
}

export interface B2BCart {
  id: string;
  organization_id: string;
  client_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: B2BCartItem[];
}

export interface B2BCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number | null;
  is_preorder: boolean;
  expected_delivery_id: string | null;
  notes: string | null;
  added_at: string;
  products?: { id: string; name: string; sku: string; ean: string; price: number; featured_image: string };
}

export interface B2BOrder {
  id: string;
  organization_id: string;
  company_id: string;
  client_id: string;
  sales_order_id: string | null;
  order_number: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  currency: string;
  payment_status: string;
  payment_terms_days: number;
  shipping_address: Record<string, unknown>;
  billing_address: Record<string, unknown>;
  client_notes: string | null;
  internal_notes: string | null;
  has_preorder_items: boolean;
  approved_by: string | null;
  approved_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  portal_clients?: { id: string; full_name: string; email: string };
  b2b_order_items?: B2BOrderItem[];
}

export interface B2BOrderItem {
  id: string;
  b2b_order_id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  ean: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
  is_preorder: boolean;
  expected_delivery_id: string | null;
  reservation_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface B2BPreorderReservation {
  id: string;
  company_id: string;
  expected_delivery_id: string;
  product_id: string;
  client_id: string;
  b2b_order_id: string | null;
  b2b_order_item_id: string | null;
  quantity_reserved: number;
  status: string;
  reserved_at: string;
  expires_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface B2BProductInquiry {
  id: string;
  organization_id: string;
  client_id: string;
  product_id: string | null;
  subject: string;
  message: string;
  inquiry_type: string;
  status: string;
  priority: string;
  inbox_channel_id: string | null;
  assigned_to: string | null;
  replied_at: string | null;
  closed_at: string | null;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
  products?: { id: string; name: string; featured_image: string };
  portal_clients?: { id: string; full_name: string; email: string };
}

export interface B2BStoreTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  industry: string | null;
  config: Record<string, unknown>;
  is_default: boolean;
  is_premium: boolean;
  sort_order: number;
  created_at: string;
}

export interface B2BStoreVersion {
  id: string;
  organization_id: string;
  store_config: Record<string, unknown>;
  version_number: number;
  label: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ClientPriceResult {
  unit_price: number;
  source: string;
  discount_percent: number;
}

// =============================================================================
// CLIENT GROUPS
// =============================================================================

export async function listClientGroups(organizationId: string): Promise<B2BClientGroup[]> {
  const { data, error } = await supabase
    .from('b2b_client_groups')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getClientGroup(id: string): Promise<B2BClientGroup | null> {
  const { data, error } = await supabase
    .from('b2b_client_groups')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createClientGroup(group: Omit<B2BClientGroup, 'id' | 'created_at' | 'updated_at'>): Promise<B2BClientGroup> {
  const { data, error } = await supabase
    .from('b2b_client_groups')
    .insert(group)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClientGroup(id: string, updates: Partial<B2BClientGroup>): Promise<B2BClientGroup> {
  const { data, error } = await supabase
    .from('b2b_client_groups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClientGroup(id: string): Promise<void> {
  const { error } = await supabase
    .from('b2b_client_groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =============================================================================
// PRICE LISTS
// =============================================================================

export async function listPriceLists(organizationId: string, status?: string): Promise<B2BPriceList[]> {
  let query = supabase
    .from('b2b_price_lists')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPriceList(id: string): Promise<B2BPriceList | null> {
  const { data, error } = await supabase
    .from('b2b_price_lists')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createPriceList(priceList: Omit<B2BPriceList, 'id' | 'created_at' | 'updated_at'>): Promise<B2BPriceList> {
  const { data, error } = await supabase
    .from('b2b_price_lists')
    .insert(priceList)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePriceList(id: string, updates: Partial<B2BPriceList>): Promise<B2BPriceList> {
  const { data, error } = await supabase
    .from('b2b_price_lists')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePriceList(id: string): Promise<void> {
  const { error } = await supabase
    .from('b2b_price_lists')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =============================================================================
// PRICE LIST ITEMS
// =============================================================================

export async function listPriceListItems(priceListId: string): Promise<B2BPriceListItem[]> {
  const { data, error } = await supabase
    .from('b2b_price_list_items')
    .select(`
      *,
      products (id, name, sku, ean, price, featured_image)
    `)
    .eq('price_list_id', priceListId)
    .order('min_quantity');

  if (error) throw error;
  return data || [];
}

export async function upsertPriceListItem(item: Omit<B2BPriceListItem, 'id' | 'created_at' | 'updated_at' | 'products'>): Promise<B2BPriceListItem> {
  const { data, error } = await supabase
    .from('b2b_price_list_items')
    .upsert(item, { onConflict: 'price_list_id,product_id,min_quantity' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePriceListItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('b2b_price_list_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function bulkUpsertPriceListItems(
  items: Omit<B2BPriceListItem, 'id' | 'created_at' | 'updated_at' | 'products'>[]
): Promise<B2BPriceListItem[]> {
  const { data, error } = await supabase
    .from('b2b_price_list_items')
    .upsert(items, { onConflict: 'price_list_id,product_id,min_quantity' })
    .select();

  if (error) throw error;
  return data || [];
}

// =============================================================================
// PRICE RESOLUTION (via DB function)
// =============================================================================

export async function getClientPrice(
  clientId: string,
  productId: string,
  quantity: number = 1
): Promise<ClientPriceResult> {
  const { data, error } = await supabase.rpc('get_b2b_client_price', {
    p_client_id: clientId,
    p_product_id: productId,
    p_quantity: quantity,
  });

  if (error) throw error;
  if (!data || data.length === 0) {
    return { unit_price: 0, source: 'none', discount_percent: 0 };
  }
  return data[0];
}

export async function getBulkClientPrices(
  clientId: string,
  productId: string
): Promise<B2BPriceListItem[]> {
  // Get all tier prices for a product for the client's price list
  const { data: client } = await supabase
    .from('portal_clients')
    .select('price_list_id, client_group_id')
    .eq('id', clientId)
    .single();

  if (!client) return [];

  const priceListIds: string[] = [];
  if (client.price_list_id) priceListIds.push(client.price_list_id);

  if (client.client_group_id) {
    const { data: group } = await supabase
      .from('b2b_client_groups')
      .select('price_list_id')
      .eq('id', client.client_group_id)
      .single();
    if (group?.price_list_id) priceListIds.push(group.price_list_id);
  }

  if (priceListIds.length === 0) return [];

  const { data, error } = await supabase
    .from('b2b_price_list_items')
    .select('*')
    .in('price_list_id', priceListIds)
    .eq('product_id', productId)
    .order('min_quantity');

  if (error) throw error;
  return data || [];
}

// =============================================================================
// CARTS
// =============================================================================

export async function getOrCreateCart(organizationId: string, clientId: string): Promise<B2BCart> {
  // Try to find active cart
  const { data: existing, error: findError } = await supabase
    .from('b2b_carts')
    .select(`
      *,
      b2b_cart_items (
        *,
        products (id, name, sku, ean, price, featured_image)
      )
    `)
    .eq('organization_id', organizationId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError && findError.code !== 'PGRST116') throw findError;
  if (existing) return { ...existing, items: existing.b2b_cart_items || [] };

  // Create new cart
  const { data: newCart, error: createError } = await supabase
    .from('b2b_carts')
    .insert({ organization_id: organizationId, client_id: clientId, status: 'active' })
    .select()
    .single();

  if (createError) throw createError;
  return { ...newCart, items: [] };
}

export async function addToCart(
  cartId: string,
  productId: string,
  quantity: number,
  unitPrice: number | null,
  isPreorder: boolean = false,
  expectedDeliveryId?: string,
  notes?: string
): Promise<B2BCartItem> {
  const { data, error } = await supabase
    .from('b2b_cart_items')
    .upsert(
      {
        cart_id: cartId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        is_preorder: isPreorder,
        expected_delivery_id: expectedDeliveryId || null,
        notes: notes || null,
      },
      { onConflict: 'cart_id,product_id,is_preorder' }
    )
    .select(`
      *,
      products (id, name, sku, ean, price, featured_image)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<B2BCartItem> {
  const { data, error } = await supabase
    .from('b2b_cart_items')
    .update({ quantity })
    .eq('id', itemId)
    .select(`
      *,
      products (id, name, sku, ean, price, featured_image)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function removeCartItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('b2b_cart_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function clearCart(cartId: string): Promise<void> {
  const { error } = await supabase
    .from('b2b_cart_items')
    .delete()
    .eq('cart_id', cartId);

  if (error) throw error;
}

export async function getCartWithItems(cartId: string): Promise<B2BCart | null> {
  const { data, error } = await supabase
    .from('b2b_carts')
    .select(`
      *,
      b2b_cart_items (
        *,
        products (id, name, sku, ean, price, featured_image)
      )
    `)
    .eq('id', cartId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  return { ...data, items: data.b2b_cart_items || [] };
}

// =============================================================================
// ORDERS
// =============================================================================

export async function createB2BOrder(order: {
  organization_id: string;
  company_id: string;
  client_id: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  currency?: string;
  payment_terms_days?: number;
  shipping_address?: Record<string, unknown>;
  billing_address?: Record<string, unknown>;
  client_notes?: string;
  has_preorder_items?: boolean;
}): Promise<B2BOrder> {
  const { data, error } = await supabase
    .from('b2b_orders')
    .insert({ ...order, order_number: '' }) // trigger generates order_number
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createB2BOrderItems(items: Omit<B2BOrderItem, 'id' | 'created_at'>[]): Promise<B2BOrderItem[]> {
  const { data, error } = await supabase
    .from('b2b_order_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

export async function listB2BOrders(
  organizationId: string,
  filters?: { status?: string; clientId?: string; limit?: number }
): Promise<B2BOrder[]> {
  let query = supabase
    .from('b2b_orders')
    .select(`
      *,
      portal_clients (id, full_name, email),
      b2b_order_items (*)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.clientId) query = query.eq('client_id', filters.clientId);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getB2BOrder(orderId: string): Promise<B2BOrder | null> {
  const { data, error } = await supabase
    .from('b2b_orders')
    .select(`
      *,
      portal_clients (id, full_name, email),
      b2b_order_items (*)
    `)
    .eq('id', orderId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getClientOrders(clientId: string, limit: number = 50): Promise<B2BOrder[]> {
  const { data, error } = await supabase
    .from('b2b_orders')
    .select(`
      *,
      b2b_order_items (*)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function updateB2BOrderStatus(
  orderId: string,
  status: string,
  extra?: {
    approved_by?: string;
    approved_at?: string;
    shipped_at?: string;
    delivered_at?: string;
    cancelled_at?: string;
    internal_notes?: string;
    sales_order_id?: string;
  }
): Promise<B2BOrder> {
  const { data, error } = await supabase
    .from('b2b_orders')
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// INVENTORY RESERVATION (via DB function)
// =============================================================================

export async function reserveB2BInventory(
  productId: string,
  companyId: string,
  quantity: number,
  warehouse: string = 'main'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('reserve_b2b_inventory', {
    p_product_id: productId,
    p_company_id: companyId,
    p_quantity: quantity,
    p_warehouse: warehouse,
  });

  if (error) throw error;
  return data === true;
}

// =============================================================================
// PREORDER RESERVATIONS
// =============================================================================

export async function createPreorderReservation(reservation: Omit<B2BPreorderReservation, 'id' | 'created_at' | 'updated_at' | 'reserved_at'>): Promise<B2BPreorderReservation> {
  const { data, error } = await supabase
    .from('b2b_preorder_reservations')
    .insert(reservation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listPreorderReservations(
  companyId: string,
  filters?: { status?: string; expectedDeliveryId?: string; clientId?: string }
): Promise<B2BPreorderReservation[]> {
  let query = supabase
    .from('b2b_preorder_reservations')
    .select(`
      *,
      products (id, name, sku),
      portal_clients (id, full_name, email),
      expected_deliveries (id, expected_date, quantity_expected, quantity_remaining)
    `)
    .eq('company_id', companyId)
    .order('reserved_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.expectedDeliveryId) query = query.eq('expected_delivery_id', filters.expectedDeliveryId);
  if (filters?.clientId) query = query.eq('client_id', filters.clientId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updatePreorderReservation(
  id: string,
  updates: { status?: string; fulfilled_at?: string }
): Promise<B2BPreorderReservation> {
  const { data, error } = await supabase
    .from('b2b_preorder_reservations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// PRODUCT INQUIRIES
// =============================================================================

export async function createInquiry(inquiry: Omit<B2BProductInquiry, 'id' | 'created_at' | 'updated_at' | 'products' | 'portal_clients'>): Promise<B2BProductInquiry> {
  const { data, error } = await supabase
    .from('b2b_product_inquiries')
    .insert(inquiry)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listInquiries(
  organizationId: string,
  filters?: { status?: string; clientId?: string; productId?: string }
): Promise<B2BProductInquiry[]> {
  let query = supabase
    .from('b2b_product_inquiries')
    .select(`
      *,
      products (id, name, featured_image),
      portal_clients (id, full_name, email)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.clientId) query = query.eq('client_id', filters.clientId);
  if (filters?.productId) query = query.eq('product_id', filters.productId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getClientInquiries(clientId: string): Promise<B2BProductInquiry[]> {
  const { data, error } = await supabase
    .from('b2b_product_inquiries')
    .select(`
      *,
      products (id, name, featured_image)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateInquiry(
  id: string,
  updates: Partial<Pick<B2BProductInquiry, 'status' | 'priority' | 'assigned_to' | 'replied_at' | 'closed_at' | 'inbox_channel_id'>>
): Promise<B2BProductInquiry> {
  const { data, error } = await supabase
    .from('b2b_product_inquiries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// STORE TEMPLATES
// =============================================================================

export async function listStoreTemplates(): Promise<B2BStoreTemplate[]> {
  const { data, error } = await supabase
    .from('b2b_store_templates')
    .select('*')
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

export async function getStoreTemplate(id: string): Promise<B2BStoreTemplate | null> {
  const { data, error } = await supabase
    .from('b2b_store_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// =============================================================================
// STORE VERSIONS (undo/redo history)
// =============================================================================

export async function saveStoreVersion(
  organizationId: string,
  storeConfig: Record<string, unknown>,
  versionNumber: number,
  label?: string,
  createdBy?: string
): Promise<B2BStoreVersion> {
  const { data, error } = await supabase
    .from('b2b_store_versions')
    .insert({
      organization_id: organizationId,
      store_config: storeConfig,
      version_number: versionNumber,
      label: label || null,
      created_by: createdBy || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listStoreVersions(organizationId: string, limit: number = 20): Promise<B2BStoreVersion[]> {
  const { data, error } = await supabase
    .from('b2b_store_versions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('version_number', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getStoreVersion(id: string): Promise<B2BStoreVersion | null> {
  const { data, error } = await supabase
    .from('b2b_store_versions')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// =============================================================================
// STORE CONFIG (portal_settings)
// =============================================================================

export async function getStoreConfig(organizationId: string): Promise<{
  store_config: Record<string, unknown>;
  store_published: boolean;
  store_subdomain: string | null;
  store_template: string;
  store_version: number;
  enable_wholesale: boolean;
  enable_preorders: boolean;
  enable_inquiries: boolean;
  enable_chat: boolean;
  min_order_amount: number;
  default_currency: string;
  order_requires_approval: boolean;
  catalog_visibility: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  store_builder_chat_history: unknown[];
  store_builder_version_history: unknown[];
} | null> {
  const { data, error } = await supabase
    .from('portal_settings')
    .select(`
      store_config,
      store_published,
      store_subdomain,
      store_template,
      store_version,
      enable_wholesale,
      enable_preorders,
      enable_inquiries,
      enable_chat,
      min_order_amount,
      default_currency,
      order_requires_approval,
      catalog_visibility,
      custom_domain,
      custom_domain_verified,
      store_builder_chat_history,
      store_builder_version_history
    `)
    .eq('organization_id', organizationId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateStoreConfig(
  organizationId: string,
  updates: {
    store_config?: Record<string, unknown>;
    store_published?: boolean;
    store_published_at?: string;
    store_subdomain?: string;
    store_template?: string;
    store_version?: number;
    enable_wholesale?: boolean;
    enable_preorders?: boolean;
    enable_inquiries?: boolean;
    enable_chat?: boolean;
    min_order_amount?: number;
    default_currency?: string;
    order_requires_approval?: boolean;
    catalog_visibility?: string;
    custom_domain_verified?: boolean;
    custom_domain_verification_token?: string;
    custom_domain_ssl_status?: string;
    store_builder_chat_history?: unknown[];
    store_builder_version_history?: unknown[];
  }
): Promise<void> {
  const { error } = await supabase
    .from('portal_settings')
    .upsert(
      { organization_id: organizationId, ...updates },
      { onConflict: 'organization_id' },
    );

  if (error) throw error;
}

export async function getStoreBySubdomain(subdomain: string): Promise<{
  organization_id: string;
  store_config: Record<string, unknown>;
  store_published: boolean;
  company_name: string | null;
  logo_url: string | null;
} | null> {
  const { data, error } = await supabase
    .from('portal_settings')
    .select('organization_id, store_config, store_published, company_name, logo_url')
    .eq('store_subdomain', subdomain)
    .eq('store_published', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// =============================================================================
// B2B PRODUCT CATALOG (products with B2B channel)
// =============================================================================

export async function listB2BProducts(
  companyId: string,
  filters?: {
    categoryId?: string;
    search?: string;
    inStock?: boolean;
    limit?: number;
    offset?: number;
    sort?: 'name' | 'price_asc' | 'price_desc' | 'newest';
  }
): Promise<{ products: unknown[]; total: number }> {
  let query = supabase
    .from('products')
    .select(`
      *,
      physical_products (sku, barcode, weight, dimensions),
      inventory (quantity_on_hand, quantity_reserved, quantity_allocated_b2b),
      product_categories (id, name),
      product_sales_channels!inner (channel, is_active)
    `, { count: 'exact' })
    .eq('company_id', companyId)
    .eq('product_sales_channels.channel', 'b2b')
    .eq('product_sales_channels.is_active', true)
    .eq('status', 'published');

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
  }

  // Sorting
  switch (filters?.sort) {
    case 'price_asc': query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'newest': query = query.order('created_at', { ascending: false }); break;
    default: query = query.order('name');
  }

  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 24) - 1);
  else if (filters?.limit) query = query.limit(filters.limit);

  const { data, error, count } = await query;
  if (error) throw error;
  return { products: data || [], total: count || 0 };
}

export async function getB2BProduct(productId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      physical_products (sku, barcode, weight, dimensions, specifications),
      inventory (quantity_on_hand, quantity_reserved, quantity_allocated_b2b, warehouse_location),
      product_categories (id, name),
      expected_deliveries (id, expected_date, quantity_expected, quantity_remaining, status)
    `)
    .eq('id', productId)
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// B2B DASHBOARD STATS
// =============================================================================

export async function getB2BDashboardStats(organizationId: string): Promise<{
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  activeClients: number;
  openInquiries: number;
}> {
  const [ordersRes, pendingRes, revenueRes, clientsRes, inquiriesRes] = await Promise.all([
    supabase
      .from('b2b_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('b2b_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending'),
    supabase
      .from('b2b_orders')
      .select('total')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered']),
    supabase
      .from('b2b_orders')
      .select('client_id')
      .eq('organization_id', organizationId),
    supabase
      .from('b2b_product_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'open'),
  ]);

  const totalRevenue = (revenueRes.data || []).reduce((sum, o) => sum + (parseFloat(String(o.total)) || 0), 0);
  const uniqueClients = new Set((clientsRes.data || []).map(o => o.client_id)).size;

  return {
    totalOrders: ordersRes.count || 0,
    pendingOrders: pendingRes.count || 0,
    totalRevenue,
    activeClients: uniqueClients,
    openInquiries: inquiriesRes.count || 0,
  };
}

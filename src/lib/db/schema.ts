/**
 * Inventory Management System - Database Schema Types
 */

// =============================================================================
// CUSTOMERS
// =============================================================================

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  kvk_number?: string;
  btw_number?: string;
  iban?: string;
  // Payment guardrails
  payment_days_after_delivery: number;
  credit_limit: number;
  // Tracking guardrails
  tracking_alert_days: number;
  auto_send_tracking: boolean;
  // Contact
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  // Status
  status: 'active' | 'inactive' | 'blocked';
  notes?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
export type CustomerUpdate = Partial<CustomerInsert>;

// =============================================================================
// INVENTORY
// =============================================================================

export interface Inventory {
  id: string;
  company_id: string;
  product_id: string;
  // Stock levels
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number; // Computed: on_hand - reserved
  quantity_incoming: number;
  // Location
  warehouse_location?: string;
  bin_location?: string;
  // Reorder
  reorder_point: number;
  reorder_quantity: number;
  max_stock?: number;
  // Cost
  average_cost?: number;
  last_purchase_cost?: number;
  // External stock tracking
  quantity_external_shopify: number;
  // Timestamps
  last_counted_at?: string;
  last_received_at?: string;
  last_shipped_at?: string;
  created_at: string;
  updated_at: string;
}

export type InventoryInsert = Omit<Inventory, 'id' | 'quantity_available' | 'created_at' | 'updated_at'>;
export type InventoryUpdate = Partial<Omit<InventoryInsert, 'company_id' | 'product_id'>>;

// =============================================================================
// EXPENSES (Enhanced)
// =============================================================================

export interface Expense {
  id: string;
  company_id: string;
  supplier_id?: string;
  // Document identification
  expense_number?: string;
  external_reference?: string;
  document_type: 'invoice' | 'credit_note' | 'receipt';
  // Source tracking
  source_email_id?: string;
  source_type?: 'email' | 'manual' | 'api';
  original_file_url?: string;
  // Financials
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  currency: string;
  // Payment
  payment_status: 'pending' | 'paid' | 'overdue' | 'disputed';
  payment_due_date?: string;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  // Document details
  invoice_date?: string;
  description?: string;
  category?: string;
  // AI Processing
  ai_extracted_data: Record<string, unknown>;
  ai_confidence?: number;
  ai_processed_at?: string;
  // Human review
  needs_review: boolean;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  // Status
  status: 'draft' | 'pending_review' | 'approved' | 'processed' | 'archived';
  // Metadata
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type ExpenseInsert = Omit<Expense, 'id' | 'created_at' | 'updated_at'>;
export type ExpenseUpdate = Partial<ExpenseInsert>;

// =============================================================================
// EXPENSE LINE ITEMS
// =============================================================================

export interface ExpenseLineItem {
  id: string;
  expense_id: string;
  product_id?: string;
  // Item details
  description: string;
  sku?: string;
  ean?: string;
  // Quantity & pricing
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  // Physical product tracking
  is_physical_product: boolean;
  expected_delivery_id?: string;
  // AI confidence
  ai_confidence: Record<string, number>;
  // Sort
  line_number?: number;
  created_at: string;
}

export type ExpenseLineItemInsert = Omit<ExpenseLineItem, 'id' | 'created_at'>;
export type ExpenseLineItemUpdate = Partial<ExpenseLineItemInsert>;

// =============================================================================
// EXPECTED DELIVERIES
// =============================================================================

export interface ExpectedDelivery {
  id: string;
  company_id: string;
  expense_id?: string;
  expense_line_item_id?: string;
  supplier_id?: string;
  product_id?: string;
  // Delivery details
  quantity_expected: number;
  quantity_received: number;
  quantity_remaining: number; // Computed
  // Tracking
  expected_date?: string;
  carrier?: string;
  tracking_number?: string;
  // Status
  status: 'pending' | 'partial' | 'complete' | 'cancelled';
  notes?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export type ExpectedDeliveryInsert = Omit<ExpectedDelivery, 'id' | 'quantity_remaining' | 'created_at' | 'updated_at'>;
export type ExpectedDeliveryUpdate = Partial<ExpectedDeliveryInsert>;

// =============================================================================
// RECEIVING LOG
// =============================================================================

export interface ReceivingLog {
  id: string;
  company_id: string;
  expected_delivery_id?: string;
  product_id?: string;
  // Receipt details
  quantity_received: number;
  ean_scanned?: string;
  // Location
  warehouse_location?: string;
  bin_location?: string;
  // Quality
  condition: 'good' | 'damaged' | 'defective';
  damage_notes?: string;
  // Type
  receipt_type: 'purchase' | 'return' | 'transfer' | 'adjustment';
  // Session
  receiving_session_id?: string;
  // Who received
  received_by?: string;
  received_at: string;
  // Metadata
  metadata: Record<string, unknown>;
}

export type ReceivingLogInsert = Omit<ReceivingLog, 'id'>;

// =============================================================================
// RECEIVING SESSIONS
// =============================================================================

export interface ReceivingSession {
  id: string;
  company_id: string;
  name: string;
  status: 'active' | 'closed';
  started_by?: string;
  closed_by?: string;
  started_at: string;
  closed_at?: string;
  total_items_received: number;
  total_eans_scanned: number;
  notes?: string;
  created_at: string;
}

export type ReceivingSessionInsert = Omit<ReceivingSession, 'id' | 'created_at'>;
export type ReceivingSessionUpdate = Partial<Omit<ReceivingSessionInsert, 'company_id'>>;

// =============================================================================
// SALES ORDERS
// =============================================================================

export interface SalesOrder {
  id: string;
  company_id: string;
  customer_id?: string;
  // Order identification
  order_number?: string;
  external_reference?: string;
  // Order details
  order_date: string;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  // Shipping address
  shipping_name?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country: string;
  // Billing
  billing_same_as_shipping: boolean;
  billing_name?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  // Financials
  subtotal: number;
  discount_type?: 'percent' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  shipping_cost: number;
  total: number;
  currency: string;
  // Payment
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  payment_due_date?: string;
  // Shipping
  shipping_method?: string;
  shipping_task_id?: string;
  shipped_at?: string;
  // Delivery
  delivered_at?: string;
  // Invoice
  invoice_id?: string;
  // Notes
  internal_notes?: string;
  customer_notes?: string;
  // Source tracking
  source?: 'manual' | 'bolcom' | 'shopify' | 'email' | 'api';
  shopify_order_id?: number;
  shopify_order_number?: string;
  // Metadata
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type SalesOrderInsert = Omit<SalesOrder, 'id' | 'order_number' | 'created_at' | 'updated_at'>;
export type SalesOrderUpdate = Partial<SalesOrderInsert>;

// =============================================================================
// SALES ORDER ITEMS
// =============================================================================

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id?: string;
  // Item details
  description?: string;
  sku?: string;
  ean?: string;
  // Quantity
  quantity: number;
  quantity_reserved: number;
  quantity_shipped: number;
  // Pricing
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  // Sort
  line_number?: number;
  created_at: string;
}

export type SalesOrderItemInsert = Omit<SalesOrderItem, 'id' | 'created_at'>;
export type SalesOrderItemUpdate = Partial<SalesOrderItemInsert>;

// =============================================================================
// SHIPPING TASKS
// =============================================================================

export interface ShippingTask {
  id: string;
  company_id: string;
  sales_order_id: string | null;
  b2b_order_id?: string | null;
  // Task details
  task_number?: string;
  status: 'pending' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  // Carrier & tracking - REQUIRED for shipping
  carrier?: string;
  service_type?: string;
  track_trace_code?: string; // REQUIRED to mark as shipped
  tracking_url?: string;
  // Package
  package_count: number;
  total_weight?: number;
  dimensions?: { length: number; width: number; height: number; unit: string };
  // Shipping
  ship_by_date?: string;
  shipped_at?: string;
  shipped_by?: string;
  // Delivery
  estimated_delivery?: string;
  delivered_at?: string;
  delivery_signature?: string;
  // Tracking job
  tracking_job_id?: string;
  // Notes
  shipping_notes?: string;
  delivery_instructions?: string;
  // Label
  label_url?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type ShippingTaskInsert = Omit<ShippingTask, 'id' | 'task_number' | 'created_at' | 'updated_at'>;
export type ShippingTaskUpdate = Partial<ShippingTaskInsert>;

// =============================================================================
// SHIPMENTS & PALLETS
// =============================================================================

export interface Shipment {
  id: string;
  company_id: string;
  shipment_code?: string;
  shipment_type: 'b2b' | 'b2c_lvb';
  status: 'draft' | 'packing' | 'packed' | 'finalized' | 'shipped' | 'delivered' | 'verified' | 'cancelled';
  destination?: string;
  destination_reference?: string;
  customer_id?: string;
  // Verification (Phase 3b)
  verification_status?: 'pending' | 'verified' | 'discrepancy';
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  // bol.com (Phase 3c/4)
  bol_shipment_id?: string;
  bol_received_at?: string;
  // bol.com Replenishment (Phase 4)
  bol_replenishment_id?: string;
  bol_replenishment_state?: string;
  bol_labels_url?: string;
  bol_received_quantities?: Record<string, number>;
  // Shipping
  carrier?: string;
  tracking_code?: string;
  shipping_task_id?: string;
  // Totals
  total_pallets: number;
  total_items: number;
  total_unique_eans: number;
  total_weight?: number;
  // Lifecycle
  shipped_at?: string;
  shipped_by?: string;
  finalized_by?: string;
  finalized_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export type ShipmentInsert = Omit<Shipment, 'id' | 'shipment_code' | 'created_at' | 'updated_at'>;
export type ShipmentUpdate = Partial<Omit<ShipmentInsert, 'company_id'>>;

export interface Pallet {
  id: string;
  company_id: string;
  shipment_id: string;
  pallet_code: string;
  sequence_number: number;
  status: 'packing' | 'packed' | 'shipped';
  total_items: number;
  total_unique_eans: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number; unit: string };
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
  // Joined
  pallet_items?: PalletItem[];
}

export type PalletInsert = Omit<Pallet, 'id' | 'created_at' | 'updated_at' | 'pallet_items'>;
export type PalletUpdate = Partial<Omit<PalletInsert, 'company_id' | 'shipment_id'>>;

export interface PalletItem {
  id: string;
  pallet_id: string;
  product_id: string;
  ean?: string;
  quantity: number;
  verified_quantity?: number;
  is_verified?: boolean;
  added_by?: string;
  created_at: string;
  updated_at?: string;
  // Joined
  products?: { id: string; name: string; sku?: string; ean: string };
}

export type PalletItemInsert = Omit<PalletItem, 'id' | 'created_at' | 'updated_at' | 'products'>;
export type PalletItemUpdate = Partial<Omit<PalletItemInsert, 'pallet_id'>>;

// =============================================================================
// BOL.COM INTEGRATION (Phase 4)
// =============================================================================

export interface BolcomCredentials {
  id: string;
  company_id: string;
  client_id_encrypted: string;
  client_secret_encrypted: string;
  access_token?: string;
  token_expires_at?: string;
  is_active: boolean;
  environment: 'production' | 'test';
  last_token_error?: string;
  created_at: string;
  updated_at: string;
}

export type BolcomCredentialsInsert = Omit<BolcomCredentials, 'id' | 'created_at' | 'updated_at'>;
export type BolcomCredentialsUpdate = Partial<Omit<BolcomCredentialsInsert, 'company_id'>>;

export interface BolcomOfferMapping {
  id: string;
  company_id: string;
  product_id: string;
  ean: string;
  bolcom_offer_id?: string;
  is_active: boolean;
  last_synced_at?: string;
  bolcom_stock_amount?: number;
  bolcom_stock_managed_by_retailer: boolean;
  created_at: string;
  updated_at: string;
}

export type BolcomOfferMappingInsert = Omit<BolcomOfferMapping, 'id' | 'created_at' | 'updated_at'>;
export type BolcomOfferMappingUpdate = Partial<Omit<BolcomOfferMappingInsert, 'company_id'>>;

export interface BolcomPendingProcessStatus {
  id: string;
  company_id: string;
  process_status_id: string;
  entity_type: 'replenishment' | 'offer' | 'stock_update' | 'other';
  entity_id?: string;
  status: 'pending' | 'success' | 'failure' | 'timeout';
  result_data?: unknown;
  error_message?: string;
  poll_count: number;
  max_polls: number;
  created_at: string;
  resolved_at?: string;
}

export type BolcomPendingProcessStatusInsert = Omit<BolcomPendingProcessStatus, 'id' | 'created_at'>;

// =============================================================================
// TRACKING JOBS
// =============================================================================

export interface TrackingJob {
  id: string;
  company_id: string;
  shipping_task_id: string;
  sales_order_id?: string;
  customer_id?: string;
  // Tracking details
  carrier: string;
  track_trace_code: string;
  // Status
  status: 'active' | 'delivered' | 'failed' | 'cancelled';
  current_tracking_status?: string;
  // Check schedule
  last_checked_at?: string;
  next_check_at?: string;
  check_count: number;
  // Delivery
  delivered_at?: string;
  delivery_location?: string;
  delivery_signature?: string;
  // Escalation
  is_overdue: boolean;
  escalated_at?: string;
  escalation_notification_id?: string;
  alert_after_days: number;
  // Raw data
  raw_tracking_data: unknown[];
  // Timestamps
  created_at: string;
  updated_at: string;
}

export type TrackingJobInsert = Omit<TrackingJob, 'id' | 'created_at' | 'updated_at'>;
export type TrackingJobUpdate = Partial<TrackingJobInsert>;

// =============================================================================
// TRACKING HISTORY
// =============================================================================

export interface TrackingHistory {
  id: string;
  tracking_job_id: string;
  // Event details
  event_timestamp: string;
  status_code?: string;
  status_description?: string;
  location?: string;
  // Raw data
  raw_event?: Record<string, unknown>;
  created_at: string;
}

export type TrackingHistoryInsert = Omit<TrackingHistory, 'id' | 'created_at'>;

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export type NotificationType =
  | 'low_confidence'
  | 'delivery_overdue'
  | 'partial_delivery'
  | 'stock_alert'
  | 'payment_overdue'
  | 'b2b_order'
  | 'receiving_session_closed';

export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  company_id: string;
  // Type
  type: NotificationType;
  severity: NotificationSeverity;
  // Related entities
  expense_id?: string;
  sales_order_id?: string;
  shipping_task_id?: string;
  tracking_job_id?: string;
  product_id?: string;
  customer_id?: string;
  // Content
  title: string;
  message: string;
  action_required?: string;
  action_url?: string;
  context_data: Record<string, unknown>;
  // Status
  status: 'unread' | 'read' | 'acknowledged' | 'resolved' | 'dismissed';
  // Assignment
  assigned_to?: string;
  // Resolution
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  // Timestamps
  created_at: string;
  read_at?: string;
  acknowledged_at?: string;
}

export type NotificationInsert = Omit<Notification, 'id' | 'created_at'>;
export type NotificationUpdate = Partial<NotificationInsert>;

// =============================================================================
// EMAIL ACCOUNTS
// =============================================================================

export interface EmailAccount {
  id: string;
  company_id: string;
  email_address: string;
  display_name?: string;
  provider: 'gmail' | 'outlook' | 'imap';
  credentials?: Record<string, unknown>;
  // Settings
  scan_inbox: boolean;
  scan_folders: string[];
  auto_archive: boolean;
  // Processing rules
  invoice_keywords: string[];
  skip_keywords: string[];
  // Status
  status: 'active' | 'paused' | 'error' | 'disconnected';
  last_error?: string;
  last_sync_at?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export type EmailAccountInsert = Omit<EmailAccount, 'id' | 'created_at' | 'updated_at'>;
export type EmailAccountUpdate = Partial<EmailAccountInsert>;

// =============================================================================
// EMAIL MESSAGES
// =============================================================================

export type EmailClassification =
  | 'invoice'
  | 'order_confirmation'
  | 'shipping_notification'
  | 'other'
  | 'spam';

export interface EmailMessage {
  id: string;
  company_id: string;
  email_account_id: string;
  // Email identification
  message_id?: string;
  thread_id?: string;
  // Email content
  from_address?: string;
  from_name?: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  // Timestamps
  received_at?: string;
  processed_at?: string;
  // Classification
  classification?: EmailClassification;
  classification_confidence?: number;
  // Attachments
  attachments: Array<{
    filename: string;
    mime_type: string;
    size: number;
    storage_url?: string;
  }>;
  // Processing
  status: 'pending' | 'processing' | 'processed' | 'skipped' | 'error';
  processing_result?: Record<string, unknown>;
  error_message?: string;
  // Link to expense
  expense_id?: string;
  created_at: string;
}

export type EmailMessageInsert = Omit<EmailMessage, 'id' | 'created_at'>;
export type EmailMessageUpdate = Partial<EmailMessageInsert>;

// =============================================================================
// RETURNS
// =============================================================================

export interface Return {
  id: string;
  company_id: string;
  return_code: string;
  source: 'bolcom' | 'shopify' | 'manual' | 'other';
  status: 'registered' | 'received' | 'inspected' | 'processed';
  sales_order_id?: string;
  customer_id?: string;
  bol_return_id?: string;
  registered_at: string;
  received_at?: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined
  customers?: { id: string; name: string; email?: string };
  sales_orders?: { id: string; order_number: string };
  return_items?: ReturnItem[];
}

export type ReturnInsert = Omit<Return, 'id' | 'created_at' | 'updated_at' | 'customers' | 'sales_orders' | 'return_items'>;
export type ReturnUpdate = Partial<Omit<ReturnInsert, 'company_id'>>;

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  ean?: string;
  quantity: number;
  reason?: 'defective' | 'wrong_item' | 'not_as_described' | 'no_longer_needed' | 'arrived_late' | 'other';
  reason_notes?: string;
  action?: 'restock' | 'dispose' | 'inspect' | 'pending';
  action_completed: boolean;
  receiving_log_id?: string;
  created_at: string;
  // Joined
  products?: { id: string; name: string; sku?: string; ean: string };
}

export type ReturnItemInsert = Omit<ReturnItem, 'id' | 'created_at' | 'products'>;
export type ReturnItemUpdate = Partial<Omit<ReturnItemInsert, 'return_id'>>;

// =============================================================================
// EMAIL POOL
// =============================================================================

export interface EmailPoolAccount {
  id: string;
  company_id: string;
  email_address: string;
  display_name?: string;
  label?: string;
  provider: 'gmail' | 'outlook';
  composio_connected_account_id?: string;
  composio_trigger_subscription_id?: string;
  toolkit_slug?: string;
  connection_status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired';
  connection_error?: string;
  is_active: boolean;
  auto_approve_orders: boolean;
  auto_approve_threshold: number;
  sync_to_finance: boolean;
  default_sales_channel: 'b2b' | 'b2c' | 'undecided';
  total_emails_received: number;
  total_orders_synced: number;
  total_errors: number;
  last_email_at?: string;
  last_order_synced_at?: string;
  last_error_at?: string;
  connected_by?: string;
  created_at: string;
  updated_at: string;
}

export type EmailPoolAccountInsert = Omit<EmailPoolAccount, 'id' | 'toolkit_slug' | 'created_at' | 'updated_at' | 'total_emails_received' | 'total_orders_synced' | 'total_errors'>;
export type EmailPoolAccountUpdate = Partial<Omit<EmailPoolAccountInsert, 'company_id' | 'email_address'>>;

export interface EmailPoolSyncLog {
  id: string;
  company_id: string;
  email_pool_account_id: string;
  email_from?: string;
  email_to?: string;
  email_subject?: string;
  email_snippet?: string;
  email_body?: string;
  email_date?: string;
  email_source_id?: string;
  email_thread_id?: string;
  classification?: 'order_confirmation' | 'shipping_update' | 'return_notification' | 'other' | 'skipped' | 'error';
  classification_confidence?: number;
  classification_method?: 'pattern_match' | 'ai' | 'skipped';
  extracted_data?: Record<string, unknown>;
  extraction_confidence?: number;
  stock_purchase_id?: string;
  expense_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | 'duplicate';
  error_message?: string;
  processing_time_ms?: number;
  is_duplicate: boolean;
  duplicate_of_id?: string;
  created_at: string;
}

export type EmailPoolSyncLogInsert = Omit<EmailPoolSyncLog, 'id' | 'created_at'>;
export type EmailPoolSyncLogUpdate = Partial<Omit<EmailPoolSyncLogInsert, 'company_id' | 'email_pool_account_id'>>;

export interface SupplierEmailPattern {
  id: string;
  company_id: string;
  supplier_id?: string;
  supplier_name: string;
  sender_patterns: string[];
  subject_patterns: string[];
  country: string;
  default_sales_channel: 'b2b' | 'b2c' | 'undecided';
  custom_extraction_hints?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SupplierEmailPatternInsert = Omit<SupplierEmailPattern, 'id' | 'created_at' | 'updated_at'>;
export type SupplierEmailPatternUpdate = Partial<Omit<SupplierEmailPatternInsert, 'company_id'>>;

// =============================================================================
// =============================================================================
// SHOPIFY INTEGRATION
// =============================================================================

export interface ShopifyCredentials {
  id: string;
  company_id: string;
  shop_domain: string;
  shop_name?: string;
  access_token_encrypted?: string;
  scopes?: string[];
  primary_location_id?: string;
  auto_sync_orders: boolean;
  auto_sync_inventory: boolean;
  auto_fulfill: boolean;
  sync_frequency_minutes: number;
  status: 'connected' | 'disconnected' | 'error';
  last_sync_at?: string;
  last_order_sync_at?: string;
  last_inventory_sync_at?: string;
  last_error?: string;
  webhook_ids?: unknown[];
  oauth_state?: string;
  connected_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type ShopifyCredentialsInsert = Omit<ShopifyCredentials, 'id' | 'created_at' | 'updated_at'>;
export type ShopifyCredentialsUpdate = Partial<Omit<ShopifyCredentialsInsert, 'company_id'>>;

export interface ShopifyProductMapping {
  id: string;
  company_id: string;
  product_id: string;
  shopify_product_id: number;
  shopify_variant_id?: number;
  shopify_inventory_item_id?: number;
  matched_by: 'ean' | 'sku' | 'manual' | 'auto_created';
  shopify_product_title?: string;
  shopify_variant_title?: string;
  shopify_sku?: string;
  is_active: boolean;
  sync_inventory: boolean;
  last_synced_at?: string;
  shopify_stock_level?: number;
  created_at: string;
  updated_at: string;
}
export type ShopifyProductMappingInsert = Omit<ShopifyProductMapping, 'id' | 'created_at' | 'updated_at'>;
export type ShopifyProductMappingUpdate = Partial<Omit<ShopifyProductMappingInsert, 'company_id'>>;

// BUSINESS CONSTANTS
// =============================================================================

export const INVOICE_KEYWORDS = ['factuur', 'invoice', 'IBAN', 'BTW', 'factuurnummer'];
export const SKIP_KEYWORDS = ['orderbevestiging', 'order confirmation', 'bestelling ontvangen'];

// Minimum confidence for AI extraction auto-approval
export const MIN_CONFIDENCE = 0.95;

// Default tracking alert days
export const DEFAULT_TRACKING_ALERT_DAYS = 14;

// Default payment days after delivery
export const DEFAULT_PAYMENT_DAYS_AFTER_DELIVERY = 30;

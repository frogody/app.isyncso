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
  sales_order_id: string;
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

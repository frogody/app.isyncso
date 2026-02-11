/**
 * Inventory Service
 *
 * High-level service layer for the inventory management system.
 * Combines database queries with business logic and agent integrations.
 */

import * as db from '@/lib/db';
import { getInvoiceProcessorAgent } from '@/lib/agents/inventory';
import type {
  Customer,
  CustomerInsert,
  Expense,
  ExpenseInsert,
  SalesOrder,
  SalesOrderInsert,
  SalesOrderItemInsert,
  ShippingTask,
  ShippingTaskInsert,
  TrackingJob,
  TrackingJobInsert,
  Inventory,
  ExpectedDelivery,
  ReceivingSession,
} from '@/lib/db/schema';

// =============================================================================
// EXPENSE / INVOICE PROCESSING
// =============================================================================

export interface ProcessInvoiceResult {
  success: boolean;
  expense?: Expense;
  needsReview: boolean;
  confidence: number;
  errors?: string[];
}

/**
 * Process an invoice image using AI extraction
 */
export async function processInvoiceImage(
  companyId: string,
  imageUrl: string,
  sourceEmailId?: string
): Promise<ProcessInvoiceResult> {
  const agent = getInvoiceProcessorAgent();

  // Extract data from image
  const extraction = await agent.extractFromImage(imageUrl);

  if (!extraction.success || !extraction.data) {
    return {
      success: false,
      needsReview: false,
      confidence: 0,
      errors: extraction.errors,
    };
  }

  // Validate extraction
  const validation = agent.validateExtraction(extraction);

  // Create expense record
  const expense = await db.createExpense({
    company_id: companyId,
    document_type: 'invoice',
    source_type: sourceEmailId ? 'email' : 'manual',
    source_email_id: sourceEmailId,
    original_file_url: imageUrl,
    external_reference: extraction.data.invoice_number,
    invoice_date: extraction.data.invoice_date,
    subtotal: extraction.data.subtotal || 0,
    tax_percent: extraction.data.tax_percent || 0,
    tax_amount: extraction.data.tax_amount || 0,
    total: extraction.data.total || 0,
    currency: extraction.data.currency || 'EUR',
    payment_status: 'pending',
    payment_due_date: extraction.data.due_date,
    ai_extracted_data: extraction.data as unknown as Record<string, unknown>,
    ai_confidence: extraction.confidence,
    ai_processed_at: new Date().toISOString(),
    needs_review: !validation.canAutoApprove,
    review_status: validation.canAutoApprove ? 'approved' : 'pending',
    status: validation.canAutoApprove ? 'approved' : 'pending_review',
    metadata: {},
  });

  // Create line items
  if (extraction.data.line_items.length > 0) {
    await db.createExpenseLineItems(
      extraction.data.line_items.map((item, index) => ({
        expense_id: expense.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'stuk',
        unit_price: item.unit_price,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: extraction.data!.tax_percent || 0,
        tax_amount: 0,
        line_total: item.line_total || item.quantity * item.unit_price,
        ean: item.ean,
        sku: item.sku,
        is_physical_product: item.is_physical_product,
        ai_confidence: item.confidence,
        line_number: index + 1,
      }))
    );

    // Create expected deliveries for physical products
    const physicalItems = extraction.data.line_items.filter(
      (item) => item.is_physical_product
    );

    for (const item of physicalItems) {
      // Try to find matching product by EAN or SKU
      // In production, this would use a product lookup
      await db.createExpectedDelivery({
        company_id: companyId,
        expense_id: expense.id,
        quantity_expected: item.quantity,
        quantity_received: 0,
        status: 'pending',
      });
    }
  }

  // Create notification if review needed
  if (!validation.canAutoApprove) {
    await db.createLowConfidenceNotification(
      companyId,
      expense.id,
      extraction.confidence,
      extraction.data.supplier_name
    );
  }

  return {
    success: true,
    expense,
    needsReview: !validation.canAutoApprove,
    confidence: extraction.confidence,
    errors: validation.issues.length > 0 ? validation.issues : undefined,
  };
}

// =============================================================================
// RECEIVING (BARCODE SCANNING)
// =============================================================================

export interface ReceiveScanResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    sku?: string;
    ean: string;
  };
  expectedDelivery?: ExpectedDelivery;
  currentStock?: Inventory;
  suggestedAction?: 'receive' | 'investigate' | 'unknown';
}

/**
 * Scan a barcode and get receiving information
 */
export async function scanForReceiving(
  companyId: string,
  ean: string
): Promise<ReceiveScanResult> {
  const scanResult = await db.scanBarcode(companyId, ean);

  if (!scanResult.found) {
    return {
      found: false,
      suggestedAction: 'unknown',
    };
  }

  return {
    found: true,
    product: scanResult.product,
    expectedDelivery: scanResult.expectedDelivery,
    currentStock: scanResult.currentStock,
    suggestedAction: scanResult.expectedDelivery ? 'receive' : 'investigate',
  };
}

/**
 * Receive stock for a product
 */
export async function receiveStock(
  companyId: string,
  productId: string,
  quantity: number,
  options?: {
    expectedDeliveryId?: string;
    eanScanned?: string;
    warehouseLocation?: string;
    binLocation?: string;
    condition?: 'good' | 'damaged' | 'defective';
    damageNotes?: string;
    receivedBy?: string;
    receivingSessionId?: string;
  }
): Promise<{
  success: boolean;
  receivingLog: db.ReceivingLog;
  isPartial: boolean;
  remainingQuantity?: number;
}> {
  // Create receiving log entry
  const receivingLog = await db.receiveStock({
    company_id: companyId,
    product_id: productId,
    expected_delivery_id: options?.expectedDeliveryId,
    quantity_received: quantity,
    ean_scanned: options?.eanScanned,
    warehouse_location: options?.warehouseLocation,
    bin_location: options?.binLocation,
    condition: options?.condition || 'good',
    damage_notes: options?.damageNotes,
    receipt_type: 'purchase',
    received_by: options?.receivedBy,
    receiving_session_id: options?.receivingSessionId,
    received_at: new Date().toISOString(),
    metadata: {},
  });

  // Update inventory: increase quantity_on_hand, decrease quantity_incoming
  const currentInventory = await db.getInventoryByProduct(companyId, productId);
  if (currentInventory) {
    const newQuantityOnHand = (currentInventory.quantity_on_hand || 0) + quantity;
    const newQuantityIncoming = Math.max(0, (currentInventory.quantity_incoming || 0) - quantity);

    await db.updateInventory(currentInventory.id, {
      quantity_on_hand: newQuantityOnHand,
      quantity_incoming: newQuantityIncoming,
      warehouse_location: options?.warehouseLocation || currentInventory.warehouse_location,
      last_received_at: new Date().toISOString(),
    });
  }

  // Update expected delivery if provided
  let isPartial = false;
  let remainingQuantity: number | undefined;

  if (options?.expectedDeliveryId) {
    const delivery = await db.getExpectedDeliveryById(options.expectedDeliveryId);

    if (delivery) {
      const totalReceived = (delivery.quantity_received || 0) + quantity;
      isPartial = totalReceived < delivery.quantity_expected;
      remainingQuantity = delivery.quantity_expected - totalReceived;

      // Update expected delivery status
      const newStatus = totalReceived >= delivery.quantity_expected ? 'completed' : 'partial';
      await db.updateExpectedDelivery(delivery.id, {
        quantity_received: totalReceived,
        status: newStatus,
      });

      // Create notification for partial delivery
      if (isPartial) {
        await db.createPartialDeliveryNotification(
          companyId,
          delivery.id,
          'Product',
          delivery.quantity_expected,
          totalReceived
        );
      }
    }
  }

  return {
    success: true,
    receivingLog,
    isPartial,
    remainingQuantity,
  };
}

// =============================================================================
// RECEIVING SESSIONS
// =============================================================================

/**
 * Start a new receiving session
 */
export async function startReceivingSession(
  companyId: string,
  name: string,
  userId: string
): Promise<ReceivingSession> {
  return db.createReceivingSession({
    company_id: companyId,
    name,
    status: 'active',
    started_by: userId,
    started_at: new Date().toISOString(),
    total_items_received: 0,
    total_eans_scanned: 0,
  });
}

/**
 * Close a receiving session and create a notification
 */
export async function closeReceivingSession(
  sessionId: string,
  userId: string,
  userName: string,
  companyId: string,
  notes?: string
): Promise<ReceivingSession> {
  const session = await db.closeReceivingSession(sessionId, userId, notes);

  // Create notification
  await db.createReceivingSessionNotification(
    companyId,
    session.id,
    session.name,
    userName,
    session.total_items_received,
    session.total_eans_scanned
  );

  return session;
}

// =============================================================================
// SALES ORDERS
// =============================================================================

export interface CreateSalesOrderInput {
  customerId?: string;
  items: Array<{
    productId?: string;
    description?: string;
    sku?: string;
    ean?: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxPercent?: number;
  }>;
  shippingAddress?: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: {
    internal?: string;
    customer?: string;
  };
}

/**
 * Create a new sales order with items
 */
export async function createSalesOrder(
  companyId: string,
  input: CreateSalesOrderInput,
  createdBy?: string
): Promise<SalesOrder> {
  // Calculate totals
  let subtotal = 0;
  let taxAmount = 0;

  const lineItems = input.items.map((item, index) => {
    const discountAmount = item.unitPrice * item.quantity * ((item.discountPercent || 0) / 100);
    const lineSubtotal = item.unitPrice * item.quantity - discountAmount;
    const lineTax = lineSubtotal * ((item.taxPercent || 21) / 100);
    const lineTotal = lineSubtotal + lineTax;

    subtotal += lineSubtotal;
    taxAmount += lineTax;

    return {
      product_id: item.productId,
      description: item.description,
      sku: item.sku,
      ean: item.ean,
      quantity: item.quantity,
      quantity_reserved: 0,
      quantity_shipped: 0,
      unit_price: item.unitPrice,
      discount_percent: item.discountPercent || 0,
      discount_amount: discountAmount,
      tax_percent: item.taxPercent || 21,
      tax_amount: lineTax,
      line_total: lineTotal,
      line_number: index + 1,
    } as SalesOrderItemInsert;
  });

  const total = subtotal + taxAmount;

  // Create order
  const order = await db.createSalesOrder({
    company_id: companyId,
    customer_id: input.customerId,
    order_date: new Date().toISOString(),
    status: 'draft',
    shipping_name: input.shippingAddress?.name,
    shipping_address_line1: input.shippingAddress?.addressLine1,
    shipping_address_line2: input.shippingAddress?.addressLine2,
    shipping_city: input.shippingAddress?.city,
    shipping_postal_code: input.shippingAddress?.postalCode,
    shipping_country: input.shippingAddress?.country || 'NL',
    billing_same_as_shipping: true,
    subtotal,
    discount_type: undefined,
    discount_value: 0,
    discount_amount: 0,
    tax_percent: 21,
    tax_amount: taxAmount,
    shipping_cost: 0,
    total,
    currency: 'EUR',
    payment_status: 'pending',
    internal_notes: input.notes?.internal,
    customer_notes: input.notes?.customer,
    metadata: {},
    created_by: createdBy,
  });

  // Create order items
  const items = lineItems.map((item) => ({
    ...item,
    sales_order_id: order.id,
  }));

  await db.createSalesOrderItems(items);

  return order;
}

/**
 * Confirm an order and reserve stock
 */
export async function confirmSalesOrder(orderId: string): Promise<SalesOrder> {
  return db.confirmSalesOrder(orderId);
}

// =============================================================================
// SHIPPING
// =============================================================================

/**
 * Create a shipping task for an order
 */
export async function createShippingTask(
  companyId: string,
  salesOrderId: string,
  options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    shipByDate?: string;
    carrier?: string;
    serviceType?: string;
    deliveryInstructions?: string;
    createdBy?: string;
  }
): Promise<ShippingTask> {
  return db.createShippingTask({
    company_id: companyId,
    sales_order_id: salesOrderId,
    status: 'pending',
    priority: options?.priority || 'normal',
    ship_by_date: options?.shipByDate,
    carrier: options?.carrier,
    service_type: options?.serviceType,
    delivery_instructions: options?.deliveryInstructions,
    package_count: 1,
    created_by: options?.createdBy,
  });
}

/**
 * Complete shipping with REQUIRED track & trace code
 * This is the gate that prevents shipping without tracking
 */
export async function completeShipping(
  taskId: string,
  trackTraceCode: string,
  options?: {
    carrier?: string;
    userId?: string;
  }
): Promise<{
  shippingTask: ShippingTask;
  trackingJob: TrackingJob;
}> {
  // Complete shipping (will throw if no track trace code)
  const shippingTask = await db.completeShipping(
    taskId,
    trackTraceCode,
    options?.carrier,
    options?.userId
  );

  // Get full task details for tracking job
  const fullTask = await db.getShippingTask(taskId);

  // Detect carrier if not provided
  const carrier = options?.carrier || db.detectCarrier(trackTraceCode) || 'unknown';
  const trackingUrl = db.getTrackingUrl(carrier, trackTraceCode);

  // Create tracking job
  const trackingJob = await db.createTrackingJob({
    company_id: shippingTask.company_id,
    shipping_task_id: taskId,
    sales_order_id: shippingTask.sales_order_id,
    customer_id: fullTask?.sales_orders?.customer_id,
    carrier,
    track_trace_code: trackTraceCode,
    status: 'active',
    check_count: 0,
    is_overdue: false,
    alert_after_days:
      fullTask?.sales_orders?.customers?.tracking_alert_days ||
      db.DEFAULT_TRACKING_ALERT_DAYS,
    raw_tracking_data: [],
    next_check_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
  });

  // Update shipping task with tracking URL
  if (trackingUrl) {
    await db.updateShippingTask(taskId, { tracking_url: trackingUrl });
  }

  return {
    shippingTask,
    trackingJob,
  };
}

// =============================================================================
// DASHBOARD DATA
// =============================================================================

export interface InventoryDashboardData {
  pendingReviews: number;
  lowStockItems: number;
  pendingShipments: number;
  overdueDeliveries: number;
  recentNotifications: db.Notification[];
}

/**
 * Get dashboard summary data
 */
export async function getDashboardData(
  companyId: string
): Promise<InventoryDashboardData> {
  const [reviewQueue, lowStock, pendingShipments, notifications, overdueJobs] =
    await Promise.all([
      db.getReviewQueue(companyId),
      db.getLowStockItems(companyId),
      db.getPendingShipments(companyId),
      db.listNotifications(companyId, { unreadOnly: true }),
      db.listTrackingJobs(companyId, { isOverdue: true }),
    ]);

  return {
    pendingReviews: reviewQueue.length,
    lowStockItems: lowStock.length,
    pendingShipments: pendingShipments.length,
    overdueDeliveries: overdueJobs.length,
    recentNotifications: notifications.slice(0, 10),
  };
}

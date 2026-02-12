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
  Shipment,
  Pallet,
  PalletItem,
  Return,
  ReturnItem,
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
    receiptType?: 'purchase' | 'return' | 'transfer' | 'adjustment';
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
    receipt_type: options?.receiptType || 'purchase',
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

  // Auto-push Shopify fulfillment if order source is 'shopify' and auto_fulfill is on
  if (shippingTask.sales_order_id) {
    try {
      const { supabase: sb } = await import('@/api/supabaseClient');
      const { data: salesOrder } = await sb
        .from('sales_orders')
        .select('source, shopify_order_id, company_id')
        .eq('id', shippingTask.sales_order_id)
        .single();

      if (salesOrder?.source === 'shopify' && salesOrder.shopify_order_id) {
        const { data: creds } = await sb
          .from('shopify_credentials')
          .select('auto_fulfill')
          .eq('company_id', salesOrder.company_id)
          .eq('is_active', true)
          .maybeSingle();

        if (creds?.auto_fulfill) {
          await callShopifyApi('createFulfillment', {
            companyId: salesOrder.company_id,
            orderId: salesOrder.shopify_order_id,
            trackingNumber: trackTraceCode,
            trackingCompany: carrier,
            trackingUrl,
          }).catch((err: unknown) => {
            console.error('Shopify auto-fulfill failed (non-blocking):', err);
          });
        }
      }
    } catch {
      // Non-blocking — don't fail shipping if Shopify push fails
    }
  }

  return {
    shippingTask,
    trackingJob,
  };
}

// =============================================================================
// PALLET MANAGEMENT
// =============================================================================

/**
 * Create a new shipment
 */
export async function createNewShipment(
  companyId: string,
  shipmentType: 'b2b' | 'b2c_lvb',
  userId: string,
  options?: {
    destination?: string;
    destinationReference?: string;
    notes?: string;
  }
): Promise<Shipment> {
  return db.createShipment({
    company_id: companyId,
    shipment_type: shipmentType,
    status: 'draft',
    destination: options?.destination,
    destination_reference: options?.destinationReference,
    notes: options?.notes,
    total_pallets: 0,
    total_items: 0,
    total_unique_eans: 0,
    created_by: userId,
  });
}

/**
 * Add a pallet to a shipment with auto-generated code
 */
export async function addPalletToShipment(
  companyId: string,
  shipmentId: string,
  userId?: string
): Promise<Pallet> {
  const seq = await db.getNextPalletSequence(companyId);
  const palletCode = db.generatePalletCode(seq);

  return db.addPallet({
    company_id: companyId,
    shipment_id: shipmentId,
    pallet_code: palletCode,
    sequence_number: seq,
    status: 'packing',
    total_items: 0,
    total_unique_eans: 0,
    created_by: userId,
  });
}

/**
 * Add a product to a pallet — inserts new row or increments existing quantity
 */
export async function addProductToPallet(
  palletId: string,
  productId: string,
  ean: string,
  quantity: number,
  userId?: string
): Promise<PalletItem> {
  // Check if product already on this pallet
  const existing = await db.findPalletItemByProduct(palletId, productId);

  if (existing) {
    // Increment quantity
    return db.updatePalletItemQty(existing.id, existing.quantity + quantity);
  }

  // Add new item
  return db.addPalletItem({
    pallet_id: palletId,
    product_id: productId,
    ean,
    quantity,
    added_by: userId,
  });
}

/**
 * Finalize a shipment — locks it and calculates totals
 */
export async function finalizeShipmentService(
  shipmentId: string,
  userId: string,
  notes?: string
): Promise<Shipment> {
  return db.finalizeShipment(shipmentId, userId, notes);
}

// =============================================================================
// PALLET WEIGHT & DIMENSIONS (Phase 3c)
// =============================================================================

/**
 * Update a pallet's weight and dimensions
 */
export async function updatePalletPhysicalProperties(
  palletId: string,
  weight: number | null,
  dimensions: { length: number; width: number; height: number; unit: string } | null
): Promise<Pallet> {
  return db.updatePalletWeightDimensions(palletId, weight, dimensions);
}

/**
 * Prepare data needed for bol.com LVB replenishment creation (P3-13 bridge).
 * Phase 4 will use this to build the POST /retailer/replenishments payload.
 */
export async function prepareBolcomReplenishmentData(
  companyId: string,
  shipmentId: string
): Promise<{
  reference: string;
  numberOfLoadCarriers: number;
  lines: Array<{ ean: string; quantity: number }>;
  totalWeight: number;
  palletDetails: Array<{
    palletCode: string;
    weight: number | null;
    dimensions: { length: number; width: number; height: number; unit: string } | null;
  }>;
}> {
  const shipment = await db.getShipment(shipmentId);
  if (!shipment) throw new Error('Shipment not found');
  if (shipment.shipment_type !== 'b2c_lvb') throw new Error('Not an LVB shipment');

  const eanSummary = await db.getShipmentEanSummary(shipmentId);
  const weightSummary = await db.getShipmentWeightSummary(shipmentId);

  return {
    reference: shipment.shipment_code || shipmentId,
    numberOfLoadCarriers: weightSummary.pallets.length,
    lines: eanSummary.map((row) => ({ ean: row.ean, quantity: row.total_packed })),
    totalWeight: weightSummary.total_weight,
    palletDetails: weightSummary.pallets.map((p) => ({
      palletCode: p.pallet_code,
      weight: p.weight,
      dimensions: p.dimensions,
    })),
  };
}

// =============================================================================
// BOL.COM REPLENISHMENT (Phase 4)
// =============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Call the bolcom-api edge function with a given action
 */
async function callBolcomApi(action: string, params: Record<string, unknown>): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/bolcom-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  return response.json();
}

/**
 * Push a finalized LVB shipment to bol.com as a replenishment
 */
export async function pushShipmentToBolcom(
  companyId: string,
  shipmentId: string,
  deliveryInfo: { deliveryDate: string; timeslotId?: string },
  options: { labellingByBol?: boolean } = {}
): Promise<{ processStatusId: string }> {
  const repData = await prepareBolcomReplenishmentData(companyId, shipmentId);

  const result = await callBolcomApi('createReplenishment', {
    companyId,
    shipmentId,
    reference: repData.reference,
    numberOfLoadCarriers: repData.numberOfLoadCarriers,
    lines: repData.lines,
    deliveryInfo,
    labellingByBol: options.labellingByBol ?? true,
  });

  if (!result.success) throw new Error(result.error || 'Failed to create replenishment');
  return result.data as { processStatusId: string };
}

/**
 * Get product destinations for replenishment EANs
 */
export async function getBolcomProductDestinations(
  companyId: string,
  products: Array<{ ean: string; quantity: number }>
): Promise<unknown> {
  const result = await callBolcomApi('getReplenishmentProductDestinations', {
    companyId,
    products,
  });
  if (!result.success) throw new Error(result.error || 'Failed to get product destinations');
  return result.data;
}

/**
 * Get available delivery timeslots for replenishment
 */
export async function getBolcomTimeslots(
  companyId: string,
  deliveryInfo: Record<string, unknown>
): Promise<unknown> {
  const result = await callBolcomApi('getReplenishmentTimeslots', {
    companyId,
    deliveryInfo,
  });
  if (!result.success) throw new Error(result.error || 'Failed to get timeslots');
  return result.data;
}

/**
 * Get replenishment details from bol.com
 */
export async function getBolcomReplenishment(
  companyId: string,
  replenishmentId: string,
  shipmentId?: string
): Promise<unknown> {
  const result = await callBolcomApi('getReplenishment', {
    companyId,
    replenishmentId,
    shipmentId,
  });
  if (!result.success) throw new Error(result.error || 'Failed to get replenishment');
  return result.data;
}

/**
 * Download replenishment labels and store in Supabase
 */
export async function getBolcomReplenishmentLabels(
  companyId: string,
  replenishmentId: string,
  shipmentId?: string
): Promise<{ labelsUrl: string }> {
  const result = await callBolcomApi('getReplenishmentLabels', {
    companyId,
    replenishmentId,
    shipmentId,
  });
  if (!result.success) throw new Error(result.error || 'Failed to get labels');
  return result.data as { labelsUrl: string };
}

/**
 * Test bol.com connection for a company
 */
export async function testBolcomConnection(companyId: string): Promise<{ connected: boolean }> {
  const result = await callBolcomApi('testConnection', { companyId });
  if (!result.success) throw new Error(result.error || 'Connection test failed');
  return result.data as { connected: boolean };
}

/**
 * Save bol.com credentials (encrypted server-side)
 */
export async function saveBolcomCredentials(
  companyId: string,
  clientId: string,
  clientSecret: string,
  environment: 'production' | 'test' = 'production'
): Promise<unknown> {
  const result = await callBolcomApi('saveCredentials', {
    companyId,
    clientId,
    clientSecret,
    environment,
  });
  if (!result.success) throw new Error(result.error || 'Failed to save credentials');
  return result.data;
}

/**
 * Poll pending process statuses for a company
 */
export async function pollBolcomProcessStatuses(
  companyId: string
): Promise<{ resolved: number; stillPending: number; errors: number }> {
  const result = await callBolcomApi('pollProcessStatuses', { companyId });
  if (!result.success) throw new Error(result.error || 'Failed to poll statuses');
  return result.data as { resolved: number; stillPending: number; errors: number };
}

// =============================================================================
// SHIPMENT VERIFICATION (Phase 3b)
// =============================================================================

/**
 * Get verification comparison data for a shipment (purchased vs received vs packed)
 */
export async function getVerificationData(
  companyId: string,
  shipmentId: string
): Promise<db.VerificationRow[]> {
  return db.getShipmentVerificationData(companyId, shipmentId);
}

/**
 * Sign off on a shipment verification
 */
export async function signOffShipment(
  shipmentId: string,
  userId: string,
  notes: string,
  hasDiscrepancies: boolean
): Promise<Shipment> {
  const status = hasDiscrepancies ? 'discrepancy' : 'verified';
  return db.verifyShipment(shipmentId, userId, notes, status);
}

/**
 * Verify-scan an item on a pallet — finds pallet_item by EAN and increments verified_quantity
 */
export async function verifyScanItem(
  palletId: string,
  ean: string
): Promise<{ item: PalletItem; isComplete: boolean }> {
  // Find the pallet item matching this EAN
  const { data: items, error } = await (await import('@/api/supabaseClient')).supabase
    .from('pallet_items')
    .select(`*, products (id, name, sku, ean)`)
    .eq('pallet_id', palletId)
    .eq('ean', ean);

  if (error) throw error;
  if (!items || items.length === 0) {
    throw new Error(`No item with EAN ${ean} on this pallet`);
  }

  const palletItem = items[0];
  const newVerifiedQty = (palletItem.verified_quantity || 0) + 1;
  const updated = await db.updatePalletItemVerification(palletItem.id, newVerifiedQty);
  return {
    item: updated,
    isComplete: newVerifiedQty >= palletItem.quantity,
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

// =============================================================================
// RETURNS (Phase 5)
// =============================================================================

const BOL_REASON_MAP: Record<string, ReturnItem['reason']> = {
  PRODUCT_DEFECT: 'defective',
  PRODUCT_DOES_NOT_MATCH_DESCRIPTION: 'not_as_described',
  WRONG_PRODUCT: 'wrong_item',
  TOO_LATE_DELIVERY: 'arrived_late',
  NO_LONGER_NEEDED: 'no_longer_needed',
};

function mapBolReason(bolReason: string): ReturnItem['reason'] {
  return BOL_REASON_MAP[bolReason] || 'other';
}

/**
 * Create a manual return with items
 */
export async function createManualReturn(
  companyId: string,
  items: Array<{
    productId: string;
    ean?: string;
    quantity: number;
    reason?: ReturnItem['reason'];
    reasonNotes?: string;
  }>,
  options?: {
    customerId?: string;
    salesOrderId?: string;
    notes?: string;
  }
): Promise<Return> {
  const returnCode = db.generateReturnCode('manual');

  const ret = await db.createReturn({
    company_id: companyId,
    return_code: returnCode,
    source: 'manual',
    status: 'registered',
    customer_id: options?.customerId,
    sales_order_id: options?.salesOrderId,
    notes: options?.notes,
    registered_at: new Date().toISOString(),
  });

  for (const item of items) {
    await db.createReturnItem({
      return_id: ret.id,
      product_id: item.productId,
      ean: item.ean,
      quantity: item.quantity,
      reason: item.reason || 'other',
      reason_notes: item.reasonNotes,
      action: 'pending',
      action_completed: false,
    });
  }

  return ret;
}

/**
 * Process a return item: restock, dispose, or inspect
 */
export async function processReturnItem(
  companyId: string,
  itemId: string,
  action: 'restock' | 'dispose' | 'inspect',
  userId?: string
): Promise<ReturnItem> {
  const item = await db.getReturnItem(itemId);
  if (!item) throw new Error('Return item not found');

  if (action === 'restock') {
    // Receive the returned stock back into inventory
    const result = await receiveStock(companyId, item.product_id, item.quantity, {
      eanScanned: item.ean,
      receiptType: 'return',
      receivedBy: userId,
      condition: 'good',
    });

    // Link receiving log and mark completed
    const updated = await db.updateReturnItem(itemId, {
      action: 'restock',
      action_completed: true,
      receiving_log_id: result.receivingLog.id,
    });

    // Check if all items in the return are completed
    await maybeCompleteReturn(item.return_id, userId);
    return updated;
  }

  if (action === 'dispose') {
    const updated = await db.updateReturnItem(itemId, {
      action: 'dispose',
      action_completed: true,
    });
    await maybeCompleteReturn(item.return_id, userId);
    return updated;
  }

  // inspect — mark action but leave not completed
  return db.updateReturnItem(itemId, {
    action: 'inspect',
    action_completed: false,
  });
}

/**
 * If all items in a return are completed, advance status to 'processed'
 */
async function maybeCompleteReturn(returnId: string, userId?: string): Promise<void> {
  const items = await db.listReturnItems(returnId);
  const allDone = items.every((i) => i.action_completed);

  if (allDone) {
    await db.updateReturn(returnId, {
      status: 'processed',
      processed_at: new Date().toISOString(),
      processed_by: userId,
    });
  }
}

/**
 * Advance a return's status
 */
export async function advanceReturnStatus(
  returnId: string,
  newStatus: Return['status'],
  userId?: string
): Promise<Return> {
  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'received') {
    updates.received_at = new Date().toISOString();
  } else if (newStatus === 'processed') {
    updates.processed_at = new Date().toISOString();
    updates.processed_by = userId;
  }

  return db.updateReturn(returnId, updates);
}

/**
 * Sync returns from bol.com — fetches unhandled returns and creates/updates records
 */
export async function syncBolcomReturns(
  companyId: string
): Promise<{ synced: number; errors: number }> {
  const result = await callBolcomApi('getReturns', { companyId });
  if (!result.success) throw new Error(result.error || 'Failed to fetch bol.com returns');

  const returns = (result.data as { returns?: Array<Record<string, unknown>> })?.returns || [];
  let synced = 0;
  let errors = 0;

  for (const bolReturn of returns) {
    try {
      const bolReturnId = String(bolReturn.returnId || '');
      const returnCode = `RET-BOL-${bolReturnId}`;

      // Check if return already exists
      const existing = await db.listReturns(companyId, { search: returnCode });
      if (existing.length > 0) continue;

      const ret = await db.createReturn({
        company_id: companyId,
        return_code: returnCode,
        source: 'bolcom',
        bol_return_id: bolReturnId,
        status: 'registered',
        registered_at: (bolReturn.registrationDateTime as string) || new Date().toISOString(),
      });

      // Create return items from bol.com return items
      const bolItems = (bolReturn.returnItems as Array<Record<string, unknown>>) || [];
      for (const bolItem of bolItems) {
        const ean = String(bolItem.ean || '');
        // Try to find product by EAN
        let productId: string | undefined;
        if (ean) {
          const { supabase } = await import('@/api/supabaseClient');
          const { data: found } = await supabase
            .from('products')
            .select('id')
            .eq('company_id', companyId)
            .eq('ean', ean)
            .limit(1)
            .maybeSingle();
          if (found) productId = found.id;
        }

        if (productId) {
          await db.createReturnItem({
            return_id: ret.id,
            product_id: productId,
            ean,
            quantity: Number(bolItem.quantity) || 1,
            reason: mapBolReason(String(bolItem.returnReason || '')),
            reason_notes: String(bolItem.customerDetails || ''),
            action: 'pending',
            action_completed: false,
          });
        }
      }
      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Send handling result back to bol.com for a return
 */
export async function sendBolcomHandlingResult(
  companyId: string,
  bolReturnId: string,
  handlingResult: 'RETURN_RECEIVED' | 'EXCHANGE_PRODUCT' | 'RETURN_DOES_NOT_MEET_CONDITIONS' | 'REPAIR_PRODUCT' | 'CUSTOMER_KEEPS_PRODUCT_PAID',
  quantityReturned: number
): Promise<{ processStatusId: string }> {
  const result = await callBolcomApi('handleReturn', {
    companyId,
    returnId: bolReturnId,
    handlingResult,
    quantityReturned,
  });
  if (!result.success) throw new Error(result.error || 'Failed to send handling result');
  return result.data as { processStatusId: string };
}

// =============================================================================
// SHOPIFY INTEGRATION (Phase SH)
// =============================================================================

/**
 * Call the shopify-api edge function with a given action
 */
async function callShopifyApi(action: string, params: Record<string, unknown>): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/shopify-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  return response.json();
}

/**
 * Initiate Shopify OAuth flow — returns the authorization URL
 */
export async function initiateShopifyOAuth(
  companyId: string,
  shopDomain: string
): Promise<{ authUrl: string }> {
  const result = await callShopifyApi('initiateOAuth', { companyId, shopDomain });
  if (!result.success) throw new Error(result.error || 'Failed to initiate OAuth');
  return result.data as { authUrl: string };
}

/**
 * Test Shopify connection for a company
 */
export async function testShopifyConnection(
  companyId: string
): Promise<{ connected: boolean; shopName?: string }> {
  const result = await callShopifyApi('testConnection', { companyId });
  if (!result.success) throw new Error(result.error || 'Connection test failed');
  return result.data as { connected: boolean; shopName?: string };
}

/**
 * Disconnect Shopify — removes webhooks, deactivates credentials and mappings
 */
export async function disconnectShopify(companyId: string): Promise<void> {
  const result = await callShopifyApi('disconnect', { companyId });
  if (!result.success) throw new Error(result.error || 'Failed to disconnect');
}

/**
 * Sync Shopify products — fetch all products, match by EAN/SKU
 */
export async function syncShopifyProducts(
  companyId: string
): Promise<{ mapped: number; unmapped: number }> {
  const result = await callShopifyApi('syncProducts', { companyId });
  if (!result.success) throw new Error(result.error || 'Failed to sync products');
  return result.data as { mapped: number; unmapped: number };
}

/**
 * Set inventory level for a single product on Shopify
 */
export async function setShopifyInventoryLevel(
  companyId: string,
  inventoryItemId: number,
  locationId: number,
  available: number
): Promise<void> {
  const result = await callShopifyApi('setInventoryLevel', {
    companyId,
    inventoryItemId,
    locationId,
    available,
  });
  if (!result.success) throw new Error(result.error || 'Failed to set inventory level');
}

/**
 * Push fulfillment with tracking to Shopify for an order
 */
export async function createShopifyFulfillment(
  companyId: string,
  shopifyOrderId: number,
  trackingNumber: string,
  trackingCompany?: string,
  trackingUrl?: string
): Promise<{ fulfillmentId: number }> {
  const result = await callShopifyApi('createFulfillment', {
    companyId,
    orderId: shopifyOrderId,
    trackingNumber,
    trackingCompany,
    trackingUrl,
  });
  if (!result.success) throw new Error(result.error || 'Failed to create fulfillment');
  return result.data as { fulfillmentId: number };
}

/**
 * Batch update inventory levels on Shopify for multiple products
 */
export async function batchUpdateShopifyInventory(
  companyId: string
): Promise<{ synced: number; errors: number }> {
  const result = await callShopifyApi('batchInventoryUpdate', { companyId });
  if (!result.success) throw new Error(result.error || 'Failed to batch update inventory');
  return result.data as { synced: number; errors: number };
}

/**
 * Inventory Agent Types
 */

import type { AgentConfig } from '../types';

// =============================================================================
// INVOICE PROCESSOR
// =============================================================================

export interface InvoiceExtractionResult {
  success: boolean;
  confidence: number;
  data?: {
    supplier_name?: string;
    supplier_email?: string;
    invoice_number?: string;
    invoice_date?: string;
    due_date?: string;
    subtotal?: number;
    tax_amount?: number;
    tax_percent?: number;
    total?: number;
    currency?: string;
    line_items: Array<{
      description: string;
      quantity: number;
      unit?: string;
      unit_price: number;
      line_total?: number;
      ean?: string;
      sku?: string;
      is_physical_product: boolean;
      confidence: Record<string, number>;
    }>;
    payment_details?: {
      iban?: string;
      bic?: string;
      reference?: string;
    };
  };
  errors?: string[];
  raw_response?: unknown;
}

export interface EmailClassificationResult {
  classification: 'invoice' | 'order_confirmation' | 'shipping_notification' | 'other' | 'spam';
  confidence: number;
  reason: string;
  should_process: boolean;
}

// =============================================================================
// DELIVERY TRACKING
// =============================================================================

export interface TrackingCheckResult {
  success: boolean;
  status?: string;
  status_code?: string;
  location?: string;
  timestamp?: string;
  is_delivered: boolean;
  delivery_date?: string;
  delivery_signature?: string;
  events?: Array<{
    timestamp: string;
    status: string;
    location?: string;
  }>;
  error?: string;
  raw_response?: unknown;
}

export interface EscalationDecision {
  should_escalate: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  recommended_action?: string;
}

// =============================================================================
// AGENT CONFIGS
// =============================================================================

export const INVOICE_PROCESSOR_CONFIG: AgentConfig = {
  id: 'invoice-processor',
  name: 'Invoice Processor',
  description: 'Extracts structured data from invoices using AI vision',
  model: 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
  systemPrompt: `You are an expert invoice processor for a Dutch e-commerce company. Your job is to extract structured data from invoice images and documents.

CRITICAL RULES:
1. ONLY process actual INVOICES (factuur). NEVER process order confirmations (orderbevestiging/bestelbevestiging).
2. Look for keywords that indicate an invoice: "Factuur", "Invoice", "IBAN", "BTW-nummer", "Factuurnummer"
3. Reject documents containing: "orderbevestiging", "order confirmation", "bestelling ontvangen", "pakbon"
4. Extract ALL line items with quantities and prices
5. Identify physical products (things that will be shipped) vs services
6. Look for EAN/barcode numbers on products
7. Extract payment details (IBAN, reference number)
8. Calculate confidence scores for each extracted field

OUTPUT FORMAT:
Return a JSON object with the extracted data. Include confidence scores (0-1) for each field.
If you cannot extract a field with confidence, set its confidence to 0 and explain in errors array.

CONFIDENCE THRESHOLDS:
- >= 0.95: Auto-approve
- 0.7 - 0.95: Review recommended
- < 0.7: Manual review required`,
  temperature: 0.1,
  maxTokens: 4096,
};

export const DELIVERY_TRACKING_CONFIG: AgentConfig = {
  id: 'delivery-tracking',
  name: 'Delivery Tracking Agent',
  description: 'Monitors shipment deliveries and handles escalations',
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  systemPrompt: `You are a delivery tracking agent for a Dutch e-commerce company. Your responsibilities:

1. MONITORING:
   - Check tracking status for shipments
   - Parse carrier tracking responses
   - Identify delivery confirmations
   - Detect delivery issues or delays

2. ESCALATION RULES:
   - After X days without delivery (configurable per customer, default 14), escalate
   - Immediate escalation for: "refused", "return to sender", "damaged"
   - High priority for: "delivery failed", "address issue"

3. CARRIER DETECTION:
   - PostNL: 3S... codes, or XX123456789NL format
   - DHL: JJD... codes
   - DPD: 14-digit codes
   - UPS: 1Z... codes

4. NOTIFICATIONS:
   - Create notifications for overdue deliveries
   - Include actionable recommendations
   - Set appropriate severity levels

Always respond with structured JSON containing your analysis and recommendations.`,
  temperature: 0.3,
  maxTokens: 2048,
};

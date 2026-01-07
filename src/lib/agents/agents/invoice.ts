/**
 * Invoice Agent
 * Handles invoice creation, sending, and payment tracking
 * Includes Dutch BTW (21%) tax calculation
 */

import { BaseAgent } from '../base-agent';
import { AgentRegistry } from '../registry';
import type { AgentConfig, AgentContext, AgentTool } from '../types';

// ============================================================================
// Constants
// ============================================================================

const BTW_RATE = 0.21; // Dutch VAT rate (21%)
const BTW_REDUCED_RATE = 0.09; // Reduced rate for certain goods/services

// ============================================================================
// Types
// ============================================================================

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  btwRate?: number; // Override default BTW rate
}

export interface InvoiceClient {
  name: string;
  email: string;
  address?: string;
  vatNumber?: string; // BTW-nummer
  country?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  client: InvoiceClient;
  items: InvoiceItem[];
  subtotal: number;
  btwAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  createdAt: Date;
  dueDate: Date;
  sentAt?: Date;
  paidAt?: Date;
  notes?: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface InvoiceFilters {
  status?: InvoiceStatus;
  clientName?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaymentInfo {
  invoiceId: string;
  status: InvoiceStatus;
  amountDue: number;
  amountPaid: number;
  dueDate: Date;
  daysOverdue: number;
  paymentHistory: PaymentEvent[];
}

export interface PaymentEvent {
  date: Date;
  amount: number;
  method: string;
  reference?: string;
}

// ============================================================================
// Mock Data Store
// ============================================================================

const mockInvoices: Map<string, Invoice> = new Map();
let invoiceCounter = 1000;

// Initialize with some sample data
function initMockData(): void {
  if (mockInvoices.size > 0) return;

  const sampleInvoices: Invoice[] = [
    {
      id: 'inv_001',
      invoiceNumber: 'INV-2024-0001',
      client: {
        name: 'Acme B.V.',
        email: 'finance@acme.nl',
        address: 'Herengracht 123, 1015 BH Amsterdam',
        vatNumber: 'NL123456789B01',
        country: 'NL',
      },
      items: [
        { description: 'Software Development Services', quantity: 40, unitPrice: 125 },
        { description: 'Project Management', quantity: 10, unitPrice: 95 },
      ],
      subtotal: 5950,
      btwAmount: 1249.5,
      total: 7199.5,
      currency: 'EUR',
      status: 'paid',
      createdAt: new Date('2024-01-15'),
      dueDate: new Date('2024-02-14'),
      sentAt: new Date('2024-01-15'),
      paidAt: new Date('2024-02-01'),
    },
    {
      id: 'inv_002',
      invoiceNumber: 'INV-2024-0002',
      client: {
        name: 'TechStart B.V.',
        email: 'admin@techstart.nl',
        address: 'Vijzelstraat 68, 1017 HL Amsterdam',
        vatNumber: 'NL987654321B01',
        country: 'NL',
      },
      items: [
        { description: 'UI/UX Design', quantity: 20, unitPrice: 110 },
        { description: 'Frontend Development', quantity: 30, unitPrice: 125 },
      ],
      subtotal: 5950,
      btwAmount: 1249.5,
      total: 7199.5,
      currency: 'EUR',
      status: 'sent',
      createdAt: new Date('2024-02-01'),
      dueDate: new Date('2024-03-02'),
      sentAt: new Date('2024-02-01'),
    },
    {
      id: 'inv_003',
      invoiceNumber: 'INV-2024-0003',
      client: {
        name: 'Global Corp GmbH',
        email: 'accounting@globalcorp.de',
        address: 'Friedrichstraße 123, 10117 Berlin',
        vatNumber: 'DE123456789',
        country: 'DE',
      },
      items: [
        { description: 'Consulting Services', quantity: 16, unitPrice: 150 },
      ],
      subtotal: 2400,
      btwAmount: 0, // Reverse charge for EU B2B
      total: 2400,
      currency: 'EUR',
      status: 'overdue',
      createdAt: new Date('2024-01-01'),
      dueDate: new Date('2024-01-31'),
      sentAt: new Date('2024-01-01'),
    },
  ];

  for (const invoice of sampleInvoices) {
    mockInvoices.set(invoice.id, invoice);
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

function generateInvoiceId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function generateInvoiceNumber(): string {
  invoiceCounter++;
  const year = new Date().getFullYear();
  return `INV-${year}-${invoiceCounter.toString().padStart(4, '0')}`;
}

function calculateBTW(
  items: InvoiceItem[],
  clientCountry?: string,
  clientVatNumber?: string
): { subtotal: number; btwAmount: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // EU B2B reverse charge: no BTW if client has VAT number and is in EU (not NL)
  const isEuReverseCharge =
    clientVatNumber &&
    clientCountry &&
    clientCountry !== 'NL' &&
    ['DE', 'BE', 'FR', 'ES', 'IT', 'AT', 'PT', 'IE', 'LU', 'FI', 'SE', 'DK', 'PL', 'CZ', 'HU', 'RO', 'BG', 'GR', 'SK', 'SI', 'HR', 'EE', 'LV', 'LT', 'CY', 'MT'].includes(clientCountry);

  if (isEuReverseCharge) {
    return { subtotal, btwAmount: 0, total: subtotal };
  }

  // Calculate BTW per item (allows for different rates)
  let btwAmount = 0;
  for (const item of items) {
    const itemTotal = item.quantity * item.unitPrice;
    const rate = item.btwRate ?? BTW_RATE;
    btwAmount += itemTotal * rate;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    btwAmount: Math.round(btwAmount * 100) / 100,
    total: Math.round((subtotal + btwAmount) * 100) / 100,
  };
}

async function createInvoice(args: {
  client: InvoiceClient;
  items: InvoiceItem[];
  due_days?: number;
  notes?: string;
}): Promise<Invoice> {
  initMockData();

  const { client, items, due_days = 30, notes } = args;

  const { subtotal, btwAmount, total } = calculateBTW(
    items,
    client.country,
    client.vatNumber
  );

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + due_days);

  const invoice: Invoice = {
    id: generateInvoiceId(),
    invoiceNumber: generateInvoiceNumber(),
    client,
    items,
    subtotal,
    btwAmount,
    total,
    currency: 'EUR',
    status: 'draft',
    createdAt: now,
    dueDate,
    notes,
  };

  mockInvoices.set(invoice.id, invoice);

  return invoice;
}

async function sendInvoice(args: { invoice_id: string }): Promise<{
  success: boolean;
  invoice?: Invoice;
  message: string;
}> {
  initMockData();

  const invoice = mockInvoices.get(args.invoice_id);

  if (!invoice) {
    return {
      success: false,
      message: `Invoice ${args.invoice_id} not found`,
    };
  }

  if (invoice.status !== 'draft') {
    return {
      success: false,
      invoice,
      message: `Invoice ${invoice.invoiceNumber} has already been sent (status: ${invoice.status})`,
    };
  }

  // Update invoice status
  invoice.status = 'sent';
  invoice.sentAt = new Date();
  mockInvoices.set(invoice.id, invoice);

  return {
    success: true,
    invoice,
    message: `Invoice ${invoice.invoiceNumber} sent to ${invoice.client.email}`,
  };
}

async function trackPayment(args: { invoice_id: string }): Promise<PaymentInfo> {
  initMockData();

  const invoice = mockInvoices.get(args.invoice_id);

  if (!invoice) {
    throw new Error(`Invoice ${args.invoice_id} not found`);
  }

  const now = new Date();
  const daysOverdue =
    invoice.status !== 'paid'
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  // Mock payment history
  const paymentHistory: PaymentEvent[] = [];
  if (invoice.status === 'paid' && invoice.paidAt) {
    paymentHistory.push({
      date: invoice.paidAt,
      amount: invoice.total,
      method: 'Bank Transfer',
      reference: `PAY-${invoice.invoiceNumber}`,
    });
  }

  return {
    invoiceId: invoice.id,
    status: invoice.status,
    amountDue: invoice.status === 'paid' ? 0 : invoice.total,
    amountPaid: invoice.status === 'paid' ? invoice.total : 0,
    dueDate: invoice.dueDate,
    daysOverdue,
    paymentHistory,
  };
}

async function listInvoices(args: {
  filters?: InvoiceFilters;
}): Promise<{ invoices: Invoice[]; total: number; summary: object }> {
  initMockData();

  let invoices = Array.from(mockInvoices.values());
  const filters = args.filters || {};

  // Apply filters
  if (filters.status) {
    invoices = invoices.filter((inv) => inv.status === filters.status);
  }

  if (filters.clientName) {
    const searchTerm = filters.clientName.toLowerCase();
    invoices = invoices.filter((inv) =>
      inv.client.name.toLowerCase().includes(searchTerm)
    );
  }

  if (filters.fromDate) {
    const fromDate = new Date(filters.fromDate);
    invoices = invoices.filter((inv) => inv.createdAt >= fromDate);
  }

  if (filters.toDate) {
    const toDate = new Date(filters.toDate);
    invoices = invoices.filter((inv) => inv.createdAt <= toDate);
  }

  if (filters.minAmount !== undefined) {
    invoices = invoices.filter((inv) => inv.total >= filters.minAmount!);
  }

  if (filters.maxAmount !== undefined) {
    invoices = invoices.filter((inv) => inv.total <= filters.maxAmount!);
  }

  // Sort by date descending
  invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Calculate summary
  const summary = {
    totalInvoices: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
    totalBTW: invoices.reduce((sum, inv) => sum + inv.btwAmount, 0),
    byStatus: {
      draft: invoices.filter((inv) => inv.status === 'draft').length,
      sent: invoices.filter((inv) => inv.status === 'sent').length,
      paid: invoices.filter((inv) => inv.status === 'paid').length,
      overdue: invoices.filter((inv) => inv.status === 'overdue').length,
    },
    outstandingAmount: invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total, 0),
  };

  return { invoices, total: invoices.length, summary };
}

// ============================================================================
// Agent Tools Definition
// ============================================================================

const INVOICE_TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description:
        'Create a new invoice for a client. Automatically calculates Dutch BTW (21%) and handles EU reverse charge for B2B transactions.',
      parameters: {
        type: 'object',
        properties: {
          client: {
            type: 'object',
            description: 'Client information including name, email, and optionally VAT number for B2B',
          },
          items: {
            type: 'array',
            description: 'Array of invoice line items with description, quantity, and unit price',
            items: {
              type: 'object',
            },
          },
          due_days: {
            type: 'number',
            description: 'Number of days until payment is due (default: 30)',
          },
          notes: {
            type: 'string',
            description: 'Optional notes to include on the invoice',
          },
        },
        required: ['client', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_invoice',
      description: 'Send an invoice to the client via email. Changes status from draft to sent.',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: {
            type: 'string',
            description: 'The unique identifier of the invoice to send',
          },
        },
        required: ['invoice_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'track_payment',
      description: 'Get payment status and history for an invoice. Shows amount due, payment history, and overdue days.',
      parameters: {
        type: 'object',
        properties: {
          invoice_id: {
            type: 'string',
            description: 'The unique identifier of the invoice to track',
          },
        },
        required: ['invoice_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_invoices',
      description: 'List invoices with optional filtering by status, client, date range, or amount.',
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Optional filters: status, clientName, fromDate, toDate, minAmount, maxAmount',
          },
        },
      },
    },
  },
];

// ============================================================================
// Agent Configuration
// ============================================================================

const INVOICE_AGENT_CONFIG: AgentConfig = {
  id: 'finance',
  name: 'Invoice Agent',
  description:
    'Handles invoice creation, sending, and payment tracking with Dutch BTW (21%) calculation and EU reverse charge support.',
  systemPrompt: `You are the Invoice Agent for iSyncSO, specializing in financial document management.

Your capabilities:
- Create professional invoices with automatic Dutch BTW (21%) calculation
- Handle EU B2B reverse charge (0% BTW for EU clients with VAT numbers)
- Send invoices to clients
- Track payment status and history
- Provide invoice summaries and reports

Key Dutch tax rules you follow:
- Standard BTW rate: 21%
- Reduced BTW rate: 9% (for certain goods/services)
- EU B2B reverse charge: 0% BTW when client has valid EU VAT number (not NL)
- Always include BTW-nummer on invoices

When creating invoices:
- Ensure all required client information is provided
- Calculate totals accurately with proper rounding
- Set appropriate due dates (default 30 days)
- Format currency as EUR

Always provide clear, professional responses about invoice status and financial summaries.`,
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  temperature: 0.3, // Lower temperature for financial accuracy
  maxTokens: 2048,
  capabilities: [
    'Create invoices with BTW calculation',
    'Send invoices to clients',
    'Track payment status',
    'Handle EU reverse charge',
    'Generate invoice reports',
  ],
  tools: INVOICE_TOOLS,
};

// ============================================================================
// Invoice Agent Class
// ============================================================================

export class InvoiceAgent extends BaseAgent {
  constructor(apiKey?: string) {
    super(INVOICE_AGENT_CONFIG, apiKey);

    // Register tool handlers
    this.registerTool('create_invoice', createInvoice);
    this.registerTool('send_invoice', sendInvoice);
    this.registerTool('track_payment', trackPayment);
    this.registerTool('list_invoices', listInvoices);
  }

  /**
   * Quick method to create an invoice
   */
  async quickCreateInvoice(
    client: InvoiceClient,
    items: InvoiceItem[],
    dueDays = 30
  ): Promise<Invoice> {
    return createInvoice({ client, items, due_days: dueDays });
  }

  /**
   * Get all overdue invoices
   */
  async getOverdueInvoices(): Promise<Invoice[]> {
    const { invoices } = await listInvoices({
      filters: { status: 'overdue' },
    });
    return invoices;
  }

  /**
   * Get invoice summary for a period
   */
  async getSummary(fromDate?: string, toDate?: string): Promise<object> {
    const { summary } = await listInvoices({
      filters: { fromDate, toDate },
    });
    return summary;
  }
}

// ============================================================================
// Registration Helper
// ============================================================================

export function registerInvoiceAgent(): void {
  AgentRegistry.register(INVOICE_AGENT_CONFIG, 'active');
}

// ============================================================================
// Exports
// ============================================================================

export { INVOICE_AGENT_CONFIG, INVOICE_TOOLS, BTW_RATE, BTW_REDUCED_RATE };

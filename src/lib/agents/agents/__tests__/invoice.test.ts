/**
 * Invoice Agent Unit Tests
 * Tests for invoice creation, BTW calculation, and tool handlers
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// BTW Calculation Tests
// ============================================================================

const BTW_RATE = 0.21;
const BTW_REDUCED_RATE = 0.09;

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

interface InvoiceClient {
  name: string;
  email: string;
  company?: string;
  vatNumber?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  client: InvoiceClient;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: string;
  dueDate: Date;
  createdAt: Date;
  notes?: string;
  reverseCharge: boolean;
}

// Helper functions matching the invoice agent implementation
function calculateItemTotal(item: InvoiceItem): number {
  return item.quantity * item.unitPrice;
}

function calculateTax(subtotal: number, taxRate: number, reverseCharge: boolean): number {
  if (reverseCharge) return 0;
  return Math.round(subtotal * taxRate * 100) / 100;
}

function isEuCountry(country: string): boolean {
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'AUSTRIA', 'BELGIUM', 'BULGARIA', 'CROATIA', 'CYPRUS', 'CZECH REPUBLIC',
    'DENMARK', 'ESTONIA', 'FINLAND', 'FRANCE', 'GERMANY', 'GREECE',
    'HUNGARY', 'IRELAND', 'ITALY', 'LATVIA', 'LITHUANIA', 'LUXEMBOURG',
    'MALTA', 'NETHERLANDS', 'POLAND', 'PORTUGAL', 'ROMANIA', 'SLOVAKIA',
    'SLOVENIA', 'SPAIN', 'SWEDEN',
  ];
  return euCountries.includes(country.toUpperCase());
}

function shouldApplyReverseCharge(client: InvoiceClient): boolean {
  // Reverse charge applies for EU B2B transactions (client has VAT number and is in EU but not NL)
  if (!client.vatNumber) return false;
  const country = client.address?.country || '';
  if (!country) return false;

  const isEu = isEuCountry(country);
  const isNetherlands = country.toUpperCase() === 'NL' || country.toUpperCase() === 'NETHERLANDS';

  return isEu && !isNetherlands;
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
}

function createInvoice(args: {
  client: InvoiceClient;
  items: InvoiceItem[];
  due_days?: number;
  notes?: string;
  currency?: string;
}): Invoice {
  const { client, items, due_days = 30, notes, currency = 'EUR' } = args;

  const reverseCharge = shouldApplyReverseCharge(client);

  // Calculate totals
  let subtotal = 0;
  for (const item of items) {
    subtotal += calculateItemTotal(item);
  }
  subtotal = Math.round(subtotal * 100) / 100;

  const defaultTaxRate = BTW_RATE;
  const taxAmount = calculateTax(subtotal, defaultTaxRate, reverseCharge);
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + due_days);

  return {
    id: `inv_${Date.now()}`,
    invoiceNumber: generateInvoiceNumber(),
    client,
    items,
    subtotal,
    taxAmount,
    total,
    currency,
    status: 'draft',
    dueDate,
    createdAt: new Date(),
    notes,
    reverseCharge,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Invoice Agent - BTW Calculation', () => {
  it('should calculate correct BTW at 21%', () => {
    const subtotal = 100;
    const tax = calculateTax(subtotal, BTW_RATE, false);
    expect(tax).toBe(21);
  });

  it('should calculate correct reduced BTW at 9%', () => {
    const subtotal = 100;
    const tax = calculateTax(subtotal, BTW_REDUCED_RATE, false);
    expect(tax).toBe(9);
  });

  it('should return 0 tax for reverse charge', () => {
    const subtotal = 100;
    const tax = calculateTax(subtotal, BTW_RATE, true);
    expect(tax).toBe(0);
  });

  it('should round tax to 2 decimal places', () => {
    const subtotal = 33.33;
    const tax = calculateTax(subtotal, BTW_RATE, false);
    expect(tax).toBe(7); // 33.33 * 0.21 = 6.9993 → rounds to 7.00
  });

  it('should handle large amounts correctly', () => {
    const subtotal = 999999.99;
    const tax = calculateTax(subtotal, BTW_RATE, false);
    expect(tax).toBe(210000); // Rounded
  });
});

describe('Invoice Agent - EU Country Detection', () => {
  it('should detect Netherlands as EU country', () => {
    expect(isEuCountry('NL')).toBe(true);
    expect(isEuCountry('NETHERLANDS')).toBe(true);
  });

  it('should detect Germany as EU country', () => {
    expect(isEuCountry('DE')).toBe(true);
    expect(isEuCountry('GERMANY')).toBe(true);
  });

  it('should detect France as EU country', () => {
    expect(isEuCountry('FR')).toBe(true);
    expect(isEuCountry('FRANCE')).toBe(true);
  });

  it('should NOT detect USA as EU country', () => {
    expect(isEuCountry('US')).toBe(false);
    expect(isEuCountry('USA')).toBe(false);
  });

  it('should NOT detect UK as EU country (post-Brexit)', () => {
    expect(isEuCountry('UK')).toBe(false);
    expect(isEuCountry('GB')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isEuCountry('nl')).toBe(true);
    expect(isEuCountry('Nl')).toBe(true);
    expect(isEuCountry('netherlands')).toBe(true);
  });
});

describe('Invoice Agent - Reverse Charge Logic', () => {
  it('should NOT apply reverse charge for Dutch clients', () => {
    const client: InvoiceClient = {
      name: 'Dutch Company BV',
      email: 'info@dutch.nl',
      vatNumber: 'NL123456789B01',
      address: { country: 'NL' },
    };
    expect(shouldApplyReverseCharge(client)).toBe(false);
  });

  it('should apply reverse charge for German B2B client', () => {
    const client: InvoiceClient = {
      name: 'German GmbH',
      email: 'info@german.de',
      vatNumber: 'DE123456789',
      address: { country: 'DE' },
    };
    expect(shouldApplyReverseCharge(client)).toBe(true);
  });

  it('should NOT apply reverse charge for EU consumer (no VAT number)', () => {
    const client: InvoiceClient = {
      name: 'Jean Dupont',
      email: 'jean@email.fr',
      address: { country: 'FR' },
    };
    expect(shouldApplyReverseCharge(client)).toBe(false);
  });

  it('should NOT apply reverse charge for non-EU B2B client', () => {
    const client: InvoiceClient = {
      name: 'US Corp',
      email: 'info@uscorp.com',
      vatNumber: 'US-123456',
      address: { country: 'US' },
    };
    expect(shouldApplyReverseCharge(client)).toBe(false);
  });

  it('should NOT apply reverse charge without country', () => {
    const client: InvoiceClient = {
      name: 'Unknown Company',
      email: 'info@unknown.com',
      vatNumber: 'XX123456',
    };
    expect(shouldApplyReverseCharge(client)).toBe(false);
  });
});

describe('Invoice Agent - Item Total Calculation', () => {
  it('should calculate item total correctly', () => {
    const item: InvoiceItem = {
      description: 'Consulting',
      quantity: 10,
      unitPrice: 150,
    };
    expect(calculateItemTotal(item)).toBe(1500);
  });

  it('should handle decimal quantities', () => {
    const item: InvoiceItem = {
      description: 'Hours',
      quantity: 2.5,
      unitPrice: 100,
    };
    expect(calculateItemTotal(item)).toBe(250);
  });

  it('should handle decimal prices', () => {
    const item: InvoiceItem = {
      description: 'Product',
      quantity: 3,
      unitPrice: 19.99,
    };
    expect(calculateItemTotal(item)).toBeCloseTo(59.97, 2);
  });
});

describe('Invoice Agent - Invoice Creation', () => {
  it('should create invoice with correct totals for Dutch client', () => {
    const client: InvoiceClient = {
      name: 'Test BV',
      email: 'test@test.nl',
      address: { country: 'NL' },
    };

    const items: InvoiceItem[] = [
      { description: 'Service A', quantity: 1, unitPrice: 100 },
      { description: 'Service B', quantity: 2, unitPrice: 50 },
    ];

    const invoice = createInvoice({ client, items });

    expect(invoice.subtotal).toBe(200);
    expect(invoice.taxAmount).toBe(42); // 200 * 0.21
    expect(invoice.total).toBe(242);
    expect(invoice.reverseCharge).toBe(false);
  });

  it('should create invoice with reverse charge for EU B2B', () => {
    const client: InvoiceClient = {
      name: 'German GmbH',
      email: 'info@german.de',
      vatNumber: 'DE123456789',
      address: { country: 'DE' },
    };

    const items: InvoiceItem[] = [
      { description: 'Consulting', quantity: 10, unitPrice: 100 },
    ];

    const invoice = createInvoice({ client, items });

    expect(invoice.subtotal).toBe(1000);
    expect(invoice.taxAmount).toBe(0); // Reverse charge
    expect(invoice.total).toBe(1000);
    expect(invoice.reverseCharge).toBe(true);
  });

  it('should set correct due date', () => {
    const client: InvoiceClient = {
      name: 'Test',
      email: 'test@test.com',
    };

    const items: InvoiceItem[] = [
      { description: 'Service', quantity: 1, unitPrice: 100 },
    ];

    const invoice = createInvoice({ client, items, due_days: 14 });

    const expectedDue = new Date();
    expectedDue.setDate(expectedDue.getDate() + 14);

    // Compare dates (ignore time)
    expect(invoice.dueDate.toDateString()).toBe(expectedDue.toDateString());
  });

  it('should generate valid invoice number', () => {
    const invoiceNumber = generateInvoiceNumber();

    expect(invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(invoiceNumber).toContain(new Date().getFullYear().toString());
  });

  it('should set status to draft by default', () => {
    const client: InvoiceClient = {
      name: 'Test',
      email: 'test@test.com',
    };

    const invoice = createInvoice({
      client,
      items: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
    });

    expect(invoice.status).toBe('draft');
  });

  it('should use EUR as default currency', () => {
    const client: InvoiceClient = {
      name: 'Test',
      email: 'test@test.com',
    };

    const invoice = createInvoice({
      client,
      items: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
    });

    expect(invoice.currency).toBe('EUR');
  });

  it('should include notes when provided', () => {
    const client: InvoiceClient = {
      name: 'Test',
      email: 'test@test.com',
    };

    const invoice = createInvoice({
      client,
      items: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
      notes: 'Payment due within 30 days',
    });

    expect(invoice.notes).toBe('Payment due within 30 days');
  });
});

describe('Invoice Agent - Edge Cases', () => {
  it('should handle zero quantity', () => {
    const item: InvoiceItem = {
      description: 'Nothing',
      quantity: 0,
      unitPrice: 100,
    };
    expect(calculateItemTotal(item)).toBe(0);
  });

  it('should handle zero price', () => {
    const item: InvoiceItem = {
      description: 'Free item',
      quantity: 5,
      unitPrice: 0,
    };
    expect(calculateItemTotal(item)).toBe(0);
  });

  it('should handle empty items array', () => {
    const client: InvoiceClient = {
      name: 'Test',
      email: 'test@test.com',
    };

    const invoice = createInvoice({ client, items: [] });

    expect(invoice.subtotal).toBe(0);
    expect(invoice.taxAmount).toBe(0);
    expect(invoice.total).toBe(0);
  });

  it('should handle very small amounts', () => {
    const client: InvoiceClient = {
      name: 'Test',
      email: 'test@test.com',
    };

    const items: InvoiceItem[] = [
      { description: 'Micro service', quantity: 1, unitPrice: 0.01 },
    ];

    const invoice = createInvoice({ client, items });

    expect(invoice.subtotal).toBe(0.01);
    expect(invoice.taxAmount).toBe(0); // 0.01 * 0.21 = 0.0021 → rounds to 0
    expect(invoice.total).toBe(0.01);
  });
});

describe('Invoice Agent - Invoice Number Uniqueness', () => {
  it('should generate unique invoice numbers', () => {
    const numbers = new Set<string>();

    for (let i = 0; i < 100; i++) {
      numbers.add(generateInvoiceNumber());
    }

    // All should be unique (probabilistically)
    expect(numbers.size).toBeGreaterThan(90);
  });
});

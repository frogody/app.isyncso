// ─── Finance Copilot Insight Generator ──────────────────────────────────────
// Pure functions that transform AI extraction data into plain-language insights.
// No API calls — all client-side, deterministic, using existing extraction results.

import { ALL_COUNTRIES, EU_COUNTRIES } from './btwRules';

const EU_CODES = new Set(EU_COUNTRIES.map(c => c.code));

function getCountryName(code) {
  if (!code || code === 'UNKNOWN') return null;
  const c = ALL_COUNTRIES.find(c => c.code === code.toUpperCase());
  return c?.name || code;
}

function isEU(code) {
  return code && EU_CODES.has(code.toUpperCase());
}

function formatCurrency(amount, currency = 'EUR') {
  if (amount == null || isNaN(amount)) return null;
  const sym = currency === 'EUR' ? '\u20AC' : currency === 'USD' ? '$' : currency === 'GBP' ? '\u00A3' : `${currency} `;
  return `${sym}${Math.abs(Number(amount)).toFixed(2)}`;
}

const FREQUENCY_LABELS = {
  monthly: 'monthly',
  annual: 'yearly',
  quarterly: 'quarterly',
  weekly: 'weekly',
};

// ─── 1. Summary ─────────────────────────────────────────────────────────────

export function generateSummary(extraction, documentType, recurring, currencyConversion) {
  const vendor = extraction?.vendor?.name || 'an unknown vendor';
  const country = getCountryName(extraction?.vendor?.country);
  const total = extraction?.invoice?.total;
  const currency = extraction?.invoice?.currency || 'EUR';
  const lineItems = extraction?.line_items || [];

  const amountStr = formatCurrency(total, currency);
  const freq = recurring?.detected ? FREQUENCY_LABELS[recurring.frequency] || 'recurring' : null;

  // Build description from line items
  let description = '';
  if (lineItems.length === 1 && lineItems[0]?.description) {
    description = lineItems[0].description.length > 60
      ? lineItems[0].description.slice(0, 57) + '...'
      : lineItems[0].description;
  } else if (lineItems.length > 1) {
    description = `${lineItems.length} items`;
  }

  // Build sentence
  let sentence = 'This is ';

  if (documentType === 'credit_note') {
    sentence += `a credit note for ${amountStr || 'an unknown amount'} from ${vendor}`;
  } else if (documentType === 'proforma') {
    sentence += `a quote/proforma from ${vendor}`;
    if (amountStr) sentence += ` for ${amountStr}`;
  } else if (documentType === 'sales_invoice') {
    sentence += `a sales invoice to ${vendor}`;
    if (amountStr) sentence += ` for ${amountStr}`;
  } else {
    // expense or bill
    if (freq && amountStr) {
      sentence += `a ${amountStr}/${freq} subscription to ${vendor}`;
    } else if (amountStr) {
      sentence += `a one-time ${documentType === 'bill' ? 'bill' : 'expense'} of ${amountStr} from ${vendor}`;
    } else {
      sentence += `an ${documentType === 'bill' ? 'bill' : 'expense'} from ${vendor}`;
    }
  }

  if (country) {
    sentence += ` based in the ${country}`;
  }

  sentence += '.';

  if (description && !freq) {
    sentence += ` It covers: ${description}.`;
  }

  return sentence;
}

// ─── 2. Document Type Explanation ───────────────────────────────────────────

const DOC_TYPE_INFO = {
  expense: {
    plain: 'A business expense',
    explanation: "Something you paid for that costs your business money. It will appear in your Expenses list and reduce your taxable profit.",
    tip: "Most invoices you receive from suppliers are expenses.",
  },
  bill: {
    plain: 'A bill you need to pay',
    explanation: "An invoice from a supplier that you may still need to pay. It's tracked in your Bills list so you know what you owe and when it's due.",
    tip: "Choose this if you haven't paid yet and want to track the due date.",
  },
  sales_invoice: {
    plain: 'An invoice you sent to a customer',
    explanation: "This is money a customer owes you. It will appear in your Sales Invoices for tracking payments.",
    tip: "This was detected because the supplier on the invoice matches your own company.",
  },
  credit_note: {
    plain: 'A refund or credit',
    explanation: "This reduces a previous amount \u2014 either something you're getting back from a supplier, or a correction to a previous invoice.",
    tip: "Credit notes are usually issued when something was returned or overcharged.",
  },
  proforma: {
    plain: 'A quote (not a final invoice)',
    explanation: "This is a price estimate or draft invoice. Nothing gets posted to your books yet \u2014 it's saved as a draft for you to convert later when it becomes final.",
    tip: "You'll find this in your Drafts. You can convert it to a real expense or invoice later.",
  },
};

export function generateDocTypeExplanation(documentType) {
  return DOC_TYPE_INFO[documentType] || DOC_TYPE_INFO.expense;
}

// ─── 3. Tax & BTW Guidance ──────────────────────────────────────────────────

export function generateTaxGuidance(taxDecision, extraction) {
  if (!taxDecision) {
    return {
      headline: 'Tax information unavailable',
      explanation: 'Could not determine the tax treatment for this document.',
      whatItMeans: 'You may want to check with your accountant.',
      badge: null,
      selfAssessAmount: null,
    };
  }

  const { mechanism, self_assess_rate, supplier_country, btw_rubric, rate } = taxDecision;
  const vendor = extraction?.vendor?.name || 'this supplier';
  const country = getCountryName(supplier_country);
  const total = parseFloat(extraction?.invoice?.total) || 0;
  const selfAssessAmt = self_assess_rate ? Math.round(total * (self_assess_rate / 100) * 100) / 100 : 0;

  switch (mechanism) {
    case 'standard_btw':
      return {
        headline: 'Standard Dutch BTW applies',
        explanation: country
          ? `Since ${vendor} is based in the ${country}, normal Dutch VAT rules apply. The BTW on this invoice (${rate || 21}%) is charged by the supplier.`
          : `Standard Dutch VAT rules apply. The BTW on this invoice is charged by the supplier.`,
        whatItMeans: "The VAT amount on this invoice is your input tax (voorbelasting). You can claim it back on your BTW return. No special action needed.",
        badge: btw_rubric ? `Rubric ${btw_rubric}` : null,
        selfAssessAmount: null,
      };

    case 'reverse_charge_eu':
      return {
        headline: 'EU Reverse Charge (Verlegde BTW)',
        explanation: `${vendor} is in ${country || 'an EU country'} (within the EU but outside the Netherlands). Under EU rules, the VAT is "reversed" to you as the buyer. This means the invoice has no VAT on it, but you need to self-assess ${self_assess_rate || 21}% Dutch BTW.`,
        whatItMeans: selfAssessAmt
          ? `Don't worry \u2014 I've set this up for you. You'll report \u20AC${selfAssessAmt.toFixed(2)} on your BTW return (box 4b) and immediately deduct the same amount as input tax. Net extra cost to you: \u20AC0.`
          : `You'll report the BTW on your return (box 4b) and immediately deduct it. Net effect: zero.`,
        badge: 'Rubric 4b',
        selfAssessAmount: selfAssessAmt,
      };

    case 'reverse_charge_non_eu':
      return {
        headline: 'Non-EU Service \u2014 Reverse Charge',
        explanation: `${vendor} is in ${country || 'a country outside the EU'}. For services from outside the EU, you must self-assess ${self_assess_rate || 21}% Dutch BTW yourself.`,
        whatItMeans: selfAssessAmt
          ? `This goes in box 4a of your BTW return. You add \u20AC${selfAssessAmt.toFixed(2)} BTW yourself and immediately deduct the same amount. Net extra cost: \u20AC0. I've already set this up correctly.`
          : `You add the BTW yourself on your return (box 4a) and immediately deduct it. Net effect: zero.`,
        badge: 'Rubric 4a',
        selfAssessAmount: selfAssessAmt,
      };

    case 'import_no_vat':
      return {
        headline: 'Import from Outside EU',
        explanation: `${vendor} is in ${country || 'a country outside the EU'}. For physical goods imported from outside the EU, customs handles the VAT separately when the goods enter the Netherlands.`,
        whatItMeans: "You may receive a separate customs declaration with import VAT. Keep that document \u2014 you can claim the import VAT back on your BTW return.",
        badge: null,
        selfAssessAmount: null,
      };

    default:
      return {
        headline: 'Tax treatment',
        explanation: taxDecision.explanation || 'Tax classification determined.',
        whatItMeans: 'Check with your accountant if you are unsure.',
        badge: btw_rubric ? `Rubric ${btw_rubric}` : null,
        selfAssessAmount: null,
      };
  }
}

// ─── 4. Category Insight ────────────────────────────────────────────────────

const CATEGORY_INFO = {
  software: {
    label: 'Software & Tools',
    reason: (v) => `${v} appears to be a software or digital tool/service provider.`,
    glCode: '6100',
    deductible: true,
  },
  hosting: {
    label: 'Hosting & Cloud',
    reason: (v) => `${v} provides hosting, server, domain, or cloud infrastructure services.`,
    glCode: '6110',
    deductible: true,
  },
  advertising: {
    label: 'Advertising & Promotion',
    reason: (v) => `${v} appears to be a marketing, advertising, or promotion platform.`,
    glCode: '6300',
    deductible: true,
  },
  telecom: {
    label: 'Telecom & Internet',
    reason: (v) => `${v} is a telecommunications or internet service provider.`,
    glCode: '6400',
    deductible: true,
  },
  travel: {
    label: 'Travel & Transport',
    reason: (v) => `${v} is related to travel, transport, or accommodation.`,
    glCode: '6200',
    deductible: true,
  },
  professional_services: {
    label: 'Professional Services',
    reason: (v) => `${v} provides consulting, legal, accounting, or other professional services.`,
    glCode: '6700',
    deductible: true,
  },
  office_supplies: {
    label: 'Office Supplies',
    reason: (v) => `${v} appears to sell office supplies, furniture, or equipment.`,
    glCode: '5000',
    deductible: true,
  },
  insurance: {
    label: 'Insurance',
    reason: (v) => `${v} is an insurance or coverage provider.`,
    glCode: '6500',
    deductible: true,
  },
  rent: {
    label: 'Rent & Office Space',
    reason: (v) => `${v} charges for office space, rent, or workspace.`,
    glCode: '6600',
    deductible: true,
  },
  utilities: {
    label: 'Utilities',
    reason: (v) => `${v} is a utility provider (energy, water, etc.).`,
    glCode: '6200',
    deductible: true,
  },
  other: {
    label: 'Other / Uncategorized',
    reason: () => "I couldn't automatically determine the best category for this expense.",
    glCode: '6900',
    deductible: true,
  },
};

export function generateCategoryInsight(category, vendorName, lineItems) {
  const cat = CATEGORY_INFO[category] || CATEGORY_INFO.other;
  const vendor = vendorName || 'this vendor';

  return {
    label: cat.label,
    reason: `I classified this under "${cat.label}" because ${cat.reason(vendor)}`,
    glCode: cat.glCode,
    deductible: cat.deductible,
    deductibilityNote: cat.deductible
      ? `This is likely tax-deductible as a business expense (General Ledger code ${cat.glCode}).`
      : 'This may not be fully tax-deductible. Check with your accountant.',
    changeable: true,
    changeHint: 'You can change the category in the form above if this doesn\'t look right.',
  };
}

// ─── 5. Next Steps / What Happens on Save ───────────────────────────────────

const DESTINATION_LABELS = {
  expense: 'your Expenses list',
  bill: 'your Bills (payables) list',
  sales_invoice: 'your Sales Invoices',
  credit_note: 'your Credit Notes',
  proforma: 'Drafts (as a draft expense)',
};

export function generateNextSteps(documentType, formData, recurring, vendorMatch, currencyConversion) {
  const steps = [];

  // Where it goes
  steps.push({
    text: `Saved to ${DESTINATION_LABELS[documentType] || 'your records'}`,
    icon: 'save',
  });

  // GL posting
  if (documentType !== 'proforma') {
    steps.push({
      text: 'Automatically posted to your General Ledger',
      icon: 'ledger',
    });
  }

  // Recurring
  if (recurring?.detected) {
    const freq = FREQUENCY_LABELS[recurring.frequency] || 'recurring';
    const nextDate = recurring.suggested_next_date;
    steps.push({
      text: nextDate
        ? `${freq.charAt(0).toUpperCase() + freq.slice(1)} recurring template created (next: ${nextDate})`
        : `${freq.charAt(0).toUpperCase() + freq.slice(1)} recurring template created`,
      icon: 'recurring',
    });
    steps.push({
      text: 'Added to your Subscriptions tracker',
      icon: 'subscription',
    });
  }

  // Vendor creation
  if (vendorMatch?.match_type === 'new' && formData?.vendor_name) {
    steps.push({
      text: `${formData.vendor_name} added as a new vendor in your system`,
      icon: 'vendor',
    });
  }

  // Currency conversion
  if (currencyConversion && formData?.currency && formData.currency !== 'EUR') {
    steps.push({
      text: `Amount converted to EUR at exchange rate ${currencyConversion.exchange_rate || '(auto)'}`,
      icon: 'currency',
    });
  }

  return steps;
}

import jsPDF from 'jspdf';

// In-memory logo cache for the session
const logoCache = new Map();

/**
 * Convert hex color to RGB array
 * @param {string} hex - Hex color string (e.g. "#22d3ee")
 * @returns {number[]} RGB array [r, g, b]
 */
function hexToRgb(hex) {
  if (!hex) return null;
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

/**
 * Fetch a logo URL and convert to base64 data URL
 * Caches result in memory for subsequent calls in the same session
 * @param {string} url - Image URL to fetch
 * @returns {Promise<{dataUrl: string, format: string}|null>}
 */
async function loadLogoAsBase64(url) {
  if (!url) return null;
  if (logoCache.has(url)) return logoCache.get(url);

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const format = blob.type.includes('png') ? 'PNG' : 'JPEG';

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = { dataUrl: reader.result, format };
        logoCache.set(url, result);
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generate a professional invoice PDF
 * Supports branded templates when brandConfig is provided.
 * Falls back to original hardcoded layout when brandConfig is null.
 *
 * @param {Object} invoice - Invoice data
 * @param {Object} company - Company info (optional)
 * @param {Object|null} brandConfig - Brand configuration (optional)
 * @param {Object} brandConfig.colors - { primary, secondary, accent, background, text } hex values
 * @param {Object} brandConfig.branding - invoice_branding JSONB from companies table
 * @param {string|null} brandConfig.logoDataUrl - Pre-loaded logo base64 data URL
 * @param {string} brandConfig.logoFormat - 'PNG' or 'JPEG'
 * @returns {jsPDF} - PDF document
 */
export async function generateInvoicePDF(invoice, company = {}, brandConfig = null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // If no brand config, render original hardcoded layout
  if (!brandConfig || !brandConfig.branding?.enabled) {
    return renderOriginalTemplate(doc, invoice, pageWidth, pageHeight, margin);
  }

  const template = brandConfig.branding?.template || 'modern';
  switch (template) {
    case 'classic':
      return renderClassicTemplate(doc, invoice, company, brandConfig, pageWidth, pageHeight, margin);
    case 'minimal':
      return renderMinimalTemplate(doc, invoice, company, brandConfig, pageWidth, pageHeight, margin);
    case 'modern':
    default:
      return renderModernTemplate(doc, invoice, company, brandConfig, pageWidth, pageHeight, margin);
  }
}

// ============================================================
// SHARED HELPERS
// ============================================================

function getColors(brandConfig) {
  const brandPrimary = hexToRgb(brandConfig?.colors?.primary);
  const brandAccent = hexToRgb(brandConfig?.colors?.accent);
  return {
    primary: brandPrimary || [34, 211, 238],
    accent: brandAccent || brandPrimary || [34, 211, 238],
    dark: [24, 24, 27],
    gray: [113, 113, 122],
    lightGray: [161, 161, 170],
    white: [255, 255, 255],
    tableHeader: [244, 244, 245],
    tableAlt: [250, 250, 250],
    divider: [228, 228, 231],
  };
}

function makeHelpers(doc) {
  return {
    setColor: (c) => doc.setTextColor(c[0], c[1], c[2]),
    setDraw: (c) => doc.setDrawColor(c[0], c[1], c[2]),
    setFill: (c) => doc.setFillColor(c[0], c[1], c[2]),
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderLineItems(doc, invoice, y, margin, pageWidth, colors, helpers) {
  const { setColor, setFill } = helpers;
  const items = invoice.items || [];
  let subtotal = 0;

  // Table header
  setFill(colors.tableHeader);
  doc.rect(margin, y - 4, pageWidth - (margin * 2), 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('DESCRIPTION', margin + 3, y + 2);
  doc.text('QTY', pageWidth - margin - 70, y + 2, { align: 'center' });
  doc.text('PRICE', pageWidth - margin - 40, y + 2, { align: 'right' });
  doc.text('AMOUNT', pageWidth - margin - 3, y + 2, { align: 'right' });

  y += 12;
  doc.setFont('helvetica', 'normal');

  items.forEach((item, index) => {
    const quantity = item.quantity || 1;
    const price = parseFloat(item.unit_price) || 0;
    const amount = quantity * price;
    subtotal += amount;

    const description = item.name || item.description || 'Item';
    const descLines = doc.splitTextToSize(description, 80);

    if (index % 2 === 1) {
      setFill(colors.tableAlt);
      doc.rect(margin, y - 4, pageWidth - (margin * 2), descLines.length * 5 + 4, 'F');
    }

    doc.setFontSize(10);
    setColor(colors.dark);
    descLines.forEach((line, i) => {
      doc.text(line, margin + 3, y + (i * 5));
    });

    if (item.is_subscription) {
      doc.setFontSize(8);
      setColor(colors.primary);
      doc.text(`(${item.billing_cycle || 'monthly'})`, margin + 3, y + (descLines.length * 5));
    }

    doc.setFontSize(10);
    setColor(colors.dark);
    doc.text(quantity.toString(), pageWidth - margin - 70, y, { align: 'center' });
    doc.text(`\u20AC${price.toFixed(2)}`, pageWidth - margin - 40, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`\u20AC${amount.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += Math.max(descLines.length * 5, 8) + 4;
  });

  if (items.length === 0) {
    doc.setFontSize(10);
    setColor(colors.gray);
    doc.text('No line items', margin + 3, y);
    y += 8;
    subtotal = invoice.total || 0;
  }

  return { y, subtotal };
}

function renderTotals(doc, invoice, y, subtotal, margin, pageWidth, colors, helpers) {
  const { setColor, setDraw, setFill } = helpers;
  const totalX = pageWidth - margin - 80;

  y += 5;
  setDraw(colors.divider);
  doc.line(totalX, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  doc.text('Subtotal', totalX, y);
  setColor(colors.dark);
  doc.text(`\u20AC${subtotal.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
  y += 6;

  if (invoice.tax_percent || invoice.tax_amount) {
    const taxAmount = invoice.tax_amount || (subtotal * (invoice.tax_percent || 0) / 100);
    setColor(colors.gray);
    doc.text(`Tax (${invoice.tax_percent || 0}%)`, totalX, y);
    setColor(colors.dark);
    doc.text(`\u20AC${taxAmount.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
    y += 6;
  }

  if (invoice.discount_amount && invoice.discount_amount > 0) {
    setColor(colors.gray);
    doc.text('Discount', totalX, y);
    setColor([34, 197, 94]);
    doc.text(`-\u20AC${invoice.discount_amount.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
    y += 6;
  }

  y += 2;
  setFill(colors.primary);
  doc.rect(totalX - 5, y - 4, pageWidth - totalX - margin + 8, 12, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(colors.white);
  doc.text('TOTAL', totalX, y + 3);

  const total = invoice.total || subtotal;
  doc.setFontSize(12);
  doc.text(`\u20AC${total.toFixed(2)}`, pageWidth - margin - 3, y + 3, { align: 'right' });

  return y;
}

function renderNotes(doc, invoice, y, margin, pageWidth, colors, helpers) {
  const { setColor } = helpers;
  if (!invoice.description) return y;

  y += 25;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('NOTES', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  setColor(colors.dark);
  const noteLines = doc.splitTextToSize(invoice.description, pageWidth - (margin * 2));
  noteLines.forEach(line => {
    doc.text(line, margin, y);
    y += 4;
  });
  return y;
}

function renderPaymentTerms(doc, branding, y, margin, pageWidth, colors, helpers) {
  const { setColor } = helpers;
  if (!branding?.payment_terms) return y;

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('PAYMENT TERMS', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  setColor(colors.dark);
  const termLines = doc.splitTextToSize(branding.payment_terms, pageWidth - (margin * 2));
  termLines.forEach(line => {
    doc.text(line, margin, y);
    y += 4;
  });
  return y;
}

function renderBankDetails(doc, branding, footerY, margin, pageWidth, colors, helpers) {
  const { setColor } = helpers;
  if (!branding?.show_bank_details) return footerY;

  const hasBank = branding.iban || branding.bank_name;
  if (!hasBank) return footerY;

  let bankY = footerY - 30;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('BANK DETAILS', margin, bankY);
  bankY += 4;

  doc.setFont('helvetica', 'normal');
  setColor(colors.dark);

  if (branding.bank_name) {
    doc.text(`Bank: ${branding.bank_name}`, margin, bankY);
    bankY += 3.5;
  }
  if (branding.iban) {
    doc.text(`IBAN: ${branding.iban}`, margin, bankY);
    bankY += 3.5;
  }
  if (branding.bic) {
    doc.text(`BIC: ${branding.bic}`, margin, bankY);
    bankY += 3.5;
  }

  return footerY;
}

function renderBrandedFooter(doc, branding, footerY, margin, pageWidth, colors, helpers) {
  const { setColor, setDraw } = helpers;

  setDraw(colors.divider);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);

  const footerText = branding?.footer_text || 'Thank you for your business!';
  doc.text(footerText, pageWidth / 2, footerY - 3, { align: 'center' });
}

function addLogo(doc, brandConfig, x, y, maxW, maxH) {
  if (!brandConfig?.logoDataUrl) return false;
  try {
    doc.addImage(brandConfig.logoDataUrl, brandConfig.logoFormat || 'PNG', x, y, maxW, maxH);
    return true;
  } catch {
    return false;
  }
}

function renderCompanyFromSection(doc, company, branding, x, y, colors, helpers) {
  const { setColor } = helpers;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('FROM', x, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(colors.dark);
  doc.text(company?.name || company?.company_name || 'Your Company', x, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);

  if (branding?.company_address) {
    const lines = doc.splitTextToSize(branding.company_address, 75);
    lines.forEach(line => {
      doc.text(line, x, y);
      y += 4;
    });
  }
  if (branding?.company_phone) {
    doc.text(branding.company_phone, x, y);
    y += 4;
  }
  if (branding?.company_email) {
    doc.text(branding.company_email, x, y);
    y += 4;
  }
  if (branding?.company_vat) {
    doc.text(`VAT: ${branding.company_vat}`, x, y);
    y += 4;
  }
  return y;
}

// ============================================================
// ORIGINAL TEMPLATE (no branding — backward compatible)
// ============================================================

function renderOriginalTemplate(doc, invoice, pageWidth, pageHeight, margin) {
  let y = margin;
  const primaryColor = [34, 211, 238];
  const darkColor = [24, 24, 27];
  const grayColor = [113, 113, 122];
  const colors = { primary: primaryColor, dark: darkColor, gray: grayColor, white: [255, 255, 255], tableHeader: [244, 244, 245], tableAlt: [250, 250, 250], divider: [228, 228, 231] };
  const helpers = makeHelpers(doc);
  const { setColor, setFill, setDraw } = helpers;

  // Header background
  setFill([10, 10, 10]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  setColor([255, 255, 255]);
  doc.text('iSyncSO', margin, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(primaryColor);
  doc.text('INVOICE', margin, 35);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor([255, 255, 255]);
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id?.slice(0, 8) || '000000'}`;
  doc.text(invoiceNumber, pageWidth - margin, 25, { align: 'right' });

  const status = (invoice.status || 'draft').toUpperCase();
  const statusColors = { 'DRAFT': [113, 113, 122], 'SENT': [251, 191, 36], 'PENDING': [251, 191, 36], 'PAID': [34, 197, 94], 'OVERDUE': [239, 68, 68] };
  const statusColor = statusColors[status] || grayColor;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(statusColor);
  doc.text(status, pageWidth - margin, 35, { align: 'right' });

  y = 60;

  // Bill To
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(grayColor);
  doc.text('BILL TO', margin, y);
  y += 6;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setColor(darkColor);
  doc.text(invoice.client_name || 'Client Name', margin, y);
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(grayColor);
  if (invoice.client_email) { doc.text(invoice.client_email, margin, y); y += 5; }
  const clientAddress = typeof invoice.client_address === 'string' ? invoice.client_address : (invoice.client_address?.street || '');
  if (clientAddress) {
    doc.splitTextToSize(clientAddress, 80).forEach(line => { doc.text(line, margin, y); y += 4; });
  }

  // Invoice Details (right)
  let rightY = 60;
  const rightCol = pageWidth - margin - 50;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(grayColor);
  doc.text('INVOICE DETAILS', rightCol, rightY);
  rightY += 8;
  [
    { label: 'Invoice Date:', value: formatDate(invoice.created_at) },
    { label: 'Due Date:', value: formatDate(invoice.due_date) },
  ].forEach(({ label, value }) => {
    doc.setFont('helvetica', 'normal'); setColor(grayColor); doc.text(label, rightCol, rightY);
    doc.setFont('helvetica', 'bold'); setColor(darkColor); doc.text(value, rightCol + 50, rightY, { align: 'right' });
    rightY += 5;
  });

  y = Math.max(y, rightY) + 15;
  const { y: itemsY, subtotal } = renderLineItems(doc, invoice, y, margin, pageWidth, colors, helpers);
  y = renderTotals(doc, invoice, itemsY, subtotal, margin, pageWidth, colors, helpers);
  y = renderNotes(doc, invoice, y, margin, pageWidth, colors, helpers);

  // Footer
  const footerY = pageHeight - 20;
  setDraw([228, 228, 231]);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(grayColor);
  doc.text('Thank you for your business!', pageWidth / 2, footerY - 3, { align: 'center' });
  doc.text('Generated by iSyncSO', pageWidth / 2, footerY + 2, { align: 'center' });

  return doc;
}

// ============================================================
// MODERN TEMPLATE — Dark header bar with brand color accents
// ============================================================

function renderModernTemplate(doc, invoice, company, brandConfig, pageWidth, pageHeight, margin) {
  const branding = brandConfig.branding || {};
  const colors = getColors(brandConfig);
  const helpers = makeHelpers(doc);
  const { setColor, setFill } = helpers;

  // Dark header bar
  setFill([10, 10, 10]);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Accent stripe at bottom of header
  setFill(colors.primary);
  doc.rect(0, 55, pageWidth, 1.5, 'F');

  // Logo or company name
  let headerTextX = margin;
  const hasLogo = addLogo(doc, brandConfig, margin, 8, 35, 18);
  if (hasLogo) {
    headerTextX = margin; // Name below logo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    setColor(colors.white);
    doc.text(company?.name || company?.company_name || '', margin, 34);
  } else {
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    setColor(colors.white);
    doc.text(company?.name || company?.company_name || 'Your Company', margin, 22);
  }

  // INVOICE label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(colors.primary);
  doc.text('INVOICE', margin, hasLogo ? 42 : 32);

  // Invoice number (right)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(colors.white);
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id?.slice(0, 8) || '000000'}`;
  doc.text(invoiceNumber, pageWidth - margin, 22, { align: 'right' });

  // Status
  const status = (invoice.status || 'draft').toUpperCase();
  const statusColors = { 'DRAFT': [113, 113, 122], 'SENT': [251, 191, 36], 'PENDING': [251, 191, 36], 'PAID': [34, 197, 94], 'OVERDUE': [239, 68, 68] };
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(statusColors[status] || colors.gray);
  doc.text(status, pageWidth - margin, 32, { align: 'right' });

  let y = 65;

  // FROM section (left)
  const fromEndY = renderCompanyFromSection(doc, company, branding, margin, y, colors, helpers);

  // BILL TO section (right of from, or below if from is long)
  const billToX = pageWidth / 2 + 5;
  let billY = y;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('BILL TO', billToX, billY);
  billY += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(colors.dark);
  doc.text(invoice.client_name || 'Client Name', billToX, billY);
  billY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  if (invoice.client_email) { doc.text(invoice.client_email, billToX, billY); billY += 4; }
  const clientAddress = typeof invoice.client_address === 'string' ? invoice.client_address : (invoice.client_address?.street || '');
  if (clientAddress) {
    doc.splitTextToSize(clientAddress, 70).forEach(line => { doc.text(line, billToX, billY); billY += 4; });
  }

  // Invoice details below bill-to
  billY += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  doc.text(`Date: ${formatDate(invoice.created_at)}`, billToX, billY);
  billY += 4;
  doc.text(`Due: ${formatDate(invoice.due_date)}`, billToX, billY);

  y = Math.max(fromEndY, billY) + 12;

  // Line items
  const { y: itemsY, subtotal } = renderLineItems(doc, invoice, y, margin, pageWidth, colors, helpers);
  y = renderTotals(doc, invoice, itemsY, subtotal, margin, pageWidth, colors, helpers);
  y = renderNotes(doc, invoice, y, margin, pageWidth, colors, helpers);
  y = renderPaymentTerms(doc, branding, y, margin, pageWidth, colors, helpers);

  // Footer area
  const footerY = pageHeight - 20;
  renderBankDetails(doc, branding, footerY, margin, pageWidth, colors, helpers);
  renderBrandedFooter(doc, branding, footerY, margin, pageWidth, colors, helpers);

  return doc;
}

// ============================================================
// CLASSIC TEMPLATE — White header, thin colored accent line
// ============================================================

function renderClassicTemplate(doc, invoice, company, brandConfig, pageWidth, pageHeight, margin) {
  const branding = brandConfig.branding || {};
  const colors = getColors(brandConfig);
  const helpers = makeHelpers(doc);
  const { setColor, setFill, setDraw } = helpers;

  let y = margin;

  // Logo + company name (top left)
  const hasLogo = addLogo(doc, brandConfig, margin, y - 5, 28, 14);
  const textX = hasLogo ? margin + 32 : margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  setColor(colors.dark);
  doc.text(company?.name || company?.company_name || 'Your Company', textX, y + 5);

  // Company details below name
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  let compY = y + 10;
  if (branding.company_address) { doc.text(branding.company_address, textX, compY); compY += 3.5; }
  if (branding.company_phone) { doc.text(branding.company_phone, textX, compY); compY += 3.5; }
  if (branding.company_email) { doc.text(branding.company_email, textX, compY); compY += 3.5; }
  if (branding.company_vat) { doc.text(`VAT: ${branding.company_vat}`, textX, compY); compY += 3.5; }

  // INVOICE title (right)
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setColor(colors.primary);
  doc.text('INVOICE', pageWidth - margin, y + 5, { align: 'right' });

  // Invoice number below title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setColor(colors.dark);
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id?.slice(0, 8) || '000000'}`;
  doc.text(invoiceNumber, pageWidth - margin, y + 13, { align: 'right' });

  // Status
  const status = (invoice.status || 'draft').toUpperCase();
  const statusColors = { 'DRAFT': [113, 113, 122], 'SENT': [251, 191, 36], 'PENDING': [251, 191, 36], 'PAID': [34, 197, 94], 'OVERDUE': [239, 68, 68] };
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(statusColors[status] || colors.gray);
  doc.text(status, pageWidth - margin, y + 19, { align: 'right' });

  // Thin accent line
  y = Math.max(compY, y + 24) + 5;
  setFill(colors.primary);
  doc.rect(margin, y, pageWidth - (margin * 2), 1, 'F');
  y += 8;

  // Bill To section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('BILL TO', margin, y);

  // Invoice Details (right column)
  const rightCol = pageWidth - margin - 50;
  doc.text('INVOICE DETAILS', rightCol, y);

  y += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(colors.dark);
  doc.text(invoice.client_name || 'Client Name', margin, y);

  let rightY = y;
  doc.setFontSize(9);
  [
    { label: 'Date:', value: formatDate(invoice.created_at) },
    { label: 'Due:', value: formatDate(invoice.due_date) },
  ].forEach(({ label, value }) => {
    doc.setFont('helvetica', 'normal'); setColor(colors.gray); doc.text(label, rightCol, rightY);
    doc.setFont('helvetica', 'bold'); setColor(colors.dark); doc.text(value, rightCol + 50, rightY, { align: 'right' });
    rightY += 5;
  });

  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  if (invoice.client_email) { doc.text(invoice.client_email, margin, y); y += 4; }
  const clientAddress = typeof invoice.client_address === 'string' ? invoice.client_address : (invoice.client_address?.street || '');
  if (clientAddress) {
    doc.splitTextToSize(clientAddress, 80).forEach(line => { doc.text(line, margin, y); y += 4; });
  }

  y = Math.max(y, rightY) + 12;

  // Line items with bordered table
  setDraw(colors.divider);
  doc.rect(margin, y - 4, pageWidth - (margin * 2), 10);
  setFill(colors.tableHeader);
  doc.rect(margin, y - 4, pageWidth - (margin * 2), 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('DESCRIPTION', margin + 3, y + 2);
  doc.text('QTY', pageWidth - margin - 70, y + 2, { align: 'center' });
  doc.text('PRICE', pageWidth - margin - 40, y + 2, { align: 'right' });
  doc.text('AMOUNT', pageWidth - margin - 3, y + 2, { align: 'right' });

  y += 12;
  const items = invoice.items || [];
  let subtotal = 0;
  doc.setFont('helvetica', 'normal');

  items.forEach((item, index) => {
    const quantity = item.quantity || 1;
    const price = parseFloat(item.unit_price) || 0;
    const amount = quantity * price;
    subtotal += amount;
    const description = item.name || item.description || 'Item';
    const descLines = doc.splitTextToSize(description, 80);

    if (index % 2 === 1) {
      setFill(colors.tableAlt);
      doc.rect(margin, y - 4, pageWidth - (margin * 2), descLines.length * 5 + 4, 'F');
    }
    // Draw side borders
    setDraw(colors.divider);
    doc.line(margin, y - 4, margin, y + descLines.length * 5);
    doc.line(pageWidth - margin, y - 4, pageWidth - margin, y + descLines.length * 5);

    doc.setFontSize(10);
    setColor(colors.dark);
    descLines.forEach((line, i) => { doc.text(line, margin + 3, y + (i * 5)); });
    if (item.is_subscription) {
      doc.setFontSize(8); setColor(colors.primary);
      doc.text(`(${item.billing_cycle || 'monthly'})`, margin + 3, y + (descLines.length * 5));
    }
    doc.setFontSize(10); setColor(colors.dark);
    doc.text(quantity.toString(), pageWidth - margin - 70, y, { align: 'center' });
    doc.text(`\u20AC${price.toFixed(2)}`, pageWidth - margin - 40, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`\u20AC${amount.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += Math.max(descLines.length * 5, 8) + 4;
  });

  // Bottom border of table
  setDraw(colors.divider);
  doc.line(margin, y - 4, pageWidth - margin, y - 4);

  if (items.length === 0) {
    doc.setFontSize(10); setColor(colors.gray);
    doc.text('No line items', margin + 3, y); y += 8;
    subtotal = invoice.total || 0;
  }

  y = renderTotals(doc, invoice, y, subtotal, margin, pageWidth, colors, helpers);
  y = renderNotes(doc, invoice, y, margin, pageWidth, colors, helpers);
  y = renderPaymentTerms(doc, branding, y, margin, pageWidth, colors, helpers);

  const footerY = pageHeight - 20;
  renderBankDetails(doc, branding, footerY, margin, pageWidth, colors, helpers);
  renderBrandedFooter(doc, branding, footerY, margin, pageWidth, colors, helpers);

  return doc;
}

// ============================================================
// MINIMAL TEMPLATE — Clean, lots of whitespace, thin lines
// ============================================================

function renderMinimalTemplate(doc, invoice, company, brandConfig, pageWidth, pageHeight, margin) {
  const branding = brandConfig.branding || {};
  const colors = getColors(brandConfig);
  const helpers = makeHelpers(doc);
  const { setColor, setDraw } = helpers;

  let y = margin;

  // Small logo top-left
  const hasLogo = addLogo(doc, brandConfig, margin, y - 3, 20, 10);

  // Invoice number top-right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  doc.text('INVOICE', pageWidth - margin, y, { align: 'right' });

  y += 5;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(colors.dark);
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id?.slice(0, 8) || '000000'}`;
  doc.text(invoiceNumber, pageWidth - margin, y, { align: 'right' });

  // Status
  y += 5;
  const status = (invoice.status || 'draft').toUpperCase();
  const statusColors = { 'DRAFT': [113, 113, 122], 'SENT': [251, 191, 36], 'PENDING': [251, 191, 36], 'PAID': [34, 197, 94], 'OVERDUE': [239, 68, 68] };
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(statusColors[status] || colors.gray);
  doc.text(status, pageWidth - margin, y, { align: 'right' });

  y = hasLogo ? margin + 16 : margin + 14;

  // Thin separator
  setDraw(colors.divider);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // From / Bill To side by side
  const midX = pageWidth / 2;

  // FROM
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('FROM', margin, y);

  let fromY = y + 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setColor(colors.dark);
  doc.text(company?.name || company?.company_name || 'Your Company', margin, fromY);
  fromY += 4.5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  if (branding.company_address) {
    doc.splitTextToSize(branding.company_address, 70).forEach(line => { doc.text(line, margin, fromY); fromY += 3.5; });
  }
  if (branding.company_email) { doc.text(branding.company_email, margin, fromY); fromY += 3.5; }
  if (branding.company_phone) { doc.text(branding.company_phone, margin, fromY); fromY += 3.5; }
  if (branding.company_vat) { doc.text(`VAT: ${branding.company_vat}`, margin, fromY); fromY += 3.5; }

  // BILL TO
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('BILL TO', midX, y);

  let billY = y + 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setColor(colors.dark);
  doc.text(invoice.client_name || 'Client Name', midX, billY);
  billY += 4.5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  if (invoice.client_email) { doc.text(invoice.client_email, midX, billY); billY += 3.5; }
  const clientAddress = typeof invoice.client_address === 'string' ? invoice.client_address : (invoice.client_address?.street || '');
  if (clientAddress) {
    doc.splitTextToSize(clientAddress, 70).forEach(line => { doc.text(line, midX, billY); billY += 3.5; });
  }

  // Dates
  billY += 2;
  doc.setFontSize(8);
  setColor(colors.gray);
  doc.text(`Date: ${formatDate(invoice.created_at)}`, midX, billY);
  billY += 3.5;
  doc.text(`Due: ${formatDate(invoice.due_date)}`, midX, billY);

  y = Math.max(fromY, billY) + 10;

  // Thin line above table
  setDraw(colors.divider);
  doc.line(margin, y - 5, pageWidth - margin, y - 5);

  // Line items (minimal style - no fill backgrounds)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(colors.gray);
  doc.text('DESCRIPTION', margin + 2, y);
  doc.text('QTY', pageWidth - margin - 65, y, { align: 'center' });
  doc.text('PRICE', pageWidth - margin - 35, y, { align: 'right' });
  doc.text('AMOUNT', pageWidth - margin - 2, y, { align: 'right' });

  y += 3;
  setDraw(colors.divider);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const items = invoice.items || [];
  let subtotal = 0;
  doc.setFont('helvetica', 'normal');

  items.forEach((item) => {
    const quantity = item.quantity || 1;
    const price = parseFloat(item.unit_price) || 0;
    const amount = quantity * price;
    subtotal += amount;
    const description = item.name || item.description || 'Item';
    const descLines = doc.splitTextToSize(description, 85);

    doc.setFontSize(9);
    setColor(colors.dark);
    descLines.forEach((line, i) => { doc.text(line, margin + 2, y + (i * 4.5)); });
    if (item.is_subscription) {
      doc.setFontSize(7); setColor(colors.primary);
      doc.text(`(${item.billing_cycle || 'monthly'})`, margin + 2, y + (descLines.length * 4.5));
    }
    doc.setFontSize(9); setColor(colors.dark);
    doc.text(quantity.toString(), pageWidth - margin - 65, y, { align: 'center' });
    doc.text(`\u20AC${price.toFixed(2)}`, pageWidth - margin - 35, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`\u20AC${amount.toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += Math.max(descLines.length * 4.5, 7) + 3;
  });

  if (items.length === 0) {
    doc.setFontSize(9); setColor(colors.gray);
    doc.text('No line items', margin + 2, y); y += 6;
    subtotal = invoice.total || 0;
  }

  // Totals with single accent color
  const totalX = pageWidth - margin - 75;
  y += 3;
  setDraw(colors.divider);
  doc.line(totalX, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  doc.text('Subtotal', totalX, y);
  setColor(colors.dark);
  doc.text(`\u20AC${subtotal.toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
  y += 5;

  if (invoice.tax_percent || invoice.tax_amount) {
    const taxAmount = invoice.tax_amount || (subtotal * (invoice.tax_percent || 0) / 100);
    setColor(colors.gray);
    doc.text(`Tax (${invoice.tax_percent || 0}%)`, totalX, y);
    setColor(colors.dark);
    doc.text(`\u20AC${taxAmount.toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
    y += 5;
  }

  if (invoice.discount_amount && invoice.discount_amount > 0) {
    setColor(colors.gray);
    doc.text('Discount', totalX, y);
    setColor([34, 197, 94]);
    doc.text(`-\u20AC${invoice.discount_amount.toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
    y += 5;
  }

  // Total line with accent underline only
  y += 2;
  setDraw(colors.primary);
  doc.setLineWidth(0.8);
  doc.line(totalX, y - 1, pageWidth - margin, y - 1);
  doc.setLineWidth(0.2); // reset

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(colors.primary);
  doc.text('TOTAL', totalX, y + 4);

  const total = invoice.total || subtotal;
  doc.setFontSize(12);
  setColor(colors.dark);
  doc.text(`\u20AC${total.toFixed(2)}`, pageWidth - margin - 2, y + 4, { align: 'right' });

  y += 4;
  y = renderNotes(doc, invoice, y, margin, pageWidth, colors, helpers);
  y = renderPaymentTerms(doc, branding, y, margin, pageWidth, colors, helpers);

  // Bottom area: company info + bank details
  const footerY = pageHeight - 15;

  // Bank details (bottom-left)
  if (branding.show_bank_details && (branding.iban || branding.bank_name)) {
    let bankY = footerY - 22;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    setColor(colors.gray);
    doc.text('BANK DETAILS', margin, bankY);
    bankY += 3.5;
    doc.setFont('helvetica', 'normal');
    if (branding.bank_name) { doc.text(`Bank: ${branding.bank_name}`, margin, bankY); bankY += 3; }
    if (branding.iban) { doc.text(`IBAN: ${branding.iban}`, margin, bankY); bankY += 3; }
    if (branding.bic) { doc.text(`BIC: ${branding.bic}`, margin, bankY); }
  }

  // Footer
  setDraw(colors.divider);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setColor(colors.gray);
  const footerText = branding.footer_text || 'Thank you for your business!';
  doc.text(footerText, pageWidth / 2, footerY - 2, { align: 'center' });

  return doc;
}

// ============================================================
// PUBLIC API — Download & Preview (now async)
// ============================================================

/**
 * Download invoice as PDF
 * @param {Object} invoice - Invoice data
 * @param {Object} company - Company info (optional)
 * @param {Object|null} brandConfig - Brand config (optional)
 */
export async function downloadInvoicePDF(invoice, company = {}, brandConfig = null) {
  const doc = await generateInvoicePDF(invoice, company, brandConfig);
  const filename = `Invoice-${invoice.invoice_number || invoice.id?.slice(0, 8) || 'draft'}.pdf`;
  doc.save(filename);
}

/**
 * Open invoice PDF in new tab for preview
 * @param {Object} invoice - Invoice data
 * @param {Object} company - Company info (optional)
 * @param {Object|null} brandConfig - Brand config (optional)
 */
export async function previewInvoicePDF(invoice, company = {}, brandConfig = null) {
  const doc = await generateInvoicePDF(invoice, company, brandConfig);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Pre-load a logo URL into base64 for use in brandConfig
 * Call this once on page load to have the logo ready for PDF generation.
 * @param {string} url - Logo URL
 * @returns {Promise<{dataUrl: string, format: string}|null>}
 */
export { loadLogoAsBase64 };

export default generateInvoicePDF;

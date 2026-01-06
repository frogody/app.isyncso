import jsPDF from 'jspdf';

/**
 * Generate a professional invoice PDF
 * @param {Object} invoice - Invoice data
 * @param {Object} company - Company info (optional)
 * @returns {jsPDF} - PDF document
 */
export function generateInvoicePDF(invoice, company = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Colors
  const primaryColor = [34, 211, 238]; // cyan-400
  const darkColor = [24, 24, 27]; // zinc-900
  const grayColor = [113, 113, 122]; // zinc-500
  const lightGray = [161, 161, 170]; // zinc-400

  // Helper to set text color
  const setColor = (color) => doc.setTextColor(color[0], color[1], color[2]);
  const setDrawColor = (color) => doc.setDrawColor(color[0], color[1], color[2]);
  const setFillColor = (color) => doc.setFillColor(color[0], color[1], color[2]);

  // Header background
  setFillColor([10, 10, 10]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Company Logo/Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  setColor([255, 255, 255]);
  doc.text('iSyncSO', margin, 25);

  // Invoice label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(primaryColor);
  doc.text('INVOICE', margin, 35);

  // Invoice Number (right side)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor([255, 255, 255]);
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id?.slice(0, 8) || '000000'}`;
  doc.text(invoiceNumber, pageWidth - margin, 25, { align: 'right' });

  // Status badge
  const status = (invoice.status || 'draft').toUpperCase();
  const statusColors = {
    'DRAFT': [113, 113, 122],
    'SENT': [251, 191, 36],
    'PENDING': [251, 191, 36],
    'PAID': [34, 197, 94],
    'OVERDUE': [239, 68, 68]
  };
  const statusColor = statusColors[status] || grayColor;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(statusColor);
  doc.text(status, pageWidth - margin, 35, { align: 'right' });

  y = 60;

  // Main content area

  // Bill To Section
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
  if (invoice.client_email) {
    doc.text(invoice.client_email, margin, y);
    y += 5;
  }

  // Client address
  const clientAddress = typeof invoice.client_address === 'string'
    ? invoice.client_address
    : (invoice.client_address?.street || '');
  if (clientAddress) {
    const addressLines = doc.splitTextToSize(clientAddress, 80);
    addressLines.forEach(line => {
      doc.text(line, margin, y);
      y += 4;
    });
  }

  // Invoice Details (right column)
  let rightY = 60;
  const rightCol = pageWidth - margin - 50;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(grayColor);
  doc.text('INVOICE DETAILS', rightCol, rightY);

  rightY += 8;
  const details = [
    { label: 'Invoice Date:', value: invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-' },
    { label: 'Due Date:', value: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-' },
  ];

  doc.setFontSize(9);
  details.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'normal');
    setColor(grayColor);
    doc.text(label, rightCol, rightY);
    doc.setFont('helvetica', 'bold');
    setColor(darkColor);
    doc.text(value, rightCol + 50, rightY, { align: 'right' });
    rightY += 5;
  });

  // Line Items Table
  y = Math.max(y, rightY) + 15;

  // Table header
  setFillColor([244, 244, 245]); // zinc-100
  doc.rect(margin, y - 4, pageWidth - (margin * 2), 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(grayColor);
  doc.text('DESCRIPTION', margin + 3, y + 2);
  doc.text('QTY', pageWidth - margin - 70, y + 2, { align: 'center' });
  doc.text('PRICE', pageWidth - margin - 40, y + 2, { align: 'right' });
  doc.text('AMOUNT', pageWidth - margin - 3, y + 2, { align: 'right' });

  y += 12;

  // Line items
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

    // Alternate row background
    if (index % 2 === 1) {
      setFillColor([250, 250, 250]);
      doc.rect(margin, y - 4, pageWidth - (margin * 2), descLines.length * 5 + 4, 'F');
    }

    doc.setFontSize(10);
    setColor(darkColor);
    descLines.forEach((line, i) => {
      doc.text(line, margin + 3, y + (i * 5));
    });

    // Subscription indicator
    if (item.is_subscription) {
      doc.setFontSize(8);
      setColor(primaryColor);
      doc.text(`(${item.billing_cycle || 'monthly'})`, margin + 3, y + (descLines.length * 5));
    }

    doc.setFontSize(10);
    setColor(darkColor);
    doc.text(quantity.toString(), pageWidth - margin - 70, y, { align: 'center' });
    doc.text(`€${price.toFixed(2)}`, pageWidth - margin - 40, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`€${amount.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += Math.max(descLines.length * 5, 8) + 4;
  });

  // If no items, show the total directly
  if (items.length === 0) {
    doc.setFontSize(10);
    setColor(grayColor);
    doc.text('No line items', margin + 3, y);
    y += 8;
    subtotal = invoice.total || 0;
  }

  // Divider line
  y += 5;
  setDrawColor([228, 228, 231]); // zinc-200
  doc.line(pageWidth - margin - 80, y, pageWidth - margin, y);
  y += 8;

  // Totals section
  const totalX = pageWidth - margin - 80;

  // Subtotal
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(grayColor);
  doc.text('Subtotal', totalX, y);
  setColor(darkColor);
  doc.text(`€${subtotal.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
  y += 6;

  // Tax (if applicable)
  if (invoice.tax_percent || invoice.tax_amount) {
    const taxAmount = invoice.tax_amount || (subtotal * (invoice.tax_percent || 0) / 100);
    setColor(grayColor);
    doc.text(`Tax (${invoice.tax_percent || 0}%)`, totalX, y);
    setColor(darkColor);
    doc.text(`€${taxAmount.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
    y += 6;
  }

  // Discount (if applicable)
  if (invoice.discount_amount && invoice.discount_amount > 0) {
    setColor(grayColor);
    doc.text('Discount', totalX, y);
    setColor([34, 197, 94]); // green
    doc.text(`-€${invoice.discount_amount.toFixed(2)}`, pageWidth - margin - 3, y, { align: 'right' });
    y += 6;
  }

  // Total
  y += 2;
  setFillColor(primaryColor);
  doc.rect(totalX - 5, y - 4, pageWidth - totalX - margin + 8, 12, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor([255, 255, 255]);
  doc.text('TOTAL', totalX, y + 3);

  const total = invoice.total || subtotal;
  doc.setFontSize(12);
  doc.text(`€${total.toFixed(2)}`, pageWidth - margin - 3, y + 3, { align: 'right' });

  // Notes/Description section
  if (invoice.description) {
    y += 25;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setColor(grayColor);
    doc.text('NOTES', margin, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    setColor(darkColor);
    const noteLines = doc.splitTextToSize(invoice.description, pageWidth - (margin * 2));
    noteLines.forEach(line => {
      doc.text(line, margin, y);
      y += 4;
    });
  }

  // Footer
  const footerY = pageHeight - 20;

  setDrawColor([228, 228, 231]);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(grayColor);
  doc.text('Thank you for your business!', pageWidth / 2, footerY - 3, { align: 'center' });
  doc.text('Generated by iSyncSO', pageWidth / 2, footerY + 2, { align: 'center' });

  return doc;
}

/**
 * Download invoice as PDF
 * @param {Object} invoice - Invoice data
 */
export function downloadInvoicePDF(invoice) {
  const doc = generateInvoicePDF(invoice);
  const filename = `Invoice-${invoice.invoice_number || invoice.id?.slice(0, 8) || 'draft'}.pdf`;
  doc.save(filename);
}

/**
 * Open invoice PDF in new tab for preview
 * @param {Object} invoice - Invoice data
 */
export function previewInvoicePDF(invoice) {
  const doc = generateInvoicePDF(invoice);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export default generateInvoicePDF;

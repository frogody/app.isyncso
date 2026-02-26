import JsBarcode from 'jsbarcode';

// jsPDF is dynamically imported to avoid loading ~270 KB upfront
let _jsPDF = null;
async function getJsPDF() {
  if (!_jsPDF) {
    const mod = await import('jspdf');
    _jsPDF = mod.default;
  }
  return _jsPDF;
}

/**
 * Render a CODE128 barcode to a data URL via offscreen canvas
 */
function barcodeToDataUrl(text, opts = {}) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, text, {
    format: 'CODE128',
    width: opts.width || 2,
    height: opts.height || 60,
    displayValue: false,
    margin: 0,
  });
  return canvas.toDataURL('image/png');
}

/**
 * Generate a single 4×6 inch pallet label as a jsPDF page
 */
function addLabelPage(doc, pallet, shipment, palletIndex, totalPallets) {
  const W = 101.6; // 4 inches in mm
  const H = 152.4; // 6 inches in mm
  const margin = 6;
  let y = margin;

  // Colors
  const black = [0, 0, 0];
  const gray = [100, 100, 100];

  const setColor = (c) => doc.setTextColor(c[0], c[1], c[2]);

  // Company name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setColor(black);
  doc.text('iSyncSO', W / 2, y + 5, { align: 'center' });
  y += 12;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // Pallet code (large)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  setColor(black);
  const palletCode = pallet.pallet_code || `PLT-${palletIndex + 1}`;
  doc.text(palletCode, W / 2, y + 5, { align: 'center' });
  y += 12;

  // Barcode
  try {
    const barcodeImg = barcodeToDataUrl(palletCode, { width: 2, height: 50 });
    const barcodeW = W - margin * 4;
    const barcodeH = 22;
    doc.addImage(barcodeImg, 'PNG', (W - barcodeW) / 2, y, barcodeW, barcodeH);
    y += barcodeH + 3;
  } catch {
    doc.setFontSize(8);
    setColor(gray);
    doc.text('[barcode]', W / 2, y + 10, { align: 'center' });
    y += 15;
  }

  // Barcode text
  doc.setFontSize(9);
  doc.setFont('courier', 'normal');
  setColor(black);
  doc.text(palletCode, W / 2, y + 3, { align: 'center' });
  y += 10;

  // Divider
  doc.line(margin, y, W - margin, y);
  y += 6;

  // Shipment reference
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setColor(black);
  doc.text('Shipment', margin, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(shipment.shipment_code || shipment.id?.slice(0, 12) || '—', margin + 30, y + 3);
  y += 8;

  // Destination
  doc.setFont('helvetica', 'bold');
  doc.text('Destination', margin, y + 3);
  doc.setFont('helvetica', 'normal');
  const dest = shipment.destination || shipment.destination_reference || '—';
  doc.text(dest.slice(0, 30), margin + 30, y + 3);
  y += 8;

  // Type
  doc.setFont('helvetica', 'bold');
  doc.text('Type', margin, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text((shipment.shipment_type || '').toUpperCase(), margin + 30, y + 3);
  y += 8;

  // Pallet sequence
  doc.setFont('helvetica', 'bold');
  doc.text('Pallet', margin, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(`${palletIndex + 1} of ${totalPallets}`, margin + 30, y + 3);
  y += 8;

  // Items count
  const itemCount = pallet.pallet_items
    ? pallet.pallet_items.reduce((sum, i) => sum + (i.quantity || 0), 0)
    : pallet.total_items || 0;
  doc.setFont('helvetica', 'bold');
  doc.text('Items', margin, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(String(itemCount), margin + 30, y + 3);
  y += 8;

  // Weight
  if (pallet.weight) {
    doc.setFont('helvetica', 'bold');
    doc.text('Weight', margin, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pallet.weight} kg`, margin + 30, y + 3);
    y += 8;
  }

  // Dimensions
  if (pallet.dimensions) {
    doc.setFont('helvetica', 'bold');
    doc.text('Size', margin, y + 3);
    doc.setFont('helvetica', 'normal');
    const d = pallet.dimensions;
    doc.text(`${d.length}\u00D7${d.width}\u00D7${d.height} ${d.unit || 'cm'}`, margin + 30, y + 3);
    y += 8;
  }

  // Date
  doc.setFont('helvetica', 'bold');
  doc.text('Date', margin, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toISOString().slice(0, 10), margin + 30, y + 3);
  y += 10;

  // Bottom divider
  doc.line(margin, y, W - margin, y);
}

/**
 * Generate and open a single pallet label PDF
 */
export async function generateSinglePalletLabel(pallet, shipment, palletIndex, totalPallets) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [101.6, 152.4], // 4x6 inches
  });

  addLabelPage(doc, pallet, shipment, palletIndex, totalPallets);
  doc.save(`label-${pallet.pallet_code || 'pallet'}.pdf`);
}

/**
 * Generate and open a batch PDF with all pallet labels for a shipment
 */
export async function generateBatchPalletLabels(pallets, shipment) {
  if (!pallets || pallets.length === 0) return;

  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [101.6, 152.4],
  });

  pallets.forEach((pallet, i) => {
    if (i > 0) doc.addPage([101.6, 152.4]);
    addLabelPage(doc, pallet, shipment, i, pallets.length);
  });

  doc.save(`labels-${shipment.shipment_code || 'shipment'}.pdf`);
}

/**
 * Receiving Session Export — CSV & PDF
 */

import React from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// =============================================================================
// CSV EXPORT
// =============================================================================

export function exportSessionCSV(session, logs) {
  const header = 'EAN,Product Name,Quantity,Condition,Location,Received By,Timestamp';
  const rows = (logs || []).map((log) => {
    const ean = (log.ean_scanned || '').replace(/,/g, '');
    const name = (log.products?.name || 'Unknown').replace(/,/g, ' ');
    const qty = log.quantity_received || 0;
    const condition = log.condition || 'good';
    const location = (log.warehouse_location || '').replace(/,/g, ' ');
    const receivedBy = (log.received_by || '').replace(/,/g, ' ');
    const timestamp = log.received_at
      ? new Date(log.received_at).toISOString()
      : '';
    return `${ean},${name},${qty},${condition},${location},${receivedBy},${timestamp}`;
  });

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receiving-session-${session.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// =============================================================================
// PDF EXPORT
// =============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 10,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  colEan: { width: '18%' },
  colName: { width: '24%' },
  colQty: { width: '8%', textAlign: 'right' },
  colCondition: { width: '12%' },
  colLocation: { width: '12%' },
  colReceivedBy: { width: '12%' },
  colTime: { width: '14%' },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 9,
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  footerLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
});

function ReceivingSessionReport({ session, logs }) {
  const totalItems = (logs || []).reduce(
    (sum, l) => sum + (l.quantity_received || 0),
    0
  );
  const uniqueEans = new Set(
    (logs || []).map((l) => l.ean_scanned).filter(Boolean)
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{session.name}</Text>
          <Text style={styles.subtitle}>
            Started: {new Date(session.started_at).toLocaleString('en-GB')}
            {session.closed_at &&
              ` — Closed: ${new Date(session.closed_at).toLocaleString('en-GB')}`}
          </Text>
          <Text style={styles.subtitle}>
            Status: {session.status}
          </Text>
          {session.notes && (
            <Text style={styles.subtitle}>Notes: {session.notes}</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colEan]}>EAN</Text>
            <Text style={[styles.headerText, styles.colName]}>Product</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colCondition]}>Condition</Text>
            <Text style={[styles.headerText, styles.colLocation]}>Location</Text>
            <Text style={[styles.headerText, styles.colReceivedBy]}>Received By</Text>
            <Text style={[styles.headerText, styles.colTime]}>Time</Text>
          </View>

          {(logs || []).map((log, i) => (
            <View key={log.id || i} style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colEan]}>
                {log.ean_scanned || '-'}
              </Text>
              <Text style={[styles.cellText, styles.colName]}>
                {log.products?.name || 'Unknown'}
              </Text>
              <Text style={[styles.cellText, styles.colQty]}>
                {log.quantity_received}
              </Text>
              <Text style={[styles.cellText, styles.colCondition]}>
                {log.condition || 'good'}
              </Text>
              <Text style={[styles.cellText, styles.colLocation]}>
                {log.warehouse_location || '-'}
              </Text>
              <Text style={[styles.cellText, styles.colReceivedBy]}>
                {log.received_by || '-'}
              </Text>
              <Text style={[styles.cellText, styles.colTime]}>
                {log.received_at
                  ? new Date(log.received_at).toLocaleTimeString('en-GB')
                  : '-'}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer totals */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total Items</Text>
            <Text style={styles.footerText}>{totalItems}</Text>
          </View>
          <View>
            <Text style={styles.footerLabel}>Unique Products</Text>
            <Text style={styles.footerText}>{uniqueEans.size}</Text>
          </View>
          <View>
            <Text style={styles.footerLabel}>Line Items</Text>
            <Text style={styles.footerText}>{(logs || []).length}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function exportSessionPDF(session, logs) {
  const blob = await pdf(
    <ReceivingSessionReport session={session} logs={logs} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receiving-session-${session.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ReceiptText,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  ExternalLink,
  CreditCard,
  Loader2,
  Package,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import {
  GlassCard,
  Breadcrumb,
  StatusBadge,
  SecondaryButton,
  PrimaryButton,
  formatCurrency,
  gradientTextStyle,
} from './previewDesignSystem';
import { useWholesale } from '../WholesaleProvider';

// ---------------------------------------------------------------------------
// Invoice status configuration
// ---------------------------------------------------------------------------

const INVOICE_STATUS_CONFIG = {
  draft: { label: 'Draft', theme: 'neutral' },
  pending: { label: 'Pending', theme: 'warning' },
  sent: { label: 'Sent', theme: 'info' },
  overdue: { label: 'Overdue', theme: 'error' },
  partially_paid: { label: 'Partially Paid', theme: 'info' },
  paid: { label: 'Paid', theme: 'success' },
  cancelled: { label: 'Cancelled', theme: 'error' },
  voided: { label: 'Voided', theme: 'neutral' },
};

const PAYMENT_STATUS_CONFIG = {
  succeeded: { label: 'Succeeded', theme: 'success' },
  completed: { label: 'Completed', theme: 'success' },
  paid: { label: 'Paid', theme: 'success' },
  pending: { label: 'Pending', theme: 'warning' },
  processing: { label: 'Processing', theme: 'warning' },
  failed: { label: 'Failed', theme: 'error' },
  refunded: { label: 'Refunded', theme: 'neutral' },
  cancelled: { label: 'Cancelled', theme: 'error' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateFull(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function deriveInvoiceStatus(invoice) {
  if (!invoice) return 'pending';
  const status = invoice.status || 'pending';
  if (
    (status === 'pending' || status === 'sent') &&
    invoice.due_date &&
    new Date(invoice.due_date) < new Date()
  ) {
    return 'overdue';
  }
  return status;
}

// ---------------------------------------------------------------------------
// PreviewInvoiceDetailPage
// ---------------------------------------------------------------------------

export default function PreviewInvoiceDetailPage({ config, nav, pageData }) {
  const { client } = useWholesale();
  const invoiceId = pageData?.invoiceId;

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch invoice with linked order
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*, b2b_orders!inner(id, order_number, client_id, status, payment_terms_days)')
          .eq('id', invoiceId)
          .single();

        if (cancelled) return;

        if (invoiceError || !invoiceData) {
          console.error('[PreviewInvoiceDetailPage] Invoice fetch error:', invoiceError);
          setInvoice(null);
          setLoading(false);
          return;
        }

        setInvoice(invoiceData);

        // Fetch payments for this invoice
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('created_at', { ascending: false });

        if (!cancelled) {
          setPayments(paymentsData || []);
        }
      } catch (err) {
        console.error('[PreviewInvoiceDetailPage] Error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  // Loading state
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ws-primary)' }} />
      </div>
    );
  }

  // Not found state
  if (!invoice) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Invoices', onClick: () => nav?.goToInvoices?.() },
            { label: 'Not Found' },
          ]}
        />
        <div className="text-center py-16">
          <ReceiptText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ws-muted)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>Invoice not found.</p>
        </div>
      </div>
    );
  }

  // Derived values
  const effectiveStatus = deriveInvoiceStatus(invoice);
  const statusCfg = INVOICE_STATUS_CONFIG[effectiveStatus] || INVOICE_STATUS_CONFIG.pending;
  const isOverdue = effectiveStatus === 'overdue';

  const total = Number(invoice.total) || 0;
  const amountPaid = Number(invoice.amount_paid) || 0;
  const balanceDue = Number(invoice.balance_due) ?? (total - amountPaid);

  const daysUntilDue = invoice.due_date
    ? Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const order = invoice.b2b_orders;
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id?.slice(0, 8)}`;
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => {
    const amount = Number(item.amount) || Number(item.line_total) || (Number(item.unit_price || item.price || 0) * Number(item.quantity || 1));
    return sum + amount;
  }, 0);

  const taxAmount = Number(invoice.tax_amount) || 0;
  const taxRate = invoice.tax_rate ? Number(invoice.tax_rate) : null;

  const paymentTermsLabel = order?.payment_terms_days
    ? `Net-${order.payment_terms_days}`
    : invoice.payment_terms
      ? invoice.payment_terms
      : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ color: 'var(--ws-text)' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', onClick: () => nav?.goToHome?.() },
          { label: 'Invoices', onClick: () => nav?.goToInvoices?.() },
          { label: invoiceNumber },
        ]}
      />

      {/* Back button */}
      <button
        type="button"
        onClick={() => nav?.goToInvoices?.()}
        className="inline-flex items-center gap-2 text-sm font-medium mb-6 mt-4 transition-opacity hover:opacity-70"
        style={{ color: 'var(--ws-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ws-text)' }}>
              {invoiceNumber}
            </h1>
            <StatusBadge status={statusCfg.theme} label={statusCfg.label} size="sm" />
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {invoice.issued_at && (
              <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--ws-muted)' }}>
                <Calendar className="w-3.5 h-3.5" />
                Issued {formatDateShort(invoice.issued_at)}
              </span>
            )}
            {invoice.due_date && (
              <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--ws-muted)' }}>
                <Clock className="w-3.5 h-3.5" />
                Due {formatDateShort(invoice.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Overdue banner */}
      {isOverdue && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
            This invoice is overdue. Payment was due on {formatDateFull(invoice.due_date)}.
          </p>
        </div>
      )}

      {/* Two-column top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Summary */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-4.5 h-4.5" style={{ color: 'var(--ws-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
              Payment Summary
            </h2>
          </div>

          <div className="space-y-4">
            {/* Total */}
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ws-muted)' }}>
                Total
              </p>
              <p className="text-3xl font-bold" style={gradientTextStyle()}>
                {formatCurrency(total)}
              </p>
            </div>

            <div
              className="pt-4 space-y-3"
              style={{ borderTop: '1px solid var(--ws-border)' }}
            >
              {/* Amount Paid */}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                  Amount Paid
                </span>
                <span className="text-sm font-medium" style={{ color: amountPaid > 0 ? 'rgba(34,197,94,0.9)' : 'var(--ws-text)' }}>
                  {formatCurrency(amountPaid)}
                </span>
              </div>

              {/* Balance Due */}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                  Balance Due
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: balanceDue > 0 ? (isOverdue ? '#ef4444' : 'var(--ws-text)') : 'rgba(34,197,94,0.9)' }}
                >
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>

            {/* Due countdown */}
            {daysUntilDue !== null && (
              <div
                className="flex items-center gap-2 pt-3"
                style={{ borderTop: '1px solid var(--ws-border)' }}
              >
                {isOverdue ? (
                  <>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
                    <span className="text-sm font-medium" style={{ color: '#ef4444' }}>
                      Overdue by {Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : effectiveStatus === 'paid' ? (
                  <>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(34,197,94,0.9)' }} />
                    <span className="text-sm font-medium" style={{ color: 'rgba(34,197,94,0.9)' }}>
                      Paid in full
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--ws-primary)' }}>
                      Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Invoice Details */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-4.5 h-4.5" style={{ color: 'var(--ws-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
              Invoice Details
            </h2>
          </div>

          <div className="space-y-3">
            {/* Invoice Number */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Invoice Number</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                {invoiceNumber}
              </span>
            </div>

            {/* Order Number */}
            {order && (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Order Number</span>
                <button
                  type="button"
                  onClick={() => nav?.goToOrderDetail?.(order.id)}
                  className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--ws-primary)' }}
                >
                  {order.order_number || `#${order.id?.slice(0, 8)}`}
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Status</span>
              <StatusBadge status={statusCfg.theme} label={statusCfg.label} size="xs" />
            </div>

            {/* Due Date */}
            {invoice.due_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Due Date</span>
                <span className="text-sm font-medium" style={{ color: isOverdue ? '#ef4444' : 'var(--ws-text)' }}>
                  {formatDateFull(invoice.due_date)}
                </span>
              </div>
            )}

            {/* Payment Terms */}
            {paymentTermsLabel && (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Payment Terms</span>
                <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                  {paymentTermsLabel}
                </span>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div
                className="pt-3 mt-1"
                style={{ borderTop: '1px solid var(--ws-border)' }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ws-muted)' }}>
                  Notes
                </p>
                <p className="text-sm" style={{ color: 'var(--ws-text)' }}>
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Line Items */}
      <GlassCard className="mb-6">
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--ws-border)' }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
              Line Items
            </h2>
          </div>
        </div>

        {/* Table header (hidden on mobile) */}
        <div
          className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-2.5 text-xs uppercase tracking-wider"
          style={{ color: 'var(--ws-muted)', borderBottom: '1px solid var(--ws-border)' }}
        >
          <div className="col-span-6">Description</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>

        {items.length > 0 ? (
          items.map((item, idx) => {
            const qty = Number(item.quantity || item.qty || 1);
            const unitPrice = Number(item.unit_price || item.price || 0);
            const lineAmount = Number(item.amount || item.line_total) || (unitPrice * qty);

            return (
              <div
                key={idx}
                className="px-5 py-3.5"
                style={{
                  borderBottom: idx < items.length - 1 ? '1px solid var(--ws-border)' : 'none',
                }}
              >
                {/* Desktop layout */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-4 items-center">
                  <div className="col-span-6 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ws-text)' }}>
                      {item.description || item.product_name || item.name || 'Item'}
                    </p>
                    {item.sku && (
                      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm" style={{ color: 'var(--ws-text)' }}>{qty}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                      {formatCurrency(unitPrice)}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                      {formatCurrency(lineAmount)}
                    </span>
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="sm:hidden flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ws-text)' }}>
                      {item.description || item.product_name || item.name || 'Item'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                      {qty} x {formatCurrency(unitPrice)}
                    </p>
                  </div>
                  <span className="text-sm font-medium ml-4 flex-shrink-0" style={{ color: 'var(--ws-text)' }}>
                    {formatCurrency(lineAmount)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--ws-muted)' }}>
            No line items on this invoice.
          </div>
        )}

        {/* Totals section */}
        {items.length > 0 && (
          <div
            className="px-5 py-4 space-y-2.5"
            style={{ borderTop: '1px solid var(--ws-border)' }}
          >
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Subtotal</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Tax */}
            {taxAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                  Tax{taxRate ? ` (${taxRate}%)` : ''}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                  {formatCurrency(taxAmount)}
                </span>
              </div>
            )}

            {/* Total */}
            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid var(--ws-border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>Total</span>
              <span className="text-lg font-bold" style={gradientTextStyle()}>
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Payment History */}
      <GlassCard className="mb-8">
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--ws-border)' }}>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
              Payment History
            </h2>
          </div>
        </div>

        {payments.length > 0 ? (
          payments.map((payment, idx) => {
            const pStatus = payment.status || 'pending';
            const pCfg = PAYMENT_STATUS_CONFIG[pStatus] || PAYMENT_STATUS_CONFIG.pending;

            return (
              <div
                key={payment.id || idx}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: idx < payments.length - 1 ? '1px solid var(--ws-border)' : 'none',
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
                      border: '1px solid var(--ws-border)',
                    }}
                  >
                    <CreditCard className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                      {formatCurrency(Number(payment.amount) || 0)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                        {formatDateShort(payment.created_at || payment.paid_at)}
                      </span>
                      {payment.method && (
                        <>
                          <span className="text-xs" style={{ color: 'var(--ws-border)' }}>|</span>
                          <span className="text-xs capitalize" style={{ color: 'var(--ws-muted)' }}>
                            {payment.method.replace(/_/g, ' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge status={pCfg.theme} label={pCfg.label} size="xs" />
              </div>
            );
          })
        ) : (
          <div className="px-5 py-10 text-center">
            <ReceiptText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--ws-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
              No payments recorded yet.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Footer actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {invoice.pdf_url && (
          <PrimaryButton
            icon={Download}
            onClick={() => window.open(invoice.pdf_url, '_blank', 'noopener')}
          >
            Download PDF
          </PrimaryButton>
        )}
        {order && (
          <SecondaryButton
            icon={ExternalLink}
            onClick={() => nav?.goToOrderDetail?.(order.id)}
          >
            View Order
          </SecondaryButton>
        )}
      </div>
    </div>
  );
}

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ReceiptText,
  CircleDollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Search,
  FileText,
  Loader2,
  LogIn,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  GlassCard,
  Breadcrumb,
  StatusBadge,
  EmptyState,
  SecondaryButton,
  PrimaryButton,
  GlassInput,
  SectionHeader,
  motionVariants,
  glassCardStyle,
  gradientTextStyle,
  formatCurrency,
} from './previewDesignSystem';
import { useWholesale } from '../WholesaleProvider';
import { supabase } from '@/api/supabaseClient';

// ---------------------------------------------------------------------------
// Invoice status config
// ---------------------------------------------------------------------------

const INVOICE_STATUS_CONFIG = {
  draft: { label: 'Draft', theme: 'neutral' },
  pending: { label: 'Pending', theme: 'warning' },
  sent: { label: 'Sent', theme: 'info' },
  paid: { label: 'Paid', theme: 'success' },
  overdue: { label: 'Overdue', theme: 'error' },
  canceled: { label: 'Cancelled', theme: 'neutral' },
  refunded: { label: 'Refunded', theme: 'neutral' },
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Derive effective status -- if pending but past due_date, treat as overdue.
 */
function getEffectiveStatus(invoice) {
  if (invoice.status === 'pending' && invoice.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.due_date);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }
  return invoice.status || 'draft';
}

function isOverdue(invoice) {
  return getEffectiveStatus(invoice) === 'overdue';
}

// ---------------------------------------------------------------------------
// InvoiceStatsBar
// ---------------------------------------------------------------------------

function InvoiceStatsBar({ invoices }) {
  const totalOutstanding = useMemo(
    () =>
      invoices
        .filter((inv) => {
          const s = getEffectiveStatus(inv);
          return s !== 'paid' && s !== 'canceled' && s !== 'refunded' && s !== 'draft';
        })
        .reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0),
    [invoices],
  );

  const overdueTotal = useMemo(
    () =>
      invoices
        .filter((inv) => getEffectiveStatus(inv) === 'overdue')
        .reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0),
    [invoices],
  );

  const totalPaid = useMemo(
    () => invoices.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0),
    [invoices],
  );

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      const d = new Date(inv.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [invoices]);

  const stats = [
    {
      label: 'Total Outstanding',
      value: formatCurrency(totalOutstanding),
      icon: CircleDollarSign,
      accent: 'var(--ws-primary)',
    },
    {
      label: 'Overdue',
      value: formatCurrency(overdueTotal),
      icon: AlertTriangle,
      accent: 'rgba(239,68,68,0.8)',
    },
    {
      label: 'Total Paid',
      value: formatCurrency(totalPaid),
      icon: CheckCircle,
      accent: 'rgba(34,197,94,0.8)',
    },
    {
      label: 'This Month',
      value: `${thisMonthCount} invoices`,
      icon: Clock,
      accent: 'rgba(59,130,246,0.8)',
    },
  ];

  return (
    <motion.div
      variants={motionVariants.container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
    >
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <GlassCard key={i} className="p-4 sm:p-5" hoverable={false}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className="text-xs font-medium uppercase tracking-wider mb-1"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  {stat.label}
                </p>
                <p
                  className="text-lg sm:text-xl font-bold truncate"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {stat.value}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `color-mix(in srgb, ${stat.accent} 12%, transparent)`,
                }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: stat.accent }} />
              </div>
            </div>
          </GlassCard>
        );
      })}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StatusFilterPills
// ---------------------------------------------------------------------------

function StatusFilterPills({ activeFilter, onFilterChange, invoices }) {
  const counts = useMemo(() => {
    const map = { all: invoices.length };
    invoices.forEach((inv) => {
      const s = getEffectiveStatus(inv);
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [invoices]);

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {STATUS_FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = counts[filter.key] || 0;

        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onFilterChange(filter.key)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
            style={
              isActive
                ? {
                    background:
                      'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))',
                    color: '#fff',
                    boxShadow:
                      '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)',
                  }
                : {
                    ...glassCardStyle,
                    color: 'var(--ws-muted)',
                  }
            }
          >
            {filter.label}
            <span
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
              style={
                isActive
                  ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }
                  : {
                      backgroundColor:
                        'color-mix(in srgb, var(--ws-border) 60%, transparent)',
                      color: 'var(--ws-muted)',
                    }
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InvoiceRow
// ---------------------------------------------------------------------------

function InvoiceRow({ invoice, nav, index }) {
  const effectiveStatus = getEffectiveStatus(invoice);
  const statusCfg = INVOICE_STATUS_CONFIG[effectiveStatus] || INVOICE_STATUS_CONFIG.draft;
  const overdue = effectiveStatus === 'overdue';
  const orderNumber = invoice.b2b_orders?.order_number;

  return (
    <motion.div variants={motionVariants.staggerItem} custom={index} initial="hidden" animate="visible">
      <GlassCard hoverable className="overflow-hidden" variants={{}}>
        {/* Left accent bar */}
        {overdue && (
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{
              background:
                'linear-gradient(180deg, rgba(239,68,68,0.8), rgba(239,68,68,0.2))',
            }}
          />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4">
          {/* Invoice icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 hidden sm:flex"
            style={{
              background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
            }}
          >
            <FileText className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
          </div>

          {/* Invoice number + date */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="text-sm font-bold font-mono"
                style={{ color: 'var(--ws-text)' }}
              >
                {invoice.invoice_number || `INV-${invoice.id?.slice(0, 8)}`}
              </p>
              <StatusBadge
                status={statusCfg.theme}
                label={statusCfg.label}
                pulse={overdue}
                size="xs"
              />
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
              {formatDate(invoice.created_at)}
            </p>
          </div>

          {/* Linked order */}
          {orderNumber && (
            <button
              className="flex items-center gap-1 text-xs font-mono transition-colors flex-shrink-0"
              style={{ color: 'var(--ws-primary)' }}
              onClick={(e) => {
                e.stopPropagation();
                nav?.goToOrderDetail?.(invoice.b2b_order_id);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <ExternalLink className="w-3 h-3" />
              {orderNumber}
            </button>
          )}

          {/* Due date */}
          <div className="flex flex-col items-start sm:items-end flex-shrink-0">
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--ws-muted)' }}>
              Due
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: overdue ? 'rgba(239,68,68,0.9)' : 'var(--ws-text)' }}
            >
              {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
              {overdue && (
                <span className="ml-1.5 text-[10px] font-bold uppercase" style={{ color: 'rgba(239,68,68,0.9)' }}>
                  Overdue
                </span>
              )}
            </span>
          </div>

          {/* Balance due */}
          {Number(invoice.balance_due) > 0 && (
            <div className="flex flex-col items-start sm:items-end flex-shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--ws-muted)' }}>
                Balance
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--ws-text)' }}>
                {formatCurrency(invoice.balance_due)}
              </span>
            </div>
          )}

          {/* Total */}
          <span
            className="text-sm font-bold whitespace-nowrap flex-shrink-0"
            style={gradientTextStyle()}
          >
            {formatCurrency(invoice.total)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <SecondaryButton
              size="sm"
              icon={FileText}
              onClick={() => nav?.goToInvoiceDetail?.(invoice.id)}
            >
              View
            </SecondaryButton>
            {invoice.pdf_url && (
              <SecondaryButton
                size="sm"
                icon={Download}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(invoice.pdf_url, '_blank');
                }}
              >
                PDF
              </SecondaryButton>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PreviewInvoicesPage
// ---------------------------------------------------------------------------

export default function PreviewInvoicesPage({ config, nav }) {
  const { client, isAuthenticated } = useWholesale();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch invoices joined to b2b_orders
  useEffect(() => {
    if (!client?.id) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInvoices = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select(
            'id, invoice_number, status, subtotal, tax_amount, total, due_date, amount_paid, balance_due, created_at, notes, items, b2b_order_id, b2b_orders!inner(id, order_number, client_id)',
          )
          .eq('b2b_orders.client_id', client.id)
          .order('created_at', { ascending: false });

        if (cancelled) return;

        if (error) throw error;
        setInvoices(data || []);
      } catch (err) {
        console.error('[PreviewInvoicesPage] Failed to fetch invoices:', err);
        if (!cancelled) setFetchError(err.message || 'Failed to load invoices');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInvoices();

    return () => {
      cancelled = true;
    };
  }, [client?.id]);

  // Filter invoices by status + search
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // Status filter
    if (activeFilter !== 'all') {
      result = result.filter((inv) => {
        const s = getEffectiveStatus(inv);
        return s === activeFilter;
      });
    }

    // Search by invoice_number
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((inv) => {
        const num = (inv.invoice_number || '').toLowerCase();
        const orderNum = (inv.b2b_orders?.order_number || '').toLowerCase();
        return num.includes(q) || orderNum.includes(q);
      });
    }

    return result;
  }, [invoices, activeFilter, searchQuery]);

  const handleFilterChange = useCallback((key) => {
    setActiveFilter(key);
  }, []);

  // Not authenticated
  if (!isAuthenticated || !client) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Invoices' },
          ]}
        />
        <SectionHeader
          title="Invoices"
          subtitle="View and manage your invoices"
        />
        <EmptyState
          icon={LogIn}
          title="Sign in to view your invoices"
          description="Log in to your B2B account to access your invoices, payment history, and download PDFs."
          action={
            <PrimaryButton size="sm" icon={LogIn} onClick={() => nav?.goToLogin?.()}>
              Sign In
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Invoices' },
          ]}
        />
        <SectionHeader title="Invoices" subtitle="Loading your invoices..." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--ws-primary)' }} />
        </div>
      </div>
    );
  }

  // Error
  if (fetchError) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Invoices' },
          ]}
        />
        <SectionHeader title="Invoices" subtitle="Something went wrong" />
        <EmptyState
          icon={AlertCircle}
          title="Failed to load invoices"
          description={fetchError}
          action={
            <PrimaryButton
              size="sm"
              icon={RefreshCw}
              onClick={() => window.location.reload()}
            >
              Retry
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', onClick: () => nav?.goToHome?.() },
          { label: 'Invoices' },
        ]}
      />

      {/* Section Header */}
      <SectionHeader
        title="Invoices"
        subtitle="View invoices, track payments, and download documents"
        action={
          <SecondaryButton size="sm" icon={ReceiptText} onClick={() => nav?.goToOrders?.()}>
            View Orders
          </SecondaryButton>
        }
      />

      {/* Stats Bar */}
      <InvoiceStatsBar invoices={invoices} />

      {/* Status Filter Pills */}
      <StatusFilterPills
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        invoices={invoices}
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--ws-muted)' }}
        />
        <GlassInput
          type="text"
          placeholder="Search by invoice number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="!pl-10"
        />
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No invoices found"
          description={
            searchQuery || activeFilter !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Your invoices will appear here once orders are invoiced'
          }
          action={
            (searchQuery || activeFilter !== 'all') && (
              <SecondaryButton
                size="sm"
                onClick={() => {
                  setActiveFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </SecondaryButton>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice, idx) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              nav={nav}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredInvoices.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs mt-6 pb-4"
          style={{ color: 'var(--ws-muted)' }}
        >
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </motion.p>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  Trash2,
  Loader2,
  ShoppingCart,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useWholesale } from '../WholesaleProvider';

/**
 * Format a number as EUR currency.
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a date string to a readable short format.
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return '';
  }
}

/**
 * Compute the estimated total price for a template's items.
 */
function templateTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const price = Number(item.unit_price) || 0;
    const qty = Number(item.quantity) || 1;
    return sum + price * qty;
  }, 0);
}

/**
 * Compute total item count across a template.
 */
function templateItemCount(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

function TemplateCard({ template, onLoad, onDelete, loading }) {
  const items = template.items || [];
  const total = templateTotal(items);
  const count = templateItemCount(items);

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      {/* Top row: icon + name + date */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
          >
            <ClipboardList
              className="w-4.5 h-4.5"
              style={{ color: 'var(--ws-primary)' }}
            />
          </div>
          <h3
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            {template.name || 'Untitled Template'}
          </h3>
        </div>
        {template.created_at && (
          <span
            className="flex-shrink-0 text-[11px] font-medium"
            style={{ color: 'var(--ws-muted)' }}
          >
            {formatDate(template.created_at)}
          </span>
        )}
      </div>

      {/* Stats line */}
      <p
        className="text-xs mb-4"
        style={{ color: 'var(--ws-muted)' }}
      >
        {count} {count === 1 ? 'item' : 'items'} &middot; Est. {formatCurrency(total)}
      </p>

      {/* Actions row */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onLoad(template)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShoppingCart className="w-3.5 h-3.5" />
          )}
          Load into Cart
        </button>

        <button
          type="button"
          onClick={() => onDelete(template)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10"
          style={{ color: '#f87171' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderTemplatesPage
// ---------------------------------------------------------------------------

export default function OrderTemplatesPage() {
  const {
    templates,
    templatesLoading,
    fetchTemplates,
    deleteTemplate,
    addToCart,
    cartItems,
    createTemplate,
  } = useWholesale();

  const { org } = useParams();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Refresh templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Auto-clear success message
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const catalogPath = org ? `/portal/${org}/shop/catalog` : '/catalog';
  const cartPath = org ? `/portal/${org}/shop/cart` : '/cart';

  /**
   * Load all items from a template into the cart.
   */
  const handleLoad = useCallback(
    async (template) => {
      const items = template.items || [];
      if (items.length === 0) return;

      setLoadingId(template.id);
      try {
        for (const item of items) {
          addToCart(
            {
              id: item.product_id,
              name: item.name,
              sku: item.sku,
              price: item.unit_price,
            },
            item.quantity || 1,
          );
        }
        setSuccessMsg(`"${template.name}" loaded into cart`);
      } finally {
        setLoadingId(null);
      }
    },
    [addToCart],
  );

  /**
   * Request delete confirmation.
   */
  const handleDeleteRequest = useCallback((template) => {
    setDeleteTarget(template);
  }, []);

  /**
   * Execute template deletion.
   */
  const executeDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteTemplate(deleteTarget.id);
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteTemplate]);

  // Loading state
  if (templatesLoading && templates.length === 0) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-7 h-7 animate-spin"
            style={{ color: 'var(--ws-primary)' }}
          />
          <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
            Loading templates...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
    >
      {/* Back link */}
      <Link
        to={catalogPath}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 mb-6"
        style={{ color: 'var(--ws-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            Order Templates
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ws-muted)' }}>
            {templates.length} {templates.length === 1 ? 'template' : 'templates'} saved
          </p>
        </div>

        <Link
          to={cartPath}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Go to Cart
        </Link>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            color: 'var(--ws-primary)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
          }}
        >
          <ShoppingCart className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {/* Empty state */}
      {templates.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
          >
            <ClipboardList
              className="w-7 h-7"
              style={{ color: 'var(--ws-muted)', opacity: 0.5 }}
            />
          </div>
          <h2
            className="text-base font-semibold mb-1.5"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            No templates yet
          </h2>
          <p
            className="text-sm max-w-sm mb-6"
            style={{ color: 'var(--ws-muted)' }}
          >
            Save your current cart as a template to quickly reorder in the future.
          </p>
          <Link
            to={cartPath}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'var(--ws-primary)',
              color: 'var(--ws-bg, #000)',
            }}
          >
            <ShoppingCart className="w-4 h-4" />
            Go to Cart
          </Link>
        </div>
      )}

      {/* Template grid */}
      {templates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onLoad={handleLoad}
              onDelete={handleDeleteRequest}
              loading={loadingId === tpl.id}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-white text-base">
                  Delete template?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400 text-sm mt-1.5">
                  Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleteBusy}
              className="bg-red-600 text-white hover:bg-red-500 border-0"
            >
              {deleteBusy ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  AlertTriangle,
  Bookmark,
  Loader2,
  ClipboardList,
  ShoppingCart,
  X,
  Plus,
  Truck,
  Check,
  Tag,
  ImageOff,
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
import CartItem from './CartItem';
import CartSummary from './CartSummary';

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

/**
 * Calculate estimated delivery date range (3-5 business days from today).
 */
function getEstimatedDelivery() {
  const start = new Date();
  const end = new Date();
  let businessDaysAdded = 0;

  // Add 3 business days for start
  const tempStart = new Date(start);
  businessDaysAdded = 0;
  while (businessDaysAdded < 3) {
    tempStart.setDate(tempStart.getDate() + 1);
    const day = tempStart.getDay();
    if (day !== 0 && day !== 6) businessDaysAdded++;
  }

  // Add 5 business days for end
  const tempEnd = new Date(end);
  businessDaysAdded = 0;
  while (businessDaysAdded < 5) {
    tempEnd.setDate(tempEnd.getDate() + 1);
    const day = tempEnd.getDay();
    if (day !== 0 && day !== 6) businessDaysAdded++;
  }

  const opts = { month: 'short', day: 'numeric' };
  return `${tempStart.toLocaleDateString('en-US', opts)} - ${tempEnd.toLocaleDateString('en-US', opts)}`;
}

const FREE_SHIPPING_THRESHOLD = 500;

/**
 * Favorites Strip - horizontal scroll of favorite products not in cart.
 */
function FavoritesStrip({ favorites, cartItemIds, addToCart }) {
  const eligibleFavorites = useMemo(() => {
    return (favorites || []).filter(
      (fav) => fav.product_id && !cartItemIds.has(fav.product_id)
    );
  }, [favorites, cartItemIds]);

  if (eligibleFavorites.length === 0) return null;

  return (
    <div className="mb-6">
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-2.5"
        style={{ color: 'var(--ws-muted)' }}
      >
        Quick Add from Favorites
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
        {eligibleFavorites.map((fav) => {
          const product = fav.product || {};
          const name = product.name || fav.product_name || 'Product';
          const price = Number(product.price || fav.price) || 0;
          const image = product.featured_image || fav.featured_image || null;
          const productId = fav.product_id;

          return (
            <div
              key={productId}
              className="flex-shrink-0 flex items-center gap-2.5 pl-1.5 pr-2 py-1.5 rounded-xl transition-colors hover:bg-white/[0.03]"
              style={{
                backgroundColor: 'var(--ws-surface)',
                border: '1px solid var(--ws-border)',
              }}
            >
              {/* Mini image */}
              <div
                className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: 'var(--ws-bg)' }}
              >
                {image ? (
                  <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <ImageOff className="w-4 h-4" style={{ color: 'var(--ws-muted)', opacity: 0.3 }} />
                )}
              </div>

              {/* Name + price */}
              <div className="min-w-0 max-w-[120px]">
                <p
                  className="text-xs font-medium truncate leading-tight"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {name}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--ws-muted)' }}>
                  {formatCurrency(price)}
                </p>
              </div>

              {/* Add button */}
              <button
                type="button"
                onClick={() =>
                  addToCart(
                    {
                      id: productId,
                      name,
                      price,
                      image,
                      sku: product.sku || fav.sku || null,
                    },
                    1,
                  )
                }
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-90"
                style={{
                  backgroundColor: 'var(--ws-primary)',
                  color: 'var(--ws-bg, #000)',
                }}
                aria-label={`Add ${name} to cart`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Order Value Progress Bar - shows progress toward free shipping threshold.
 */
function FreeShippingProgress({ subtotal }) {
  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const qualifies = subtotal >= FREE_SHIPPING_THRESHOLD;

  return (
    <div
      className="mb-6 px-4 py-3 rounded-xl"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" style={{ color: qualifies ? '#22c55e' : 'var(--ws-primary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--ws-text)' }}>
            {qualifies ? 'You qualify for free shipping!' : `Add ${formatCurrency(remaining)} more for free shipping`}
          </span>
        </div>
        {qualifies && <Check className="w-4 h-4" style={{ color: '#22c55e' }} />}
      </div>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: qualifies ? '#22c55e' : 'var(--ws-primary)',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Savings Summary badge - shows total savings from tier pricing.
 */
function SavingsBadge({ items }) {
  const savings = useMemo(() => {
    return items.reduce((total, item) => {
      const originalPrice = Number(item.original_price || item.compare_at_price) || 0;
      const actualPrice = Number(item.price) || 0;
      if (originalPrice > actualPrice && originalPrice > 0) {
        return total + (originalPrice - actualPrice) * item.quantity;
      }
      return total;
    }, 0);
  }, [items]);

  if (savings <= 0) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        color: '#22c55e',
        border: '1px solid rgba(34, 197, 94, 0.2)',
      }}
    >
      <Tag className="w-3.5 h-3.5" />
      You are saving {formatCurrency(savings)}!
    </div>
  );
}

/**
 * Estimated Delivery Banner
 */
function EstimatedDeliveryBanner() {
  const deliveryRange = useMemo(() => getEstimatedDelivery(), []);

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <Truck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
      <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
        Estimated delivery: <span style={{ color: 'var(--ws-text)' }}>{deliveryRange}</span>
      </span>
    </div>
  );
}

/**
 * CartPage
 *
 * Full-width dedicated cart page for the B2B wholesale storefront.
 * Two-column layout on desktop: left (2/3) shows the cart items list,
 * right (1/3) shows a sticky CartSummary sidebar.
 *
 * Features:
 * - Quick Add from Favorites strip
 * - Free shipping progress bar
 * - Savings summary badge
 * - Estimated delivery banner
 * - Save current cart as a reusable order template
 * - Load templates into cart from empty state
 * - Continue Shopping button
 *
 * Uses the WholesaleProvider context for cart state operations.
 */
export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
    addToCart,
    createTemplate,
    templates,
    fetchTemplates,
    favorites,
    isAuthenticated,
  } = useWholesale();
  const navigate = useNavigate();
  const { org } = useParams();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Save-as-template state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Template loading state (for empty-state template cards)
  const [loadingTemplateId, setLoadingTemplateId] = useState(null);

  // Fetch templates on mount (for empty-state display)
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Auto-clear success message
  useEffect(() => {
    if (!saveSuccess) return;
    const t = setTimeout(() => setSaveSuccess(''), 3000);
    return () => clearTimeout(t);
  }, [saveSuccess]);

  /**
   * Normalize cart items from the WholesaleProvider shape into the
   * CartItem component shape. The provider stores items with `id`
   * as the product key, while CartItem expects `productId`.
   */
  const normalizedItems = cartItems.map((item) => ({
    ...item,
    productId: item.productId ?? item.id,
    image: item.image ?? item.featured_image ?? null,
    price: Number(item.price) || 0,
  }));

  // Set of product IDs currently in cart (for favorites strip filtering)
  const cartItemIds = useMemo(() => {
    return new Set(cartItems.map((item) => item.id));
  }, [cartItems]);

  // Subtotal for progress bar
  const subtotal = useMemo(() => {
    return normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [normalizedItems]);

  const handleUpdateQuantity = useCallback(
    (productId, qty) => {
      updateQuantity(productId, qty);
    },
    [updateQuantity],
  );

  const handleRemove = useCallback(
    (productId) => {
      removeFromCart(productId);
    },
    [removeFromCart],
  );

  const handleClearCart = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const executeClearCart = useCallback(() => {
    setShowClearConfirm(false);
    clearCart();
  }, [clearCart]);

  const handleCheckout = useCallback(() => {
    navigate(org ? `/portal/${org}/shop/checkout` : '/checkout');
  }, [navigate, org]);

  // ---- Save as Template handlers ----

  const handleOpenSaveTemplate = useCallback(() => {
    setTemplateName('');
    setShowSaveTemplate(true);
  }, []);

  const handleCancelSaveTemplate = useCallback(() => {
    setShowSaveTemplate(false);
    setTemplateName('');
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim() || cartItems.length === 0) return;
    setSavingTemplate(true);
    try {
      const items = cartItems.map((item) => ({
        product_id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
      }));
      await createTemplate(templateName.trim(), items);
      setShowSaveTemplate(false);
      setTemplateName('');
      setSaveSuccess(`Template "${templateName.trim()}" saved`);
    } finally {
      setSavingTemplate(false);
    }
  }, [templateName, cartItems, createTemplate]);

  // ---- Load template into cart (empty-state) ----

  const handleLoadTemplate = useCallback(
    async (template) => {
      const items = template.items || [];
      if (items.length === 0) return;
      setLoadingTemplateId(template.id);
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
      } finally {
        setLoadingTemplateId(null);
      }
    },
    [addToCart],
  );

  const catalogPath = org ? `/portal/${org}/shop/catalog` : '/catalog';
  const templatesPath = org ? `/portal/${org}/shop/templates` : '/templates';

  // Pick up to 3 templates for the empty-state display
  const emptyStateTemplates = (templates || []).slice(0, 3);

  // Whether to show favorites strip
  const showFavorites = isAuthenticated && Array.isArray(favorites) && favorites.length > 0;

  // Empty state
  if (normalizedItems.length === 0) {
    return (
      <div
        className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        >
          <ShoppingBag
            className="w-9 h-9"
            style={{ color: 'var(--ws-muted)', opacity: 0.5 }}
          />
        </div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          Your cart is empty
        </h2>
        <p
          className="text-sm mb-6 max-w-sm"
          style={{ color: 'var(--ws-muted)' }}
        >
          Looks like you have not added any products yet.
          Browse our catalog to find what you need.
        </p>

        {/* Continue Shopping button */}
        <Link
          to={catalogPath}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          <ShoppingBag className="w-4 h-4" />
          Browse Products
        </Link>

        {/* Templates section in empty state */}
        {emptyStateTemplates.length > 0 && (
          <div className="mt-10 w-full max-w-lg">
            <p
              className="text-sm mb-3"
              style={{ color: 'var(--ws-muted)' }}
            >
              Or load from a template:
            </p>
            <div className="space-y-2">
              {emptyStateTemplates.map((tpl) => {
                const items = tpl.items || [];
                const count = templateItemCount(items);
                const total = templateTotal(items);
                const isLoading = loadingTemplateId === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl text-left"
                    style={{
                      backgroundColor: 'var(--ws-surface)',
                      border: '1px solid var(--ws-border)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                      >
                        <ClipboardList
                          className="w-4 h-4"
                          style={{ color: 'var(--ws-primary)' }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--ws-text)' }}
                        >
                          {tpl.name}
                        </p>
                        <p
                          className="text-[11px]"
                          style={{ color: 'var(--ws-muted)' }}
                        >
                          {count} {count === 1 ? 'item' : 'items'} &middot; Est. {formatCurrency(total)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadTemplate(tpl)}
                      disabled={isLoading}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--ws-primary)',
                        color: 'var(--ws-bg, #000)',
                      }}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-3.5 h-3.5" />
                      )}
                      Load
                    </button>
                  </div>
                );
              })}
            </div>
            {templates.length > 3 && (
              <Link
                to={templatesPath}
                className="inline-block mt-3 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--ws-primary)' }}
              >
                View all {templates.length} templates
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
    >
      {/* Back to catalog link */}
      <Link
        to={catalogPath}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 mb-6"
        style={{ color: 'var(--ws-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Shopping Cart
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: 'var(--ws-muted)' }}
            >
              {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          {/* Savings badge next to header */}
          <SavingsBadge items={normalizedItems} />
        </div>

        <div className="flex items-center gap-2">
          {/* Save as Template button */}
          <button
            type="button"
            onClick={handleOpenSaveTemplate}
            disabled={cartItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--ws-muted)' }}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Save as Template
          </button>

          {/* Clear cart button */}
          <button
            type="button"
            onClick={handleClearCart}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10"
            style={{ color: '#f87171' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Cart
          </button>
        </div>
      </div>

      {/* Save-as-template inline card */}
      {showSaveTemplate && (
        <div
          className="mb-6 p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--ws-surface)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--ws-text)' }}
            >
              Save cart as template
            </h3>
            <button
              type="button"
              onClick={handleCancelSaveTemplate}
              className="p-1 rounded-lg transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--ws-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Weekly Restock, Office Supplies..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--ws-text)',
                border: '1px solid var(--ws-border)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTemplate();
                if (e.key === 'Escape') handleCancelSaveTemplate();
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || savingTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--ws-primary)',
                color: 'var(--ws-bg, #000)',
              }}
            >
              {savingTemplate ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelSaveTemplate}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--ws-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Save success message */}
      {saveSuccess && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            color: 'var(--ws-primary)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
          }}
        >
          <Bookmark className="w-4 h-4" />
          {saveSuccess}
        </div>
      )}

      {/* Free shipping progress bar */}
      <FreeShippingProgress subtotal={subtotal} />

      {/* Favorites strip */}
      {showFavorites && (
        <FavoritesStrip
          favorites={favorites}
          cartItemIds={cartItemIds}
          addToCart={addToCart}
        />
      )}

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column: Cart items list */}
        <div className="flex-1 lg:w-2/3 space-y-3">
          {normalizedItems.map((item) => (
            <CartItem
              key={item.productId ?? item.id}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
            />
          ))}

          {/* Continue Shopping link below items */}
          <div className="pt-3">
            <Link
              to={catalogPath}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.04]"
              style={{
                color: 'var(--ws-muted)',
                border: '1px solid var(--ws-border)',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Right column: Sticky summary sidebar */}
        <div className="lg:w-1/3">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Estimated delivery banner */}
            <EstimatedDeliveryBanner />

            <CartSummary items={normalizedItems} onCheckout={handleCheckout} />
          </div>
        </div>
      </div>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-white text-base">Clear cart?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400 text-sm mt-1.5">
                  This will remove all {normalizedItems.length} item{normalizedItems.length !== 1 ? 's' : ''} from your cart.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeClearCart} className="bg-red-600 text-white hover:bg-red-500 border-0">
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import React, { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';
import CartItem from './CartItem';
import CartSummary from './CartSummary';

/**
 * CartPage
 *
 * Full-width dedicated cart page for the B2B wholesale storefront.
 * Two-column layout on desktop: left (2/3) shows the cart items list,
 * right (1/3) shows a sticky CartSummary sidebar.
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
  } = useWholesale();
  const navigate = useNavigate();
  const { org } = useParams();

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
    if (window.confirm('Are you sure you want to clear all items from your cart?')) {
      clearCart();
    }
  }, [clearCart]);

  const handleCheckout = useCallback(() => {
    navigate(org ? `/${org}/checkout` : '/checkout');
  }, [navigate, org]);

  const catalogPath = org ? `/${org}/catalog` : '/catalog';

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
        </div>

        {/* Right column: Sticky summary sidebar */}
        <div className="lg:w-1/3">
          <div className="lg:sticky lg:top-24">
            <CartSummary items={normalizedItems} onCheckout={handleCheckout} />
          </div>
        </div>
      </div>
    </div>
  );
}

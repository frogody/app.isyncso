import React, { useCallback, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';
import CartItem from './CartItem';
import CartSummary from './CartSummary';

/**
 * CartDrawer
 *
 * Slide-out cart panel that opens from the right side of the viewport.
 * Uses the WholesaleProvider context for cart state and Framer Motion
 * for enter/exit animations.
 *
 * Props:
 *   isOpen  - boolean  Whether the drawer is visible
 *   onClose - () => void  Callback to close the drawer
 */
export default function CartDrawer({ isOpen, onClose }) {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    cartCount,
  } = useWholesale();
  const navigate = useNavigate();
  const { org } = useParams();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  const handleCheckout = useCallback(() => {
    onClose();
    navigate(org ? `/${org}/checkout` : '/checkout');
  }, [onClose, navigate, org]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const catalogPath = org ? `/${org}/catalog` : '/catalog';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <motion.aside
            key="cart-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-[24rem] flex flex-col"
            style={{
              backgroundColor: 'var(--ws-bg, #09090b)',
              borderLeft: '1px solid var(--ws-border, rgba(255,255,255,0.08))',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
                >
                  Cart
                  {cartCount > 0 && (
                    <span
                      className="ml-1.5 text-xs font-medium"
                      style={{ color: 'var(--ws-muted)' }}
                    >
                      ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                    </span>
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--ws-muted)' }}
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart content */}
            {normalizedItems.length === 0 ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                >
                  <ShoppingBag
                    className="w-7 h-7"
                    style={{ color: 'var(--ws-muted)', opacity: 0.5 }}
                  />
                </div>
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: 'var(--ws-text)' }}
                >
                  Your cart is empty
                </h3>
                <p
                  className="text-xs mb-5"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Browse our catalog to add products to your cart.
                </p>
                <Link
                  to={catalogPath}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--ws-primary)',
                    color: 'var(--ws-bg, #000)',
                  }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Browse Products
                </Link>
              </div>
            ) : (
              <>
                {/* Scrollable items list */}
                <div className="flex-1 overflow-y-auto px-4">
                  {normalizedItems.map((item) => (
                    <CartItem
                      key={item.productId ?? item.id}
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>

                {/* Bottom: Cart Summary with checkout */}
                <div
                  className="flex-shrink-0 px-4 py-4"
                  style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
                >
                  <CartSummary items={normalizedItems} onCheckout={handleCheckout} />
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

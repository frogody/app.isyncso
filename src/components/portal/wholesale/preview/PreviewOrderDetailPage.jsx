import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import {
  GlassCard,
  Breadcrumb,
  StatusBadge,
  SecondaryButton,
  formatCurrency,
  gradientTextStyle,
} from './previewDesignSystem';
import { useWholesale } from '../WholesaleProvider';
import ShipmentTrackingMap from '../orders/ShipmentTrackingMap';

const ORDER_STATUS_CONFIG = {
  pending: { label: 'Pending Review', theme: 'info' },
  pending_review: { label: 'Pending Review', theme: 'info' },
  confirmed: { label: 'Confirmed', theme: 'primary' },
  processing: { label: 'Processing', theme: 'warning' },
  shipped: { label: 'In Transit', theme: 'info' },
  in_transit: { label: 'In Transit', theme: 'info' },
  delivered: { label: 'Delivered', theme: 'success' },
  invoiced: { label: 'Invoiced', theme: 'neutral' },
  cancelled: { label: 'Cancelled', theme: 'error' },
};

function formatDateFull(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PreviewOrderDetailPage({ config, nav, pageData }) {
  const { client } = useWholesale();
  const orderId = pageData?.orderId;

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !client?.id) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data: orderData } = await supabase
          .from('b2b_orders')
          .select('*')
          .eq('id', orderId)
          .eq('client_id', client.id)
          .single();

        if (orderData) {
          setOrder(orderData);

          const { data: itemsData } = await supabase
            .from('b2b_order_items')
            .select('*')
            .eq('b2b_order_id', orderId)
            .order('created_at', { ascending: true });

          setItems(itemsData || []);
        }
      } catch (err) {
        console.error('[PreviewOrderDetailPage] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [orderId, client?.id]);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ws-primary)' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Orders', onClick: () => nav?.goToOrders?.() },
            { label: 'Not Found' },
          ]}
        />
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>Order not found.</p>
        </div>
      </div>
    );
  }

  const statusCfg = ORDER_STATUS_CONFIG[order.status] || {};
  const addr = order.shipping_address || {};
  const deliveryAddress = [
    addr.street || addr.line1 || addr.address,
    [addr.zip || addr.postal_code, addr.city].filter(Boolean).join(' '),
    addr.state || addr.province,
    addr.country,
  ].filter(Boolean).join(', ');

  const subtotal = Number(order.subtotal) || 0;
  const vat = Number(order.tax_amount) || 0;
  const discount = Number(order.discount_amount) || 0;
  const total = Number(order.total) || 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ color: 'var(--ws-text)' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', onClick: () => nav?.goToHome?.() },
          { label: 'Orders', onClick: () => nav?.goToOrders?.() },
          { label: order.order_number || `#${order.id?.slice(0, 8)}` },
        ]}
      />

      {/* Back button */}
      <button
        type="button"
        onClick={() => nav?.goToOrders?.()}
        className="inline-flex items-center gap-2 text-sm font-medium mb-6 mt-4 transition-opacity hover:opacity-70"
        style={{ color: 'var(--ws-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Order header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ws-text)' }}>
              {order.order_number || `Order #${order.id?.slice(0, 8)}`}
            </h1>
            <StatusBadge status={statusCfg.theme} label={statusCfg.label} size="sm" />
          </div>
          <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
            Placed on {formatDateFull(order.created_at)}
          </p>
        </div>
      </div>

      {/* Track & Trace Map — full-width breakout */}
      {(order.status === 'shipped' || order.status === 'in_transit' || order.status === 'delivered') && (
        <div
          className="relative mb-8"
          style={{ width: '100vw', left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ShipmentTrackingMap orderId={orderId} />
          </div>
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line items */}
        <div className="lg:col-span-2">
          <GlassCard>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--ws-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                Order Items ({items.length})
              </h2>
            </div>

            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: idx < items.length - 1 ? '1px solid var(--ws-border)' : 'none',
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <Package className="w-4 h-4" style={{ color: 'var(--ws-muted)', opacity: 0.4 }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ws-text)' }}>
                      {item.product_name || 'Unknown Product'}
                    </p>
                    {item.sku && (
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ws-muted)' }}>
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                    {formatCurrency(Number(item.line_total) || (Number(item.unit_price) * (item.quantity || 1)))}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                    {item.quantity} x {formatCurrency(Number(item.unit_price) || 0)}
                  </p>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--ws-muted)' }}>
                No items in this order.
              </div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order summary */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ws-text)' }}>
              Order Summary
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Subtotal</span>
                <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Discount</span>
                  <span className="text-sm font-medium" style={{ color: 'rgba(34,197,94,0.9)' }}>
                    -{formatCurrency(discount)}
                  </span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>VAT</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                    {formatCurrency(vat)}
                  </span>
                </div>
              )}
              <div
                className="flex items-center justify-between pt-3 mt-1"
                style={{ borderTop: '1px solid var(--ws-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>Total</span>
                <span className="text-base font-bold" style={gradientTextStyle()}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Shipping address */}
          {deliveryAddress && (
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                  Delivery Address
                </h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                {deliveryAddress}
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

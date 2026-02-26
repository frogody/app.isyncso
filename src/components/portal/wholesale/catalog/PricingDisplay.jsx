import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * EUR currency formatter.
 */
const eurFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Skeleton placeholder used while price data is loading.
 */
function PricingSkeleton({ compact }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div
          className="h-5 w-16 rounded"
          style={{ backgroundColor: 'var(--ws-border)' }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div
        className="h-5 w-20 rounded"
        style={{ backgroundColor: 'var(--ws-border)' }}
      />
      <div
        className="h-4 w-28 rounded"
        style={{ backgroundColor: 'var(--ws-border)' }}
      />
      <div
        className="h-3 w-24 rounded mt-1"
        style={{ backgroundColor: 'var(--ws-border)' }}
      />
    </div>
  );
}

/**
 * Small tag showing the source of the resolved price.
 */
function DiscountTag({ source }) {
  if (!source || source === 'base') return null;

  const tagConfig = {
    client: {
      label: 'Client Price',
      bg: 'rgba(34, 197, 94, 0.10)',
      border: 'rgba(34, 197, 94, 0.25)',
      text: '#4ade80',
    },
    volume: {
      label: 'Volume Discount',
      bg: 'rgba(59, 130, 246, 0.10)',
      border: 'rgba(59, 130, 246, 0.25)',
      text: '#60a5fa',
    },
    promotion: {
      label: 'Promo Price',
      bg: 'rgba(168, 85, 247, 0.10)',
      border: 'rgba(168, 85, 247, 0.25)',
      text: '#c084fc',
    },
  };

  const config = tagConfig[source] || {
    label: source,
    bg: 'var(--ws-surface)',
    border: 'var(--ws-border)',
    text: 'var(--ws-muted)',
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
      }}
    >
      {config.label}
    </span>
  );
}

/**
 * PricingDisplay
 *
 * Client-specific B2B price resolution component for the wholesale storefront.
 *
 * When a clientId is provided, calls the Supabase RPC `get_b2b_client_price`
 * to resolve tiered / client-specific pricing. Falls back to displaying a
 * base price with a login prompt when unauthenticated.
 *
 * Props:
 *   productId   - UUID of the product
 *   clientId    - UUID of the logged-in B2B client (optional)
 *   quantity    - Order quantity (default 1)
 *   onPriceChange - Callback invoked with { unitPrice, lineTotal, source }
 *   compact     - Render a single-line price (card view) vs full breakdown
 */
function PricingDisplay({
  productId,
  clientId = null,
  quantity = 1,
  onPriceChange = null,
  compact = false,
}) {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track the latest fetch to ignore stale responses
  const fetchIdRef = useRef(0);

  const fetchPricing = useCallback(async () => {
    if (!productId) return;

    // If there is no client, we cannot resolve B2B pricing.
    if (!clientId) {
      setPricing(null);
      setLoading(false);
      setError(null);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_b2b_client_price', {
        p_client_id: clientId,
        p_product_id: productId,
        p_quantity: quantity,
      });

      // Ignore stale responses
      if (currentFetchId !== fetchIdRef.current) return;

      if (rpcError) {
        console.error('[PricingDisplay] RPC error:', rpcError);
        setError('Unable to load pricing');
        setPricing(null);
        return;
      }

      // The RPC is expected to return an object (or single row) with:
      //   unit_price  (number)
      //   source      (string: 'client' | 'volume' | 'base' | 'promotion')
      const result = Array.isArray(data) ? data[0] : data;

      if (!result || result.unit_price == null) {
        setError('Price not available');
        setPricing(null);
        return;
      }

      const unitPrice = Number(result.unit_price);
      const lineTotal = unitPrice * quantity;
      const source = result.source || 'base';

      const resolved = { unitPrice, lineTotal, source };
      setPricing(resolved);

      if (onPriceChange) {
        onPriceChange(resolved);
      }
    } catch (err) {
      if (currentFetchId !== fetchIdRef.current) return;
      console.error('[PricingDisplay] Unexpected error:', err);
      setError('Failed to fetch pricing');
      setPricing(null);
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [productId, clientId, quantity, onPriceChange]);

  // Re-fetch pricing when dependencies change
  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  // Notify parent when quantity changes (even for cached pricing)
  const prevQuantityRef = useRef(quantity);
  useEffect(() => {
    if (pricing && quantity !== prevQuantityRef.current) {
      const lineTotal = pricing.unitPrice * quantity;
      if (onPriceChange) {
        onPriceChange({ ...pricing, lineTotal });
      }
    }
    prevQuantityRef.current = quantity;
  }, [quantity, pricing, onPriceChange]);

  // Derived display values
  const formattedUnit = useMemo(
    () => (pricing ? eurFormatter.format(pricing.unitPrice) : null),
    [pricing]
  );
  const formattedTotal = useMemo(
    () => (pricing ? eurFormatter.format(pricing.unitPrice * quantity) : null),
    [pricing, quantity]
  );

  // --- Loading state ---
  if (loading) {
    return <PricingSkeleton compact={compact} />;
  }

  // --- No client (not logged in) ---
  if (!clientId) {
    return (
      <div className="flex flex-col gap-1">
        <p
          className="text-sm font-medium italic"
          style={{ color: 'var(--ws-muted)' }}
        >
          Login for pricing
        </p>
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <p className="text-xs" style={{ color: '#f87171' }}>
        {error}
      </p>
    );
  }

  // --- No pricing data ---
  if (!pricing) {
    return (
      <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
        Price not available
      </p>
    );
  }

  // --- Compact mode (card view) ---
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-base font-bold"
          style={{ color: 'var(--ws-primary)' }}
        >
          {formattedUnit}
        </span>
        {pricing.source !== 'base' && (
          <DiscountTag source={pricing.source} />
        )}
      </div>
    );
  }

  // --- Full mode (detail view) ---
  return (
    <div className="flex flex-col gap-1.5">
      {/* Unit price */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: 'var(--ws-primary)' }}
        >
          {formattedUnit}
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--ws-muted)' }}
        >
          per unit
        </span>
      </div>

      {/* Line total */}
      {quantity > 1 && (
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--ws-text)' }}
          >
            {formattedTotal}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--ws-muted)' }}
          >
            total for {quantity} units
          </span>
        </div>
      )}

      {/* Discount source */}
      {pricing.source !== 'base' && (
        <div className="mt-0.5">
          <DiscountTag source={pricing.source} />
        </div>
      )}
    </div>
  );
}

export default React.memo(PricingDisplay);

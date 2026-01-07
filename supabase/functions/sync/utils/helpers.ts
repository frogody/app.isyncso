/**
 * Shared Utility Functions for SYNC Tools
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ProductSearchResult, ActionResult } from '../tools/types.ts';

// ============================================================================
// Product Lookup Helpers
// ============================================================================

/**
 * Search products by name in the inventory
 */
export async function searchProducts(
  supabase: SupabaseClient,
  query: string,
  companyId?: string
): Promise<{ success: boolean; products: ProductSearchResult[]; error?: string }> {
  try {
    // Search products by name (case-insensitive)
    let productsQuery = supabase
      .from('products')
      .select('id, name, type, short_description, status')
      .ilike('name', `%${query}%`)
      .eq('status', 'published')
      .limit(10);

    if (companyId) {
      productsQuery = productsQuery.eq('company_id', companyId);
    }

    const { data: products, error } = await productsQuery;

    if (error) {
      console.error('Error searching products:', error);
      return { success: false, products: [], error: error.message };
    }

    if (!products || products.length === 0) {
      return { success: true, products: [] };
    }

    // For physical products, get pricing from physical_products table
    const physicalProductIds = products.filter(p => p.type === 'physical').map(p => p.id);
    let physicalProductsData: any[] = [];

    if (physicalProductIds.length > 0) {
      const { data: ppData } = await supabase
        .from('physical_products')
        .select('product_id, sku, pricing, inventory')
        .in('product_id', physicalProductIds);
      physicalProductsData = ppData || [];
    }

    // For digital products, get pricing from digital_products table
    const digitalProductIds = products.filter(p => p.type === 'digital').map(p => p.id);
    let digitalProductsData: any[] = [];

    if (digitalProductIds.length > 0) {
      const { data: dpData } = await supabase
        .from('digital_products')
        .select('product_id, pricing_config')
        .in('product_id', digitalProductIds);
      digitalProductsData = dpData || [];
    }

    // Map to result format
    const results: ProductSearchResult[] = products.map(product => {
      if (product.type === 'physical') {
        const physical = physicalProductsData.find(pp => pp.product_id === product.id);
        const price = physical?.pricing?.base_price ? parseFloat(physical.pricing.base_price) : 0;
        const quantity = physical?.inventory?.quantity ?? 0;
        return {
          id: product.id,
          name: product.name,
          type: 'physical' as const,
          price,
          currency: physical?.pricing?.currency || 'EUR',
          sku: physical?.sku,
          description: product.short_description,
          in_stock: quantity > 0,
          quantity,
        };
      } else {
        const digital = digitalProductsData.find(dp => dp.product_id === product.id);
        const price = digital?.pricing_config?.base_price ? parseFloat(digital.pricing_config.base_price) : 0;
        return {
          id: product.id,
          name: product.name,
          type: 'digital' as const,
          price,
          currency: 'EUR',
          description: product.short_description,
          in_stock: true,
        };
      }
    });

    return { success: true, products: results };
  } catch (err) {
    console.error('Exception searching products:', err);
    return { success: false, products: [], error: String(err) };
  }
}

/**
 * Lookup a single product price by name
 */
export async function lookupProductPrice(
  supabase: SupabaseClient,
  productName: string
): Promise<{ found: boolean; price?: number; name?: string; sku?: string }> {
  const result = await searchProducts(supabase, productName);
  if (result.success && result.products.length > 0) {
    const product = result.products[0];
    return { found: true, price: product.price, name: product.name, sku: product.sku };
  }
  return { found: false };
}

// ============================================================================
// Financial Calculation Helpers
// ============================================================================

/**
 * Calculate line items with optional product price lookup
 */
export async function calculateLineItems(
  supabase: SupabaseClient,
  items: Array<{ name: string; quantity: number; unit_price?: number; description?: string }>
): Promise<{
  lineItems: Array<{ name: string; quantity: number; unit_price: number; description: string; total: number }>;
  subtotal: number;
  lookups: Array<{ name: string; found: boolean; price?: number }>;
}> {
  let subtotal = 0;
  const lookups: Array<{ name: string; found: boolean; price?: number }> = [];
  const lineItems: Array<{ name: string; quantity: number; unit_price: number; description: string; total: number }> = [];

  for (const item of items) {
    let unitPrice = item.unit_price;

    // If no price provided, lookup from product inventory
    if (!unitPrice || unitPrice === 0) {
      const lookup = await lookupProductPrice(supabase, item.name);
      lookups.push({ name: item.name, found: lookup.found, price: lookup.price });

      if (lookup.found && lookup.price) {
        unitPrice = lookup.price;
        console.log(`Found price for "${item.name}": €${unitPrice}`);
      } else {
        console.warn(`No price found for "${item.name}", skipping item`);
        continue;
      }
    }

    const total = item.quantity * unitPrice;
    subtotal += total;
    lineItems.push({
      name: item.name,
      quantity: item.quantity,
      unit_price: unitPrice,
      description: item.description || item.name,
      total,
    });
  }

  return { lineItems, subtotal, lookups };
}

/**
 * Calculate tax amounts (Dutch BTW default 21%)
 */
export function calculateTax(subtotal: number, taxPercent: number = 21): { taxAmount: number; total: number } {
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const total = subtotal + taxAmount;
  return { taxAmount, total };
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('nl-NL');
}

/**
 * Generate a document number
 */
export function generateDocNumber(prefix: string): string {
  return `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

// ============================================================================
// Result Formatting Helpers
// ============================================================================

/**
 * Create a success action result
 */
export function successResult(message: string, result?: any, link?: string): ActionResult {
  return {
    success: true,
    message,
    result,
    link,
  };
}

/**
 * Create an error action result
 */
export function errorResult(message: string, error?: string): ActionResult {
  return {
    success: false,
    message,
    error,
  };
}

/**
 * Format a list of items for display
 */
export function formatList(items: any[], formatter: (item: any) => string, maxItems: number = 10): string {
  const limited = items.slice(0, maxItems);
  const formatted = limited.map(formatter).join('\n');
  if (items.length > maxItems) {
    return `${formatted}\n\n... and ${items.length - maxItems} more`;
  }
  return formatted;
}

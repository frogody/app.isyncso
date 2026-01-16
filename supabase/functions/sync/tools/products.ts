/**
 * Product Tool Functions for SYNC
 *
 * Actions:
 * - search_products
 * - create_product
 * - update_product
 * - update_inventory
 * - list_products
 * - get_low_stock
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ActionResult,
  ActionContext,
  ProductData,
  PhysicalProductData,
  ProductFilters,
  InventoryUpdate,
} from './types.ts';
import {
  searchProducts,
  formatCurrency,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// ============================================================================
// Search Products
// ============================================================================

export async function searchProductsAction(
  ctx: ActionContext,
  data: { query: string }
): Promise<ActionResult> {
  try {
    const result = await searchProducts(ctx.supabase, data.query, ctx.companyId);

    if (!result.success) {
      return errorResult(`Failed to search products: ${result.error}`, result.error);
    }

    if (result.products.length === 0) {
      return successResult(`No products found matching "${data.query}"`, []);
    }

    // Brief summary only - no list unless asked
    const outOfStock = result.products.filter(p => p.type === 'physical' && !p.in_stock).length;
    const stockNote = outOfStock > 0 ? ` ${outOfStock} out of stock.` : '';

    return successResult(
      `${result.products.length} products match "${data.query}".${stockNote}`,
      result.products,
      '/products'
    );
  } catch (err) {
    return errorResult(`Exception searching products: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create Product
// ============================================================================

export async function createProduct(
  ctx: ActionContext,
  data: ProductData | PhysicalProductData
): Promise<ActionResult> {
  try {
    // Create base product record
    const productRecord = {
      company_id: ctx.companyId,
      name: data.name,
      type: data.type,
      tagline: data.tagline || null,
      description: data.description || null,
      short_description: data.short_description || null,
      tags: data.tags || [],
      status: data.status || 'draft',
    };

    const { data: product, error } = await ctx.supabase
      .from('products')
      .insert(productRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create product: ${error.message}`, error.message);
    }

    // If physical product, create physical_products record
    if (data.type === 'physical') {
      const physicalData = data as PhysicalProductData;

      const physicalRecord = {
        product_id: product.id,
        sku: physicalData.sku || `SKU-${Date.now().toString().slice(-8)}`,
        barcode: physicalData.barcode || null,
        pricing: {
          base_price: physicalData.price,
          currency: 'EUR',
        },
        cost_price: physicalData.cost_price || null,
        inventory: {
          quantity: physicalData.quantity || 0,
          low_stock_threshold: physicalData.low_stock_threshold || 10,
          track_inventory: true,
        },
        weight: physicalData.weight || null,
        country_of_origin: physicalData.country_of_origin || null,
      };

      const { error: physError } = await ctx.supabase
        .from('physical_products')
        .insert(physicalRecord);

      if (physError) {
        // Rollback product creation
        await ctx.supabase.from('products').delete().eq('id', product.id);
        return errorResult(`Failed to create physical product: ${physError.message}`, physError.message);
      }

      return successResult(
        `✅ Physical product created!\n\n**${product.name}**\n- SKU: ${physicalRecord.sku}\n- Price: ${formatCurrency(physicalData.price)}\n- Stock: ${physicalData.quantity || 0} units\n- Status: ${product.status}`,
        { ...product, ...physicalRecord },
        '/products'
      );
    }

    // Digital product
    return successResult(
      `✅ Digital product created!\n\n**${product.name}**\n- Type: ${product.type}\n- Status: ${product.status}`,
      product,
      '/products'
    );
  } catch (err) {
    return errorResult(`Exception creating product: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Update Product
// ============================================================================

export async function updateProduct(
  ctx: ActionContext,
  data: { id?: string; name?: string; sku?: string; updates: Partial<ProductData & { price?: number }> }
): Promise<ActionResult> {
  try {
    // Find product by ID, name, or SKU
    let productId = data.id;
    let productName = data.name;

    if (!productId && data.name) {
      const { data: products } = await ctx.supabase
        .from('products')
        .select('id, name')
        .eq('company_id', ctx.companyId)
        .ilike('name', `%${data.name}%`)
        .limit(1);

      if (products && products.length > 0) {
        productId = products[0].id;
        productName = products[0].name;
      }
    }

    if (!productId && data.sku) {
      const { data: physical } = await ctx.supabase
        .from('physical_products')
        .select('product_id, products!inner(id, name, company_id)')
        .eq('sku', data.sku)
        .eq('products.company_id', ctx.companyId)
        .limit(1);

      if (physical && physical.length > 0) {
        productId = physical[0].product_id;
        productName = (physical[0] as any).products.name;
      }
    }

    if (!productId) {
      return errorResult('Product not found. Please provide a valid ID, name, or SKU.', 'Not found');
    }

    // Update base product fields
    const productUpdates: Record<string, any> = {};
    if (data.updates.name) productUpdates.name = data.updates.name;
    if (data.updates.tagline !== undefined) productUpdates.tagline = data.updates.tagline;
    if (data.updates.description !== undefined) productUpdates.description = data.updates.description;
    if (data.updates.short_description !== undefined) productUpdates.short_description = data.updates.short_description;
    if (data.updates.tags !== undefined) productUpdates.tags = data.updates.tags;
    if (data.updates.status !== undefined) productUpdates.status = data.updates.status;

    if (Object.keys(productUpdates).length > 0) {
      productUpdates.updated_at = new Date().toISOString();

      const { error } = await ctx.supabase
        .from('products')
        .update(productUpdates)
        .eq('id', productId);

      if (error) {
        return errorResult(`Failed to update product: ${error.message}`, error.message);
      }
    }

    // Update price if provided (for physical products)
    if (data.updates.price !== undefined) {
      const { data: existing } = await ctx.supabase
        .from('physical_products')
        .select('pricing')
        .eq('product_id', productId)
        .single();

      if (existing) {
        const newPricing = {
          ...(existing.pricing || {}),
          base_price: data.updates.price,
        };

        await ctx.supabase
          .from('physical_products')
          .update({ pricing: newPricing })
          .eq('product_id', productId);
      }
    }

    const changes = Object.keys({ ...productUpdates, ...(data.updates.price !== undefined ? { price: data.updates.price } : {}) });

    return successResult(
      `✅ Product updated!\n\n**${productName || 'Product'}**\nUpdated fields: ${changes.join(', ')}`,
      { id: productId, updates: data.updates },
      '/products'
    );
  } catch (err) {
    return errorResult(`Exception updating product: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Update Inventory
// ============================================================================

export async function updateInventory(
  ctx: ActionContext,
  data: InventoryUpdate | { name?: string; sku?: string; quantity: number; adjustment_type?: 'set' | 'add' | 'subtract' }
): Promise<ActionResult> {
  try {
    let productId = (data as InventoryUpdate).product_id;
    let productName: string | undefined;

    // Find product if not provided by ID
    if (!productId && (data as any).name) {
      const { data: products } = await ctx.supabase
        .from('products')
        .select('id, name, type')
        .eq('company_id', ctx.companyId)
        .eq('type', 'physical')
        .ilike('name', `%${(data as any).name}%`)
        .limit(1);

      if (products && products.length > 0) {
        productId = products[0].id;
        productName = products[0].name;
      }
    }

    if (!productId && (data as any).sku) {
      const { data: physical } = await ctx.supabase
        .from('physical_products')
        .select('product_id, products!inner(id, name, company_id, type)')
        .eq('sku', (data as any).sku)
        .eq('products.company_id', ctx.companyId)
        .limit(1);

      if (physical && physical.length > 0) {
        productId = physical[0].product_id;
        productName = (physical[0] as any).products.name;
      }
    }

    if (!productId) {
      return errorResult('Product not found. Please provide a valid product ID, name, or SKU.', 'Not found');
    }

    // Get current inventory
    const { data: physical, error: fetchError } = await ctx.supabase
      .from('physical_products')
      .select('inventory, products!inner(name)')
      .eq('product_id', productId)
      .single();

    if (fetchError || !physical) {
      return errorResult('Physical product record not found. This action only works for physical products.', 'Not found');
    }

    productName = productName || (physical as any).products.name;
    const currentQty = physical.inventory?.quantity ?? 0;
    const adjustmentType = data.adjustment_type || 'set';

    let newQty: number;
    switch (adjustmentType) {
      case 'add':
        newQty = currentQty + data.quantity;
        break;
      case 'subtract':
        newQty = Math.max(0, currentQty - data.quantity);
        break;
      default: // 'set'
        newQty = data.quantity;
    }

    // Update inventory
    const newInventory = {
      ...(physical.inventory || {}),
      quantity: newQty,
    };

    const { error: updateError } = await ctx.supabase
      .from('physical_products')
      .update({ inventory: newInventory })
      .eq('product_id', productId);

    if (updateError) {
      return errorResult(`Failed to update inventory: ${updateError.message}`, updateError.message);
    }

    const changeStr = adjustmentType === 'set'
      ? `${currentQty} → ${newQty}`
      : adjustmentType === 'add'
        ? `${currentQty} + ${data.quantity} = ${newQty}`
        : `${currentQty} - ${data.quantity} = ${newQty}`;

    return successResult(
      `✅ Inventory updated!\n\n**${productName}**\nStock: ${changeStr} units`,
      { productId, productName, previousQty: currentQty, newQty, adjustment: adjustmentType },
      '/products'
    );
  } catch (err) {
    return errorResult(`Exception updating inventory: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Products
// ============================================================================

export async function listProducts(
  ctx: ActionContext,
  filters: ProductFilters = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('products')
      .select('id, name, type, status, short_description')
      .eq('company_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(filters.limit || 20);

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data: products, error } = await query;

    if (error) {
      return errorResult(`Failed to list products: ${error.message}`, error.message);
    }

    if (!products || products.length === 0) {
      return successResult('No products found matching your criteria.', []);
    }

    // Get pricing for physical products
    const physicalIds = products.filter(p => p.type === 'physical').map(p => p.id);
    let physicalData: any[] = [];

    if (physicalIds.length > 0) {
      const { data: ppData } = await ctx.supabase
        .from('physical_products')
        .select('product_id, sku, pricing, inventory')
        .in('product_id', physicalIds);
      physicalData = ppData || [];
    }

    // Brief summary only
    const outOfStock = physicalData.filter(pp => (pp.inventory?.quantity ?? 0) === 0).length;
    const lowStock = physicalData.filter(pp => {
      const qty = pp.inventory?.quantity ?? 0;
      const threshold = pp.inventory?.low_stock_threshold ?? 10;
      return qty > 0 && qty <= threshold;
    }).length;

    let stockNote = '';
    if (outOfStock > 0) stockNote += ` ${outOfStock} out of stock.`;
    if (lowStock > 0) stockNote += ` ${lowStock} low.`;

    return successResult(
      `${products.length} products.${stockNote}`,
      products.map(p => {
        const physical = physicalData.find(pp => pp.product_id === p.id);
        return {
          ...p,
          price: physical?.pricing?.base_price,
          sku: physical?.sku,
          quantity: physical?.inventory?.quantity,
        };
      }),
      '/products'
    );
  } catch (err) {
    return errorResult(`Exception listing products: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get Low Stock
// ============================================================================

export async function getLowStock(
  ctx: ActionContext,
  data: { threshold?: number } = {}
): Promise<ActionResult> {
  try {
    // Default threshold or use provided
    const threshold = data.threshold || 10;

    // Get all physical products with their inventory
    const { data: products, error } = await ctx.supabase
      .from('physical_products')
      .select(`
        product_id,
        sku,
        inventory,
        pricing,
        products!inner(id, name, company_id, status)
      `)
      .eq('products.company_id', ctx.companyId)
      .eq('products.status', 'published');

    if (error) {
      return errorResult(`Failed to check inventory: ${error.message}`, error.message);
    }

    if (!products || products.length === 0) {
      return successResult('No physical products found in inventory.', []);
    }

    // Filter low stock items
    const lowStock = products.filter(p => {
      const qty = p.inventory?.quantity ?? 0;
      const itemThreshold = p.inventory?.low_stock_threshold ?? threshold;
      return qty <= itemThreshold;
    });

    if (lowStock.length === 0) {
      return successResult(`✅ All products are well-stocked (above ${threshold} units)!`, []);
    }

    const sorted = lowStock.sort((a, b) =>
      (a.inventory?.quantity ?? 0) - (b.inventory?.quantity ?? 0)
    );

    // Brief summary only
    const outOfStock = sorted.filter(p => (p.inventory?.quantity ?? 0) === 0).length;
    const justLow = sorted.length - outOfStock;

    let msg = `${sorted.length} need attention.`;
    if (outOfStock > 0) msg += ` ${outOfStock} out of stock.`;
    if (justLow > 0) msg += ` ${justLow} running low.`;

    return successResult(
      msg,
      sorted.map(p => ({
        id: p.product_id,
        name: (p as any).products.name,
        sku: p.sku,
        quantity: p.inventory?.quantity ?? 0,
        threshold: p.inventory?.low_stock_threshold ?? threshold,
        price: p.pricing?.base_price,
      })),
      '/products'
    );
  } catch (err) {
    return errorResult(`Exception checking low stock: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Products Action Router
// ============================================================================

export async function executeProductsAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'search_products':
      return searchProductsAction(ctx, data);
    case 'create_product':
      return createProduct(ctx, data);
    case 'update_product':
      return updateProduct(ctx, data);
    case 'update_inventory':
      return updateInventory(ctx, data);
    case 'list_products':
      return listProducts(ctx, data);
    case 'get_low_stock':
      return getLowStock(ctx, data);
    default:
      return errorResult(`Unknown products action: ${action}`, 'Unknown action');
  }
}

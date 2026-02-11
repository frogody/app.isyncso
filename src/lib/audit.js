import { supabase } from '@/api/supabaseClient';

const SKIP_FIELDS = ['id', 'created_at', 'updated_at', 'company_id', 'created_by', 'updated_by'];

/**
 * Calculate field-level diffs between old and new objects.
 * Returns { field: { old, new } } or null if no changes.
 */
export function calculateDiffs(oldData, newData) {
  const changes = {};
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

  for (const key of allKeys) {
    if (SKIP_FIELDS.includes(key)) continue;
    const oldVal = oldData?.[key] ?? null;
    const newVal = newData?.[key] ?? null;
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Infer an action type from the changes.
 */
function inferAction(changes) {
  if (!changes) return 'updated';
  if (changes.status) {
    if (changes.status.new === 'published') return 'published';
    if (changes.status.new === 'archived') return 'archived';
    return 'status_changed';
  }
  if (changes.featured_image || changes.gallery) return 'image_added';
  if (changes.base_price || changes.price || changes.compare_at_price) return 'price_changed';
  return 'updated';
}

/**
 * Generate a human-readable summary from action + changes.
 */
function generateSummary(action, changes) {
  switch (action) {
    case 'created': return 'Product created';
    case 'published': return 'Product published';
    case 'archived': return 'Product archived';
    case 'status_changed':
      return `Status changed from "${changes?.status?.old || '?'}" to "${changes?.status?.new || '?'}"`;
    case 'price_changed': {
      const field = changes?.base_price ? 'base_price' : changes?.price ? 'price' : 'compare_at_price';
      return `Price updated: ${changes?.[field]?.old} → ${changes?.[field]?.new}`;
    }
    case 'image_added': return 'Product images updated';
    case 'channel_added': return 'Sales channel added';
    case 'channel_removed': return 'Sales channel removed';
    case 'supplier_added': return 'Supplier linked';
    case 'supplier_removed': return 'Supplier removed';
    case 'deleted': return 'Product deleted';
    default: {
      const fieldNames = Object.keys(changes || {});
      if (fieldNames.length === 0) return 'Product updated';
      if (fieldNames.length <= 3) return `Updated ${fieldNames.join(', ')}`;
      return `Updated ${fieldNames.length} fields`;
    }
  }
}

/**
 * Log a product activity event to product_activity_log.
 */
export async function logProductActivity({
  productId,
  companyId,
  actorId,
  action = null,
  changes = null,
  summary = null,
  source = 'app',
  metadata = null,
}) {
  const finalAction = action || inferAction(changes);
  const finalSummary = summary || generateSummary(finalAction, changes);

  const { error } = await supabase
    .from('product_activity_log')
    .insert({
      product_id: productId,
      company_id: companyId,
      actor_id: actorId,
      action: finalAction,
      summary: finalSummary,
      changes,
      source,
      metadata,
    });

  if (error) {
    console.error('[audit] Failed to log product activity:', error);
  }
}

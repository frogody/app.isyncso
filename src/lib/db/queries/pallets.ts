/**
 * Pallet & Shipment Queries
 */

import { supabase } from '@/api/supabaseClient';
import type {
  Shipment,
  ShipmentInsert,
  ShipmentUpdate,
  Pallet,
  PalletInsert,
  PalletUpdate,
  PalletItem,
  PalletItemInsert,
} from '../schema';

// =============================================================================
// SHIPMENTS
// =============================================================================

export async function createShipment(shipment: ShipmentInsert): Promise<Shipment> {
  const { data, error } = await supabase
    .from('shipments')
    .insert(shipment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getShipment(id: string): Promise<Shipment | null> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getShipmentWithPallets(id: string): Promise<Shipment & { pallets: (Pallet & { pallet_items: PalletItem[] })[] } | null> {
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      *,
      pallets (
        *,
        pallet_items (
          *,
          products (id, name, sku, ean)
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as any;
}

export async function updateShipment(id: string, updates: ShipmentUpdate): Promise<Shipment> {
  const { data, error } = await supabase
    .from('shipments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listShipments(
  companyId: string,
  filters?: { status?: string | string[] }
): Promise<Shipment[]> {
  let query = supabase
    .from('shipments')
    .select('*')
    .eq('company_id', companyId);

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function finalizeShipment(
  id: string,
  userId: string,
  notes?: string
): Promise<Shipment> {
  // Count totals from pallet_items across all pallets in this shipment
  const { data: pallets, error: palletsError } = await supabase
    .from('pallets')
    .select(`
      id,
      pallet_items (
        product_id,
        ean,
        quantity
      )
    `)
    .eq('shipment_id', id);

  if (palletsError) throw palletsError;

  let totalItems = 0;
  const uniqueEans = new Set<string>();

  for (const pallet of (pallets || [])) {
    for (const item of (pallet.pallet_items || [])) {
      totalItems += item.quantity || 0;
      if (item.ean) uniqueEans.add(item.ean);
    }
  }

  return updateShipment(id, {
    status: 'finalized',
    finalized_by: userId,
    finalized_at: new Date().toISOString(),
    total_pallets: (pallets || []).length,
    total_items: totalItems,
    total_unique_eans: uniqueEans.size,
    notes: notes || undefined,
  });
}

// =============================================================================
// PALLETS
// =============================================================================

export async function addPallet(pallet: PalletInsert): Promise<Pallet> {
  const { data, error } = await supabase
    .from('pallets')
    .insert(pallet)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePallet(id: string, updates: PalletUpdate): Promise<Pallet> {
  const { data, error } = await supabase
    .from('pallets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removePallet(id: string): Promise<void> {
  const { error } = await supabase
    .from('pallets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function listPalletsByShipment(shipmentId: string): Promise<(Pallet & { pallet_items: PalletItem[] })[]> {
  const { data, error } = await supabase
    .from('pallets')
    .select(`
      *,
      pallet_items (
        *,
        products (id, name, sku, ean)
      )
    `)
    .eq('shipment_id', shipmentId)
    .order('sequence_number');

  if (error) throw error;
  return (data || []) as any;
}

export async function getNextPalletSequence(shipmentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('pallets')
    .select('sequence_number')
    .eq('shipment_id', shipmentId)
    .order('sequence_number', { ascending: false })
    .limit(1);

  if (error) throw error;
  return ((data?.[0]?.sequence_number) || 0) + 1;
}

export function generatePalletCode(sequenceNumber: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PLT-${date}-${String(sequenceNumber).padStart(3, '0')}`;
}

// =============================================================================
// PALLET ITEMS
// =============================================================================

export async function addPalletItem(item: PalletItemInsert): Promise<PalletItem> {
  const { data, error } = await supabase
    .from('pallet_items')
    .insert(item)
    .select(`
      *,
      products (id, name, sku, ean)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePalletItemQty(id: string, quantity: number): Promise<PalletItem> {
  const { data, error } = await supabase
    .from('pallet_items')
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      products (id, name, sku, ean)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function removePalletItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('pallet_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function listPalletItems(palletId: string): Promise<PalletItem[]> {
  const { data, error } = await supabase
    .from('pallet_items')
    .select(`
      *,
      products (id, name, sku, ean)
    `)
    .eq('pallet_id', palletId)
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export async function findPalletItemByProduct(palletId: string, productId: string): Promise<PalletItem | null> {
  const { data, error } = await supabase
    .from('pallet_items')
    .select(`
      *,
      products (id, name, sku, ean)
    `)
    .eq('pallet_id', palletId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// =============================================================================
// AGGREGATION
// =============================================================================

export interface EanSummaryRow {
  ean: string;
  product_id: string;
  product_name: string;
  total_packed: number;
}

export async function getShipmentEanSummary(shipmentId: string): Promise<EanSummaryRow[]> {
  // Get all pallet items across all pallets in this shipment
  const { data: pallets, error } = await supabase
    .from('pallets')
    .select(`
      pallet_items (
        product_id,
        ean,
        quantity,
        products (id, name)
      )
    `)
    .eq('shipment_id', shipmentId);

  if (error) throw error;

  // Aggregate by EAN
  const eanMap = new Map<string, EanSummaryRow>();

  for (const pallet of (pallets || [])) {
    for (const item of (pallet.pallet_items || [])) {
      const ean = item.ean || '';
      const existing = eanMap.get(ean);
      if (existing) {
        existing.total_packed += item.quantity || 0;
      } else {
        eanMap.set(ean, {
          ean,
          product_id: item.product_id,
          product_name: (item.products as any)?.name || 'Unknown',
          total_packed: item.quantity || 0,
        });
      }
    }
  }

  return Array.from(eanMap.values()).sort((a, b) => a.product_name.localeCompare(b.product_name));
}

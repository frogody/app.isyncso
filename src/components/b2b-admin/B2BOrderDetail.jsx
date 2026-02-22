/**
 * B2BOrderDetail - Admin order detail view for a single B2B wholesale order.
 *
 * Shows order header (number, status, date, customer), line items table,
 * order summary (subtotal/tax/shipping/total), status progression stepper,
 * tracking number input, and order notes/timeline.
 *
 * Uses useParams for orderId. Fetches from b2b_orders + b2b_order_items + b2b_order_notes.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Send,
  Copy,
  ExternalLink,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  MessageSquare,
  Hash,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

import { ORDER_STATUS_COLORS, DEFAULT_STATUS_COLOR } from './shared/b2bConstants';
import { processOrderConfirmed, processOrderShipped } from '@/lib/b2b/processB2BOrder';

const STATUS_STEPS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const colorClass = ORDER_STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatusStepper({ currentStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-5">Order Progress</h3>

      {isCancelled ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-400">This order has been cancelled.</p>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isCompleted = idx <= currentIdx;
            const isActive = idx === currentIdx;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-2 relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400'
                        : isCompleted
                          ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400'
                          : 'bg-zinc-800 border-2 border-zinc-700 text-zinc-500'
                    }`}
                  >
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-cyan-400' : isCompleted ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mb-6 mx-1 rounded ${
                      idx < currentIdx ? 'bg-emerald-500/40' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LineItemsTable({ items }) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
        <ShoppingCart className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">No line items found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-400">Line Items</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Product</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">SKU</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Qty</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Unit Price</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <Package className="w-4 h-4 text-zinc-500" />
                      </div>
                    )}
                    <span className="text-white font-medium">{item.product_name || 'Unnamed Product'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{item.sku || '-'}</td>
                <td className="px-6 py-4 text-right text-zinc-300">{item.quantity}</td>
                <td className="px-6 py-4 text-right text-zinc-300">
                  {formatAmount(item.unit_price, item.currency)}
                </td>
                <td className="px-6 py-4 text-right text-white font-medium">
                  {formatAmount(item.line_total || item.quantity * item.unit_price, item.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderSummary({ order }) {
  const subtotal = parseFloat(String(order.subtotal || 0));
  const tax = parseFloat(String(order.tax || 0));
  const shipping = parseFloat(String(order.shipping_cost || 0));
  const discount = parseFloat(String(order.discount || 0));
  const total = parseFloat(String(order.total || 0));
  const currency = order.currency || 'EUR';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Order Summary</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Subtotal</span>
          <span className="text-zinc-300">{formatAmount(subtotal, currency)}</span>
        </div>
        {tax > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Tax</span>
            <span className="text-zinc-300">{formatAmount(tax, currency)}</span>
          </div>
        )}
        {shipping > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Shipping</span>
            <span className="text-zinc-300">{formatAmount(shipping, currency)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Discount</span>
            <span className="text-emerald-400">-{formatAmount(discount, currency)}</span>
          </div>
        )}
        <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
          <span className="text-white font-semibold">Total</span>
          <span className="text-white font-semibold text-lg">{formatAmount(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}

function NoteTimeline({ notes, onAddNote, addingNote }) {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await onAddNote(newNote.trim());
    setNewNote('');
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Notes & Timeline
      </h3>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
        />
        <button
          type="submit"
          disabled={addingNote || !newNote.trim()}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {/* Notes list */}
      <div className="space-y-4">
        {(!notes || notes.length === 0) && (
          <p className="text-sm text-zinc-500 text-center py-4">No notes yet.</p>
        )}
        <AnimatePresence>
          {(notes || []).map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative pl-6 border-l-2 border-zinc-800"
            >
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-cyan-500" />
              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-300">{note.author_name || 'System'}</span>
                  <span className="text-xs text-zinc-600">
                    {new Date(note.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {note.note_type && note.note_type !== 'note' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {note.note_type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400">{note.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TrackingInput({ order, onUpdateTracking, onMarkShipped, updating }) {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url || '');
  const [carrier, setCarrier] = useState(order.carrier || '');

  const handleSave = () => {
    onUpdateTracking(trackingNumber, trackingUrl);
  };

  const handleShip = () => {
    if (!trackingNumber.trim()) return;
    onMarkShipped(trackingNumber.trim(), carrier || null);
  };

  const hasChanged =
    trackingNumber !== (order.tracking_number || '') ||
    trackingUrl !== (order.tracking_url || '');

  const canShip =
    trackingNumber.trim() &&
    ['confirmed', 'processing'].includes(order.status);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
        <Truck className="w-4 h-4" />
        Shipping & Tracking
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Tracking Number</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 3SXXXX1234567890"
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors font-mono"
            />
            {trackingNumber && (
              <button
                onClick={() => navigator.clipboard.writeText(trackingNumber)}
                className="p-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors"
                title="Copy tracking number"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Carrier (optional)</label>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          >
            <option value="">Select carrier...</option>
            <option value="PostNL">PostNL</option>
            <option value="DHL">DHL</option>
            <option value="DPD">DPD</option>
            <option value="UPS">UPS</option>
            <option value="FedEx">FedEx</option>
            <option value="GLS">GLS</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Tracking URL (optional)</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://tracking.carrier.com/..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors"
                title="Open tracking URL"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Mark as Shipped button — visible when order is confirmed/processing */}
        {canShip && (
          <button
            onClick={handleShip}
            disabled={updating}
            className="w-full mt-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Truck className="w-4 h-4" />
                Mark as Shipped
              </>
            )}
          </button>
        )}

        {/* Save tracking info button (when already shipped or just editing) */}
        {hasChanged && !canShip && (
          <button
            onClick={handleSave}
            disabled={updating}
            className="w-full mt-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Tracking Info'}
          </button>
        )}
      </div>
    </div>
  );
}

function CustomerCard({ client }) {
  if (!client) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
        <User className="w-4 h-4" />
        Customer
      </h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-cyan-400">
              {(client.name || client.company_name || 'C').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-medium text-sm">{client.name || client.company_name || 'Unknown Client'}</p>
            {client.company_name && client.name && (
              <p className="text-xs text-zinc-500">{client.company_name}</p>
            )}
          </div>
        </div>
        {client.email && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Mail className="w-3.5 h-3.5 text-zinc-500" />
            <a href={`mailto:${client.email}`} className="hover:text-cyan-400 transition-colors">{client.email}</a>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Phone className="w-3.5 h-3.5 text-zinc-500" />
            <span>{client.phone}</span>
          </div>
        )}
        {(client.address || client.city) && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <MapPin className="w-3.5 h-3.5 text-zinc-500" />
            <span>{[client.address, client.city, client.country].filter(Boolean).join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(String(amount)) || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function B2BOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const organizationId = user?.organization_id || user?.company_id;

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [addingNote, setAddingNote] = useState(false);
  const [updatingTracking, setUpdatingTracking] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch order data
  // -----------------------------------------------------------------------
  const fetchOrder = useCallback(async () => {
    if (!orderId || !organizationId) return;
    setLoading(true);
    setError(null);

    try {
      const [orderRes, itemsRes, notesRes] = await Promise.all([
        supabase
          .from('b2b_orders')
          .select(`
            *,
            portal_clients (id, full_name, email, company_name)
          `)
          .eq('id', orderId)
          .eq('organization_id', organizationId)
          .single(),

        supabase
          .from('b2b_order_items')
          .select('*')
          .eq('b2b_order_id', orderId)
          .order('created_at', { ascending: true }),

        supabase
          .from('b2b_order_notes')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false }),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (!orderRes.data) throw new Error('Order not found');

      setOrder(orderRes.data);
      setItems(itemsRes.data || []);
      setNotes(notesRes.data || []);
    } catch (err) {
      console.error('[B2BOrderDetail] fetch error:', err);
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId, organizationId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // -----------------------------------------------------------------------
  // Update order status
  // -----------------------------------------------------------------------
  const updateStatus = useCallback(
    async (newStatus, extra = {}) => {
      if (!order) return;
      setActionLoading(newStatus);
      try {
        const updates = { status: newStatus, updated_at: new Date().toISOString(), ...extra };

        // For confirmed, add approved_by/approved_at
        if (newStatus === 'confirmed') {
          updates.approved_by = user?.id;
          updates.approved_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from('b2b_orders')
          .update(updates)
          .eq('id', order.id);

        if (updateError) throw updateError;

        // Add system note
        await supabase.from('b2b_order_notes').insert({
          order_id: order.id,
          content: `Status changed to ${newStatus}`,
          author_name: user?.full_name || user?.email || 'Admin',
          note_type: 'status_change',
        });

        // Run automation for specific transitions
        try {
          if (newStatus === 'confirmed') {
            await processOrderConfirmed(order.id, organizationId, user?.id);
          }
        } catch (autoErr) {
          console.warn('[B2BOrderDetail] automation error:', autoErr);
        }

        await fetchOrder();
      } catch (err) {
        console.error('[B2BOrderDetail] status update error:', err);
        setError(err.message);
      } finally {
        setActionLoading(null);
      }
    },
    [order, user, organizationId, fetchOrder]
  );

  // -----------------------------------------------------------------------
  // Add note
  // -----------------------------------------------------------------------
  const addNote = useCallback(
    async (content) => {
      if (!order) return;
      setAddingNote(true);
      try {
        const { error: noteError } = await supabase.from('b2b_order_notes').insert({
          order_id: order.id,
          content,
          author_name: user?.full_name || user?.email || 'Admin',
          note_type: 'note',
        });
        if (noteError) throw noteError;
        await fetchOrder();
      } catch (err) {
        console.error('[B2BOrderDetail] add note error:', err);
      } finally {
        setAddingNote(false);
      }
    },
    [order, user, fetchOrder]
  );

  // -----------------------------------------------------------------------
  // Update tracking
  // -----------------------------------------------------------------------
  const updateTracking = useCallback(
    async (trackingNumber, trackingUrl) => {
      if (!order) return;
      setUpdatingTracking(true);
      try {
        const { error: trackError } = await supabase
          .from('b2b_orders')
          .update({
            tracking_number: trackingNumber || null,
            tracking_url: trackingUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (trackError) throw trackError;

        if (trackingNumber) {
          await supabase.from('b2b_order_notes').insert({
            order_id: order.id,
            content: `Tracking number updated: ${trackingNumber}`,
            author_name: user?.full_name || user?.email || 'Admin',
            note_type: 'tracking',
          });
        }

        await fetchOrder();
      } catch (err) {
        console.error('[B2BOrderDetail] tracking update error:', err);
      } finally {
        setUpdatingTracking(false);
      }
    },
    [order, user, fetchOrder]
  );

  // -----------------------------------------------------------------------
  // Mark as shipped (with tracking + automation)
  // -----------------------------------------------------------------------
  const markShipped = useCallback(
    async (trackingCode, carrier) => {
      if (!order) return;
      setUpdatingTracking(true);
      try {
        await processOrderShipped(
          order.id,
          organizationId,
          trackingCode,
          carrier,
          user?.id,
        );
        await fetchOrder();
      } catch (err) {
        console.error('[B2BOrderDetail] ship error:', err);
        setError(err.message || 'Failed to mark as shipped');
      } finally {
        setUpdatingTracking(false);
      }
    },
    [order, organizationId, user, fetchOrder]
  );

  // -----------------------------------------------------------------------
  // Next available status actions
  // -----------------------------------------------------------------------
  const statusActions = useMemo(() => {
    if (!order) return [];
    const idx = STATUS_ORDER.indexOf(order.status);
    if (idx === -1 || order.status === 'cancelled') return [];

    const actions = [];
    if (idx < STATUS_ORDER.length - 1) {
      actions.push({
        label: `Mark as ${STATUS_ORDER[idx + 1].charAt(0).toUpperCase() + STATUS_ORDER[idx + 1].slice(1)}`,
        status: STATUS_ORDER[idx + 1],
        primary: true,
      });
    }
    if (order.status !== 'delivered') {
      actions.push({ label: 'Cancel Order', status: 'cancelled', danger: true });
    }
    return actions;
  }, [order]);

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-32 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-24 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
              <div className="h-48 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
              <div className="h-32 bg-zinc-900/60 rounded-2xl border border-zinc-800 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------
  if (error && !order) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3 p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-medium">Error loading order</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const client = order.portal_clients;

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </button>

        {/* Order header */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/10">
                <FileText className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-white">
                    {order.order_number || `#${order.id.slice(0, 8)}`}
                  </h1>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  Placed {formatDate(order.created_at)}
                  {client && (
                    <span> by <span className="text-zinc-300">{client.name || client.company_name || 'Unknown'}</span></span>
                  )}
                </p>
              </div>
            </div>

            {/* Status action buttons */}
            <div className="flex items-center gap-2">
              {statusActions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => updateStatus(action.status)}
                  disabled={!!actionLoading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    action.danger
                      ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : action.primary
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {actionLoading === action.status && <Loader2 className="w-4 h-4 animate-spin" />}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Status stepper */}
        <StatusStepper currentStatus={order.status} />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <LineItemsTable items={items} />
            <NoteTimeline notes={notes} onAddNote={addNote} addingNote={addingNote} />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <OrderSummary order={order} />
            <CustomerCard client={client} />
            <TrackingInput
              order={order}
              onUpdateTracking={updateTracking}
              onMarkShipped={markShipped}
              updating={updatingTracking}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

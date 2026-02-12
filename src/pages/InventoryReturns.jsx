import React, { useState, useEffect, useCallback } from "react";
import {
  RotateCcw, Search, Filter, Clock, Check, Package, AlertTriangle,
  X, Plus, ChevronRight, RefreshCw, ArrowUpDown, Eye, Undo2,
  Trash2, ClipboardCheck, ExternalLink, PackageCheck
} from "lucide-react";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import {
  listReturns,
  getReturn,
  updateReturn,
  createReturnItem,
  updateReturnItem,
  generateReturnCode,
} from "@/lib/db/queries";
import {
  createManualReturn,
  processReturnItem,
  advanceReturnStatus,
  syncBolcomReturns,
  sendBolcomHandlingResult,
} from "@/lib/services/inventory-service";

// =============================================================================
// STATUS + SOURCE STYLES
// =============================================================================

const STATUS_STYLES = {
  registered: {
    bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30",
    icon: Clock, label: "Registered",
  },
  received: {
    bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30",
    icon: PackageCheck, label: "Received",
  },
  inspected: {
    bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30",
    icon: ClipboardCheck, label: "Inspected",
  },
  processed: {
    bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30",
    icon: Check, label: "Processed",
  },
};

const SOURCE_STYLES = {
  bolcom: { bg: "bg-blue-500/10", text: "text-blue-400", label: "bol.com" },
  shopify: { bg: "bg-green-500/10", text: "text-green-400", label: "Shopify" },
  manual: { bg: "bg-zinc-500/10", text: "text-zinc-400", label: "Manual" },
  other: { bg: "bg-purple-500/10", text: "text-purple-400", label: "Other" },
};

const REASON_LABELS = {
  defective: "Defective",
  wrong_item: "Wrong Item",
  not_as_described: "Not as Described",
  no_longer_needed: "No Longer Needed",
  arrived_late: "Arrived Late",
  other: "Other",
};

const ACTION_LABELS = {
  restock: "Restock",
  dispose: "Dispose",
  inspect: "Inspect",
  pending: "Pending",
};

const STATUS_FLOW = ['registered', 'received', 'inspected', 'processed'];

// =============================================================================
// RETURN CARD
// =============================================================================

function ReturnCard({ ret, onClick }) {
  const status = STATUS_STYLES[ret.status] || STATUS_STYLES.registered;
  const source = SOURCE_STYLES[ret.source] || SOURCE_STYLES.other;
  const StatusIcon = status.icon;
  const itemCount = ret.return_items?.length || 0;
  const completedCount = ret.return_items?.filter(i => i.action_completed)?.length || 0;

  return (
    <button
      onClick={() => onClick(ret)}
      className="w-full text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{ret.return_code}</span>
        <Badge className={`${status.bg} ${status.text} ${status.border} border text-xs`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Badge className={`${source.bg} ${source.text} text-xs`}>{source.label}</Badge>
        {ret.customers?.name && (
          <span className="text-xs text-zinc-500 truncate">{ret.customers.name}</span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{itemCount} item{itemCount !== 1 ? 's' : ''} ({completedCount} done)</span>
        <span>{ret.registered_at ? new Date(ret.registered_at).toLocaleDateString() : ''}</span>
      </div>
    </button>
  );
}

// =============================================================================
// CREATE RETURN DIALOG
// =============================================================================

function CreateReturnDialog({ open, onClose, companyId, onCreated }) {
  const [items, setItems] = useState([{ ean: '', productId: '', productName: '', quantity: 1, reason: 'other', reasonNotes: '' }]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState({});

  const searchProduct = useCallback(async (ean, index) => {
    if (!ean || ean.length < 3) return;
    setSearching(s => ({ ...s, [index]: true }));
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, sku, ean')
        .eq('company_id', companyId)
        .eq('ean', ean.trim())
        .limit(1)
        .maybeSingle();

      if (data) {
        setItems(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], productId: data.id, productName: `${data.name} (${data.sku || data.ean})` };
          return updated;
        });
      } else {
        setItems(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], productId: '', productName: '' };
          return updated;
        });
        toast.error('Product not found for this EAN');
      }
    } finally {
      setSearching(s => ({ ...s, [index]: false }));
    }
  }, [companyId]);

  const addItem = () => {
    setItems(prev => [...prev, { ean: '', productId: '', productName: '', quantity: 1, reason: 'other', reasonNotes: '' }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validItems = items.filter(i => i.productId);
    if (validItems.length === 0) {
      toast.error('Add at least one valid product');
      return;
    }

    setLoading(true);
    try {
      await createManualReturn(
        companyId,
        validItems.map(i => ({
          productId: i.productId,
          ean: i.ean,
          quantity: i.quantity,
          reason: i.reason,
          reasonNotes: i.reasonNotes,
        })),
        { notes }
      );
      toast.success('Return created');
      onCreated();
      handleClose();
    } catch (err) {
      toast.error('Failed to create return: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setItems([{ ean: '', productId: '', productName: '', quantity: 1, reason: 'other', reasonNotes: '' }]);
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="bg-zinc-900 border-white/[0.06] text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Manual Return</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Scan or enter product EANs to register a return.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {items.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium">Item {index + 1}</span>
                {items.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-zinc-400">EAN / Barcode</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Enter EAN..."
                      value={item.ean}
                      onChange={e => setItems(prev => { const u = [...prev]; u[index] = { ...u[index], ean: e.target.value }; return u; })}
                      onKeyDown={e => e.key === 'Enter' && searchProduct(item.ean, index)}
                      className="bg-white/[0.03] border-white/[0.06] text-white"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => searchProduct(item.ean, index)}
                      disabled={searching[index]}
                      className="border-white/[0.06] text-zinc-400 hover:text-white"
                    >
                      <Search className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {item.productName && (
                <div className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                  {item.productName}
                </div>
              )}

              <div className="flex gap-2">
                <div className="w-20">
                  <Label className="text-xs text-zinc-400">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => setItems(prev => { const u = [...prev]; u[index] = { ...u[index], quantity: parseInt(e.target.value) || 1 }; return u; })}
                    className="bg-white/[0.03] border-white/[0.06] text-white mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-zinc-400">Reason</Label>
                  <Select
                    value={item.reason}
                    onValueChange={v => setItems(prev => { const u = [...prev]; u[index] = { ...u[index], reason: v }; return u; })}
                  >
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-white/[0.06]">
                      {Object.entries(REASON_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed border-white/[0.1] text-zinc-400 hover:text-white">
            <Plus className="w-3 h-3 mr-1" /> Add another item
          </Button>

          <div>
            <Label className="text-xs text-zinc-400">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="bg-white/[0.03] border-white/[0.06] text-white mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-white/[0.06] text-zinc-400">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            {loading ? 'Creating...' : 'Create Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// RETURN DETAIL DIALOG
// =============================================================================

function ReturnDetailDialog({ open, onClose, returnId, companyId, onUpdated }) {
  const { user } = useUser();
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [advancing, setAdvancing] = useState(false);
  const [sendingBol, setSendingBol] = useState(false);

  const loadReturn = useCallback(async () => {
    if (!returnId) return;
    setLoading(true);
    try {
      const data = await getReturn(returnId);
      setRet(data);
    } catch (err) {
      toast.error('Failed to load return');
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  useEffect(() => {
    if (open && returnId) loadReturn();
  }, [open, returnId, loadReturn]);

  const handleProcessItem = async (itemId, action) => {
    setProcessing(p => ({ ...p, [itemId]: true }));
    try {
      await processReturnItem(companyId, itemId, action, user?.id);
      toast.success(`Item ${action === 'restock' ? 'restocked' : action === 'dispose' ? 'disposed' : 'set to inspect'}`);
      await loadReturn();
      onUpdated();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setProcessing(p => ({ ...p, [itemId]: false }));
    }
  };

  const handleAdvanceStatus = async () => {
    if (!ret) return;
    const currentIdx = STATUS_FLOW.indexOf(ret.status);
    if (currentIdx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];

    setAdvancing(true);
    try {
      await advanceReturnStatus(ret.id, nextStatus, user?.id);
      toast.success(`Status advanced to ${nextStatus}`);
      await loadReturn();
      onUpdated();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setAdvancing(false);
    }
  };

  const handleSendToBol = async () => {
    if (!ret?.bol_return_id) return;
    setSendingBol(true);
    try {
      await sendBolcomHandlingResult(companyId, ret.bol_return_id, 'RETURN_RECEIVED', 1);
      toast.success('Handling result sent to bol.com');
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSendingBol(false);
    }
  };

  const status = ret ? (STATUS_STYLES[ret.status] || STATUS_STYLES.registered) : STATUS_STYLES.registered;
  const source = ret ? (SOURCE_STYLES[ret.source] || SOURCE_STYLES.other) : SOURCE_STYLES.other;
  const currentIdx = ret ? STATUS_FLOW.indexOf(ret.status) : 0;
  const canAdvance = currentIdx < STATUS_FLOW.length - 1;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-white/[0.06] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            {ret?.return_code || 'Loading...'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-8 w-full bg-white/[0.05]" />
            <Skeleton className="h-20 w-full bg-white/[0.05]" />
            <Skeleton className="h-20 w-full bg-white/[0.05]" />
          </div>
        ) : ret ? (
          <div className="space-y-4 py-2">
            {/* Header info */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${status.bg} ${status.text} ${status.border} border`}>
                {status.label}
              </Badge>
              <Badge className={`${source.bg} ${source.text}`}>{source.label}</Badge>
              {ret.customers?.name && (
                <span className="text-sm text-zinc-400">{ret.customers.name}</span>
              )}
              {ret.sales_orders?.order_number && (
                <span className="text-xs text-zinc-500">Order: {ret.sales_orders.order_number}</span>
              )}
            </div>

            {/* Status stepper */}
            <div className="flex items-center gap-1">
              {STATUS_FLOW.map((step, i) => {
                const stepStyle = STATUS_STYLES[step];
                const StepIcon = stepStyle.icon;
                const isActive = i <= currentIdx;
                return (
                  <React.Fragment key={step}>
                    {i > 0 && <div className={`flex-1 h-0.5 ${isActive ? 'bg-cyan-500' : 'bg-white/[0.06]'}`} />}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${isActive ? stepStyle.bg + ' ' + stepStyle.text : 'text-zinc-600'}`}>
                      <StepIcon className="w-3 h-3" />
                      {stepStyle.label}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {canAdvance && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvanceStatus}
                disabled={advancing}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                {advancing ? 'Advancing...' : `Advance to ${STATUS_STYLES[STATUS_FLOW[currentIdx + 1]]?.label}`}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
              <span>Registered: {ret.registered_at ? new Date(ret.registered_at).toLocaleString() : '—'}</span>
              <span>Received: {ret.received_at ? new Date(ret.received_at).toLocaleString() : '—'}</span>
              <span>Processed: {ret.processed_at ? new Date(ret.processed_at).toLocaleString() : '—'}</span>
              {ret.bol_return_id && <span>bol.com ID: {ret.bol_return_id}</span>}
            </div>

            {/* Items table */}
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Return Items</h4>
              <div className="space-y-2">
                {(ret.return_items || []).map(item => (
                  <div key={item.id} className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm text-white">{item.products?.name || 'Unknown Product'}</span>
                        <span className="text-xs text-zinc-500 ml-2">{item.ean || item.products?.ean || ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">Qty: {item.quantity}</span>
                        {item.action_completed ? (
                          <Badge className="bg-green-500/10 text-green-400 border border-green-500/30 text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            {ACTION_LABELS[item.action] || item.action}
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-xs">
                            {ACTION_LABELS[item.action] || 'Pending'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        Reason: {REASON_LABELS[item.reason] || item.reason || '—'}
                        {item.reason_notes && ` — ${item.reason_notes}`}
                      </span>

                      {!item.action_completed && ret.status !== 'processed' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessItem(item.id, 'restock')}
                            disabled={processing[item.id]}
                            className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                          >
                            <Undo2 className="w-3 h-3 mr-1" /> Restock
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessItem(item.id, 'dispose')}
                            disabled={processing[item.id]}
                            className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Dispose
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessItem(item.id, 'inspect')}
                            disabled={processing[item.id]}
                            className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          >
                            <Eye className="w-3 h-3 mr-1" /> Inspect
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* bol.com section */}
            {ret.bol_return_id && (
              <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-400 font-medium">bol.com Return</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendToBol}
                    disabled={sendingBol}
                    className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {sendingBol ? 'Sending...' : 'Send to bol.com'}
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            {ret.notes && (
              <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <span className="text-xs text-zinc-500">Notes</span>
                <p className="text-sm text-zinc-300 mt-1">{ret.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-zinc-500 py-4">Return not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function InventoryReturns() {
  const { user } = useUser();
  const companyId = user?.company_id;

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadReturns = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (sourceFilter !== 'all') filters.source = sourceFilter;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const data = await listReturns(companyId, filters);
      setReturns(data);
    } catch (err) {
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const handleSync = async () => {
    if (!companyId) return;
    setSyncing(true);
    try {
      const result = await syncBolcomReturns(companyId);
      toast.success(`Synced ${result.synced} returns from bol.com${result.errors ? `, ${result.errors} errors` : ''}`);
      loadReturns();
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const openDetail = (ret) => {
    setSelectedReturnId(ret.id);
    setDetailOpen(true);
  };

  // Stats
  const stats = {
    registered: returns.filter(r => r.status === 'registered').length,
    received: returns.filter(r => r.status === 'received').length,
    inspected: returns.filter(r => r.status === 'inspected').length,
    processed: returns.filter(r => r.status === 'processed').length,
  };

  return (
    <ProductsPageTransition>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-cyan-400" />
              Returns
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Process returns and manage restocking</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="border-white/[0.06] text-zinc-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync bol.com'}
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Return
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Object.entries(STATUS_STYLES).map(([key, style]) => {
            const Icon = style.icon;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                className={`p-3 rounded-xl border transition-all text-left ${
                  statusFilter === key
                    ? `${style.bg} ${style.border} border`
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${style.text}`} />
                  <span className={`text-xs ${statusFilter === key ? style.text : 'text-zinc-500'}`}>{style.label}</span>
                </div>
                <span className="text-xl font-bold text-white">{stats[key] || 0}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by return code or bol.com ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/[0.03] border-white/[0.06] text-white"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.06] text-white">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-white/[0.06]">
              <SelectItem value="all" className="text-white">All Sources</SelectItem>
              <SelectItem value="bolcom" className="text-white">bol.com</SelectItem>
              <SelectItem value="manual" className="text-white">Manual</SelectItem>
              <SelectItem value="shopify" className="text-white">Shopify</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter !== 'all' || sourceFilter !== 'all' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatusFilter('all'); setSourceFilter('all'); setSearchQuery(''); }}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Returns list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-white/[0.05]" />
            ))}
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RotateCcw className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-1">No returns found</h3>
            <p className="text-sm text-zinc-600 mb-4">
              {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a manual return or sync from bol.com'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="border-white/[0.06] text-zinc-400"
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Sync bol.com
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> New Return
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {returns.map(ret => (
              <ReturnCard key={ret.id} ret={ret} onClick={openDetail} />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <CreateReturnDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          companyId={companyId}
          onCreated={loadReturns}
        />
        <ReturnDetailDialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          returnId={selectedReturnId}
          companyId={companyId}
          onUpdated={loadReturns}
        />
      </div>
    </ProductsPageTransition>
  );
}

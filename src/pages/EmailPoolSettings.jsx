import React, { useState, useEffect, useCallback } from "react";
import {
  Mail, Plus, Trash2, Settings, RefreshCw, Search, Check, X,
  Wifi, WifiOff, AlertTriangle, Inbox, Package, Clock, Filter,
  ChevronDown, ChevronUp, Eye, ExternalLink, Zap, Edit2, Save,
} from "lucide-react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { ProductsPageTransition } from "@/components/products/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  listEmailPoolAccounts,
  createEmailPoolAccount,
  updateEmailPoolAccount,
  deleteEmailPoolAccount,
  listSyncLog,
  listSupplierPatterns,
  createSupplierPattern,
  updateSupplierPattern,
  deleteSupplierPattern,
  seedDefaultSupplierPatterns,
} from "@/lib/db/queries";
import useComposio from "@/hooks/useComposio";
import { getWebhookUrl } from "@/lib/composio";

// =============================================================================
// CONSTANTS
// =============================================================================

const CONNECTION_STYLES = {
  connected:    { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: Wifi, label: "Connected" },
  connecting:   { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/30",  icon: RefreshCw, label: "Connecting..." },
  disconnected: { bg: "bg-zinc-500/10",    text: "text-zinc-400",    border: "border-zinc-500/30",    icon: WifiOff, label: "Disconnected" },
  error:        { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/30",     icon: AlertTriangle, label: "Error" },
  expired:      { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/30",  icon: AlertTriangle, label: "Expired" },
};

const CLASSIFICATION_STYLES = {
  order_confirmation:  { bg: "bg-cyan-500/10",    text: "text-cyan-400",    label: "Order" },
  shipping_update:     { bg: "bg-blue-500/10",    text: "text-blue-400",    label: "Shipping" },
  return_notification: { bg: "bg-orange-500/10",  text: "text-orange-400",  label: "Return" },
  other:               { bg: "bg-zinc-500/10",    text: "text-zinc-400",    label: "Other" },
  skipped:             { bg: "bg-zinc-500/10",    text: "text-zinc-500",    label: "Skipped" },
  error:               { bg: "bg-red-500/10",     text: "text-red-400",     label: "Error" },
};

const STATUS_STYLES = {
  pending:    { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Pending" },
  processing: { bg: "bg-blue-500/10",  text: "text-blue-400",   label: "Processing" },
  completed:  { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Completed" },
  failed:     { bg: "bg-red-500/10",   text: "text-red-400",    label: "Failed" },
  skipped:    { bg: "bg-zinc-500/10",  text: "text-zinc-500",   label: "Skipped" },
  duplicate:  { bg: "bg-orange-500/10", text: "text-orange-400", label: "Duplicate" },
};

// =============================================================================
// ACCOUNT CARD
// =============================================================================

function AccountCard({ account, onConnect, onDisconnect, onSettings, onDelete }) {
  const style = CONNECTION_STYLES[account.connection_status] || CONNECTION_STYLES.disconnected;
  const StatusIcon = style.icon;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${account.provider === 'gmail' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
            <Mail className={`w-5 h-5 ${account.provider === 'gmail' ? 'text-red-400' : 'text-blue-400'}`} />
          </div>
          <div>
            <h3 className="font-medium text-white">{account.email_address}</h3>
            <p className="text-xs text-zinc-500">{account.label || account.provider}</p>
          </div>
        </div>
        <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border} text-xs`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {style.label}
        </Badge>
      </div>

      {account.connection_error && (
        <p className="text-xs text-red-400/70 mb-3 truncate">{account.connection_error}</p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-white/[0.02]">
          <p className="text-lg font-semibold text-white">{account.total_emails_received || 0}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Emails</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.02]">
          <p className="text-lg font-semibold text-cyan-400">{account.total_orders_synced || 0}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Orders</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.02]">
          <p className="text-lg font-semibold text-red-400">{account.total_errors || 0}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Errors</p>
        </div>
      </div>

      {account.last_order_synced_at && (
        <p className="text-[10px] text-zinc-600 mb-3">
          Last order: {new Date(account.last_order_synced_at).toLocaleString()}
        </p>
      )}

      <div className="flex gap-2">
        {account.connection_status === 'disconnected' || account.connection_status === 'error' || account.connection_status === 'expired' ? (
          <Button size="sm" className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => onConnect(account)}>
            <Wifi className="w-3.5 h-3.5 mr-1.5" /> Connect
          </Button>
        ) : account.connection_status === 'connected' ? (
          <Button size="sm" variant="outline" className="flex-1 border-zinc-700 text-zinc-400 hover:text-white" onClick={() => onDisconnect(account)}>
            <WifiOff className="w-3.5 h-3.5 mr-1.5" /> Disconnect
          </Button>
        ) : null}
        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white" onClick={() => onSettings(account)}>
          <Settings className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="border-zinc-700 text-red-400 hover:text-red-300 hover:border-red-500/30" onClick={() => onDelete(account)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// ADD ACCOUNT DIALOG
// =============================================================================

function AddAccountDialog({ open, onOpenChange, onAdd }) {
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState("gmail");
  const [label, setLabel] = useState("");

  const handleAdd = () => {
    if (!email.trim()) return toast.error("Email is required");
    // Auto-detect provider
    const detected = email.includes("@outlook") || email.includes("@hotmail") || email.includes("@live")
      ? "outlook" : "gmail";
    onAdd({ email_address: email.trim(), provider: detected, label: label.trim() || null });
    setEmail(""); setLabel(""); setProvider("gmail");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add Pool Email Account</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add a shared email account to monitor for order confirmations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-zinc-300">Email Address</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shop@example.com"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="outlook">Outlook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-300">Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Shop Account, Buyer 1"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleAdd}>Add Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// SETTINGS DIALOG
// =============================================================================

function SettingsDialog({ open, onOpenChange, account, onSave }) {
  const [displayName, setDisplayName] = useState("");
  const [label, setLabel] = useState("");
  const [channel, setChannel] = useState("undecided");
  const [autoApprove, setAutoApprove] = useState(false);
  const [threshold, setThreshold] = useState([90]);
  const [syncFinance, setSyncFinance] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (account) {
      setDisplayName(account.display_name || "");
      setLabel(account.label || "");
      setChannel(account.default_sales_channel || "undecided");
      setAutoApprove(account.auto_approve_orders || false);
      setThreshold([Math.round((account.auto_approve_threshold || 0.9) * 100)]);
      setSyncFinance(account.sync_to_finance || false);
      setIsActive(account.is_active !== false);
    }
  }, [account]);

  const handleSave = () => {
    onSave(account.id, {
      display_name: displayName || null,
      label: label || null,
      default_sales_channel: channel,
      auto_approve_orders: autoApprove,
      auto_approve_threshold: threshold[0] / 100,
      sync_to_finance: syncFinance,
      is_active: isActive,
    });
    onOpenChange(false);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Account Settings</DialogTitle>
          <DialogDescription className="text-zinc-400">{account.email_address}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-zinc-300">Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Shop Email" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
          </div>
          <div>
            <Label className="text-zinc-300">Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Buyer 1" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
          </div>
          <div>
            <Label className="text-zinc-300">Default Sales Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="undecided">Undecided</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Auto-approve Orders</p>
              <p className="text-xs text-zinc-500">Automatically approve high-confidence orders</p>
            </div>
            <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
          </div>
          {autoApprove && (
            <div>
              <Label className="text-zinc-300">Confidence Threshold: {threshold[0]}%</Label>
              <Slider value={threshold} onValueChange={setThreshold} min={50} max={100} step={5} className="mt-2" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Sync to Finance</p>
              <p className="text-xs text-zinc-500">Copy orders to finance expenses</p>
            </div>
            <Switch checked={syncFinance} onCheckedChange={setSyncFinance} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Active</p>
              <p className="text-xs text-zinc-500">Pause/resume email monitoring</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// SUPPLIER PATTERNS SECTION
// =============================================================================

function SupplierPatternsSection({ companyId }) {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newPattern, setNewPattern] = useState({ supplier_name: "", sender_patterns: "", subject_patterns: "", country: "NL", default_sales_channel: "undecided" });

  const fetchPatterns = useCallback(async () => {
    try {
      const data = await listSupplierPatterns(companyId);
      setPatterns(data);
    } catch (err) {
      console.error("Failed to load patterns:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { if (companyId) fetchPatterns(); }, [companyId, fetchPatterns]);

  const handleSeedDefaults = async () => {
    try {
      await seedDefaultSupplierPatterns(companyId);
      await fetchPatterns();
      toast.success("Default supplier patterns added");
    } catch (err) {
      toast.error("Failed to seed defaults");
    }
  };

  const handleAdd = async () => {
    if (!newPattern.supplier_name.trim()) return toast.error("Supplier name required");
    try {
      await createSupplierPattern({
        company_id: companyId,
        supplier_name: newPattern.supplier_name.trim(),
        sender_patterns: newPattern.sender_patterns.split(",").map(s => s.trim()).filter(Boolean),
        subject_patterns: newPattern.subject_patterns.split(",").map(s => s.trim()).filter(Boolean),
        country: newPattern.country,
        default_sales_channel: newPattern.default_sales_channel,
        is_active: true,
      });
      setShowAdd(false);
      setNewPattern({ supplier_name: "", sender_patterns: "", subject_patterns: "", country: "NL", default_sales_channel: "undecided" });
      await fetchPatterns();
      toast.success("Pattern added");
    } catch (err) {
      toast.error(err.message || "Failed to add pattern");
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateSupplierPattern(id, {
        sender_patterns: editData.sender_patterns?.split(",").map(s => s.trim()).filter(Boolean),
        subject_patterns: editData.subject_patterns?.split(",").map(s => s.trim()).filter(Boolean),
        country: editData.country,
        default_sales_channel: editData.default_sales_channel,
        custom_extraction_hints: editData.custom_extraction_hints || null,
      });
      setEditingId(null);
      await fetchPatterns();
      toast.success("Pattern updated");
    } catch (err) {
      toast.error("Failed to update pattern");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSupplierPattern(id);
      await fetchPatterns();
      toast.success("Pattern deleted");
    } catch (err) {
      toast.error("Failed to delete pattern");
    }
  };

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 bg-zinc-800" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Supplier Email Patterns</h2>
        <div className="flex gap-2">
          {patterns.length === 0 && (
            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400" onClick={handleSeedDefaults}>
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Load Defaults
            </Button>
          )}
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white/[0.03] border border-cyan-500/20 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Supplier Name</Label>
              <Input value={newPattern.supplier_name} onChange={(e) => setNewPattern(p => ({ ...p, supplier_name: e.target.value }))} placeholder="Amazon" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Country</Label>
              <Input value={newPattern.country} onChange={(e) => setNewPattern(p => ({ ...p, country: e.target.value }))} placeholder="NL" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Sender Patterns (comma-separated)</Label>
            <Input value={newPattern.sender_patterns} onChange={(e) => setNewPattern(p => ({ ...p, sender_patterns: e.target.value }))} placeholder="@amazon.nl, @amazon.de" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Subject Patterns (comma-separated regex)</Label>
            <Input value={newPattern.subject_patterns} onChange={(e) => setNewPattern(p => ({ ...p, subject_patterns: e.target.value }))} placeholder="Your Amazon.* order, Bestelling.*Amazon" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleAdd}>Add Pattern</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {patterns.map(p => (
          <div key={p.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-white/[0.1] transition-colors">
            {editingId === p.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editData.sender_patterns || ""} onChange={(e) => setEditData(d => ({ ...d, sender_patterns: e.target.value }))} placeholder="Sender patterns" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
                  <Input value={editData.subject_patterns || ""} onChange={(e) => setEditData(d => ({ ...d, subject_patterns: e.target.value }))} placeholder="Subject patterns" className="bg-zinc-800 border-zinc-700 text-white text-sm" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button size="sm" className="bg-cyan-600 text-white" onClick={() => handleSaveEdit(p.id)}>
                    <Save className="w-3 h-3 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{p.supplier_name}</span>
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">{p.country}</Badge>
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">{p.default_sales_channel}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    Senders: {(p.sender_patterns || []).join(", ") || "none"} | Subjects: {(p.subject_patterns || []).join(", ") || "none"}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-500 hover:text-white" onClick={() => { setEditingId(p.id); setEditData({ sender_patterns: (p.sender_patterns || []).join(", "), subject_patterns: (p.subject_patterns || []).join(", "), country: p.country, default_sales_channel: p.default_sales_channel, custom_extraction_hints: p.custom_extraction_hints }); }}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {patterns.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No supplier patterns yet. Click "Load Defaults" to add common suppliers.
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SYNC LOG SECTION
// =============================================================================

function SyncLogSection({ companyId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    try {
      const filters = {};
      if (filter !== "all") filters.classification = filter;
      const data = await listSyncLog(companyId, { ...filters, limit: 50 });
      setLogs(data);
    } catch (err) {
      console.error("Failed to load sync log:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, filter]);

  useEffect(() => { if (companyId) fetchLogs(); }, [companyId, filter, fetchLogs]);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 bg-zinc-800" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Sync Log</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 text-white text-xs h-8">
              <Filter className="w-3 h-3 mr-1.5 text-zinc-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="order_confirmation">Orders</SelectItem>
              <SelectItem value="shipping_update">Shipping</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 h-8" onClick={fetchLogs}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {logs.map(log => {
          const cls = CLASSIFICATION_STYLES[log.classification] || CLASSIFICATION_STYLES.other;
          const sts = STATUS_STYLES[log.status] || STATUS_STYLES.pending;
          return (
            <div key={log.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300 truncate">{log.email_subject || "(no subject)"}</p>
                <p className="text-[10px] text-zinc-600 truncate">
                  From: {log.email_from || "?"} | {log.email_date ? new Date(log.email_date).toLocaleString() : ""}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${cls.bg} ${cls.text} border-transparent shrink-0`}>
                {cls.label}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${sts.bg} ${sts.text} border-transparent shrink-0`}>
                {sts.label}
              </Badge>
              {log.stock_purchase_id && (
                <a href={`/StockPurchases?id=${log.stock_purchase_id}`} className="text-cyan-400 hover:text-cyan-300">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No emails processed yet. Connect an account to start monitoring.
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function EmailPoolSettings({ embedded = false }) {
  const { user } = useUser();
  const composio = useComposio();
  const companyId = user?.company_id;

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [settingsAccount, setSettingsAccount] = useState(null);
  const [activeSection, setActiveSection] = useState("accounts");

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await listEmailPoolAccounts(companyId);
      setAccounts(data);
    } catch (err) {
      console.error("Failed to load pool accounts:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Add account
  const handleAddAccount = async (data) => {
    try {
      await createEmailPoolAccount({
        company_id: companyId,
        email_address: data.email_address,
        provider: data.provider,
        label: data.label,
        connection_status: "disconnected",
        is_active: true,
        auto_approve_orders: false,
        auto_approve_threshold: 0.9,
        sync_to_finance: false,
        default_sales_channel: "undecided",
        connected_by: user?.id,
      });
      await fetchAccounts();
      toast.success("Account added");
    } catch (err) {
      toast.error(err.message || "Failed to add account");
    }
  };

  // Connect via Composio OAuth
  const handleConnect = async (account) => {
    try {
      await updateEmailPoolAccount(account.id, { connection_status: "connecting" });
      await fetchAccounts();

      // Use entity_id pattern: pool_{companyId}_{index}
      const accountIndex = accounts.findIndex(a => a.id === account.id);
      const entityId = `pool_${companyId}_${accountIndex}`;

      // Get auth configs for the provider toolkit
      const toolkitSlug = account.provider === "outlook" ? "outlook" : "gmail";
      const configs = await composio.getAuthConfigs(toolkitSlug);

      if (!configs?.items?.length) {
        toast.error("No OAuth config found for " + toolkitSlug);
        await updateEmailPoolAccount(account.id, { connection_status: "error", connection_error: "No auth config" });
        await fetchAccounts();
        return;
      }

      // Initiate OAuth connection
      const result = await composio.connect(entityId, configs.items[0].id, {
        popup: true,
        toolkitSlug,
      });

      if (!result?.connectedAccountId) {
        toast.error("Connection failed — no account ID returned");
        await updateEmailPoolAccount(account.id, { connection_status: "error", connection_error: "No connected account ID" });
        await fetchAccounts();
        return;
      }

      // Store composio ID
      await updateEmailPoolAccount(account.id, {
        composio_connected_account_id: result.connectedAccountId,
        connection_status: "connecting",
      });

      // Poll for connection
      toast.info("Waiting for OAuth completion...");
      const connected = await composio.waitForConnection(result.connectedAccountId, entityId);

      if (connected) {
        // Subscribe to email trigger
        const triggerSlug = toolkitSlug === "gmail" ? "GMAIL_NEW_GMAIL_MESSAGE" : "OUTLOOK_MESSAGE_TRIGGER";
        const webhookUrl = getWebhookUrl();

        try {
          const sub = await composio.subscribeTrigger(
            triggerSlug,
            result.connectedAccountId,
            webhookUrl,
            {},
            entityId
          );

          await updateEmailPoolAccount(account.id, {
            connection_status: "connected",
            connection_error: null,
            composio_trigger_subscription_id: sub?.id || null,
          });
          toast.success("Connected and monitoring!");
        } catch (triggerErr) {
          // Connected but trigger failed — still mark as connected
          await updateEmailPoolAccount(account.id, {
            connection_status: "connected",
            connection_error: "Trigger subscription failed: " + (triggerErr?.message || "unknown"),
          });
          toast.warning("Connected but trigger setup failed. Emails may not sync automatically.");
        }
      } else {
        await updateEmailPoolAccount(account.id, {
          connection_status: "error",
          connection_error: "OAuth timed out or was cancelled",
        });
        toast.error("Connection timed out");
      }

      await fetchAccounts();
    } catch (err) {
      console.error("Connect error:", err);
      await updateEmailPoolAccount(account.id, {
        connection_status: "error",
        connection_error: err?.message || "Unknown error",
      });
      await fetchAccounts();
      toast.error("Connection failed: " + (err?.message || "Unknown error"));
    }
  };

  // Disconnect
  const handleDisconnect = async (account) => {
    try {
      if (account.composio_connected_account_id) {
        await composio.disconnect(account.composio_connected_account_id).catch(() => {});
      }
      await updateEmailPoolAccount(account.id, {
        connection_status: "disconnected",
        composio_connected_account_id: null,
        composio_trigger_subscription_id: null,
        connection_error: null,
      });
      await fetchAccounts();
      toast.success("Disconnected");
    } catch (err) {
      toast.error("Failed to disconnect");
    }
  };

  // Delete
  const handleDelete = async (account) => {
    if (!confirm(`Delete ${account.email_address}? This will remove all sync history.`)) return;
    try {
      if (account.composio_connected_account_id) {
        await composio.disconnect(account.composio_connected_account_id).catch(() => {});
      }
      await deleteEmailPoolAccount(account.id);
      await fetchAccounts();
      toast.success("Account deleted");
    } catch (err) {
      toast.error("Failed to delete account");
    }
  };

  // Save settings
  const handleSaveSettings = async (id, updates) => {
    try {
      await updateEmailPoolAccount(id, updates);
      await fetchAccounts();
      toast.success("Settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
    }
  };

  // Stats
  const connectedCount = accounts.filter(a => a.connection_status === "connected").length;
  const totalOrders = accounts.reduce((s, a) => s + (a.total_orders_synced || 0), 0);
  const totalErrors = accounts.reduce((s, a) => s + (a.total_errors || 0), 0);

  const content = (
    <div className={embedded ? "" : "max-w-6xl mx-auto px-4 py-6"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${embedded ? 'text-lg' : 'text-2xl'} font-bold text-white`}>Email Pool</h1>
          <p className="text-sm text-zinc-500 mt-1">Auto-sync purchase orders from shared email accounts</p>
        </div>
        <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Account
        </Button>
      </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Accounts", value: accounts.length, icon: Mail, color: "text-zinc-300" },
              { label: "Connected", value: connectedCount, icon: Wifi, color: "text-emerald-400" },
              { label: "Orders Synced", value: totalOrders, icon: Package, color: "text-cyan-400" },
              { label: "Errors", value: totalErrors, icon: AlertTriangle, color: "text-red-400" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-zinc-500 uppercase tracking-wide">{stat.label}</span>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Section Tabs */}
          <div className="flex gap-1 mb-6 bg-white/[0.03] p-1 rounded-xl w-fit">
            {[
              { id: "accounts", label: "Accounts", icon: Mail },
              { id: "patterns", label: "Supplier Patterns", icon: Filter },
              { id: "log", label: "Sync Log", icon: Clock },
            ].map(tab => (
              <button
                key={tab.id}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === tab.id
                    ? "bg-cyan-600/20 text-cyan-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                onClick={() => setActiveSection(tab.id)}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Section Content */}
          {activeSection === "accounts" && (
            <div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-48 bg-zinc-800 rounded-2xl" />)}
                </div>
              ) : accounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map(account => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                      onSettings={(a) => setSettingsAccount(a)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                  <Mail className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-300 mb-2">No pool accounts yet</h3>
                  <p className="text-sm text-zinc-500 mb-6">Add shared email accounts to automatically import purchase orders.</p>
                  <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add First Account
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeSection === "patterns" && companyId && (
            <SupplierPatternsSection companyId={companyId} />
          )}

          {activeSection === "log" && companyId && (
            <SyncLogSection companyId={companyId} />
          )}

      {/* Dialogs */}
      <AddAccountDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAdd={handleAddAccount} />
      <SettingsDialog open={!!settingsAccount} onOpenChange={(open) => !open && setSettingsAccount(null)} account={settingsAccount} onSave={handleSaveSettings} />
    </div>
  );

  if (embedded) return content;

  return (
    <ProductsPageTransition>
      <div className="min-h-screen bg-black text-white">
        {content}
      </div>
    </ProductsPageTransition>
  );
}

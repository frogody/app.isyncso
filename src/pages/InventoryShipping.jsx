import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Truck, Package, Search, Filter, Clock, Check, AlertTriangle,
  Send, Barcode, MapPin, User, Calendar, ChevronRight, X,
  ExternalLink, Copy, RefreshCw, AlertCircle, Sun, Moon
} from "lucide-react";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/components/context/UserContext";
import { PermissionGuard } from "@/components/guards";
import { toast } from "sonner";
import {
  listShippingTasks,
  getShippingTask,
  getPendingShipments,
  listTrackingJobs,
} from "@/lib/db/queries";
import { completeShipping } from "@/lib/services/inventory-service";

const STATUS_STYLES = {
  pending: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    icon: Clock,
  },
  ready_to_ship: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    icon: Package,
  },
  shipped: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    icon: Truck,
  },
  delivered: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
    icon: Check,
  },
  cancelled: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
    icon: X,
  },
};

const PRIORITY_STYLES = {
  low: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
  normal: { bg: "bg-blue-500/10", text: "text-blue-400" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400" },
  urgent: { bg: "bg-red-500/10", text: "text-red-400" },
};

const CARRIERS = [
  { value: "PostNL", label: "PostNL" },
  { value: "DHL", label: "DHL" },
  { value: "DPD", label: "DPD" },
  { value: "UPS", label: "UPS" },
  { value: "FedEx", label: "FedEx" },
  { value: "GLS", label: "GLS" },
  { value: "other", label: "Other" },
];

// Ship modal with REQUIRED track & trace
function ShipModal({ task, isOpen, onClose, onShip, t }) {
  const [trackTraceCode, setTrackTraceCode] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    // CRITICAL: Track & trace is REQUIRED
    if (!trackTraceCode.trim()) {
      setError("Track & trace code is required to ship");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onShip(task.id, trackTraceCode.trim(), carrier || undefined);
      onClose();
      toast.success("Shipment completed!");
    } catch (err) {
      setError(err.message || "Shipment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-cyan-400" />
            Complete Shipment
          </DialogTitle>
          <DialogDescription>
            Enter the track & trace code to complete the shipment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order info */}
          <div className={`p-3 rounded-lg ${t ? t('bg-slate-50 border-slate-200', 'bg-zinc-900/50 border-white/10') : 'bg-zinc-900/50 border-white/10'} border`}>
            <div className="text-sm">
              <span className={`${t ? t('text-slate-500', 'text-zinc-400') : 'text-zinc-400'}`}>Order:</span>
              <span className={`ml-2 ${t ? t('text-slate-900', 'text-white') : 'text-white'} font-medium`}>
                {task?.sales_orders?.order_number || task?.task_number}
              </span>
            </div>
            {task?.sales_orders?.customers?.name && (
              <div className="text-sm mt-1">
                <span className={`${t ? t('text-slate-500', 'text-zinc-400') : 'text-zinc-400'}`}>Customer:</span>
                <span className={`ml-2 ${t ? t('text-slate-900', 'text-white') : 'text-white'}`}>
                  {task.sales_orders.customers.name}
                </span>
              </div>
            )}
          </div>

          {/* Track & trace input - REQUIRED */}
          <div>
            <Label className="flex items-center gap-1">
              <Barcode className="w-4 h-4" />
              Track & Trace Code
              <span className="text-red-400">*</span>
            </Label>
            <Input
              placeholder="E.g. 3SJVB123456789"
              value={trackTraceCode}
              onChange={(e) => {
                setTrackTraceCode(e.target.value);
                setError("");
              }}
              className={`mt-1 ${t ? t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/10') : 'bg-zinc-900/50 border-white/10'}`}
              autoFocus
            />
            <p className={`text-xs ${t ? t('text-slate-500', 'text-zinc-500') : 'text-zinc-500'} mt-1`}>
              This code is required to complete the shipment
            </p>
          </div>

          {/* Carrier select */}
          <div>
            <Label>Carrier (optional)</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger className={`mt-1 ${t ? t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/10') : 'bg-zinc-900/50 border-white/10'}`}>
                <SelectValue placeholder="Select carrier..." />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className={`text-xs ${t ? t('text-slate-500', 'text-zinc-500') : 'text-zinc-500'} mt-1`}>
              Auto-detected if not specified
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !trackTraceCode.trim()}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Ship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to safely get status style
function getStatusStyle(statusKey) {
  const style = STATUS_STYLES[statusKey];
  if (style && style.bg && style.text && style.border) {
    return style;
  }
  return {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
    icon: Clock,
  };
}

// Helper to safely get priority style
function getPriorityStyle(priorityKey) {
  const style = PRIORITY_STYLES[priorityKey];
  if (style && style.bg && style.text) {
    return style;
  }
  return { bg: "bg-zinc-500/10", text: "text-zinc-400" };
}

// Shipping task card
function ShippingTaskCard({ task, onShip, t }) {
  if (!task) return null;

  const status = getStatusStyle(task.status);
  const priority = getPriorityStyle(task.priority);
  const StatusIcon = (status.icon && typeof status.icon === 'function') ? status.icon : Clock;
  const isShippable = ["pending", "ready_to_ship"].includes(task.status);

  return (
    <div className={`p-3 rounded-lg ${t('bg-white/80 border-slate-200', 'bg-zinc-900/50 border-white/5')} border hover:border-cyan-500/30 transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
            <StatusIcon className={`w-4 h-4 ${status.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-medium ${t('text-slate-900', 'text-white')}`}>
                {task.sales_orders?.order_number || task.task_number}
              </h3>
              <Badge className={`${status.bg} ${status.text} ${status.border}`}>
                {task.status || 'unknown'}
              </Badge>
              {task.priority !== "normal" && (
                <Badge className={`${priority.bg} ${priority.text}`}>
                  {task.priority}
                </Badge>
              )}
            </div>
            <p className={`text-sm ${t('text-slate-500', 'text-zinc-400')} mt-1`}>
              {task.sales_orders?.customers?.name || "Unknown customer"}
            </p>
          </div>
        </div>

        {isShippable && (
          <Button
            onClick={() => onShip(task)}
            className="bg-cyan-600 hover:bg-cyan-700"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Ship
          </Button>
        )}

        {task.status === "shipped" && task.track_trace_code && (
          <div className="text-right">
            <div className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>Track & Trace</div>
            <div className="flex items-center gap-1 mt-1">
              <code className="text-sm text-cyan-400">{task.track_trace_code}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(task.track_trace_code);
                  toast.success("Copied!");
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
              {task.tracking_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => window.open(task.tracking_url, "_blank")}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Shipping details */}
      <div className={`mt-2 pt-2 border-t ${t('border-slate-200', 'border-white/5')} grid grid-cols-2 md:grid-cols-4 gap-2 text-xs`}>
        <div>
          <span className={`${t('text-slate-500', 'text-zinc-500')}`}>Packages</span>
          <span className={`ml-2 ${t('text-slate-900', 'text-white')}`}>{task.package_count}</span>
        </div>
        {task.carrier && (
          <div>
            <span className={`${t('text-slate-500', 'text-zinc-500')}`}>Carrier</span>
            <span className={`ml-2 ${t('text-slate-900', 'text-white')}`}>{task.carrier}</span>
          </div>
        )}
        {task.ship_by_date && (
          <div>
            <span className={`${t('text-slate-500', 'text-zinc-500')}`}>Ship by</span>
            <span className={`ml-2 ${t('text-slate-900', 'text-white')}`}>
              {new Date(task.ship_by_date).toLocaleDateString("en-GB")}
            </span>
          </div>
        )}
        {task.shipped_at && (
          <div>
            <span className={`${t('text-slate-500', 'text-zinc-500')}`}>Shipped</span>
            <span className={`ml-2 ${t('text-slate-900', 'text-white')}`}>
              {new Date(task.shipped_at).toLocaleDateString("en-GB")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Overdue tracking alert
function OverdueAlert({ count, onClick }) {
  if (count === 0) return null;

  return (
    <div
      className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div>
            <h3 className="font-medium text-red-400 text-sm">
              {count} shipment{count > 1 ? "s" : ""} overdue
            </h3>
            <p className="text-xs text-red-400/70">
              Check tracking status and take action
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-red-400" />
      </div>
    </div>
  );
}

export default function InventoryShipping() {
  const { user } = useUser();
  const { theme, toggleTheme, t } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [overdueJobs, setOverdueJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showShipModal, setShowShipModal] = useState(false);

  const companyId = user?.company_id;

  // Load tasks
  useEffect(() => {
    if (!companyId) return;

    const loadTasks = async () => {
      setIsLoading(true);
      try {
        const [taskData, trackingData] = await Promise.all([
          listShippingTasks(companyId),
          listTrackingJobs(companyId, { isOverdue: true }),
        ]);
        setTasks(taskData);
        setOverdueJobs(trackingData);
      } catch (error) {
        console.error("Failed to load shipping tasks:", error);
        toast.error("Could not load shipping tasks");
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [companyId]);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filter !== "all" && task.status !== filter) return false;

    if (search) {
      const searchLower = search.toLowerCase();
      return (
        task.task_number?.toLowerCase().includes(searchLower) ||
        task.sales_orders?.order_number?.toLowerCase().includes(searchLower) ||
        task.sales_orders?.customers?.name?.toLowerCase().includes(searchLower) ||
        task.track_trace_code?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Calculate stats
  const stats = {
    pending: tasks.filter((t) => ["pending", "ready_to_ship"].includes(t.status)).length,
    shipped: tasks.filter((t) => t.status === "shipped").length,
    delivered: tasks.filter((t) => t.status === "delivered").length,
    overdue: overdueJobs.length,
  };

  // Handle ship action
  const handleShip = async (taskId, trackTraceCode, carrier) => {
    try {
      await completeShipping(taskId, trackTraceCode, {
        carrier,
        userId: user?.id,
      });

      const taskData = await listShippingTasks(companyId);
      setTasks(taskData);
    } catch (error) {
      throw error;
    }
  };

  const openShipModal = (task) => {
    setSelectedTask(task);
    setShowShipModal(true);
  };

  return (
    <ProductsPageTransition>
      <PermissionGuard permission="shipping.manage" showMessage>
        <div className={`max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4 ${t('bg-white text-slate-900', 'bg-transparent text-white')}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>Shipping</h1>
              <p className={`text-xs ${t('text-slate-500', 'text-zinc-400')}`}>Manage outbound shipments</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg border transition-colors ${t('border-slate-200 hover:bg-slate-100 text-slate-600', 'border-white/10 hover:bg-white/5 text-zinc-400')}`}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Overdue alert */}
          <OverdueAlert
            count={stats.overdue}
            onClick={() => setFilter("shipped")}
          />

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className={`${t('bg-white/80 border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>To Ship</span>
              </div>
              <p className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>{stats.pending}</p>
            </div>
            <div className={`${t('bg-white/80 border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-blue-400" />
                <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>In Transit</span>
              </div>
              <p className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>{stats.shipped}</p>
            </div>
            <div className={`${t('bg-white/80 border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-green-400" />
                <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>Delivered</span>
              </div>
              <p className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>{stats.delivered}</p>
            </div>
            <div className={`${t('bg-white/80 border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>Overdue</span>
              </div>
              <p className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>{stats.overdue}</p>
            </div>
          </div>

          {/* Filters */}
          <div className={`${t('bg-white/80 border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3 mb-4`}>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t('text-slate-400', 'text-zinc-500')}`} />
                <Input
                  placeholder="Search by order, customer or T&T code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`pl-9 ${t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/10')}`}
                />
              </div>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className={`${t('bg-slate-100', 'bg-zinc-900/50')}`}>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">To Ship</TabsTrigger>
                  <TabsTrigger value="shipped">In Transit</TabsTrigger>
                  <TabsTrigger value="delivered">Delivered</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Task list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className={`${t('bg-white/80 border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-8 text-center`}>
              <Package className={`w-12 h-12 mx-auto ${t('text-slate-300', 'text-zinc-600')} mb-3`} />
              <h3 className={`text-base font-medium ${t('text-slate-900', 'text-white')} mb-1`}>
                No shipping tasks found
              </h3>
              <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>
                {search
                  ? "Try a different search"
                  : "There are currently no shipping tasks"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <ShippingTaskCard
                  key={task.id}
                  task={task}
                  onShip={openShipModal}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Ship modal */}
          <ShipModal
            task={selectedTask}
            isOpen={showShipModal}
            onClose={() => {
              setShowShipModal(false);
              setSelectedTask(null);
            }}
            onShip={handleShip}
            t={t}
          />
        </div>
      </PermissionGuard>
    </ProductsPageTransition>
  );
}

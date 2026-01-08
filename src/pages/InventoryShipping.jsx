import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Truck, Package, Search, Filter, Clock, Check, AlertTriangle,
  Send, Barcode, MapPin, User, Calendar, ChevronRight, X,
  ExternalLink, Copy, RefreshCw, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
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
  { value: "other", label: "Anders" },
];

// Ship modal with REQUIRED track & trace
function ShipModal({ task, isOpen, onClose, onShip }) {
  const [trackTraceCode, setTrackTraceCode] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    // CRITICAL: Track & trace is REQUIRED
    if (!trackTraceCode.trim()) {
      setError("Track & trace code is verplicht om te kunnen verzenden");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onShip(task.id, trackTraceCode.trim(), carrier || undefined);
      onClose();
      toast.success("Verzending voltooid!");
    } catch (err) {
      setError(err.message || "Verzending mislukt");
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
            Verzending voltooien
          </DialogTitle>
          <DialogDescription>
            Voer de track & trace code in om de verzending te voltooien.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order info */}
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
            <div className="text-sm">
              <span className="text-zinc-400">Order:</span>
              <span className="ml-2 text-white font-medium">
                {task?.sales_orders?.order_number || task?.task_number}
              </span>
            </div>
            {task?.sales_orders?.customers?.name && (
              <div className="text-sm mt-1">
                <span className="text-zinc-400">Klant:</span>
                <span className="ml-2 text-white">
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
              placeholder="Bijv. 3SJVB123456789"
              value={trackTraceCode}
              onChange={(e) => {
                setTrackTraceCode(e.target.value);
                setError("");
              }}
              className="mt-1 bg-zinc-900/50 border-white/10"
              autoFocus
            />
            <p className="text-xs text-zinc-500 mt-1">
              Deze code is verplicht voor het voltooien van de verzending
            </p>
          </div>

          {/* Carrier select */}
          <div>
            <Label>Vervoerder (optioneel)</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger className="mt-1 bg-zinc-900/50 border-white/10">
                <SelectValue placeholder="Selecteer vervoerder..." />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500 mt-1">
              Wordt automatisch gedetecteerd als niet opgegeven
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
            Annuleren
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
            Verzenden
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
  // Return safe fallback
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
function ShippingTaskCard({ task, onShip }) {
  // Defensive: ensure task exists
  if (!task) return null;

  // Get safe style objects
  const status = getStatusStyle(task.status);
  const priority = getPriorityStyle(task.priority);

  // Safely get icon - use Clock as ultimate fallback
  const StatusIcon = (status.icon && typeof status.icon === 'function') ? status.icon : Clock;

  const isShippable = ["pending", "ready_to_ship"].includes(task.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-cyan-500/30 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
            <StatusIcon className={`w-5 h-5 ${status.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">
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
            <p className="text-sm text-zinc-400 mt-1">
              {task.sales_orders?.customers?.name || "Onbekende klant"}
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
            Verzenden
          </Button>
        )}

        {task.status === "shipped" && task.track_trace_code && (
          <div className="text-right">
            <div className="text-xs text-zinc-500">Track & Trace</div>
            <div className="flex items-center gap-1 mt-1">
              <code className="text-sm text-cyan-400">{task.track_trace_code}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(task.track_trace_code);
                  toast.success("Gekopieerd!");
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
      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-zinc-500">Pakjes</span>
          <span className="ml-2 text-white">{task.package_count}</span>
        </div>
        {task.carrier && (
          <div>
            <span className="text-zinc-500">Vervoerder</span>
            <span className="ml-2 text-white">{task.carrier}</span>
          </div>
        )}
        {task.ship_by_date && (
          <div>
            <span className="text-zinc-500">Verzenden voor</span>
            <span className="ml-2 text-white">
              {new Date(task.ship_by_date).toLocaleDateString("nl-NL")}
            </span>
          </div>
        )}
        {task.shipped_at && (
          <div>
            <span className="text-zinc-500">Verzonden</span>
            <span className="ml-2 text-white">
              {new Date(task.shipped_at).toLocaleDateString("nl-NL")}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Overdue tracking alert
function OverdueAlert({ count, onClick }) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="font-medium text-red-400">
              {count} levering{count > 1 ? "en" : ""} te laat
            </h3>
            <p className="text-sm text-red-400/70">
              Controleer de tracking status en neem actie
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-red-400" />
      </div>
    </motion.div>
  );
}

export default function InventoryShipping() {
  const { user } = useUser();
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
        toast.error("Kon verzendtaken niet laden");
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [companyId]);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (filter !== "all" && task.status !== filter) return false;

    // Search filter
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

      // Refresh tasks
      const taskData = await listShippingTasks(companyId);
      setTasks(taskData);
    } catch (error) {
      throw error; // Re-throw for modal to handle
    }
  };

  const openShipModal = (task) => {
    setSelectedTask(task);
    setShowShipModal(true);
  };

  return (
    <PermissionGuard permission="shipping.manage" showMessage>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-6">
          <PageHeader
            title="Verzendingen"
            subtitle="Beheer verzendtaken en track & trace"
            icon={Truck}
          />
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Overdue alert */}
          <OverdueAlert
            count={stats.overdue}
            onClick={() => setFilter("shipped")}
          />

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Clock}
              label="Te verzenden"
              value={stats.pending}
              color="yellow"
            />
            <StatCard
              icon={Truck}
              label="Onderweg"
              value={stats.shipped}
              color="blue"
            />
            <StatCard
              icon={Check}
              label="Afgeleverd"
              value={stats.delivered}
              color="green"
            />
            <StatCard
              icon={AlertTriangle}
              label="Te laat"
              value={stats.overdue}
              color="red"
            />
          </div>

          {/* Filters */}
          <GlassCard className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Zoek op order, klant of T&T code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-zinc-900/50 border-white/10"
                />
              </div>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="bg-zinc-900/50">
                  <TabsTrigger value="all">Alles</TabsTrigger>
                  <TabsTrigger value="pending">Te verzenden</TabsTrigger>
                  <TabsTrigger value="shipped">Onderweg</TabsTrigger>
                  <TabsTrigger value="delivered">Afgeleverd</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </GlassCard>

          {/* Task list */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Geen verzendtaken gevonden
              </h3>
              <p className="text-zinc-500">
                {search
                  ? "Probeer een andere zoekopdracht"
                  : "Er zijn momenteel geen verzendtaken"}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <ShippingTaskCard
                  key={task.id}
                  task={task}
                  onShip={openShipModal}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ship modal */}
        <ShipModal
          task={selectedTask}
          isOpen={showShipModal}
          onClose={() => {
            setShowShipModal(false);
            setSelectedTask(null);
          }}
          onShip={handleShip}
        />
      </div>
    </PermissionGuard>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  Linkedin,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  Trash2,
  Check,
  RefreshCw,
  MessageSquare,
  Edit,
  AlertTriangle,
} from "lucide-react";
import OutreachMessageModal from "./OutreachMessageModal";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-zinc-500/20 text-zinc-400", icon: Edit },
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  approved_ready: { label: "Ready", color: "bg-blue-500/20 text-blue-400", icon: Check },
  sent: { label: "Sent", color: "bg-green-500/20 text-green-400", icon: Send },
  replied: { label: "Replied", color: "bg-red-500/20 text-red-400", icon: MessageSquare },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

const TYPE_ICONS = {
  email: Mail,
  linkedin: Linkedin,
  linkedin_connection: Linkedin,
  call: Phone,
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Task Row Component
const TaskRow = ({ task, isSelected, onToggle, onEdit }) => {
  const TypeIcon = TYPE_ICONS[task.task_type] || Mail;

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isSelected
          ? "bg-red-500/10 border-red-500/30"
          : "bg-zinc-800/30 border-zinc-700/30 hover:border-zinc-600/50"
      }`}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(task.id)}
        className="border-zinc-600"
      />

      <div className="p-2 rounded-lg bg-zinc-700/50">
        <TypeIcon className="w-4 h-4 text-zinc-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">
            {task.candidates?.name || task.candidate_name || "Unknown"}
          </span>
          <StatusBadge status={task.status} />
        </div>
        <p className="text-sm text-zinc-500 truncate mt-0.5">
          {task.subject || task.content?.substring(0, 60) || "No content"}...
        </p>
      </div>

      <div className="text-xs text-zinc-500 whitespace-nowrap">
        {task.scheduled_at ? (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(task.scheduled_at)}
          </span>
        ) : (
          formatDate(task.created_at)
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(task)}
        className="text-zinc-400 hover:text-white"
      >
        <Edit className="w-4 h-4" />
      </Button>
    </motion.div>
  );
};

export default function OutreachQueue({ campaignId, compact = false }) {
  const { user } = useUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [user, campaignId]);

  const fetchTasks = async () => {
    if (!user?.organization_id) return;

    setLoading(true);
    try {
      let query = supabase
        .from("outreach_tasks")
        .select("*, candidates(name, email, current_company)")
        .eq("organization_id", user.organization_id)
        .order("created_at", { ascending: false });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query.limit(compact ? 10 : 100);

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load outreach queue");
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const toggleTask = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const bulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setIsApproving(true);
    try {
      const { error } = await supabase
        .from("outreach_tasks")
        .update({ status: "approved_ready" })
        .in("id", Array.from(selectedIds))
        .in("status", ["draft", "pending"]);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          selectedIds.has(t.id) && ["draft", "pending"].includes(t.status)
            ? { ...t, status: "approved_ready" }
            : t
        )
      );
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} tasks approved`);
    } catch (error) {
      console.error("Error approving tasks:", error);
      toast.error("Failed to approve tasks");
    } finally {
      setIsApproving(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("outreach_tasks")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      toast.success(`${selectedIds.size} tasks deleted`);
    } catch (error) {
      console.error("Error deleting tasks:", error);
      toast.error("Failed to delete tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...updatedTask, candidates: t.candidates } : t))
    );
    setEditingTask(null);
  };

  const stats = useMemo(() => ({
    total: tasks.length,
    draft: tasks.filter((t) => t.status === "draft").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    ready: tasks.filter((t) => t.status === "approved_ready").length,
    sent: tasks.filter((t) => t.status === "sent").length,
    replied: tasks.filter((t) => t.status === "replied").length,
  }), [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-medium text-white">Outreach Queue</h3>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              {filteredTasks.length} tasks
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={bulkApprove}
                  disabled={isApproving}
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  {isApproving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Approve ({selectedIds.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchTasks}
              className="text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Stats (non-compact mode) */}
      {!compact && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">
            Draft: <span className="text-zinc-400">{stats.draft}</span>
          </span>
          <span className="text-zinc-500">
            Pending: <span className="text-yellow-400">{stats.pending}</span>
          </span>
          <span className="text-zinc-500">
            Ready: <span className="text-blue-400">{stats.ready}</span>
          </span>
          <span className="text-zinc-500">
            Sent: <span className="text-green-400">{stats.sent}</span>
          </span>
          <span className="text-zinc-500">
            Replied: <span className="text-red-400">{stats.replied}</span>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-zinc-800/50 border-zinc-700 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved_ready">Ready</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {!compact && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="text-zinc-400 hover:text-white"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              className="text-zinc-400 hover:text-white"
            >
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Task List */}
      <div className={`space-y-2 ${compact ? "max-h-[300px]" : "max-h-[500px]"} overflow-y-auto pr-2`}>
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No outreach tasks</p>
              <p className="text-xs text-zinc-600 mt-1">
                {statusFilter !== "all"
                  ? "Try changing the status filter"
                  : "Create messages to start your outreach"}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isSelected={selectedIds.has(task.id)}
                onToggle={toggleTask}
                onEdit={setEditingTask}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete Tasks
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete {selectedIds.size} selected task(s)? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Task Modal */}
      {editingTask && (
        <OutreachMessageModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          candidate={editingTask.candidates}
          onSuccess={handleTaskUpdated}
        />
      )}
    </div>
  );
}

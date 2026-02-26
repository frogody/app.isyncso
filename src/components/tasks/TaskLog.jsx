import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import {
  Search, ArrowUpDown, ArrowRight, Calendar, Clock,
  User, Filter, ChevronDown, ChevronRight as ChevronR,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "@/components/ui/GlassCard";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./TaskCard";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function TaskLog({ teamMembers = [] }) {
  const { user } = useUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("delegated"); // delegated | received | all
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Build a lookup map of team members
  const memberMap = useMemo(() => {
    const map = {};
    teamMembers.forEach((m) => {
      map[m.id] = m;
    });
    if (user) map[user.id] = { id: user.id, full_name: user.full_name || "You", email: user.email };
    return map;
  }, [teamMembers, user]);

  const getMemberName = useCallback(
    (id) => {
      if (!id) return "Unassigned";
      if (id === user?.id) return "You";
      const m = memberMap[id];
      return m?.full_name || m?.email || id.slice(0, 8);
    },
    [memberMap, user?.id]
  );

  // Fetch task log
  useEffect(() => {
    if (!user?.id) return;

    const fetchLog = async () => {
      setLoading(true);
      try {
        // Fetch tasks where current user created OR is assigned
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
          .order("created_date", { ascending: false })
          .limit(200);

        if (error) throw error;
        setTasks(data || []);
      } catch (err) {
        console.error("[TaskLog] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [user?.id]);

  // Filter tasks based on view mode
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // View mode
    if (viewMode === "delegated") {
      // Tasks I created and assigned to someone else
      result = result.filter(
        (t) => t.created_by === user?.id && t.assigned_to && t.assigned_to !== user?.id
      );
    } else if (viewMode === "received") {
      // Tasks someone else created and assigned to me
      result = result.filter(
        (t) => t.assigned_to === user?.id && t.created_by && t.created_by !== user?.id
      );
    }
    // "all" shows everything

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          getMemberName(t.assigned_to)?.toLowerCase().includes(q) ||
          getMemberName(t.created_by)?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, viewMode, statusFilter, search, user?.id, getMemberName]);

  // Stats
  const stats = useMemo(() => {
    const delegated = tasks.filter(
      (t) => t.created_by === user?.id && t.assigned_to && t.assigned_to !== user?.id
    );
    const received = tasks.filter(
      (t) => t.assigned_to === user?.id && t.created_by && t.created_by !== user?.id
    );
    return {
      delegatedTotal: delegated.length,
      delegatedOpen: delegated.filter((t) => t.status !== "completed" && t.status !== "cancelled").length,
      receivedTotal: received.length,
      receivedOpen: received.filter((t) => t.status !== "completed" && t.status !== "cancelled").length,
    };
  }, [tasks, user?.id]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <GlassCard className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setViewMode("delegated")}
          className={`rounded-xl border p-3 text-left transition-colors ${
            viewMode === "delegated"
              ? "border-cyan-500/40 bg-cyan-500/10"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
        >
          <p className="text-xs text-zinc-500">Delegated</p>
          <p className="text-xl font-semibold text-white">{stats.delegatedTotal}</p>
          <p className="text-xs text-zinc-500">{stats.delegatedOpen} open</p>
        </button>
        <button
          onClick={() => setViewMode("received")}
          className={`rounded-xl border p-3 text-left transition-colors ${
            viewMode === "received"
              ? "border-cyan-500/40 bg-cyan-500/10"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
        >
          <p className="text-xs text-zinc-500">Received</p>
          <p className="text-xl font-semibold text-white">{stats.receivedTotal}</p>
          <p className="text-xs text-zinc-500">{stats.receivedOpen} open</p>
        </button>
        <button
          onClick={() => setViewMode("all")}
          className={`rounded-xl border p-3 text-left transition-colors col-span-2 sm:col-span-2 ${
            viewMode === "all"
              ? "border-cyan-500/40 bg-cyan-500/10"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
        >
          <p className="text-xs text-zinc-500">All Task Activity</p>
          <p className="text-xl font-semibold text-white">{tasks.length}</p>
          <p className="text-xs text-zinc-500">tasks you created or are assigned to</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search tasks or people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-sm">
            {viewMode === "delegated"
              ? "No tasks delegated to others yet"
              : viewMode === "received"
                ? "No tasks received from others"
                : "No task activity found"}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredTasks.map((task) => {
            const isExpanded = expandedRows.has(task.id);
            const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
            const isDelegated = task.created_by === user?.id && task.assigned_to !== user?.id;

            return (
              <div key={task.id}>
                <button
                  onClick={() => toggleRow(task.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left group"
                >
                  {/* Expand icon */}
                  <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronR className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConf.dotColor}`} />

                  {/* Priority dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityConf.dot}`} />

                  {/* Title */}
                  <span className={`flex-1 text-sm truncate ${
                    task.status === "completed" ? "text-zinc-500 line-through" : "text-zinc-200"
                  }`}>
                    {task.title}
                  </span>

                  {/* Direction badge */}
                  <Badge
                    variant="outline"
                    className={`text-[10px] flex-shrink-0 ${
                      isDelegated
                        ? "border-cyan-500/30 text-cyan-400"
                        : "border-purple-500/30 text-purple-400"
                    }`}
                  >
                    {isDelegated ? "Delegated" : "Received"}
                  </Badge>

                  {/* People flow */}
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 flex-shrink-0 min-w-[180px] justify-end">
                    <span className="truncate max-w-[70px]">{getMemberName(task.created_by)}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                    <span className="truncate max-w-[70px]">{getMemberName(task.assigned_to)}</span>
                  </div>

                  {/* Due date */}
                  {task.due_date && (
                    <span className="hidden md:block text-xs text-zinc-500 flex-shrink-0">
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}

                  {/* Time ago */}
                  <span className="text-[10px] text-zinc-600 flex-shrink-0 w-16 text-right">
                    {timeAgo(task.created_date)}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="ml-10 mr-3 mb-2 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 space-y-2 text-sm">
                    {task.description && (
                      <p className="text-zinc-400 text-xs">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Created by: <span className="text-zinc-300">{getMemberName(task.created_by)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        Assigned to: <span className="text-zinc-300">{getMemberName(task.assigned_to)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        Status: <span className="text-zinc-300">{statusConf.label}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        Priority: <span className="text-zinc-300">{priorityConf.label}</span>
                      </span>
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: <span className="text-zinc-300">{new Date(task.due_date).toLocaleDateString()}</span>
                        </span>
                      )}
                      {task.created_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Created: <span className="text-zinc-300">{new Date(task.created_date).toLocaleDateString()}</span>
                        </span>
                      )}
                      {task.source && task.source !== "manual" && (
                        <span>
                          Source: <span className="text-zinc-300">{task.source}</span>
                        </span>
                      )}
                    </div>
                    {task.checklist?.length > 0 && (
                      <div className="text-xs text-zinc-500">
                        Subtasks: {task.checklist.filter((c) => c.done).length}/{task.checklist.length} done
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

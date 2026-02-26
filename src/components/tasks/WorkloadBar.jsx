import React, { useState, useEffect } from "react";
import { Users, Loader2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * Per-person workload visualization bar.
 * Shows horizontal bars per team member with their task counts for the current week.
 */
export default function WorkloadBar({ companyId, className = "" }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchWorkloads = async () => {
      try {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, email, avatar_url")
          .eq("company_id", companyId)
          .limit(20);

        if (!users?.length) {
          setMembers([]);
          return;
        }

        const userIds = users.map((u) => u.id);
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const { data: tasks } = await supabase
          .from("tasks")
          .select("assigned_to")
          .in("assigned_to", userIds)
          .neq("status", "completed")
          .neq("status", "cancelled")
          .gte("due_date", startOfWeek.toISOString())
          .lte("due_date", endOfWeek.toISOString());

        const counts = {};
        (tasks || []).forEach((t) => {
          counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1;
        });

        const enriched = users
          .map((u) => ({
            ...u,
            taskCount: counts[u.id] || 0,
          }))
          .sort((a, b) => b.taskCount - a.taskCount);

        setMembers(enriched);
      } catch (err) {
        console.error("[WorkloadBar] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkloads();
  }, [companyId]);

  const maxTasks = Math.max(...members.map((m) => m.taskCount), 1);

  const getBarColor = (count) => {
    if (count >= 11) return "bg-red-400";
    if (count >= 6) return "bg-amber-400";
    return "bg-cyan-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-xs text-zinc-500 text-center py-3">
        No team members found
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-medium text-zinc-300">
          Team Workload
        </span>
        <span className="text-[10px] text-zinc-500">this week</span>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 flex-shrink-0">
              {member.full_name?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-zinc-300 truncate">
                  {member.full_name || member.email}
                </span>
                <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2">
                  {member.taskCount}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getBarColor(member.taskCount)}`}
                  style={{
                    width: `${Math.max((member.taskCount / maxTasks) * 100, member.taskCount > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          0-5
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          6-10
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          11+
        </div>
      </div>
    </div>
  );
}

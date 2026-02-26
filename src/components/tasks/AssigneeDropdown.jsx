import React, { useState, useEffect, useMemo } from "react";
import { Search, User, Loader2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/**
 * Searchable team member dropdown with workload indicators.
 * Shows task count per person before assigning.
 */
export default function AssigneeDropdown({
  value,
  onChange,
  companyId,
  placeholder = "Assign to...",
}) {
  const [members, setMembers] = useState([]);
  const [workloads, setWorkloads] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch team members
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, avatar_url, role")
          .eq("company_id", companyId)
          .limit(50);

        if (error) throw error;
        setMembers(data || []);

        // Fetch workloads
        if (data?.length) {
          const userIds = data.map((m) => m.id);
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
            .gte("due_date", startOfWeek.toISOString())
            .lte("due_date", endOfWeek.toISOString());

          const counts = {};
          (tasks || []).forEach((t) => {
            counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1;
          });
          setWorkloads(counts);
        }
      } catch (err) {
        console.error("[AssigneeDropdown] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [companyId]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const getWorkloadColor = (count) => {
    if (count >= 11) return "bg-red-400";
    if (count >= 6) return "bg-amber-400";
    return "bg-emerald-400";
  };

  const getWorkloadLabel = (count) => {
    if (count === undefined || count === 0) return "No tasks this week";
    return `${count} task${count > 1 ? "s" : ""} this week`;
  };

  const selectedMember = members.find((m) => m.id === value);

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
        <SelectValue placeholder={placeholder}>
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 flex-shrink-0">
                {selectedMember.full_name?.[0] || <User className="w-3 h-3" />}
              </div>
              <span className="truncate">{selectedMember.full_name || selectedMember.email}</span>
            </div>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-800 max-h-[300px]">
        {/* Search input */}
        {members.length > 5 && (
          <div className="p-2 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 text-xs bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
        )}

        <SelectItem value="unassigned">
          <div className="flex items-center gap-2 text-zinc-500">
            <User className="w-4 h-4" /> Unassigned
          </div>
        </SelectItem>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          </div>
        ) : (
          filteredMembers.map((member) => {
            const taskCount = workloads[member.id] || 0;

            return (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2 w-full">
                  <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 flex-shrink-0">
                    {member.full_name?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate">{member.full_name || member.email}</span>
                    {member.role && (
                      <span className="text-[10px] text-zinc-500 ml-1.5">{member.role}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${getWorkloadColor(taskCount)}`} />
                    <span className="text-[10px] text-zinc-500">{taskCount} tasks</span>
                  </div>
                </div>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { CRMPageTransition } from "@/components/crm/ui";
import { useUser } from "@/components/context/UserContext";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import {
  Users, Target, Euro, TrendingUp, Calendar, ArrowRight,
  UserCheck, Kanban, Megaphone, FileSpreadsheet,
  Building2, UserPlus, Star, Clock, ArrowUpRight,
  ArrowDownRight, Activity, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "bg-zinc-500" },
  { key: "contacted", label: "Contacted", color: "bg-cyan-600/80" },
  { key: "qualified", label: "Qualified", color: "bg-cyan-500/80" },
  { key: "proposal", label: "Proposal", color: "bg-cyan-500" },
  { key: "negotiation", label: "Negotiation", color: "bg-cyan-400" },
  { key: "won", label: "Won", color: "bg-cyan-300" },
];

const SOURCE_COLORS = {
  website: "bg-cyan-500",
  referral: "bg-blue-500",
  linkedin: "bg-indigo-500",
  cold_outreach: "bg-violet-500",
  event: "bg-amber-500",
  partner: "bg-emerald-500",
  other: "bg-zinc-500",
};

function formatRelativeTime(date) {
  if (!date) return "";
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatCurrency(value) {
  if (!value) return "€0";
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value.toLocaleString()}`;
}

function StatSkeleton({ crt }) {
  return (
    <div className={`rounded-xl p-4 ${crt("bg-slate-50 border border-slate-200", "bg-zinc-900/60 border border-zinc-800/60")}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg animate-pulse ${crt("bg-slate-200", "bg-zinc-800")}`} />
        <div className={`w-12 h-5 rounded-lg animate-pulse ${crt("bg-slate-200", "bg-zinc-800")}`} />
      </div>
      <div className={`h-7 w-20 rounded animate-pulse mb-1 ${crt("bg-slate-200", "bg-zinc-800")}`} />
      <div className={`h-3 w-28 rounded animate-pulse ${crt("bg-slate-100", "bg-zinc-800/60")}`} />
    </div>
  );
}

export default function CRMDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { crt } = useTheme();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    document.title = "CRM Dashboard | iSyncSO";
    return () => { document.title = "iSyncSO"; };
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      const companyId = user.company_id;
      if (!companyId) { setLoading(false); return; }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("prospects")
          .select("id, name, company_name, email, stage, contact_type, source, deal_value, score, created_at, updated_at, next_follow_up, is_starred")
          .eq("company_id", companyId)
          .order("updated_at", { ascending: false });

        if (!error && data) setContacts(data);
      } catch (err) {
        console.error("CRM Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id, user?.company_id]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const pipelineContacts = contacts.filter(c => c.stage && c.stage !== "won" && c.stage !== "lost");
    const pipelineValue = pipelineContacts.reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0);
    const wonDeals = contacts.filter(c => c.stage === "won");
    const wonValue = wonDeals.reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0);
    const dealsWithStage = contacts.filter(c => c.stage && c.stage !== "new");
    const conversionRate = dealsWithStage.length > 0 ? Math.round((wonDeals.length / dealsWithStage.length) * 100) : 0;
    return { total, pipelineValue, wonDeals: wonDeals.length, wonValue, conversionRate };
  }, [contacts]);

  const stageCounts = useMemo(() => {
    const counts = {};
    contacts.forEach(c => {
      const stage = (c.stage || "new").toLowerCase();
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  const sourceCounts = useMemo(() => {
    const counts = {};
    contacts.forEach(c => {
      const src = c.source || "other";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
  }, [contacts]);

  const recentContacts = useMemo(() => contacts.slice(0, 8), [contacts]);

  const upcomingFollowUps = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return contacts
      .filter(c => c.next_follow_up && new Date(c.next_follow_up) <= weekFromNow && new Date(c.next_follow_up) >= now)
      .sort((a, b) => new Date(a.next_follow_up) - new Date(b.next_follow_up))
      .slice(0, 6);
  }, [contacts]);

  const totalPipelineOpps = PIPELINE_STAGES.reduce((sum, s) => sum + (stageCounts[s.key] || 0), 0) || 1;

  if (loading) {
    return (
      <CRMPageTransition>
        <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <StatSkeleton key={i} crt={crt} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`rounded-xl p-6 h-48 animate-pulse ${crt("bg-slate-50", "bg-zinc-900/60")}`} />
            <div className={`rounded-xl p-6 h-48 animate-pulse ${crt("bg-slate-50", "bg-zinc-900/60")}`} />
          </div>
        </div>
      </CRMPageTransition>
    );
  }

  return (
    <CRMPageTransition>
      <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-lg font-bold ${crt("text-slate-900", "text-white")}`}>CRM Dashboard</h1>
            <p className={`text-xs ${crt("text-slate-500", "text-zinc-400")}`}>
              Overview of your contacts and pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl("CRMContacts"))}
              className={crt("border-slate-300 text-slate-600", "border-zinc-700 text-zinc-300")}
            >
              <Users className="w-4 h-4 mr-1" /> View All
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(createPageUrl("CRMContacts") + "?tab=lead")}
              className="bg-cyan-600/80 hover:bg-cyan-600 text-white"
            >
              <UserPlus className="w-4 h-4 mr-1" /> Add Contact
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Total Contacts", value: stats.total, color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
            { icon: Euro, label: "Pipeline Value", value: formatCurrency(stats.pipelineValue), color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
            { icon: Target, label: "Won Deals", value: stats.wonDeals, sub: formatCurrency(stats.wonValue), color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
            { icon: TrendingUp, label: "Conversion Rate", value: `${stats.conversionRate}%`, color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl p-4 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className={`text-xl font-bold ${crt("text-slate-900", "text-white")}`}>{stat.value}</div>
              <div className={`text-xs ${crt("text-slate-500", "text-zinc-500")}`}>
                {stat.label}
                {stat.sub && <span className={`ml-1 ${stat.color}`}>{stat.sub}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline + Source Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pipeline Stages */}
          <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${crt("text-slate-900", "text-white")}`}>Pipeline Stages</h2>
              <button onClick={() => navigate(createPageUrl("CRMPipeline"))} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                View Pipeline <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {PIPELINE_STAGES.map(stage => {
                const count = stageCounts[stage.key] || 0;
                const pct = Math.round((count / totalPipelineOpps) * 100);
                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    <span className={`text-xs w-20 truncate ${crt("text-slate-600", "text-zinc-400")}`}>{stage.label}</span>
                    <div className={`flex-1 h-2 rounded-full ${crt("bg-slate-100", "bg-zinc-800")}`}>
                      <div className={`h-full rounded-full ${stage.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-medium w-8 text-right ${crt("text-slate-700", "text-zinc-300")}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Source Breakdown */}
          <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <h2 className={`text-sm font-semibold mb-4 ${crt("text-slate-900", "text-white")}`}>Source Breakdown</h2>
            <div className="space-y-3">
              {sourceCounts.map(([source, count]) => {
                const pct = Math.round((count / contacts.length) * 100);
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className={`text-xs w-24 truncate capitalize ${crt("text-slate-600", "text-zinc-400")}`}>
                      {source.replace("_", " ")}
                    </span>
                    <div className={`flex-1 h-2 rounded-full ${crt("bg-slate-100", "bg-zinc-800")}`}>
                      <div className={`h-full rounded-full ${SOURCE_COLORS[source] || "bg-zinc-500"} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-medium w-8 text-right ${crt("text-slate-700", "text-zinc-300")}`}>{count}</span>
                  </div>
                );
              })}
              {sourceCounts.length === 0 && (
                <p className={`text-xs ${crt("text-slate-400", "text-zinc-500")}`}>No source data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent + Follow-ups Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Contacts */}
          <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${crt("text-slate-900", "text-white")}`}>Recent Activity</h2>
              <button onClick={() => navigate(createPageUrl("CRMContacts"))} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => navigate(createPageUrl("CRMContactProfile") + `?id=${contact.id}`)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${crt("hover:bg-slate-50", "hover:bg-zinc-800/50")}`}
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center text-cyan-400 text-xs font-medium flex-shrink-0">
                    {(contact.name || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${crt("text-slate-900", "text-white")}`}>{contact.name}</p>
                    <p className={`text-xs truncate ${crt("text-slate-500", "text-zinc-500")}`}>{contact.company_name || contact.email}</p>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${crt("text-slate-400", "text-zinc-500")}`}>
                    {formatRelativeTime(contact.updated_at)}
                  </span>
                </button>
              ))}
              {recentContacts.length === 0 && (
                <p className={`text-xs text-center py-4 ${crt("text-slate-400", "text-zinc-500")}`}>No contacts yet</p>
              )}
            </div>
          </div>

          {/* Upcoming Follow-ups */}
          <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${crt("text-slate-900", "text-white")}`}>Upcoming Follow-ups</h2>
              <Clock className={`w-4 h-4 ${crt("text-slate-400", "text-zinc-500")}`} />
            </div>
            <div className="space-y-2">
              {upcomingFollowUps.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => navigate(createPageUrl("CRMContactProfile") + `?id=${contact.id}`)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${crt("hover:bg-slate-50", "hover:bg-zinc-800/50")}`}
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center text-cyan-400 text-xs font-medium flex-shrink-0">
                    {(contact.name || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${crt("text-slate-900", "text-white")}`}>{contact.name}</p>
                    <p className={`text-xs truncate ${crt("text-slate-500", "text-zinc-500")}`}>{contact.company_name}</p>
                  </div>
                  <span className="text-xs text-cyan-400 flex-shrink-0">
                    {new Date(contact.next_follow_up).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </button>
              ))}
              {upcomingFollowUps.length === 0 && (
                <p className={`text-xs text-center py-4 ${crt("text-slate-400", "text-zinc-500")}`}>No follow-ups scheduled this week</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Contacts", desc: "View all contacts", path: createPageUrl("CRMContacts") },
            { icon: Kanban, label: "Pipeline", desc: "Manage deals", path: createPageUrl("CRMPipeline") },
            { icon: Megaphone, label: "Campaigns", desc: "Outreach campaigns", path: createPageUrl("CRMCampaigns") },
            { icon: FileSpreadsheet, label: "Import", desc: "Import contacts", path: createPageUrl("ContactsImport") },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => navigate(action.path)}
              className={`rounded-xl p-4 text-left transition-all ${crt(
                "bg-white border border-slate-200 hover:border-cyan-300 shadow-sm",
                "bg-zinc-900/60 border border-zinc-800/60 hover:border-cyan-600/40"
              )}`}
            >
              <action.icon className="w-5 h-5 text-cyan-400 mb-2" />
              <p className={`text-sm font-medium ${crt("text-slate-900", "text-white")}`}>{action.label}</p>
              <p className={`text-xs ${crt("text-slate-500", "text-zinc-500")}`}>{action.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </CRMPageTransition>
  );
}

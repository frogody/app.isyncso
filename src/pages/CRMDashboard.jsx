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
  ArrowDownRight, Activity, Loader2, Globe, Briefcase,
  MapPin, Truck, Handshake, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PIPELINE_TYPES = ['lead', 'prospect', 'target', 'contact'];
const ALWAYS_COMPANY_TYPES = ['company', 'supplier'];

const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "bg-zinc-500" },
  { key: "contacted", label: "Contacted", color: "bg-cyan-600/80" },
  { key: "qualified", label: "Qualified", color: "bg-cyan-500/80" },
  { key: "proposal", label: "Proposal", color: "bg-cyan-500" },
  { key: "negotiation", label: "Negotiation", color: "bg-cyan-400" },
  { key: "won", label: "Won", color: "bg-cyan-300" },
];

const TYPE_CONFIG = {
  customer:           { label: "Customers",    icon: UserCheck, color: "text-cyan-400",   bg: "bg-cyan-500/15" },
  supplier:           { label: "Suppliers",     icon: Truck,     color: "text-blue-400",   bg: "bg-blue-500/15" },
  company:            { label: "Companies",     icon: Building2, color: "text-indigo-400", bg: "bg-indigo-500/15" },
  partner:            { label: "Partners",      icon: Handshake, color: "text-violet-400", bg: "bg-violet-500/15" },
  lead:               { label: "Leads",         icon: Target,    color: "text-cyan-400",   bg: "bg-cyan-500/15" },
  prospect:           { label: "Prospects",     icon: TrendingUp,color: "text-cyan-400",   bg: "bg-cyan-500/15" },
  candidate:          { label: "Candidates",    icon: Users,     color: "text-cyan-400",   bg: "bg-cyan-500/15" },
  recruitment_client: { label: "Recruitment",   icon: Briefcase, color: "text-cyan-400",   bg: "bg-cyan-500/15" },
  target:             { label: "Targets",       icon: Target,    color: "text-cyan-400",   bg: "bg-cyan-500/15" },
  contact:            { label: "Contacts",      icon: Users,     color: "text-cyan-400",   bg: "bg-cyan-500/15" },
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
      const orgId = user.organization_id || user.company_id;
      if (!orgId) { setLoading(false); return; }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("prospects")
          .select("*")
          .eq("organization_id", orgId)
          .order("updated_date", { ascending: false });

        if (!error && data) {
          // Map to consistent field names (matching CRMContacts pattern)
          const mapped = data.map(p => ({
            ...p,
            name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.company || "Unknown",
            company_name: p.company,
          }));
          setContacts(mapped);
        }
      } catch (err) {
        console.error("CRM Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id, user?.organization_id, user?.company_id]);

  // --- Computed stats ---
  const stats = useMemo(() => {
    const total = contacts.length;
    const companyEntities = contacts.filter(c => ALWAYS_COMPANY_TYPES.includes(c.contact_type));
    const withVat = contacts.filter(c => c.vat_number);
    const enriched = contacts.filter(c => c.linkedin_url || c.website || c.industry);
    return { total, companies: companyEntities.length, withVat: withVat.length, enriched: enriched.length };
  }, [contacts]);

  const typeCounts = useMemo(() => {
    const counts = {};
    contacts.forEach(c => {
      const type = c.contact_type || "contact";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);
  }, [contacts]);

  const countryCounts = useMemo(() => {
    const counts = {};
    contacts.forEach(c => {
      const country = c.location_country;
      if (country) counts[country] = (counts[country] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [contacts]);

  const industryCounts = useMemo(() => {
    const counts = {};
    contacts.forEach(c => {
      const industry = c.industry;
      if (industry) counts[industry] = (counts[industry] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [contacts]);

  // Pipeline stats (only for pipeline types)
  const pipelineContacts = useMemo(() => contacts.filter(c => PIPELINE_TYPES.includes(c.contact_type)), [contacts]);
  const stageCounts = useMemo(() => {
    const counts = {};
    pipelineContacts.forEach(c => {
      const stage = (c.stage || "new").toLowerCase();
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [pipelineContacts]);

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
              Overview of your contacts and relationships
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
            { icon: Building2, label: "Companies", value: stats.companies, color: "text-blue-400", bgColor: "bg-blue-500/15" },
            { icon: ShieldCheck, label: "With VAT", value: stats.withVat, color: "text-indigo-400", bgColor: "bg-indigo-500/15" },
            { icon: Activity, label: "Enriched", value: stats.enriched, color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl p-4 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className={`text-xl font-bold ${crt("text-slate-900", "text-white")}`}>{stat.value}</div>
              <div className={`text-xs ${crt("text-slate-500", "text-zinc-500")}`}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Type Breakdown + Company Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contact Type Breakdown */}
          <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${crt("text-slate-900", "text-white")}`}>Contacts by Type</h2>
              <button onClick={() => navigate(createPageUrl("CRMContacts"))} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {typeCounts.map(([type, count]) => {
                const config = TYPE_CONFIG[type] || TYPE_CONFIG.contact;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const TypeIcon = config.icon;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${config.bg} flex-shrink-0`}>
                      <TypeIcon className={`w-3 h-3 ${config.color}`} />
                    </div>
                    <span className={`text-xs w-20 truncate ${crt("text-slate-600", "text-zinc-400")}`}>{config.label}</span>
                    <div className={`flex-1 h-2 rounded-full ${crt("bg-slate-100", "bg-zinc-800")}`}>
                      <div className={`h-full rounded-full bg-cyan-500 transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-medium w-8 text-right ${crt("text-slate-700", "text-zinc-300")}`}>{count}</span>
                  </div>
                );
              })}
              {typeCounts.length === 0 && (
                <p className={`text-xs ${crt("text-slate-400", "text-zinc-500")}`}>No contacts yet</p>
              )}
            </div>
          </div>

          {/* Company Insights */}
          <div className="space-y-4">
            {/* By Country */}
            <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
              <h2 className={`text-sm font-semibold mb-3 ${crt("text-slate-900", "text-white")}`}>
                <Globe className="w-4 h-4 inline mr-1.5 text-cyan-400" />Countries
              </h2>
              <div className="flex flex-wrap gap-2">
                {countryCounts.map(([country, count]) => (
                  <span key={country} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${crt("bg-slate-100 text-slate-700", "bg-zinc-800 text-zinc-300")}`}>
                    {country} <span className="text-cyan-400">{count}</span>
                  </span>
                ))}
                {countryCounts.length === 0 && (
                  <p className={`text-xs ${crt("text-slate-400", "text-zinc-500")}`}>No country data yet</p>
                )}
              </div>
            </div>
            {/* By Industry */}
            <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
              <h2 className={`text-sm font-semibold mb-3 ${crt("text-slate-900", "text-white")}`}>
                <Briefcase className="w-4 h-4 inline mr-1.5 text-cyan-400" />Industries
              </h2>
              <div className="flex flex-wrap gap-2">
                {industryCounts.map(([industry, count]) => (
                  <span key={industry} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${crt("bg-slate-100 text-slate-700", "bg-zinc-800 text-zinc-300")}`}>
                    {industry} <span className="text-cyan-400">{count}</span>
                  </span>
                ))}
                {industryCounts.length === 0 && (
                  <p className={`text-xs ${crt("text-slate-400", "text-zinc-500")}`}>No industry data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Summary + Recent Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pipeline Stages (compact, only for pipeline types) */}
          <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${crt("text-slate-900", "text-white")}`}>
                Sales Pipeline
                <span className={`ml-2 text-xs font-normal ${crt("text-slate-400", "text-zinc-500")}`}>
                  {pipelineContacts.length} leads/prospects
                </span>
              </h2>
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

          {/* Recent Activity */}
          <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${crt("text-slate-900", "text-white")}`}>Recent Activity</h2>
              <button onClick={() => navigate(createPageUrl("CRMContacts"))} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentContacts.map(contact => {
                const config = TYPE_CONFIG[contact.contact_type] || TYPE_CONFIG.contact;
                return (
                  <button
                    key={contact.id}
                    onClick={() => navigate(createPageUrl("CRMContactProfile") + `?id=${contact.id}`)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${crt("hover:bg-slate-50", "hover:bg-zinc-800/50")}`}
                  >
                    <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      {ALWAYS_COMPANY_TYPES.includes(contact.contact_type) ? (
                        <Building2 className={`w-3.5 h-3.5 ${config.color}`} />
                      ) : (
                        <span className={`${config.color} text-xs font-medium`}>{(contact.name || "?")[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${crt("text-slate-900", "text-white")}`}>{contact.name}</p>
                      <p className={`text-xs truncate ${crt("text-slate-500", "text-zinc-500")}`}>{contact.company_name || contact.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${crt("bg-slate-100 text-slate-500", "bg-zinc-800 text-zinc-400")}`}>
                        {contact.contact_type || "contact"}
                      </span>
                      <span className={`text-xs ${crt("text-slate-400", "text-zinc-500")}`}>
                        {formatRelativeTime(contact.updated_date)}
                      </span>
                    </div>
                  </button>
                );
              })}
              {recentContacts.length === 0 && (
                <p className={`text-xs text-center py-4 ${crt("text-slate-400", "text-zinc-500")}`}>No contacts yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Follow-ups */}
        {upcomingFollowUps.length > 0 && (
          <div className={`rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${crt("text-slate-900", "text-white")}`}>Upcoming Follow-ups</h2>
              <Clock className={`w-4 h-4 ${crt("text-slate-400", "text-zinc-500")}`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {upcomingFollowUps.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => navigate(createPageUrl("CRMContactProfile") + `?id=${contact.id}`)}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${crt("hover:bg-slate-50", "hover:bg-zinc-800/50")}`}
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
            </div>
          </div>
        )}

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

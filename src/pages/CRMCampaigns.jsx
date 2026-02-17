import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { CRMPageTransition } from "@/components/crm/ui";
import { useUser } from "@/components/context/UserContext";
import { db, supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import {
  Megaphone, Layers, Play, Pause, FileText, CheckCircle2,
  Plus, Mail, Linkedin, Phone, Globe, Users, BarChart3,
  Calendar, Target, ArrowRight, Loader2, MoreVertical,
  MessageSquare, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_TABS = [
  { id: "all", label: "All", icon: Layers },
  { id: "active", label: "Active", icon: Play },
  { id: "draft", label: "Draft", icon: FileText },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

const TYPE_ICONS = {
  email: Mail,
  linkedin: Linkedin,
  cold_call: Phone,
  multi_channel: Globe,
  sms: MessageSquare,
};

const STATUS_STYLES = {
  active: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  draft: { bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30" },
  paused: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  completed: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-500/40" },
};

function CampaignCard({ campaign, crt, onToggleStatus }) {
  const navigate = useNavigate();
  const TypeIcon = TYPE_ICONS[campaign.campaign_type] || Megaphone;
  const statusStyle = STATUS_STYLES[campaign.status] || STATUS_STYLES.draft;
  const contacted = campaign.contacted || campaign.emails_sent || 0;
  const total = campaign.total_contacts || campaign.prospects_count || 0;
  const responseRate = contacted > 0 && campaign.responded
    ? Math.round((campaign.responded / contacted) * 100)
    : 0;
  const progress = total > 0 ? Math.round((contacted / total) * 100) : 0;

  return (
    <div
      className={`rounded-xl p-4 transition-all cursor-pointer ${crt(
        "bg-white border border-slate-200 hover:border-cyan-300 shadow-sm",
        "bg-zinc-900/60 border border-zinc-800/60 hover:border-cyan-600/40"
      )}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-cyan-500/15`}>
            <TypeIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className={`text-sm font-medium ${crt("text-slate-900", "text-white")}`}>{campaign.name}</p>
            <p className={`text-xs capitalize ${crt("text-slate-500", "text-zinc-500")}`}>
              {(campaign.campaign_type || "email").replace("_", " ")}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`text-xs ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
          {campaign.status}
        </Badge>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs ${crt("text-slate-500", "text-zinc-500")}`}>
              {contacted}/{total} contacted
            </span>
            <span className={`text-xs ${crt("text-slate-400", "text-zinc-500")}`}>{progress}%</span>
          </div>
          <div className={`h-1.5 rounded-full ${crt("bg-slate-100", "bg-zinc-800")}`}>
            <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4">
        {campaign.responded > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className={`w-3 h-3 ${crt("text-slate-400", "text-zinc-500")}`} />
            <span className={`text-xs ${crt("text-slate-500", "text-zinc-400")}`}>{campaign.responded} replies</span>
          </div>
        )}
        {campaign.meetings_booked > 0 && (
          <div className="flex items-center gap-1">
            <Calendar className={`w-3 h-3 ${crt("text-slate-400", "text-zinc-500")}`} />
            <span className={`text-xs ${crt("text-slate-500", "text-zinc-400")}`}>{campaign.meetings_booked} meetings</span>
          </div>
        )}
        {responseRate > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-cyan-400 font-medium">{responseRate}% response</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: crt ? "rgba(226,232,240,0.5)" : "rgba(63,63,70,0.3)" }}>
        {campaign.status === "active" && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onToggleStatus(campaign, "paused"); }}
            className={`text-xs h-7 ${crt("border-slate-200 text-slate-500", "border-zinc-700 text-zinc-400")}`}
          >
            <Pause className="w-3 h-3 mr-1" /> Pause
          </Button>
        )}
        {(campaign.status === "draft" || campaign.status === "paused") && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onToggleStatus(campaign, "active"); }}
            className="text-xs h-7 border-cyan-600/50 bg-cyan-600/10 text-cyan-400"
          >
            <Play className="w-3 h-3 mr-1" /> {campaign.status === "draft" ? "Launch" : "Resume"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CRMCampaigns() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { crt } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    document.title = "CRM Campaigns | iSyncSO";
    return () => { document.title = "iSyncSO"; };
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(tabId === "all" ? {} : { tab: tabId }, { replace: true });
  };

  useEffect(() => {
    let mounted = true;
    async function fetchCampaigns() {
      try {
        setLoading(true);
        const data = await db.entities.GrowthCampaign.list({ limit: 100 }).catch(() => []);
        if (mounted) setCampaigns(data || []);
      } catch (err) {
        console.error("Campaigns fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchCampaigns();
    return () => { mounted = false; };
  }, [user?.id]);

  const filteredCampaigns = useMemo(() => {
    if (activeTab === "all") return campaigns;
    return campaigns.filter(c => c.status === activeTab);
  }, [campaigns, activeTab]);

  const stats = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter(c => c.status === "active").length,
    draft: campaigns.filter(c => c.status === "draft").length,
    completed: campaigns.filter(c => c.status === "completed").length,
  }), [campaigns]);

  const handleToggleStatus = async (campaign, newStatus) => {
    try {
      await db.entities.GrowthCampaign.update(campaign.id, { status: newStatus });
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
      toast.success(`Campaign ${newStatus === "active" ? "activated" : newStatus}`);
    } catch (err) {
      toast.error("Failed to update campaign");
    }
  };

  if (loading) {
    return (
      <CRMPageTransition>
        <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        </div>
      </CRMPageTransition>
    );
  }

  return (
    <CRMPageTransition>
      <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className={`text-lg font-bold ${crt("text-slate-900", "text-white")}`}>Campaigns</h1>
            <p className={`text-xs ${crt("text-slate-500", "text-zinc-400")}`}>
              {stats.active} active &middot; {stats.total} total campaigns
            </p>
          </div>
        </div>

        {/* Status Tab Bar */}
        <div className={`flex items-center gap-1 p-1 rounded-xl ${crt("bg-slate-100 border border-slate-200", "bg-zinc-900/60 border border-zinc-800/60")}`}>
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === "all" ? stats.total : stats[tab.id] || 0;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                  isActive
                    ? crt("bg-white text-slate-900 shadow-sm", "bg-zinc-800 text-white shadow-sm")
                    : crt("text-slate-500 hover:text-slate-700 hover:bg-slate-50", "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50")
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-500" : ""}`} />
                <span>{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-cyan-500/15 text-cyan-400" : crt("bg-slate-200 text-slate-500", "bg-zinc-700 text-zinc-400")
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Campaign Grid */}
        {filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                crt={crt}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        ) : (
          <div className={`text-center py-16 rounded-xl ${crt("bg-slate-50 border border-slate-200", "bg-zinc-900/40 border border-zinc-800/60")}`}>
            <Megaphone className={`w-10 h-10 mx-auto mb-3 ${crt("text-slate-300", "text-zinc-600")}`} />
            <p className={`text-sm font-medium mb-1 ${crt("text-slate-700", "text-zinc-300")}`}>
              {activeTab === "all" ? "No campaigns yet" : `No ${activeTab} campaigns`}
            </p>
            <p className={`text-xs mb-4 ${crt("text-slate-500", "text-zinc-500")}`}>
              Create a campaign to start reaching out to your contacts
            </p>
          </div>
        )}
      </div>
    </CRMPageTransition>
  );
}

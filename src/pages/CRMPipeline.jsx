import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { CRMPageTransition } from "@/components/crm/ui";
import { useUser } from "@/components/context/UserContext";
import { db, supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import {
  Kanban, List, BarChart3, Plus, Euro, Users, Target,
  Building2, Clock, ArrowRight, Calendar, Star,
  TrendingUp, Loader2, GripVertical, MoreVertical,
  ChevronDown, ExternalLink, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const PIPELINE_STAGES = [
  { id: "new", label: "New Lead", color: "bg-zinc-500", textColor: "text-zinc-400", borderColor: "border-zinc-500/30" },
  { id: "contacted", label: "Contacted", color: "bg-cyan-600/80", textColor: "text-cyan-400/80", borderColor: "border-cyan-500/30" },
  { id: "qualified", label: "Qualified", color: "bg-cyan-500/80", textColor: "text-cyan-400/80", borderColor: "border-cyan-500/35" },
  { id: "proposal", label: "Proposal", color: "bg-cyan-500", textColor: "text-cyan-400", borderColor: "border-cyan-500/40" },
  { id: "negotiation", label: "Negotiation", color: "bg-cyan-400/80", textColor: "text-cyan-300/90", borderColor: "border-cyan-500/45" },
  { id: "won", label: "Won", color: "bg-cyan-400", textColor: "text-cyan-300", borderColor: "border-cyan-500/50" },
  { id: "lost", label: "Lost", color: "bg-zinc-700", textColor: "text-zinc-500", borderColor: "border-zinc-600/30" },
];

const VIEW_TABS = [
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "list", label: "List", icon: List },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

function formatCurrency(value) {
  if (!value) return "€0";
  const num = parseFloat(value);
  if (num >= 1000000) return `€${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `€${(num / 1000).toFixed(1)}K`;
  return `€${num.toLocaleString()}`;
}

function daysInStage(updatedAt) {
  if (!updatedAt) return 0;
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
}

// Pipeline Deal Card
function DealCard({ contact, index, onOpen, crt }) {
  const days = daysInStage(contact.updated_at);
  const value = parseFloat(contact.deal_value) || 0;

  return (
    <Draggable draggableId={contact.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(contact)}
          className={`rounded-xl p-3 cursor-pointer transition-all ${
            snapshot.isDragging
              ? "shadow-lg shadow-cyan-500/10 scale-[1.02]"
              : ""
          } ${crt(
            "bg-white border border-slate-200 hover:border-cyan-300",
            "bg-zinc-800/80 border border-zinc-700/60 hover:border-cyan-600/40"
          )}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${crt("text-slate-900", "text-white")}`}>{contact.name}</p>
              {contact.company_name && (
                <p className={`text-xs truncate flex items-center gap-1 mt-0.5 ${crt("text-slate-500", "text-zinc-500")}`}>
                  <Building2 className="w-3 h-3 flex-shrink-0" /> {contact.company_name}
                </p>
              )}
            </div>
            {contact.is_starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
          </div>

          <div className="flex items-center justify-between">
            {value > 0 && (
              <span className={`text-sm font-semibold ${crt("text-slate-900", "text-white")}`}>
                {formatCurrency(value)}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {days > 0 && (
                <span className={`text-xs ${days > 14 ? "text-amber-400" : crt("text-slate-400", "text-zinc-500")}`}>
                  {days}d
                </span>
              )}
              {contact.score > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  contact.score >= 80 ? "bg-cyan-500/15 text-cyan-400" :
                  contact.score >= 60 ? "bg-cyan-500/10 text-cyan-500/80" :
                  crt("bg-slate-100 text-slate-500", "bg-zinc-700 text-zinc-400")
                }`}>
                  {contact.score}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// Pipeline Column
function PipelineStageColumn({ stage, contacts, onOpen, crt }) {
  const totalValue = contacts.reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0);

  return (
    <div className="flex-shrink-0 w-[280px] sm:w-72 snap-start">
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
            <span className={`font-medium text-sm ${crt("text-slate-900", "text-white")}`}>{stage.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${crt("text-slate-400 bg-slate-100", "text-zinc-500 bg-zinc-800")}`}>
              {contacts.length}
            </span>
          </div>
        </div>
        {totalValue > 0 && (
          <div className={`text-xs ${crt("text-slate-400", "text-zinc-500")}`}>{formatCurrency(totalValue)} total</div>
        )}
      </div>

      <Droppable droppableId={stage.id} type="DEAL">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[300px] rounded-xl p-2 transition-all ${
              snapshot.isDraggingOver
                ? "bg-cyan-500/5 border-2 border-dashed border-cyan-500/30"
                : "border-2 border-transparent"
            }`}
          >
            {contacts.map((contact, index) => (
              <DealCard key={contact.id} contact={contact} index={index} onOpen={onOpen} crt={crt} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function CRMPipeline() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { crt } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "pipeline");
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    document.title = "CRM Pipeline | iSyncSO";
    return () => { document.title = "iSyncSO"; };
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams(tabId === "pipeline" ? {} : { tab: tabId }, { replace: true });
  };

  useEffect(() => {
    async function fetchDeals() {
      if (!user?.id) return;
      const companyId = user.company_id;
      if (!companyId) { setLoading(false); return; }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("prospects")
          .select("*")
          .eq("company_id", companyId)
          .order("updated_at", { ascending: false });

        if (!error && data) setContacts(data);
      } catch (err) {
        console.error("Pipeline fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, [user?.id, user?.company_id]);

  const contactsByStage = useMemo(() => {
    const grouped = {};
    PIPELINE_STAGES.forEach(s => { grouped[s.id] = []; });
    contacts.forEach(c => {
      const stage = c.stage || "new";
      if (grouped[stage]) grouped[stage].push(c);
      else grouped.new.push(c);
    });
    return grouped;
  }, [contacts]);

  const pipelineStats = useMemo(() => {
    const activeDeals = contacts.filter(c => c.stage !== "won" && c.stage !== "lost");
    const totalValue = activeDeals.reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0);
    const wonDeals = contacts.filter(c => c.stage === "won");
    const wonValue = wonDeals.reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0);
    const closedDeals = contacts.filter(c => c.stage === "won" || c.stage === "lost");
    const winRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0;
    const avgDealValue = activeDeals.length > 0 ? totalValue / activeDeals.length : 0;
    return { totalValue, wonValue, wonCount: wonDeals.length, activeCount: activeDeals.length, winRate, avgDealValue };
  }, [contacts]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const contactId = result.draggableId;
    const newStage = result.destination.droppableId;

    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: newStage } : c));

    try {
      await db.entities.Prospect.update(contactId, { stage: newStage });
      const stageName = PIPELINE_STAGES.find(s => s.id === newStage)?.label;
      toast.success(`Moved to ${stageName}`);
    } catch (error) {
      console.error("Failed to update stage:", error);
      toast.error("Failed to update stage");
    }
  };

  const handleOpenContact = (contact) => {
    navigate(createPageUrl("CRMContactProfile") + `?id=${contact.id}`);
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
            <h1 className={`text-lg font-bold ${crt("text-slate-900", "text-white")}`}>Pipeline</h1>
            <p className={`text-xs ${crt("text-slate-500", "text-zinc-400")}`}>
              {pipelineStats.activeCount} active deals &middot; {formatCurrency(pipelineStats.totalValue)} in pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate(createPageUrl("CRMContacts"))}
              variant="outline"
              className={crt("border-slate-300 text-slate-600", "border-zinc-700 text-zinc-300")}
            >
              <Users className="w-4 h-4 mr-1" /> Contacts
            </Button>
          </div>
        </div>

        {/* View Tab Bar */}
        <div className={`flex items-center gap-1 p-1 rounded-xl ${crt("bg-slate-100 border border-slate-200", "bg-zinc-900/60 border border-zinc-800/60")}`}>
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
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
              </button>
            );
          })}
        </div>

        {/* Pipeline View */}
        {activeTab === "pipeline" && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0 snap-x snap-mandatory scrollbar-hide">
              {PIPELINE_STAGES.map(stage => (
                <PipelineStageColumn
                  key={stage.id}
                  stage={stage}
                  contacts={contactsByStage[stage.id]}
                  onOpen={handleOpenContact}
                  crt={crt}
                />
              ))}
            </div>
          </DragDropContext>
        )}

        {/* List View */}
        {activeTab === "list" && (
          <div className={`rounded-xl overflow-hidden ${crt("bg-white border border-slate-200", "bg-zinc-900/60 border border-zinc-800/60")}`}>
            <table className="w-full">
              <thead>
                <tr className={crt("bg-slate-50 border-b border-slate-200", "bg-zinc-800/50 border-b border-zinc-700/60")}>
                  <th className={`text-left text-xs font-medium px-4 py-3 ${crt("text-slate-500", "text-zinc-500")}`}>Contact</th>
                  <th className={`text-left text-xs font-medium px-4 py-3 ${crt("text-slate-500", "text-zinc-500")}`}>Company</th>
                  <th className={`text-left text-xs font-medium px-4 py-3 ${crt("text-slate-500", "text-zinc-500")}`}>Stage</th>
                  <th className={`text-right text-xs font-medium px-4 py-3 ${crt("text-slate-500", "text-zinc-500")}`}>Value</th>
                  <th className={`text-right text-xs font-medium px-4 py-3 ${crt("text-slate-500", "text-zinc-500")}`}>Score</th>
                  <th className={`text-right text-xs font-medium px-4 py-3 ${crt("text-slate-500", "text-zinc-500")}`}>Days</th>
                </tr>
              </thead>
              <tbody>
                {contacts
                  .filter(c => c.stage !== "lost")
                  .sort((a, b) => (parseFloat(b.deal_value) || 0) - (parseFloat(a.deal_value) || 0))
                  .map(contact => {
                    const stageConfig = PIPELINE_STAGES.find(s => s.id === contact.stage) || PIPELINE_STAGES[0];
                    const days = daysInStage(contact.updated_at);
                    return (
                      <tr
                        key={contact.id}
                        onClick={() => handleOpenContact(contact)}
                        className={`cursor-pointer transition-colors ${crt("hover:bg-slate-50 border-b border-slate-100", "hover:bg-zinc-800/50 border-b border-zinc-800/40")}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center text-cyan-400 text-xs font-medium">
                              {(contact.name || "?")[0]?.toUpperCase()}
                            </div>
                            <span className={`text-sm font-medium ${crt("text-slate-900", "text-white")}`}>{contact.name}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${crt("text-slate-500", "text-zinc-400")}`}>{contact.company_name || "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${stageConfig.textColor} ${stageConfig.borderColor}`}>
                            {stageConfig.label}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${crt("text-slate-900", "text-white")}`}>
                          {formatCurrency(contact.deal_value)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${crt("text-slate-500", "text-zinc-400")}`}>
                          {contact.score || "-"}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${days > 14 ? "text-amber-400" : crt("text-slate-400", "text-zinc-500")}`}>
                          {days}d
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {contacts.filter(c => c.stage !== "lost").length === 0 && (
              <div className={`text-center py-12 ${crt("text-slate-400", "text-zinc-500")}`}>
                <Kanban className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No deals in pipeline</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics View */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Pipeline Value", value: formatCurrency(pipelineStats.totalValue), icon: Euro, color: "text-cyan-400", bg: "bg-cyan-500/15" },
              { label: "Won Revenue", value: formatCurrency(pipelineStats.wonValue), icon: Target, color: "text-cyan-400", bg: "bg-cyan-500/15" },
              { label: "Win Rate", value: `${pipelineStats.winRate}%`, icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/15" },
              { label: "Avg Deal Size", value: formatCurrency(pipelineStats.avgDealValue), icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/15" },
            ].map((stat, i) => (
              <div key={i} className={`rounded-xl p-4 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className={`text-xl font-bold ${crt("text-slate-900", "text-white")}`}>{stat.value}</div>
                <div className={`text-xs ${crt("text-slate-500", "text-zinc-500")}`}>{stat.label}</div>
              </div>
            ))}

            {/* Stage breakdown */}
            <div className={`col-span-2 lg:col-span-4 rounded-xl p-5 ${crt("bg-white border border-slate-200 shadow-sm", "bg-zinc-900/60 border border-zinc-800/60")}`}>
              <h3 className={`text-sm font-semibold mb-4 ${crt("text-slate-900", "text-white")}`}>Stage Breakdown</h3>
              <div className="space-y-3">
                {PIPELINE_STAGES.map(stage => {
                  const stageContacts = contactsByStage[stage.id] || [];
                  const count = stageContacts.length;
                  const value = stageContacts.reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0);
                  const pct = contacts.length > 0 ? Math.round((count / contacts.length) * 100) : 0;
                  return (
                    <div key={stage.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-28">
                        <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                        <span className={`text-xs ${crt("text-slate-600", "text-zinc-400")}`}>{stage.label}</span>
                      </div>
                      <div className={`flex-1 h-2 rounded-full ${crt("bg-slate-100", "bg-zinc-800")}`}>
                        <div className={`h-full rounded-full ${stage.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs font-medium w-8 text-right ${crt("text-slate-700", "text-zinc-300")}`}>{count}</span>
                      <span className={`text-xs w-20 text-right ${crt("text-slate-500", "text-zinc-500")}`}>{formatCurrency(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </CRMPageTransition>
  );
}

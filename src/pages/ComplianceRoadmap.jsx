import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, Clock, AlertTriangle, CheckCircle, ArrowRight, 
  Sparkles, FileText, Target, Zap, PlayCircle, Map, TrendingUp,
  ChevronRight, Flag, Milestone, BarChart3
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

const ENFORCEMENT_MILESTONES = [
  { 
    date: "2025-02-02", 
    title: "Prohibited Practices & AI Literacy", 
    description: "Ban on prohibited AI practices. AI literacy requirements for providers and deployers.",
    icon: AlertTriangle,
    status: 'active'
  },
  { 
    date: "2025-08-02", 
    title: "GPAI & Governance Rules", 
    description: "General-Purpose AI obligations. EU AI Office governance framework active.",
    icon: Target,
    status: 'upcoming'
  },
  { 
    date: "2026-08-02", 
    title: "High-Risk AI Full Compliance", 
    description: "All high-risk AI system obligations enforceable. CE marking, conformity assessment required.",
    icon: CheckCircle,
    status: 'upcoming'
  },
  { 
    date: "2027-08-02", 
    title: "High-Risk Systems in Regulated Products", 
    description: "High-risk AI in products covered by Annex I must comply.",
    icon: Flag,
    status: 'upcoming'
  }
];

function MilestoneCard({ milestone, index }) {
  const isPast = new Date(milestone.date) < new Date();
  const daysUntil = Math.ceil((new Date(milestone.date) - new Date()) / (1000 * 60 * 60 * 24));
  const Icon = milestone.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {/* Timeline connector */}
      {index < ENFORCEMENT_MILESTONES.length - 1 && (
        <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gradient-to-b from-[#86EFAC]/30 to-zinc-800/60" />
      )}
      
      <div className={`relative bg-zinc-900/60 backdrop-blur-sm rounded-xl border transition-all duration-200 ${
        isPast 
          ? 'border-[#86EFAC]/30' 
          : 'border-zinc-800/60 hover:border-zinc-700/60'
      }`}>
        {isPast && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-[#86EFAC] to-[#6EE7B7]" />
        )}
        
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isPast ? 'bg-[#86EFAC]/20' : 'bg-zinc-800'
            }`}>
              <Icon className={`w-6 h-6 ${isPast ? 'text-[#86EFAC]' : 'text-zinc-500'}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white text-lg">{milestone.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{milestone.description}</p>
                </div>
                
                <div className="flex-shrink-0">
                  {isPast ? (
                    <Badge className="bg-[#86EFAC]/20 text-[#86EFAC] border-[#86EFAC]/30 border">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : daysUntil <= 180 ? (
                    <Badge className="bg-[#86EFAC]/15 text-[#86EFAC]/70 border-[#86EFAC]/25 border">
                      <Clock className="w-3 h-3 mr-1" />
                      {daysUntil}d
                    </Badge>
                  ) : (
                    <Badge className="bg-zinc-800/60 text-zinc-500 border-zinc-700/50 border">
                      {daysUntil}d
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(milestone.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SystemProgressCard({ item, index }) {
  return (
    <motion.div
      key={item.system.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{item.system.name}</h3>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className="bg-[#86EFAC]/20 text-[#86EFAC] border-[#86EFAC]/30 border">
                {item.system.risk_classification?.replace('-', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm text-zinc-500">
                {item.completedTasks}/{item.totalTasks} tasks
              </span>
              {item.urgentTasks > 0 && (
                <Badge className="bg-[#86EFAC]/15 text-[#86EFAC]/70 border-[#86EFAC]/25 border">
                  <Zap className="w-3 h-3 mr-1" />
                  {item.urgentTasks} urgent
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#86EFAC]/80">{Math.round(item.progress)}%</div>
            <div className="text-xs text-zinc-600">Complete</div>
          </div>
        </div>

        <Progress value={item.progress} className="h-2 bg-zinc-800 mb-4" />

        <div className="flex gap-2">
          <Link to={`${createPageUrl("DocumentGenerator")}?system=${item.system.id}`} className="flex-1">
            <Button size="sm" className="w-full bg-[#86EFAC]/10 text-[#86EFAC]/80 border border-[#86EFAC]/30 hover:bg-[#86EFAC]/20 hover:text-[#86EFAC]">
              <FileText className="w-4 h-4 mr-2" />
              Generate Docs
            </Button>
          </Link>
          <Link to={`${createPageUrl("RiskAssessment")}?systemId=${item.system.id}`}>
            <Button size="sm" variant="outline" className="border-zinc-700/60 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200">
              <Target className="w-4 h-4 mr-1.5" />
              Assess
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function UrgentTaskCard({ task, index }) {
  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className={`relative bg-zinc-900/60 backdrop-blur-sm rounded-xl border p-5 ${
        task.daysRemaining < 0 
          ? 'border-[#86EFAC]/30' 
          : 'border-zinc-800/60'
      }`}>
        {task.daysRemaining < 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-[#86EFAC]/60 to-[#6EE7B7]/60" />
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {task.daysRemaining < 0 ? (
                <Badge className="bg-[#86EFAC]/20 text-[#86EFAC]/80 border-[#86EFAC]/30 border">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {Math.abs(task.daysRemaining)} DAYS OVERDUE
                </Badge>
              ) : (
                <Badge className="bg-[#86EFAC]/15 text-[#86EFAC]/70 border-[#86EFAC]/25 border">
                  <Clock className="w-3 h-3 mr-1" />
                  {task.daysRemaining} days left
                </Badge>
              )}
            </div>
            
            <h4 className="font-semibold text-white text-lg mb-1">
              {task.obligation.obligation_title}
            </h4>
            <p className="text-sm text-zinc-500">
              {task.system.name}
            </p>
          </div>

          <Link to={`${createPageUrl("DocumentGenerator")}?system=${task.system.id}`}>
            <Button size="sm" className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC]/80 border border-[#86EFAC]/30 hover:text-[#86EFAC]">
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Start
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function ComplianceRoadmap() {
  const [aiSystems, setAISystems] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState("roadmap");
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const loadRoadmapData = React.useCallback(async () => {
    try {
      const [systemsData, obligationsData] = await Promise.all([
        db.entities.AISystem.list(),
        db.entities.Obligation.list()
      ]);
      setAISystems(systemsData);
      setObligations(obligationsData);
    } catch (error) {
      console.error("Failed to load roadmap data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoadmapData();
  }, [loadRoadmapData]);

  const generateTasks = () => {
    const tasks = [];
    aiSystems.forEach(system => {
      if (system.risk_classification === 'unclassified') return;
      const applicableObligations = obligations.filter(obl => {
        if (obl.risk_category === 'all') return true;
        if (obl.risk_category === system.risk_classification) return true;
        return false;
      });
      applicableObligations.forEach(obl => {
        tasks.push({
          id: `${system.id}-${obl.id}`,
          system,
          obligation: obl,
          deadline: new Date(obl.deadline),
          status: system.compliance_status,
          daysRemaining: Math.ceil((new Date(obl.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        });
      });
    });
    return tasks.sort((a, b) => a.deadline - b.deadline);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const allTasks = generateTasks();
    const urgentTasks = allTasks.filter(t => (t.daysRemaining < 90 || t.daysRemaining < 0) && t.status !== 'compliant');
    const completedTasks = allTasks.filter(t => t.status === 'compliant').length;
    const overdueTasks = allTasks.filter(t => t.daysRemaining < 0).length;
    const progressPercent = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
    
    const systemProgress = aiSystems.map(system => {
      if (system.risk_classification === 'unclassified') return null;
      const systemTasks = allTasks.filter(t => t.system.id === system.id);
      const completed = systemTasks.filter(t => t.status === 'compliant').length;
      return {
        system,
        totalTasks: systemTasks.length,
        completedTasks: completed,
        progress: systemTasks.length > 0 ? (completed / systemTasks.length) * 100 : 0,
        urgentTasks: systemTasks.filter(t => t.daysRemaining < 90 && t.status !== 'compliant').length
      };
    }).filter(Boolean);

    return { allTasks, urgentTasks, completedTasks, overdueTasks, progressPercent, systemProgress };
  }, [aiSystems, obligations]);

  const generateAIPlan = async () => {
    setGeneratingPlan(true);
    try {
      const response = await db.integrations.Core.InvokeLLM({
        prompt: `Analyze these AI systems and provide compliance recommendations:\n${JSON.stringify(aiSystems.map(s => ({ name: s.name, classification: s.risk_classification, status: s.compliance_status })), null, 2)}\n\nUrgent tasks: ${stats.urgentTasks.length}\nOverdue: ${stats.overdueTasks}\n\nProvide:\n1. Top 3 immediate actions\n2. Quick wins\n3. Risk priorities\n4. 30-day plan`,
        response_json_schema: {
          type: "object",
          properties: {
            immediate_actions: { type: "array", items: { type: "string" } },
            quick_wins: { type: "array", items: { type: "string" } },
            risk_priorities: { type: "array", items: { type: "string" } },
            thirty_day_plan: { type: "string" }
          }
        }
      });
      setAiRecommendations(response);
      toast.success('AI action plan generated');
    } catch (error) {
      console.error("Failed to generate AI plan:", error);
      toast.error('Failed to generate plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="space-y-6">
          <Skeleton className="h-28 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#86EFAC]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-[#6EE7B7]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={Map}
          title="Compliance Roadmap"
          subtitle={`${stats.allTasks.length} tasks · ${stats.progressPercent}% complete`}
          color="sage"
          actions={
            <Button
              onClick={generateAIPlan}
              disabled={generatingPlan || aiSystems.length === 0}
              className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC] border border-[#86EFAC]/30"
            >
              {generatingPlan ? (
                <><div className="w-4 h-4 border-2 border-[#86EFAC] border-t-transparent rounded-full animate-spin mr-2" />Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />AI Action Plan</>
              )}
            </Button>
          }
        />

        {/* AI Recommendations Panel */}
        <AnimatePresence>
          {aiRecommendations && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 bg-gradient-to-br from-[#86EFAC]/5 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#86EFAC]/70" />
                    AI-Generated Action Plan
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setAiRecommendations(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    Dismiss
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-[#86EFAC] mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Immediate Actions
                    </h4>
                    <ul className="space-y-2">
                      {aiRecommendations.immediate_actions?.map((action, i) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[#86EFAC] flex-shrink-0 mt-0.5" />{action}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#6EE7B7] mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Quick Wins
                    </h4>
                    <ul className="space-y-2">
                      {aiRecommendations.quick_wins?.map((win, i) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[#6EE7B7] flex-shrink-0 mt-0.5" />{win}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {aiRecommendations.thirty_day_plan && (
                  <div className="mt-5 pt-5 border-t border-zinc-700/50">
                    <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> 30-Day Plan
                    </h4>
                    <p className="text-sm text-zinc-300">{aiRecommendations.thirty_day_plan}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Total Tasks</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.allTasks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#86EFAC]/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#86EFAC]/70" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Overdue</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.overdueTasks}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#86EFAC]/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#86EFAC]/70" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Urgent (90d)</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.urgentTasks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#86EFAC]/15 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#86EFAC]/60" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Completed</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.completedTasks}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#86EFAC]/15 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#86EFAC]/60" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Progress</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.progressPercent}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#86EFAC]/15 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#86EFAC]/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1 rounded-xl">
            <TabsTrigger value="roadmap" className="data-[state=active]:bg-[#86EFAC]/20 data-[state=active]:text-[#86EFAC] rounded-lg px-4">
              <Calendar className="w-4 h-4 mr-2" />Timeline
            </TabsTrigger>
            <TabsTrigger value="systems" className="data-[state=active]:bg-[#86EFAC]/20 data-[state=active]:text-[#86EFAC] rounded-lg px-4">
              <Target className="w-4 h-4 mr-2" />By System ({stats.systemProgress.length})
            </TabsTrigger>
            <TabsTrigger value="urgent" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 rounded-lg px-4">
              <Zap className="w-4 h-4 mr-2" />Urgent ({stats.urgentTasks.length})
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="roadmap" className="space-y-4 mt-6">
            {ENFORCEMENT_MILESTONES.map((milestone, idx) => (
              <MilestoneCard key={milestone.date} milestone={milestone} index={idx} />
            ))}
          </TabsContent>

          {/* By System Tab */}
          <TabsContent value="systems" className="mt-6">
            {stats.systemProgress.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#86EFAC]/20 to-[#6EE7B7]/20 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-10 h-10 text-[#86EFAC]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No Systems to Track</h3>
                <p className="text-zinc-500 mb-8">Register AI systems to track compliance progress</p>
                <Link to={createPageUrl("AISystemInventory")}>
                  <Button className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC]/80 border border-[#86EFAC]/30 hover:text-[#86EFAC] font-medium">
                    Register AI System
                  </Button>
                </Link>
                </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {stats.systemProgress.map((item, i) => (
                  <SystemProgressCard key={item.system.id} item={item} index={i} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Urgent Tab */}
          <TabsContent value="urgent" className="space-y-4 mt-6">
            {stats.urgentTasks.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-[#86EFAC]/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-400/70" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">All Clear!</h3>
                <p className="text-zinc-500">No urgent tasks - all upcoming deadlines are under control</p>
                </div>
            ) : (
              stats.urgentTasks.map((task, i) => (
                <UrgentTaskCard key={task.id} task={task} index={i} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
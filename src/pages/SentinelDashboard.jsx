import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, AlertTriangle, CheckCircle, Clock, Plus, 
  FileText, ArrowRight, Calendar, Zap, TrendingUp 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComplianceGauge } from "@/components/ui/ComplianceGauge";
import WorkflowStepper from "@/components/sentinel/WorkflowStepper";
import QuickActions from "@/components/sentinel/QuickActions";

export default function SentinelDashboard() {
  const [user, setUser] = useState(null);
  const [aiSystems, setAISystems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const userData = await db.auth.me();
        if (!isMounted) return;
        setUser(userData);

        // RLS handles data access - just list all systems
        const systems = await db.entities.AISystem.list({ limit: 100 }).catch(() => []);
        if (!isMounted) return;
        setAISystems(systems || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Memoize calculations to prevent unnecessary recalculations
  const { totalSystems, byClassification, byStatus, complianceScore } = useMemo(() => {
    const total = aiSystems.length;
    const classification = {
      prohibited: aiSystems.filter(s => s.risk_classification === 'prohibited').length,
      'high-risk': aiSystems.filter(s => s.risk_classification === 'high-risk').length,
      gpai: aiSystems.filter(s => s.risk_classification === 'gpai').length,
      'limited-risk': aiSystems.filter(s => s.risk_classification === 'limited-risk').length,
      'minimal-risk': aiSystems.filter(s => s.risk_classification === 'minimal-risk').length,
      unclassified: aiSystems.filter(s => s.risk_classification === 'unclassified').length,
    };
    const status = {
      'not-started': aiSystems.filter(s => s.compliance_status === 'not-started').length,
      'in-progress': aiSystems.filter(s => s.compliance_status === 'in-progress').length,
      compliant: aiSystems.filter(s => s.compliance_status === 'compliant').length,
      'non-compliant': aiSystems.filter(s => s.compliance_status === 'non-compliant').length,
    };
    const score = total > 0 ? Math.round((status.compliant / total) * 100) : 0;
    return { totalSystems: total, byClassification: classification, byStatus: status, complianceScore: score };
  }, [aiSystems]);

  const classificationColors = {
    prohibited: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/40',
    'high-risk': 'bg-[#86EFAC]/20 text-[#86EFAC]/80 border-[#86EFAC]/30',
    gpai: 'bg-[#86EFAC]/15 text-[#86EFAC]/70 border-[#86EFAC]/25',
    'limited-risk': 'bg-[#86EFAC]/15 text-[#86EFAC]/70 border-[#86EFAC]/25',
    'minimal-risk': 'bg-[#86EFAC]/10 text-[#86EFAC]/60 border-[#86EFAC]/20',
    unclassified: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/50',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-[#86EFAC]/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-[#6EE7B7]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <PageHeader
            icon={Shield}
            title="EU AI Act Compliance"
            subtitle="Manage and track compliance for all AI systems"
            color="sage"
            actions={
              <Link to={createPageUrl("AISystemInventory")}>
                <Button className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC] border border-[#86EFAC]/30 hover:border-[#86EFAC]/50">
                  <Plus className="w-4 h-4 mr-2" />
                  Register AI System
                </Button>
              </Link>
            }
          />

          {/* Compliance Score & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Compliance Gauge */}
            <div className="p-6 flex flex-col items-center justify-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <ComplianceGauge score={complianceScore} />
            </div>

            {/* Quick Stats */}
            <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Shield} label="AI Systems" value={totalSystems} color="sage" delay={0} />
              <StatCard icon={AlertTriangle} label="High-Risk" value={byClassification['high-risk']} color="sage" delay={0.1} />
              <StatCard icon={CheckCircle} label="Compliant" value={byStatus.compliant} color="sage" delay={0.2} />
              <StatCard icon={Clock} label="In Progress" value={byStatus['in-progress']} color="sage" delay={0.3} />
            </div>
          </div>

          {/* Workflow Stepper */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <WorkflowStepper systems={aiSystems} />
          </motion.div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <QuickActions systems={aiSystems} taskCount={byClassification['high-risk'] * 22} />
          </motion.div>

          {/* Classification Breakdown & Compliance Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#86EFAC]/70" />
                Risk Classification
              </h3>
              <div className="space-y-3">
                {Object.entries(byClassification).map(([classification, count], i) => (
                  <motion.div
                    key={classification}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30"
                  >
                    <Badge className={`${classificationColors[classification]} border`}>
                      {classification.replace('-', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-lg font-bold text-white">{count}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[#86EFAC]/70" />
                Compliance Status
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'not-started', label: 'Not Started', color: 'text-zinc-400' },
                  { key: 'in-progress', label: 'In Progress', color: 'text-yellow-400' },
                  { key: 'compliant', label: 'Compliant', color: 'text-[#86EFAC]' },
                  { key: 'non-compliant', label: 'Non-Compliant', color: 'text-red-400' },
                ].map((status, i) => (
                  <motion.div
                    key={status.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30"
                  >
                    <span className={`font-medium ${status.color}`}>{status.label}</span>
                    <span className="text-lg font-bold text-white">{byStatus[status.key]}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Systems */}
          {aiSystems.length > 0 && (
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent AI Systems</h3>
                <Link to={createPageUrl("AISystemInventory")} className="text-[#86EFAC]/80 text-sm hover:text-[#6EE7B7] flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {aiSystems.slice(0, 5).map((system, i) => (
                  <motion.div
                    key={system.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.05 }}
                  >
                    <Link
                      to={createPageUrl(`RiskAssessment?systemId=${system.id}`)}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-[#86EFAC]/30 transition-all group"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1 group-hover:text-[#86EFAC]/80 transition-colors">{system.name}</h4>
                        <p className="text-sm text-zinc-500 line-clamp-1">{system.purpose}</p>
                      </div>
                      <Badge className={`${classificationColors[system.risk_classification]} border ml-4`}>
                        {system.risk_classification?.replace('-', ' ').toUpperCase() || 'UNCLASSIFIED'}
                      </Badge>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {aiSystems.length === 0 && (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <Shield className="w-16 h-16 text-[#86EFAC]/70 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Welcome to SENTINEL</h3>
              <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                Track AI systems, assess risks, and generate compliance documentation for the EU AI Act.
              </p>
              <Link to={createPageUrl("AISystemInventory")}>
                <Button className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC]/80 border border-[#86EFAC]/30 hover:text-[#86EFAC]">
                  <Plus className="w-4 h-4 mr-2" />
                  Register Your First AI System
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
  );
}
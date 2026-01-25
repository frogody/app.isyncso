import React, { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Plus, Search, Cpu, AlertTriangle, CheckCircle, Clock, 
  MoreHorizontal, Trash2, ExternalLink, ArrowRight, Target, FileText,
  Edit, Eye, Zap, TrendingUp, Building2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { usePagination } from "@/components/hooks/usePagination";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

const AISystemModal = lazy(() => import("@/components/sentinel/AISystemModal"));

const CLASSIFICATION_CONFIG = {
  prohibited: { 
    color: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/40', 
    gradient: 'from-zinc-600/60 to-zinc-700/60',
    icon: AlertTriangle,
    label: 'Prohibited'
  },
  'high-risk': { 
    color: 'bg-[#86EFAC]/20 text-[#86EFAC]/80 border-[#86EFAC]/30', 
    gradient: 'from-[#86EFAC]/70 to-[#6EE7B7]/70',
    icon: AlertTriangle,
    label: 'High-Risk'
  },
  gpai: { 
    color: 'bg-[#86EFAC]/15 text-[#86EFAC]/70 border-[#86EFAC]/25', 
    gradient: 'from-[#86EFAC]/60 to-[#6EE7B7]/60',
    icon: Cpu,
    label: 'GPAI'
  },
  'limited-risk': { 
    color: 'bg-[#86EFAC]/15 text-[#86EFAC]/70 border-[#86EFAC]/25', 
    gradient: 'from-[#86EFAC]/50 to-[#6EE7B7]/50',
    icon: AlertTriangle,
    label: 'Limited Risk'
  },
  'minimal-risk': { 
    color: 'bg-[#86EFAC]/10 text-[#86EFAC]/60 border-[#86EFAC]/20', 
    gradient: 'from-[#86EFAC]/40 to-[#6EE7B7]/40',
    icon: CheckCircle,
    label: 'Minimal Risk'
  },
  unclassified: { 
    color: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/50', 
    gradient: 'from-zinc-600/50 to-zinc-700/50',
    icon: Clock,
    label: 'Unclassified'
  },
};

const STATUS_CONFIG = {
  'not-started': { color: 'text-zinc-500', bgColor: 'bg-zinc-700/40', label: 'Not Started', progress: 0 },
  'in-progress': { color: 'text-[#86EFAC]/70', bgColor: 'bg-[#86EFAC]/15', label: 'In Progress', progress: 50 },
  compliant: { color: 'text-[#86EFAC]/80', bgColor: 'bg-[#86EFAC]/20', label: 'Compliant', progress: 100 },
  'non-compliant': { color: 'text-zinc-400', bgColor: 'bg-zinc-700/40', label: 'Non-Compliant', progress: 25 },
};

function SystemCard({ system, onEdit, onDelete, onAssess, index }) {
  const config = CLASSIFICATION_CONFIG[system.risk_classification] || CLASSIFICATION_CONFIG.unclassified;
  const statusConfig = STATUS_CONFIG[system.compliance_status] || STATUS_CONFIG['not-started'];
  const Icon = config.icon;

  const daysRegistered = Math.floor((Date.now() - new Date(system.created_date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      className="group"
    >
      <div className="relative bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800/60 hover:border-[#86EFAC]/30 transition-all duration-200">
        {/* Top gradient bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${config.gradient} opacity-60`} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl ${config.color} border flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate group-hover:text-[#86EFAC]/80 transition-colors cursor-pointer" onClick={() => onEdit(system)}>
                  {system.name}
                </h3>
                <Badge className={`${config.color} border mt-1.5`}>
                  {config.label}
                </Badge>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem onClick={() => onEdit(system)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                  <Edit className="w-4 h-4 mr-2" /> Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAssess(system.id)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                  <Target className="w-4 h-4 mr-2" /> Risk Assessment
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={() => onDelete(system.id)} className="text-red-400 focus:text-red-300 focus:bg-red-950/30">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Purpose */}
          <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{system.purpose || 'No purpose defined'}</p>

          {/* Compliance Status */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
              <span className="text-zinc-500">{statusConfig.progress}%</span>
            </div>
            <Progress value={statusConfig.progress} className="h-1.5 bg-zinc-800" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysRegistered}d ago
              </span>
              {system.vendor && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {system.vendor}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-[#86EFAC]/80 hover:text-[#86EFAC] hover:bg-[#86EFAC]/10 h-7 text-xs"
              onClick={() => onAssess(system.id)}
            >
              Assess <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AISystemInventory() {
  const navigate = useNavigate();
  const [aiSystems, setAISystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassification, setFilterClassification] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null);

  const loadSystems = React.useCallback(async () => {
    try {
      const systems = await db.entities.AISystem.list('-created_date');
      setAISystems(systems);
    } catch (error) {
      console.error("Failed to load AI systems:", error);
      toast.error('Failed to load systems');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  const handleSave = async () => {
    await loadSystems();
    setShowModal(false);
    setEditingSystem(null);
    toast.success(editingSystem ? 'System updated' : 'System registered');
  };

  const handleEdit = (system) => {
    setEditingSystem(system);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this AI system?')) return;
    try {
      await db.entities.AISystem.delete(id);
      setAISystems(prev => prev.filter(s => s.id !== id));
      toast.success('System deleted');
    } catch (error) {
      toast.error('Failed to delete system');
    }
  };

  const handleAssess = (systemId) => {
    navigate(`${createPageUrl("RiskAssessment")}?systemId=${systemId}`);
  };

  const handleCreateAndAssess = (systemId) => {
    setShowModal(false);
    setEditingSystem(null);
    navigate(`${createPageUrl("RiskAssessment")}?systemId=${systemId}`);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = aiSystems.length;
    const highRisk = aiSystems.filter(s => s.risk_classification === 'high-risk').length;
    const compliant = aiSystems.filter(s => s.compliance_status === 'compliant').length;
    const inProgress = aiSystems.filter(s => s.compliance_status === 'in-progress').length;
    const unclassified = aiSystems.filter(s => s.risk_classification === 'unclassified').length;
    return { total, highRisk, compliant, inProgress, unclassified };
  }, [aiSystems]);

  const filteredSystems = aiSystems.filter(system => {
    const matchesSearch = system.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         system.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClassification = filterClassification === "all" || system.risk_classification === filterClassification;
    const matchesStatus = filterStatus === "all" || system.compliance_status === filterStatus;
    return matchesSearch && matchesClassification && matchesStatus;
  });

  const pagination = usePagination(filteredSystems, 12);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="space-y-4">
          <Skeleton className="h-28 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-52 bg-zinc-800 rounded-xl" />)}
          </div>
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

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <PageHeader
          icon={Cpu}
          title="AI System Inventory"
          subtitle={`${stats.total} systems registered · ${stats.highRisk} high-risk`}
          color="sage"
          actions={
            <Button
              onClick={() => { setEditingSystem(null); setShowModal(true); }}
              className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC] border border-[#86EFAC]/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Register AI System
            </Button>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Total Systems</p>
                <p className="text-lg font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#86EFAC]/20 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-[#86EFAC]/70" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">High-Risk</p>
                <p className="text-lg font-bold text-white mt-1">{stats.highRisk}</p>
                <p className="text-[10px] text-[#86EFAC]/80 mt-0.5">Requires documentation</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#86EFAC]/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-[#86EFAC]/70" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Compliant</p>
                <p className="text-lg font-bold text-white mt-1">{stats.compliant}</p>
                <p className="text-[10px] text-emerald-400/80 mt-0.5">{stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0}% of total</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#86EFAC]/15 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-[#86EFAC]/60" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Needs Assessment</p>
                <p className="text-lg font-bold text-white mt-1">{stats.unclassified}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-zinc-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-zinc-400/70" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <div className="flex-1 relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="search"
              placeholder="Search AI systems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900/60 border-zinc-800/60 text-white focus:border-[#86EFAC]/40"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterClassification} onValueChange={setFilterClassification}>
              <SelectTrigger className="w-44 bg-zinc-900/60 border-zinc-800/60 text-white">
                <Shield className="w-4 h-4 mr-2 text-zinc-400" />
                <SelectValue placeholder="Classification" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="prohibited">Prohibited</SelectItem>
                <SelectItem value="high-risk">High-Risk</SelectItem>
                <SelectItem value="gpai">GPAI</SelectItem>
                <SelectItem value="limited-risk">Limited Risk</SelectItem>
                <SelectItem value="minimal-risk">Minimal Risk</SelectItem>
                <SelectItem value="unclassified">Unclassified</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-zinc-900/60 border-zinc-800/60 text-white">
                <Zap className="w-4 h-4 mr-2 text-zinc-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="non-compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Systems Grid */}
        {filteredSystems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {pagination.items.map((system, i) => (
                  <SystemCard
                    key={system.id}
                    system={system}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAssess={handleAssess}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pagination.prevPage}
                  disabled={!pagination.hasPrev}
                  className="border-zinc-700 text-zinc-300"
                >
                  Previous
                </Button>
                <span className="text-sm text-zinc-400 px-4">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pagination.nextPage}
                  disabled={!pagination.hasNext}
                  className="border-zinc-700 text-zinc-300"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#86EFAC]/20 to-[#6EE7B7]/20 flex items-center justify-center mx-auto mb-4">
              <Cpu className="w-8 h-8 text-[#86EFAC]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {searchTerm || filterClassification !== "all" || filterStatus !== "all"
                ? "No Systems Found"
                : "Register Your First AI System"}
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
              {searchTerm || filterClassification !== "all" || filterStatus !== "all"
                ? "Try adjusting your search or filters to see more results."
                : "Start tracking AI systems for EU AI Act compliance. Register systems, assess risks, and generate documentation."}
            </p>
            {!searchTerm && filterClassification === "all" && filterStatus === "all" && (
              <Button
                onClick={() => { setEditingSystem(null); setShowModal(true); }}
                className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC]/80 border border-[#86EFAC]/30 hover:text-[#86EFAC] font-medium px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register AI System
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#86EFAC]" />
          </div>
        }>
          <AISystemModal
            system={editingSystem}
            onClose={() => { setShowModal(false); setEditingSystem(null); }}
            onSave={handleSave}
            onCreateAndAssess={handleCreateAndAssess}
          />
        </Suspense>
      )}
    </div>
  );
}
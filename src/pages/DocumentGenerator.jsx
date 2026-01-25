import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, Download, AlertTriangle, Sparkles, ArrowLeft, File, CheckCircle,
  Search, Cpu, ArrowRight, Clock, Shield, Plus, ChevronRight
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import TechnicalDocTemplate from "@/components/sentinel/TechnicalDocTemplate";
import DeclarationOfConformity from "@/components/sentinel/DeclarationOfConformity";

const DOC_TYPES = [
  {
    id: 'technical',
    title: 'Technical Documentation',
    subtitle: 'Annex IV',
    icon: FileText,
    color: '[#86EFAC]',
    description: 'Comprehensive technical documentation covering system design, development process, risk management, and monitoring.',
    features: ['System architecture', 'Training data', 'Risk assessment', 'Human oversight'],
    aiPowered: true
  },
  {
    id: 'declaration',
    title: 'EU Declaration of Conformity',
    subtitle: 'Article 47',
    icon: File,
    color: 'violet',
    description: 'Formal declaration that the AI system meets EU AI Act requirements and has undergone conformity assessment.',
    features: ['Legal compliance', 'CE marking ready', 'Market access', 'Official format'],
    aiPowered: false
  }
];

function SystemSelectionCard({ system, isSelected, onClick, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`relative bg-zinc-900/60 backdrop-blur-sm rounded-lg border p-3 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-[#86EFAC]/30'
          : 'border-zinc-800/60 hover:border-zinc-700/60'
      }`}
    >
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-[#86EFAC] to-[#6EE7B7]" />
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-[#86EFAC]/20 text-[#86EFAC] border-[#86EFAC]/30 border">
              HIGH-RISK
            </Badge>
            {isSelected && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border">
                <CheckCircle className="w-3 h-3 mr-1" />
                Selected
              </Badge>
            )}
          </div>
          <h3 className="text-base font-semibold text-white mb-1">{system.name}</h3>
          <p className="text-xs text-zinc-400 line-clamp-2">{system.purpose}</p>
        </div>

        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ml-4 ${
          isSelected ? 'bg-[#86EFAC]/20' : 'bg-zinc-800'
        }`}>
          <Cpu className={`w-4 h-4 ${isSelected ? 'text-[#86EFAC]' : 'text-zinc-500'}`} />
        </div>
      </div>
    </motion.div>
  );
}

function DocTypeCard({ docType, onClick, index }) {
  const Icon = docType.icon;
  const isGreen = docType.color === '[#86EFAC]';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      onClick={onClick}
      className="group relative bg-zinc-900/60 backdrop-blur-sm rounded-lg border border-zinc-800/60 hover:border-[#86EFAC]/30 p-4 cursor-pointer transition-all duration-200"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isGreen ? 'bg-[#86EFAC]/20' : 'bg-[#86EFAC]/15'
        }`}>
          <Icon className={`w-5 h-5 ${isGreen ? 'text-[#86EFAC]/80' : 'text-[#86EFAC]/70'}`} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white mb-1 group-hover:text-[#86EFAC]/80 transition-colors">
            {docType.title}
          </h3>
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 border">
            {docType.subtitle}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-3">{docType.description}</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {docType.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-600">
            <ChevronRight className={`w-3 h-3 ${isGreen ? 'text-[#86EFAC]' : 'text-violet-400'}`} />
            {feature}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
        {docType.aiPowered ? (
          <span className="flex items-center gap-1.5 text-xs text-[#86EFAC]/80">
            <Sparkles className="w-3 h-3" />
            AI-powered draft
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-zinc-600">
            <FileText className="w-3 h-3" />
            Template-based
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-[#86EFAC]/80 transition-colors" />
      </div>
    </motion.div>
  );
}

export default function DocumentGenerator() {
  const [searchParams] = useSearchParams();
  const [aiSystems, setAISystems] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [docType, setDocType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSystems = React.useCallback(async () => {
    try {
      const systems = await db.entities.AISystem.list('-created_date');
      const highRiskSystems = systems.filter(s => s.risk_classification === 'high-risk');
      setAISystems(highRiskSystems);

      // Auto-select system from URL param
      const systemId = searchParams.get('system');
      if (systemId) {
        const system = highRiskSystems.find(s => s.id === systemId);
        if (system) setSelectedSystem(system);
      }
    } catch (error) {
      console.error("Failed to load AI systems:", error);
      setError("Failed to load AI systems. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  const handleBack = () => {
    if (docType) {
      setDocType(null);
    } else {
      setSelectedSystem(null);
    }
  };

  const filteredSystems = useMemo(() => {
    if (!searchTerm) return aiSystems;
    const term = searchTerm.toLowerCase();
    return aiSystems.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.purpose?.toLowerCase().includes(term)
    );
  }, [aiSystems, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <GlassCard className="p-12 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error Loading Page</h3>
          <p className="text-zinc-400 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC] border border-[#86EFAC]/30">
            Retry
          </Button>
        </GlassCard>
      </div>
    );
  }

  // Step 3: Document Generation
  if (docType) {
    return (
      <div className="min-h-screen bg-black">
        {docType === 'technical' && <TechnicalDocTemplate system={selectedSystem} onBack={handleBack} />}
        {docType === 'declaration' && <DeclarationOfConformity system={selectedSystem} onBack={handleBack} />}
      </div>
    );
  }

  // Step 2: Document Type Selection
  if (selectedSystem) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#86EFAC]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-4">
          <Button onClick={handleBack} variant="outline" className="border-zinc-700/60 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change System
          </Button>

          {/* Selected System Card */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#86EFAC]/20 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-[#86EFAC]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">{selectedSystem.name}</h3>
                <p className="text-xs text-zinc-500">{selectedSystem.purpose}</p>
              </div>
              <Badge className="bg-[#86EFAC]/20 text-[#86EFAC]/80 border-[#86EFAC]/30 border">
                HIGH-RISK
              </Badge>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Select Document Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOC_TYPES.map((dt, i) => (
                <DocTypeCard 
                  key={dt.id} 
                  docType={dt} 
                  onClick={() => setDocType(dt.id)} 
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: System Selection
  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#86EFAC]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-[#6EE7B7]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          icon={FileText}
          title="Document Generator"
          subtitle={`${aiSystems.length} high-risk systems ready for documentation`}
          color="sage"
          actions={
            <Link to={createPageUrl("SentinelDashboard")}>
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">High-Risk Systems</p>
                <p className="text-lg font-bold text-white mt-1">{aiSystems.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#86EFAC]/20 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-[#86EFAC]/70" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Docs Required</p>
                <p className="text-lg font-bold text-white mt-1">{aiSystems.length * 2}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#86EFAC]/15 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#86EFAC]/60" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">AI-Powered</p>
                <p className="text-lg font-bold text-white mt-1">Yes</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#86EFAC]/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#86EFAC]/60" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Compliance</p>
                <p className="text-lg font-bold text-white mt-1">Annex IV</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#86EFAC]/15 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#86EFAC]/60" />
              </div>
            </div>
          </div>
        </div>

        {aiSystems.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#86EFAC]/20 to-[#6EE7B7]/20 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-[#86EFAC]/70" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No High-Risk AI Systems</h3>
            <p className="text-zinc-500 mb-8 max-w-md mx-auto">
              Only high-risk AI systems require Technical Documentation under the EU AI Act.
            </p>
            <Link to={createPageUrl("AISystemInventory")}>
              <Button className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC]/80 border border-[#86EFAC]/30 hover:text-[#86EFAC] font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Register AI System
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="search"
                placeholder="Search systems..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/60 border-zinc-800/60 text-white focus:border-[#86EFAC]/40"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Select AI System</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSystems.map((system, i) => (
                  <SystemSelectionCard
                    key={system.id}
                    system={system}
                    isSelected={selectedSystem?.id === system.id}
                    onClick={() => setSelectedSystem(system)}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
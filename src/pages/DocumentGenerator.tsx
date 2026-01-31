import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileText, AlertTriangle, Sparkles, ArrowLeft, File, CheckCircle,
  Search, Cpu, ArrowRight, Shield, Plus, ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDocumentGenerator } from '@/hooks/sentinel';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelBadge } from '@/components/sentinel/ui/SentinelBadge';
import { SentinelEmptyState } from '@/components/sentinel/ui/SentinelErrorBoundary';
import { StatCard } from '@/components/sentinel/ui/StatCard';
import TechnicalDocTemplate from '@/components/sentinel/TechnicalDocTemplate';
import DeclarationOfConformity from '@/components/sentinel/DeclarationOfConformity';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';
import type { AISystemRecord } from '@/tokens/sentinel';

const DOC_TYPES = [
  {
    id: 'technical' as const,
    title: 'Technical Documentation',
    subtitle: 'Annex IV',
    icon: FileText,
    description: 'Comprehensive technical documentation covering system design, development process, risk management, and monitoring.',
    features: ['System architecture', 'Training data', 'Risk assessment', 'Human oversight'],
    aiPowered: true,
  },
  {
    id: 'declaration' as const,
    title: 'EU Declaration of Conformity',
    subtitle: 'Article 47',
    icon: File,
    description: 'Formal declaration that the AI system meets EU AI Act requirements and has undergone conformity assessment.',
    features: ['Legal compliance', 'CE marking ready', 'Market access', 'Official format'],
    aiPowered: false,
  },
];

function SystemSelectionCard({
  system, isSelected, onClick, index,
}: {
  system: AISystemRecord; isSelected: boolean; onClick: () => void; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <SentinelCard variant="interactive" padding="sm" className={isSelected ? 'border-sky-500/30' : ''}>
        {isSelected && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r from-sky-500 to-sky-400" />
        )}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <SentinelBadge variant="highRisk">HIGH-RISK</SentinelBadge>
              {isSelected && <SentinelBadge variant="success">Selected</SentinelBadge>}
            </div>
            <h3 className="text-base font-semibold text-white mb-1">{system.name}</h3>
            <p className="text-xs text-zinc-400 line-clamp-2">{system.purpose}</p>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ml-4 ${isSelected ? 'bg-sky-500/20' : 'bg-zinc-800'}`}>
            <Cpu className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-zinc-500'}`} />
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

function DocTypeCard({ docType, onClick, index }: { docType: typeof DOC_TYPES[0]; onClick: () => void; index: number }) {
  const Icon = docType.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <SentinelCard variant="interactive" padding="md">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center">
            <Icon className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white mb-1 group-hover:text-sky-400 transition-colors">
              {docType.title}
            </h3>
            <SentinelBadge variant="neutral">{docType.subtitle}</SentinelBadge>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-3">{docType.description}</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {docType.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-600">
              <ChevronRight className="w-3 h-3 text-sky-400" />
              {feature}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
          {docType.aiPowered ? (
            <span className="flex items-center gap-1.5 text-xs text-sky-400">
              <Sparkles className="w-3 h-3" /> AI-powered draft
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-zinc-600">
              <FileText className="w-3 h-3" /> Template-based
            </span>
          )}
          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-sky-400 transition-colors" />
        </div>
      </SentinelCard>
    </motion.div>
  );
}

export default function DocumentGenerator() {
  const {
    systems, filtered, selectedSystem, docType, searchTerm,
    loading, error,
    setSelectedSystem, setDocType, setSearchTerm, goBack,
  } = useDocumentGenerator() as any;

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="space-y-4">
          <SentinelCardSkeleton className="h-20" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <SentinelCardSkeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <SentinelCard padding="lg" className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error Loading Page</h3>
          <p className="text-zinc-400 mb-6">{error}</p>
          <SentinelButton onClick={() => window.location.reload()}>Retry</SentinelButton>
        </SentinelCard>
      </div>
    );
  }

  // Step 3: Document Generation
  if (docType && selectedSystem) {
    return (
      <SentinelPageTransition className="min-h-screen bg-black">
        {docType === 'technical' && <TechnicalDocTemplate system={selectedSystem} onBack={goBack} />}
        {docType === 'declaration' && <DeclarationOfConformity system={selectedSystem as any} onBack={goBack} />}
      </SentinelPageTransition>
    );
  }

  // Step 2: Document Type Selection
  if (selectedSystem) {
    return (
      <SentinelPageTransition className="min-h-screen bg-black">
        <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-4">
          <SentinelButton variant="secondary" onClick={goBack} icon={<ArrowLeft className="w-4 h-4" />}>
            Change System
          </SentinelButton>

          <SentinelCard padding="md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">{selectedSystem.name}</h3>
                <p className="text-xs text-zinc-500">{selectedSystem.purpose}</p>
              </div>
              <SentinelBadge variant="highRisk">HIGH-RISK</SentinelBadge>
            </div>
          </SentinelCard>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Select Document Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOC_TYPES.map((dt, i) => (
                <DocTypeCard key={dt.id} docType={dt} onClick={() => setDocType(dt.id)} index={i} />
              ))}
            </div>
          </div>
        </div>
      </SentinelPageTransition>
    );
  }

  // Step 1: System Selection
  return (
    <SentinelPageTransition className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] bg-sky-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Document Generator</h1>
              <p className="text-xs text-zinc-500">{systems.length} high-risk systems ready for documentation</p>
            </div>
          </div>
          <Link to={createPageUrl('SentinelDashboard')}>
            <SentinelButton variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
              Dashboard
            </SentinelButton>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Cpu} label="High-Risk Systems" value={systems.length} delay={0} />
          <StatCard icon={FileText} label="Docs Required" value={systems.length * 2} delay={0.05} />
          <StatCard icon={Sparkles} label="AI-Powered" value="Yes" delay={0.1} />
          <StatCard icon={Shield} label="Compliance" value="Annex IV" delay={0.15} />
        </div>

        {systems.length === 0 ? (
          <SentinelEmptyState
            icon={FileText}
            title="No High-Risk AI Systems"
            message="Only high-risk AI systems require Technical Documentation under the EU AI Act."
            actionLabel="Register AI System"
            onAction={() => { window.location.href = createPageUrl('AISystemInventory'); }}
          />
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="search"
                placeholder="Search systems..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/60 border-zinc-800/60 text-white focus:border-sky-500/40"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Select AI System</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((system, i) => (
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
    </SentinelPageTransition>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileText, AlertTriangle, Sparkles, ArrowLeft, File, CheckCircle,
  Search, Cpu, ArrowRight, Shield, Plus, ChevronRight, Check,
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
import { ThemeToggle } from '@/components/sentinel/ThemeToggle';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

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

function StepIndicator({ step }: { step: number }) {
  const { st } = useTheme();
  return (
    <div className="flex items-center gap-2 mb-4">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={cn(
            'w-2 h-2 rounded-full transition-colors',
            step >= s ? 'bg-emerald-400' : st('bg-slate-300', 'bg-zinc-700')
          )}
        />
      ))}
      <span className={cn('text-xs ml-2', st('text-slate-500', 'text-zinc-400'))}>
        Step {step} of 3
      </span>
    </div>
  );
}

function SystemSelectionCard({
  system, isSelected, onClick, index,
}: {
  system: AISystemRecord; isSelected: boolean; onClick: () => void; index: number;
}) {
  const { st } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <SentinelCard
        variant="interactive"
        padding="sm"
        className={cn(
          isSelected
            ? cn(st('border-emerald-300', 'border-emerald-500/30'), st('bg-emerald-50/50', 'bg-emerald-500/5'))
            : '',
          isSelected && 'border-l-[3px] border-l-emerald-400'
        )}
      >
        {isSelected && (
          <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r', st('from-emerald-500 to-emerald-400', 'from-emerald-500 to-emerald-400'))} />
        )}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Radio indicator */}
            <div className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1',
              isSelected
                ? 'border-emerald-400 bg-emerald-400'
                : st('border-zinc-300', 'border-zinc-600')
            )}>
              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <SentinelBadge variant="highRisk">HIGH-RISK</SentinelBadge>
                {isSelected && <SentinelBadge variant="success">Selected</SentinelBadge>}
              </div>
              <h3 className={cn('text-base font-semibold mb-1', st('text-slate-900', 'text-white'))}>{system.name}</h3>
              <p className={cn('text-xs line-clamp-2', st('text-slate-400', 'text-zinc-400'))}>{system.purpose}</p>
            </div>
          </div>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ml-4', isSelected ? st('bg-emerald-100', 'bg-emerald-400/20') : st('bg-slate-100', 'bg-zinc-800'))}>
            <Cpu className={cn('w-4 h-4', isSelected ? st('text-emerald-500', 'text-emerald-400') : st('text-slate-400', 'text-zinc-500'))} />
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

function DocTypeCard({ docType, onClick, index }: { docType: typeof DOC_TYPES[0]; onClick: () => void; index: number }) {
  const { st } = useTheme();
  const Icon = docType.icon;
  const isTechnical = docType.id === 'technical';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <SentinelCard
        variant="interactive"
        padding="md"
        className={cn(
          isTechnical && st('shadow-md', 'shadow-lg shadow-emerald-500/5'),
          'relative overflow-hidden'
        )}
      >
        {/* Gradient top bar for Technical Documentation */}
        {isTechnical && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
        )}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/15'))}>
            <Icon className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
          </div>
          <div>
            <h3 className={cn('text-base font-semibold mb-1 transition-colors', st('text-slate-900 group-hover:text-emerald-500', 'text-white group-hover:text-emerald-400'))}>
              {docType.title}
            </h3>
            <SentinelBadge variant="neutral">{docType.subtitle}</SentinelBadge>
          </div>
        </div>
        <p className={cn('text-xs mb-3', st('text-slate-400', 'text-zinc-500'))}>{docType.description}</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {docType.features.map((feature, i) => (
            <div key={i} className={cn('flex items-center gap-2 text-[10px]', st('text-slate-500', 'text-zinc-600'))}>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              {feature}
            </div>
          ))}
        </div>
        <div className={cn('flex items-center justify-between pt-3 border-t', st('border-slate-200', 'border-zinc-800/50'))}>
          <div className="flex items-center gap-3">
            {docType.aiPowered ? (
              <motion.span
                className={cn('flex items-center gap-1.5 text-xs', st('text-emerald-500', 'text-emerald-400'))}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-3 h-3" /> AI-powered draft
              </motion.span>
            ) : (
              <span className={cn('flex items-center gap-1.5 text-xs', st('text-slate-400', 'text-zinc-600'))}>
                <FileText className="w-3 h-3" /> Template-based
              </span>
            )}
            <span className={cn('text-[10px]', st('text-slate-400', 'text-zinc-600'))}>~2 min</span>
          </div>
          <ArrowRight className={cn('w-4 h-4 transition-colors', st('text-slate-400 group-hover:text-emerald-500', 'text-zinc-600 group-hover:text-emerald-400'))} />
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

  const { st } = useTheme();

  // Derive current step
  const step = docType && selectedSystem ? 3 : selectedSystem ? 2 : 1;

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
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
      <div className={cn('min-h-screen flex items-center justify-center p-6', st('bg-slate-50', 'bg-black'))}>
        <SentinelCard padding="lg" className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className={cn('text-xl font-bold mb-2', st('text-slate-900', 'text-white'))}>Error Loading Page</h3>
          <p className={cn('mb-6', st('text-slate-500', 'text-zinc-400'))}>{error}</p>
          <SentinelButton onClick={() => window.location.reload()}>Retry</SentinelButton>
        </SentinelCard>
      </div>
    );
  }

  // Step 3: Document Generation
  if (docType && selectedSystem) {
    return (
      <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
        {docType === 'technical' && <TechnicalDocTemplate system={selectedSystem} onBack={goBack} />}
        {docType === 'declaration' && <DeclarationOfConformity system={selectedSystem as any} onBack={goBack} />}
      </SentinelPageTransition>
    );
  }

  // Step 2: Document Type Selection
  if (selectedSystem) {
    return (
      <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
        <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-4">
          <StepIndicator step={2} />

          <SentinelButton variant="secondary" onClick={goBack} icon={<ArrowLeft className="w-4 h-4" />}>
            Change System
          </SentinelButton>

          <SentinelCard padding="md">
            <div className="flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/20'))}>
                <Cpu className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
              </div>
              <div className="flex-1">
                <h3 className={cn('text-base font-semibold', st('text-slate-900', 'text-white'))}>{selectedSystem.name}</h3>
                <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>{selectedSystem.purpose}</p>
              </div>
              <SentinelBadge variant="highRisk">HIGH-RISK</SentinelBadge>
            </div>
          </SentinelCard>

          <div>
            <h2 className={cn('text-lg font-semibold mb-3', st('text-slate-900', 'text-white'))}>Select Document Type</h2>
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
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        <StepIndicator step={1} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-[20px] flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
              <FileText className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>Document Generator</h1>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>{systems.length} high-risk systems ready for documentation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to={createPageUrl('SentinelDashboard')}>
              <SentinelButton variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                Dashboard
              </SentinelButton>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Cpu} label="High-Risk Systems" value={systems.length} delay={0} accentColor="orange" />
          <StatCard icon={FileText} label="Docs Required" value={systems.length * 2} delay={0.05} accentColor="emerald" />
          <StatCard icon={Sparkles} label="AI-Powered" value="Yes" delay={0.1} accentColor="purple" />
          <StatCard icon={Shield} label="Compliance" value="Annex IV" delay={0.15} accentColor="blue" />
        </div>

        {systems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative mb-6"
            >
              <div className={cn(
                'absolute inset-0 rounded-full blur-2xl opacity-30',
                'bg-[radial-gradient(circle,rgba(134,239,172,0.4)_0%,transparent_70%)]'
              )} style={{ width: '120px', height: '120px', top: '-10px', left: '-10px' }} />
              <div className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center relative',
                st('bg-slate-100', 'bg-zinc-900')
              )}>
                <FileText className={cn('w-10 h-10', st('text-slate-300', 'text-zinc-600'))} />
                <Shield className={cn('w-5 h-5 absolute bottom-2 right-2', st('text-emerald-400', 'text-emerald-500'))} />
              </div>
            </motion.div>
            <h3 className={cn('text-lg font-semibold mb-2', st('text-slate-900', 'text-white'))}>No High-Risk AI Systems</h3>
            <p className={cn('text-sm mb-6 text-center max-w-md', st('text-slate-500', 'text-zinc-400'))}>
              Only high-risk AI systems require Technical Documentation under the EU AI Act.
            </p>
            <SentinelButton onClick={() => { window.location.href = createPageUrl('AISystemInventory'); }}>
              Register AI System
            </SentinelButton>
          </div>
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="search"
                placeholder="Search systems..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={cn('pl-10', st('bg-white border-slate-300 text-slate-900 focus:border-emerald-500/40', 'bg-zinc-900/60 border-zinc-800/60 text-white focus:border-emerald-400/40'))}
              />
            </div>
            <div>
              <h2 className={cn('text-lg font-semibold mb-3', st('text-slate-900', 'text-white'))}>Select AI System</h2>
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

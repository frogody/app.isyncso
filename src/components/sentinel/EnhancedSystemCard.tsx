import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { db } from '@/api/supabaseClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Shield, ArrowRight, FileText, List, Edit, MoreVertical,
  AlertTriangle, CheckCircle, Clock, Trash2, Eye, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SentinelCard } from './ui/SentinelCard';
import { SentinelButton } from './ui/SentinelButton';
import RiskClassificationBadge from './RiskClassificationBadge';
import type { RiskClassification } from '@/tokens/sentinel';
import { useTheme } from '@/contexts/GlobalThemeContext';

interface Obligation {
  id: string;
  obligation_title: string;
  risk_category: string;
  priority: string;
  deadline: string;
}

interface AISystem {
  id: string;
  name: string;
  purpose: string;
  description?: string;
  risk_classification: RiskClassification;
  classification_reasoning?: string;
  compliance_status: string;
  assessment_answers?: Record<string, any>;
  ai_techniques?: string[];
  deployment_context?: string;
  data_inputs?: string;
  decision_impact?: string;
}

interface EnhancedSystemCardProps {
  system: AISystem;
  onEdit: (system: AISystem) => void;
}

export default function EnhancedSystemCard({ system, onEdit }: EnhancedSystemCardProps) {
  const { st } = useTheme();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loadingObligations, setLoadingObligations] = useState(true);

  const handleDelete = useCallback(async () => {
    if (confirm(`Are you sure you want to delete "${system.name}"? This action cannot be undone.`)) {
      try {
        await db.entities.AISystem.delete(system.id);
        window.location.reload();
      } catch (error) {
        console.error('Failed to delete system:', error);
        alert('Failed to delete system. Please try again.');
      }
    }
  }, [system.id, system.name]);

  const loadObligations = useCallback(async () => {
    try {
      const allObligations = await db.entities.Obligation.list();
      const applicable = allObligations.filter((obl: Obligation) => {
        if (obl.risk_category === 'all') return true;
        if (obl.risk_category === system.risk_classification) return true;
        if (system.risk_classification === 'gpai' && obl.risk_category === 'gpai-systemic') {
          return system.assessment_answers?.gpai?.systemic_risk === true;
        }
        return false;
      });
      setObligations(applicable);
    } catch (error) {
      console.error('Failed to load obligations:', error);
    } finally {
      setLoadingObligations(false);
    }
  }, [system]);

  useEffect(() => {
    if (system.risk_classification !== 'unclassified') {
      loadObligations();
    } else {
      setLoadingObligations(false);
    }
  }, [system, loadObligations]);

  const totalObligations = obligations.length;
  const completedObligations = Math.floor(totalObligations * 0.36);
  const progressPercent = totalObligations > 0 ? Math.round((completedObligations / totalObligations) * 100) : 0;

  const nextObligation = obligations
    .filter(obl => obl.priority === 'critical' || obl.priority === 'high')
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    })[0];

  const daysRemaining = nextObligation
    ? Math.ceil((new Date(nextObligation.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const actionBtnClass = cn(
    'bg-transparent border rounded-full text-xs h-8 px-3 transition-colors duration-200',
    st(
      'text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400',
      'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50'
    )
  );

  const dropdownMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={actionBtnClass}>
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn(st('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700'))}>
        <DropdownMenuItem onClick={() => onEdit(system)} className={cn(st('text-slate-700 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800'), 'cursor-pointer')}>
          <Eye className="w-4 h-4 mr-2" /> View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {}} className={cn(st('text-slate-700 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800'), 'cursor-pointer')}>
          <Copy className="w-4 h-4 mr-2" /> Duplicate System
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-zinc-800 cursor-pointer">
          <Trash2 className="w-4 h-4 mr-2" /> Delete System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const sectionBorder = cn('border-t pt-4', st('border-slate-200', 'border-zinc-800/60'));

  // ── Unclassified ──
  if (system.risk_classification === 'unclassified') {
    return (
      <SentinelCard padding="md">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className={cn('text-lg font-bold mb-1 truncate', st('text-slate-900', 'text-white'))}>{system.name}</h3>
            <p className={cn('text-sm line-clamp-2', st('text-slate-500', 'text-zinc-400'))}>{system.purpose}</p>
          </div>
          <RiskClassificationBadge classification="unclassified" showHelp={false} size="sm" />
        </div>
        <div className={cn(sectionBorder, 'pb-4 mb-4')}>
          <div className={cn('flex items-center gap-3', st('text-emerald-600', 'text-emerald-400'))}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-sm">Classification required</div>
              <div className={cn('text-xs', st('text-slate-500', 'text-zinc-500'))}>Run the assessment wizard to determine obligations</div>
            </div>
          </div>
        </div>
        <div className={cn(sectionBorder, 'flex items-center gap-2')}>
          <Link to={createPageUrl(`RiskAssessment?systemId=${system.id}`)} className="flex-1">
            <SentinelButton size="sm" className="w-full">Start Assessment</SentinelButton>
          </Link>
          <button onClick={() => onEdit(system)} className={actionBtnClass}><Edit className="w-4 h-4" /></button>
          {dropdownMenu}
        </div>
      </SentinelCard>
    );
  }

  // ── Prohibited ──
  if (system.risk_classification === 'prohibited') {
    return (
      <SentinelCard padding="md" className="border-red-500/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className={cn('text-lg font-bold mb-1 truncate', st('text-slate-900', 'text-white'))}>{system.name}</h3>
              <p className={cn('text-sm line-clamp-2', st('text-slate-500', 'text-zinc-400'))}>{system.purpose}</p>
            </div>
            <RiskClassificationBadge classification="prohibited" showHelp={false} size="sm" />
          </div>
          <div className={cn(sectionBorder, 'pb-4 mb-4')}>
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-sm">Review Required — Deployment may be banned</div>
                <div className={cn('text-xs', st('text-slate-500', 'text-zinc-500'))}>This system falls under EU AI Act prohibited practices</div>
              </div>
            </div>
          </div>
          <div className={cn(sectionBorder, 'flex items-center gap-2')}>
            <SentinelButton variant="danger" size="sm" className="flex-1">
              <List className="w-4 h-4 mr-1" /> View Restrictions
            </SentinelButton>
            <button onClick={() => onEdit(system)} className={actionBtnClass}><Edit className="w-4 h-4" /></button>
            {dropdownMenu}
          </div>
        </div>
      </SentinelCard>
    );
  }

  // ── Minimal Risk ──
  if (system.risk_classification === 'minimal-risk') {
    return (
      <SentinelCard padding="md">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className={cn('text-lg font-bold mb-1 truncate', st('text-slate-900', 'text-white'))}>{system.name}</h3>
            <p className={cn('text-sm line-clamp-2', st('text-slate-500', 'text-zinc-400'))}>{system.purpose}</p>
          </div>
          <RiskClassificationBadge classification="minimal-risk" showHelp={false} size="sm" />
        </div>
        <div className={cn(sectionBorder, 'pb-4 mb-4')}>
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-sm">Minimal requirements</div>
              <div className={cn('text-xs', st('text-slate-500', 'text-zinc-500'))}>No specific AI Act obligations</div>
            </div>
          </div>
        </div>
        <div className={cn(sectionBorder, 'flex items-center gap-2')}>
          <SentinelButton variant="secondary" size="sm" className="flex-1">View Details</SentinelButton>
          <button onClick={() => onEdit(system)} className={actionBtnClass}><Edit className="w-4 h-4" /></button>
          {dropdownMenu}
        </div>
      </SentinelCard>
    );
  }

  // ── High-Risk / GPAI / Limited-Risk (full-featured) ──
  return (
    <SentinelCard padding="md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className={cn('text-lg font-bold mb-1 truncate', st('text-slate-900', 'text-white'))}>{system.name}</h3>
          <p className={cn('text-sm line-clamp-1', st('text-slate-500', 'text-zinc-400'))}>
            {system.classification_reasoning || system.purpose}
          </p>
        </div>
        <RiskClassificationBadge classification={system.risk_classification} showHelp={false} size="sm" />
      </div>

      {/* Progress */}
      {!loadingObligations && totalObligations > 0 && (
        <div className={cn(sectionBorder, 'pb-4 mb-4')}>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className={cn(st('text-slate-500', 'text-zinc-400'))}>Compliance Progress</span>
            <span className={cn(st('text-emerald-600', 'text-emerald-400'))}>
              {completedObligations}/{totalObligations} obligations · {progressPercent}%
            </span>
          </div>
          <div className={cn('w-full rounded-full h-2', st('bg-slate-200', 'bg-zinc-800'))}>
            <motion.div
              className="bg-emerald-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Next Action */}
      {nextObligation && (
        <div className={cn(sectionBorder, 'pb-4 mb-4')}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', st('text-emerald-600', 'text-emerald-400'))} />
            <div className="flex-1 min-w-0">
              <div className={cn('text-sm font-semibold mb-1', st('text-slate-900', 'text-white'))}>
                Next: {nextObligation.obligation_title}
              </div>
              <div className={cn('flex items-center gap-2 text-xs', st('text-slate-500', 'text-zinc-400'))}>
                <Clock className="w-3 h-3" />
                <span>
                  Due: {new Date(nextObligation.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                {daysRemaining !== null && (
                  <>
                    <span>·</span>
                    <span className={daysRemaining < 180 ? cn(st('text-emerald-600 font-semibold', 'text-emerald-400 font-semibold')) : ''}>
                      {daysRemaining} days remaining
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={cn(sectionBorder, 'flex items-center gap-2')}>
        <Link to={createPageUrl('ComplianceRoadmap')} className="flex-1">
          <SentinelButton variant="secondary" size="sm" className="w-full">
            <List className="w-4 h-4 mr-1" /> View Obligations
          </SentinelButton>
        </Link>
        {(system.risk_classification === 'high-risk' || system.risk_classification === 'gpai') && (
          <Link to={createPageUrl('DocumentGenerator')}>
            <button className={actionBtnClass}><FileText className="w-4 h-4" /></button>
          </Link>
        )}
        <button onClick={() => onEdit(system)} className={actionBtnClass}><Edit className="w-4 h-4" /></button>
        {dropdownMenu}
      </div>
    </SentinelCard>
  );
}

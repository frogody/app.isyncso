import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useEnrichmentProgress } from '@/hooks/useEnrichmentProgress';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Linkedin,
  Building2,
  Brain,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const STAGE_CONFIG = {
  pending: { label: 'Queued', icon: Loader2, color: 'text-zinc-400' },
  linkedin: { label: 'LinkedIn Enrichment', icon: Linkedin, color: 'text-blue-400' },
  company: { label: 'Company Intelligence', icon: Building2, color: 'text-amber-400' },
  candidate: { label: 'AI Analysis', icon: Brain, color: 'text-purple-400' },
  completed: { label: 'Complete', icon: CheckCircle2, color: 'text-green-400' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'text-red-400' },
};

function EnrichmentProgressBarInner({ organizationId, onDismiss }) {
  const [queueItems, setQueueItems] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const fetchQueueStatus = useCallback(async () => {
    if (!organizationId) return;
    const { data, error } = await supabase
      .from('sync_intel_queue')
      .select('id, candidate_id, status, current_stage, error_message, created_at, candidates(name, first_name, last_name)')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'processing', 'completed', 'failed'])
      .order('created_at', { ascending: true })
      .limit(200);

    if (!error && data) {
      setQueueItems(data);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchQueueStatus();

    const channel = supabase
      .channel(`enrichment-progress-${organizationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_intel_queue',
        filter: `organization_id=eq.${organizationId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setQueueItems(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setQueueItems(prev =>
            prev.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item)
          );
        } else if (payload.eventType === 'DELETE') {
          setQueueItems(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchQueueStatus]);

  const total = queueItems.length;
  const completed = queueItems.filter(i => i.status === 'completed').length;
  const failed = queueItems.filter(i => i.status === 'failed').length;
  const processing = queueItems.filter(i => i.status === 'processing').length;
  const pending = queueItems.filter(i => i.status === 'pending').length;
  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const isComplete = pending === 0 && processing === 0;

  const currentItem = queueItems.find(i => i.status === 'processing');
  const currentStage = currentItem?.current_stage || 'pending';
  const stageConfig = STAGE_CONFIG[currentStage] || STAGE_CONFIG.pending;
  const StageIcon = stageConfig.icon;

  const candidateName = currentItem?.candidates
    ? (currentItem.candidates.name || `${currentItem.candidates.first_name || ''} ${currentItem.candidates.last_name || ''}`.trim())
    : null;

  if (!isVisible || total === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden w-80">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 border-b border-zinc-700">
            <div className="flex items-center gap-2">
              {isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              )}
              <span className="font-medium text-sm text-zinc-200">
                {isComplete ? 'Enrichment Complete' : 'Enriching Candidates'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </Button>
              {isComplete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200"
                  onClick={() => { setIsVisible(false); onDismiss?.(); }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="p-3">
            <Progress value={progress} className="h-1.5 mb-2 bg-zinc-800" />
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{completed} of {total} complete</span>
              {failed > 0 && <span className="text-red-400">{failed} failed</span>}
            </div>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                {/* Current activity */}
                {currentItem && (
                  <div className="px-3 pb-2 border-t border-zinc-800 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <StageIcon className={cn('w-4 h-4 animate-pulse', stageConfig.color)} />
                      <span className="text-zinc-300">{stageConfig.label}</span>
                    </div>
                    {candidateName && (
                      <p className="text-xs text-zinc-500 ml-6 truncate">
                        {candidateName}
                      </p>
                    )}
                  </div>
                )}

                {/* Stage pipeline indicator */}
                {!isComplete && (
                  <div className="px-3 pb-3 pt-1 border-t border-zinc-800">
                    <div className="flex items-center justify-between gap-1">
                      {['linkedin', 'company', 'candidate', 'completed'].map((stage, idx) => {
                        const cfg = STAGE_CONFIG[stage];
                        const Icon = cfg.icon;
                        const isActive = currentStage === stage;
                        const isDone = stage === 'completed'
                          ? false
                          : ['linkedin', 'company', 'candidate'].indexOf(stage) < ['linkedin', 'company', 'candidate'].indexOf(currentStage);
                        return (
                          <div key={stage} className="flex items-center">
                            <div className={cn(
                              'flex flex-col items-center gap-0.5 px-2 py-1 rounded',
                              isActive && 'bg-zinc-800'
                            )}>
                              <Icon className={cn(
                                'w-3.5 h-3.5',
                                isActive ? cfg.color : isDone ? 'text-green-500' : 'text-zinc-600'
                              )} />
                              <span className={cn(
                                'text-[10px]',
                                isActive ? 'text-zinc-300' : 'text-zinc-600'
                              )}>
                                {cfg.label.split(' ')[0]}
                              </span>
                            </div>
                            {idx < 3 && (
                              <div className={cn(
                                'w-3 h-px',
                                isDone ? 'bg-green-500/50' : 'bg-zinc-700'
                              )} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {pending > 0 && (
                      <p className="text-[10px] text-zinc-600 text-center mt-1">
                        {pending} queued &middot; {processing} active
                      </p>
                    )}
                  </div>
                )}

                {/* Completion message */}
                {isComplete && (
                  <div className="px-3 pb-3 border-t border-zinc-800 pt-2">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>All {completed} candidate{completed !== 1 ? 's' : ''} enriched!</span>
                    </div>
                    {failed > 0 && (
                      <p className="text-xs text-zinc-500 ml-6 mt-1">
                        {failed} failed — retry from candidate details
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Self-contained wrapper that manages its own visibility and user context
export default function EnrichmentProgressBar() {
  const { user } = useUser();
  const organizationId = user?.organization_id;
  const { showProgress, dismissProgress } = useEnrichmentProgress(organizationId);

  if (!showProgress || !organizationId) return null;

  return (
    <EnrichmentProgressBarInner
      organizationId={organizationId}
      onDismiss={dismissProgress}
    />
  );
}

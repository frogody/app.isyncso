import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SentinelCard } from './ui/SentinelCard';
import type { AISystemRecord } from '@/tokens/sentinel';
import { useTheme } from '@/contexts/GlobalThemeContext';

interface QuickActionsProps {
  systems?: AISystemRecord[];
  taskCount?: number;
}

interface QuickAction {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  highlight: boolean;
}

export default function QuickActions({ systems = [], taskCount = 0 }: QuickActionsProps) {
  const highRiskCount = systems.filter(s => s.risk_classification === 'high-risk').length;
  const urgentTasksCount = Math.min(taskCount, 3);

  const actions: QuickAction[] = [
    {
      id: 1,
      title: 'Register New System',
      subtitle: 'Add AI system to inventory',
      icon: Plus,
      path: createPageUrl('AISystemInventory'),
      highlight: systems.length === 0,
    },
    {
      id: 2,
      title: 'View Roadmap',
      subtitle: taskCount > 0 ? `${taskCount} tasks · ${urgentTasksCount} due soon` : 'No tasks yet',
      icon: Calendar,
      path: createPageUrl('ComplianceRoadmap'),
      highlight: taskCount > 0 && urgentTasksCount > 0,
    },
    {
      id: 3,
      title: 'Generate Documents',
      subtitle: highRiskCount > 0 ? 'Select system to start' : 'Requires high-risk system',
      icon: FileText,
      path: createPageUrl('DocumentGenerator'),
      highlight: false,
    },
  ];

  const { st } = useTheme();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map((action, idx) => {
        const Icon = action.icon;

        return (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <Link to={action.path}>
              <SentinelCard
                variant="interactive"
                padding="md"
                className={action.highlight ? st('ring-1 ring-emerald-500/40 ring-offset-2 ring-offset-white', 'ring-1 ring-emerald-500/40 ring-offset-2 ring-offset-black') : ''}
              >
                <div className="flex items-start gap-4 relative">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border', st('bg-emerald-100 border-emerald-200', 'bg-emerald-500/10 border-emerald-500/20'))}>
                    <Icon className={cn('w-6 h-6', st('text-emerald-500', 'text-emerald-400'))} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn('text-base font-bold mb-1', st('text-slate-900', 'text-white'))}>{action.title}</h3>
                    <p className={cn('text-sm', st('text-slate-500', 'text-zinc-400'))}>{action.subtitle}</p>
                  </div>

                  {action.highlight && (
                    <div className="absolute -top-3 -right-3">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center animate-pulse', st('bg-emerald-500', 'bg-emerald-500'))}>
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </SentinelCard>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

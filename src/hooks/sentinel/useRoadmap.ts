import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/api/supabaseClient';
import type { AISystemRecord } from '@/tokens/sentinel';

interface Obligation {
  id: string;
  obligation_title: string;
  description?: string;
  risk_category: string;
  deadline: string;
  article_reference?: string;
}

interface RoadmapTask {
  id: string;
  system: AISystemRecord;
  obligation: Obligation;
  deadline: Date;
  status: string;
  daysRemaining: number;
}

interface SystemProgress {
  system: AISystemRecord;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  urgentTasks: number;
}

interface RoadmapStats {
  allTasks: RoadmapTask[];
  urgentTasks: RoadmapTask[];
  completedCount: number;
  overdueCount: number;
  progressPercent: number;
  systemProgress: SystemProgress[];
}

interface UseRoadmapReturn {
  systems: AISystemRecord[];
  obligations: Obligation[];
  stats: RoadmapStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches AI systems + obligations and computes roadmap tasks/stats.
 */
export function useRoadmap(): UseRoadmapReturn {
  const [systems, setSystems] = useState<AISystemRecord[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [systemsData, obligationsData] = await Promise.all([
        db.entities.AISystem.list(),
        db.entities.Obligation.list(),
      ]);
      setSystems((systemsData || []) as AISystemRecord[]);
      setObligations((obligationsData || []) as Obligation[]);
    } catch (err: any) {
      console.error('Failed to load roadmap data:', err);
      setError(err?.message || 'Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo((): RoadmapStats => {
    const now = new Date();
    const allTasks: RoadmapTask[] = [];

    for (const system of systems) {
      if (system.risk_classification === 'unclassified') continue;

      const applicable = obligations.filter(
        obl => obl.risk_category === 'all' || obl.risk_category === system.risk_classification,
      );

      for (const obl of applicable) {
        const deadline = new Date(obl.deadline);
        allTasks.push({
          id: `${system.id}-${obl.id}`,
          system,
          obligation: obl,
          deadline,
          status: system.compliance_status || 'not-started',
          daysRemaining: Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    allTasks.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

    const urgentTasks = allTasks.filter(
      t => (t.daysRemaining < 90 || t.daysRemaining < 0) && t.status !== 'compliant',
    );
    const completedCount = allTasks.filter(t => t.status === 'compliant').length;
    const overdueCount = allTasks.filter(t => t.daysRemaining < 0).length;
    const progressPercent = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;

    const systemProgress: SystemProgress[] = systems
      .filter(s => s.risk_classification !== 'unclassified')
      .map(system => {
        const systemTasks = allTasks.filter(t => t.system.id === system.id);
        const completed = systemTasks.filter(t => t.status === 'compliant').length;
        return {
          system,
          totalTasks: systemTasks.length,
          completedTasks: completed,
          progress: systemTasks.length > 0 ? (completed / systemTasks.length) * 100 : 0,
          urgentTasks: systemTasks.filter(t => t.daysRemaining < 90 && t.status !== 'compliant').length,
        };
      });

    return { allTasks, urgentTasks, completedCount, overdueCount, progressPercent, systemProgress };
  }, [systems, obligations]);

  return { systems, obligations, stats, loading, error, refresh: loadData };
}

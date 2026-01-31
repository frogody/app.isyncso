import { useMemo } from 'react';
import type { AISystemRecord, RiskClassification, ComplianceStatus } from '@/tokens/sentinel';

interface ClassificationBreakdown {
  prohibited: number;
  'high-risk': number;
  gpai: number;
  'limited-risk': number;
  'minimal-risk': number;
  unclassified: number;
}

interface StatusBreakdown {
  'not-started': number;
  'in-progress': number;
  compliant: number;
  'non-compliant': number;
}

interface ComplianceMetrics {
  totalSystems: number;
  complianceScore: number;
  byClassification: ClassificationBreakdown;
  byStatus: StatusBreakdown;
  /** Systems requiring immediate attention (high-risk + non-compliant/not-started) */
  actionRequired: AISystemRecord[];
  /** Systems that are compliant */
  compliantSystems: AISystemRecord[];
  isEmpty: boolean;
}

/**
 * Derives compliance metrics from a list of AI systems.
 * Pure computation hook — no data fetching. Pair with useAISystems.
 */
export function useComplianceStatus(systems: AISystemRecord[]): ComplianceMetrics {
  return useMemo(() => {
    const total = systems.length;

    const byClassification: ClassificationBreakdown = {
      prohibited: 0,
      'high-risk': 0,
      gpai: 0,
      'limited-risk': 0,
      'minimal-risk': 0,
      unclassified: 0,
    };

    const byStatus: StatusBreakdown = {
      'not-started': 0,
      'in-progress': 0,
      compliant: 0,
      'non-compliant': 0,
    };

    const actionRequired: AISystemRecord[] = [];
    const compliantSystems: AISystemRecord[] = [];

    for (const s of systems) {
      const cls = s.risk_classification || 'unclassified';
      if (cls in byClassification) {
        byClassification[cls as keyof ClassificationBreakdown]++;
      }

      const status = s.compliance_status || 'not-started';
      if (status in byStatus) {
        byStatus[status as keyof StatusBreakdown]++;
      }

      if (status === 'compliant') {
        compliantSystems.push(s);
      }

      // High-risk or prohibited systems that aren't compliant need action
      if (
        (cls === 'high-risk' || cls === 'prohibited') &&
        status !== 'compliant'
      ) {
        actionRequired.push(s);
      }
    }

    const complianceScore = total > 0 ? Math.round((byStatus.compliant / total) * 100) : 0;

    return {
      totalSystems: total,
      complianceScore,
      byClassification,
      byStatus,
      actionRequired,
      compliantSystems,
      isEmpty: total === 0,
    };
  }, [systems]);
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/api/supabaseClient';
import type { AISystemRecord, RiskClassification, ComplianceStatus } from '@/tokens/sentinel';

interface UseAISystemsOptions {
  limit?: number;
  riskFilter?: RiskClassification | 'all';
  statusFilter?: ComplianceStatus | 'all';
  search?: string;
}

interface UseAISystemsReturn {
  systems: AISystemRecord[];
  loading: boolean;
  error: string | null;
  /** Filtered subset based on options */
  filtered: AISystemRecord[];
  /** Re-fetch from server */
  refresh: () => Promise<void>;
  /** Create a new AI system, returns the created record */
  create: (data: Partial<AISystemRecord>) => Promise<AISystemRecord>;
  /** Update an existing AI system by id */
  update: (id: string, data: Partial<AISystemRecord>) => Promise<void>;
  /** Delete an AI system by id */
  remove: (id: string) => Promise<void>;
}

export function useAISystems(options: UseAISystemsOptions = {}): UseAISystemsReturn {
  const { limit = 100, riskFilter = 'all', statusFilter = 'all', search = '' } = options;

  const [systems, setSystems] = useState<AISystemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSystems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await db.entities.AISystem.list({ limit });
      setSystems((data || []) as AISystemRecord[]);
    } catch (err: any) {
      console.error('Failed to load AI systems:', err);
      setError(err?.message || 'Failed to load AI systems');
      setSystems([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  const filtered = useMemo(() => {
    let result = systems;
    if (riskFilter !== 'all') {
      result = result.filter(s => s.risk_classification === riskFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(s => s.compliance_status === statusFilter);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        s =>
          s.name?.toLowerCase().includes(term) ||
          s.purpose?.toLowerCase().includes(term) ||
          s.provider_name?.toLowerCase().includes(term),
      );
    }
    return result;
  }, [systems, riskFilter, statusFilter, search]);

  const create = useCallback(async (data: Partial<AISystemRecord>): Promise<AISystemRecord> => {
    const user = await db.auth.me();
    let companyId = user.company_id;

    if (!companyId) {
      const domain = user.email?.split('@')[1];
      if (domain) {
        const companies = await db.entities.Company.filter({ domain });
        if (companies.length > 0) {
          companyId = companies[0].id;
        } else {
          const newCompany = await db.entities.Company.create({ name: domain, domain });
          companyId = newCompany.id;
        }
      }
    }

    const created = await db.entities.AISystem.create({
      ...data,
      company_id: companyId,
      created_by: user.id,
    });

    // Optimistic: append to local state
    setSystems(prev => [created as AISystemRecord, ...prev]);
    return created as AISystemRecord;
  }, []);

  const update = useCallback(async (id: string, data: Partial<AISystemRecord>) => {
    await db.entities.AISystem.update(id, data);
    // Optimistic update
    setSystems(prev => prev.map(s => (s.id === id ? { ...s, ...data } : s)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await db.entities.AISystem.delete(id);
    // Optimistic remove
    setSystems(prev => prev.filter(s => s.id !== id));
  }, []);

  return { systems, loading, error, filtered, refresh: loadSystems, create, update, remove };
}

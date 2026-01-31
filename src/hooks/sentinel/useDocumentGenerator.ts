import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import type { AISystemRecord } from '@/tokens/sentinel';

type DocType = 'technical' | 'declaration' | null;

interface UseDocumentGeneratorReturn {
  /** All high-risk systems eligible for documentation */
  systems: AISystemRecord[];
  /** Filtered by search term */
  filtered: AISystemRecord[];
  /** Currently selected system */
  selectedSystem: AISystemRecord | null;
  /** Currently selected document type */
  docType: DocType;
  searchTerm: string;
  loading: boolean;
  error: string | null;
  setSelectedSystem: (system: AISystemRecord | null) => void;
  setDocType: (type: DocType) => void;
  setSearchTerm: (term: string) => void;
  /** Navigate back one step (docType → system selection → system list) */
  goBack: () => void;
  refresh: () => Promise<void>;
}

/**
 * Manages the document generator workflow: system selection → doc type → generation.
 * Auto-selects system from URL ?system= parameter.
 */
export function useDocumentGenerator(): UseDocumentGeneratorReturn {
  const [searchParams] = useSearchParams();
  const [systems, setSystems] = useState<AISystemRecord[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<AISystemRecord | null>(null);
  const [docType, setDocType] = useState<DocType>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSystems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await db.entities.AISystem.list('-created_date');
      const highRisk = ((data || []) as AISystemRecord[]).filter(
        s => s.risk_classification === 'high-risk',
      );
      setSystems(highRisk);

      // Auto-select from URL param
      const systemId = searchParams.get('system');
      if (systemId) {
        const match = highRisk.find(s => s.id === systemId);
        if (match) setSelectedSystem(match);
      }
    } catch (err: any) {
      console.error('Failed to load AI systems:', err);
      setError(err?.message || 'Failed to load AI systems');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return systems;
    const term = searchTerm.toLowerCase();
    return systems.filter(
      s => s.name?.toLowerCase().includes(term) || s.purpose?.toLowerCase().includes(term),
    );
  }, [systems, searchTerm]);

  const goBack = useCallback(() => {
    if (docType) {
      setDocType(null);
    } else {
      setSelectedSystem(null);
    }
  }, [docType]);

  return {
    systems,
    filtered,
    selectedSystem,
    docType,
    searchTerm,
    loading,
    error,
    setSelectedSystem,
    setDocType,
    setSearchTerm,
    goBack,
    refresh: loadSystems,
  };
}

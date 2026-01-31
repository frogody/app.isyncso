import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useComplianceStatus } from '../useComplianceStatus';
import type { AISystemRecord } from '@/tokens/sentinel';

function makeSystem(overrides: Partial<AISystemRecord> = {}): AISystemRecord {
  return {
    id: crypto.randomUUID(),
    name: 'Test System',
    purpose: 'Testing',
    risk_classification: 'unclassified',
    compliance_status: 'not-started',
    created_date: new Date().toISOString(),
    ...overrides,
  } as AISystemRecord;
}

describe('useComplianceStatus', () => {
  it('returns empty metrics for no systems', () => {
    const { result } = renderHook(() => useComplianceStatus([]));
    expect(result.current.totalSystems).toBe(0);
    expect(result.current.complianceScore).toBe(0);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.actionRequired).toHaveLength(0);
    expect(result.current.compliantSystems).toHaveLength(0);
  });

  it('counts total systems', () => {
    const systems = [makeSystem(), makeSystem(), makeSystem()];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.totalSystems).toBe(3);
    expect(result.current.isEmpty).toBe(false);
  });

  it('calculates compliance score', () => {
    const systems = [
      makeSystem({ compliance_status: 'compliant' }),
      makeSystem({ compliance_status: 'compliant' }),
      makeSystem({ compliance_status: 'not-started' }),
      makeSystem({ compliance_status: 'in-progress' }),
    ];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.complianceScore).toBe(50); // 2/4 = 50%
  });

  it('breaks down by classification', () => {
    const systems = [
      makeSystem({ risk_classification: 'high-risk' }),
      makeSystem({ risk_classification: 'high-risk' }),
      makeSystem({ risk_classification: 'minimal-risk' }),
      makeSystem({ risk_classification: 'prohibited' }),
    ];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.byClassification['high-risk']).toBe(2);
    expect(result.current.byClassification['minimal-risk']).toBe(1);
    expect(result.current.byClassification.prohibited).toBe(1);
    expect(result.current.byClassification.gpai).toBe(0);
  });

  it('breaks down by status', () => {
    const systems = [
      makeSystem({ compliance_status: 'compliant' }),
      makeSystem({ compliance_status: 'in-progress' }),
      makeSystem({ compliance_status: 'non-compliant' }),
      makeSystem({ compliance_status: 'not-started' }),
      makeSystem({ compliance_status: 'not-started' }),
    ];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.byStatus.compliant).toBe(1);
    expect(result.current.byStatus['in-progress']).toBe(1);
    expect(result.current.byStatus['non-compliant']).toBe(1);
    expect(result.current.byStatus['not-started']).toBe(2);
  });

  it('identifies action required (high-risk non-compliant)', () => {
    const systems = [
      makeSystem({ risk_classification: 'high-risk', compliance_status: 'not-started' }),
      makeSystem({ risk_classification: 'high-risk', compliance_status: 'compliant' }),
      makeSystem({ risk_classification: 'minimal-risk', compliance_status: 'not-started' }),
      makeSystem({ risk_classification: 'prohibited', compliance_status: 'in-progress' }),
    ];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.actionRequired).toHaveLength(2); // high-risk not-started + prohibited in-progress
  });

  it('identifies compliant systems', () => {
    const systems = [
      makeSystem({ compliance_status: 'compliant' }),
      makeSystem({ compliance_status: 'not-started' }),
      makeSystem({ compliance_status: 'compliant' }),
    ];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.compliantSystems).toHaveLength(2);
  });

  it('handles missing classification gracefully (defaults to unclassified)', () => {
    const systems = [makeSystem({ risk_classification: undefined as any })];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.byClassification.unclassified).toBe(1);
  });

  it('handles missing status gracefully (defaults to not-started)', () => {
    const systems = [makeSystem({ compliance_status: undefined as any })];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.byStatus['not-started']).toBe(1);
  });

  it('returns 100% compliance when all are compliant', () => {
    const systems = [
      makeSystem({ compliance_status: 'compliant' }),
      makeSystem({ compliance_status: 'compliant' }),
    ];
    const { result } = renderHook(() => useComplianceStatus(systems));
    expect(result.current.complianceScore).toBe(100);
  });
});

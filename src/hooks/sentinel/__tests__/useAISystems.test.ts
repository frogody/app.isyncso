import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAISystems } from '../useAISystems';

// Mock the supabase client
const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFilter = vi.fn();
const mockMe = vi.fn();

vi.mock('@/api/supabaseClient', () => ({
  db: {
    entities: {
      AISystem: {
        list: (...args: any[]) => mockList(...args),
        create: (...args: any[]) => mockCreate(...args),
        update: (...args: any[]) => mockUpdate(...args),
        delete: (...args: any[]) => mockDelete(...args),
      },
      Company: {
        filter: (...args: any[]) => mockFilter(...args),
        create: (...args: any[]) => mockCreate(...args),
      },
    },
    auth: {
      me: () => mockMe(),
    },
  },
}));

const MOCK_SYSTEMS = [
  { id: '1', name: 'System A', purpose: 'Purpose A', risk_classification: 'high-risk', compliance_status: 'compliant', provider_name: 'Acme' },
  { id: '2', name: 'System B', purpose: 'Purpose B', risk_classification: 'minimal-risk', compliance_status: 'not-started', provider_name: 'Beta' },
  { id: '3', name: 'System C', purpose: 'Purpose C', risk_classification: 'high-risk', compliance_status: 'in-progress', provider_name: 'Acme' },
];

describe('useAISystems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(MOCK_SYSTEMS);
    mockMe.mockResolvedValue({ id: 'user-1', company_id: 'company-1', email: 'test@example.com' });
  });

  it('loads systems on mount', async () => {
    const { result } = renderHook(() => useAISystems());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.systems).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('handles load error', async () => {
    mockList.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAISystems());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.systems).toHaveLength(0);
  });

  it('filters by risk classification', async () => {
    const { result } = renderHook(() => useAISystems({ riskFilter: 'high-risk' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every(s => s.risk_classification === 'high-risk')).toBe(true);
  });

  it('filters by status', async () => {
    const { result } = renderHook(() => useAISystems({ statusFilter: 'compliant' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe('System A');
  });

  it('filters by search term', async () => {
    const { result } = renderHook(() => useAISystems({ search: 'System B' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('2');
  });

  it('search matches purpose field', async () => {
    const { result } = renderHook(() => useAISystems({ search: 'Purpose C' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('3');
  });

  it('search matches provider_name field', async () => {
    const { result } = renderHook(() => useAISystems({ search: 'Acme' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filtered).toHaveLength(2);
  });

  it('returns all systems when filter is "all"', async () => {
    const { result } = renderHook(() => useAISystems({ riskFilter: 'all', statusFilter: 'all' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filtered).toHaveLength(3);
  });

  it('optimistically removes a system', async () => {
    mockDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAISystems());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.systems).toHaveLength(3);

    await act(async () => {
      await result.current.remove('2');
    });

    expect(result.current.systems).toHaveLength(2);
    expect(result.current.systems.find(s => s.id === '2')).toBeUndefined();
  });

  it('optimistically updates a system', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAISystems());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update('1', { name: 'Updated Name' });
    });

    expect(result.current.systems.find(s => s.id === '1')?.name).toBe('Updated Name');
  });

  it('calls refresh to re-fetch', async () => {
    const { result } = renderHook(() => useAISystems());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockList).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('passes limit option to list call', async () => {
    renderHook(() => useAISystems({ limit: 50 }));
    await waitFor(() => expect(mockList).toHaveBeenCalledWith({ limit: 50 }));
  });
});

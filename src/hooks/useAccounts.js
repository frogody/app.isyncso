import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useAccountList() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const [acctData, typeData] = await Promise.all([
        db.entities.Account?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.AccountType?.list?.({ limit: 10 }).catch(() => []),
      ]);
      return {
        accounts: acctData || [],
        accountTypes: (typeData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
      };
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      payload.current_balance = payload.opening_balance || 0;
      const created = await db.entities.Account.create(payload);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created');
    },
    onError: (err) => {
      const msg = err?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('An account with this code already exists');
      } else {
        toast.error('Failed to create account');
      }
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      await db.entities.Account.update(id, updates);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account updated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update account'),
  });
}

export function useToggleAccountActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active, is_system }) => {
      if (is_system && is_active) {
        throw new Error('Cannot deactivate a system account');
      }
      await db.entities.Account.update(id, { is_active: !is_active });
      return { id, newActive: !is_active };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(data.newActive ? 'Account reactivated' : 'Account deactivated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update account'),
  });
}

export function useInitializeCOA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId) => {
      const { error } = await supabase.rpc('create_default_chart_of_accounts', {
        p_company_id: companyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Chart of Accounts initialized with default accounts');
    },
    onError: (err) => toast.error(err.message || 'Failed to initialize Chart of Accounts'),
  });
}

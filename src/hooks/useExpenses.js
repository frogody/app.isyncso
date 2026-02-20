import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useExpenseList() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const data = await db.entities.Expense?.list?.({ limit: 500 }).catch(() => []);
      return data || [];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseData) => {
      const newExpense = await db.entities.Expense.create(expenseData);
      // Post to GL
      if (newExpense?.id) {
        try {
          await supabase.rpc('post_expense', { p_expense_id: newExpense.id });
        } catch (glErr) { console.warn('GL posting (non-critical):', glErr); }
      }
      return newExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense added');
    },
    onError: (err) => toast.error(err.message || 'Failed to create expense'),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      await db.entities.Expense.update(id, updates);
      // Re-post to GL
      try {
        await supabase.rpc('post_expense', { p_expense_id: id });
      } catch (glErr) { console.warn('GL posting (non-critical):', glErr); }
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense updated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update expense'),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      await db.entities.Expense.delete(id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete expense'),
  });
}

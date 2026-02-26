import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useInvoiceList(companyId) {
  return useQuery({
    queryKey: ['invoices', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .eq('invoice_type', 'customer')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceData) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', data.company_id] });
      toast.success('Invoice created');
    },
    onError: (err) => toast.error(err.message || 'Failed to create invoice'),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId, ...updates }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, company_id: companyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', data.company_id] });
    },
    onError: (err) => toast.error(err.message || 'Failed to update invoice'),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId }) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      return { companyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', data.companyId] });
      toast.success('Invoice deleted');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete invoice'),
  });
}

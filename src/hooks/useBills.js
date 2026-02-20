import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

export function useBillList() {
  return useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const [billData, lineData, payData] = await Promise.all([
        db.entities.Bill?.list?.({ limit: 2000 }).catch(() => []),
        db.entities.BillLineItem?.list?.({ limit: 5000 }).catch(() => []),
        db.entities.BillPayment?.list?.({ limit: 2000 }).catch(() => []),
      ]);
      return {
        bills: billData || [],
        lineItems: lineData || [],
        payments: payData || [],
      };
    },
  });
}

export function useVendorList() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const data = await db.entities.Vendor?.list?.({ limit: 1000 }).catch(() => []);
      return (data || []).filter(v => v.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ billPayload, lines, andPost = false }) => {
      const created = await db.entities.Bill.create(billPayload);
      const billId = created.id;
      for (let i = 0; i < lines.length; i++) {
        await db.entities.BillLineItem.create({ ...lines[i], bill_id: billId, line_order: i + 1 });
      }
      if (andPost) {
        const { data } = await supabase.rpc('post_bill', { p_bill_id: billId });
        if (!data?.success) throw new Error(data?.error || 'Failed to post bill');
        return { ...created, journal_entry_number: data.journal_entry_number };
      }
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      if (data.journal_entry_number) {
        toast.success(`Bill posted — JE ${data.journal_entry_number} created`);
      } else {
        toast.success('Bill saved as draft');
      }
    },
    onError: (err) => toast.error(err.message || 'Failed to create bill'),
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, billPayload, lines, existingLineIds = [] }) => {
      await db.entities.Bill.update(id, billPayload);
      for (const lineId of existingLineIds) {
        await db.entities.BillLineItem.delete(lineId);
      }
      for (let i = 0; i < lines.length; i++) {
        await db.entities.BillLineItem.create({ ...lines[i], bill_id: id, line_order: i + 1 });
      }
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill updated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update bill'),
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lineIds = [] }) => {
      for (const lineId of lineIds) {
        await db.entities.BillLineItem.delete(lineId);
      }
      await db.entities.Bill.delete(id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill deleted');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete bill'),
  });
}

export function useRecordBillPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentData) => {
      const payment = await db.entities.BillPayment.create(paymentData);
      try {
        await supabase.rpc('record_bill_payment', { p_payment_id: payment.id });
      } catch { /* Payment recorded even if JE creation fails */ }
      return payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Payment recorded');
    },
    onError: (err) => toast.error(err.message || 'Failed to record payment'),
  });
}

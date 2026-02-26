-- ============================================================================
-- Phase 3B: AR Aging - Per-Customer Grouping
-- Applied: 2026-02-21
-- ============================================================================

-- Add contact_id column to invoices for CRM linkage (Phase 3A)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.prospects(id);

-- Fix get_aged_receivables to use correct column names
CREATE OR REPLACE FUNCTION public.get_aged_receivables(p_company_id UUID, p_as_of_date DATE)
RETURNS TABLE(
  invoice_id UUID, invoice_number TEXT, customer_name TEXT,
  issued_date TIMESTAMPTZ, due_date TIMESTAMPTZ, total_amount NUMERIC,
  current_amount NUMERIC, days_30 NUMERIC, days_60 NUMERIC, days_90 NUMERIC, over_90 NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS invoice_id,
    i.invoice_number,
    COALESCE(i.client_name, 'Customer')::TEXT AS customer_name,
    i.created_at AS issued_date,
    i.due_date::TIMESTAMPTZ AS due_date,
    i.total AS total_amount,
    CASE WHEN i.due_date >= p_as_of_date THEN i.total ELSE 0::DECIMAL(15,2) END AS current_amount,
    CASE WHEN i.due_date < p_as_of_date AND i.due_date >= (p_as_of_date - 30) THEN i.total ELSE 0::DECIMAL(15,2) END AS days_30,
    CASE WHEN i.due_date < (p_as_of_date - 30) AND i.due_date >= (p_as_of_date - 60) THEN i.total ELSE 0::DECIMAL(15,2) END AS days_60,
    CASE WHEN i.due_date < (p_as_of_date - 60) AND i.due_date >= (p_as_of_date - 90) THEN i.total ELSE 0::DECIMAL(15,2) END AS days_90,
    CASE WHEN i.due_date < (p_as_of_date - 90) THEN i.total ELSE 0::DECIMAL(15,2) END AS over_90
  FROM public.invoices i
  WHERE i.company_id = p_company_id
    AND i.status IN ('sent', 'overdue')
    AND COALESCE(i.invoice_type, 'customer') = 'customer'
    AND i.total > 0
  ORDER BY i.due_date ASC NULLS LAST;
END;
$$;

-- New: Grouped AR aging by customer name
CREATE OR REPLACE FUNCTION public.get_aged_receivables_grouped(p_company_id UUID, p_as_of_date DATE)
RETURNS TABLE(
  customer_name TEXT, invoice_count BIGINT, total_amount NUMERIC,
  current_amount NUMERIC, days_30 NUMERIC, days_60 NUMERIC, days_90 NUMERIC, over_90 NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(i.client_name, 'Unknown Customer')::TEXT AS customer_name,
    COUNT(*)::BIGINT AS invoice_count,
    SUM(i.total)::NUMERIC AS total_amount,
    SUM(CASE WHEN i.due_date >= p_as_of_date THEN i.total ELSE 0 END)::NUMERIC AS current_amount,
    SUM(CASE WHEN i.due_date < p_as_of_date AND i.due_date >= (p_as_of_date - 30) THEN i.total ELSE 0 END)::NUMERIC AS days_30,
    SUM(CASE WHEN i.due_date < (p_as_of_date - 30) AND i.due_date >= (p_as_of_date - 60) THEN i.total ELSE 0 END)::NUMERIC AS days_60,
    SUM(CASE WHEN i.due_date < (p_as_of_date - 60) AND i.due_date >= (p_as_of_date - 90) THEN i.total ELSE 0 END)::NUMERIC AS days_90,
    SUM(CASE WHEN i.due_date < (p_as_of_date - 90) THEN i.total ELSE 0 END)::NUMERIC AS over_90
  FROM public.invoices i
  WHERE i.company_id = p_company_id
    AND i.status IN ('sent', 'overdue')
    AND COALESCE(i.invoice_type, 'customer') = 'customer'
    AND i.total > 0
  GROUP BY i.client_name
  ORDER BY SUM(i.total) DESC;
END;
$$;

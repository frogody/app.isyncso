-- Link suppliers to CRM companies so the purchase modal can search both tables
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS crm_company_id UUID REFERENCES public.crm_companies(id);

CREATE INDEX IF NOT EXISTS idx_suppliers_crm_company
  ON public.suppliers(crm_company_id)
  WHERE crm_company_id IS NOT NULL;

-- Fix: reserved_for_customer_id should reference prospects (CRM contacts), not crm_companies
ALTER TABLE public.stock_purchases DROP CONSTRAINT IF EXISTS stock_purchases_reserved_for_customer_id_fkey;
ALTER TABLE public.stock_purchases
  ADD CONSTRAINT stock_purchases_reserved_for_customer_id_fkey
  FOREIGN KEY (reserved_for_customer_id) REFERENCES public.prospects(id);

-- Auto-sync crm_companies.company_type when a prospect's contact_type changes
-- E.g. when a prospect becomes a "customer", the linked crm_companies record updates too
CREATE OR REPLACE FUNCTION public.sync_crm_company_type_from_prospect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.crm_company_id IS NOT NULL
     AND NEW.contact_type IS DISTINCT FROM OLD.contact_type
     AND NEW.contact_type IN ('customer', 'supplier', 'partner', 'company') THEN
    UPDATE public.crm_companies
    SET company_type = NEW.contact_type
    WHERE id = NEW.crm_company_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_crm_company_type ON public.prospects;
CREATE TRIGGER trg_sync_crm_company_type
AFTER UPDATE OF contact_type ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.sync_crm_company_type_from_prospect();

-- Backfill: sync existing crm_companies types from their linked prospects
UPDATE public.crm_companies cc
SET company_type = p.contact_type
FROM public.prospects p
WHERE p.crm_company_id = cc.id
  AND p.contact_type IN ('customer', 'supplier', 'partner', 'company')
  AND cc.company_type IS DISTINCT FROM p.contact_type;

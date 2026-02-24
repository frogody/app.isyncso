-- Auto-create organization and set organization_id when a company is inserted
-- Ensures RLS policies (which filter by organization_id) always work

CREATE OR REPLACE FUNCTION public.auto_create_org_for_company()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    INSERT INTO public.organizations (id, name, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.name, 'Unnamed'), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    NEW.organization_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_company_org_id ON public.companies;
CREATE TRIGGER trg_set_company_org_id
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_org_for_company();

-- Backfill: create orgs for existing companies with NULL organization_id
INSERT INTO public.organizations (id, name, created_at, updated_at)
SELECT c.id, c.name, NOW(), NOW()
FROM public.companies c
WHERE c.organization_id IS NULL
  AND c.id NOT IN (SELECT id FROM public.organizations)
ON CONFLICT (id) DO NOTHING;

UPDATE public.companies SET organization_id = id WHERE organization_id IS NULL;

-- Backfill: set organization_id on users who have company_id but no org_id
UPDATE public.users SET organization_id = company_id
WHERE company_id IS NOT NULL AND organization_id IS NULL;

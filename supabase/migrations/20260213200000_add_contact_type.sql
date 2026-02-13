-- Add 'contact' and 'company' to contact_type CHECK constraint
-- 'contact' = generic unsorted contacts that can be categorized later
-- 'company' = company/organization records not tied to a specific person

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_contact_type_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_contact_type_check
  CHECK (contact_type IN ('lead', 'prospect', 'customer', 'partner', 'candidate', 'target', 'client', 'recruitment_client', 'contact', 'company'));

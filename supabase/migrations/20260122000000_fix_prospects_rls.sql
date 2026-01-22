-- ============================================================================
-- Fix Prospects RLS Security Hole
-- The prospects table currently allows ALL authenticated users to access ALL data
-- This migration enforces proper organization-level isolation
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated access" ON public.prospects;
DROP POLICY IF EXISTS "authenticated_access" ON public.prospects;
DROP POLICY IF EXISTS "Users can view prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can insert prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can update prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can delete prospects" ON public.prospects;

-- Create proper organization-isolated policies using auth_company_id() wrapper
-- (auth_company_id() was created in the RLS performance optimization migration)

-- SELECT: Users can only view prospects in their organization
CREATE POLICY "prospects_select_org" ON public.prospects
FOR SELECT TO authenticated
USING (organization_id = auth_company_id());

-- INSERT: Users can only create prospects in their organization
CREATE POLICY "prospects_insert_org" ON public.prospects
FOR INSERT TO authenticated
WITH CHECK (organization_id = auth_company_id());

-- UPDATE: Users can only update prospects in their organization
CREATE POLICY "prospects_update_org" ON public.prospects
FOR UPDATE TO authenticated
USING (organization_id = auth_company_id())
WITH CHECK (organization_id = auth_company_id());

-- DELETE: Users can only delete prospects in their organization
CREATE POLICY "prospects_delete_org" ON public.prospects
FOR DELETE TO authenticated
USING (organization_id = auth_company_id());

-- Add missing indexes for efficient org-level queries
CREATE INDEX IF NOT EXISTS idx_prospects_org_id ON public.prospects(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON public.prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_owner_id ON public.prospects(owner_id);
CREATE INDEX IF NOT EXISTS idx_prospects_contact_type ON public.prospects(contact_type);
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON public.prospects(stage);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_prospects_org_type ON public.prospects(organization_id, contact_type);
CREATE INDEX IF NOT EXISTS idx_prospects_org_stage ON public.prospects(organization_id, stage);

-- ============================================================================
-- Also fix contacts table if it exists with similar issues
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contacts') THEN
    -- Drop overly permissive policies
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated access" ON public.contacts';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_access" ON public.contacts';

    -- Create proper policies
    EXECUTE 'CREATE POLICY "contacts_select_org" ON public.contacts
      FOR SELECT TO authenticated
      USING (organization_id = auth_company_id())';

    EXECUTE 'CREATE POLICY "contacts_insert_org" ON public.contacts
      FOR INSERT TO authenticated
      WITH CHECK (organization_id = auth_company_id())';

    EXECUTE 'CREATE POLICY "contacts_update_org" ON public.contacts
      FOR UPDATE TO authenticated
      USING (organization_id = auth_company_id())
      WITH CHECK (organization_id = auth_company_id())';

    EXECUTE 'CREATE POLICY "contacts_delete_org" ON public.contacts
      FOR DELETE TO authenticated
      USING (organization_id = auth_company_id())';

    -- Add indexes
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON public.contacts(organization_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email)';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Policies already exist, ignore
END $$;

-- ============================================================================
-- Verify RLS is enabled
-- ============================================================================

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contacts') THEN
    EXECUTE 'ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

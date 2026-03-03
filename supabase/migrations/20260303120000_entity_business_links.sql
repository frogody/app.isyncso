-- Entity Business Links: Bridge semantic entities ↔ business entities
-- Phase 1.1 of the Semantic Upgrade — Entity Graph cross-referencing

CREATE TABLE IF NOT EXISTS public.entity_business_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semantic_entity_id TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('prospect', 'product', 'candidate')),
  business_record_id UUID NOT NULL,
  match_confidence NUMERIC(4,3) NOT NULL DEFAULT 0.0,
  match_method TEXT NOT NULL DEFAULT 'manual' CHECK (match_method IN ('exact', 'fuzzy', 'alias', 'manual')),
  verified BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(semantic_entity_id, business_type, business_record_id)
);

-- RLS
ALTER TABLE public.entity_business_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_business_links_select" ON public.entity_business_links
  FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "entity_business_links_insert" ON public.entity_business_links
  FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "entity_business_links_update" ON public.entity_business_links
  FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_entity_links_semantic ON public.entity_business_links(semantic_entity_id);
CREATE INDEX idx_entity_links_business ON public.entity_business_links(business_type, business_record_id);
CREATE INDEX idx_entity_links_company ON public.entity_business_links(company_id);

-- RPC: Resolve a semantic entity against business records
-- Uses company_id for products, organization_id for prospects/candidates
CREATE OR REPLACE FUNCTION public.resolve_semantic_entity(
  p_entity_name TEXT,
  p_entity_type TEXT,
  p_company_id UUID
)
RETURNS TABLE(
  business_type TEXT,
  business_record_id UUID,
  business_name TEXT,
  match_confidence NUMERIC,
  match_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
  v_organization_id UUID;
BEGIN
  v_normalized := lower(trim(p_entity_name));

  -- Resolve organization_id from company_id (prospects/candidates use organization_id)
  SELECT c.organization_id INTO v_organization_id
  FROM public.companies c
  WHERE c.id = p_company_id;

  -- 1. Check prospects (CRM contacts) — scoped by organization_id
  RETURN QUERY
  SELECT
    'prospect'::TEXT as business_type,
    p.id as business_record_id,
    COALESCE(p.company, p.first_name || ' ' || p.last_name) as business_name,
    CASE
      WHEN lower(COALESCE(p.company, '')) = v_normalized THEN 1.0
      WHEN lower(p.first_name || ' ' || p.last_name) = v_normalized THEN 1.0
      WHEN lower(COALESCE(p.email, '')) = v_normalized THEN 0.95
      ELSE similarity(v_normalized, lower(COALESCE(p.company, p.first_name || ' ' || p.last_name, '')))
    END::NUMERIC as match_confidence,
    CASE
      WHEN lower(COALESCE(p.company, '')) = v_normalized THEN 'exact'
      WHEN lower(p.first_name || ' ' || p.last_name) = v_normalized THEN 'exact'
      WHEN lower(COALESCE(p.email, '')) = v_normalized THEN 'exact'
      ELSE 'fuzzy'
    END::TEXT as match_method
  FROM public.prospects p
  WHERE p.organization_id = v_organization_id
    AND (
      lower(COALESCE(p.company, '')) = v_normalized
      OR lower(p.first_name || ' ' || p.last_name) = v_normalized
      OR lower(COALESCE(p.email, '')) = v_normalized
      OR similarity(v_normalized, lower(COALESCE(p.company, p.first_name || ' ' || p.last_name, ''))) > 0.4
    )
  ORDER BY match_confidence DESC
  LIMIT 3;

  -- 2. Check products — scoped by company_id
  RETURN QUERY
  SELECT
    'product'::TEXT as business_type,
    pr.id as business_record_id,
    pr.name as business_name,
    CASE
      WHEN lower(pr.name) = v_normalized THEN 1.0
      WHEN lower(COALESCE(pr.sku, '')) = v_normalized THEN 0.95
      ELSE similarity(v_normalized, lower(pr.name))
    END::NUMERIC as match_confidence,
    CASE
      WHEN lower(pr.name) = v_normalized THEN 'exact'
      WHEN lower(COALESCE(pr.sku, '')) = v_normalized THEN 'exact'
      ELSE 'fuzzy'
    END::TEXT as match_method
  FROM public.products pr
  WHERE pr.company_id = p_company_id
    AND (
      lower(pr.name) = v_normalized
      OR lower(COALESCE(pr.sku, '')) = v_normalized
      OR similarity(v_normalized, lower(pr.name)) > 0.4
    )
  ORDER BY match_confidence DESC
  LIMIT 3;

  -- 3. Check candidates — scoped by organization_id
  RETURN QUERY
  SELECT
    'candidate'::TEXT as business_type,
    c.id as business_record_id,
    (c.first_name || ' ' || c.last_name) as business_name,
    CASE
      WHEN lower(c.first_name || ' ' || c.last_name) = v_normalized THEN 1.0
      WHEN lower(COALESCE(c.company_name, '')) = v_normalized THEN 0.9
      ELSE similarity(v_normalized, lower(c.first_name || ' ' || c.last_name))
    END::NUMERIC as match_confidence,
    CASE
      WHEN lower(c.first_name || ' ' || c.last_name) = v_normalized THEN 'exact'
      WHEN lower(COALESCE(c.company_name, '')) = v_normalized THEN 'exact'
      ELSE 'fuzzy'
    END::TEXT as match_method
  FROM public.candidates c
  WHERE c.organization_id = v_organization_id
    AND (
      lower(c.first_name || ' ' || c.last_name) = v_normalized
      OR lower(COALESCE(c.company_name, '')) = v_normalized
      OR similarity(v_normalized, lower(c.first_name || ' ' || c.last_name)) > 0.4
    )
  ORDER BY match_confidence DESC
  LIMIT 3;
END;
$$;

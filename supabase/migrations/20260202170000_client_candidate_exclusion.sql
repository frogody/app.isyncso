-- Client Candidate Exclusion: prevent contacting candidates from client companies
-- Adds exclusion toggle + aliases to clients (prospects), exclusion fields to candidates,
-- and a smart company matching function using trigram similarity.

-- Enable trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Add exclusion fields to prospects (clients)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS exclude_candidates BOOLEAN DEFAULT false;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS company_aliases TEXT[] DEFAULT '{}';

-- 2. Add exclusion fields to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS excluded_reason TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS excluded_client_id UUID;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS excluded_at TIMESTAMPTZ;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_excluded
  ON candidates(organization_id) WHERE excluded_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_exclude
  ON prospects(organization_id) WHERE exclude_candidates = true;

-- 4. Normalize company name helper
CREATE OR REPLACE FUNCTION normalize_company_name(name TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT LOWER(TRIM(
    regexp_replace(
      regexp_replace(
        COALESCE(name, ''),
        '\s*(inc\.?|llc\.?|ltd\.?|b\.?v\.?|n\.?v\.?|gmbh|ag|s\.?a\.?|plc|co\.?|corp\.?|limited|holding|group)\s*$',
        '',
        'gi'
      ),
      '\s+', ' ', 'g'
    )
  ));
$$;

-- 5. Match candidate company against excluded clients
CREATE OR REPLACE FUNCTION match_excluded_client(
  p_company_name TEXT,
  p_organization_id UUID
)
RETURNS TABLE(client_id UUID, client_company TEXT, match_type TEXT)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  IF p_company_name IS NULL OR TRIM(p_company_name) = '' THEN
    RETURN;
  END IF;

  v_normalized := normalize_company_name(p_company_name);

  -- 1. Exact normalized match on client company
  RETURN QUERY
  SELECT p.id, p.company, 'exact'::TEXT
  FROM prospects p
  WHERE p.organization_id = p_organization_id
    AND p.exclude_candidates = true
    AND p.is_recruitment_client = true
    AND normalize_company_name(p.company) = v_normalized
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- 2. Exact match on any alias
  RETURN QUERY
  SELECT p.id, p.company, 'alias'::TEXT
  FROM prospects p, LATERAL unnest(p.company_aliases) AS alias
  WHERE p.organization_id = p_organization_id
    AND p.exclude_candidates = true
    AND p.is_recruitment_client = true
    AND normalize_company_name(alias) = v_normalized
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- 3. Trigram similarity match (fuzzy)
  RETURN QUERY
  SELECT p.id, p.company, 'fuzzy'::TEXT
  FROM prospects p
  WHERE p.organization_id = p_organization_id
    AND p.exclude_candidates = true
    AND p.is_recruitment_client = true
    AND similarity(normalize_company_name(p.company), v_normalized) > 0.4
  ORDER BY similarity(normalize_company_name(p.company), v_normalized) DESC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- 4. Trigram on aliases
  RETURN QUERY
  SELECT p.id, p.company, 'fuzzy_alias'::TEXT
  FROM prospects p, LATERAL unnest(p.company_aliases) AS alias
  WHERE p.organization_id = p_organization_id
    AND p.exclude_candidates = true
    AND p.is_recruitment_client = true
    AND similarity(normalize_company_name(alias), v_normalized) > 0.4
  ORDER BY similarity(normalize_company_name(alias), v_normalized) DESC
  LIMIT 1;
END;
$$;

-- 6. Bulk exclusion: mark all matching candidates for a client
CREATE OR REPLACE FUNCTION exclude_candidates_for_client(
  p_client_id UUID,
  p_organization_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_company TEXT;
  v_aliases TEXT[];
  v_count INTEGER := 0;
BEGIN
  SELECT company, company_aliases INTO v_client_company, v_aliases
  FROM prospects WHERE id = p_client_id;

  -- Build array of all names to match
  v_aliases := COALESCE(v_aliases, '{}') || ARRAY[v_client_company];

  -- Mark matching candidates
  WITH matches AS (
    SELECT c.id
    FROM candidates c
    WHERE c.organization_id = p_organization_id
      AND c.excluded_reason IS NULL
      AND (
        normalize_company_name(c.company_name) = ANY(
          SELECT normalize_company_name(unnest(v_aliases))
        )
        OR EXISTS (
          SELECT 1 FROM unnest(v_aliases) alias
          WHERE similarity(normalize_company_name(c.company_name), normalize_company_name(alias)) > 0.4
        )
      )
  )
  UPDATE candidates SET
    excluded_reason = 'client_company_match',
    excluded_client_id = p_client_id,
    excluded_at = NOW()
  FROM matches
  WHERE candidates.id = matches.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

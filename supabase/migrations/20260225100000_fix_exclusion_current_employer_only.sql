-- Fix candidate exclusion to only exclude candidates CURRENTLY working at a client company
-- Previously, candidates who had worked at the company in the past were also excluded
-- Now checks work_history to verify the company is the current employer

-- Helper: check if a candidate currently works at a given company
CREATE OR REPLACE FUNCTION is_currently_at_company(
  p_candidate_company_name TEXT,
  p_candidate_work_history JSONB,
  p_check_companies TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_normalized_check TEXT[];
  v_wh JSONB;
  v_wh_company TEXT;
  v_has_current_entry BOOLEAN := false;
  v_current_matches BOOLEAN := false;
BEGIN
  -- Normalize all company names to check against
  SELECT array_agg(normalize_company_name(c))
  INTO v_normalized_check
  FROM unnest(p_check_companies) AS c;

  -- If candidate has work_history with entries, use it to determine current employment
  IF p_candidate_work_history IS NOT NULL
     AND jsonb_typeof(p_candidate_work_history) = 'array'
     AND jsonb_array_length(p_candidate_work_history) > 0 THEN

    -- First: check entries explicitly marked as current
    FOR v_wh IN SELECT * FROM jsonb_array_elements(p_candidate_work_history)
    LOOP
      IF v_wh->>'is_current' = 'true' OR v_wh->>'isCurrent' = 'true' THEN
        v_has_current_entry := true;
        -- Get company name from various possible formats
        v_wh_company := COALESCE(
          v_wh->>'company',
          v_wh->'company'->>'name',
          v_wh->>'company_name',
          v_wh->>'companyName',
          ''
        );
        IF normalize_company_name(v_wh_company) = ANY(v_normalized_check) THEN
          v_current_matches := true;
        END IF;
        -- Also check fuzzy match
        IF NOT v_current_matches THEN
          IF EXISTS (
            SELECT 1 FROM unnest(v_normalized_check) nc
            WHERE similarity(normalize_company_name(v_wh_company), nc) > 0.4
          ) THEN
            v_current_matches := true;
          END IF;
        END IF;
      END IF;
    END LOOP;

    -- If we found explicit is_current entries, use that result
    IF v_has_current_entry THEN
      RETURN v_current_matches;
    END IF;

    -- No is_current flag: check the first entry (most recent) as the current job
    v_wh := p_candidate_work_history->0;
    v_wh_company := COALESCE(
      v_wh->>'company',
      v_wh->'company'->>'name',
      v_wh->>'company_name',
      v_wh->>'companyName',
      ''
    );

    IF normalize_company_name(v_wh_company) = ANY(v_normalized_check) THEN
      RETURN true;
    END IF;
    IF EXISTS (
      SELECT 1 FROM unnest(v_normalized_check) nc
      WHERE similarity(normalize_company_name(v_wh_company), nc) > 0.4
    ) THEN
      RETURN true;
    END IF;

    -- Work history exists but current job doesn't match client = candidate moved on
    RETURN false;
  END IF;

  -- No work_history: fall back to company_name field
  IF p_candidate_company_name IS NULL OR TRIM(p_candidate_company_name) = '' THEN
    RETURN false;
  END IF;

  -- Check exact match
  IF normalize_company_name(p_candidate_company_name) = ANY(v_normalized_check) THEN
    RETURN true;
  END IF;

  -- Check fuzzy match
  IF EXISTS (
    SELECT 1 FROM unnest(v_normalized_check) nc
    WHERE similarity(normalize_company_name(p_candidate_company_name), nc) > 0.4
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Update the bulk exclusion function to use current-employer check
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

  -- Mark matching candidates - only those CURRENTLY working at the company
  WITH matches AS (
    SELECT c.id
    FROM candidates c
    WHERE c.organization_id = p_organization_id
      AND c.excluded_reason IS NULL
      AND is_currently_at_company(c.company_name, c.work_history, v_aliases)
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

-- Also update match_excluded_client to check current employment
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

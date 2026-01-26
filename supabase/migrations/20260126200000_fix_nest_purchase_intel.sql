-- Fix: Auto-queue intelligence generation when purchasing nests from marketplace
-- This ensures candidates copied from nest purchases get SYNC Intel processing

-- ==================================================
-- FUNCTION: copy_nest_to_organization (UPDATED)
-- Now queues intel for all copied candidates
-- ==================================================
CREATE OR REPLACE FUNCTION public.copy_nest_to_organization(
  p_nest_id UUID,
  p_organization_id UUID,
  p_purchase_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nest RECORD;
  v_item RECORD;
  v_new_id UUID;
  v_copied_count INTEGER := 0;
  v_queued_count INTEGER := 0;
  v_errors TEXT[] := '{}';
  v_new_candidate_ids UUID[] := '{}';
BEGIN
  -- Get nest info
  SELECT * INTO v_nest FROM nests WHERE id = p_nest_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nest not found');
  END IF;

  -- Iterate through nest items and copy based on type
  FOR v_item IN
    SELECT ni.*,
           c.id as c_id, c.first_name as c_first_name, c.last_name as c_last_name, c.email as c_email,
           c.phone as c_phone, c.linkedin_profile as c_linkedin, c.job_title as c_title,
           c.company_name as c_company, c.skills as c_skills, c.years_experience as c_experience,
           c.education as c_education, c.languages as c_languages, c.certifications as c_certifications,
           c.person_home_location as c_location, c.profile_image_url as c_image,
           p.id as p_id, p.first_name as p_first_name, p.last_name as p_last_name, p.email as p_email,
           p.phone as p_phone, p.linkedin_url as p_linkedin, p.job_title as p_title, p.company as p_company,
           p.industry as p_industry, p.deal_value as p_deal_value, p.website as p_website,
           p.company_size as p_company_size, p.location as p_location, p.contact_type as p_contact_type,
           i.id as i_id, i.investor_type as i_type, i.profile as i_profile
    FROM nest_items ni
    LEFT JOIN candidates c ON ni.candidate_id = c.id
    LEFT JOIN prospects p ON ni.prospect_id = p.id
    LEFT JOIN raise_investors i ON ni.investor_id = i.id
    WHERE ni.nest_id = p_nest_id
  LOOP
    BEGIN
      IF v_item.candidate_id IS NOT NULL THEN
        -- Copy candidate
        INSERT INTO candidates (
          organization_id, first_name, last_name, email, phone, linkedin_profile,
          job_title, company_name, skills, years_experience, education, languages,
          certifications, person_home_location, profile_image_url, source, source_url,
          created_date, updated_date
        ) VALUES (
          p_organization_id, v_item.c_first_name, v_item.c_last_name, v_item.c_email,
          v_item.c_phone, v_item.c_linkedin, v_item.c_title, v_item.c_company,
          v_item.c_skills, v_item.c_experience, v_item.c_education, v_item.c_languages,
          v_item.c_certifications, v_item.c_location, v_item.c_image,
          'nest_purchase', 'nest:' || p_nest_id::text, NOW(), NOW()
        )
        RETURNING id INTO v_new_id;

        -- Track new candidate IDs for intel queueing
        v_new_candidate_ids := array_append(v_new_candidate_ids, v_new_id);
        v_copied_count := v_copied_count + 1;

      ELSIF v_item.prospect_id IS NOT NULL THEN
        -- Copy prospect
        INSERT INTO prospects (
          organization_id, first_name, last_name, email, phone, linkedin_url,
          job_title, company, industry, deal_value, website, company_size,
          location, contact_type, source, created_date, updated_date
        ) VALUES (
          p_organization_id, v_item.p_first_name, v_item.p_last_name, v_item.p_email,
          v_item.p_phone, v_item.p_linkedin, v_item.p_title, v_item.p_company,
          v_item.p_industry, v_item.p_deal_value, v_item.p_website, v_item.p_company_size,
          v_item.p_location, v_item.p_contact_type,
          'nest_purchase', NOW(), NOW()
        )
        RETURNING id INTO v_new_id;
        v_copied_count := v_copied_count + 1;

      ELSIF v_item.investor_id IS NOT NULL THEN
        -- Copy investor
        INSERT INTO raise_investors (
          organization_id, user_id, investor_type, profile, created_at, updated_at
        ) VALUES (
          p_organization_id,
          (SELECT id FROM users WHERE organization_id = p_organization_id LIMIT 1),
          v_item.i_type,
          v_item.i_profile,
          NOW(), NOW()
        )
        RETURNING id INTO v_new_id;
        v_copied_count := v_copied_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, SQLERRM);
    END;
  END LOOP;

  -- ============================================================
  -- NEW: Queue intel for all copied candidates (FREE processing)
  -- This is the critical fix - auto-generate SYNC Intel!
  -- ============================================================
  IF array_length(v_new_candidate_ids, 1) > 0 THEN
    INSERT INTO sync_intel_queue (candidate_id, organization_id, source, priority, status)
    SELECT
      unnest(v_new_candidate_ids),
      p_organization_id,
      'nest_purchase',
      2,  -- normal priority
      'pending'
    ON CONFLICT DO NOTHING;

    v_queued_count := array_length(v_new_candidate_ids, 1);
  END IF;

  -- Mark purchase as completed
  UPDATE nest_purchases
  SET items_copied = true,
      status = 'completed',
      completed_at = NOW()
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'copied_count', v_copied_count,
    'queued_for_intel', v_queued_count,
    'nest_type', v_nest.nest_type,
    'errors', v_errors
  );
END;
$$;

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION public.copy_nest_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.copy_nest_to_organization TO service_role;

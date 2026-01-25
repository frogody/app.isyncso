-- Nests Feature: Purchasable datasets for Talent/Growth/Raise modules
-- Migration: 20260125100000_create_nests_tables.sql

-- ==================================================
-- TABLE: nests - The purchasable dataset package
-- ==================================================
CREATE TABLE IF NOT EXISTS public.nests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  nest_type TEXT NOT NULL CHECK (nest_type IN ('candidates', 'prospects', 'investors')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  item_count INTEGER DEFAULT 0,
  preview_count INTEGER DEFAULT 5,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nests_type ON public.nests(nest_type);
CREATE INDEX IF NOT EXISTS idx_nests_active ON public.nests(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_nests_created_at ON public.nests(created_at DESC);

-- ==================================================
-- TABLE: nest_items - Links nest to actual entities
-- ==================================================
CREATE TABLE IF NOT EXISTS public.nest_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nest_id UUID NOT NULL REFERENCES public.nests(id) ON DELETE CASCADE,
  -- Polymorphic reference - exactly one must be set
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES public.raise_investors(id) ON DELETE CASCADE,
  item_order INTEGER DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure exactly one entity type is set
  CONSTRAINT one_entity_type CHECK (
    (CASE WHEN candidate_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN prospect_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN investor_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nest_items_nest ON public.nest_items(nest_id);
CREATE INDEX IF NOT EXISTS idx_nest_items_preview ON public.nest_items(nest_id, is_preview) WHERE is_preview = true;
CREATE INDEX IF NOT EXISTS idx_nest_items_candidate ON public.nest_items(candidate_id) WHERE candidate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nest_items_prospect ON public.nest_items(prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nest_items_investor ON public.nest_items(investor_id) WHERE investor_id IS NOT NULL;

-- ==================================================
-- TABLE: nest_purchases - Track who bought what
-- ==================================================
CREATE TABLE IF NOT EXISTS public.nest_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nest_id UUID NOT NULL REFERENCES public.nests(id),
  organization_id UUID NOT NULL,
  purchased_by UUID NOT NULL REFERENCES auth.users(id),
  price_paid DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  items_copied BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(nest_id, organization_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nest_purchases_org ON public.nest_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_nest_purchases_user ON public.nest_purchases(purchased_by);
CREATE INDEX IF NOT EXISTS idx_nest_purchases_status ON public.nest_purchases(status);
CREATE INDEX IF NOT EXISTS idx_nest_purchases_stripe ON public.nest_purchases(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- ==================================================
-- RLS POLICIES
-- ==================================================

-- Enable RLS
ALTER TABLE public.nests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nest_purchases ENABLE ROW LEVEL SECURITY;

-- NESTS: Anyone can view active nests
CREATE POLICY "Anyone can view active nests" ON public.nests
  FOR SELECT
  USING (is_active = true);

-- NESTS: Platform admins can do everything
CREATE POLICY "Platform admins manage nests" ON public.nests
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- NEST_ITEMS: Anyone can view preview items
CREATE POLICY "Anyone can view preview items" ON public.nest_items
  FOR SELECT
  USING (is_preview = true);

-- NEST_ITEMS: View all items if organization has purchased
CREATE POLICY "Purchasers can view all items" ON public.nest_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nest_purchases np
      JOIN public.users u ON u.organization_id = np.organization_id
      WHERE np.nest_id = nest_items.nest_id
        AND u.id = auth.uid()
        AND np.status = 'completed'
    )
  );

-- NEST_ITEMS: Platform admins can do everything
CREATE POLICY "Platform admins manage nest items" ON public.nest_items
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- NEST_PURCHASES: Users can view their organization's purchases
CREATE POLICY "Org members can view purchases" ON public.nest_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE organization_id = nest_purchases.organization_id
        AND id = auth.uid()
    )
  );

-- NEST_PURCHASES: Users can create purchases for their org
CREATE POLICY "Users can create purchases" ON public.nest_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    purchased_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE organization_id = nest_purchases.organization_id
        AND id = auth.uid()
    )
  );

-- NEST_PURCHASES: Platform admins can do everything
CREATE POLICY "Platform admins manage purchases" ON public.nest_purchases
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ==================================================
-- FUNCTION: copy_nest_to_organization
-- Copies nest entities to buyer's organization after purchase
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
  v_errors TEXT[] := '{}';
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

  -- Mark purchase as completed
  UPDATE nest_purchases
  SET items_copied = true,
      status = 'completed',
      completed_at = NOW()
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'copied_count', v_copied_count,
    'nest_type', v_nest.nest_type,
    'errors', v_errors
  );
END;
$$;

-- ==================================================
-- FUNCTION: update_nest_item_count
-- Trigger to keep item_count in sync
-- ==================================================
CREATE OR REPLACE FUNCTION public.update_nest_item_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE nests SET item_count = item_count + 1, updated_at = NOW() WHERE id = NEW.nest_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE nests SET item_count = item_count - 1, updated_at = NOW() WHERE id = OLD.nest_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for item count
DROP TRIGGER IF EXISTS trigger_nest_item_count ON public.nest_items;
CREATE TRIGGER trigger_nest_item_count
  AFTER INSERT OR DELETE ON public.nest_items
  FOR EACH ROW
  EXECUTE FUNCTION update_nest_item_count();

-- ==================================================
-- FUNCTION: get_nest_stats
-- Helper for admin dashboard
-- ==================================================
CREATE OR REPLACE FUNCTION public.get_nest_stats(p_nest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_items', (SELECT COUNT(*) FROM nest_items WHERE nest_id = p_nest_id),
    'preview_items', (SELECT COUNT(*) FROM nest_items WHERE nest_id = p_nest_id AND is_preview = true),
    'total_purchases', (SELECT COUNT(*) FROM nest_purchases WHERE nest_id = p_nest_id AND status = 'completed'),
    'total_revenue', (SELECT COALESCE(SUM(price_paid), 0) FROM nest_purchases WHERE nest_id = p_nest_id AND status = 'completed'),
    'pending_purchases', (SELECT COUNT(*) FROM nest_purchases WHERE nest_id = p_nest_id AND status = 'pending')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.copy_nest_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nest_stats TO authenticated;

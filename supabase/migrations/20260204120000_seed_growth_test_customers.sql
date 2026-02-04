-- Seed test customer/prospect data for Growth module
-- These records will be visible to users in their organization's Growth Opportunities

-- Function to seed test customers for an organization
CREATE OR REPLACE FUNCTION seed_growth_test_customers(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Only seed if organization doesn't already have test customers
  IF EXISTS (
    SELECT 1 FROM public.prospects
    WHERE organization_id = p_organization_id
    AND company LIKE 'Test:%'
    LIMIT 1
  ) THEN
    RAISE NOTICE 'Test customers already exist for this organization';
    RETURN 0;
  END IF;

  -- Insert test customer records
  INSERT INTO public.prospects (
    organization_id,
    company,
    first_name,
    last_name,
    email,
    phone,
    industry,
    company_industry,
    company_size,
    company_employee_count,
    company_revenue,
    contact_type,
    stage,
    notes,
    created_at
  ) VALUES
  (
    p_organization_id,
    'Acme Corporation',
    'John',
    'Smith',
    'john.smith@acmecorp.com',
    '+1-555-0101',
    'Technology',
    'Technology',
    '51-200',
    150,
    '$15M',
    'customer',
    'qualified',
    'Enterprise software customer, strong expansion potential',
    NOW()
  ),
  (
    p_organization_id,
    'TechFlow Industries',
    'Sarah',
    'Johnson',
    'sarah.j@techflow.io',
    '+1-555-0102',
    'Software',
    'Software',
    '201-500',
    250,
    '$25M',
    'customer',
    'qualified',
    'SaaS platform user, interested in premium tier',
    NOW()
  ),
  (
    p_organization_id,
    'Global Dynamics Inc',
    'Michael',
    'Chen',
    'm.chen@globaldynamics.com',
    '+1-555-0103',
    'Manufacturing',
    'Manufacturing',
    '501-1000',
    500,
    '$50M',
    'customer',
    'engaged',
    'Large manufacturing client, multiple departments',
    NOW()
  ),
  (
    p_organization_id,
    'CloudFirst Solutions',
    'Emily',
    'Davis',
    'emily.davis@cloudfirst.io',
    '+1-555-0104',
    'SaaS',
    'SaaS',
    '11-50',
    75,
    '$8M',
    'prospect',
    'new',
    'Fast-growing startup, evaluating enterprise features',
    NOW()
  ),
  (
    p_organization_id,
    'DataWave Analytics',
    'Robert',
    'Wilson',
    'r.wilson@datawave.ai',
    '+1-555-0105',
    'Data/AI',
    'Data/AI',
    '51-200',
    120,
    '$12M',
    'customer',
    'qualified',
    'AI company with high growth, good upsell candidate',
    NOW()
  ),
  (
    p_organization_id,
    'Nexus Healthcare',
    'Lisa',
    'Martinez',
    'lmartinez@nexushealth.com',
    '+1-555-0106',
    'Healthcare',
    'Healthcare',
    '201-500',
    300,
    '$35M',
    'customer',
    'engaged',
    'Healthcare provider, compliance-focused',
    NOW()
  ),
  (
    p_organization_id,
    'FinServe Capital',
    'David',
    'Brown',
    'd.brown@finservecap.com',
    '+1-555-0107',
    'Finance',
    'Finance',
    '51-200',
    180,
    '$22M',
    'prospect',
    'qualified',
    'Financial services firm, security requirements',
    NOW()
  ),
  (
    p_organization_id,
    'EcoTech Green',
    'Amanda',
    'Taylor',
    'amanda@ecotechgreen.com',
    '+1-555-0108',
    'CleanTech',
    'CleanTech',
    '11-50',
    45,
    '$5M',
    'prospect',
    'new',
    'Sustainable tech startup, seeking growth tools',
    NOW()
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION seed_growth_test_customers(UUID) TO authenticated;

-- Auto-seed for existing organizations that have users
-- This runs once when migration is applied
DO $$
DECLARE
  org_rec RECORD;
  seeded_count INTEGER;
BEGIN
  -- Get all organizations that have at least one user
  FOR org_rec IN
    SELECT DISTINCT organization_id
    FROM public.users
    WHERE organization_id IS NOT NULL
  LOOP
    SELECT seed_growth_test_customers(org_rec.organization_id) INTO seeded_count;
    IF seeded_count > 0 THEN
      RAISE NOTICE 'Seeded % test customers for organization %', seeded_count, org_rec.organization_id;
    END IF;
  END LOOP;
END;
$$;

-- Also seed for companies table if users have company_id instead
DO $$
DECLARE
  comp_rec RECORD;
  seeded_count INTEGER;
BEGIN
  FOR comp_rec IN
    SELECT DISTINCT company_id
    FROM public.users
    WHERE company_id IS NOT NULL
    AND company_id NOT IN (SELECT DISTINCT organization_id FROM public.users WHERE organization_id IS NOT NULL)
  LOOP
    SELECT seed_growth_test_customers(comp_rec.company_id) INTO seeded_count;
    IF seeded_count > 0 THEN
      RAISE NOTICE 'Seeded % test customers for company %', seeded_count, comp_rec.company_id;
    END IF;
  END LOOP;
END;
$$;

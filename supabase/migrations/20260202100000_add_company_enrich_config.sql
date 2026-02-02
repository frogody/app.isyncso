-- Add company_enrich as separate enrichment option
INSERT INTO enrichment_config (id, key, credits, label, description, display_order) VALUES
  (gen_random_uuid(), 'company_enrich', 3, 'Company Enrichment', 'Firmographics, funding, tech stack, employee data from Explorium', 4)
ON CONFLICT (key) DO UPDATE SET
  credits = EXCLUDED.credits,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- Trust Scores: Progressive autonomy per action type per user
CREATE TABLE IF NOT EXISTS public.trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  action_category TEXT NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 4),
  accuracy_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  total_actions INTEGER NOT NULL DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  graduated_at TIMESTAMPTZ[] DEFAULT '{}',
  demoted_at TIMESTAMPTZ[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, action_category)
);

-- RLS
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_scores_select" ON public.trust_scores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "trust_scores_insert" ON public.trust_scores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trust_scores_update" ON public.trust_scores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_trust_scores_user ON public.trust_scores(user_id);
CREATE INDEX idx_trust_scores_company ON public.trust_scores(company_id);
CREATE INDEX idx_trust_scores_category ON public.trust_scores(action_category);

-- Category caps configuration
CREATE TABLE IF NOT EXISTS public.trust_category_caps (
  category TEXT PRIMARY KEY,
  max_level INTEGER NOT NULL DEFAULT 4 CHECK (max_level BETWEEN 1 AND 4),
  graduation_threshold INTEGER NOT NULL DEFAULT 10,
  demotion_threshold INTEGER NOT NULL DEFAULT 3,
  description TEXT
);

INSERT INTO public.trust_category_caps (category, max_level, graduation_threshold, demotion_threshold, description) VALUES
  ('informational', 2, 5, 3, 'View data, list items, search'),
  ('administrative', 4, 15, 3, 'Create/update tasks, team mgmt'),
  ('communication', 3, 10, 2, 'Send messages, emails'),
  ('financial', 3, 20, 2, 'Create invoices, expenses'),
  ('pricing', 2, 15, 2, 'Set prices, discounts'),
  ('compliance', 3, 20, 1, 'Regulatory actions')
ON CONFLICT (category) DO NOTHING;

ALTER TABLE public.trust_category_caps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_caps_read" ON public.trust_category_caps FOR SELECT TO authenticated USING (true);

-- AI Usage Log table for tracking all AI generations
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  model VARCHAR(100),
  cost_usd DECIMAL(10, 6),
  content_type VARCHAR(20), -- 'image' | 'video'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying by company and date
CREATE INDEX IF NOT EXISTS idx_ai_usage_company_date ON public.ai_usage_log(company_id, created_at);

-- Enable RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for company users to view their usage
CREATE POLICY "Users view company AI usage" ON public.ai_usage_log
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Policy for service role inserts (edge functions use service role)
CREATE POLICY "Service role can insert" ON public.ai_usage_log
  FOR INSERT WITH CHECK (true);

-- AI Usage Limits table for per-company cost control
CREATE TABLE IF NOT EXISTS public.ai_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  monthly_limit_usd DECIMAL(10, 2) DEFAULT 50.00,
  daily_limit_usd DECIMAL(10, 2) DEFAULT 5.00,
  per_generation_limit_usd DECIMAL(10, 2) DEFAULT 0.10,
  allowed_tiers TEXT[] DEFAULT ARRAY['economy', 'standard'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS policy for company users
CREATE POLICY "Users view company AI limits" ON public.ai_usage_limits
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Admin users can update limits
CREATE POLICY "Admins manage AI limits" ON public.ai_usage_limits
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.rbac_user_roles ur ON u.id = ur.user_id
      JOIN public.rbac_roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() AND r.hierarchy_level >= 80
    )
  );

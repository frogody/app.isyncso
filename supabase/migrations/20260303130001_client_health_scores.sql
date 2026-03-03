CREATE TABLE IF NOT EXISTS public.client_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  components JSONB NOT NULL DEFAULT '{}',
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  risk_level TEXT CHECK (risk_level IN ('healthy', 'watch', 'at_risk', 'critical')),
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prospect_id)
);

ALTER TABLE public.client_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_select" ON public.client_health_scores
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE INDEX idx_health_prospect ON public.client_health_scores(prospect_id);
CREATE INDEX idx_health_company ON public.client_health_scores(company_id);
CREATE INDEX idx_health_risk ON public.client_health_scores(risk_level);

-- RPC to compute health for a single prospect
CREATE OR REPLACE FUNCTION public.compute_client_health(
  p_prospect_id UUID,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prospect RECORD;
  v_org_id UUID;
  v_payment_score INTEGER := 50;
  v_engagement_score INTEGER := 50;
  v_volume_score INTEGER := 50;
  v_communication_score INTEGER := 50;
  v_overall INTEGER;
  v_risk TEXT;
  v_trend TEXT := 'stable';
  v_invoice_count INTEGER;
  v_paid_on_time INTEGER;
  v_total_revenue NUMERIC;
  v_last_activity TIMESTAMPTZ;
  v_days_since_update INTEGER;
  v_result JSONB;
BEGIN
  -- Get prospect
  SELECT * INTO v_prospect FROM prospects WHERE id = p_prospect_id;
  IF v_prospect IS NULL THEN
    RETURN jsonb_build_object('error', 'Prospect not found');
  END IF;

  -- Get org_id from company
  SELECT organization_id INTO v_org_id FROM companies WHERE id = p_company_id;

  -- 1. Payment Timeliness (30% weight)
  -- Count invoices where client_name or client_email matches
  SELECT COUNT(*),
         COALESCE(SUM(CASE WHEN status = 'paid' AND (amount_paid >= total OR updated_at <= due_date + interval '7 days') THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(total), 0)
  INTO v_invoice_count, v_paid_on_time, v_total_revenue
  FROM invoices
  WHERE company_id = p_company_id
    AND (
      lower(client_email) = lower(COALESCE(v_prospect.email, ''))
      OR lower(client_name) LIKE '%' || lower(COALESCE(v_prospect.first_name, '')) || '%' || lower(COALESCE(v_prospect.last_name, '')) || '%'
      OR lower(client_name) LIKE '%' || lower(COALESCE(v_prospect.company, '')) || '%'
    );

  IF v_invoice_count > 0 THEN
    v_payment_score := LEAST(100, (v_paid_on_time * 100 / v_invoice_count));
  END IF;

  -- 2. Engagement Frequency (25% weight)
  -- Based on prospect stage progression and deal activity
  v_days_since_update := EXTRACT(EPOCH FROM (now() - COALESCE(v_prospect.updated_date, v_prospect.created_date))) / 86400;
  IF v_days_since_update < 3 THEN v_engagement_score := 100;
  ELSIF v_days_since_update < 7 THEN v_engagement_score := 80;
  ELSIF v_days_since_update < 14 THEN v_engagement_score := 60;
  ELSIF v_days_since_update < 30 THEN v_engagement_score := 40;
  ELSIF v_days_since_update < 60 THEN v_engagement_score := 20;
  ELSE v_engagement_score := 10;
  END IF;

  -- Stage bonus
  IF v_prospect.stage IN ('won', 'customer') THEN v_engagement_score := LEAST(100, v_engagement_score + 20);
  ELSIF v_prospect.stage IN ('negotiation', 'proposal') THEN v_engagement_score := LEAST(100, v_engagement_score + 10);
  END IF;

  -- 3. Order Volume Trend (25% weight)
  -- Based on total revenue and invoice count
  IF v_total_revenue > 10000 THEN v_volume_score := 100;
  ELSIF v_total_revenue > 5000 THEN v_volume_score := 80;
  ELSIF v_total_revenue > 1000 THEN v_volume_score := 60;
  ELSIF v_total_revenue > 0 THEN v_volume_score := 40;
  ELSE v_volume_score := 20;
  END IF;

  -- 4. Communication Recency (20% weight)
  -- Check for recent semantic activities linked to this prospect
  SELECT MAX(sa.created_at) INTO v_last_activity
  FROM semantic_activities sa
  JOIN entity_business_links ebl ON sa.user_id = ebl.user_id
  WHERE ebl.business_record_id = p_prospect_id
    AND ebl.business_type = 'prospect'
    AND sa.activity_type = 'COMMUNICATING';

  IF v_last_activity IS NOT NULL THEN
    v_days_since_update := EXTRACT(EPOCH FROM (now() - v_last_activity)) / 86400;
    IF v_days_since_update < 3 THEN v_communication_score := 100;
    ELSIF v_days_since_update < 7 THEN v_communication_score := 80;
    ELSIF v_days_since_update < 14 THEN v_communication_score := 60;
    ELSIF v_days_since_update < 30 THEN v_communication_score := 40;
    ELSE v_communication_score := 20;
    END IF;
  ELSE
    -- Fallback: use prospect updated_date
    v_communication_score := GREATEST(10, v_engagement_score - 10);
  END IF;

  -- Weighted overall: payment 30%, engagement 25%, volume 25%, communication 20%
  v_overall := (v_payment_score * 30 + v_engagement_score * 25 + v_volume_score * 25 + v_communication_score * 20) / 100;

  -- Risk level
  IF v_overall >= 70 THEN v_risk := 'healthy';
  ELSIF v_overall >= 50 THEN v_risk := 'watch';
  ELSIF v_overall >= 30 THEN v_risk := 'at_risk';
  ELSE v_risk := 'critical';
  END IF;

  -- Upsert
  INSERT INTO client_health_scores (prospect_id, company_id, overall_score, components, trend, risk_level, computed_at, updated_at)
  VALUES (
    p_prospect_id, p_company_id, v_overall,
    jsonb_build_object(
      'payment_timeliness', v_payment_score,
      'engagement_frequency', v_engagement_score,
      'order_volume_trend', v_volume_score,
      'communication_recency', v_communication_score
    ),
    v_trend, v_risk, now(), now()
  )
  ON CONFLICT (prospect_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    components = EXCLUDED.components,
    trend = CASE
      WHEN EXCLUDED.overall_score > client_health_scores.overall_score + 5 THEN 'improving'
      WHEN EXCLUDED.overall_score < client_health_scores.overall_score - 5 THEN 'declining'
      ELSE 'stable'
    END,
    risk_level = EXCLUDED.risk_level,
    computed_at = now(),
    updated_at = now();

  v_result := jsonb_build_object(
    'prospect_id', p_prospect_id,
    'overall_score', v_overall,
    'risk_level', v_risk,
    'trend', v_trend,
    'components', jsonb_build_object(
      'payment_timeliness', v_payment_score,
      'engagement_frequency', v_engagement_score,
      'order_volume_trend', v_volume_score,
      'communication_recency', v_communication_score
    )
  );

  RETURN v_result;
END;
$$;

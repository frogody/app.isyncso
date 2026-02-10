-- ============================================================================
-- Talent Outreach Agent: Schema Extensions
-- Adds columns to outreach_tasks, new tables for rate limits & execution log,
-- and automation_config to campaigns.
-- ============================================================================

-- 1. Add columns to outreach_tasks
ALTER TABLE public.outreach_tasks
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'linkedin',
  ADD COLUMN IF NOT EXISTS external_message_id TEXT,
  ADD COLUMN IF NOT EXISTS send_error TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

-- Index for efficient querying by channel and status
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_channel ON public.outreach_tasks (channel);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_status_channel ON public.outreach_tasks (status, channel);
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_approved ON public.outreach_tasks (approved_at) WHERE approved_at IS NOT NULL;

-- 2. New table: outreach_rate_limits
CREATE TABLE IF NOT EXISTS public.outreach_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  send_count INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel, date)
);

-- Set default limits per channel
COMMENT ON TABLE public.outreach_rate_limits IS 'Per-user per-channel daily send counter. Defaults: linkedin=25, email=200, sms=100';

-- RLS for outreach_rate_limits
ALTER TABLE public.outreach_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON public.outreach_rate_limits
  FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "Service role manages rate limits"
  ON public.outreach_rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. New table: outreach_execution_log
CREATE TABLE IF NOT EXISTS public.outreach_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.outreach_tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID,
  channel TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  external_id TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for execution log
CREATE INDEX IF NOT EXISTS idx_execution_log_task ON public.outreach_execution_log (task_id);
CREATE INDEX IF NOT EXISTS idx_execution_log_org_date ON public.outreach_execution_log (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_log_channel ON public.outreach_execution_log (channel, status);

-- RLS for outreach_execution_log
ALTER TABLE public.outreach_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org execution logs"
  ON public.outreach_execution_log
  FOR SELECT TO authenticated
  USING (user_id = auth_uid());

CREATE POLICY "Service role manages execution logs"
  ON public.outreach_execution_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Add automation_config to campaigns table
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS automation_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.campaigns.automation_config IS 'Stores automation settings: enabled, auto_approve_followups, channels, rate_limits, sequence definition';

-- 5. Helper function: check and increment rate limit
-- Returns true if under limit, false if over
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id UUID,
  p_channel TEXT,
  p_daily_limit INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_limit INTEGER;
  v_current_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- Set default limits per channel
  CASE p_channel
    WHEN 'linkedin' THEN v_default_limit := 25;
    WHEN 'email' THEN v_default_limit := 200;
    WHEN 'sms' THEN v_default_limit := 100;
    ELSE v_default_limit := 50;
  END CASE;

  v_limit := COALESCE(p_daily_limit, v_default_limit);

  -- Upsert and check atomically
  INSERT INTO public.outreach_rate_limits (user_id, channel, date, send_count, daily_limit)
  VALUES (p_user_id, p_channel, CURRENT_DATE, 1, v_limit)
  ON CONFLICT (user_id, channel, date) DO UPDATE
    SET send_count = outreach_rate_limits.send_count + 1,
        updated_at = now()
  RETURNING send_count INTO v_current_count;

  -- If we just went over, decrement and return false
  IF v_current_count > v_limit THEN
    UPDATE public.outreach_rate_limits
    SET send_count = send_count - 1
    WHERE user_id = p_user_id AND channel = p_channel AND date = CURRENT_DATE;
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 6. Helper function: get current rate limit status
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(p_user_id UUID)
RETURNS TABLE (
  channel TEXT,
  send_count INTEGER,
  daily_limit INTEGER,
  remaining INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rl.channel,
    rl.send_count,
    rl.daily_limit,
    GREATEST(0, rl.daily_limit - rl.send_count) as remaining
  FROM public.outreach_rate_limits rl
  WHERE rl.user_id = p_user_id
    AND rl.date = CURRENT_DATE
  ORDER BY rl.channel;
$$;

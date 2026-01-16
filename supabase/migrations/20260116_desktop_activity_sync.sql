-- ============================================================================
-- Desktop Activity Sync Tables
--
-- Tables for syncing activity data from the SYNC Desktop Companion app.
-- Stores hourly activity summaries and daily journals.
-- ============================================================================

-- ============================================================================
-- Desktop Activity Logs (Hourly Summaries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.desktop_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  app_breakdown JSONB DEFAULT '{}',
  total_minutes INTEGER DEFAULT 0,
  focus_score REAL DEFAULT 0,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one entry per user per hour
  CONSTRAINT unique_user_hour UNIQUE (user_id, hour_start)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_desktop_activity_user_id ON public.desktop_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_desktop_activity_company_id ON public.desktop_activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_desktop_activity_hour_start ON public.desktop_activity_logs(hour_start);
CREATE INDEX IF NOT EXISTS idx_desktop_activity_user_hour ON public.desktop_activity_logs(user_id, hour_start DESC);

-- Enable RLS
ALTER TABLE public.desktop_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies using optimized auth functions
CREATE POLICY "Users can view own desktop activity"
  ON public.desktop_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "Users can insert own desktop activity"
  ON public.desktop_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "Users can update own desktop activity"
  ON public.desktop_activity_logs FOR UPDATE
  TO authenticated
  USING (user_id = public.auth_uid())
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "Users can delete own desktop activity"
  ON public.desktop_activity_logs FOR DELETE
  TO authenticated
  USING (user_id = public.auth_uid());

-- ============================================================================
-- Daily Journals
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  journal_date DATE NOT NULL,
  overview TEXT,
  highlights JSONB DEFAULT '[]',
  focus_areas JSONB DEFAULT '[]',
  total_active_minutes INTEGER DEFAULT 0,
  top_apps JSONB DEFAULT '[]',
  productivity_score REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one journal per user per day
  CONSTRAINT unique_user_journal_date UNIQUE (user_id, journal_date)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_daily_journals_user_id ON public.daily_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_journals_company_id ON public.daily_journals(company_id);
CREATE INDEX IF NOT EXISTS idx_daily_journals_date ON public.daily_journals(journal_date);
CREATE INDEX IF NOT EXISTS idx_daily_journals_user_date ON public.daily_journals(user_id, journal_date DESC);

-- Enable RLS
ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;

-- RLS Policies using optimized auth functions
CREATE POLICY "Users can view own journals"
  ON public.daily_journals FOR SELECT
  TO authenticated
  USING (user_id = public.auth_uid());

CREATE POLICY "Users can insert own journals"
  ON public.daily_journals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "Users can update own journals"
  ON public.daily_journals FOR UPDATE
  TO authenticated
  USING (user_id = public.auth_uid())
  WITH CHECK (user_id = public.auth_uid());

CREATE POLICY "Users can delete own journals"
  ON public.daily_journals FOR DELETE
  TO authenticated
  USING (user_id = public.auth_uid());

-- ============================================================================
-- Updated At Trigger for Daily Journals
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_daily_journals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_journals_updated_at ON public.daily_journals;
CREATE TRIGGER daily_journals_updated_at
  BEFORE UPDATE ON public.daily_journals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_daily_journals_updated_at();

-- ============================================================================
-- Helper Functions for Desktop Activity
-- ============================================================================

-- Get user's activity summary for a date range
CREATE OR REPLACE FUNCTION public.get_desktop_activity_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_minutes INTEGER,
  avg_focus_score REAL,
  top_apps JSONB,
  daily_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH activity AS (
    SELECT
      dal.hour_start::DATE as activity_date,
      dal.total_minutes,
      dal.focus_score,
      dal.app_breakdown
    FROM desktop_activity_logs dal
    WHERE dal.user_id = p_user_id
      AND dal.hour_start::DATE BETWEEN p_start_date AND p_end_date
  ),
  daily AS (
    SELECT
      activity_date,
      SUM(total_minutes) as day_minutes,
      AVG(focus_score) as day_focus
    FROM activity
    GROUP BY activity_date
  ),
  app_totals AS (
    SELECT
      key as app_name,
      SUM((value::text)::integer) as total_mins
    FROM activity, jsonb_each(app_breakdown)
    GROUP BY key
    ORDER BY total_mins DESC
    LIMIT 10
  )
  SELECT
    COALESCE(SUM(d.day_minutes)::INTEGER, 0),
    COALESCE(AVG(d.day_focus)::REAL, 0),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('app', app_name, 'minutes', total_mins)) FROM app_totals), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('date', activity_date, 'minutes', day_minutes, 'focus', day_focus)) FROM daily), '[]'::jsonb)
  FROM daily d;
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.desktop_activity_logs IS 'Hourly activity summaries from SYNC Desktop Companion';
COMMENT ON TABLE public.daily_journals IS 'Daily productivity journals generated from desktop activity';
COMMENT ON FUNCTION public.get_desktop_activity_summary IS 'Get aggregated activity summary for a user in a date range';

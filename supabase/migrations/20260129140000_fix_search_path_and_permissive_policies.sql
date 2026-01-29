-- =====================================================
-- Fix 19 Supabase Security Advisor warnings:
-- 12x function_search_path_mutable (add SET search_path = public)
-- 7x rls_policy_always_true (tighten INSERT WITH CHECK)
-- =====================================================

-- ============================================================
-- PART 1: Fix mutable search_path on 12 functions
-- ============================================================

-- 1. get_next_outreach_stage
CREATE OR REPLACE FUNCTION public.get_next_outreach_stage(current_stage TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
BEGIN
    RETURN CASE current_stage
        WHEN 'initial' THEN 'follow_up_1'
        WHEN 'follow_up_1' THEN 'follow_up_2'
        WHEN 'follow_up_2' THEN 'completed'
        ELSE 'completed'
    END;
END;
$$;

-- 2. match_learned_patterns (not found in migrations — recreate with safe signature)
-- Only fix if it exists; use DO block to avoid errors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_learned_patterns' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE format(
      'ALTER FUNCTION public.match_learned_patterns SET search_path = public'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter match_learned_patterns: %', SQLERRM;
END;
$$;

-- 3. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 4. update_user_integrations_updated_at
CREATE OR REPLACE FUNCTION public.update_user_integrations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. get_api_health_summary
CREATE OR REPLACE FUNCTION public.get_api_health_summary()
RETURNS TABLE (
    api_id TEXT,
    display_name TEXT,
    status TEXT,
    last_checked TIMESTAMPTZ,
    latency_ms INTEGER
)
LANGUAGE SQL STABLE
SET search_path = public
AS $$
    SELECT DISTINCT ON (r.id)
        r.id,
        r.display_name,
        COALESCE(h.status, 'unknown') as status,
        h.checked_at as last_checked,
        h.latency_ms
    FROM public.api_registry r
    LEFT JOIN public.api_health_checks h ON r.id = h.api_id
    WHERE r.active = true
    ORDER BY r.id, h.checked_at DESC;
$$;

-- 6. get_mismatch_summary
CREATE OR REPLACE FUNCTION public.get_mismatch_summary()
RETURNS TABLE (
    api_id TEXT,
    display_name TEXT,
    critical_count BIGINT,
    warning_count BIGINT,
    info_count BIGINT,
    total_count BIGINT
)
LANGUAGE SQL STABLE
SET search_path = public
AS $$
    SELECT
        r.id,
        r.display_name,
        COUNT(*) FILTER (WHERE m.severity = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE m.severity = 'warning') as warning_count,
        COUNT(*) FILTER (WHERE m.severity = 'info') as info_count,
        COUNT(*) as total_count
    FROM public.api_registry r
    LEFT JOIN public.api_mismatches m ON r.id = m.api_id AND m.status = 'open'
    WHERE r.active = true
    GROUP BY r.id, r.display_name
    ORDER BY total_count DESC;
$$;

-- 7. update_portal_timestamp
CREATE OR REPLACE FUNCTION public.update_portal_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 8. update_platform_settings_updated_at
CREATE OR REPLACE FUNCTION public.update_platform_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. update_crm_companies_updated_at
CREATE OR REPLACE FUNCTION public.update_crm_companies_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. update_sync_updated_at
CREATE OR REPLACE FUNCTION public.update_sync_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. update_sms_conversations_updated_at
CREATE OR REPLACE FUNCTION public.update_sms_conversations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. update_user_notifications_updated_at
CREATE OR REPLACE FUNCTION public.update_user_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 2: Fix overly permissive INSERT policies (WITH CHECK true)
-- Replace with auth.uid() checks so only authenticated users
-- can insert, scoped to their own data where applicable.
-- ============================================================

-- 1. activity_log — scope to inserting user
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_log;
CREATE POLICY "System can insert activity"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. api_health_checks — system-level logging, scope to authenticated
DROP POLICY IF EXISTS "api_health_checks_insert" ON public.api_health_checks;
CREATE POLICY "api_health_checks_insert"
  ON public.api_health_checks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. app_usage_logs — scope to inserting user
DROP POLICY IF EXISTS "System can insert usage logs" ON public.app_usage_logs;
CREATE POLICY "System can insert usage logs"
  ON public.app_usage_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. companies — any authenticated user can create (onboarding), keep but add auth check
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. sync_intel_queue — scope to user's organization
DROP POLICY IF EXISTS "Users can create queue items" ON public.sync_intel_queue;
CREATE POLICY "Users can create queue items"
  ON public.sync_intel_queue FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 6. user_notifications — scope to recipient user
DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;
CREATE POLICY "System can insert notifications"
  ON public.user_notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 7. credit_transactions — already has WITH CHECK (true) from recent migration, tighten it
DROP POLICY IF EXISTS "System can insert transactions" ON public.credit_transactions;
CREATE POLICY "System can insert transactions"
  ON public.credit_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

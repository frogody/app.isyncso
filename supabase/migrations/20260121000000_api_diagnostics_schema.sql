-- API Diagnostics Schema
-- Tables for tracking API health, crawled specs, and detected mismatches

-- =============================================================================
-- API Registry Table
-- Stores information about registered external APIs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_registry (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    docs_url TEXT,
    openapi_url TEXT,
    environment_key TEXT NOT NULL,
    files TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default registry entries
INSERT INTO public.api_registry (id, name, display_name, base_url, docs_url, environment_key, files, active)
VALUES
    ('explorium', 'explorium', 'Explorium', 'https://api.explorium.ai/v1', 'https://developers.explorium.ai/reference/', 'EXPLORIUM_API_KEY', ARRAY['explorium-enrich/index.ts', 'exploriumPeople/index.ts', 'exploriumFirmographics/index.ts'], true),
    ('together', 'together', 'Together.ai', 'https://api.together.xyz/v1', 'https://docs.together.ai', 'TOGETHER_API_KEY', ARRAY['generate-image/index.ts', 'research-product/index.ts', 'sync-voice/index.ts'], true),
    ('google', 'google', 'Google Gemini', 'https://generativelanguage.googleapis.com', 'https://ai.google.dev/docs', 'GOOGLE_API_KEY', ARRAY['generate-image/index.ts', 'generate-video/index.ts', 'process-invoice/index.ts'], true),
    ('groq', 'groq', 'Groq', 'https://api.groq.com/openai/v1', 'https://console.groq.com/docs', 'GROQ_API_KEY', ARRAY['process-invoice/index.ts'], true),
    ('tavily', 'tavily', 'Tavily Search', 'https://api.tavily.com', 'https://docs.tavily.com', 'TAVILY_API_KEY', ARRAY['research-product/index.ts', 'research-supplier/index.ts'], true),
    ('composio', 'composio', 'Composio', 'https://backend.composio.dev/api', 'https://docs.composio.dev', 'COMPOSIO_API_KEY', ARRAY['composio-connect/index.ts'], true)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    base_url = EXCLUDED.base_url,
    docs_url = EXCLUDED.docs_url,
    files = EXCLUDED.files,
    updated_at = NOW();

-- =============================================================================
-- API Crawled Specs Table
-- Stores parsed API documentation from Firecrawl
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_crawled_specs (
    api_id TEXT PRIMARY KEY REFERENCES public.api_registry(id) ON DELETE CASCADE,
    version TEXT,
    crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    endpoints JSONB DEFAULT '[]',
    schemas JSONB DEFAULT '[]',
    authentication JSONB,
    rate_limits JSONB,
    raw_markdown TEXT,
    source_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_api_crawled_specs_version ON public.api_crawled_specs(version);

-- =============================================================================
-- API Mismatches Table
-- Stores detected discrepancies between docs and implementation
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_mismatches (
    id TEXT PRIMARY KEY,
    api_id TEXT NOT NULL REFERENCES public.api_registry(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    type TEXT NOT NULL CHECK (type IN (
        'endpoint_not_found',
        'endpoint_deprecated',
        'field_renamed',
        'field_removed',
        'field_type_changed',
        'field_required_changed',
        'authentication_changed',
        'rate_limit_changed',
        'schema_mismatch',
        'breaking_change'
    )),
    description TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    implementation JSONB NOT NULL,
    expected JSONB,
    auto_fixable BOOLEAN DEFAULT false,
    suggested_fix JSONB,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'fix_generated', 'fixed', 'ignored', 'false_positive')),
    fixed_at TIMESTAMPTZ,
    fixed_by UUID REFERENCES auth.users(id),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for mismatch queries
CREATE INDEX IF NOT EXISTS idx_api_mismatches_api_id ON public.api_mismatches(api_id);
CREATE INDEX IF NOT EXISTS idx_api_mismatches_status ON public.api_mismatches(status);
CREATE INDEX IF NOT EXISTS idx_api_mismatches_severity ON public.api_mismatches(severity);
CREATE INDEX IF NOT EXISTS idx_api_mismatches_file_path ON public.api_mismatches(file_path);

-- =============================================================================
-- API Health Checks Table
-- Stores connectivity test results
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id TEXT NOT NULL REFERENCES public.api_registry(id) ON DELETE CASCADE,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    latency_ms INTEGER,
    auth_valid BOOLEAN,
    endpoints_checked INTEGER DEFAULT 0,
    endpoints_passed INTEGER DEFAULT 0,
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for health check queries
CREATE INDEX IF NOT EXISTS idx_api_health_checks_api_id ON public.api_health_checks(api_id);
CREATE INDEX IF NOT EXISTS idx_api_health_checks_checked_at ON public.api_health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_health_checks_status ON public.api_health_checks(status);

-- Index for cleanup queries (partial indexes can't use NOW(), use plain index instead)
CREATE INDEX IF NOT EXISTS idx_api_health_checks_cleanup ON public.api_health_checks(checked_at);

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.api_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_crawled_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_mismatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_health_checks ENABLE ROW LEVEL SECURITY;

-- API Registry: Read-only for authenticated users, manage for admins
CREATE POLICY "api_registry_select" ON public.api_registry
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "api_registry_all_admin" ON public.api_registry
    FOR ALL TO authenticated
    USING (public.auth_hierarchy_level() >= 80);

-- API Crawled Specs: Read for authenticated, manage for admins
CREATE POLICY "api_crawled_specs_select" ON public.api_crawled_specs
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "api_crawled_specs_all_admin" ON public.api_crawled_specs
    FOR ALL TO authenticated
    USING (public.auth_hierarchy_level() >= 80);

-- API Mismatches: Read for authenticated, manage for admins
CREATE POLICY "api_mismatches_select" ON public.api_mismatches
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "api_mismatches_all_admin" ON public.api_mismatches
    FOR ALL TO authenticated
    USING (public.auth_hierarchy_level() >= 80);

-- API Health Checks: Read for authenticated, insert for anyone (edge function), manage for admins
CREATE POLICY "api_health_checks_select" ON public.api_health_checks
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "api_health_checks_insert" ON public.api_health_checks
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "api_health_checks_all_admin" ON public.api_health_checks
    FOR ALL TO authenticated
    USING (public.auth_hierarchy_level() >= 80);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER api_registry_updated_at
    BEFORE UPDATE ON public.api_registry
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER api_crawled_specs_updated_at
    BEFORE UPDATE ON public.api_crawled_specs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER api_mismatches_updated_at
    BEFORE UPDATE ON public.api_mismatches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Scheduled Cleanup Job (using pg_cron if available)
-- =============================================================================

-- Uncomment if pg_cron is installed
-- SELECT cron.schedule(
--     'cleanup-old-health-checks',
--     '0 3 * * *', -- Daily at 3am
--     $$DELETE FROM public.api_health_checks WHERE checked_at < NOW() - INTERVAL '30 days'$$
-- );

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Get latest health status for all APIs
CREATE OR REPLACE FUNCTION public.get_api_health_summary()
RETURNS TABLE (
    api_id TEXT,
    display_name TEXT,
    status TEXT,
    last_checked TIMESTAMPTZ,
    latency_ms INTEGER
) LANGUAGE SQL STABLE AS $$
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

-- Get open mismatches count by severity
CREATE OR REPLACE FUNCTION public.get_mismatch_summary()
RETURNS TABLE (
    api_id TEXT,
    display_name TEXT,
    critical_count BIGINT,
    warning_count BIGINT,
    info_count BIGINT,
    total_count BIGINT
) LANGUAGE SQL STABLE AS $$
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_api_health_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mismatch_summary() TO authenticated;

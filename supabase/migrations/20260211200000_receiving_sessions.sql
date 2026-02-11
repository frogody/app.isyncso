-- Phase 2: Receiving Sessions
-- Creates the receiving_sessions table, links receiving_log, and sets up RLS

-- 1. Create receiving_sessions table
CREATE TABLE receiving_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    started_by UUID REFERENCES auth.users(id),
    closed_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    total_items_received INTEGER DEFAULT 0,
    total_eans_scanned INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add receiving_session_id to receiving_log
ALTER TABLE receiving_log ADD COLUMN receiving_session_id UUID REFERENCES receiving_sessions(id);

-- 3. RLS policies (company_id scoping via auth_company_id())
ALTER TABLE receiving_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receiving_sessions_select" ON receiving_sessions
FOR SELECT TO authenticated
USING (company_id = auth_company_id());

CREATE POLICY "receiving_sessions_insert" ON receiving_sessions
FOR INSERT TO authenticated
WITH CHECK (company_id = auth_company_id());

CREATE POLICY "receiving_sessions_update" ON receiving_sessions
FOR UPDATE TO authenticated
USING (company_id = auth_company_id());

-- 4. Indexes for fast lookups
CREATE INDEX idx_receiving_sessions_company ON receiving_sessions(company_id);
CREATE INDEX idx_receiving_sessions_status ON receiving_sessions(company_id, status);
CREATE INDEX idx_receiving_log_session ON receiving_log(receiving_session_id);

-- ============================================================================
-- Trust Score Infrastructure (Phase 1.3 / I-4)
--
-- Tracks per-user, per-action-type trust levels that govern SYNC Agent
-- autonomy. The system starts every action type at Level 1 (Surfaces Insight)
-- and graduates through demonstrated accuracy:
--   Level 1: Surfaces Insight     (informational only)
--   Level 2: Recommends Action    (shows reasoning)
--   Level 3: Prepares for Approval (drafts for review)
--   Level 4: Acts Autonomously    (with undo window)
--
-- Category caps per TRANSFORMATION_ARCHITECTURE.md Section 2.4:
--   informational  -> max Level 2
--   administrative -> max Level 4
--   communication  -> max Level 3
--   financial      -> max Level 3
--   financial_exec -> max Level 3
--   pricing        -> max Level 2
--   compliance     -> max Level 3
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: trust_scores
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trust_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  company_id      UUID NOT NULL,
  action_type     TEXT NOT NULL,         -- e.g. "invoice_draft", "stock_reorder", "email_reminder"
  category        TEXT NOT NULL DEFAULT 'administrative'
                    CHECK (category IN (
                      'informational',
                      'administrative',
                      'communication',
                      'financial',
                      'financial_exec',
                      'pricing',
                      'compliance'
                    )),
  current_level   INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 4),
  accuracy_count  INTEGER NOT NULL DEFAULT 0,  -- consecutive correct actions (resets on error)
  error_count     INTEGER NOT NULL DEFAULT 0,  -- errors within rolling 30-day window
  total_actions   INTEGER NOT NULL DEFAULT 0,  -- lifetime actions
  total_approvals INTEGER NOT NULL DEFAULT 0,  -- lifetime approvals (no modification)
  total_rejections INTEGER NOT NULL DEFAULT 0, -- lifetime rejections
  total_modifications INTEGER NOT NULL DEFAULT 0, -- lifetime significant modifications
  last_error_at   TIMESTAMPTZ,
  graduated_at    TIMESTAMPTZ[] DEFAULT '{}',  -- timestamps of each level-up
  demoted_at      TIMESTAMPTZ[] DEFAULT '{}',  -- timestamps of each demotion
  user_cap_level  INTEGER,                      -- user-imposed maximum level (NULL = use category cap)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One trust score per user per action type per company
  UNIQUE(user_id, company_id, action_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: trust_audit_log
-- Records every trust-relevant event for transparency (Section 2.5)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trust_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  company_id      UUID NOT NULL,
  action_type     TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN (
                    'action_proposed',     -- system proposed an action
                    'action_approved',     -- user approved without changes
                    'action_modified',     -- user modified before approving
                    'action_rejected',     -- user rejected
                    'action_auto',         -- system acted autonomously (Level 4)
                    'action_undone',       -- user undid an autonomous action
                    'insight_viewed',      -- user viewed an insight (Level 1)
                    'insight_dismissed',   -- user dismissed an insight
                    'graduated',           -- trust level increased
                    'demoted',             -- trust level decreased
                    'user_cap_set'         -- user manually set a cap
                  )),
  from_level      INTEGER,
  to_level        INTEGER,
  details         JSONB DEFAULT '{}',    -- action-specific context, reasoning chain
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trust_scores_user_company
  ON public.trust_scores(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_trust_scores_company
  ON public.trust_scores(company_id);

CREATE INDEX IF NOT EXISTS idx_trust_audit_log_user_company
  ON public.trust_audit_log(user_id, company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_audit_log_action
  ON public.trust_audit_log(action_type, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_audit_log ENABLE ROW LEVEL SECURITY;

-- trust_scores: users see their own rows within their company
CREATE POLICY "trust_scores_select" ON public.trust_scores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND company_id = auth_company_id());

CREATE POLICY "trust_scores_insert" ON public.trust_scores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND company_id = auth_company_id());

CREATE POLICY "trust_scores_update" ON public.trust_scores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND company_id = auth_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = auth_company_id());

-- trust_audit_log: users see their own audit trail
CREATE POLICY "trust_audit_select" ON public.trust_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND company_id = auth_company_id());

CREATE POLICY "trust_audit_insert" ON public.trust_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND company_id = auth_company_id());

-- Service role can do everything (for edge functions)
CREATE POLICY "trust_scores_service" ON public.trust_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "trust_audit_service" ON public.trust_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- get_trust_level: Returns the effective trust level for an action type.
-- Uses the minimum of: current_level, category cap, user cap.
-- If no row exists, returns Level 1 (default).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_trust_level(
  p_user_id    UUID,
  p_company_id UUID,
  p_action_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row        trust_scores%ROWTYPE;
  v_cat_cap    INTEGER;
  v_effective  INTEGER;
BEGIN
  -- Fetch the trust score row
  SELECT * INTO v_row
  FROM trust_scores
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND action_type = p_action_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'action_type',    p_action_type,
      'current_level',  1,
      'effective_level', 1,
      'category',       'administrative',
      'category_cap',   4,
      'user_cap',       NULL,
      'accuracy_count', 0,
      'total_actions',  0,
      'exists',         false
    );
  END IF;

  -- Determine category cap
  v_cat_cap := CASE v_row.category
    WHEN 'informational'  THEN 2
    WHEN 'administrative' THEN 4
    WHEN 'communication'  THEN 3
    WHEN 'financial'      THEN 3
    WHEN 'financial_exec' THEN 3
    WHEN 'pricing'        THEN 2
    WHEN 'compliance'     THEN 3
    ELSE 2
  END;

  -- Effective level = min(current_level, category_cap, user_cap)
  v_effective := LEAST(
    v_row.current_level,
    v_cat_cap,
    COALESCE(v_row.user_cap_level, 4)
  );

  RETURN jsonb_build_object(
    'action_type',     v_row.action_type,
    'current_level',   v_row.current_level,
    'effective_level',  v_effective,
    'category',        v_row.category,
    'category_cap',    v_cat_cap,
    'user_cap',        v_row.user_cap_level,
    'accuracy_count',  v_row.accuracy_count,
    'error_count',     v_row.error_count,
    'total_actions',   v_row.total_actions,
    'graduated_at',    to_jsonb(v_row.graduated_at),
    'exists',          true
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- update_trust_score: Records an action outcome and updates accuracy tracking.
-- Called after every trust-governed action completes.
--
-- p_outcome: 'approved' | 'modified' | 'rejected' | 'auto' | 'undone'
--            | 'viewed' | 'dismissed'
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_trust_score(
  p_user_id     UUID,
  p_company_id  UUID,
  p_action_type TEXT,
  p_category    TEXT DEFAULT 'administrative',
  p_outcome     TEXT DEFAULT 'approved',
  p_details     JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row         trust_scores%ROWTYPE;
  v_new_acc     INTEGER;
  v_new_err     INTEGER;
  v_new_total   INTEGER;
  v_audit_type  TEXT;
BEGIN
  -- Validate outcome
  IF p_outcome NOT IN ('approved', 'modified', 'rejected', 'auto', 'undone', 'viewed', 'dismissed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome: ' || p_outcome);
  END IF;

  -- Upsert the trust score row
  INSERT INTO trust_scores (user_id, company_id, action_type, category)
  VALUES (p_user_id, p_company_id, p_action_type, p_category)
  ON CONFLICT (user_id, company_id, action_type) DO NOTHING;

  -- Lock the row for update
  SELECT * INTO v_row
  FROM trust_scores
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND action_type = p_action_type
  FOR UPDATE;

  -- Compute new counters based on outcome
  v_new_acc   := v_row.accuracy_count;
  v_new_err   := v_row.error_count;
  v_new_total := v_row.total_actions + 1;

  CASE p_outcome
    WHEN 'approved' THEN
      v_new_acc := v_new_acc + 1;
      v_audit_type := 'action_approved';

      UPDATE trust_scores SET
        accuracy_count  = v_new_acc,
        total_actions   = v_new_total,
        total_approvals = total_approvals + 1,
        updated_at      = NOW()
      WHERE id = v_row.id;

    WHEN 'modified' THEN
      -- Significant modification counts as 0.5 error against streak
      -- We track this by resetting accuracy if modification is significant
      -- (caller indicates significance in details.significant)
      IF (p_details->>'significant')::boolean IS TRUE THEN
        v_new_acc := GREATEST(v_new_acc - 2, 0);  -- partial penalty
        v_new_err := v_new_err + 1;
      ELSE
        v_new_acc := v_new_acc + 1;  -- minor modification still counts as success
      END IF;
      v_audit_type := 'action_modified';

      UPDATE trust_scores SET
        accuracy_count      = v_new_acc,
        error_count         = v_new_err,
        total_actions       = v_new_total,
        total_modifications = total_modifications + 1,
        updated_at          = NOW()
      WHERE id = v_row.id;

    WHEN 'rejected' THEN
      v_new_acc := 0;  -- streak resets
      v_new_err := v_new_err + 1;
      v_audit_type := 'action_rejected';

      UPDATE trust_scores SET
        accuracy_count   = 0,
        error_count      = v_new_err,
        total_actions    = v_new_total,
        total_rejections = total_rejections + 1,
        last_error_at    = NOW(),
        updated_at       = NOW()
      WHERE id = v_row.id;

    WHEN 'auto' THEN
      -- Autonomous action completed (Level 4)
      v_new_acc := v_new_acc + 1;
      v_audit_type := 'action_auto';

      UPDATE trust_scores SET
        accuracy_count  = v_new_acc,
        total_actions   = v_new_total,
        total_approvals = total_approvals + 1,
        updated_at      = NOW()
      WHERE id = v_row.id;

    WHEN 'undone' THEN
      -- User undid an autonomous action -> immediate demotion handled by demote_trust
      v_new_acc := 0;
      v_new_err := v_new_err + 1;
      v_audit_type := 'action_undone';

      UPDATE trust_scores SET
        accuracy_count   = 0,
        error_count      = v_new_err,
        total_actions    = v_new_total,
        total_rejections = total_rejections + 1,
        last_error_at    = NOW(),
        updated_at       = NOW()
      WHERE id = v_row.id;

    WHEN 'viewed' THEN
      v_new_acc := v_new_acc + 1;
      v_audit_type := 'insight_viewed';

      UPDATE trust_scores SET
        accuracy_count = v_new_acc,
        total_actions  = v_new_total,
        updated_at     = NOW()
      WHERE id = v_row.id;

    WHEN 'dismissed' THEN
      v_new_acc := 0;
      v_audit_type := 'insight_dismissed';

      UPDATE trust_scores SET
        accuracy_count = 0,
        total_actions  = v_new_total,
        updated_at     = NOW()
      WHERE id = v_row.id;
  END CASE;

  -- Write audit log
  INSERT INTO trust_audit_log (user_id, company_id, action_type, event_type, details)
  VALUES (p_user_id, p_company_id, p_action_type, v_audit_type, p_details);

  RETURN jsonb_build_object(
    'success',        true,
    'accuracy_count', v_new_acc,
    'error_count',    v_new_err,
    'total_actions',  v_new_total,
    'current_level',  v_row.current_level
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- graduate_trust: Attempts to graduate an action type to the next trust level.
-- Enforces the graduation criteria from Section 2.3:
--   1->2: 5 consecutive insights viewed without dismissal
--   2->3: 10 consecutive recommendations accepted without modification
--   3->4: 20 consecutive prepared actions approved unchanged + user opt-in
-- Also enforces category caps and user caps.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.graduate_trust(
  p_user_id     UUID,
  p_company_id  UUID,
  p_action_type TEXT,
  p_user_opt_in BOOLEAN DEFAULT false  -- required for Level 3->4 graduation
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row       trust_scores%ROWTYPE;
  v_cat_cap   INTEGER;
  v_eff_cap   INTEGER;
  v_threshold INTEGER;
  v_new_level INTEGER;
BEGIN
  SELECT * INTO v_row
  FROM trust_scores
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND action_type = p_action_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No trust score found for this action type');
  END IF;

  -- Category cap
  v_cat_cap := CASE v_row.category
    WHEN 'informational'  THEN 2
    WHEN 'administrative' THEN 4
    WHEN 'communication'  THEN 3
    WHEN 'financial'      THEN 3
    WHEN 'financial_exec' THEN 3
    WHEN 'pricing'        THEN 2
    WHEN 'compliance'     THEN 3
    ELSE 2
  END;

  -- Effective cap = min(category_cap, user_cap)
  v_eff_cap := LEAST(v_cat_cap, COALESCE(v_row.user_cap_level, 4));

  -- Already at or above cap
  IF v_row.current_level >= v_eff_cap THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'Already at maximum level for this category',
      'current_level', v_row.current_level,
      'cap',       v_eff_cap
    );
  END IF;

  -- Graduation thresholds
  v_threshold := CASE v_row.current_level
    WHEN 1 THEN 5   -- 5 insights viewed without dismissal
    WHEN 2 THEN 10  -- 10 consecutive accepted recommendations
    WHEN 3 THEN 20  -- 20 consecutive approved actions unchanged
    ELSE 999         -- should not happen
  END;

  -- Check accuracy streak meets threshold
  IF v_row.accuracy_count < v_threshold THEN
    RETURN jsonb_build_object(
      'success',         false,
      'error',           'Accuracy streak not met',
      'current_level',   v_row.current_level,
      'accuracy_count',  v_row.accuracy_count,
      'required',        v_threshold
    );
  END IF;

  -- Level 3->4 requires explicit user opt-in
  IF v_row.current_level = 3 AND NOT p_user_opt_in THEN
    RETURN jsonb_build_object(
      'success',       false,
      'error',         'User opt-in required for Level 4 (autonomous)',
      'current_level', v_row.current_level,
      'accuracy_met',  true
    );
  END IF;

  -- Graduate!
  v_new_level := v_row.current_level + 1;

  UPDATE trust_scores SET
    current_level  = v_new_level,
    accuracy_count = 0,  -- reset streak for next graduation
    graduated_at   = graduated_at || ARRAY[NOW()],
    updated_at     = NOW()
  WHERE id = v_row.id;

  -- Audit log
  INSERT INTO trust_audit_log (user_id, company_id, action_type, event_type, from_level, to_level, details)
  VALUES (p_user_id, p_company_id, p_action_type, 'graduated', v_row.current_level, v_new_level,
          jsonb_build_object(
            'accuracy_at_graduation', v_row.accuracy_count,
            'total_actions', v_row.total_actions,
            'user_opt_in', p_user_opt_in
          ));

  RETURN jsonb_build_object(
    'success',       true,
    'from_level',    v_row.current_level,
    'to_level',      v_new_level,
    'category_cap',  v_cat_cap,
    'action_type',   p_action_type
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- demote_trust: Demotes an action type by one trust level.
-- Triggered by:
--   - User undoes an autonomous action (Level 4) -> immediate demotion to 3
--   - 3 errors within 30 days at any level -> demotion by one level
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.demote_trust(
  p_user_id     UUID,
  p_company_id  UUID,
  p_action_type TEXT,
  p_reason      TEXT DEFAULT 'manual'  -- 'undo', 'error_threshold', 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row       trust_scores%ROWTYPE;
  v_new_level INTEGER;
  v_recent_errors INTEGER;
BEGIN
  SELECT * INTO v_row
  FROM trust_scores
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND action_type = p_action_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No trust score found for this action type');
  END IF;

  -- Cannot demote below Level 1
  IF v_row.current_level <= 1 THEN
    RETURN jsonb_build_object(
      'success',       false,
      'error',         'Already at minimum level',
      'current_level', 1
    );
  END IF;

  -- For 'error_threshold' reason, verify 3+ errors in last 30 days
  IF p_reason = 'error_threshold' THEN
    SELECT COUNT(*) INTO v_recent_errors
    FROM trust_audit_log
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND action_type = p_action_type
      AND event_type IN ('action_rejected', 'action_undone')
      AND created_at > NOW() - INTERVAL '30 days';

    IF v_recent_errors < 3 THEN
      RETURN jsonb_build_object(
        'success',        false,
        'error',          'Fewer than 3 errors in 30 days',
        'recent_errors',  v_recent_errors,
        'current_level',  v_row.current_level
      );
    END IF;
  END IF;

  v_new_level := v_row.current_level - 1;

  UPDATE trust_scores SET
    current_level  = v_new_level,
    accuracy_count = 0,  -- reset streak
    error_count    = 0,  -- reset error count after demotion
    demoted_at     = demoted_at || ARRAY[NOW()],
    updated_at     = NOW()
  WHERE id = v_row.id;

  -- Audit log
  INSERT INTO trust_audit_log (user_id, company_id, action_type, event_type, from_level, to_level, details)
  VALUES (p_user_id, p_company_id, p_action_type, 'demoted', v_row.current_level, v_new_level,
          jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object(
    'success',       true,
    'from_level',    v_row.current_level,
    'to_level',      v_new_level,
    'reason',        p_reason,
    'action_type',   p_action_type
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- set_trust_user_cap: Allows users to cap trust level for any action type.
-- This is the "Settings > SYNC Autonomy" toggle from Section 2.5.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_trust_user_cap(
  p_user_id     UUID,
  p_company_id  UUID,
  p_action_type TEXT,
  p_cap_level   INTEGER  -- 1-4, or NULL to remove cap
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row trust_scores%ROWTYPE;
BEGIN
  -- Validate cap level
  IF p_cap_level IS NOT NULL AND (p_cap_level < 1 OR p_cap_level > 4) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cap level must be 1-4 or NULL');
  END IF;

  -- Upsert the row
  INSERT INTO trust_scores (user_id, company_id, action_type, user_cap_level)
  VALUES (p_user_id, p_company_id, p_action_type, p_cap_level)
  ON CONFLICT (user_id, company_id, action_type)
  DO UPDATE SET
    user_cap_level = p_cap_level,
    updated_at = NOW();

  -- If current level exceeds new cap, demote immediately
  SELECT * INTO v_row
  FROM trust_scores
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND action_type = p_action_type;

  IF p_cap_level IS NOT NULL AND v_row.current_level > p_cap_level THEN
    UPDATE trust_scores SET
      current_level  = p_cap_level,
      accuracy_count = 0,
      updated_at     = NOW()
    WHERE id = v_row.id;
  END IF;

  -- Audit log
  INSERT INTO trust_audit_log (user_id, company_id, action_type, event_type, details)
  VALUES (p_user_id, p_company_id, p_action_type, 'user_cap_set',
          jsonb_build_object('cap_level', p_cap_level));

  RETURN jsonb_build_object(
    'success',   true,
    'cap_level', p_cap_level,
    'action_type', p_action_type
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- get_all_trust_levels: Returns all trust scores for a user in their company.
-- Used by the "Settings > SYNC Autonomy" UI (Section 2.5).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_all_trust_levels(
  p_user_id    UUID,
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'action_type',    ts.action_type,
      'category',       ts.category,
      'current_level',  ts.current_level,
      'effective_level', LEAST(
        ts.current_level,
        CASE ts.category
          WHEN 'informational'  THEN 2
          WHEN 'administrative' THEN 4
          WHEN 'communication'  THEN 3
          WHEN 'financial'      THEN 3
          WHEN 'financial_exec' THEN 3
          WHEN 'pricing'        THEN 2
          WHEN 'compliance'     THEN 3
          ELSE 2
        END,
        COALESCE(ts.user_cap_level, 4)
      ),
      'category_cap', CASE ts.category
        WHEN 'informational'  THEN 2
        WHEN 'administrative' THEN 4
        WHEN 'communication'  THEN 3
        WHEN 'financial'      THEN 3
        WHEN 'financial_exec' THEN 3
        WHEN 'pricing'        THEN 2
        WHEN 'compliance'     THEN 3
        ELSE 2
      END,
      'user_cap',         ts.user_cap_level,
      'accuracy_count',   ts.accuracy_count,
      'error_count',      ts.error_count,
      'total_actions',    ts.total_actions,
      'total_approvals',  ts.total_approvals,
      'total_rejections', ts.total_rejections,
      'graduated_at',     to_jsonb(ts.graduated_at),
      'demoted_at',       to_jsonb(ts.demoted_at),
      'updated_at',       ts.updated_at
    ) ORDER BY ts.category, ts.action_type
  ), '[]'::jsonb)
  INTO v_result
  FROM trust_scores ts
  WHERE ts.user_id = p_user_id
    AND ts.company_id = p_company_id;

  RETURN v_result;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Grant execute permissions
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_trust_level(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_trust_score(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.graduate_trust(UUID, UUID, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.demote_trust(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_trust_user_cap(UUID, UUID, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_trust_levels(UUID, UUID) TO authenticated, service_role;

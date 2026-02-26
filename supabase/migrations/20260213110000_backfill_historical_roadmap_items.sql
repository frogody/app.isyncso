-- ============================================================
-- Backfill ~26 historical roadmap items
-- These features were shipped but never tracked in roadmap_items.
-- Derived from CLAUDE.md: Blueprint Build Progress, Recent Fixes,
-- and module documentation.
-- ============================================================

INSERT INTO public.roadmap_items (title, description, priority, category, status, effort, tags, history, comments, subtasks, created_at)
VALUES

-- ─── Platform / Admin ───────────────────────────────────────────
('RBAC system with 6 role levels',
 'Implement role-based access control with super_admin, admin, manager, user, learner, and viewer roles. Includes PermissionGuard, RoleGuard, AdminGuard components and database RLS helpers.',
 'critical', 'admin', 'done', 'xl',
 '["security","backend","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-05T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-10T18:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-05T10:00:00Z'),

('Admin Panel foundation',
 'Platform settings, feature flags, audit logging, and platform admin management tables with full CRUD UI.',
 'high', 'admin', 'done', 'l',
 '["backend","database","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-23T09:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-25T16:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-23T09:00:00Z'),

('Roadmap management system',
 'Full roadmap page with Journey Road, List, Kanban, and Tree views. CRUD, realtime subscriptions, comments, subtasks, history tracking, auto-queue for Claude Code.',
 'high', 'admin', 'done', 'xl',
 '["frontend","ux","backend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-25T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-01T12:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-25T10:00:00Z'),

-- ─── SYNC Agent ─────────────────────────────────────────────────
('SYNC Agent — 51 actions across 10 modules',
 'AI orchestrator using Kimi-K2 via Together.ai. 51 actions: Finance (8), Products (6), Growth/CRM (9), Tasks (8), Inbox (5), Team (6), Learn (4), Sentinel (3), Create (2), Research (2). Multi-agent workflows, streaming responses.',
 'critical', 'sync_agent', 'done', 'xl',
 '["ai","backend","edge-function"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-08T08:00:00Z"},{"action":"Status: in_progress → done","actor":"user","at":"2026-01-20T14:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-08T08:00:00Z'),

('SYNC persistent memory system',
 'Session persistence (sync_sessions), RAG vectors (sync_memory_chunks with 1024-dim embeddings), and action templates (sync_action_templates). Replaces in-memory Map.',
 'high', 'sync_agent', 'done', 'l',
 '["ai","database","backend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-12T09:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-14T17:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-12T09:00:00Z'),

-- ─── Finance ────────────────────────────────────────────────────
('AI invoice processing (pdf.js + Groq)',
 'Client-side PDF text extraction with pdf.js, server-side structured data extraction with Groq Llama 3.3 70B. Async processing, auto-creates expense records.',
 'high', 'finance', 'done', 'l',
 '["ai","edge-function","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-10T11:00:00Z"},{"action":"Status: in_progress → done","actor":"user","at":"2026-01-11T20:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-10T11:00:00Z'),

-- ─── Products ───────────────────────────────────────────────────
('Inventory management system',
 'Complete product inventory with locations, stock tracking, low-stock alerts, product images, pricing tiers, and sales channel management.',
 'critical', 'products', 'done', 'xl',
 '["backend","database","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-07T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-15T16:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-07T08:00:00Z'),

-- ─── Talent ─────────────────────────────────────────────────────
('Talent Nests marketplace',
 'Browse, purchase, and manage candidate pools (Nests). Marketplace with preview, Stripe purchase flow, auto-intel queue on purchase.',
 'high', 'talent', 'done', 'xl',
 '["frontend","backend","database"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-20T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-26T18:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-20T10:00:00Z'),

('SYNC Intel — candidate intelligence',
 'Background intel processing via sync_intel_queue. Generates intelligence_score, flight risk, timing signals, outreach hooks, company pain points, career trajectory.',
 'high', 'talent', 'done', 'l',
 '["ai","edge-function","backend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-22T09:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-26T14:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-22T09:00:00Z'),

('Campaign Wizard (5-step)',
 '5-step wizard: Project → Role → Context → Match Weights → Review. Criteria weighting with presets, signal-based matching config.',
 'high', 'talent', 'done', 'l',
 '["frontend","ux"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-24T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-28T16:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-24T10:00:00Z'),

('Smart AI matching with weighted criteria & signals',
 'Multi-stage matching: rule-based pre-filter → deep AI analysis (Groq, 6 scoring dimensions) → signal detection & boosting. Custom weights per campaign.',
 'critical', 'talent', 'done', 'xl',
 '["ai","edge-function","backend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-26T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-28T20:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-26T08:00:00Z'),

('Hyper-personalized outreach generation',
 'AI message generation using all intelligence data, match scores, role context. Supports email/LinkedIn/SMS, multi-stage follow-ups.',
 'high', 'talent', 'done', 'l',
 '["ai","edge-function"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-26T14:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-28T18:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-26T14:00:00Z'),

('SMS outreach via Twilio',
 'Direct SMS to candidates using Twilio. Phone number management, AI message generation, webhook handling for replies.',
 'medium', 'talent', 'done', 'l',
 '["backend","edge-function","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-27T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-29T16:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-27T10:00:00Z'),

('Client candidate exclusion system',
 'Prevents contacting candidates who work for clients. Smart company matching (exact, alias, trigram fuzzy). Retroactive exclusion, recovery, guards in matching and intel processing.',
 'high', 'talent', 'done', 'l',
 '["database","backend","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-02-01T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-02T18:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-02-01T10:00:00Z'),

('LinkedIn skills & career data enrichment',
 'Work history, education, certifications, interests from LinkedIn. Panel customization with usePanelPreferences hook. Polymorphic data handling for Explorium API responses.',
 'medium', 'talent', 'done', 'l',
 '["frontend","database","enhancement"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-28T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-28T20:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-28T08:00:00Z'),

-- ─── Integrations ───────────────────────────────────────────────
('Composio integration — 30+ services',
 'OAuth flow for HubSpot, Salesforce, Slack, Teams, Gmail, Google Calendar, Notion, Jira, GitHub, Stripe, and 20+ more. Auto token refresh, webhook triggers.',
 'high', 'integrations', 'done', 'xl',
 '["backend","edge-function","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-11T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-18T14:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-11T10:00:00Z'),

('Explorium enrichment cache',
 'Global caching for Explorium API responses. 90-day TTL for prospects, 180-day for companies. Shared across orgs, upsert on key, server-side only.',
 'medium', 'integrations', 'done', 'm',
 '["backend","database","performance"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-02-02T09:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-02T16:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-02-02T09:00:00Z'),

-- ─── Infrastructure ─────────────────────────────────────────────
('RLS performance optimization — 1720 warnings → 0',
 'Created STABLE SECURITY DEFINER wrapper functions (auth_uid, auth_role, auth_company_id, auth_hierarchy_level, user_in_company). Replaced all volatile auth() calls, consolidated duplicate policies, removed redundant service_role policies.',
 'critical', 'infrastructure', 'done', 'xl',
 '["database","performance","security"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-11T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-11T20:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-11T08:00:00Z'),

('UI color palette unification — cyan/blue',
 'Migrated entire platform to unified cyan/blue palette. 19 product components, integrations, workspace, action components. Removed inconsistent green/amber/orange/pink colors.',
 'medium', 'platform', 'done', 'l',
 '["frontend","design","ux"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-30T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-30T20:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-30T08:00:00Z'),

-- ─── Sentinel ───────────────────────────────────────────────────
('SENTINEL — EU AI Act compliance module',
 'Dashboard, AI system inventory (paginated), compliance roadmap with timeline, document generator (Annex IV tech docs, Article 47 conformity). Risk assessment wizard (5 steps), CIDE AI research integration.',
 'high', 'sentinel', 'done', 'xl',
 '["frontend","backend","ai"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-31T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-01T16:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-31T08:00:00Z'),

-- ─── Create ─────────────────────────────────────────────────────
('AI image generation with FLUX models',
 'Three model tiers: FLUX Kontext Pro (product images with reference), FLUX Pro (marketing/creative), FLUX Schnell (quick drafts). Prompt enhancement, generated-content storage bucket.',
 'high', 'create', 'done', 'l',
 '["ai","edge-function","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-09T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-14T14:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-09T10:00:00Z'),

('Brand assets storage & management',
 'brand-assets storage bucket with public read, authenticated upload/update/delete RLS policies. Company logo management.',
 'low', 'create', 'done', 's',
 '["backend","database"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-01-10T14:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-01-10T17:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-01-10T14:00:00Z'),

-- ─── Marketplace / Blueprint ────────────────────────────────────
('Blueprint Phase 1 — Purchasing overhaul',
 'Complete purchasing workflow redesign. P1-1 through P1-8 all done. Purchase orders, supplier management, approval workflows.',
 'critical', 'marketplace', 'done', 'xl',
 '["backend","frontend","database"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-02-03T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-06T16:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-02-03T08:00:00Z'),

('Blueprint Phase 2 — Receiving enhancements',
 'P2-1 through P2-7 all done. Receiving workflow improvements, quality checks, inventory updates on receipt.',
 'high', 'marketplace', 'done', 'l',
 '["backend","frontend"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-02-06T10:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-08T18:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-02-06T10:00:00Z'),

('Blueprint Phase 3 — Pallet management',
 'P3-1 through P3-14 all done. Pallet creation, tracking, location management, weight/dimensions, shipping task integration.',
 'high', 'marketplace', 'done', 'xl',
 '["backend","frontend","database"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-02-08T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-10T20:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-02-08T08:00:00Z'),

('Blueprint Phase 4 — bol.com Retailer API',
 'P4-1 through P4-21 done. OAuth credentials (encrypted), offer mappings, process status tracking, stock sync. pg_cron token pre-refresh.',
 'critical', 'marketplace', 'done', 'xl',
 '["backend","edge-function","database"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-02-10T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-12T16:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-02-10T08:00:00Z'),

('Shopify Admin API integration',
 'SH-1 through SH-21 done (SH-16/18 deferred, SH-22-25 testing). Product sync, order management, inventory updates, webhook handling.',
 'high', 'integrations', 'done', 'xl',
 '["backend","edge-function","database"]'::jsonb,
 '[{"action":"Created","actor":"user","at":"2026-02-11T08:00:00Z"},{"action":"Status: planned → done","actor":"user","at":"2026-02-13T14:00:00Z"}]'::jsonb,
 '[]'::jsonb, '[]'::jsonb, '2026-02-11T08:00:00Z')

ON CONFLICT DO NOTHING;

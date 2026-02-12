-- Roadmap Backfill: Historical features as "done" entries
-- This migration creates traceable roadmap entries for all features ever built
-- Each entry includes structural_tests JSONB for automated verification

-- First, add structural_tests column if not exists
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS structural_tests JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- PLATFORM FOUNDATION (Jan 4-5, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Core Database Foundation', 'Initial iSyncSO tables: organizations, users, companies, teams, departments. The foundational schema that everything else builds on.', 'done', 'critical', 'platform', 'xl',
 '["database", "foundation", "schema"]'::jsonb, 'claude', '2026-01-04', '2026-01-04',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Created as part of initial platform setup. Tables: organizations, users, companies, teams, departments, team_members.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "users", "description": "Users table exists"},
   {"type": "table", "target": "organizations", "description": "Organizations table exists"},
   {"type": "table", "target": "companies", "description": "Companies table exists"},
   {"type": "table", "target": "teams", "description": "Teams table exists"}]'::jsonb),

('Authentication & OAuth', 'Google OAuth integration, session management, auth callbacks. Secure login flow with Supabase Auth.', 'done', 'critical', 'platform', 'l',
 '["auth", "oauth", "google", "security"]'::jsonb, 'claude', '2026-01-05', '2026-01-05',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Google OAuth via Supabase Auth. Callback handling in auth routes.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/login", "description": "Login page renders"},
   {"type": "route", "target": "/auth/callback", "description": "Auth callback route exists"}]'::jsonb),

('RBAC System', 'Role-based access control with 6-tier hierarchy: super_admin, admin, manager, user, learner, viewer. Permission guards, role checks, and RLS policies.', 'done', 'critical', 'platform', 'xl',
 '["rbac", "security", "roles", "permissions"]'::jsonb, 'claude', '2026-01-05', '2026-01-05',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** 6-tier role hierarchy with helper functions: auth_uid(), auth_role(), auth_company_id(), auth_hierarchy_level(). PermissionGuard, RoleGuard, AdminGuard components.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "rbac_roles", "description": "RBAC roles table exists"},
   {"type": "table", "target": "rbac_permissions", "description": "RBAC permissions table exists"},
   {"type": "table", "target": "rbac_user_roles", "description": "User-role mapping exists"},
   {"type": "function", "target": "auth_uid", "description": "Stable auth wrapper exists"}]'::jsonb),

('User Onboarding Flow', 'Company setup wizard, team member invitations, initial workspace configuration.', 'done', 'high', 'platform', 'm',
 '["onboarding", "wizard", "setup"]'::jsonb, 'claude', '2026-01-05', '2026-01-05',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Multi-step onboarding wizard for new users/companies.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/onboarding", "description": "Onboarding page renders"}]'::jsonb),

('Settings & Workspace Management', 'User app configs, workspace customization, app toggle system. Per-user settings persistence.', 'done', 'high', 'platform', 'm',
 '["settings", "workspace", "apps"]'::jsonb, 'claude', '2026-01-05', '2026-01-05',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** user_app_configs table, AppsManagerModal, embedded settings tabs.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "user_app_configs", "description": "App configs table exists"},
   {"type": "route", "target": "/settings", "description": "Settings page renders"}]'::jsonb);

-- ============================================================
-- CRM MODULE (Jan 5-22, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('CRM Contacts & Prospects', 'Contact management with types (lead, client, supplier). Prospect tracking with pipeline stages. Full CRUD with search and filters.', 'done', 'high', 'crm', 'xl',
 '["contacts", "prospects", "pipeline", "crud"]'::jsonb, 'claude', '2026-01-05', '2026-01-05',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** CRM foundation with contacts, prospects, companies. Pipeline stages for prospect tracking.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "contacts", "description": "Contacts table exists"},
   {"type": "table", "target": "prospects", "description": "Prospects table exists"},
   {"type": "route", "target": "/crm", "description": "CRM page renders"}]'::jsonb),

('Explorium Enrichment', 'LinkedIn and company data enrichment via Explorium API. Contact verification, firmographics, technology stack detection.', 'done', 'high', 'crm', 'l',
 '["enrichment", "explorium", "linkedin", "api"]'::jsonb, 'claude', '2026-01-06', '2026-01-06',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Explorium API integration for fullEnrich, firmographics, people enrichment. Edge function: explorium-enrich.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "explorium-enrich", "description": "Explorium enrich function exists"}]'::jsonb),

('CRM Activities & Notes', 'Activity logging for contacts. Timeline of interactions, calls, emails, notes. Full history tracking.', 'done', 'medium', 'crm', 'm',
 '["activities", "notes", "timeline", "history"]'::jsonb, 'claude', '2026-01-22', '2026-01-22',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Activity and notes system for CRM contacts.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "contact_activities", "description": "Contact activities table exists"}]'::jsonb),

('CRM Companies Module', 'Dedicated company management. Company profiles with enrichment data, tech stack, employee data.', 'done', 'medium', 'crm', 'm',
 '["companies", "profiles", "enrichment"]'::jsonb, 'claude', '2026-01-21', '2026-01-21',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Full CRM companies system with enrichment columns and company intelligence.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/crm/companies", "description": "CRM Companies page renders"}]'::jsonb),

('Enrichment Cache System', 'Global caching layer for Explorium API responses. Prospect cache (90-day TTL), company cache (180-day TTL). Shared across all organizations.', 'done', 'high', 'crm', 'l',
 '["cache", "enrichment", "performance", "api"]'::jsonb, 'claude', '2026-02-02', '2026-02-02',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** enrichment_cache_prospects and enrichment_cache_companies tables. Cache check in explorium-enrich and generateCompanyIntelligence edge functions.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "enrichment_cache_prospects", "description": "Prospect cache table exists"},
   {"type": "table", "target": "enrichment_cache_companies", "description": "Company cache table exists"}]'::jsonb);

-- ============================================================
-- FINANCE MODULE (Jan 6-11, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Finance Proposals & Invoices', 'Quote/proposal builder with line items. Invoice generation with PDF export. Proposal-to-invoice conversion. Email delivery via Resend.', 'done', 'high', 'finance', 'xl',
 '["proposals", "invoices", "pdf", "email", "resend"]'::jsonb, 'claude', '2026-01-06', '2026-01-06',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Full proposal/invoice system with line items, PDF generation, email delivery via Resend, and proposal-to-invoice conversion.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "proposals", "description": "Proposals table exists"},
   {"type": "table", "target": "invoices", "description": "Invoices table exists"},
   {"type": "route", "target": "/finance", "description": "Finance page renders"}]'::jsonb),

('Expense Management', 'Expense tracking with categories, multi-line entries. Stock purchase tracking linked to inventory.', 'done', 'high', 'finance', 'l',
 '["expenses", "tracking", "categories", "stock"]'::jsonb, 'claude', '2026-01-08', '2026-01-08',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Expense management with line items, categories, and stock purchase linking.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/inventoryexpenses", "description": "Expenses page renders"}]'::jsonb),

('Invoice AI Processing', 'PDF text extraction with pdf.js + Groq LLM structured data extraction. Auto-creates expense records from uploaded invoices.', 'done', 'high', 'finance', 'l',
 '["ai", "pdf", "groq", "extraction", "automation"]'::jsonb, 'claude', '2026-01-11', '2026-01-11',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Client-side PDF text extraction via pdf.js, server-side Groq LLM extraction. Edge function: process-invoice.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "process-invoice", "description": "Invoice processing function exists"}]'::jsonb),

('Chart of Accounts & General Ledger', 'GL account hierarchy, double-entry accounting ledger. Financial reports: P&L, Balance Sheet, Trial Balance. Vendors & bills management.', 'done', 'high', 'finance', 'xl',
 '["accounting", "ledger", "reports", "double-entry"]'::jsonb, 'claude', '2026-02-01', '2026-02-01',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Full accounting system: chart of accounts, general ledger, financial reports (P&L, Balance Sheet, Trial Balance), vendors and bills management.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "chart_of_accounts", "description": "Chart of accounts exists"},
   {"type": "table", "target": "general_ledger_entries", "description": "GL entries table exists"}]'::jsonb);

-- ============================================================
-- PRODUCTS MODULE (Jan 6 - Feb 11, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Product Catalog Foundation', 'Products table with physical/digital/service types. Image upload with storage bucket. Inline editing, specifications, variants.', 'done', 'high', 'products', 'xl',
 '["catalog", "products", "images", "variants"]'::jsonb, 'claude', '2026-01-06', '2026-01-06',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Full product catalog: CRUD, image upload, inline editing, specs, variants. Storage bucket: product-images.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "products", "description": "Products table exists"},
   {"type": "route", "target": "/products", "description": "Products page renders"}]'::jsonb),

('Digital Product Pricing', 'One-time, subscription, and usage-based pricing models. Product bundles with dynamic pricing. Barcode/EAN support.', 'done', 'medium', 'products', 'l',
 '["pricing", "subscriptions", "bundles", "barcode"]'::jsonb, 'claude', '2026-01-06', '2026-01-06',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Multiple pricing models, bundle system, barcode/EAN management.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/productdetail", "description": "Product detail page renders"}]'::jsonb),

('Inventory & Supplier Management', 'Stock tracking, receiving, shipping. Supplier profiles with AI enrichment. Product research queue.', 'done', 'high', 'products', 'xl',
 '["inventory", "suppliers", "stock", "receiving"]'::jsonb, 'claude', '2026-01-07', '2026-01-12',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Inventory management, supplier profiles, AI-powered supplier enrichment, product research queue, incoming inventory flow.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/inventoryexpenses", "description": "Inventory page renders"},
   {"type": "edge_function", "target": "research-product", "description": "Product research function exists"}]'::jsonb),

('Blueprint Purchasing System', 'Purchase groups, receiving sessions, shipments, pallets, returns. Sales channels (B2B/B2C), audit trail. Complete warehouse workflow.', 'done', 'high', 'products', 'xl',
 '["blueprint", "purchasing", "warehouse", "pallets", "receiving"]'::jsonb, 'claude', '2026-02-10', '2026-02-11',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Blueprint build phases 0-3: 9 new tables, purchase groups, receiving sessions, shipments, pallets, returns, sales channels, audit trail.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "purchase_groups", "description": "Purchase groups table exists"},
   {"type": "table", "target": "receiving_sessions", "description": "Receiving sessions table exists"},
   {"type": "table", "target": "pallets", "description": "Pallets table exists"},
   {"type": "table", "target": "product_sales_channels", "description": "Sales channels table exists"}]'::jsonb);

-- ============================================================
-- SYNC AI AGENT (Jan 7, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('SYNC AI Agent Core', 'Natural language command processor with 51 actions across 10 modules. Kimi K2 Instruct model via Together.ai. Streaming SSE responses.', 'done', 'critical', 'sync-agent', 'xl',
 '["ai", "nlp", "sync", "together-ai", "streaming"]'::jsonb, 'claude', '2026-01-07', '2026-01-07',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** SYNC agent with 51 actions: Finance(8), Products(6), Growth/CRM(9), Tasks(8), Inbox(5), Team(6), Learn(4), Sentinel(3), Create(2), Research(2). Model: moonshotai/Kimi-K2-Instruct.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "sync", "description": "SYNC edge function exists"},
   {"type": "route", "target": "/sync", "description": "SYNC agent page renders"}]'::jsonb),

('SYNC Memory System', 'Persistent memory across sessions: DB-backed sessions, message summarization, entity extraction, RAG vectors, action templates. BAAI/bge-large embeddings.', 'done', 'high', 'sync-agent', 'xl',
 '["memory", "rag", "vectors", "embeddings", "sessions"]'::jsonb, 'claude', '2026-01-07', '2026-01-07',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** sync_sessions, sync_memory_chunks (vector 1024d), sync_action_templates. BAAI/bge-large-en-v1.5 embeddings.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "sync_sessions", "description": "Sync sessions table exists"},
   {"type": "table", "target": "sync_memory_chunks", "description": "Memory chunks table exists"}]'::jsonb),

('SYNC Workflow Engine', 'Multi-agent system with specialized agent prompts (FINANCE, GROWTH, etc.). Parallel, sequential, and iterative execution modes.', 'done', 'high', 'sync-agent', 'l',
 '["workflows", "agents", "multi-agent", "parallel"]'::jsonb, 'claude', '2026-01-07', '2026-01-07',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Workflow engine with specialized agents and execution modes.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "sync", "description": "SYNC function with workflow engine"}]'::jsonb);

-- ============================================================
-- GROWTH & AI CONTENT (Jan 7, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('AI Image Generation', 'FLUX Kontext Pro for product images with reference preservation. FLUX Pro for marketing. FLUX Schnell for quick drafts. Prompt enhancement via Groq.', 'done', 'high', 'growth', 'l',
 '["ai", "images", "flux", "product-photography"]'::jsonb, 'claude', '2026-01-07', '2026-01-07',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** 3 FLUX models via Together.ai. Edge functions: generate-image, enhance-prompt. Storage: generated-content bucket.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "generate-image", "description": "Image gen function exists"},
   {"type": "edge_function", "target": "enhance-prompt", "description": "Prompt enhancer exists"},
   {"type": "route", "target": "/createimages", "description": "Create Images page renders"}]'::jsonb),

('Sync Studio', 'Product catalog import (bol.com, Shopify), AI photoshoot generation, results review and export. Dashboard for photoshoot projects.', 'done', 'high', 'growth', 'xl',
 '["studio", "photoshoot", "import", "ai"]'::jsonb, 'claude', '2026-01-07', '2026-01-31',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Sync Studio pages: Import, Photoshoot, Results, Dashboard. Full product photography workflow.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/sync-studio", "description": "Sync Studio page renders"}]'::jsonb),

('AI Video Generation', 'Video rendering queue, project management. AI-powered video creation from product data.', 'done', 'medium', 'growth', 'l',
 '["video", "ai", "rendering", "queue"]'::jsonb, 'claude', '2026-01-31', '2026-01-31',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Render queue, video projects tables. Edge function: generate-video.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "generate-video", "description": "Video gen function exists"}]'::jsonb);

-- ============================================================
-- TALENT MODULE (Jan 14 - Feb 2, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Talent Foundation', 'Candidates, projects, roles tables. Org-scoped RBAC for talent domain. Talent ecosystem linked to main platform.', 'done', 'critical', 'talent', 'xl',
 '["talent", "candidates", "projects", "roles", "foundation"]'::jsonb, 'claude', '2026-01-14', '2026-01-15',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Talent domain foundation: candidates, talent_projects, talent_roles tables. Organization-scoped permissions.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "candidates", "description": "Candidates table exists"},
   {"type": "route", "target": "/talentcandidates", "description": "Talent Candidates page renders"}]'::jsonb),

('Campaign Matching Engine', 'AI-powered candidate matching with weighted criteria. 6 scoring dimensions, signal-based boosting, deep AI analysis via Groq.', 'done', 'high', 'talent', 'xl',
 '["matching", "ai", "campaigns", "scoring", "groq"]'::jsonb, 'claude', '2026-01-16', '2026-01-28',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** 3-stage matching: pre-filter → deep AI analysis → priority ranking. Custom weight sliders. Signal-based matching (M&A, layoffs, flight risk). Edge function: analyzeCampaignProject.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "analyzeCampaignProject", "description": "Campaign matching function exists"},
   {"type": "route", "target": "/talentcampaigndetail", "description": "Campaign detail page renders"}]'::jsonb),

('Candidate Intelligence System', 'SYNC Intel queue for background processing. Intelligence scores, timing signals, outreach hooks, company pain points. Auto-trigger on candidate insert.', 'done', 'high', 'talent', 'xl',
 '["intelligence", "intel", "ai", "enrichment", "queue"]'::jsonb, 'claude', '2026-01-26', '2026-01-29',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** sync_intel_queue with stages. Auto-trigger on insert. Edge function: generateCandidateIntelligence. Intelligence fields: score, timing_signals, outreach_hooks, company_pain_points.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "sync_intel_queue", "description": "Intel queue table exists"},
   {"type": "edge_function", "target": "generateCandidateIntelligence", "description": "Intel gen function exists"}]'::jsonb),

('Outreach Pipeline & Message Generation', 'Personalized outreach via email, LinkedIn, SMS. AI message generation using ALL intelligence data. Campaign stages and status tracking.', 'done', 'high', 'talent', 'xl',
 '["outreach", "email", "linkedin", "sms", "ai", "personalization"]'::jsonb, 'claude', '2026-01-15', '2026-01-28',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** OutreachPipeline component, CampaignWizard (5 steps). Edge function: generateCampaignOutreach. Channels: email, LinkedIn, SMS.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "generateCampaignOutreach", "description": "Outreach gen function exists"}]'::jsonb),

('Candidate LinkedIn Career Data', 'Work history, education, certifications, interests from LinkedIn enrichment. Polymorphic data handling for varying API formats.', 'done', 'medium', 'talent', 'l',
 '["linkedin", "career", "education", "skills"]'::jsonb, 'claude', '2026-01-28', '2026-01-28',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** work_history, education, certifications JSONB columns. Skills & Career tab in drawer and profile page.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/talentcandidateprofile", "description": "Candidate profile page renders"}]'::jsonb),

('Client Candidate Exclusion', 'Prevents contacting candidates at client companies. Smart company matching (exact, alias, trigram fuzzy). Ruled Out section with recovery.', 'done', 'high', 'talent', 'l',
 '["exclusion", "clients", "fuzzy-matching", "compliance"]'::jsonb, 'claude', '2026-02-02', '2026-02-02',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** exclude_candidates flag on prospects. normalize_company_name(), match_excluded_client() with 4-tier matching. Exclusion guards in matching and intel queue.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "function", "target": "match_excluded_client", "description": "Exclusion matching function exists"}]'::jsonb),

('SMS Outreach (Twilio)', 'Direct SMS to candidates via Twilio. Phone number purchase/management. SMS campaign management. AI-generated SMS messages.', 'done', 'medium', 'talent', 'l',
 '["sms", "twilio", "outreach", "phone"]'::jsonb, 'claude', '2026-01-26', '2026-01-26',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Twilio integration: twilio-numbers, twilio-send-sms, twilio-webhooks edge functions. Phone number management, SMS campaigns.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "twilio-send-sms", "description": "Twilio SMS function exists"},
   {"type": "table", "target": "twilio_phone_numbers", "description": "Phone numbers table exists"}]'::jsonb),

('Campaign Wizard & Criteria Weighting', '5-step campaign wizard: Project → Role → Context → Match Weights → Review. Custom weight sliders for 6 scoring dimensions. Signal-based matching config.', 'done', 'medium', 'talent', 'l',
 '["wizard", "weights", "signals", "campaign-creation"]'::jsonb, 'claude', '2026-01-28', '2026-01-28',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** CampaignWizard.jsx (5 steps), CriteriaWeightingStep, SignalMatchingConfig. 4 presets: balanced, skills_first, urgency_first, culture_focus. 8 intelligence signals.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb);

-- ============================================================
-- MARKETPLACE (Jan 23-26, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Nests Marketplace', 'Candidate pool marketplace. Browse, preview, and purchase nests. Stripe checkout. Auto-intel on purchase. Org-scoped candidate copying.', 'done', 'high', 'marketplace', 'xl',
 '["nests", "marketplace", "stripe", "purchase"]'::jsonb, 'claude', '2026-01-25', '2026-01-26',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** NestsMarketplace, NestDetail, TalentNestDetail pages. purchase-nest edge function. Auto-queue intel on purchase via copy_nest_to_organization RPC.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/nests", "description": "Nests marketplace page renders"},
   {"type": "edge_function", "target": "purchase-nest", "description": "Nest purchase function exists"}]'::jsonb),

('Growth Nests (B2B Prospect Pools)', 'B2B prospect pools marketplace. Separate from talent nests. Growth-focused data.', 'done', 'medium', 'marketplace', 'l',
 '["growth-nests", "b2b", "prospects"]'::jsonb, 'claude', '2026-01-26', '2026-01-26',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Growth nests system for B2B prospect pools.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "purchase-growth-nest", "description": "Growth nest purchase function exists"}]'::jsonb);

-- ============================================================
-- ADMIN PANEL (Jan 23-24, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Admin Panel Foundation', 'Super-admin infrastructure with AdminGuard, AdminLayout, AdminSidebar. User management, organization management, platform analytics.', 'done', 'critical', 'admin', 'xl',
 '["admin", "super-admin", "management", "analytics"]'::jsonb, 'claude', '2026-01-23', '2026-01-23',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** 13 admin pages: Dashboard, Users, Organizations, Marketplace, Apps, Analytics, Billing, Content, Support, AI, Integrations, System, Settings.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/admin", "description": "Admin dashboard renders"},
   {"type": "route", "target": "/admin/users", "description": "Admin users page renders"},
   {"type": "route", "target": "/admin/organizations", "description": "Admin orgs page renders"}]'::jsonb),

('Admin Feature Flags', 'Feature flag management for gradual rollouts and A/B testing.', 'done', 'medium', 'admin', 'm',
 '["feature-flags", "rollout", "admin"]'::jsonb, 'claude', '2026-01-23', '2026-01-23',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Feature flags admin page for controlling feature rollouts.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/admin/feature-flags", "description": "Feature flags page renders"}]'::jsonb),

('Admin Billing & Revenue', 'Subscription plans, payment management, Stripe integration. Revenue dashboards.', 'done', 'high', 'admin', 'l',
 '["billing", "stripe", "subscriptions", "revenue"]'::jsonb, 'claude', '2026-01-23', '2026-01-23',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Admin billing page with Stripe integration, subscription plan management.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/admin/billing", "description": "Admin billing page renders"}]'::jsonb),

('Admin Demos System', 'Create and manage demo environments for prospects.', 'done', 'low', 'admin', 'm',
 '["demos", "sales", "admin"]'::jsonb, 'claude', '2026-01-24', '2026-01-24',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Demo environment creation for sales presentations. Edge function: create-public-demo.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/admin/demos", "description": "Admin demos page renders"},
   {"type": "edge_function", "target": "create-public-demo", "description": "Demo creation function exists"}]'::jsonb),

('Admin Credits System', 'Credit management for enrichment and AI usage. Track credits per organization.', 'done', 'medium', 'admin', 'm',
 '["credits", "usage", "billing"]'::jsonb, 'claude', '2026-01-29', '2026-01-29',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Credits admin page for managing enrichment and AI usage credits.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/admin/credits", "description": "Admin credits page renders"}]'::jsonb);

-- ============================================================
-- SENTINEL EU AI ACT (Jan 23, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('SENTINEL EU AI Act Compliance', 'AI system inventory, 5-step risk assessment wizard, compliance roadmap with obligation tracker, document generator (Annex IV + Article 47). Mint/sage theme.', 'done', 'high', 'sentinel', 'xl',
 '["eu-ai-act", "compliance", "risk-assessment", "documentation"]'::jsonb, 'claude', '2026-01-23', '2026-01-31',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** 4 pages: Sentinel landing, Dashboard, AI System Inventory, Compliance Roadmap, Document Generator. Risk classification: prohibited → high-risk → GPAI → limited → minimal.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "ai_systems", "description": "AI systems table exists"},
   {"type": "route", "target": "/sentinel", "description": "Sentinel landing page renders"},
   {"type": "route", "target": "/sentineldashboard", "description": "Sentinel dashboard renders"},
   {"type": "route", "target": "/aisysteminventory", "description": "AI inventory page renders"}]'::jsonb);

-- ============================================================
-- INBOX / MESSAGING (Jan 19-20, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Inbox & Messaging System', 'Real-time messaging with channels. Bookmarks, admin roles, fulltext search, rate limiting, read receipts, unread tracking. Supabase Realtime.', 'done', 'high', 'platform', 'xl',
 '["inbox", "messaging", "realtime", "channels"]'::jsonb, 'claude', '2026-01-19', '2026-01-20',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Inbox with channels, bookmarks, fulltext search, rate limiting, read receipts, unread tracking. Realtime subscriptions.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/inbox", "description": "Inbox page renders"}]'::jsonb);

-- ============================================================
-- NOTIFICATIONS (Jan 26, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Notifications System', 'User notifications with types (roadmap_reply, system, etc.). Action URLs for navigation. Read/unread tracking.', 'done', 'medium', 'platform', 'm',
 '["notifications", "alerts", "realtime"]'::jsonb, 'claude', '2026-01-26', '2026-01-26',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** user_notifications table. Notification types, action URLs, read tracking.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "table", "target": "user_notifications", "description": "Notifications table exists"}]'::jsonb);

-- ============================================================
-- INTEGRATIONS (Jan 11 - Feb 11, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Composio 30+ Integrations', 'HubSpot, Salesforce, Slack, Teams, Gmail, Notion, Asana, Jira, etc. OAuth popup flow, auto token refresh, webhook triggers.', 'done', 'high', 'integrations', 'xl',
 '["composio", "oauth", "integrations", "webhooks"]'::jsonb, 'claude', '2026-01-11', '2026-01-11',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Composio integration framework: composio-connect, composio-webhooks edge functions. 30+ third-party services. user_integrations, composio_webhook_events tables.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "composio-connect", "description": "Composio connect function exists"},
   {"type": "table", "target": "user_integrations", "description": "User integrations table exists"}]'::jsonb),

('bol.com Retailer API', 'Netherlands marketplace integration. Product sync, order management, inventory updates. OAuth2 with pg_cron token refresh.', 'done', 'high', 'integrations', 'xl',
 '["bolcom", "marketplace", "netherlands", "oauth2"]'::jsonb, 'claude', '2026-02-10', '2026-02-11',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Blueprint Phase 4: bol.com Retailer API. bolcom_credentials with pg_cron token refresh. bolcom-api edge function. Product/order/inventory sync.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "bolcom-api", "description": "bol.com API function exists"},
   {"type": "table", "target": "bolcom_credentials", "description": "bol.com credentials table exists"}]'::jsonb),

('Shopify Admin API', 'E-commerce platform sync. Product, order, inventory, and customer sync. Webhooks for real-time updates.', 'done', 'high', 'integrations', 'xl',
 '["shopify", "ecommerce", "sync", "webhooks"]'::jsonb, 'claude', '2026-02-10', '2026-02-11',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Blueprint Shopify phase: shopify-api edge function. Product/order/inventory/customer sync. Webhook handling.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "shopify-api", "description": "Shopify API function exists"}]'::jsonb),

('Stripe Payments', 'Payment processing, subscription management, checkout flows. Webhook handler for payment events.', 'done', 'high', 'integrations', 'm',
 '["stripe", "payments", "subscriptions", "checkout"]'::jsonb, 'claude', '2026-01-23', '2026-01-23',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Stripe integration for nest purchases, subscriptions, billing. stripe-webhook edge function.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "stripe-webhook", "description": "Stripe webhook function exists"}]'::jsonb);

-- ============================================================
-- INFRASTRUCTURE (Jan 11 - Jan 30, 2026)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('RLS Performance Optimization', 'Fixed 1720 Supabase advisor warnings. STABLE SECURITY DEFINER wrapper functions for auth.uid/role. Consolidated duplicate policies, removed redundant service_role policies.', 'done', 'critical', 'infrastructure', 'xl',
 '["rls", "performance", "security", "optimization"]'::jsonb, 'claude', '2026-01-11', '2026-01-11',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Fixed 1720 advisor warnings: 154 auth.uid() replacements, 111 auth.role() replacements, 73 duplicate policy consolidations, 71 service_role removals, 51 search_path fixes.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "function", "target": "auth_uid", "description": "Stable auth_uid() wrapper exists"},
   {"type": "function", "target": "auth_role", "description": "Stable auth_role() wrapper exists"},
   {"type": "function", "target": "auth_company_id", "description": "Stable auth_company_id() wrapper exists"}]'::jsonb),

('UI Color Palette Unification', 'Comprehensive migration to cyan/blue palette. 19 product components, settings, integrations, actions. Consistent design language.', 'done', 'medium', 'infrastructure', 'l',
 '["design", "colors", "cyan", "consistency"]'::jsonb, 'claude', '2026-01-30', '2026-01-30',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Unified 40+ components to cyan/blue palette. Products, settings, integrations, actions all aligned.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb),

('Storage Buckets System', 'avatars (5MB), documents (50MB), attachments (25MB), exports (100MB), product-images (10MB), generated-content, brand-assets (10MB). All with RLS.', 'done', 'high', 'infrastructure', 'm',
 '["storage", "buckets", "uploads", "rls"]'::jsonb, 'claude', '2026-01-06', '2026-01-06',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** 7 storage buckets configured with appropriate size limits and RLS policies.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb);

-- ============================================================
-- LEARN MODULE
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Learn Platform', 'Course catalog, enrollment, progress tracking. AI-powered course personalization. Learning paths.', 'done', 'medium', 'learn', 'l',
 '["courses", "learning", "ai", "personalization"]'::jsonb, 'claude', '2026-01-07', '2026-01-07',
 '[{"action": "Backfilled from migration history", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Backfill:** Learn module with courses, enrollment, progress tracking. Edge function: personalize-course.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "edge_function", "target": "personalize-course", "description": "Course personalization function exists"},
   {"type": "route", "target": "/learn", "description": "Learn page renders"}]'::jsonb);

-- ============================================================
-- ADMIN ROADMAP (Feb 12, 2026 - TODAY)
-- ============================================================

INSERT INTO roadmap_items (title, description, status, priority, category, effort, tags, created_by, created_at, updated_at, history, comments, subtasks, structural_tests) VALUES

('Admin Roadmap v2', 'Full roadmap management: Supabase Realtime, drag-and-drop kanban, markdown rendering, multi-tag labels, dependency picker, activity history, export (CSV/JSON), stale detection, notification integration.', 'done', 'high', 'admin', 'xl',
 '["roadmap", "kanban", "realtime", "dnd", "markdown"]'::jsonb, 'claude', '2026-02-12', '2026-02-12',
 '[{"action": "Built and deployed", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Built today.** AdminRoadmap.jsx with all v2 features: realtime subscription, @dnd-kit kanban, ReactMarkdown, tags, dependencies, history, export, stale detection.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[{"type": "route", "target": "/admin/roadmap", "description": "Roadmap page renders"},
   {"type": "table", "target": "roadmap_items", "description": "Roadmap items table exists"}]'::jsonb),

('Roadmap Mode Protocol', 'Documentation defining how Claude Code interacts with roadmap_items. Scan for work, claim items, leave comments, complete features. Async two-way communication.', 'done', 'medium', 'admin', 's',
 '["protocol", "documentation", "automation"]'::jsonb, 'claude', '2026-02-12', '2026-02-12',
 '[{"action": "Built and deployed", "actor": "claude", "at": "2026-02-12"}]'::jsonb,
 '[{"content": "**Built today.** .orchestra/roadmap-mode.md with full protocol spec.", "author": "claude", "created_at": "2026-02-12"}]'::jsonb,
 '[]'::jsonb,
 '[]'::jsonb);

-- Summary: ~50 roadmap items backfilled covering all major features
-- Each has structural_tests JSONB for automated verification

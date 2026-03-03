# iSyncSO Database Schema Analysis

**Generated:** 2026-03-02
**Database:** Supabase (PostgreSQL) — Project `sfxpmzicgpaxfntqleig`
**Total Migration Files:** ~170

---

## 1. Schema Overview

### Table Count by Module

| Module | Tables | Purpose |
|--------|--------|---------|
| **Core/Organizations** | 10 | Users, orgs, companies, teams, invitations |
| **Talent (Recruitment)** | 12 | Candidates, campaigns, outreach, nests, intel |
| **Growth (CRM)** | 8 | Prospects, pipeline, activities, growth nests |
| **Finance** | 16 | Invoices, expenses, chart of accounts, GL, tax |
| **Inventory/Logistics** | 14 | Products, inventory, POs, receiving, shipping |
| **Blueprint (Warehouse)** | 10 | Purchase groups, pallets, shipments, returns |
| **bol.com Integration** | 3 | Credentials, offer mappings, pending statuses |
| **Shopify Integration** | 2 | Credentials, product mappings |
| **Inbox/Messaging** | 8 | Channels, messages, threads, read receipts |
| **SYNC AI Agent** | 4 | Sessions, memory chunks (vector), entities, action templates |
| **Admin Platform** | 6 | Platform settings, feature flags, audit logs, admins |
| **Sentinel (Compliance)** | 8 | Frameworks, controls, evidence, audits |
| **Products** | 6 | Products, digital/physical extensions, categories, bundles |
| **AI/Content** | 4 | AI usage, generated content, video projects, render queue |
| **Enrichment** | 4 | Explorium cache (prospects + companies), enrichment config |
| **Semantic Pipeline** | 5 | Entities, activities, threads, intents, behavioral signatures |
| **Notifications** | 3 | Notifications, user_notifications, activity_log |
| **Storage** | 7 buckets | avatars, documents, attachments, exports, product-images, generated-content, brand-assets |
| **Miscellaneous** | ~15 | Bookmarks, daily journals, desktop activity, SMS, portal, scheduling, etc. |

**Estimated total: ~140+ tables/views** across all modules.

### Key Extensions

| Extension | Purpose |
|-----------|---------|
| `pgvector` | Vector similarity search (1024-dim embeddings for SYNC AI memory) |
| `pg_trgm` | Trigram similarity for fuzzy company name matching |
| `pgcrypto` | Encryption of bol.com and Shopify OAuth credentials |

---

## 2. Table-by-Table Reference

### 2.1 Core / Organization Tables

#### `organizations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| name | TEXT | NOT NULL |
| slug | TEXT | |
| domain | TEXT | |
| description | TEXT | |
| settings | JSONB | DEFAULT '{}' |
| created_at/updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS:** Authenticated access (early migration; later refined to org-scoped).

#### `companies`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations |
| name | TEXT | NOT NULL |
| domain | TEXT | |
| industry | TEXT | |
| size | TEXT | |
| created_date | TIMESTAMPTZ | |

**Note:** `company_id` is the primary tenant scope for most Blueprint/inventory tables. `organization_id` is used for Talent domain.

#### `users` (extended from auth.users)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK (references auth.users) |
| organization_id | UUID | FK → organizations |
| company_id | UUID | FK → companies |
| role | TEXT | DEFAULT 'member' |
| language | TEXT | DEFAULT 'en' |
| full_name | TEXT | |
| avatar_url | TEXT | |
| biography | TEXT | Added Feb 2026 |

#### `teams`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations |
| name | TEXT | NOT NULL |
| description | TEXT | |
| settings | JSONB | DEFAULT '{}' |

#### `team_members`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| team_id | UUID | FK → teams |
| user_id | UUID | |
| role | TEXT | DEFAULT 'member' |

#### `user_invitations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations |
| email | TEXT | NOT NULL |
| role | TEXT | DEFAULT 'member' |
| status | TEXT | DEFAULT 'pending' |
| token | TEXT | UNIQUE |
| expires_at | TIMESTAMPTZ | |

#### `clients`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations |
| name | TEXT | NOT NULL |
| domain, industry, contact_*, notes | various | |

### 2.2 RBAC System

#### `rbac_roles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | TEXT | UNIQUE |
| hierarchy_level | INTEGER | 20=viewer, 30=learner, 40=user, 60=manager, 80=admin, 100=super_admin |

#### `rbac_permissions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | TEXT | Format: `{resource}.{action}` |
| resource | TEXT | users, teams, finance, admin, etc. |
| action | TEXT | view, create, edit, delete, manage, export |

#### `rbac_user_roles`
Join table: `user_id` ↔ `role_id`

#### `rbac_role_permissions`
Join table: `role_id` ↔ `permission_id`

### 2.3 Talent (Recruitment) Module

#### `candidates`
Primary entity for recruitment pipeline. ~50+ columns including:

| Column Group | Key Columns |
|-------------|-------------|
| Basic | first_name, last_name, email, phone, linkedin_url/linkedin_profile |
| Professional | current_title/job_title, current_company/company_name, skills (JSONB), experience_years/years_experience |
| Intelligence | intelligence_score (0-100), intelligence_level, intelligence_urgency, intelligence_factors (JSONB), intelligence_timing (JSONB), recommended_approach |
| Enrichment | work_history (JSONB), education (JSONB), certifications (JSONB), interests (JSONB) |
| Company Intel | company_industry, company_employee_count, company_tech_stack, company_latest_funding, recent_ma_news |
| Exclusion | excluded_reason, excluded_client_id (FK → prospects), excluded_at |
| Scoping | organization_id (FK → organizations) |

**RLS:** Organization-scoped via `organization_id`.

#### `campaigns`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| organization_id | UUID | FK |
| project_id, role_id | UUID | Optional FKs |
| name, description, status | TEXT | |
| campaign_type | TEXT | 'growth' or 'recruitment' |
| target_criteria | JSONB | |
| matched_candidates | JSONB | Array of match results |
| role_context | JSONB | From CampaignWizard: criteria_weights, signal_filters, perfect_fit_criteria |
| nest_id | UUID | Optional link to purchased nest |

#### `outreach_tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| organization_id | UUID | FK |
| campaign_id | UUID | FK → campaigns |
| candidate_id | UUID | FK → candidates |
| task_type | TEXT | initial_outreach, follow_up_1, follow_up_2, check_reply |
| status | TEXT | pending, approved_ready, sent, completed, cancelled |
| stage | TEXT | first_message, follow_up_1, follow_up_2, etc. |
| message_content | TEXT | |

#### `nests` (Marketplace Data Packages)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | TEXT | NOT NULL |
| nest_type | TEXT | 'candidates', 'prospects', 'investors' |
| price | DECIMAL | |
| item_count | INTEGER | Auto-maintained by trigger |
| is_active | BOOLEAN | |

#### `nest_items` (Polymorphic)
Links to `candidate_id`, `prospect_id`, OR `investor_id` (constraint: exactly one must be set).

#### `nest_purchases`
| Column | Type | Notes |
|--------|------|-------|
| nest_id + organization_id | UUID | UNIQUE |
| stripe_payment_intent_id | TEXT | |
| status | TEXT | pending, completed, refunded, failed |
| items_copied | BOOLEAN | |

#### `sync_intel_queue`
| Column | Type | Notes |
|--------|------|-------|
| candidate_id | UUID | FK |
| organization_id | UUID | FK |
| source | TEXT | 'manual', 'nest_purchase', 'import' |
| priority | INTEGER | 1=high, 2=normal, 3=low |
| status | TEXT | pending, processing, completed, failed |
| current_stage | TEXT | Stage tracking added later |

#### `candidate_campaign_matches`
| Column | Type | Notes |
|--------|------|-------|
| candidate_id + campaign_id | UUID | Composite |
| match_score | NUMERIC | |
| match_reasons | JSONB | |
| intelligence_score | INTEGER | |
| best_outreach_angle | TEXT | |
| timing_signals | JSONB | |

### 2.4 Growth / CRM Module

#### `prospects`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| organization_id | UUID | FK |
| first_name, last_name, email, phone | TEXT | |
| company, job_title, industry | TEXT | |
| pipeline_stage | TEXT | |
| deal_value | DECIMAL | |
| contact_type | TEXT | 'lead', 'contact', 'company' |
| exclude_candidates | BOOLEAN | For client candidate exclusion |
| company_aliases | TEXT[] | Alternative company names for matching |

**Enrichment columns:** verified_email, verified_phone, personal_email, company_revenue, company_funding, company_tech_stack, company_employee_count, and ~40 more fields added via explorium enrichment.

#### `crm_activities`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| prospect_id | UUID | FK |
| activity_type | TEXT | call, email, meeting, note, task |
| description | TEXT | |
| outcome | TEXT | |

#### `crm_notes`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| prospect_id | UUID | FK |
| content | TEXT | |
| is_pinned | BOOLEAN | |

#### `growth_nests` / `growth_nest_items`
Similar to talent nests but for prospects.

### 2.5 Finance Module

#### `invoices`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| invoice_number | TEXT | Auto-generated |
| client_name, client_email | TEXT | |
| line_items | JSONB | |
| subtotal, tax_amount, total | DECIMAL | |
| status | TEXT | draft, sent, paid, overdue, cancelled |
| proposal_id | UUID | FK → proposals |
| invoice_type | TEXT | 'standard', 'credit_note', 'recurring' |

#### `proposals`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| prospect_id | UUID | FK → prospects |
| proposal_number | TEXT | Auto-generated via trigger |
| line_items | JSONB | Product references with pricing |
| status | TEXT | draft, sent, viewed, accepted, rejected, expired |
| signature_data | JSONB | |

#### `expenses`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| supplier_id | UUID | FK → suppliers |
| subtotal, tax_amount, total | DECIMAL | |
| ai_extracted_data | JSONB | From invoice AI processing |
| ai_confidence | DECIMAL | |
| needs_review | BOOLEAN | |
| status | TEXT | draft, pending_review, approved, processed, archived |

#### `expense_line_items`
| Column | Type | Notes |
|--------|------|-------|
| expense_id | UUID | FK → expenses |
| product_id | UUID | FK → products (optional) |
| description, sku, ean | TEXT | |
| quantity, unit_price, line_total | DECIMAL | |

#### `accounts` (Chart of Accounts)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| code | TEXT | Account number |
| name | TEXT | |
| account_type_id | UUID | FK → account_types |
| current_balance | DECIMAL(15,2) | |

#### `journal_entries`
Double-entry bookkeeping entries with `journal_entry_lines`.

#### `fiscal_periods`
Period management with close/open capability.

#### Additional Finance Tables:
- `account_types` — Asset, Liability, Equity, Revenue, Expense
- `journal_entry_lines` — Debit/credit lines
- `tax_periods`, `tax_submissions` — BTW/VAT management
- `recurring_invoices` — Automated invoice generation
- `credit_notes` — Credit note tracking
- `bank_reconciliation_sessions`, `bank_transactions` — Bank statement matching
- `vendors`, `bills`, `bill_line_items` — AP management
- `financial_reports` — Saved report configurations

### 2.6 Products Module

#### `products` (Base Table)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| slug | VARCHAR(255) | UNIQUE per company |
| type | VARCHAR(20) | 'digital' or 'physical' |
| status | VARCHAR(20) | draft, published, archived |
| name, description, category | various | |
| ean | VARCHAR(20) | Added for inventory |
| tags | TEXT[] | |
| featured_image | JSONB | |

#### `digital_products` (extends products)
1:1 with products via `product_id` PK/FK. Contains hero, features, pricing_model, packages, FAQs, testimonials.

#### `physical_products` (extends products)
1:1 with products. Contains sku, barcode, mpn, specifications, variants, inventory, pricing, shipping JSONB, supplier_id.

#### `product_categories`
Self-referencing hierarchy via `parent_id`.

#### `product_bundles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| items | JSONB | Array of product references |
| pricing_strategy | TEXT | sum, fixed, discount |

#### `suppliers`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| company_id | UUID | FK |
| name | VARCHAR(255) | NOT NULL |
| contact, address, terms | JSONB | |
| default_lead_time_days | INTEGER | |
| auto_reorder | BOOLEAN | |

### 2.7 Inventory & Logistics Module

#### `inventory`
| Column | Type | Notes |
|--------|------|-------|
| company_id + product_id + warehouse_location | | UNIQUE composite |
| quantity_on_hand | INTEGER | |
| quantity_reserved | INTEGER | |
| quantity_available | INTEGER | GENERATED ALWAYS AS (on_hand - reserved) |
| quantity_incoming | INTEGER | |
| reorder_point | INTEGER | |
| average_cost, last_purchase_cost | DECIMAL | |
| quantity_allocated_b2b/b2c | INTEGER | Channel allocation |

#### `customers`
| Column | Type | Notes |
|--------|------|-------|
| company_id | UUID | FK |
| payment_days_after_delivery | INTEGER | DEFAULT 30 |
| credit_limit | DECIMAL | |
| tracking_alert_days | INTEGER | DEFAULT 14 |
| kvk_number, btw_number, iban | TEXT | Dutch business IDs |

#### `sales_orders` + `sales_order_items`
Full order management with shipping address, billing, tax, payment tracking.

#### `shipping_tasks`
| Column | Type | Notes |
|--------|------|-------|
| sales_order_id | UUID | FK |
| carrier, track_trace_code | TEXT | REQUIRED for shipping completion |
| status | TEXT | pending, ready_to_ship, shipped, delivered, cancelled |

#### `tracking_jobs` + `tracking_history`
Delivery tracking agent with carrier API integration and escalation rules.

#### `expected_deliveries`
| Column | Type | Notes |
|--------|------|-------|
| expense_id | UUID | FK → expenses (purchase origin) |
| product_id | UUID | FK |
| quantity_expected/received | INTEGER | |
| quantity_remaining | INTEGER | GENERATED column |
| status | TEXT | pending, partial, complete, cancelled |

#### `receiving_log`
| Column | Type | Notes |
|--------|------|-------|
| expected_delivery_id | UUID | FK |
| product_id | UUID | FK |
| quantity_received | INTEGER | |
| ean_scanned | VARCHAR(20) | Barcode scanning |
| receiving_session_id | UUID | FK (Blueprint addition) |

#### `stock_purchases` + `stock_purchase_line_items`
Separate purchase tracking from expenses (added Jan 2026).

### 2.8 Blueprint / Warehouse Module

#### `purchase_groups`
Groups multiple purchases under one ordering moment with B2B/B2C channel allocation.

#### `receiving_sessions`
Groups scan events into receiving moments (active/closed).

#### `shipments`
| Column | Type | Notes |
|--------|------|-------|
| shipment_type | TEXT | 'b2b' or 'b2c_lvb' |
| verification_status | TEXT | pending, verified, discrepancy |
| bol_shipment_id | TEXT | bol.com integration |

#### `pallets` + `pallet_items`
Physical pallet management within shipments. Items tracked with EAN and verified quantities.

#### `returns` + `return_items`
| Column | Type | Notes |
|--------|------|-------|
| source | TEXT | bolcom, shopify, manual, other |
| status | TEXT | registered, received, inspected, processed |
| action per item | TEXT | restock, dispose, inspect, pending |

#### `product_sales_channels` (Junction)
Maps products to channels (b2b, b2c, bolcom, shopify). UNIQUE(company_id, product_id, channel).

#### `channel_audit_log`
Tracks channel assignment changes.

### 2.9 bol.com Integration

#### `bolcom_credentials`
Encrypted client_id/secret, access_token with token_expires_at. Auto-refreshed via pg_cron every 4 minutes.

#### `bolcom_offer_mappings`
Maps internal products to bol.com offers via EAN.

#### `bolcom_pending_process_statuses`
Tracks async process-status calls from bol.com API.

### 2.10 Shopify Integration

#### `shopify_credentials`
Permanent OAuth tokens (encrypted), webhook management, sync configuration.

#### `shopify_product_mappings`
Maps internal products to Shopify product/variant IDs.

### 2.11 Inbox / Messaging System

#### `channels`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | Creator |
| type | TEXT | direct, group, announcement, etc. |
| is_archived | BOOLEAN | |
| last_message_at | TIMESTAMPTZ | Auto-updated by trigger |

#### `messages`
| Column | Type | Notes |
|--------|------|-------|
| channel_id | UUID | FK |
| thread_id | UUID | FK → messages (self-reference for threads) |
| content | TEXT | |
| reply_count | INTEGER | Auto-managed by triggers |

#### `channel_members`
Tracks membership and roles (admin, moderator, member).

#### `channel_read_status`
Last-read tracking per user per channel for unread counts.

#### `message_reads`
Individual message read receipts.

#### `b2b_chat_messages`
B2B portal chat between clients and vendors.

**Real-time:** `messages`, `channels`, `channel_members`, `channel_read_status`, `message_reads` all have real-time enabled.

### 2.12 SYNC AI Agent (Memory System)

#### `sync_sessions`
| Column | Type | Notes |
|--------|------|-------|
| session_id | TEXT | UNIQUE |
| user_id | UUID | FK → auth.users |
| messages | JSONB | Recent message buffer |
| conversation_summary | TEXT | Compressed history |
| active_entities | JSONB | Tracked clients/products |
| context | JSONB | |

#### `sync_memory_chunks`
| Column | Type | Notes |
|--------|------|-------|
| chunk_type | TEXT | conversation, summary, entity, action_success, action_template, preference |
| content | TEXT | |
| embedding | vector(1024) | BAAI/bge-large-en-v1.5 |
| importance_score | FLOAT | |

**Index:** IVFFlat with 100 lists for vector_cosine_ops.

#### `sync_entities`
Long-term entity memory with vector embeddings. Types: client, prospect, product, supplier, preference, workflow.

#### `sync_action_templates`
Successful action patterns for intent matching with vector search.

### 2.13 Admin Platform

#### `platform_settings`
Key-value store for global platform configuration (platform_name, maintenance_mode, max_users_per_org, etc.).

#### `feature_flags`
Feature toggle system with rollout_percentage and target_organizations/target_users arrays.

#### `admin_audit_logs`
Immutable audit trail (no update/delete policies).

#### `platform_admins`
Platform-level admin designation with roles: super_admin, admin, support, analyst.

### 2.14 Sentinel (Compliance) Module

#### `compliance_frameworks`
| Column | Type | Notes |
|--------|------|-------|
| company_id | UUID | FK |
| slug | TEXT | UNIQUE per company |
| status | TEXT | not-started, in-progress, audit-ready, certified |
| total_controls | INTEGER | |

#### `compliance_controls`
Individual controls within frameworks with severity levels and implementation status.

#### `compliance_control_mappings`
Cross-framework control mapping (equivalent, partial, related).

#### `compliance_evidence`
Evidence attachments for controls with type classification.

#### `ai_systems`
AI system inventory for EU AI Act compliance tracking.

### 2.15 Semantic Pipeline (Desktop App)

#### `semantic_entities`
Desktop-observed entities (people, projects, tools) with privacy levels.

#### `semantic_activities`
Classified desktop activities (coding, communication, research, etc.).

#### `semantic_threads`
Activity threads grouping related events.

#### `semantic_intents`
Classified user intents from desktop behavior.

#### `behavioral_signatures`
Computed behavioral metrics (productivity patterns, focus time, etc.).

**All scoped:** UNIQUE(user_id, entity_id/activity_id/thread_id/intent_id).

### 2.16 Other Notable Tables

| Table | Module | Purpose |
|-------|--------|---------|
| `tasks` | Core | Task management (extended to v2 with labels, checklist, draft) |
| `chat_conversations` | Core | AI chat history |
| `chat_progress` | Core | Chat progress tracking |
| `intelligence_progress` | Core | Batch intelligence job tracking |
| `regeneration_jobs` | Core | Batch regeneration tracking |
| `ai_usage_log` | AI | Per-generation cost tracking |
| `ai_usage_limits` | AI | Per-company cost limits |
| `daily_journals` | Desktop | AI-generated daily summaries |
| `desktop_activity_sessions` | Desktop | Desktop activity sync |
| `sms_conversations` / `sms_messages` | SMS | Twilio SMS integration |
| `organization_phone_numbers` | SMS | Twilio phone numbers |
| `user_integrations` | Composio | Third-party connection references |
| `composio_webhook_events` | Composio | Incoming webhook events |
| `bookmarks` | UI | User bookmarks |
| `user_notifications` / `activity_log` | Notifications | Real-time notifications |
| `user_panel_preferences` | UI | Panel customization settings |
| `enrichment_cache_prospects` | Enrichment | 90-day Explorium cache |
| `enrichment_cache_companies` | Enrichment | 180-day Explorium cache |
| `video_projects` / `render_queue` | Video | AI video generation |
| `product_listings` | Storefront | Published product listings |
| `b2b_storefront_config` | B2B | B2B wholesale storefront settings |
| `roadmap_items` | Admin | Product roadmap tracking (real-time) |
| `agent_registry` | Agents | Agent platform foundation |
| `pending_actions` | Tasks | Real-time action queue |
| `subscriptions` | Billing | Subscription management |

---

## 3. Foreign Key Relationships

### Core Hierarchy
```
auth.users
  └── users (extended profile)
       ├── organization_id → organizations
       └── company_id → companies
            └── organization_id → organizations
```

### Talent Domain (organization_id scoped)
```
organizations
  ├── candidates (organization_id)
  │     ├── outreach_tasks
  │     ├── candidate_campaign_matches
  │     └── sync_intel_queue
  ├── campaigns (organization_id)
  │     ├── outreach_tasks
  │     └── candidate_campaign_matches
  ├── projects (organization_id)
  │     └── roles
  │           └── campaigns
  └── prospects (organization_id)
       ├── crm_activities
       └── crm_notes
```

### Inventory/Blueprint Domain (company_id scoped)
```
companies
  ├── products
  │     ├── digital_products (1:1)
  │     ├── physical_products (1:1)
  │     ├── inventory
  │     ├── product_sales_channels
  │     ├── bolcom_offer_mappings
  │     └── shopify_product_mappings
  ├── suppliers
  │     └── expenses
  ├── customers
  │     └── sales_orders
  │           ├── sales_order_items
  │           ├── shipping_tasks
  │           │     └── tracking_jobs
  │           │           └── tracking_history
  │           └── returns
  ├── expenses
  │     └── expense_line_items
  │           └── expected_deliveries
  ├── purchase_groups
  │     └── stock_purchases
  ├── shipments
  │     └── pallets
  │           └── pallet_items
  ├── invoices
  │     └── proposals
  └── accounts (Chart of Accounts)
       └── journal_entries
             └── journal_entry_lines
```

### Nests (Cross-domain)
```
nests
  ├── nest_items (polymorphic → candidates | prospects | raise_investors)
  └── nest_purchases (organization_id scoped)
```

---

## 4. RLS Policies and Access Patterns

### Pattern 1: Company-Scoped (Inventory Domain)
Most inventory/finance tables use `get_user_company_id()` helper:
```sql
CREATE POLICY "table_select" ON table
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());
```
Applied via `create_company_rls_policies()` helper function to: customers, inventory, expenses, expected_deliveries, receiving_log, sales_orders, shipping_tasks, tracking_jobs, notifications, email_accounts, email_messages.

### Pattern 2: Organization-Scoped (Talent Domain)
Talent tables check organization membership:
```sql
USING (organization_id IN (
  SELECT organization_id FROM users WHERE id = auth.uid()
))
```

### Pattern 3: Optimized Wrapper Functions
Performance-optimized RLS using STABLE SECURITY DEFINER wrappers:
```sql
auth_uid()          -- Cached auth.uid()
auth_role()         -- Cached auth.role()
auth_company_id()   -- Cached company_id lookup
auth_hierarchy_level() -- Cached RBAC level
user_in_company()   -- Company membership check
```

### Pattern 4: Platform Admin
Admin tables use `is_platform_admin()` / `is_super_admin()`:
```sql
USING (is_platform_admin())
```

### Pattern 5: Service Role
SYNC memory tables allow full access (edge functions use service_role):
```sql
FOR ALL USING (true) WITH CHECK (true)
```

### Pattern 6: Public + Purchase Access (Nests)
Nests have layered access:
- Active nests visible to all authenticated users
- Preview items visible to all
- Full items visible only to organizations that completed purchase
- Platform admins have full management access

### Pattern 7: User-Scoped (Semantic Pipeline)
Desktop data strictly user-scoped:
```sql
USING (user_id = auth_uid())
```

### Key RLS Helper Functions
| Function | Purpose |
|----------|---------|
| `get_user_company_id()` | Returns company_id for current user |
| `auth_uid()` | STABLE cached auth.uid() |
| `auth_company_id()` | STABLE cached company_id |
| `is_platform_admin()` | Platform admin check |
| `is_super_admin()` | Super admin check |
| `is_feature_enabled(slug)` | Feature flag check with rollout |
| `user_has_permission(uid, perm)` | RBAC permission check |
| `user_has_role(uid, role)` | RBAC role check |

---

## 5. Edge Functions

### Total: ~120 edge functions configured in `config.toml`

All functions have `verify_jwt = false` (JWT validation done within functions where needed).

### By Category

#### SYNC AI Agent
| Function | Purpose |
|----------|---------|
| `sync` | Main AI orchestrator — natural language to 51 actions |
| `sync-voice` | Voice interface for SYNC |
| `sync-voice-demo` | Demo voice agent |
| `sync-meeting-wrapup` | Meeting summary generator |

#### Talent / Recruitment
| Function | Purpose |
|----------|---------|
| `generateCandidateIntelligence` | Flight risk intelligence per candidate |
| `analyzeCampaignProject` | AI-powered candidate matching with custom weights |
| `generateCampaignOutreach` | Personalized outreach message generation |
| `executeTalentOutreach` | Execute outreach pipeline |
| `processOutreachScheduler` | Scheduled outreach processing |
| `process-sync-intel-queue` | Background intel queue processor |

#### Enrichment
| Function | Purpose |
|----------|---------|
| `explorium-enrich` | Prospect enrichment with 90-day cache |
| `exploriumPeople` | People search via Explorium |
| `exploriumFirmographics` | Company firmographics |
| `generateCompanyIntelligence` | Company intel with 180-day cache |
| `auto-enrich-company` | Automatic company enrichment |

#### Finance
| Function | Purpose |
|----------|---------|
| `process-invoice` | AI invoice extraction (Groq LLM) |
| `smart-import-invoice` | Smart invoice import |
| `send-invoice-email` | Invoice delivery via email |
| `send-proposal-email` | Proposal delivery |
| `email-invoice-import` | Import invoices from email |
| `finance-ai-accountant` | AI-assisted bookkeeping |
| `revolut-sync` | Revolut bank transaction sync |

#### Products / Content
| Function | Purpose |
|----------|---------|
| `research-product` | AI product research |
| `research-supplier` | AI supplier research |
| `generate-image` | FLUX image generation (Together.ai) |
| `generate-video` / `generate-fashion-video` | AI video generation |
| `generate-storyboard` / `render-video` / `assemble-video` | Video pipeline |
| `generate-listing-copy` | AI product copy |
| `generate-podcast` | AI podcast generation |
| `scrape-product-url` | Product data scraping |

#### bol.com
| Function | Purpose |
|----------|---------|
| `bolcom-api` | bol.com Retailer API proxy |
| `bolcom-webhooks` | bol.com webhook handler |
| `sync-studio-publish-bol` | Publish to bol.com from Studio |
| `product-feed-sync` | Product feed synchronization |

#### Shopify
| Function | Purpose |
|----------|---------|
| `shopify-api` | Shopify Admin API proxy |
| `shopify-webhooks` | Shopify webhook handler |

#### B2B Portal
| Function | Purpose |
|----------|---------|
| `b2b-portal-api` | B2B portal API |
| `b2b-create-order` | B2B order creation |
| `b2b-checkout-otp` | OTP verification for checkout |
| `b2b-order-webhook` | B2B order webhook |

#### SMS / Voice
| Function | Purpose |
|----------|---------|
| `sms-send` | Send SMS via Twilio |
| `sms-webhook` | Incoming SMS handler |
| `sms-ai-respond` | AI-powered SMS responses |
| `twilio-numbers` | Phone number management |
| `twilio-token` | Twilio access token generation |
| `voice-webhook` | Voice call webhook |

#### Composio (Third-Party Integrations)
| Function | Purpose |
|----------|---------|
| `composio-connect` | OAuth connection management for 30+ services |
| `composio-webhooks` | Composio webhook handler |

#### REACH (Marketing)
| Function | Purpose |
|----------|---------|
| `reach-analyze-brand-voice` | Brand voice analysis |
| `reach-generate-copy` | Marketing copy generation |
| `reach-seo-scan` | SEO analysis |
| `reach-publish-post` | Social media publishing (stub) |
| `reach-generate-ad-copy` / `reach-generate-ad-image` / `reach-generate-ad-video` | Ad generation |
| `reach-fetch-metrics` | Social metrics (stub) |

#### Studio (AI Photography)
| Function | Purpose |
|----------|---------|
| `sync-studio-import-catalog` | Import product catalog |
| `sync-studio-generate-plans` | Generate shoot plans |
| `sync-studio-approve-plan` / `sync-studio-update-plan` | Plan management |
| `sync-studio-execute-photoshoot` | Execute AI photoshoot |
| `sync-studio-regenerate-shot` | Regenerate individual shot |
| `sync-studio-export-zip` | Export session as ZIP |

#### Brand Builder
| Function | Purpose |
|----------|---------|
| `generate-brand-strategy` | AI brand strategy |
| `generate-verbal-identity` | Verbal identity system |
| `generate-visual-language` | Visual language system |

#### Admin / Platform
| Function | Purpose |
|----------|---------|
| `admin-api` | Platform admin API |
| `api-diagnostics` | API health diagnostics |
| `health-runner` | Health check runner |
| `agents` | Agent platform management |

#### Other
| Function | Purpose |
|----------|---------|
| `embed-document` / `search-knowledge` / `scrape-embed` | RAG knowledge base |
| `execute-ai-node` / `execute-flow-node` / `process-queue` | Workflow engine |
| `growth-ai-execute` | Growth AI actions |
| `map-import-columns` / `map-contact-columns` / `map-nest-columns` | AI column mapping |
| `store-builder-ai` | AI store builder chat |
| `manage-custom-domain` | Custom domain management |
| `scheduling-orchestrator` | Job scheduling |
| `aftership-register` / `aftership-webhooks` | AfterShip tracking |
| `tracking-checkpoint-manual` / `tracking-cycle` | Tracking management |
| `vendor-research` | Vendor research AI |
| `generate-user-profile` | AI profile generation |

---

## 6. Stored Procedures / RPC Functions

### Vector Search Functions (pgvector)
| Function | Parameters | Returns |
|----------|-----------|---------|
| `search_sync_memory` | query_embedding, user_id, company_id, types, threshold, limit | id, chunk_type, content, metadata, similarity |
| `search_sync_entities` | query_embedding, user_id, company_id, types, limit | id, entity_type, entity_name, attributes, similarity |
| `search_action_templates` | query_embedding, user_id, company_id, action_type, limit | id, action_type, intent_description, action_data, similarity |

### Nest Management
| Function | Purpose |
|----------|---------|
| `copy_nest_to_organization(nest_id, org_id, purchase_id)` | Copies nest entities to buyer's organization + queues intel |
| `get_nest_stats(nest_id)` | Returns purchase stats, revenue |
| `update_nest_item_count()` | Trigger function to maintain item_count |

### Inventory Automation
| Function | Purpose |
|----------|---------|
| `update_inventory_on_receive()` | Trigger: auto-updates inventory when receiving_log row inserted |
| `reserve_inventory()` | Trigger: reserves stock when sales_order confirmed |
| `release_inventory_on_ship()` | Trigger: decrements stock when order shipped |
| `generate_sales_order_number()` | Trigger: auto-generates SO2026XXXXX numbers |
| `generate_shipping_task_number()` | Trigger: auto-generates ST2026XXXXX numbers |

### Finance
| Function | Purpose |
|----------|---------|
| `generate_proposal_number(company_id)` | Generates PROP-YYYY-XXXX numbers |
| `set_proposal_number()` | Trigger for auto-generation |
| `post_expense_with_tax(...)` | Posts expense to GL with tax handling |
| `auto_create_fiscal_periods(company_id, year)` | Creates 12 monthly fiscal periods |

### Admin Platform
| Function | Purpose |
|----------|---------|
| `is_platform_admin()` | Check if current user is platform admin |
| `is_super_admin()` | Check for super admin role |
| `get_admin_role()` | Get current admin's role level |
| `is_feature_enabled(slug, user_id, org_id)` | Feature flag check with rollout percentage |
| `admin_get_settings(category, include_sensitive)` | Get platform settings |
| `admin_update_setting(key, value)` | Update setting + audit log |
| `admin_get_audit_logs(limit, offset, filters)` | Paginated audit logs |
| `admin_create_audit_log(...)` | Create audit entry |

### RLS Helpers
| Function | Purpose |
|----------|---------|
| `auth_uid()` | STABLE SECURITY DEFINER cached auth.uid() |
| `auth_role()` | STABLE cached auth.role() |
| `auth_company_id()` | STABLE cached company_id |
| `auth_hierarchy_level()` | STABLE cached RBAC hierarchy level |
| `user_in_company(company_id)` | Company membership check |
| `get_user_company_id()` | Company_id for current user |
| `create_company_rls_policies(table_name)` | Generate standard RLS policies |
| `user_has_permission(user_id, perm)` | RBAC permission check |
| `user_has_role(user_id, role)` | RBAC role check |

### Candidate Exclusion
| Function | Purpose |
|----------|---------|
| `normalize_company_name(name)` | Strips suffixes (inc, llc, b.v., gmbh) |
| `match_excluded_client(company, org_id)` | 4-tier matching (exact → alias → fuzzy → fuzzy_alias) |
| `exclude_candidates_for_client(client_id, org_id)` | Bulk retroactive exclusion |

### SYNC Memory
| Function | Purpose |
|----------|---------|
| `increment_entity_interaction(user_id, type, name)` | Track entity mentions |
| `increment_action_template_success(template_id)` | Track successful actions |
| `cleanup_old_sync_memory(days)` | Maintenance: delete old low-importance chunks |

### Encryption (bol.com / Shopify)
| Function | Purpose |
|----------|---------|
| `encrypt_bolcom_credential(plaintext, key)` | PGP symmetric encryption |
| `decrypt_bolcom_credential(ciphertext, key)` | PGP symmetric decryption |
| `encrypt_shopify_credential(plaintext, key)` | PGP symmetric encryption |
| `decrypt_shopify_credential(ciphertext, key)` | PGP symmetric decryption |

### Inbox
| Function | Purpose |
|----------|---------|
| `increment_reply_count(message_id)` | Atomic reply counter |
| `decrement_reply_count(message_id)` | Atomic reply decrement |
| `update_channel_last_message()` | Trigger: updates channel timestamp on new message |
| `handle_reply_delete()` | Trigger: decrements parent reply count on delete |

---

## 7. Real-Time Configuration

The following tables have real-time replication enabled via `supabase_realtime` publication:

| Table | Module | Purpose |
|-------|--------|---------|
| `messages` | Inbox | Live message delivery |
| `channels` | Inbox | Channel updates |
| `channel_members` | Inbox | Membership changes |
| `channel_read_status` | Inbox | Unread count updates |
| `message_reads` | Inbox | Read receipt tracking |
| `b2b_chat_messages` | B2B Portal | Live B2B chat |
| `user_notifications` | Notifications | Real-time notifications |
| `activity_log` | Notifications | Activity feed |
| `agent_registry` | Agent Platform | Agent status updates |
| `agent_activity_log` | Agent Platform | Agent activity |
| `health_check_results` | Agent Platform | Health monitoring |
| `github_pull_requests` | Agent Platform | PR tracking |
| `roadmap_items` | Admin | Roadmap updates |
| `reach_scheduled_posts` | REACH | Scheduled post updates |
| `reach_performance_metrics` | REACH | Metrics updates |
| `shipment_checkpoints` | Logistics | Tracking updates |
| `pending_actions` | Tasks | Real-time action queue |

---

## 8. Module-to-Table Mapping

### Talent Module (Recruitment)
- candidates, campaigns, outreach_tasks, outreach_messages
- projects, roles, tasks (shared)
- nests, nest_items, nest_purchases
- sync_intel_queue, candidate_campaign_matches
- user_panel_preferences

### Growth Module (CRM/Sales)
- prospects, crm_activities, crm_notes
- growth_nests, growth_nest_items, growth_nest_purchases
- campaigns (shared with talent via campaign_type)

### Finance Module
- invoices, proposals, expenses, expense_line_items
- accounts, account_types, journal_entries, journal_entry_lines
- fiscal_periods, tax_periods, tax_submissions
- recurring_invoices, credit_notes
- bank_reconciliation_sessions, bank_transactions
- vendors, bills, bill_line_items, subscriptions

### Products Module
- products, digital_products, physical_products
- product_categories, product_bundles, suppliers
- product_listings, product_sales_channels
- product_listing_videos

### Inventory Module
- inventory, stock_purchases, stock_purchase_line_items
- expected_deliveries, receiving_log, receiving_sessions
- customers, sales_orders, sales_order_items
- shipping_tasks, tracking_jobs, tracking_history

### Blueprint Module (Warehouse)
- purchase_groups, receiving_sessions
- shipments, pallets, pallet_items
- returns, return_items
- product_sales_channels, channel_audit_log

### Inbox Module
- channels, messages, channel_members
- channel_read_status, message_reads, bookmarks

### SYNC AI Module
- sync_sessions, sync_memory_chunks
- sync_entities, sync_action_templates

### Admin Module
- platform_settings, feature_flags
- admin_audit_logs, platform_admins

### Sentinel Module (Compliance)
- compliance_frameworks, compliance_controls
- compliance_control_mappings, compliance_evidence
- ai_systems

### Semantic Pipeline (Desktop)
- semantic_entities, semantic_activities
- semantic_threads, semantic_intents
- behavioral_signatures
- desktop_activity_sessions, daily_journals

### Integrations
- user_integrations, composio_webhook_events
- composio_trigger_subscriptions
- bolcom_credentials, bolcom_offer_mappings
- shopify_credentials, shopify_product_mappings
- email_accounts, email_messages

### Content / AI
- ai_usage_log, ai_usage_limits
- video_projects, render_queue
- generated_content (storage)

---

## 9. Database Triggers Summary

| Trigger | Table | Purpose |
|---------|-------|---------|
| `products_updated_at` | products | Auto-update updated_at |
| `suppliers_updated_at` | suppliers | Auto-update updated_at |
| `product_categories_updated_at` | product_categories | Auto-update updated_at |
| `tr_set_proposal_number` | proposals | Auto-generate proposal numbers |
| `tr_product_bundles_updated_at` | product_bundles | Auto-update updated_at |
| `tr_proposals_updated_at` | proposals | Auto-update updated_at |
| `trigger_update_inventory_on_receive` | receiving_log | Auto-update inventory + expected_deliveries |
| `trigger_reserve_inventory` | sales_orders | Reserve inventory on order confirmation |
| `trigger_release_inventory_on_ship` | sales_orders | Release inventory on shipping |
| `trigger_sales_order_number` | sales_orders | Auto-generate SO numbers |
| `trigger_shipping_task_number` | shipping_tasks | Auto-generate ST numbers |
| `trigger_nest_item_count` | nest_items | Maintain nest item_count |
| `sync_sessions_activity_trigger` | sync_sessions | Update last_activity timestamp |
| `outreach_tasks_updated_at_trigger` | outreach_tasks | Auto-update updated_at |
| `trg_update_channel_last_message` | messages | Update channel last_message_at |
| `trg_handle_reply_delete` | messages | Decrement parent reply_count |
| `platform_settings_updated_at` | platform_settings | Auto-update updated_at |
| `feature_flags_updated_at` | feature_flags | Auto-update updated_at |
| `platform_admins_updated_at` | platform_admins | Auto-update updated_at |

---

## 10. Storage Buckets

| Bucket | Public | Size Limit | MIME Types | Purpose |
|--------|--------|------------|------------|---------|
| `avatars` | Yes | 5MB | image/* | User profile pictures |
| `documents` | No | 50MB | pdf, doc, docx, txt | Private documents |
| `attachments` | No | 25MB | any | Message/task attachments |
| `exports` | No | 100MB | json, csv, xlsx | Data exports |
| `product-images` | Yes | 10MB | image/jpeg, png, webp, gif | Product catalog images |
| `generated-content` | Yes | unlimited | any | AI-generated images/videos |
| `brand-assets` | Yes | 10MB | image/*, svg | Company logos & branding |

All storage policies follow the pattern: public read (if public bucket) + authenticated upload/update/delete scoped to company folder.

---

## 11. Key Architectural Observations

### Dual Tenant Scoping
- **Talent domain** uses `organization_id` for multi-tenant isolation
- **Inventory/Finance/Blueprint domain** uses `company_id` via `get_user_company_id()`
- The `companies` table links to `organizations` but they serve different scoping purposes

### Performance Optimizations
- STABLE SECURITY DEFINER wrapper functions cache auth values per query
- IVFFlat indexes on vector columns for fast similarity search
- GIN indexes on JSONB columns (skills, matched_candidates, etc.)
- Partial indexes on status columns (WHERE status = 'active', etc.)

### Security Model
- All tables have RLS enabled
- Service role bypasses RLS (edge functions)
- Platform admin functions use SECURITY DEFINER with explicit admin checks
- Encrypted credentials for bol.com and Shopify tokens
- HMAC verification on Twilio, Stripe, and Composio webhooks

### Vector Search (pgvector)
- 1024-dimension embeddings (BAAI/bge-large-en-v1.5 model)
- Used for SYNC AI memory retrieval, entity matching, and action template matching
- IVFFlat indexes with 50-100 lists

### Migration Naming
- Early migrations: sequential numbering (001, 002, etc.)
- Later migrations: timestamp-based (YYYYMMDDHHMMSS format)
- Some mid-period migrations use just date (20260116_xxx)

---

*This analysis covers ~170 migration files, ~120 edge functions, and the complete database schema as of March 2026.*

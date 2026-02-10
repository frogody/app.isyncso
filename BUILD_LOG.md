# BUILD LOG — Blueprint Build Plan

## Active Phase: Phase 0 — Database Foundation & Infrastructure
## Last Updated: 2026-02-10T23:45:00Z
## Next Task: P1-1 — ManualPurchaseModal component (Phase 1 start)

---

## Compaction Recovery Protocol

If you've just started a new session or context was compacted, read these files in order:
1. `CLAUDE.md` — project conventions + build progress summary
2. `BUILD_LOG.md` — this file (detailed task record + what's next)
3. `BLUEPRINT_BUILD_PLAN.md` — full plan + progress tracker checkboxes (Section 10)

---

## Work Pattern (per task)

1. Read `BUILD_LOG.md` → understand current state
2. Read relevant section of `BLUEPRINT_BUILD_PLAN.md` → task spec
3. Implement the task
4. Verify via Supabase MCP (DB) or file reads (code)
5. Update `BUILD_LOG.md` (completed entry) + `BLUEPRINT_BUILD_PLAN.md` (check box)
6. Git commit with task ID (e.g., `Phase 0: P0-1 — Create foundation migration`)

---

## Completed Work

### Phase 0: Database Foundation & Infrastructure

> **Started**: 2026-02-10
> **Status**: In Progress

#### Task: P0-1 + P0-2 + P0-3 + P0-4 + P0-8 — Foundation Migration (tables, columns, RLS, indexes, triggers, verification)
- **What was done**: Created and applied `20260211000000_blueprint_foundation.sql` containing:
  - 9 new tables: `purchase_groups`, `receiving_sessions`, `shipments`, `pallets`, `pallet_items`, `returns`, `return_items`, `product_sales_channels`, `channel_audit_log`
  - 11 new columns on 4 existing tables (`stock_purchases`, `stock_purchase_line_items`, `expected_deliveries`, `receiving_log`, `inventory`)
  - 9 RLS policies (all using `get_user_company_id()` pattern, child tables use subquery to parent)
  - 33 composite indexes covering all query patterns
  - 4 trigger functions + 8 triggers (auto-update `updated_at`, purchase group totals, shipment totals, receiving session totals)
- **Key decisions**:
  - Used `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` for idempotent re-runs
  - FK reference corrected: `vendors(id)` → `suppliers(id)` (actual table name in DB)
  - Column name corrected: `total_price` → `line_total` (actual column on `stock_purchase_line_items`)
  - Added `shopify` as a valid `source` on `returns` table (plan only had `bolcom`, `manual`, `other`)
  - `update_updated_at_column()` already existed — used `CREATE OR REPLACE` to avoid conflict
  - RLS uses `FOR ALL TO authenticated` with `get_user_company_id()` for consistency
- **Files changed**:
  - `supabase/migrations/20260211000000_blueprint_foundation.sql` (created)
  - `BLUEPRINT_BUILD_PLAN.md` (fixed `vendors` → `suppliers` FK reference, checked off P0-1 through P0-4 + P0-8)
- **Gotchas/Notes**:
  - The `vendors` table referenced in the plan does not exist — the actual table is `suppliers`. Plan was updated.
  - `stock_purchase_line_items.line_total` is the actual column, not `total_price` as assumed in plan
  - All 5 `set_updated_at` triggers applied via DO block with EXCEPTION handler for idempotency
- **Verification**: All 9 tables confirmed via `information_schema.tables` query. All 11 columns, 9 policies, 33 indexes, and 8 triggers verified as created successfully with zero failures.

#### Task: P0-5 — Enable pg_cron extension
- **What was done**: Enabled `pg_cron` extension (v1.6.4) via `CREATE EXTENSION IF NOT EXISTS pg_cron`. Verified with test schedule/unschedule cycle. Also confirmed `pg_net` (v0.19.5) is already available for HTTP calls from cron jobs.
- **Key decisions**: pg_cron + pg_net together enable the pattern: `cron.schedule() → net.http_post() → Edge Function`. This is how bol.com token refresh, ProcessStatus polling, and Shopify backup polls will work.
- **Files changed**: None (extension enabled via SQL, no migration file needed)
- **Gotchas/Notes**: pg_cron was NOT previously enabled. pg_net WAS already enabled. Cron jobs from later phases will use `net.http_post()` to invoke Edge Functions on schedule.
- **Verification**: `cron.schedule('test-blueprint-cron', ...)` returned job ID 1; `cron.unschedule(...)` returned true. Extension confirmed working.

#### Task: P0-6 — RLS audit for sales_order_items + inventory tables
- **What was done**: Applied RLS policy to `sales_order_items` which had RLS enabled but zero policies (effectively blocking all access). Audited all 10 inventory-domain tables.
- **Key decisions**: Used same `get_user_company_id()` pattern. `sales_order_items` accesses via parent table JOIN (`sales_order_id IN (SELECT id FROM sales_orders WHERE company_id = get_user_company_id())`).
- **Files changed**: None (SQL applied directly via Supabase MCP)
- **Gotchas/Notes**: `sales_order_items` already had RLS *enabled* but had ZERO policies — meaning authenticated users were default-denied from all access. The fix adds a `FOR ALL` policy. Tables with only 1 policy (`products`, `stock_purchases`, `stock_purchase_line_items`) lack explicit `WITH CHECK` for writes — acceptable for now.
- **Verification**: All 10 inventory tables confirmed: RLS enabled + at least 1 policy each. No tables with rls_enabled=false or policy_count=0.

#### Task: P0-7 — Document tenant scoping convention
- **What was done**: Already completed during blueprint amendment phase. Convention documented in both `CLAUDE.md` (Blueprint Build Progress section) and `BLUEPRINT_BUILD_PLAN.md` (Phase 0 banner).
- **Key decisions**: `company_id` via `get_user_company_id()` for all inventory/logistics domain tables. `organization_id` via `get_user_organization_id()` for talent domain only.
- **Files changed**: `CLAUDE.md`, `BLUEPRINT_BUILD_PLAN.md` (both previously updated)
- **Gotchas/Notes**: The existing `products` table uses `auth_uid()` wrapper while `inventory` uses `get_user_company_id()` — all new Blueprint tables follow the `get_user_company_id()` pattern consistently.
- **Verification**: Convention is documented in both files and all 9 new Blueprint table policies use the correct pattern.

---

### Phase 0: COMPLETE

**Summary**: All 8 tasks completed. Database foundation is fully deployed:
- 9 new tables with RLS, indexes, and triggers
- 11 new columns on 4 existing tables
- pg_cron enabled for scheduled jobs in later phases
- RLS gap on `sales_order_items` fixed
- Tenant scoping convention documented


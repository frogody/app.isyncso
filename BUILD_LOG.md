# BUILD LOG — Blueprint Build Plan

## Active Phase: Phase 1 — Purchasing Overhaul
## Last Updated: 2026-02-11T01:00:00Z
## Next Task: P1-9 (or Phase 2 start)

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

---

### Phase 1: Purchasing Overhaul

> **Started**: 2026-02-11
> **Status**: In Progress

#### Task: P1-1 — ManualPurchaseModal component
- **What was done**: Created `ManualPurchaseModal.jsx` — full manual purchase entry form with supplier selector (existing + create new), purchase group name, date picker, sales channel radio (B2B/B2C/Onbepaald), dynamic line items (EAN lookup, product name, qty, price, country, URL, remarks), auto-create products for unknown EANs, totals calculation.
- **Key decisions**: Dutch UI labels (Leverancier, Groepsnaam, Verkoopkanaal). Sets `entry_method='manual'`, `status='approved'` on submit. Auto-creates products for unknown EANs. Creates purchase_group if group name provided.
- **Files changed**: `src/components/purchases/ManualPurchaseModal.jsx` (created)
- **Gotchas/Notes**: Uses `scanBarcode()` from inventory.ts for EAN lookup with UPC-A/EAN-13 conversion support.

#### Task: P1-3 — Integrate manual entry into StockPurchases page
- **What was done**: Added "Handmatige Inkoop" button (variant="outline" with ShoppingCart icon) next to "Upload Invoice" button. Added ManualPurchaseModal rendering with `onPurchaseCreated={loadStockPurchases}` for auto-refresh.
- **Files changed**: `src/pages/StockPurchases.jsx` (modified — import, state, button, modal render)

#### Task: P1-4 — Add B2B/B2C channel field to purchase flow
- **What was done**: Built into ManualPurchaseModal as radio group (B2B/B2C/Onbepaald). Channel is stored on the purchase_group record via `sales_channel` column.
- **Files changed**: Part of P1-1 (ManualPurchaseModal.jsx)

#### Task: P1-7 — Fix orphaned trigger
- **What was done**: Created `create_expected_deliveries_on_insert()` function (didn't exist despite plan saying it did) and wired INSERT trigger with `WHEN (NEW.status = 'approved')` guard.
- **Key decisions**: Modeled function on existing `_on_approval` version. INSERT trigger only fires for approved status to avoid creating deliveries for draft/pending purchases.
- **Gotchas/Notes**: Both the function AND the trigger were missing. Plan said function existed but it didn't.
- **Verification**: 5 triggers now on stock_purchases confirmed via pg_trigger query.

#### Task: P1-5 — Channel badges on ProductsPhysical + multi-select edit
- **What was done**:
  - **ProductsPhysical.jsx**: Added `channelFilter` state, `channelsMap` state, loads `product_sales_channels` data in loadData(), added "Kanaal" filter dropdown (Alle Kanalen / B2B / B2C), channel filter logic in `filteredProducts`, passes `salesChannels` prop to grid/list cards.
  - **ProductCard.jsx**: Added `CHANNEL_COLORS` map (B2B=blue, B2C=cyan), `salesChannels` prop to both `ProductGridCard` and `ProductListRow`, renders channel badges after stock badge with `flex-wrap` on grid card badge container.
  - **ProductModal.jsx**: Added `productChannels` state, loads existing channels from `product_sales_channels` on edit, added channel checkboxes (B2B/B2C) in Inventory tab under "Verkoopkanalen" section, syncs `product_sales_channels` on save (diff-based: only inserts added, deletes removed).
- **Key decisions**: B2B = blue-500, B2C = cyan-500 (consistent with app palette). Channel edit uses checkboxes not dropdown (per spec: "multi-select"). Diff-based sync avoids unnecessary deletes/inserts.
- **Files changed**: `src/pages/ProductsPhysical.jsx`, `src/components/products/ProductCard.jsx`, `src/components/products/ProductModal.jsx`

#### Task: P1-6 — Channel audit logging
- **What was done**: On save in ProductModal, after syncing `product_sales_channels`, inserts audit entries into `channel_audit_log` for each added channel (`old_channel=null, new_channel=ch`) and removed channel (`old_channel=ch, new_channel=null`).
- **Key decisions**: Uses correct `channel_audit_log` schema (old_channel/new_channel, not change_type). Only inserts when there are actual changes.
- **Files changed**: `src/components/products/ProductModal.jsx`

#### Task: P1-2 — Purchase group management
- **What was done**:
  - **StockPurchases.jsx**: Added `purchaseGroups` and `expandedGroups` state, loads groups alongside purchases, organizes expenses into `groupedExpenses` (keyed by group_id) and `ungroupedExpenses`. Added group filter Select dropdown (Alle Groepen / Ongegroepeerd / per group). Created `PurchaseGroupHeader` component with expand/collapse showing group name, channel badge, invoice count, supplier, date, total items, total value. Groups render first with their purchases indented under a left border, then ungrouped purchases below. Updated approve/reject handlers to use `loadStockPurchases()` for full refresh including groups.
- **Key decisions**: Groups show at top of list for visibility. Expand/collapse with left-border indentation for visual hierarchy. Channel badge on group header matches B2B/B2C/Onbepaald styling.
- **Files changed**: `src/pages/StockPurchases.jsx` (added Select imports, Layers + ChevronDown icons, PurchaseGroupHeader component, grouped list rendering, group filter)

#### Task: P1-8 — Bug fixes from browser testing
- **What was done**: Fixed 3 bugs found during manual browser testing of P1-1 through P1-7:
  - **BUG 1 (Critical): Channel filter returns 0 results** — Root cause: `handleProductSaved` in ProductsPhysical.jsx reloaded products and physical data but did NOT reload `channelsMap`. After saving channels in ProductModal, the page still had stale (empty) channel data. Fix: added channel reload (`product_sales_channels` query + channelsMap rebuild) to `handleProductSaved`.
  - **BUG 2 (Medium): No channel badges on product cards** — Same root cause as BUG 1. The `salesChannels` prop passed to ProductGridCard/ProductListRow comes from `channelsMap`, which was stale after save. Fixed by the same channel reload in `handleProductSaved`.
  - **BUG 3 (Low): Auto-created products from manual purchase not visible** — Root cause: ManualPurchaseModal.jsx inserted `product_type: "physical"` but the products table column is `type` (confirmed via migration `002_products_tables.sql`). ProductsPhysical filters by `Product.filter({ type: 'physical' })`, so auto-created products with wrong column name had `type` unset and were excluded. Fix: changed `product_type: "physical"` to `type: "physical"`.
- **Additional improvements**: Added error logging (`console.error`) to all `product_sales_channels` operations (insert, read, delete) in both ProductModal and ProductsPhysical — previously errors were silently swallowed.
- **Key decisions**: Channel reload uses same query pattern as initial `loadData` for consistency. Error logging added without toast notifications (channel ops are secondary to product save).
- **Files changed**:
  - `src/components/purchases/ManualPurchaseModal.jsx` — `product_type` → `type`
  - `src/pages/ProductsPhysical.jsx` — added channel reload in `handleProductSaved`, added error logging on initial channel load
  - `src/components/products/ProductModal.jsx` — added error logging on channel read and insert
- **Verification**: Build succeeds. All 3 bug fixes address the reported symptoms.

#### Task: P1-8b — BUG 3 continued: auto-created products insert silently failing
- **What was done**: Investigated why auto-created products from ManualPurchaseModal still don't appear after the `product_type → type` fix. Queried the database directly — the products DON'T EXIST (empty result). The insert was silently failing due to two schema violations:
  1. **Missing `slug`**: The `products.slug` column is `VARCHAR NOT NULL` — ManualPurchaseModal did not provide a slug, causing a NOT NULL constraint violation.
  2. **Invalid column `created_by`**: ManualPurchaseModal inserted `created_by: userId` but the products table has no `created_by` column — Postgres rejects the unknown column.
  Both errors were caught by `prodErr` and logged to console, but the purchase creation continued without a linked product.
- **Root cause**: The original `product_type → type` fix was necessary but insufficient. The insert had two additional problems that were always present but never visible (console.error only, no toast).
- **Fix applied**:
  - Added `slug` generation: `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + ean` (same pattern as ProductModal's auto-slug)
  - Removed `created_by: userId` (column doesn't exist)
  - Added explicit `status: "draft"` (matches the column default, but explicit is clearer)
  - Extracted `productName` variable for reuse
- **DB schema confirmed**: `products` table has columns: id, company_id, slug (NOT NULL), type (NOT NULL), status (default 'draft'), name (NOT NULL), ean, price, etc. No `created_by` or `product_type` columns.
- **Files changed**: `src/components/purchases/ManualPurchaseModal.jsx`
- **Verification**: Build succeeds. ProductsPhysical's status filter defaults to 'all', so draft products will appear.


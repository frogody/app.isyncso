# BLUEPRINT CLIENT BUILD PLAN

> **Project**: app.isyncso - Blueprint Client Onboarding
> **Created**: 2026-02-10
> **Status**: Planning Complete - Ready to Build
> **Priority**: High - Full build with highest precision

---

## TABLE OF CONTENTS

1. [Client Situation Summary](#1-client-situation-summary)
2. [Current app.isyncso Capabilities](#2-current-appisyncso-capabilities)
3. [Gap Analysis by Workflow](#3-gap-analysis-by-workflow)
4. [Build Plan - All Phases](#4-build-plan---all-phases)
5. [EMAIL POOL AUTO-SYNC SYSTEM](#5-email-pool-auto-sync-system)
6. [SHOPIFY ADMIN API INTEGRATION](#6-shopify-admin-api-integration)
7. [Database Schema Changes](#7-database-schema-changes)
8. [File Map - Existing Files to Modify](#8-file-map---existing-files-to-modify)
9. [New Files to Create](#9-new-files-to-create)
10. [Build Progress Tracker](#10-build-progress-tracker)

---

## 1. CLIENT SITUATION SUMMARY

### Who They Are

An e-commerce reselling operation that purchases products from multiple suppliers and consumer platforms, then resells via B2B (direct to buyers) and B2C (via bol.com LVB fulfillment). The entire operation runs on **Excel files**, **WhatsApp**, and the **Barcodia** scanning app. One person (Diederik) is the bottleneck for verification and data management.

### Their 5 Core Workflows

#### 1.1 INKOOP (Purchasing)

- Products purchased via **fixed suppliers** (e.g., Mink) and **consumer platforms** (Amazon, bol.com, Coolblue, Joybuy, Delonghi)
- No purchasing system - everything in a single Excel file called "Inkoop"
- Per purchase line they record:
  - Product name and/or EAN
  - Quantity ordered
  - Link/URL to the order
  - Country of purchase
  - Purchase price excluding BTW (VAT)
  - Remarks (date, reference, notes)
- Orders are grouped by purchase moment/date (e.g., "INFO / 5-1")
- Status tracked by Excel cell color: **green** = fully received, **orange** + adjusted quantities = partial delivery
- No separate columns for partial deliveries - tracked via color + manual notes

#### 1.2 ONTVANGST (Receiving)

- Goods arrive as **pallets** or **loose packages/vans**
- No fixed receiving process, no receiving system
- Multiple people unpack, no single responsible person
- Products taken from boxes and placed against the wall
- Scanned with **Barcodia** app: EAN → total quantity received at that moment
- Scan file exported and sent to **Diederik via WhatsApp**
- Diederik manually updates the Inkoop Excel:
  - Adjusts quantities (e.g., "5 (3)" meaning 5 ordered, 3 received)
  - Adds remarks like "BINNEN" + date
  - Changes cell color (green = complete, orange = partial)
- **No separate registration per receiving moment** - no timestamp per partial delivery, no record of who received what when

#### 1.3 B2B / B2C CHANNEL DECISION

- Decision made by **Mink** at or before purchase time
- Based on: deal type with supplier + suitability for B2C (bol.com)
- **Not recorded anywhere** - not in Excel, not in any document
- Information shared informally via email, WhatsApp, group chat
- No process for changing the decision - happens implicitly
- Critical business decision with zero traceability

#### 1.4 INPAKKEN / VERZENDING (Packing & Pallet Shipping)

- Products only packed onto pallets when there is a reason to ship:
  - **B2B**: Only when product is sold
  - **B2C**: When a bol.com LVB shipment is created
- No pallet system - tracked in a **separate Excel per shipment** ("LVB ZENDING FORMAT")
- Excel structure:
  - Rows = products (by EAN)
  - Columns = pallets (Pallet 1, Pallet 2, etc.)
  - Cells = quantity of that EAN on that pallet
  - Total column = sum per EAN across all pallets
- Each pallet gets a unique code matching the bol.com shipment
- During packing: quantities counted manually, products NOT re-scanned, visual/experience-based checking
- **Diederik's first verification**: Compare pallet Excel against inkoop quantities + received quantities from warehouse
- **B2C second verification**: Compare internal LVB format against bol.com backoffice received quantities
- **B2B verification**: Not possible - discrepancies only surface through customer complaints
- **No automatic link between**: Purchase → Receiving → Pallets → Stock

#### 1.5 RETOUREN (Returns)

- Only relevant for B2C (bol.com)
- Not relevant for B2B
- No further details provided - minimal current process

---

## 2. CURRENT APP.ISYNCSO CAPABILITIES

### 2.1 Relevant Existing Features

#### StockPurchases (`src/pages/StockPurchases.jsx` - 1358 lines)

- **AI invoice upload**: PDF/image upload → Groq LLM extraction → structured data
- Extracts: supplier, invoice number, date, line items (description, qty, unit_price, EAN, SKU), totals
- AI confidence scoring (>= 0.95 auto-approve, < 0.95 requires review)
- Dual approval path: "inventory only" or "send to finance"
- Creates `expected_deliveries` on approval
- **NO manual quick-entry form** - only invoice upload flow
- Database: `stock_purchases`, `stock_purchase_line_items`, `expected_deliveries`, `expenses`

#### InventoryReceiving (`src/pages/InventoryReceiving.jsx` - 945 lines)

- **Barcode scanner**: Camera mode (Html5Qrcode, 14+ formats) + manual input mode
- Scans EAN → looks up product → finds matching expected delivery → shows current stock
- Data captured: quantity received, condition (good/damaged/defective), warehouse location, damage notes
- Auto-links to expected_delivery_id, updates delivery status (pending/partial/complete)
- Updates `inventory` table (quantity_on_hand, last_received_at, average_cost)
- Stats: pending deliveries, items received today, partial deliveries
- Database: `products`, `expected_deliveries`, `receiving_log`, `inventory`

#### InventoryShipping (`src/pages/InventoryShipping.jsx` - 599 lines)

- Shipping task management with mandatory track & trace
- Status flow: pending → ready_to_ship → shipped → delivered
- Carriers: PostNL, DHL, DPD, UPS, FedEx, GLS (with auto-detection)
- Stats: pending, in transit, delivered, overdue counts
- **NO pallet management** - operates at shipping task / sales order level
- Database: `sales_orders`, `shipping_tasks`, `tracking_jobs`, `tracking_history`

#### Products (`src/pages/ProductsPhysical.jsx`)

- Full product catalog: SKU, EAN, name, category, status
- Physical product details: weight, dimensions, supplier, cost/retail/wholesale price
- Inventory tracking: qty on hand, reserved, available, incoming
- Stock status: in_stock / low_stock / out_of_stock (based on threshold)
- Reorder points and quantities
- **NO B2B/B2C channel designation**

#### Finance Module (15+ pages)

- Double-entry accounting, chart of accounts, journal entries
- AR (invoices), AP (bills/expenses), P&L, Balance Sheet
- Vendor management, payment tracking
- Relevant for connecting purchase costs to financial reporting

### 2.2 Existing Database Tables (Inventory-Related)

```sql
-- Products
products (id, company_id, name, sku, ean, slug, type, status, featured_image, tagline, category_id, ...)
physical_products (id, product_id, weight, dimensions, unit_of_measurement, reorder_point, reorder_quantity, low_stock_threshold, supplier_id, cost_price, retail_price, wholesale_price)
product_suppliers (id, product_id, supplier_id, is_primary, lead_time_days, minimum_order_qty, supplier_sku, cost_price)

-- Inventory
inventory (id, company_id, product_id, warehouse_location, quantity_on_hand, quantity_reserved, quantity_available [generated], quantity_incoming, reorder_point, reorder_quantity, max_stock, average_cost, last_purchase_cost, last_received_at, last_shipped_at)

-- Purchasing
stock_purchases (id, company_id, supplier_id, expense_number, external_reference, subtotal, tax_percent, tax_amount, total, currency, payment_status, invoice_date, ai_extracted_data, ai_confidence, needs_review, review_status, status)
stock_purchase_line_items (id, stock_purchase_id, product_id, description, sku, ean, quantity, unit, unit_price, discount_percent, tax_percent, line_total, is_physical_product, expected_delivery_id)

-- Expected Deliveries
expected_deliveries (id, company_id, product_id, supplier_id, quantity_expected, quantity_received, quantity_remaining [generated], expected_date, carrier, tracking_number, status: 'pending'|'partial'|'complete'|'cancelled')

-- Receiving
receiving_log (id, product_id, expected_delivery_id, quantity_received, ean_scanned, warehouse_location, bin_location, condition, damage_notes, receipt_type: 'purchase'|'return'|'transfer'|'adjustment', received_by, received_at)

-- Sales & Shipping
sales_orders (id, company_id, customer_id, order_number, status, shipping/billing address, subtotal, discount, tax, shipping_cost, total, payment_status, payment_due_date, shipped_at, delivered_at)
sales_order_items (id, sales_order_id, product_id, quantity, unit_price, ...)
shipping_tasks (id, sales_order_id, status, priority, carrier, service_type, track_trace_code, tracking_url, package_count, total_weight, ship_by_date, shipped_at, shipped_by, estimated_delivery, delivered_at, delivery_signature)
tracking_jobs (id, shipping_task_id, sales_order_id, customer_id, carrier, track_trace_code, status, current_tracking_status, last_checked_at, delivered_at, is_overdue)

-- Finance
expenses (id, company_id, supplier_id, expense_number, external_reference, subtotal, tax_percent, tax_amount, total, currency, payment_status, invoice_date, ai_extracted_data, ai_confidence, needs_review, status)
expense_line_items (id, expense_id, product_id, description, sku, ean, quantity, unit, unit_price, discount_percent, tax_percent, line_total, is_physical_product, expected_delivery_id)
```

### 2.3 Existing Integrations

- **Composio** (30+ apps): HubSpot, Salesforce, Slack, Gmail, Shopify, etc.
- **No bol.com Retailer API** integration
- **No Amazon Seller API** integration
- **No consumer marketplace** integrations
- Architecture supports adding OAuth2 marketplace integrations

### 2.4 Existing Permissions (RBAC)

- `inventory.manage` - Required for InventoryReceiving
- `shipping.manage` - Required for InventoryShipping
- `finance.view` - Required for StockPurchases

---

## 3. GAP ANALYSIS BY WORKFLOW

### 3.1 INKOOP (Purchasing) Gaps

| # | Gap | Severity | Description |
|---|-----|----------|-------------|
| G-INK-1 | No manual purchase entry form | **CRITICAL** | Only invoice upload exists. Need quick-add form for manual purchase recording without a PDF |
| G-INK-2 | No order URL/link field | **HIGH** | They store links to Amazon/bol.com orders - no field for this |
| G-INK-3 | No country of purchase field | **MEDIUM** | They track which country products are bought from |
| G-INK-4 | No purchase grouping | **HIGH** | They group multiple purchases under one order moment/date block |
| G-INK-5 | No marketplace auto-import | **LOW** | Future: auto-import orders from Amazon, bol.com, etc. |
| G-INK-6 | No B2B/B2C designation at purchase time | **CRITICAL** | See section 3.3 |

### 3.2 ONTVANGST (Receiving) Gaps

| # | Gap | Severity | Description |
|---|-----|----------|-------------|
| G-ONT-1 | No receiving session concept | **HIGH** | Can't group multiple scans into one receiving moment (e.g., "pallet arrival 10 Feb") |
| G-ONT-2 | No notification on receipt | **HIGH** | Diederik needs to be notified when goods arrive (replaces WhatsApp) |
| G-ONT-3 | No receiving report export | **MEDIUM** | They currently export Barcodia scans - need exportable receiving summaries |
| G-ONT-4 | No receiving dashboard for management | **MEDIUM** | Overview of all receiving activity, who received what when |

### 3.3 B2B / B2C Channel Gaps

| # | Gap | Severity | Description |
|---|-----|----------|-------------|
| G-CH-1 | No sales channel tracking on products | **CRITICAL** | Products need sales channel designations (B2B, B2C, or both simultaneously) — requires a junction table since one product can be on multiple channels at once |
| G-CH-2 | No sales channel on purchases | **CRITICAL** | At purchase time, channel intent must be recordable |
| G-CH-3 | No channel change tracking | **HIGH** | Audit trail when a product's channel changes (B2B→B2C or vice versa) |
| G-CH-4 | No channel-based stock splitting | **HIGH** | View stock allocated to B2B vs B2C separately |
| G-CH-5 | No deal notes / communication thread | **MEDIUM** | Replace WhatsApp deal discussions with in-app notes |

### 3.4 INPAKKEN / VERZENDING (Packing & Pallets) Gaps

| # | Gap | Severity | Description |
|---|-----|----------|-------------|
| G-PAL-1 | No pallet entity/management | **CRITICAL** | Entire pallet concept is missing - need pallets with EANs + quantities |
| G-PAL-2 | No shipment grouping of pallets | **CRITICAL** | Multiple pallets per shipment (zending) |
| G-PAL-3 | No pallet builder UI | **CRITICAL** | Interface for building pallets: scan/add EANs, set quantities per pallet |
| G-PAL-4 | No verification tool | **CRITICAL** | Compare packed qty vs purchased qty vs received qty per EAN |
| G-PAL-5 | No bol.com LVB integration | **HIGH** | Generate LVB shipment format, push to bol.com, pull back received quantities |
| G-PAL-6 | No cross-reference audit trail | **HIGH** | Full lifecycle: purchased → received → packed → shipped → delivered per EAN |
| G-PAL-7 | No pallet labels/codes | **MEDIUM** | Generate unique pallet codes, print labels |
| G-PAL-8 | No scan-to-verify during packing | **MEDIUM** | Currently they count manually - could scan to verify |

### 3.5 RETOUREN (Returns) Gaps

| # | Gap | Severity | Description |
|---|-----|----------|-------------|
| G-RET-1 | No return processing UI | **MEDIUM** | `receiving_log.receipt_type='return'` exists in schema but no workflow |
| G-RET-2 | No return reason tracking | **MEDIUM** | Why was it returned? |
| G-RET-3 | No restock/dispose decision | **MEDIUM** | What to do with returned item |
| G-RET-4 | No bol.com return sync | **LOW** | Auto-import returns from bol.com |

---

## 4. BUILD PLAN - ALL PHASES

### PHASE 0: DATABASE FOUNDATION (Prerequisites for all phases)

> **TENANT SCOPING CONVENTION**: ALL new tables in this blueprint use `company_id` scoped via `get_user_company_id()` for RLS. This is the **inventory/logistics domain pattern**. Do NOT use `organization_id` / `get_user_organization_id()` — that is the talent domain pattern. This must be consistent across all 11+ new tables. Note: the existing `products` table uses `auth_uid()` wrapper while `inventory` uses `get_user_company_id()` — new tables should follow the `get_user_company_id()` pattern consistently.

**Migration: `20260211_blueprint_foundation.sql`**

All schema changes needed across all phases, deployed upfront for clean dependency management.

See [Section 7](#7-database-schema-changes) for complete SQL.

**Tasks:**
- [x] P0-1: Create migration file with all new tables and column additions
- [x] P0-2: Add RLS policies for all new tables (using `get_user_company_id()` pattern — see convention above)
- [x] P0-3: Add database triggers for inventory updates
- [x] P0-4: Add composite indexes for all new tables (see Section 7 for definitions)
- [x] P0-5: Enable `pg_cron` extension via Supabase Management API (required by Phase 4, Email Pool, and Shopify backup polling)
- [x] P0-6: Audit and fix missing RLS on existing inventory-domain tables — specifically add RLS policy to `sales_order_items` (currently has NONE)
- [x] P0-7: Verify migration runs cleanly on existing data

#### P0-5 Detail: pg_cron Enablement

**Why**: Phases 4 (bol.com token refresh + ProcessStatus polling), 5 (Email Pool monitoring), and 6 (Shopify backup polling) all require server-side scheduled jobs. Supabase supports `pg_cron` but it must be explicitly enabled.

**Enable via Supabase Dashboard**: Database → Extensions → search "pg_cron" → Enable

**Or via SQL** (after enabling the extension):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verify it works
SELECT cron.schedule('test-cron', '* * * * *', $$SELECT 1$$);
SELECT cron.unschedule('test-cron');
```

**Scheduled jobs to be created by later phases:**
| Phase | Job | Schedule | Purpose |
|-------|-----|----------|---------|
| P4 | `bolcom-token-refresh` | `*/4 * * * *` (every 4 min) | Pre-refresh bol.com JWT before 5-min expiry |
| P4 | `bolcom-process-status-poll` | `*/1 * * * *` (every 1 min) | Poll pending ProcessStatus URLs |
| P4 | `bolcom-return-sync` | `*/5 * * * *` (every 5 min) | Pull unhandled FBB returns |
| EP | `email-pool-health-check` | `*/10 * * * *` (every 10 min) | Check pool account connection health |
| SH | `shopify-order-backup-poll` | `*/15 * * * *` (every 15 min) | Backup poll for missed order webhooks |
| SH | `shopify-inventory-sync` | `*/15 * * * *` (every 15 min) | Periodic inventory comparison |

#### P0-6 Detail: RLS Audit

**`sales_order_items`** currently has NO RLS policies. Add:
```sql
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_order_items_company_access" ON sales_order_items
    FOR ALL TO authenticated
    USING (
        sales_order_id IN (
            SELECT id FROM sales_orders WHERE company_id = get_user_company_id()
        )
    );
```

---

### PHASE 1: PURCHASING OVERHAUL (Gaps: G-INK-1 through G-INK-4, G-CH-1, G-CH-2)

> **Goal**: Replace the "Inkoop" Excel with a proper purchasing flow that supports both invoice upload AND manual entry, with B2B/B2C channel designation.

#### 1A: Manual Purchase Entry Form

**File**: `src/pages/StockPurchases.jsx` (modify existing)

**Changes:**
- Add "Manual Purchase" button next to existing "Upload Invoice" button
- New modal `ManualPurchaseModal` with fields:
  - **Supplier** (dropdown from suppliers table, or free-text for new)
  - **Purchase group name** (optional, e.g., "Amazon deal 10 feb")
  - **Date** (defaults to today)
  - **Sales channel** (radio: B2B / B2C / Undecided)
  - **Line items** (repeatable):
    - Product (search by name/EAN, or create new)
    - EAN (auto-filled from product, or manual)
    - Quantity ordered
    - Unit price (ex BTW)
    - Order URL/link
    - Country of purchase (dropdown: NL, DE, BE, UK, US, CN, Other)
    - Remarks
  - **Total** (auto-calculated)
- On submit:
  - Creates `stock_purchases` record with `entry_method='manual'`
  - Creates `stock_purchase_line_items` for each line
  - Creates `expected_deliveries` for each physical product line
  - If product doesn't exist by EAN → auto-create in `products` table

**Acceptance criteria:**
- [ ] User can add a purchase with 1-20 line items without uploading a PDF
- [ ] Each line item supports EAN, qty, price, URL, country, remarks
- [ ] Purchases can be grouped under a name/reference
- [ ] B2B/B2C channel can be set per purchase
- [ ] Expected deliveries are auto-created
- [ ] New EANs auto-create product records

#### 1A-fix: Fix Orphaned `create_expected_deliveries_on_insert()` Trigger

**Problem**: The function `create_expected_deliveries_on_insert()` exists in the database (from migration `20260112100000`) but has **no trigger attached to it**. The INSERT path for auto-approved invoices does NOT fire any trigger — only the UPDATE trigger (`create_expected_deliveries_on_approval`) works. This means if a stock purchase is created directly with `status='approved'` (e.g., from the Email Pool auto-approve flow), no expected deliveries are created.

**Fix**: Either wire up the INSERT trigger or consolidate the logic:

**Option A (recommended)**: Wire up the missing trigger:
```sql
CREATE TRIGGER trigger_create_expected_deliveries_on_insert
    AFTER INSERT ON stock_purchases
    FOR EACH ROW
    WHEN (NEW.status = 'approved')
    EXECUTE FUNCTION create_expected_deliveries_on_insert();
```

**Option B**: Consolidate into a single trigger function that handles both INSERT and UPDATE, using `TG_OP` to detect the operation type.

**Acceptance criteria:**
- [ ] Expected deliveries are created whether a stock purchase is INSERTED with `status='approved'` or UPDATED to `status='approved'`
- [ ] The Email Pool auto-approve path (which inserts with `status='approved'`) correctly generates expected_deliveries

#### 1B: Purchase Group Management

**File**: `src/pages/StockPurchases.jsx` (modify existing)

**Changes:**
- Add `purchase_groups` concept via new table
- Group header shows: group name, date, supplier, total items, total value, status
- Expand/collapse to show individual line items
- Filter by group, date range, supplier, channel

**Acceptance criteria:**
- [ ] Purchases grouped visually by purchase moment
- [ ] Group-level summary (total items, total value, overall status)
- [ ] Filter and search across groups

#### 1C: B2B/B2C Channel on Products

**File**: `src/pages/ProductsPhysical.jsx` (modify existing)

> **Note**: Sales channels use a junction table (`product_sales_channels`) rather than a single column, because one product can be listed on multiple channels simultaneously (e.g., both B2B and bol.com B2C).

**Changes:**
- Add channel badge(s) on product cards (B2B = blue, B2C = green, Both = purple) — derived from `product_sales_channels` rows
- Add channel filter to product list (filter by JOIN on junction table)
- Add channel multi-select to product edit form (checkboxes, not dropdown)
- Channel change creates audit log entry in `channel_audit_log`

**Acceptance criteria:**
- [ ] Every product shows its active sales channel(s)
- [ ] Products can be filtered by channel
- [ ] A product can have multiple channels simultaneously
- [ ] Channel changes are logged with timestamp and user

---

### PHASE 2: RECEIVING ENHANCEMENTS (Gaps: G-ONT-1 through G-ONT-4)

> **Goal**: Add receiving sessions, notifications, and export to replace WhatsApp workflow.

#### 2A: Receiving Sessions

**File**: `src/pages/InventoryReceiving.jsx` (modify existing)

**Changes:**
- "Start Receiving Session" button at top of page
- Session captures: session name (e.g., "Pallet delivery DHL"), started_by, started_at
- All scans within a session are linked via `receiving_session_id`
- Session summary: total EANs scanned, total items, linked expected deliveries
- "Close Session" button with session summary report
- Session history view with ability to re-open past sessions

**Acceptance criteria:**
- [ ] User starts a session before scanning
- [ ] All scans in a session are grouped together
- [ ] Session summary shows totals and matched deliveries
- [ ] Session can be closed with a final summary
- [ ] Past sessions are viewable in history

#### 2B: Receiving Notifications

**File**: New edge function + modify `src/pages/InventoryReceiving.jsx`

**Changes:**
- On session close → create notification for designated users (e.g., Diederik role)
- Notification includes: session name, who received, total items, which expected deliveries were (partially) fulfilled
- Uses existing `notifications` / `user_notifications` tables
- Optional: email notification via existing email infrastructure

**Acceptance criteria:**
- [ ] Designated users receive in-app notification when a receiving session is closed
- [ ] Notification contains session summary details
- [ ] Clickable notification links to session detail

#### 2C: Receiving Report Export

**File**: `src/pages/InventoryReceiving.jsx` (modify existing)

**Changes:**
- "Export" button on session detail and receiving history
- Export formats: CSV and PDF
- CSV contains: EAN, product name, qty received, condition, location, received_by, timestamp
- PDF is a formatted receiving report

**Acceptance criteria:**
- [ ] Export button available on session detail
- [ ] CSV export with all relevant fields
- [ ] PDF export with formatted layout

---

### PHASE 3: PALLET MANAGEMENT MODULE (Gaps: G-PAL-1 through G-PAL-8)

> **Goal**: Build the complete pallet builder, shipment management, and verification workflow. This is the largest and most critical phase.
>
> **EXISTING SCHEMA NOTE**: The `shipping_tasks` table already has `total_weight` (numeric) and `dimensions` (JSONB: `{length, width, height, unit}`) columns in the database — they are just not exposed in the `InventoryShipping.jsx` UI. Phase 3 should **surface these existing columns** in the UI and connect them to the pallet system rather than creating new weight/dimension columns.
>
> **RECOMMENDED SUB-PHASING**: Due to scope (8 gaps, new page, new verification workflow, label generation), this phase should be split during execution to prevent it from blocking Phase 4:
> - **Phase 3a**: Core pallet CRUD — create shipments, add pallets, add items to pallets, close pallets
> - **Phase 3b**: Shipment linking + verification workflow — ShipmentVerification page, discrepancy detection, sign-off
> - **Phase 3c**: Weight/dimension UI optimization + bol.com LVB pallet requirements integration (depends on Phase 4A)

#### 3A: Pallet Builder Page

**File**: New page `src/pages/PalletBuilder.jsx`

**Route**: `/PalletBuilder`

**UI Design:**
- **Left panel**: Shipment overview
  - Shipment type: B2B or B2C (LVB)
  - Destination / customer (B2B) or "bol.com LVB" (B2C)
  - List of pallets in this shipment with expand/collapse
  - "New Pallet" button
  - Shipment totals per EAN across all pallets
- **Right panel**: Active pallet detail
  - Pallet code (auto-generated or manual)
  - Barcode scanner (reuse existing scanner component from InventoryReceiving)
  - Product list on this pallet: EAN, product name, quantity
  - Add product: scan EAN or search
  - Adjust quantity per product
  - Remove product from pallet
  - Pallet totals

**Workflow:**
1. Create new shipment (B2B or B2C)
2. Add pallets to shipment
3. Per pallet: scan or add products with quantities
4. System shows running totals per EAN across all pallets
5. System shows available stock per EAN (from inventory)
6. System flags if packed qty > received qty or > purchased qty
7. "Finalize" button locks the shipment

**Acceptance criteria:**
- [ ] Create shipments with type (B2B/B2C)
- [ ] Add multiple pallets per shipment
- [ ] Scan or manually add products per pallet
- [ ] Running totals per EAN across all pallets
- [ ] Stock availability check per EAN
- [ ] Discrepancy warnings (packed > received or > purchased)
- [ ] Finalize shipment with locked state

#### 3B: Verification Dashboard

**File**: New page `src/pages/ShipmentVerification.jsx`

**Route**: `/ShipmentVerification`

**UI Design:**
- Select a shipment to verify
- Table showing per EAN:
  - Quantity purchased (from stock_purchases)
  - Quantity received (from receiving_log)
  - Quantity packed (from pallet_items)
  - Quantity shipped (from shipping_tasks)
  - Discrepancy flag (red highlight if numbers don't match)
- For B2C: additional column for "bol.com ontvangen" (from bol.com API, Phase 4)
- Verification status: Pending → Verified → Discrepancy Found
- Notes field per EAN for explaining discrepancies

**Acceptance criteria:**
- [ ] Side-by-side comparison: purchased vs received vs packed per EAN
- [ ] Automatic discrepancy detection with visual highlighting
- [ ] Verification sign-off by authorized user
- [ ] Notes/explanation for each discrepancy

#### 3C: Pallet Labels

**File**: Within `src/pages/PalletBuilder.jsx`

**Changes:**
- Generate unique pallet code (format: `PLT-{YYYYMMDD}-{sequence}`)
- "Print Label" button per pallet
- Label contains: pallet code as barcode (Code 128), shipment reference, date, pallet number in sequence
- "Print All Labels" for entire shipment

**Acceptance criteria:**
- [ ] Unique pallet codes generated automatically
- [ ] Printable labels with barcode
- [ ] Batch print for all pallets in a shipment

#### 3D: Scan-to-Verify During Packing

**File**: Within `src/pages/PalletBuilder.jsx`

**Changes:**
- Optional "Verification Mode" toggle
- When enabled: scan each product going onto the pallet
- System counts scans and compares to entered quantities
- Alerts if scan count differs from expected quantity
- Green checkmark per EAN when verified

**Acceptance criteria:**
- [ ] Toggle between manual count and scan-verify modes
- [ ] Real-time scan counting per EAN
- [ ] Visual confirmation when scanned qty matches expected
- [ ] Alert on mismatch

---

### PHASE 4: BOL.COM RETAILER API INTEGRATION (Gaps: G-PAL-5, G-RET-4)

> **Goal**: Connect to bol.com Retailer API v10 for FBB replenishments (LVB inbound shipments), stock sync, order monitoring, and return handling.
>
> **CRITICAL CONTEXT**: bol.com uses **Client Credentials** OAuth (machine-to-machine), NOT user OAuth. The retailer generates a `client_id` + `client_secret` on `partnerplatform.bol.com`. Tokens expire every **5 minutes** — aggressive caching is required. All mutating API calls are **asynchronous** and return a `ProcessStatus` object that must be polled for the actual result.

#### 4A: bol.com API Client & Authentication

**File**: New edge function `supabase/functions/bolcom-api/index.ts`

This is a **unified edge function** that handles all bol.com API operations (like `composio-connect` handles all Composio operations). All bol.com calls go through this single function.

**Authentication flow:**
```
1. Company stores client_id + client_secret (encrypted) in bolcom_credentials table
2. On API call: check if cached token exists and is not expired
3. If expired or missing:
   POST https://login.bol.com/token?grant_type=client_credentials
   Headers:
     Authorization: Basic {base64(client_id + ":" + client_secret)}
     Content-Type: application/x-www-form-urlencoded
     Accept: application/json
   Response: { access_token: "<JWT>", token_type: "Bearer", expires_in: 299 }
4. Cache token with expiry (refresh at 240 seconds, before the 299s TTL)
5. Use token for all subsequent calls:
   Authorization: Bearer {access_token}
   Accept: application/vnd.retailer.v10+json
   Content-Type: application/vnd.retailer.v10+json
```

**Token caching strategy:**
- Store `access_token` and `token_expires_at` in `bolcom_credentials` table
- On each API call: if `NOW() > token_expires_at - 60 seconds` → refresh token
- NEVER request a new token per API call (bol.com rate-limits the token endpoint and can IP-ban)
- **Cold start handling**: Every Supabase Edge Function cold start loses in-memory state. The token MUST be persisted in the database, not in a local variable. The flow is: read `bolcom_credentials` → check `token_expires_at` → use cached token OR refresh → update row.
- **pg_cron pre-refresh** (enabled in Phase 0): A `bolcom-token-refresh` cron job runs every 4 minutes. It calls the `bolcom-api` edge function with `action='refresh_token'` for all active `bolcom_credentials` rows where `token_expires_at < NOW() + interval '90 seconds'`. This ensures a warm token is always available, even if no user-initiated API call has happened recently.

**ProcessStatus async polling architecture:**
- Mutating bol.com API calls (POST/PUT/DELETE) return a `processStatusId` immediately
- The result must be polled via `GET /shared/process-status/{id}`
- **For user-initiated operations** (e.g., create replenishment from PalletBuilder): the `waitForProcessStatus()` helper polls inline within the edge function (max 30 seconds, 3-second intervals)
- **For background operations** (e.g., webhook subscription creation, offer bulk updates): store the `processStatusId` in a `bolcom_pending_process_statuses` table and let the `bolcom-process-status-poll` pg_cron job (every 1 minute) poll all pending statuses and update the corresponding records on completion

> **CRITICAL: bol.com is offer-centric, not product-centric.** You do NOT "create products" on bol.com — products already exist in bol.com's catalog by EAN. You create **offers** against existing catalog EANs. An offer specifies your price, stock level, condition, and fulfillment method for that EAN. This means we need a `bolcom_offer_mappings` table (similar to `shopify_product_mappings`) that maps our internal product IDs to bol.com offer IDs.

**API wrapper structure:**
```typescript
// Single entry point, routed by 'action' parameter
interface BolcomApiRequest {
    action: string;           // 'create_replenishment', 'get_inventory', etc.
    company_id: string;       // To look up credentials
    data?: Record<string, unknown>;
}

// All responses include ProcessStatus handling
interface BolcomApiResponse {
    success: boolean;
    data?: unknown;
    processStatusId?: string; // For async operations
    error?: string;
}
```

**Supported actions:**

| Action | bol.com Endpoint | Method | Description |
|--------|-----------------|--------|-------------|
| `get_inventory` | `GET /retailer/inventory` | Sync | FBB warehouse stock levels |
| `get_product_destinations` | `POST /retailer/replenishments/product-destinations` | Async | Which warehouse for which EANs |
| `get_pickup_timeslots` | `POST /retailer/replenishments/pickup-time-slots` | Sync | Available pickup windows |
| `get_delivery_dates` | `GET /retailer/replenishments/delivery-dates` | Sync | Available self-delivery dates |
| `create_replenishment` | `POST /retailer/replenishments` | Async | Create inbound shipment (LVB) |
| `update_replenishment` | `PUT /retailer/replenishments/{id}` | Async | Update/cancel replenishment |
| `get_replenishment` | `GET /retailer/replenishments/{id}` | Sync | Get replenishment status + received quantities |
| `list_replenishments` | `GET /retailer/replenishments?state=X` | Sync | List replenishments by state |
| `get_load_carrier_labels` | `GET /retailer/replenishments/{id}/load-carrier-labels` | Sync | PDF pallet/transport labels |
| `get_product_labels` | `POST /retailer/replenishments/product-labels` | Sync | PDF product labels |
| `get_pick_list` | `GET /retailer/replenishments/{id}/pick-list` | Sync | PDF packing verification list |
| `create_offer` | `POST /retailer/offers` | Async | Create product listing |
| `update_offer_stock` | `PUT /retailer/offers/{id}/stock` | Async | Update stock level |
| `update_offer_price` | `PUT /retailer/offers/{id}/price` | Async | Update price |
| `get_offer` | `GET /retailer/offers/{id}` | Sync | Get offer details |
| `export_offers` | `POST /retailer/offers/export` | Async | Bulk CSV export |
| `list_orders` | `GET /retailer/orders?fulfilment-method=FBB` | Sync | List FBB orders |
| `get_order` | `GET /retailer/orders/{id}` | Sync | Get order detail |
| `list_returns` | `GET /retailer/returns?handled=false` | Sync | Unhandled returns |
| `get_return` | `GET /retailer/returns/{id}` | Sync | Return detail |
| `handle_return` | `PUT /retailer/returns/{rmaId}` | Async | Handle return item |
| `get_process_status` | `GET /shared/process-status/{id}` | Sync | Check async operation status |
| `create_subscription` | `POST /retailer/subscriptions` | Async | Create webhook subscription |
| `test_connection` | `GET /retailer/inventory` | Sync | Health check (uses inventory as test) |

**ProcessStatus polling helper:**
```typescript
async function waitForProcessStatus(
    processStatusId: string,
    token: string,
    maxAttempts = 10,
    intervalMs = 3000
): Promise<ProcessStatus> {
    for (let i = 0; i < maxAttempts; i++) {
        const status = await fetch(
            `https://api.bol.com/shared/process-status/${processStatusId}`,
            { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.retailer.v10+json' } }
        );
        const result = await status.json();
        if (result.status === 'SUCCESS' || result.status === 'FAILURE' || result.status === 'TIMEOUT') {
            return result;
        }
        await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error(`ProcessStatus ${processStatusId} did not complete within ${maxAttempts * intervalMs}ms`);
}
```

**Database: credentials storage**
```sql
CREATE TABLE bolcom_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,                      -- From bol.com partner platform
    client_secret TEXT NOT NULL,                  -- Encrypted at rest
    access_token TEXT,                            -- Cached JWT (5-min TTL)
    token_expires_at TIMESTAMPTZ,                 -- When to refresh
    retailer_id TEXT,                             -- bol.com retailer ID (from JWT claims)
    economic_operator_id TEXT,                    -- Required for offers since Feb 2025
    is_active BOOLEAN DEFAULT true,
    connection_status TEXT DEFAULT 'pending'
        CHECK (connection_status IN ('pending', 'connected', 'error', 'disabled')),
    last_error TEXT,
    last_api_call_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)                            -- One bol.com account per company
);

-- ============================================================
-- BOL.COM OFFER MAPPINGS: Link our products to bol.com offers
-- ============================================================
CREATE TABLE bolcom_offer_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Our side
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- bol.com side
    bol_offer_id TEXT NOT NULL,                   -- bol.com offer UUID
    bol_ean TEXT NOT NULL,                         -- EAN used on bol.com
    bol_reference TEXT,                            -- Our reference sent to bol.com

    -- Offer state cache
    bol_condition TEXT DEFAULT 'NEW',
    bol_fulfilment_method TEXT DEFAULT 'FBB',
    bol_price DECIMAL(10,2),
    bol_stock_amount INTEGER,
    bol_stock_managed_by_retailer BOOLEAN DEFAULT false,

    -- Sync state
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, bol_offer_id),
    UNIQUE(company_id, product_id)                -- One offer per product per company
);

-- ============================================================
-- BOL.COM PENDING PROCESS STATUSES: Track async operations
-- ============================================================
CREATE TABLE bolcom_pending_process_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    process_status_id TEXT NOT NULL,               -- bol.com processStatusId
    entity_type TEXT NOT NULL,                      -- 'replenishment', 'offer', 'subscription', etc.
    entity_id TEXT,                                 -- Our internal reference (shipment_id, offer_mapping_id, etc.)
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'success', 'failure', 'timeout')),
    result_data JSONB,                             -- Full response on completion
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_bolcom_pending_status ON bolcom_pending_process_statuses(status) WHERE status = 'pending';
CREATE INDEX idx_bolcom_offer_product ON bolcom_offer_mappings(product_id);
CREATE INDEX idx_bolcom_offer_ean ON bolcom_offer_mappings(bol_ean);
```

**Acceptance criteria:**
- [ ] Store encrypted client_id/client_secret
- [ ] Token auto-refresh with 60-second safety margin (+ pg_cron pre-refresh every 4 min)
- [ ] Cold start resilience: token always read from DB, never from in-memory cache
- [ ] All 22+ API actions routed correctly
- [ ] ProcessStatus inline polling for user-initiated operations
- [ ] ProcessStatus background polling via pg_cron for async operations
- [ ] `bolcom_offer_mappings` table links products to bol.com offers by EAN
- [ ] Rate limit awareness (respect `Retry-After` headers)
- [ ] Connection test via inventory endpoint

#### 4B: FBB Replenishment Flow (LVB Inbound Shipments)

This is the core bol.com integration — sending pallets of products TO bol.com's warehouse.

**How our Pallet Builder (Phase 3) maps to bol.com's Replenishment API:**

```
Our System                          bol.com API
───────────                         ───────────
shipment (type=b2c_lvb)      →     replenishment
  ├─ pallets (1..N)           →     numberOfLoadCarriers (count only)
  │   └─ pallet_items         →     (internal tracking only — bol doesn't track per-pallet EAN)
  └─ EAN totals across all    →     lines[{ean, quantity}] (total per EAN across ALL pallets)
       pallets
```

**CRITICAL INSIGHT**: bol.com's replenishment API works at the **shipment level** — it wants total quantity per EAN and a count of load carriers. It does NOT track which EAN is on which pallet. Our pallet-level tracking (Phase 3) is for our own internal verification; bol.com only sees the aggregate totals.

**Replenishment creation flow (triggered from PalletBuilder "Push to bol.com" button):**

```
Step 1: Request product destinations
   POST /retailer/replenishments/product-destinations
   Body: { eans: [{ean: "871..."}, {ean: "978..."}] }  (max 50 per request)
   → Poll ProcessStatus → returns warehouse addresses per EAN
   → Store destinations in shipment record

Step 2: Schedule delivery (user chooses in UI)
   Option A — bol pickup:
     POST /retailer/replenishments/pickup-time-slots
     Body: { address: { our warehouse address }, numberOfLoadCarriers: N }
     → Show available timeslots to user → user selects one

   Option B — Self-delivery:
     GET /retailer/replenishments/delivery-dates
     → Show available dates to user → user selects one

Step 3: Create replenishment
   POST /retailer/replenishments
   Body: {
     reference: shipment.shipment_code,      // Our internal reference
     pickupAppointment: { ... } OR deliveryInfo: { ... },
     labelingByBol: true/false,              // User choice
     numberOfLoadCarriers: shipment.total_pallets,
     lines: [                                // Aggregated from all pallet_items
       { ean: "871...", quantity: 50 },
       { ean: "978...", quantity: 100 }
     ]
   }
   → Poll ProcessStatus → on SUCCESS: store replenishmentId in shipment record

Step 4: Download labels (auto after creation)
   GET /retailer/replenishments/{id}/load-carrier-labels  → PDF (transport+warehouse labels)
   GET /retailer/replenishments/{id}/pick-list             → PDF (packing verification)
   If labelingByBol=false:
     POST /retailer/replenishments/product-labels           → PDF (product labels)
   → Store PDF URLs or serve to user for download/print

Step 5: Track receiving (periodic polling or manual check)
   GET /retailer/replenishments/{id}
   → For each line:
     quantityAnnounced vs quantityReceived
   → Update shipment verification dashboard
   → Flag discrepancies (announced ≠ received)
```

**Replenishment states:**
```
ANNOUNCED → (items in transit) → RECEIVED → (being processed) → COMPLETED
     ↓
  CANCELLED (only from ANNOUNCED state)
```

**Per-line fields from bol.com response:**
| Field | Description | Maps to |
|-------|-------------|---------|
| `quantityAnnounced` | What we said we'd send | Our `pallet_items` total per EAN |
| `quantityReceived` | What bol.com confirmed receiving | ShipmentVerification "bol.com ontvangen" column |
| `quantityInProgress` | Being processed at warehouse | Informational |
| `quantityWithGradedState` | Deemed unsellable by bol | Discrepancy flag (damaged in transit) |
| `quantityWithRegularState` | Accepted as sellable | Actual usable stock at bol.com |

**Database additions to `shipments` table:**
```sql
ALTER TABLE shipments ADD COLUMN bol_replenishment_id TEXT;          -- From ProcessStatus.entityId
ALTER TABLE shipments ADD COLUMN bol_reference TEXT;                 -- Our reference sent to bol
ALTER TABLE shipments ADD COLUMN bol_state TEXT;                     -- ANNOUNCED/RECEIVED/COMPLETED/CANCELLED
ALTER TABLE shipments ADD COLUMN bol_delivery_method TEXT             -- 'pickup' or 'self_delivery'
    CHECK (bol_delivery_method IN ('pickup', 'self_delivery'));
ALTER TABLE shipments ADD COLUMN bol_pickup_timeslot JSONB;          -- { fromDateTime, untilDateTime }
ALTER TABLE shipments ADD COLUMN bol_delivery_date DATE;             -- For self-delivery
ALTER TABLE shipments ADD COLUMN bol_labeling_by_bol BOOLEAN;
ALTER TABLE shipments ADD COLUMN bol_load_carrier_labels_url TEXT;   -- Stored PDF URL
ALTER TABLE shipments ADD COLUMN bol_pick_list_url TEXT;             -- Stored PDF URL
ALTER TABLE shipments ADD COLUMN bol_product_labels_url TEXT;        -- Stored PDF URL
ALTER TABLE shipments ADD COLUMN bol_destinations JSONB;             -- Warehouse addresses per EAN
ALTER TABLE shipments ADD COLUMN bol_received_quantities JSONB;      -- Latest received qty snapshot per EAN
ALTER TABLE shipments ADD COLUMN bol_last_polled_at TIMESTAMPTZ;
```

**Acceptance criteria:**
- [ ] Request product destinations (which warehouse) per EAN
- [ ] Show pickup timeslots or delivery dates to user
- [ ] Create replenishment from finalized shipment
- [ ] Store replenishmentId on shipment record
- [ ] Download and store/serve label PDFs
- [ ] Poll replenishment status and update received quantities
- [ ] Discrepancy detection: announced vs received per EAN
- [ ] Feed received quantities into ShipmentVerification dashboard

#### 4C: Stock Sync (Inventory at bol.com)

**Purpose**: Compare our internal inventory (for B2C products) with what bol.com reports in their FBB warehouse.

**Endpoint:**
```
GET /retailer/inventory
→ Returns: [{ ean, bsku, regularStock, gradedStock, title }]
```

**Sync flow:**
1. Fetch `GET /retailer/inventory` (rate limit: 20/min)
2. For each EAN in response:
   - Match to `products` table by EAN
   - Compare `regularStock` (bol.com) with `inventory.quantity_allocated_b2c` (ours)
   - Store latest bol.com stock in a `bol_stock_cache` JSONB on products or a separate table
3. Show comparison in UI: "Our stock" vs "bol.com stock" per product
4. Offer management:
   - Update offer stock: `PUT /retailer/offers/{offerId}/stock` with `{ amount: N, managedByRetailer: false }`
   - Update offer price: `PUT /retailer/offers/{offerId}/price`

**Stock update on offer (pushing our stock to bol.com):**
- When B2C inventory changes (new receiving, restock, etc.) → queue stock update
- Batch stock updates to respect rate limits (50/sec for offer stock updates)
- `managedByRetailer: false` = bol.com auto-adjusts for open orders (recommended)

**Offer creation for new products:**
```
POST /retailer/offers
{
    ean: product.ean,
    condition: { name: "NEW", category: "NEW" },
    reference: product.sku,
    pricing: { bundlePrices: [{ quantity: 1, unitPrice: product.retail_price }] },
    stock: { amount: inventory.quantity_allocated_b2c, managedByRetailer: false },
    fulfilment: { method: "FBB" },
    economicOperatorId: bolcom_credentials.economic_operator_id
}
```
**Note**: `economicOperatorId` is **mandatory since Feb 2025**. Offers without it are set offline by bol.com.

**Acceptance criteria:**
- [ ] Pull FBB inventory from bol.com
- [ ] Compare with our internal B2C stock per EAN
- [ ] Show discrepancies in UI
- [ ] Push stock updates to bol.com offers
- [ ] Create new offers for products not yet listed
- [ ] Economic operator ID management

#### 4D: bol.com Webhook Subscriptions

**Purpose**: Receive real-time notifications from bol.com instead of polling.

**bol.com's own subscription system** (NOT Composio — this is a separate webhook flow):

```
POST /retailer/subscriptions
{
    resources: ["PROCESS_STATUS", "SHIPMENT"],
    url: "https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/bolcom-webhooks",
    subscriptionType: "WEBHOOK"
}
```

**New edge function**: `supabase/functions/bolcom-webhooks/index.ts`

Receives bol.com webhook events:
```json
{
    "retailerId": "1234567",
    "timestamp": "2026-02-10T12:00:00+01:00",
    "event": {
        "resource": "PROCESS_STATUS",
        "type": "SUCCESS",
        "resourceId": "process-status-uuid"
    }
}
```

**Webhook security**: bol.com signs webhooks with RSA-SHA256. Verify with:
1. `GET /retailer/subscriptions/signature-keys` → get public keys
2. Parse `Signature` header: `keyId=0, algorithm="rsa-sha256", signature=<BASE64>`
3. Verify signature of request body against public key

**Supported events for webhook:**
- `PROCESS_STATUS` — Get notified when async operations complete (instead of polling)
- `SHIPMENT` — Get notified when FBB orders are shipped

**Constraints:**
- 5-second response timeout (must acknowledge fast)
- 10 retries with exponential backoff on failure
- Auto-disabled after 10 consecutive failures
- Whitelisted IPs: `35.204.245.136, 35.204.195.116, 35.204.156.102, 35.204.83.251, 35.204.231.62, 34.90.203.104, 34.90.109.47, 34.91.34.58, 34.91.134.228, 34.91.91.54`

**Acceptance criteria:**
- [ ] Create bol.com webhook subscription on integration setup
- [ ] Receive and verify webhook signatures
- [ ] Process PROCESS_STATUS events (replace polling)
- [ ] Process SHIPMENT events (FBB order shipped)
- [ ] Acknowledge within 5 seconds

#### 4E: Return Sync

**Purpose**: Pull B2C returns from bol.com and create return records in our system.

**Flow:**
```
1. Poll: GET /retailer/returns?handled=false&fulfilment-method=FBB
   (rate limit: 20/min)

2. For each unhandled return:
   GET /retailer/returns/{returnId}
   → Extract per item:
     - rmaId (bol.com's return item ID)
     - orderId, ean, title
     - expectedQuantity
     - returnReason.mainReason + customerComments
     - trackAndTrace, transporterName
     - processingResults (received/accepted status)

3. Create in our system:
   INSERT INTO returns (
     source='bolcom',
     bol_return_id=returnId,
     status=based on processingResults
   )
   INSERT INTO return_items (
     ean, quantity=expectedQuantity,
     reason=mapped from returnReason.mainReason,
     reason_notes=customerComments
   )

4. Handle return via API:
   PUT /retailer/returns/{rmaId}
   { handlingResult: "RETURN_RECEIVED", quantityReturned: N }

   Handling options:
   - RETURN_RECEIVED → accept, refund customer
   - EXCHANGE_PRODUCT → exchange
   - RETURN_DOES_NOT_MEET_CONDITIONS → reject
   - REPAIR_PRODUCT → repair
```

**Return reason mapping (bol.com → our system):**
| bol.com mainReason | Our reason enum |
|---|---|
| "Product is defective" | `defective` |
| "Received wrong product" | `wrong_item` |
| "Product not as described" | `not_as_described` |
| "No longer needed" | `no_longer_needed` |
| "Arrived too late" | `arrived_late` |
| (other) | `other` |

**Acceptance criteria:**
- [ ] Poll unhandled returns from bol.com
- [ ] Create return records with reason mapping
- [ ] Handle returns via API (accept/reject/exchange)
- [ ] Link to our Returns page (Phase 5)

#### 4F: bol.com Settings UI

**File**: New section in Settings or Integrations page

**UI Design:**
```
┌──────────────────────────────────────────────────────────────┐
│  bol.com Integration                              [Connected]│
│                                                              │
│  Client ID:     ●●●●●●●●●●1234                             │
│  Retailer ID:   9876543                                      │
│  Economic Op:   eco-op-xyz-123           [Edit]              │
│  Status:        Connected ✓  │  Last sync: 5 min ago        │
│                                                              │
│  ┌─ FBB Inventory ──────────────────────────────────────┐   │
│  │ EAN            │ Product        │ Ours │ bol.com │ Δ  │   │
│  │ 871852606933   │ Widget Pro     │  50  │   48    │ -2 │   │
│  │ 978178588236   │ Gadget X       │ 100  │  100    │  0 │   │
│  └───────────────────────────────────────────────────────┘   │
│  [Sync Now]  [Push All Stock]                                │
│                                                              │
│  ┌─ Recent Replenishments ──────────────────────────────┐   │
│  │ REF-2026-001 │ 3 pallets │ ANNOUNCED │ Feb 10        │   │
│  │ REF-2026-002 │ 5 pallets │ RECEIVED  │ Feb 8         │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Webhooks ───────────────────────────────────────────┐   │
│  │ PROCESS_STATUS │ Active ✓                             │   │
│  │ SHIPMENT       │ Active ✓                             │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Setup flow:**
1. Enter `client_id` + `client_secret` from bol.com partner platform
2. Click "Test Connection" → system calls `GET /retailer/inventory`
3. If successful: store credentials, mark connected
4. Enter `economic_operator_id` (required for offers)
5. System auto-creates webhook subscriptions (PROCESS_STATUS + SHIPMENT)

**Acceptance criteria:**
- [ ] Credential input + secure storage
- [ ] Connection test
- [ ] Inventory comparison view
- [ ] Replenishment history view
- [ ] Webhook subscription management

#### 4G: Rate Limit Awareness

**Key rate limits to respect:**

| Endpoint | Limit | Strategy |
|----------|-------|----------|
| Token endpoint | Very strict (IP ban risk) | Cache aggressively, refresh at 240s of 299s TTL |
| `GET /retailer/inventory` | 20/min | Cache for 3 minutes, manual refresh button |
| `POST /retailer/replenishments` | 10/min | Queue if multiple, process sequentially |
| `GET /retailer/replenishments/*` | 10/min | Poll max every 30 seconds |
| `PUT /retailer/offers/*/stock` | 50/sec | Batch updates, respect `Retry-After` |
| `GET /retailer/orders` | 25/min | Poll max every 5 minutes |
| `GET /retailer/returns` | 20/min | Poll max every 5 minutes |
| `GET /shared/process-status/*` | 100/sec | 3-second intervals in polling loop |

**Implementation:**
- Track `X-RateLimit-Remaining` header on every response
- If `429 Too Many Requests`: respect `Retry-After` header, queue retry
- Log rate limit usage to detect if approaching limits

---

### PHASE 5: RETURNS WORKFLOW (Gaps: G-RET-1 through G-RET-3)

> **Goal**: Build return processing UI for B2C returns.

#### 5A: Returns Page

**File**: New page `src/pages/Returns.jsx`

**Route**: `/Returns`

**UI Design:**
- Return list with filters: status, date, source (bol.com/manual)
- Per return: order reference, product(s), quantity, return reason, date
- Status flow: Aangemeld (registered) → Ontvangen (received) → Verwerkt (processed)
- Processing actions: Restock, Dispose, Inspect
- On restock: create receiving_log entry with `receipt_type='return'`, update inventory

**Acceptance criteria:**
- [ ] View all returns with status filtering
- [ ] Process returns: restock / dispose / inspect
- [ ] Inventory automatically updated on restock
- [ ] Return reason categorization and tracking

---

## 5. EMAIL POOL AUTO-SYNC SYSTEM

> **Concept**: The client uses ~30 different email addresses to place orders on consumer platforms (Amazon, bol.com, Coolblue, Joybuy, Delonghi, etc.) because some products have per-account purchase limits. Each email receives order confirmations. This system creates a **pool of connected email accounts** at the company level, monitors them via Composio webhooks, and **automatically** parses order confirmation emails into purchases, expected deliveries, and financial records — eliminating all manual data entry.
>
> **SCOPE**: This is a **product importing pipeline ONLY**. Pool emails flow exclusively into the stock_purchases → expected_deliveries → inventory pipeline. They do NOT appear in any user's inbox, do NOT trigger notifications to other team members, and do NOT integrate with the messaging/inbox module. The email content is used solely for data extraction, then stored in the sync log for audit purposes.
>
> **ISOLATION**: When a pool email account receives a message, no user in the company "sees" it as an email. The system silently classifies it, extracts order data if applicable, and creates the corresponding purchasing records. Only users with `email_pool.manage` permission can see the sync log and manage pool accounts.

### 5.1 ARCHITECTURE OVERVIEW

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        EMAIL POOL AUTO-SYNC                              │
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │ shop1@gmail   │   │ shop2@outlook │   │ shop30@gmail  │   ... × 30   │
│  │  (Gmail)      │   │  (Outlook)    │   │  (Gmail)      │              │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │
│         │                   │                   │                        │
│         ▼                   ▼                   ▼                        │
│  ┌──────────────────────────────────────────────────────┐               │
│  │         Composio OAuth (per-account connection)       │               │
│  │     Gmail: GMAIL_NEW_GMAIL_MESSAGE trigger (poll-based) │               │
│  │     Outlook: OUTLOOK_MESSAGE_TRIGGER (webhook-based)   │               │
│  └──────────────────────┬───────────────────────────────┘               │
│                         │ webhook POST                                   │
│                         ▼                                                │
│  ┌──────────────────────────────────────────────────────┐               │
│  │         composio-webhooks edge function                │               │
│  │   1. Receive email event                              │               │
│  │   2. Match to email_pool_accounts (by recipient/conn)  │               │
│  │   3. Normalize payload (Gmail OR Outlook → unified)   │               │
│  │   4. Resolve company_id (NOT user_id)                 │               │
│  │   4. Store raw event                                  │               │
│  │   5. Route to processOrderEmail()                     │               │
│  └──────────────────────┬───────────────────────────────┘               │
│                         │                                                │
│                         ▼                                                │
│  ┌──────────────────────────────────────────────────────┐               │
│  │         process-order-email edge function              │               │
│  │   1. AI Classification (Groq llama-3.1-8b)           │               │
│  │      → order_confirmation | shipping_update | other   │               │
│  │   2. If order_confirmation:                           │               │
│  │      a. Extract: supplier, products, EANs, qty,       │               │
│  │         price, order URL, order number                │               │
│  │      b. Match/create products by EAN                  │               │
│  │      c. Create stock_purchase (source='email_pool')   │               │
│  │      d. Create stock_purchase_line_items              │               │
│  │      e. Auto-approve → trigger expected_deliveries    │               │
│  │      f. Optionally create expense (finance)           │               │
│  │      g. Notify designated users                       │               │
│  │   3. If shipping_update:                              │               │
│  │      a. Extract tracking code + carrier               │               │
│  │      b. Match to expected_delivery                    │               │
│  │      c. Update tracking info                          │               │
│  └──────────────────────────────────────────────────────┘               │
│                         │                                                │
│                         ▼                                                │
│  ┌──────────────────────────────────────────────────────┐               │
│  │   stock_purchases → expected_deliveries → inventory   │               │
│  │   (same pipeline as manual/invoice upload)            │               │
│  └──────────────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 KEY ARCHITECTURE DECISIONS

#### Why a separate `email_pool_accounts` table (not `user_integrations`)?

`user_integrations` has `UNIQUE(user_id, toolkit_slug)` — only ONE Gmail per user. The email pool is a **company-level** concept: 30 email accounts owned by the company, not by individual users. A single admin user connects them all, but the data flows to the company.

```
user_integrations (existing)          email_pool_accounts (new)
────────────────────────              ──────────────────────────
- Per user                            - Per company
- UNIQUE(user_id, toolkit)            - UNIQUE(company_id, email)
- 1 Gmail per user                    - 30 Gmail per company
- User's personal inbox               - Order monitoring only
- Stores in inbox_messages             - Stores in stock_purchases
```

#### Why not just use the existing `email_accounts` table?

The existing `email_accounts` table was designed for generic email storage/classification. The pool system needs:
- Composio `connected_account_id` for OAuth management
- Trigger subscription tracking
- Auto-sync enable/disable per account
- Supplier pattern matching rules
- Sync statistics (last synced, orders found, errors)
- Active monitoring state

#### Webhook routing: How do we know which email pool account received the email?

Current webhook flow resolves to `user_id` via `user_integrations`. For pool accounts:

1. **Primary**: Look up `connected_account_id` in `email_pool_accounts` first (before `user_integrations`)
2. **Fallback**: Extract recipient email from payload `to` field → match against `email_pool_accounts.email_address`
3. **Resolution**: Pool match → route to `processOrderEmail()` with `company_id` instead of `user_id`

This means the webhook handler checks pool accounts FIRST, and only falls through to the existing user-level processing if no pool match is found.

#### AI Classification: How do we detect order confirmations vs spam?

Two-stage approach:
1. **Fast filter** (regex, no AI): Check subject line for known patterns per supplier
2. **AI classification** (Groq): For emails that pass the fast filter, use LLM to classify and extract

```
Subject line patterns (fast filter):
───────────────────────────────────
Amazon:     "Your Amazon.* order" | "Orderbevestiging" | "Bestelling.*verzonden"
bol.com:    "Bevestiging van je bestelling" | "Je bestelling bij bol.com"
Coolblue:   "Bedankt voor je bestelling" | "Orderbevestiging Coolblue"
Joybuy:     "Order Confirmation" | "Your order has been placed"
Delonghi:   "Bedankt voor uw bestelling" | "Order confirmation"
Generic:    "order confirm" | "bestelling" | "bevestiging" | "invoice" | "factuur"
```

Emails that don't match ANY pattern → skip entirely (no AI cost).

### 5.3 DATABASE SCHEMA

```sql
-- ============================================================
-- EMAIL POOL ACCOUNTS: Company-level email monitoring pool
-- ============================================================
CREATE TABLE email_pool_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Email identity
    email_address TEXT NOT NULL,
    display_name TEXT,                            -- e.g., "Shop Account 1"
    label TEXT,                                   -- e.g., "Amazon NL", "bol.com orders"

    -- Email provider
    provider TEXT NOT NULL DEFAULT 'gmail'
        CHECK (provider IN ('gmail', 'outlook')),

    -- Composio connection (OAuth)
    composio_connected_account_id TEXT,           -- From Composio OAuth flow
    composio_trigger_subscription_id TEXT,        -- Active trigger subscription ID
    toolkit_slug TEXT GENERATED ALWAYS AS (       -- Derived from provider for Composio API calls
        CASE provider WHEN 'gmail' THEN 'gmail' WHEN 'outlook' THEN 'outlook' END
    ) STORED,
    connection_status TEXT DEFAULT 'disconnected'
        CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'error', 'expired')),
    connection_error TEXT,                        -- Last error message

    -- Sync configuration
    is_active BOOLEAN DEFAULT true,              -- Master on/off switch
    auto_approve_orders BOOLEAN DEFAULT false,   -- Auto-approve high-confidence extractions
    auto_approve_threshold DECIMAL(3,2) DEFAULT 0.90, -- Confidence threshold for auto-approve
    sync_to_finance BOOLEAN DEFAULT false,       -- Also create expense records
    default_sales_channel TEXT DEFAULT 'undecided'
        CHECK (default_sales_channel IN ('b2b', 'b2c', 'undecided')),

    -- Supplier pattern matching
    supplier_patterns JSONB DEFAULT '[]'::jsonb,
    -- Format: [
    --   { "pattern": "amazon", "supplier_name": "Amazon", "country": "NL" },
    --   { "pattern": "bol.com", "supplier_name": "bol.com", "country": "NL" },
    --   { "pattern": "coolblue", "supplier_name": "Coolblue", "country": "NL" }
    -- ]

    -- Statistics
    total_emails_received INTEGER DEFAULT 0,
    total_orders_synced INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    last_email_at TIMESTAMPTZ,
    last_order_synced_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,

    -- Metadata
    connected_by UUID REFERENCES auth.users(id), -- Who connected this account
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email_address)
);

-- Indexes
CREATE INDEX idx_email_pool_company ON email_pool_accounts(company_id);
CREATE INDEX idx_email_pool_composio ON email_pool_accounts(composio_connected_account_id);
CREATE INDEX idx_email_pool_email ON email_pool_accounts(email_address);
CREATE INDEX idx_email_pool_active ON email_pool_accounts(company_id, is_active) WHERE is_active = true;

-- ============================================================
-- EMAIL POOL SYNC LOG: Every email processed by the pool
-- ============================================================
CREATE TABLE email_pool_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    email_pool_account_id UUID NOT NULL REFERENCES email_pool_accounts(id) ON DELETE CASCADE,

    -- Email metadata
    email_from TEXT,
    email_to TEXT,
    email_subject TEXT,
    email_snippet TEXT,                           -- First ~500 chars of body
    email_body TEXT,                              -- Full body for re-processing
    email_date TIMESTAMPTZ,
    email_source_id TEXT,                         -- Gmail message ID
    email_thread_id TEXT,                         -- Gmail thread ID

    -- Classification result
    classification TEXT
        CHECK (classification IN ('order_confirmation', 'shipping_update', 'return_notification', 'other', 'skipped', 'error')),
    classification_confidence DECIMAL(3,2),       -- AI confidence 0-1
    classification_method TEXT                    -- 'pattern_match' or 'ai'
        CHECK (classification_method IN ('pattern_match', 'ai', 'skipped')),

    -- Extraction result (for order_confirmation)
    extracted_data JSONB,                         -- Full AI extraction result
    extraction_confidence DECIMAL(3,2),

    -- Link to created records
    stock_purchase_id UUID REFERENCES stock_purchases(id),
    expense_id UUID REFERENCES expenses(id),

    -- Processing status
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped', 'duplicate')),
    error_message TEXT,
    processing_time_ms INTEGER,                   -- How long AI took

    -- Duplicate detection
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of_id UUID REFERENCES email_pool_sync_log(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sync_log_company ON email_pool_sync_log(company_id);
CREATE INDEX idx_sync_log_account ON email_pool_sync_log(email_pool_account_id);
CREATE INDEX idx_sync_log_status ON email_pool_sync_log(status);
CREATE INDEX idx_sync_log_classification ON email_pool_sync_log(classification);
CREATE INDEX idx_sync_log_created ON email_pool_sync_log(created_at DESC);
CREATE INDEX idx_sync_log_source ON email_pool_sync_log(email_source_id);

-- ============================================================
-- SUPPLIER EMAIL PATTERNS: Known sender patterns per supplier
-- (Company-level, shared across all pool accounts)
-- ============================================================
CREATE TABLE supplier_email_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES vendors(id),

    -- Pattern matching
    supplier_name TEXT NOT NULL,                  -- e.g., "Amazon"
    sender_patterns TEXT[] NOT NULL DEFAULT '{}', -- e.g., ["@amazon.nl", "@amazon.de", "auto-confirm@amazon"]
    subject_patterns TEXT[] NOT NULL DEFAULT '{}',-- e.g., ["Your Amazon.* order", "Orderbevestiging"]
    country TEXT DEFAULT 'NL',                    -- Default country for purchases from this supplier
    default_sales_channel TEXT DEFAULT 'undecided'
        CHECK (default_sales_channel IN ('b2b', 'b2c', 'undecided')),

    -- AI extraction prompt override (optional)
    custom_extraction_hints TEXT,                 -- Extra instructions for AI per supplier

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, supplier_name)
);

-- Seed common suppliers
-- (done per-company on first setup, not globally)
```

### 5.4 COLUMN ADDITIONS TO EXISTING TABLES

```sql
-- stock_purchases: track email pool source
ALTER TABLE stock_purchases ADD COLUMN source_type TEXT DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'invoice', 'email_pool'));
ALTER TABLE stock_purchases ADD COLUMN email_pool_account_id UUID REFERENCES email_pool_accounts(id);
ALTER TABLE stock_purchases ADD COLUMN email_pool_sync_log_id UUID REFERENCES email_pool_sync_log(id);
ALTER TABLE stock_purchases ADD COLUMN order_url TEXT;           -- Link to original order
ALTER TABLE stock_purchases ADD COLUMN order_number TEXT;        -- External order number
ALTER TABLE stock_purchases ADD COLUMN country_of_purchase TEXT DEFAULT 'NL';
```

### 5.5 COMPOSIO WEBHOOK HANDLER CHANGES

**File**: `supabase/functions/composio-webhooks/index.ts`

The webhook handler needs a new routing step BEFORE the existing user-level processing:

```
Current flow:
  webhook → resolve user_id → processGmailEvent (inbox + outreach detection)

New flow:
  webhook → check email_pool_accounts FIRST
          → if pool match → processPoolEmail() (order extraction pipeline)
          → if no pool match → existing flow (resolve user_id → processGmailEvent)
```

**Specific changes to composio-webhooks:**

1. **After payload parsing** (line ~605), before user_id resolution:
   - Extract recipient email from payload:
     - Gmail: `payload.data.to` or `payload.data.recipient`
     - Outlook: `payload.data.toRecipients[0].emailAddress.address` or `payload.data.to`
   - Query `email_pool_accounts` by `email_address` OR `composio_connected_account_id`
   - If match found AND `is_active = true`:
     - Set `pool_account_id` and `company_id` on the payload
     - Route to `processPoolEmail()` instead of normal flow
     - Skip user_id resolution entirely (pool emails are company-level)

2. **Normalize email payload across providers** (new helper function):
   ```typescript
   function normalizeEmailPayload(data: Record<string, unknown>, provider: 'gmail' | 'outlook') {
       if (provider === 'outlook' || data.toRecipients || data.bodyPreview) {
           // Microsoft Graph format
           return {
               from: data.from?.emailAddress?.address || data.sender?.emailAddress?.address || '',
               to: data.toRecipients?.[0]?.emailAddress?.address || '',
               subject: data.subject || '',
               body: data.body?.content || data.bodyPreview || '',
               date: data.receivedDateTime || data.createdDateTime || '',
               source_id: data.id || '',
               thread_id: data.conversationId || '',
           };
       } else {
           // Gmail format
           return {
               from: data.from || data.sender || '',
               to: data.to || data.recipient || '',
               subject: data.subject || '',
               body: data.message_text || data.snippet || '',
               date: data.date || data.message_timestamp || '',
               source_id: data.id || data.message_id || '',
               thread_id: data.thread_id || '',
           };
       }
   }
   ```

3. **New function `processPoolEmail()`** in composio-webhooks:
   - Normalize payload (Gmail or Outlook format → unified format)
   - Quick subject-line pattern match against `supplier_email_patterns`
   - If pattern matches or looks like order email → call `process-order-email` edge function
   - If no match → store in sync_log as `classification='skipped'`
   - Update `email_pool_accounts` statistics

4. **Return early** from webhook handler after pool processing (don't also store in inbox_messages)

5. **Trigger slug detection** — add Outlook pattern to the inferred trigger logic:
   ```
   Gmail:   GMAIL_NEW_GMAIL_MESSAGE  (poll-based, ~60s latency)
   Outlook: OUTLOOK_MESSAGE_TRIGGER  (webhook-based, near-realtime)
   ```
   If trigger starts with `OUTLOOK_` AND matches a pool account → same pool processing path

> **Latency note**: Gmail triggers are poll-based (~60s delay). Outlook triggers are webhook-based (near-realtime). Both deliver the same normalized payload after `normalizeEmailPayload()`, so downstream processing is identical — only the arrival timing differs.

**CRITICAL ISOLATION RULES:**
- Pool emails NEVER go to `inbox_messages` — they are NOT inbox items
- Pool emails NEVER create `user_notifications` for other team members
- Pool emails NEVER appear in the SYNC agent or inbox module
- Pool emails ONLY flow into: `email_pool_sync_log` → `stock_purchases` → `expected_deliveries` → `inventory`
- The only UI that shows pool email activity is the `EmailPoolSettings` page (visible only to users with `email_pool.manage` permission)
- This is a **product importing pipeline**, not an email client

### 5.6 ORDER EMAIL PROCESSING EDGE FUNCTION

**New file**: `supabase/functions/process-order-email/index.ts`

This is the core intelligence — takes a raw email and produces structured purchase data.

#### Input

```typescript
interface OrderEmailInput {
    company_id: string;
    email_pool_account_id: string;
    sync_log_id: string;              // Reference to email_pool_sync_log record

    // Email content
    email_from: string;
    email_to: string;
    email_subject: string;
    email_body: string;               // Full HTML/text body
    email_date: string;

    // Pre-matched supplier (if pattern matched)
    matched_supplier?: {
        supplier_id: string;
        supplier_name: string;
        country: string;
        sales_channel: string;
        custom_extraction_hints?: string;
    };
}
```

#### Processing Steps

**Step 1: Classification** (if not pre-classified by pattern)
```
Groq llama-3.1-8b-instant, temperature=0

PROMPT: """
Classify this email. Respond with ONLY one of:
- ORDER_CONFIRMATION (a new order has been placed and confirmed)
- SHIPPING_UPDATE (an order has been shipped, tracking info provided)
- RETURN_NOTIFICATION (a return has been initiated or processed)
- OTHER (unrelated to orders)

Email from: {from}
Subject: {subject}
Body (first 2000 chars): {body}

Classification:
"""
```

**Step 2: Extraction** (if ORDER_CONFIRMATION)
```
Groq llama-3.1-8b-instant, temperature=0, max_tokens=4096

PROMPT: """
You are an expert order confirmation email parser. Extract structured data from this
order confirmation email.

CRITICAL RULES:
1. Extract ONLY what is clearly present in the email
2. For prices, extract the EXACT values shown (ex. BTW/VAT if shown, otherwise as-is)
3. The order was placed on a consumer platform — look for order number, items, prices
4. EAN/barcode may not be present in confirmation emails — that's OK, leave null
5. Look for: product names, quantities, individual prices, total, order number, order URL

{custom_hints}

Email from: {from}
Subject: {subject}
Body: {body}

Respond with ONLY a JSON object:
{
    "platform": "Amazon|bol.com|Coolblue|Joybuy|Delonghi|other",
    "order_number": "string or null",
    "order_url": "string or null (direct link to order if present)",
    "order_date": "YYYY-MM-DD or null",
    "estimated_delivery": "YYYY-MM-DD or null",
    "currency": "EUR",
    "subtotal": number or null,
    "tax_amount": number or null,
    "shipping_cost": number or null,
    "total": number or null,
    "line_items": [
        {
            "description": "Full product name as shown",
            "quantity": number,
            "unit_price": number,
            "line_total": number,
            "ean": "13-digit barcode if shown, or null",
            "product_url": "link to product page if present, or null",
            "sku": "platform-specific SKU/ASIN if shown, or null"
        }
    ],
    "shipping_address": "string or null",
    "payment_method": "string or null",
    "confidence": 0.0 to 1.0
}
"""
```

**Step 3: Deduplication**
- Check `email_pool_sync_log` for same `email_source_id` (Gmail message ID)
- Check `stock_purchases` for same `order_number` + `supplier_id` combination
- If duplicate → mark sync_log as `status='duplicate'`, skip creation

**Step 4: Create Records** (same pipeline as invoice approval)
- Create `stock_purchase` with `source_type='email_pool'`
- Create `stock_purchase_line_items` for each product
- Match products by EAN (if present) or description
- If `auto_approve_orders = true` AND `confidence >= auto_approve_threshold`:
  - Set `status='approved'` → triggers `create_expected_deliveries_on_approval` DB trigger
  - This auto-creates `expected_deliveries` and updates `inventory.quantity_incoming`
- If not auto-approved:
  - Set `status='pending_review'` → appears in StockPurchases review queue
  - No notification — purchase silently appears in StockPurchases review queue
- If `sync_to_finance = true`: also create `expenses` record

**Step 5: Shipping Update** (if SHIPPING_UPDATE)
```
Extract: tracking_code, carrier, estimated_delivery_date
Match to existing expected_delivery by:
  1. order_number → stock_purchase → expected_deliveries
  2. product + supplier combination
Update expected_delivery: tracking_number, carrier, expected_date
```

**Step 6: Update Statistics**
- Increment `email_pool_accounts.total_orders_synced` or `total_errors`
- Update `last_order_synced_at`
- Update `email_pool_sync_log` with final status and linked IDs

#### Output

```typescript
interface OrderEmailResult {
    success: boolean;
    classification: 'order_confirmation' | 'shipping_update' | 'other' | 'error';
    stock_purchase_id?: string;       // Created purchase record
    expected_delivery_ids?: string[];  // Created delivery records
    expense_id?: string;              // Created finance record
    auto_approved: boolean;
    confidence: number;
    error?: string;
}
```

### 5.7 FRONTEND: EMAIL POOL MANAGEMENT

**New page**: `src/pages/EmailPoolSettings.jsx`

**Route**: `/EmailPoolSettings` (accessible from Settings or Integrations)

**Permission**: `integrations.manage`

#### UI Design

```
┌──────────────────────────────────────────────────────────────────┐
│  Email Pool                                              [+ Add] │
│  Auto-sync order confirmations from your email accounts          │
│                                                                  │
│  ┌──── Stats Bar ─────────────────────────────────────────────┐ │
│  │ 30 Accounts │ 28 Connected │ 142 Orders Synced │ 2 Errors │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──── Account Card ──────────────────────────────────────────┐ │
│  │ ● shop1@gmail.com                         [Connected ✓]    │ │
│  │   Label: "Amazon NL"                                       │ │
│  │   Channel: B2C  │  Auto-approve: On  │  Finance: Off      │ │
│  │   Last synced: 2 hours ago  │  Orders: 47  │  Errors: 0   │ │
│  │   [Disconnect]  [Settings]  [View Sync Log]                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──── Account Card ──────────────────────────────────────────┐ │
│  │ ○ shop2@gmail.com                         [Connect →]      │ │
│  │   Label: "bol.com orders"                                  │ │
│  │   Not connected - click Connect to authorize Gmail access  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ... (30 account cards)                                          │
│                                                                  │
│  ┌──── Supplier Patterns ─────────────────────────────────────┐ │
│  │ Known Suppliers                                   [+ Add]  │ │
│  │                                                            │ │
│  │ Amazon    │ @amazon.nl, @amazon.de  │ NL  │ B2C           │ │
│  │ bol.com   │ @bol.com               │ NL  │ B2C           │ │
│  │ Coolblue  │ @coolblue.nl           │ NL  │ B2C           │ │
│  │ Joybuy    │ @joybuy.com            │ CN  │ B2B           │ │
│  │ Delonghi  │ @delonghi.com          │ NL  │ B2C           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──── Recent Sync Activity ──────────────────────────────────┐ │
│  │ [Filter: All | Orders | Shipping | Errors | Skipped]       │ │
│  │                                                            │ │
│  │ 10:23 shop1@gmail  "Your Amazon order #302-1234"  → ✓     │ │
│  │ 10:15 shop3@gmail  "Bevestiging bol.com"          → ✓     │ │
│  │ 09:50 shop2@gmail  "Newsletter"                   → skip  │ │
│  │ 09:30 shop1@gmail  "Shipping: order #301-9999"    → track │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

#### Add Account Flow

1. Click "+ Add"
2. Modal: Enter email address + select provider (Gmail / Outlook) + display label + default channel (B2B/B2C)
   - Provider auto-detected from email domain where possible (`@gmail.com` → Gmail, `@outlook.com`/`@hotmail.com`/`@live.com` → Outlook, custom domains → user selects)
3. Creates `email_pool_accounts` record with `connection_status='disconnected'` and `provider='gmail'|'outlook'`
4. Click "Connect" on the card
5. Triggers Composio OAuth popup for the correct provider:
   - Gmail → Google OAuth consent (read-only email access)
   - Outlook → Microsoft OAuth consent (Mail.Read scope)
6. On successful OAuth:
   - Store `composio_connected_account_id`
   - Subscribe to provider-specific trigger:
     - Gmail: `GMAIL_NEW_GMAIL_MESSAGE` (poll-based, ~60s latency)
     - Outlook: `OUTLOOK_MESSAGE_TRIGGER` (webhook-based, near-realtime)
   - Store `composio_trigger_subscription_id`
   - Update `connection_status='connected'`

#### Settings Per Account (gear icon modal)

- **Display name / label**
- **Default sales channel** (B2B / B2C / Undecided)
- **Auto-approve**: Toggle + confidence threshold slider (0.80 - 0.99)
- **Sync to finance**: Toggle
- **Active/Paused**: Toggle
- **Supplier pattern overrides**: Per-account patterns (optional, falls back to global)

### 5.8 FRONTEND: STOCK PURCHASES INTEGRATION

**File**: `src/pages/StockPurchases.jsx` (modify existing)

**Changes:**
- Add "Email Pool" tab/filter alongside existing views
- Show auto-synced purchases with source badge: "Email Pool - shop1@gmail.com"
- Auto-synced purchases in `pending_review` appear in the same review queue
- Review modal shows original email subject/snippet alongside extracted data
- Approve/reject flow is identical to invoice-uploaded purchases

### 5.9 COMPOSIO MULTI-ACCOUNT HANDLING

#### The Problem

Composio's `user_integrations` has `UNIQUE(user_id, toolkit_slug)`. We can't store 30 Gmail connections under one user.

#### The Solution

Pool accounts use their own connection tracking in `email_pool_accounts.composio_connected_account_id`. They do NOT use `user_integrations` at all.

**Connection flow:**
1. Frontend calls `composio-connect` with `action: 'initiateConnection'`
2. Pass `toolkitSlug` based on provider:
   - Gmail accounts: `toolkitSlug: 'gmail'`
   - Outlook accounts: `toolkitSlug: 'outlook'`
3. Use a special entity_id pattern: `pool_{company_id}_{account_index}`
4. Composio creates connection (Gmail OAuth or Microsoft OAuth), returns `connectedAccountId`
5. Store `connectedAccountId` in `email_pool_accounts` (not `user_integrations`)
6. Subscribe to the provider-appropriate trigger:
   - Gmail: `GMAIL_NEW_GMAIL_MESSAGE` (poll-based, ~60s latency)
   - Outlook: `OUTLOOK_MESSAGE_TRIGGER` (webhook-based, near-realtime)

**Webhook routing:**
1. Webhook arrives with `connected_account_id`
2. First check `email_pool_accounts` WHERE `composio_connected_account_id = ?`
3. If found → pool processing path (normalize payload by provider, then same AI extraction)
4. If not found → fall through to existing `user_integrations` lookup

**Provider differences handled at the edge:**
- OAuth scopes: Gmail uses Google scopes, Outlook uses Microsoft Graph scopes — Composio handles this based on `toolkitSlug`
- Payload format: Normalized in `normalizeEmailPayload()` helper before AI extraction
- Trigger names: Different per provider, mapped in subscription step
- Everything after normalization is provider-agnostic — same AI prompt, same stock_purchase creation

This keeps the two systems completely independent.

### 5.10 SUPPLIER PATTERN SEEDS

Pre-configured patterns for common Dutch e-commerce platforms:

```json
[
    {
        "supplier_name": "Amazon",
        "sender_patterns": ["@amazon.nl", "@amazon.de", "@amazon.com", "@amazon.co.uk", "auto-confirm@amazon"],
        "subject_patterns": ["Your Amazon.* order", "Orderbevestiging", "Bevestiging van je bestelling", "Order Confirmation"],
        "country": "NL"
    },
    {
        "supplier_name": "bol.com",
        "sender_patterns": ["@bol.com", "noreply@bol.com"],
        "subject_patterns": ["Bevestiging van je bestelling", "Je bestelling bij bol.com", "bestelling.*bevestigd"],
        "country": "NL"
    },
    {
        "supplier_name": "Coolblue",
        "sender_patterns": ["@coolblue.nl", "@coolblue.be"],
        "subject_patterns": ["Bedankt voor je bestelling", "Orderbevestiging", "Je bestelling is geplaatst"],
        "country": "NL"
    },
    {
        "supplier_name": "Joybuy",
        "sender_patterns": ["@joybuy.com"],
        "subject_patterns": ["Order Confirmation", "Your order has been placed"],
        "country": "CN"
    },
    {
        "supplier_name": "Delonghi",
        "sender_patterns": ["@delonghi.com", "@delonghi.nl"],
        "subject_patterns": ["Bedankt voor uw bestelling", "Order confirmation", "Orderbevestiging"],
        "country": "NL"
    }
]
```

### 5.11 ERROR HANDLING & EDGE CASES

| Scenario | Handling |
|---|---|
| Email is not an order confirmation | Classified as 'other' or 'skipped', stored in sync_log, no purchase created |
| Duplicate order (same email ID) | Detected by `email_source_id` unique check, marked as 'duplicate' |
| Duplicate order (same order# + supplier) | Detected before creation, flagged in review |
| AI extraction fails | `status='failed'`, error stored in sync_log, visible only in EmailPoolSettings sync log. No notifications to other users |
| Low confidence extraction (<threshold) | Created as `pending_review`, silently appears in StockPurchases review queue (no notification broadcast) |
| OAuth token expires | Composio handles refresh; if permanent failure, `connection_status='expired'` |
| Email account disconnected | `is_active=false`, no webhooks processed, visual indicator in UI |
| Product EAN not found in database | Line item created without `product_id`, queued for product research (existing pipeline) |
| Multi-language emails | AI prompt handles NL/EN/DE; supplier patterns include multi-language subject lines |
| Email body is HTML | Strip HTML tags before sending to AI; preserve links for order URLs |

### 5.12 BUILD TASKS

- [ ] `EP-1` Create `email_pool_accounts` table + RLS policies
- [ ] `EP-2` Create `email_pool_sync_log` table + RLS policies
- [ ] `EP-3` Create `supplier_email_patterns` table + seed data + RLS policies
- [ ] `EP-4` Add columns to `stock_purchases` (source_type, email_pool refs, order_url, order_number, country)
- [ ] `EP-5` Modify `composio-webhooks/index.ts`: add pool account detection + routing before user-level processing
- [ ] `EP-6` Create `process-order-email/index.ts` edge function: classification + extraction + record creation
- [ ] `EP-7` Create `EmailPoolSettings.jsx` page: account list, add, connect, settings, sync log
- [ ] `EP-8` Add OAuth flow for pool accounts (extend composio-connect or use `useComposio` hook with pool entity IDs)
- [ ] `EP-9` Add trigger subscription management for pool accounts
- [ ] `EP-10` Modify `StockPurchases.jsx`: show email-pool sourced purchases with source badge
- [ ] `EP-11` Add notification on auto-synced order (in-app notification to designated users)
- [ ] `EP-12` Add route + navigation for EmailPoolSettings
- [ ] `EP-13` Add RBAC permission `email_pool.manage`
- [ ] `EP-14` Test: connect test Gmail → send mock order confirmation → verify purchase created
- [ ] `EP-15` Test: duplicate detection → same email doesn't create two purchases
- [ ] `EP-16` Test: shipping update email → updates expected_delivery tracking info

### 5.13 FILES TO CREATE/MODIFY

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260211_email_pool_system.sql` | Create | All pool tables + columns + RLS + seeds |
| `supabase/functions/process-order-email/index.ts` | Create | AI email classification + order extraction |
| `supabase/functions/composio-webhooks/index.ts` | Modify | Add pool account detection + routing |
| `src/pages/EmailPoolSettings.jsx` | Create | Pool management UI |
| `src/components/email-pool/PoolAccountCard.jsx` | Create | Individual account card component |
| `src/components/email-pool/AddPoolAccountModal.jsx` | Create | Add account modal |
| `src/components/email-pool/PoolAccountSettingsModal.jsx` | Create | Per-account settings |
| `src/components/email-pool/SyncLogTable.jsx` | Create | Sync activity feed |
| `src/components/email-pool/SupplierPatternsManager.jsx` | Create | Manage supplier patterns |
| `src/pages/StockPurchases.jsx` | Modify | Email-pool source badge + filter |
| Router/navigation config | Modify | Add EmailPoolSettings route |

---

## 6. SHOPIFY ADMIN API INTEGRATION

> **Concept**: Shopify serves as an **optional** B2C/DTC sales channel alongside bol.com. Some users will use both bol.com and Shopify, some only one, some neither. The integration must be non-destructive — enabling Shopify doesn't change existing workflows.
>
> **UNIVERSAL KEY**: Product matching uses **EAN** as the universal identifier: `products.ean` ↔ `Shopify variant.barcode` ↔ `bol.com EAN`. This is the same key used across all channels.
>
> **EXISTING CODEBASE**: Only catalog metadata exists in `src/lib/composio.js` (slug: `'shopify'`, two tools listed). No actual Shopify API integration exists — this is a greenfield build.

### 6.0 SYNC ARCHITECTURE DECISIONS

Before building the integration, these architecture decisions apply to all Shopify sync operations:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Sync direction** | iSyncso is master for inventory; Shopify is master for orders | We control stock, Shopify is the storefront |
| **Conflict resolution** | Last-write-wins with audit log | If both sides change simultaneously, most recent push wins; log both for review |
| **Webhook failure handling** | Exponential backoff retry (Shopify-managed, up to 19 retries over 48h) + pg_cron backup poll every 15 min | Shopify auto-retries failed webhooks; our backup poll catches anything that falls through |
| **Idempotency** | Deduplicate by `shopify_order_id` / `shopify_variant_id` | Every webhook handler checks for existing records before insert |
| **Stock allocation** | bol.com gets priority (committed FBB stock), Shopify gets remainder | FBB stock is physically at bol.com's warehouse — non-negotiable |
| **Partial sync support** | Yes — products can be mapped incrementally | No "big bang" full sync required; map products one at a time or in bulk |
| **Disconnection cleanup** | Soft-delete: mark credentials inactive, preserve mappings | Data is kept for potential reconnection; webhooks are removed from Shopify |

**Webhook reliability pattern:**
```
Primary:  Shopify webhook → shopify-webhooks edge fn → process event
Backup:   pg_cron every 15 min → shopify-api?action=poll_orders → catch missed events
Dedup:    Both paths check shopify_order_id UNIQUE constraint before insert
```

### 6.1 API STRATEGY: REST vs GraphQL

| Criteria | REST Admin API | GraphQL Admin API |
|----------|---------------|-------------------|
| Status | "Legacy" since Oct 2024 | Recommended for new apps |
| Public App requirement | Still supported | **Required** after April 2025 |
| Custom/Private app | Fully supported | Fully supported |
| Complexity | Simpler, RESTful endpoints | Single endpoint, query language |
| Pagination | Link header (cursor) | `pageInfo` + cursor |
| Rate limits | 40-bucket / 2/sec leak | 1000 cost points, varies by query |

**Decision: Use REST Admin API** for initial implementation. Rationale:
- Our app is installed per-merchant as a **custom app** (not listed on Shopify App Store), so REST is fully supported
- Simpler integration, faster to build, easier to debug
- Clear migration path to GraphQL later if we build a public Shopify App Store listing
- REST API version: `2024-10` (stable, supported until Oct 2025 minimum)

### 6.2 DATA MODEL MAPPING

**Shopify's data hierarchy:**
```
Shop
  └── Product
        └── Variant (has: barcode=EAN, sku, price, inventory_management)
              └── InventoryItem
                    └── InventoryLevel (per Location: available quantity)
```

**Cross-platform product mapping:**
```
┌─────────────┐        ┌──────────────────┐        ┌──────────────────┐
│   bol.com    │        │    iSyncso       │        │    Shopify       │
├─────────────┤        ├──────────────────┤        ├──────────────────┤
│ EAN         │◄──────►│ products.ean     │◄──────►│ variant.barcode  │
│ offer_id    │◄──────►│ bol_offer_id     │        │                  │
│             │        │ product_id       │◄──────►│ variant_id       │
│             │        │                  │◄──────►│ product_id       │
│             │        │                  │◄──────►│ inventory_item_id│
└─────────────┘        └──────────────────┘        └──────────────────┘
```

**Metafield strategy** (for reverse lookups from Shopify → our system):
- Namespace: `isyncso`
- Key `product_id`: our internal product UUID
- Key `bol_ean`: bol.com EAN (for cross-reference auditing)
- Stored as `single_line_text_field` type

### 6.3 AUTHENTICATION

**OAuth Authorization Code Grant** for multi-merchant support.

**Why not Composio?** Composio's Shopify integration only exposes 2 basic tools (`SHOPIFY_CREATE_ORDER`, `SHOPIFY_LIST_PRODUCTS`). We need deep access to Inventory, Fulfillments, Webhooks, and Metafields — a direct API integration gives us full control.

**OAuth Flow:**

```
1. User clicks "Connect Shopify Store" in Settings
2. Enters their myshopify.com domain (e.g., "my-store.myshopify.com")
3. System validates domain format, then redirects:

   GET https://{shop}.myshopify.com/admin/oauth/authorize
     ?client_id={SHOPIFY_API_KEY}
     &scope=read_products,write_products,read_inventory,write_inventory,
            read_orders,write_orders,read_fulfillments,write_fulfillments,
            read_shipping,write_shipping
     &redirect_uri=https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/shopify-api?action=oauth_callback
     &state={encrypted: company_id + nonce}

4. Merchant authorizes in Shopify admin
5. Shopify redirects to callback with ?code=...&shop=...&hmac=...&state=...
6. Server:
   a. Verify HMAC of callback parameters
   b. Verify state matches (prevents CSRF)
   c. Exchange code for permanent access token:
      POST https://{shop}.myshopify.com/admin/oauth/access_token
      { client_id, client_secret, code }
      → { access_token: "shpat_...", scope: "read_products,write_products,..." }
   d. Store in shopify_credentials table
   e. Fetch shop info: GET /admin/api/2024-10/shop.json
   f. Fetch locations: GET /admin/api/2024-10/locations.json
   g. Register all webhooks
   h. Redirect user back to Settings with success status
```

**Token lifecycle:** Shopify access tokens are **permanent** (no refresh needed, no expiration) unless the merchant uninstalls the app. Much simpler than bol.com's 5-minute tokens.

**Required Shopify App credentials** (stored as Edge Function secrets):
- `SHOPIFY_API_KEY` — App API key (client_id)
- `SHOPIFY_API_SECRET` — App API secret (client_secret, also used for HMAC verification)

### 6.4 PRODUCT SYNC

**Direction**: Bi-directional, EAN-based matching.

#### 6.4A: Import from Shopify (Initial Sync)

Triggered on first connect or manual "Sync Products" button.

**Flow:**
```
1. GET /admin/api/2024-10/products.json?limit=250
   (paginate via Link header: rel="next")

2. For each product → for each variant:
   a. Extract: variant.barcode (=EAN), variant.sku, variant.price, variant.inventory_item_id
   b. Query our products table: SELECT * FROM products WHERE ean = variant.barcode
   c. If match found:
      → CREATE shopify_product_mappings (product_id, shopify_product_id, shopify_variant_id,
         shopify_inventory_item_id, matched_by='ean')
   d. If no EAN match but SKU matches:
      → CREATE mapping with matched_by='sku'
   e. If no match at all:
      → Queue for manual mapping (show in "Unmapped Products" list)
      → Optionally auto-create product with matched_by='auto_created'

3. After all products synced:
   → Fetch inventory levels for all mapped inventory_item_ids
   → Store initial Shopify stock in mapping.shopify_stock_level
```

**Pagination handling:**
```typescript
async function fetchAllShopifyProducts(shopDomain: string, token: string) {
    let url = `https://${shopDomain}/admin/api/2024-10/products.json?limit=250`;
    const allProducts = [];

    while (url) {
        const res = await fetch(url, {
            headers: { 'X-Shopify-Access-Token': token }
        });
        const data = await res.json();
        allProducts.push(...data.products);

        // Parse Link header for next page
        const linkHeader = res.headers.get('Link');
        url = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)?.[1] || null;
    }
    return allProducts;
}
```

#### 6.4B: Push to Shopify (New Product Listing)

When user clicks "List on Shopify" for a product not yet on Shopify:

```
POST /admin/api/2024-10/products.json
{
    "product": {
        "title": product.name,
        "body_html": product.description,
        "vendor": product.brand,
        "product_type": product.category,
        "variants": [{
            "barcode": product.ean,
            "sku": product.sku,
            "price": product.retail_price,
            "inventory_management": "shopify",
            "inventory_policy": "deny",
            "requires_shipping": true
        }],
        "metafields": [{
            "namespace": "isyncso",
            "key": "product_id",
            "value": product.id,
            "type": "single_line_text_field"
        }]
    }
}
→ Response: { product: { id, variants: [{ id, inventory_item_id, ... }] } }
```

After creation:
- Store `product_id`, `variant_id`, `inventory_item_id` in `shopify_product_mappings`
- Set initial inventory level via `POST /inventory_levels/set.json`
- Update `products.shopify_listed = true`

### 6.5 INVENTORY SYNC

**Shopify Inventory Model:**
```
InventoryItem (one per variant)
  └── InventoryLevel (one per location per item)
       └── { available: integer }
```

#### Pull from Shopify:
```
GET /admin/api/2024-10/inventory_levels.json
    ?inventory_item_ids={comma-separated-ids}
    &location_ids={primary_location_id}
→ [{ inventory_item_id, location_id, available, updated_at }]
```
- Max 50 inventory_item_ids per request (batch if more)
- Store in `shopify_product_mappings.shopify_stock_level` for comparison

#### Push to Shopify:
```
POST /admin/api/2024-10/inventory_levels/set.json
{
    "location_id": credentials.primary_location_id,
    "inventory_item_id": mapping.shopify_inventory_item_id,
    "available": calculated_quantity
}
```

#### Sync Triggers:
- **On receiving** (InventoryReceiving): After scan-in → if product has Shopify mapping → queue stock update
- **On return restock**: After return processed as restock → update Shopify stock
- **On manual adjustment**: After admin changes inventory → push to Shopify
- **On bol.com stock change**: If product is on both channels → recalculate Shopify available qty

#### Stock Allocation Strategy:
```
Total stock = inventory.quantity_on_hand
bol.com reserved = inventory.quantity_allocated_b2c
Shopify available = inventory.quantity_on_hand
                  - inventory.quantity_allocated_b2c
                  - inventory.quantity_reserved
```
**Note**: For products on BOTH channels, stock allocation is configurable per product. Default: bol.com gets priority (since it's FBB/committed), Shopify gets remainder.

#### Location Handling:
- On first connect: `GET /admin/api/2024-10/locations.json`
- Store primary location ID in `shopify_credentials.primary_location_id`
- Most merchants have 1-2 locations
- Multi-location support: configuration in settings, defaults to first active location

### 6.6 ORDER IMPORT

**Pull Shopify orders into our system** via webhooks (primary) + periodic poll (backup).

#### Webhook-driven (real-time):
Webhook topic `orders/create` fires → `shopify-webhooks` handler → create sales_order

#### Periodic poll (backup, catches missed webhooks):
```
GET /admin/api/2024-10/orders.json
    ?status=any
    &fulfillment_status=unfulfilled
    &created_at_min={last_order_sync_at}
    &limit=50
```

#### Field Mapping:

| Shopify field | Our field | Table |
|---|---|---|
| `order.id` | `shopify_order_id` | `sales_orders` |
| `order.name` (e.g., "#1042") | `order_number` | `sales_orders` |
| `order.email` | `customer_email` | `sales_orders` |
| `order.created_at` | `order_date` | `sales_orders` |
| `order.total_price` | `total_amount` | `sales_orders` |
| `order.financial_status` | `payment_status` | `sales_orders` |
| `order.shipping_address` | `shipping_address` (JSONB) | `sales_orders` |
| `line_item.variant_id` | → `shopify_product_mappings` → `product_id` | `sales_order_items` |
| `line_item.quantity` | `quantity` | `sales_order_items` |
| `line_item.price` | `unit_price` | `sales_order_items` |

#### Order Processing Flow:
```
1. Receive order (webhook or poll)
2. Check dedup: SELECT FROM sales_orders WHERE shopify_order_id = {order.id}
3. Map line items: variant_id → shopify_product_mappings → product_id
   - If unmapped variant: log warning, create order with product_id=null (manual resolution)
4. INSERT sales_order (source='shopify', shopify_order_id, shopify_order_number)
5. INSERT sales_order_items for each line item
6. Update inventory: reduce quantity_available for matched products
7. Order appears in order management UI with "Shopify" source badge
```

### 6.7 FULFILLMENT PUSH

**When we ship a Shopify order from our warehouse:**

Shopify requires a two-step fulfillment process:

```
Step 1: Get fulfillment orders
   GET /admin/api/2024-10/orders/{order_id}/fulfillment_orders.json
   → Extract fulfillment_order_id and line_item IDs

Step 2: Create fulfillment
   POST /admin/api/2024-10/fulfillments.json
   {
       "fulfillment": {
           "line_items_by_fulfillment_order": [{
               "fulfillment_order_id": {fo_id},
               "fulfillment_order_line_items": [{
                   "id": {line_item_id},
                   "quantity": N
               }]
           }],
           "tracking_info": {
               "company": "PostNL",
               "number": "3STEST1234567",
               "url": "https://postnl.nl/tracktrace/?B=3STEST1234567&P=..."
           },
           "notify_customer": true
       }
   }
```

**Integration with InventoryShipping:**
1. Shipping task completed in our system → `handleCompleteTask()` fires
2. Check if order has `source='shopify'` and `shopify_order_id`
3. If yes → call `shopify-api?action=create_fulfillment` with tracking info
4. Shopify auto-emails customer with tracking
5. Update `sales_orders.status = 'fulfilled'`

**Carrier mapping** (our carriers → Shopify carrier names):
| Our carrier | Shopify carrier |
|---|---|
| PostNL | `PostNL` |
| DHL | `DHL` |
| DPD | `DPD` |
| UPS | `UPS` |
| FedEx | `FedEx` |
| GLS | `GLS` |

### 6.8 WEBHOOK HANDLER

**New edge function**: `supabase/functions/shopify-webhooks/index.ts`

#### HMAC-SHA256 Verification (CRITICAL — Shopify rejects apps that don't verify):

```typescript
import { createHmac } from 'node:crypto';

function verifyShopifyWebhook(rawBody: string, hmacHeader: string, secret: string): boolean {
    const hash = createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('base64');
    // Timing-safe comparison
    if (hash.length !== hmacHeader.length) return false;
    let mismatch = 0;
    for (let i = 0; i < hash.length; i++) {
        mismatch |= hash.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
    }
    return mismatch === 0;
}

// In main handler:
const hmac = req.headers.get('X-Shopify-Hmac-Sha256');
const topic = req.headers.get('X-Shopify-Topic');
const shopDomain = req.headers.get('X-Shopify-Shop-Domain');
const rawBody = await req.text();

if (!hmac || !verifyShopifyWebhook(rawBody, hmac, Deno.env.get('SHOPIFY_API_SECRET')!)) {
    return new Response('Unauthorized', { status: 401 });
}

// Look up company by shop_domain
const { data: creds } = await supabase
    .from('shopify_credentials')
    .select('company_id')
    .eq('shop_domain', shopDomain)
    .eq('status', 'connected')
    .single();

if (!creds) return new Response('Unknown shop', { status: 404 });

// Route by topic
const payload = JSON.parse(rawBody);
switch (topic) {
    case 'orders/create':       await handleOrderCreate(creds.company_id, payload); break;
    case 'orders/updated':      await handleOrderUpdate(creds.company_id, payload); break;
    case 'orders/cancelled':    await handleOrderCancel(creds.company_id, payload); break;
    case 'inventory_levels/update': await handleInventoryUpdate(creds.company_id, payload); break;
    case 'products/update':     await handleProductUpdate(creds.company_id, payload); break;
    case 'products/delete':     await handleProductDelete(creds.company_id, payload); break;
    case 'refunds/create':      await handleRefundCreate(creds.company_id, payload); break;
    case 'app/uninstalled':     await handleAppUninstalled(creds.company_id, shopDomain); break;
}

return new Response('OK', { status: 200 });
```

#### Webhook Topics to Register:

| Topic | Purpose | Handler Action |
|---|---|---|
| `orders/create` | New order placed | Import → `sales_orders` |
| `orders/updated` | Order modified/paid | Update `sales_orders` status |
| `orders/cancelled` | Order cancelled | Cancel `sales_order`, restore inventory |
| `inventory_levels/update` | External inventory change | Update `shopify_product_mappings.shopify_stock_level` (informational) |
| `products/update` | Product changed in Shopify | Update mapping metadata (title, price) |
| `products/delete` | Product removed from Shopify | Mark mapping `is_active = false` |
| `refunds/create` | Refund issued | Create return record in `returns` table |
| `app/uninstalled` | Merchant removed our app | Mark credentials disconnected, disable all sync |

#### Webhook Registration (on connect):
```
POST /admin/api/2024-10/webhooks.json
{
    "webhook": {
        "topic": "orders/create",
        "address": "https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/shopify-webhooks",
        "format": "json"
    }
}
→ Store returned webhook.id in shopify_credentials.webhook_ids array
```

Repeat for each of the 8 topics listed above.

### 6.9 DATABASE SCHEMA

```sql
-- ============================================================
-- SHOPIFY CREDENTIALS: Per-company Shopify store connection
-- ============================================================
CREATE TABLE shopify_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Store identity
    shop_domain TEXT NOT NULL,                    -- e.g., "my-store.myshopify.com"
    shop_name TEXT,                               -- Display name from shop API

    -- OAuth tokens
    access_token TEXT NOT NULL,                   -- Permanent access token (shpat_...)
    scope TEXT,                                   -- Granted scopes (comma-separated)

    -- Configuration
    primary_location_id TEXT,                     -- Shopify location for inventory ops
    auto_sync_orders BOOLEAN DEFAULT true,        -- Auto-import new orders via webhook
    auto_sync_inventory BOOLEAN DEFAULT true,     -- Auto-push inventory changes to Shopify
    auto_fulfill BOOLEAN DEFAULT false,           -- Auto-push fulfillments when we ship
    sync_frequency_minutes INTEGER DEFAULT 15,    -- Periodic backup sync interval

    -- Status
    status TEXT DEFAULT 'connected'
        CHECK (status IN ('connected', 'disconnected', 'error')),
    last_sync_at TIMESTAMPTZ,
    last_order_sync_at TIMESTAMPTZ,
    last_inventory_sync_at TIMESTAMPTZ,
    last_error TEXT,

    -- Webhook management
    webhook_ids JSONB DEFAULT '[]'::jsonb,       -- Array of registered Shopify webhook IDs

    -- Metadata
    connected_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, shop_domain)
);

-- ============================================================
-- SHOPIFY PRODUCT MAPPINGS: Link our products to Shopify variants
-- ============================================================
CREATE TABLE shopify_product_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Our side
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Shopify side
    shopify_product_id TEXT NOT NULL,
    shopify_variant_id TEXT NOT NULL,
    shopify_inventory_item_id TEXT,

    -- Mapping metadata
    matched_by TEXT DEFAULT 'ean'
        CHECK (matched_by IN ('ean', 'sku', 'manual', 'auto_created')),
    shopify_product_title TEXT,                   -- Cached for display
    shopify_variant_title TEXT,                   -- Cached for display

    -- Sync state
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    shopify_stock_level INTEGER,                  -- Last known Shopify stock

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, shopify_variant_id)
);

-- Indexes
CREATE INDEX idx_shopify_creds_company ON shopify_credentials(company_id);
CREATE INDEX idx_shopify_creds_domain ON shopify_credentials(shop_domain);
CREATE INDEX idx_shopify_mappings_product ON shopify_product_mappings(product_id);
CREATE INDEX idx_shopify_mappings_variant ON shopify_product_mappings(shopify_variant_id);
CREATE INDEX idx_shopify_mappings_company ON shopify_product_mappings(company_id);
CREATE INDEX idx_shopify_mappings_active ON shopify_product_mappings(company_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE shopify_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_product_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_credentials_company_access" ON shopify_credentials
    FOR ALL TO authenticated
    USING (company_id IN (SELECT company_id FROM team_members WHERE user_id = auth_uid()));

CREATE POLICY "shopify_product_mappings_company_access" ON shopify_product_mappings
    FOR ALL TO authenticated
    USING (company_id IN (SELECT company_id FROM team_members WHERE user_id = auth_uid()));
```

#### Column Additions to Existing Tables:

```sql
-- sales_orders: track Shopify source
ALTER TABLE sales_orders ADD COLUMN source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'shopify', 'bolcom', 'other'));
ALTER TABLE sales_orders ADD COLUMN shopify_order_id TEXT;
ALTER TABLE sales_orders ADD COLUMN shopify_order_number TEXT;     -- e.g., "#1042"

-- inventory: track external Shopify stock (informational, not authoritative)
ALTER TABLE inventory ADD COLUMN quantity_external_shopify INTEGER DEFAULT 0;

-- products: track Shopify listing status
ALTER TABLE products ADD COLUMN shopify_listed BOOLEAN DEFAULT false;
```

### 6.10 EDGE FUNCTION: shopify-api

**New file**: `supabase/functions/shopify-api/index.ts`

Unified edge function for all Shopify operations (same pattern as `bolcom-api`):

| Action | Shopify Endpoint | Purpose |
|---|---|---|
| `oauth_initiate` | — | Generate OAuth URL, validate domain |
| `oauth_callback` | `POST /admin/oauth/access_token` | Exchange code for token, store credentials |
| `test_connection` | `GET /admin/api/2024-10/shop.json` | Verify token works, get shop info |
| `get_locations` | `GET /admin/api/2024-10/locations.json` | List warehouse locations |
| `sync_products` | `GET /admin/api/2024-10/products.json` | Pull all products, create EAN-based mappings |
| `create_product` | `POST /admin/api/2024-10/products.json` | List new product on Shopify with metafields |
| `update_product` | `PUT /admin/api/2024-10/products/{id}.json` | Update product details/price |
| `get_inventory_levels` | `GET /admin/api/2024-10/inventory_levels.json` | Pull stock levels (batch, max 50 items) |
| `set_inventory_level` | `POST /admin/api/2024-10/inventory_levels/set.json` | Push single stock update |
| `batch_inventory_update` | Multiple `set_inventory_level` calls | Push stock for multiple products |
| `get_orders` | `GET /admin/api/2024-10/orders.json` | Pull unfulfilled orders (backup to webhooks) |
| `get_order` | `GET /admin/api/2024-10/orders/{id}.json` | Get single order detail |
| `create_fulfillment` | `POST /admin/api/2024-10/fulfillments.json` | Push fulfillment with tracking |
| `get_fulfillment_orders` | `GET /admin/api/2024-10/orders/{id}/fulfillment_orders.json` | Get fulfillment order IDs (needed before fulfillment) |
| `register_webhooks` | `POST /admin/api/2024-10/webhooks.json` | Register all 8 webhook topics |
| `delete_webhooks` | `DELETE /admin/api/2024-10/webhooks/{id}.json` | Remove webhooks on disconnect |
| `disconnect` | — | Remove webhooks, mark credentials disconnected |

#### Rate Limit Handling:

```typescript
// Shopify uses leaky bucket: 40 requests max, 2 requests/second leak
// Response header: X-Shopify-Shop-Api-Call-Limit: "32/40"

async function shopifyFetch(url: string, token: string, options?: RequestInit) {
    const res = await fetch(url, {
        ...options,
        headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
            ...options?.headers,
        }
    });

    // Check rate limit
    const callLimit = res.headers.get('X-Shopify-Shop-Api-Call-Limit');
    if (callLimit) {
        const [used, max] = callLimit.split('/').map(Number);
        if (used >= max - 2) {
            // Near limit, wait for bucket to leak
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (res.status === 429) {
        const retryAfter = parseFloat(res.headers.get('Retry-After') || '2');
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        return shopifyFetch(url, token, options); // Retry once
    }

    return res;
}
```

#### Rate Limits Reference (Basic plan):

| Resource | Bucket Size | Leak Rate | Strategy |
|----------|------------|-----------|----------|
| REST API (all endpoints) | 40 requests | 2/second | Check `X-Shopify-Shop-Api-Call-Limit`, pause near limit |
| Inventory set | Same bucket | Same | Batch updates, max 1/second for safety |
| Webhook registration | Same bucket | Same | Register all 8 in sequence with 500ms delay |

### 6.11 SHOPIFY SETTINGS UI

**Location**: New section in Settings/Integrations page (alongside bol.com section)

**UI Design:**
```
┌──────────────────────────────────────────────────────────────┐
│  Shopify Integration                            [Connected] │
│                                                              │
│  Store:         my-store.myshopify.com                      │
│  Status:        Connected ✓  │  Last sync: 2 min ago        │
│                                                              │
│  ┌─ Product Sync ─────────────────────────────────────────┐ │
│  │ Mapped: 142 products  │  Unmapped: 8 products          │ │
│  │ [Sync Products]  [View Unmapped]                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Inventory ────────────────────────────────────────────┐ │
│  │ Location: Main Warehouse                               │ │
│  │ Auto-sync: ✓ Enabled                                   │ │
│  │ Discrepancies: 3 products (ours vs Shopify)            │ │
│  │ [Sync Now]  [View Discrepancies]                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Orders ───────────────────────────────────────────────┐ │
│  │ Auto-import: ✓ Enabled                                 │ │
│  │ Pending fulfillment: 5 orders                          │ │
│  │ Auto-fulfill: ✗ Disabled  [Enable]                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Webhooks ─────────────────────────────────────────────┐ │
│  │ orders/create       │ Active ✓                          │ │
│  │ orders/updated      │ Active ✓                          │ │
│  │ inventory_levels    │ Active ✓                          │ │
│  │ refunds/create      │ Active ✓                          │ │
│  │ app/uninstalled     │ Active ✓                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Disconnect Store]                                         │
└──────────────────────────────────────────────────────────────┘
```

**Setup flow:**
1. Click "Connect Shopify Store"
2. Enter `myshopify.com` domain
3. Redirect to Shopify OAuth → merchant authorizes
4. Callback stores token → auto-fetches shop info + locations
5. System auto-registers 8 webhooks
6. Initial product sync begins (background task)
7. Products matched by EAN → mappings created automatically
8. Unmapped products shown for manual review (Shopify Product Mapper UI)

**Product Mapper UI** (for unmapped products):
- Shows Shopify products that don't have an EAN match
- Side-by-side: Shopify product info | Search our products
- Actions: "Map to product" (manual link), "Create product" (auto-create from Shopify data), "Skip"

### 6.12 CROSS-CHANNEL INTEGRATION

**Product card enhancements** (in `ProductsPhysical.jsx`):
- Channel badges: "bol.com" (orange), "Shopify" (green), "Both" (blue gradient)
- Stock breakdown row: `Internal: 50 | bol.com FBB: 48 | Shopify: 47`
- Quick actions: "List on Shopify" / "Create bol.com offer" (shown only if not already listed)

**Unified order view** (for future Orders page):
- All orders from all sources in one list
- Source badge: "Shopify" (green), "bol.com" (orange), "Manual" (zinc)
- Filter by source
- Unified fulfillment workflow

**Inventory allocation logic:**
```
Total stock = inventory.quantity_on_hand
Reserved = inventory.quantity_reserved + quantity_in_shipping

bol.com FBB stock:
  = inventory.quantity_allocated_b2c
  (physically at bol.com warehouse, synced via replenishments)

Shopify available stock:
  = quantity_on_hand - quantity_allocated_b2c - quantity_reserved
  (or custom allocation per product)

Internal available:
  = quantity_on_hand - quantity_allocated_b2c - quantity_reserved - quantity_shopify_committed
```

### 6.13 ACCEPTANCE CRITERIA SUMMARY

- [ ] OAuth flow: merchant connects Shopify store via Settings UI
- [ ] Token stored securely, permanent (no refresh needed)
- [ ] Product sync: pull all products, match by EAN, create mappings
- [ ] Unmapped product UI for manual resolution
- [ ] Push new products to Shopify with EAN as barcode + metafields
- [ ] Inventory sync: push stock levels to Shopify on receiving/returns/adjustments
- [ ] Pull Shopify stock levels for comparison display
- [ ] Order import via webhooks (real-time) + periodic poll (backup)
- [ ] Orders appear in our system with "Shopify" source badge
- [ ] Fulfillment push with tracking info when we ship
- [ ] Shopify auto-notifies customer on fulfillment
- [ ] Webhook handler with HMAC-SHA256 verification (timing-safe)
- [ ] Refund webhook → create return record
- [ ] `app/uninstalled` webhook → disconnect store gracefully
- [ ] Settings UI: connection, product mapper, inventory comparison, order settings
- [ ] Disconnect flow: remove webhooks, mark credentials disconnected
- [ ] Rate limit handling (leaky bucket, 40/2 per sec)
- [ ] Cross-channel product badges in ProductsPhysical

### 6.14 FILES TO CREATE/MODIFY

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260211_shopify_integration.sql` | Create | Shopify tables + column additions + RLS |
| `supabase/functions/shopify-api/index.ts` | Create | Unified Shopify API client (OAuth, products, inventory, orders, fulfillments, webhooks) |
| `supabase/functions/shopify-webhooks/index.ts` | Create | Webhook receiver with HMAC-SHA256 verification |
| `src/components/integrations/ShopifySettings.jsx` | Create | Shopify connection management panel |
| `src/components/integrations/ShopifyProductMapper.jsx` | Create | Manual product mapping UI for unmapped products |
| `src/pages/ProductsPhysical.jsx` | Modify | Channel badges, cross-channel stock view, "List on Shopify" action |
| `src/pages/InventoryShipping.jsx` | Modify | Auto-fulfill Shopify orders on shipping completion |
| Settings/Integrations page | Modify | Add Shopify settings section |
| `src/lib/composio.js` | Modify | Update Shopify catalog entry with note about direct integration |

---

## 7. DATABASE SCHEMA CHANGES

### New Tables

```sql
-- ============================================================
-- PURCHASE GROUPS: Group multiple purchases under one moment
-- ============================================================
CREATE TABLE purchase_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,                           -- e.g., "Amazon deal 10 feb"
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id),
    sales_channel TEXT CHECK (sales_channel IN ('b2b', 'b2c', 'mixed', 'undecided')),
    remarks TEXT,
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'partially_received', 'complete', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECEIVING SESSIONS: Group scans into receiving moments
-- ============================================================
CREATE TABLE receiving_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,                           -- e.g., "Pallet delivery DHL 10 feb"
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

-- ============================================================
-- SHIPMENTS: Group pallets into outbound shipments
-- ============================================================
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    shipment_code TEXT NOT NULL,                  -- e.g., "SHP-20260210-001"
    shipment_type TEXT NOT NULL CHECK (shipment_type IN ('b2b', 'b2c_lvb')),
    destination TEXT,                             -- customer name (B2B) or "bol.com LVB" (B2C)
    customer_id UUID REFERENCES customers(id),   -- for B2B
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'packing', 'packed', 'shipped', 'delivered', 'verified')),
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'discrepancy')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    bol_shipment_id TEXT,                         -- bol.com external shipment ID
    bol_received_at TIMESTAMPTZ,                  -- when bol.com confirmed receipt
    carrier TEXT,
    tracking_code TEXT,
    total_pallets INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    shipped_at TIMESTAMPTZ,
    shipped_by UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PALLETS: Individual pallets within a shipment
-- ============================================================
CREATE TABLE pallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    pallet_code TEXT NOT NULL,                    -- e.g., "PLT-20260210-001"
    sequence_number INTEGER NOT NULL,             -- pallet 1, 2, 3 within shipment
    status TEXT DEFAULT 'packing' CHECK (status IN ('packing', 'packed', 'shipped')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, pallet_code)
);

-- ============================================================
-- PALLET ITEMS: Products on each pallet
-- ============================================================
CREATE TABLE pallet_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pallet_id UUID NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    ean TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    verified_quantity INTEGER,                    -- from scan-to-verify
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pallet_id, product_id)
);

-- ============================================================
-- RETURNS: B2C return tracking
-- ============================================================
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    return_code TEXT NOT NULL,                    -- e.g., "RET-20260210-001"
    source TEXT NOT NULL CHECK (source IN ('bolcom', 'manual', 'other')),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'received', 'inspected', 'processed')),
    sales_order_id UUID REFERENCES sales_orders(id),
    customer_id UUID REFERENCES customers(id),
    bol_return_id TEXT,                           -- bol.com return reference
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RETURN ITEMS: Individual items in a return
-- ============================================================
CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    ean TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT CHECK (reason IN ('defective', 'wrong_item', 'not_as_described', 'no_longer_needed', 'arrived_late', 'other')),
    reason_notes TEXT,
    action TEXT CHECK (action IN ('restock', 'dispose', 'inspect', 'pending')),
    action_completed BOOLEAN DEFAULT FALSE,
    receiving_log_id UUID REFERENCES receiving_log(id),  -- link to restock receipt
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT SALES CHANNELS: Junction table (a product can be on
-- multiple channels simultaneously: B2B + B2C/bol.com + Shopify)
-- ============================================================
CREATE TABLE product_sales_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID NOT NULL REFERENCES products(id),
    channel TEXT NOT NULL CHECK (channel IN ('b2b', 'b2c', 'bolcom', 'shopify')),
    is_active BOOLEAN DEFAULT true,
    listed_at TIMESTAMPTZ DEFAULT NOW(),
    listed_by UUID REFERENCES auth.users(id),
    delisted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, product_id, channel)
);

-- ============================================================
-- CHANNEL AUDIT LOG: Track B2B/B2C changes
-- ============================================================
CREATE TABLE channel_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID REFERENCES products(id),
    purchase_group_id UUID REFERENCES purchase_groups(id),
    old_channel TEXT,
    new_channel TEXT,
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Column Additions to Existing Tables

```sql
-- products: sales channels tracked via product_sales_channels junction table (see New Tables above)
-- NO sales_channel column on products — a product can be on multiple channels simultaneously

-- stock_purchases: add manual entry support + grouping
ALTER TABLE stock_purchases ADD COLUMN entry_method TEXT DEFAULT 'invoice'
    CHECK (entry_method IN ('invoice', 'manual'));
ALTER TABLE stock_purchases ADD COLUMN purchase_group_id UUID REFERENCES purchase_groups(id);
ALTER TABLE stock_purchases ADD COLUMN sales_channel TEXT
    CHECK (sales_channel IN ('b2b', 'b2c', 'mixed', 'undecided'));

-- stock_purchase_line_items: add URL, country, channel
ALTER TABLE stock_purchase_line_items ADD COLUMN order_url TEXT;
ALTER TABLE stock_purchase_line_items ADD COLUMN country_of_purchase TEXT DEFAULT 'NL';
ALTER TABLE stock_purchase_line_items ADD COLUMN sales_channel TEXT
    CHECK (sales_channel IN ('b2b', 'b2c', 'undecided'));

-- expected_deliveries: add channel + purchase group link
ALTER TABLE expected_deliveries ADD COLUMN sales_channel TEXT
    CHECK (sales_channel IN ('b2b', 'b2c', 'undecided'));
ALTER TABLE expected_deliveries ADD COLUMN purchase_group_id UUID REFERENCES purchase_groups(id);

-- receiving_log: add session link
ALTER TABLE receiving_log ADD COLUMN receiving_session_id UUID REFERENCES receiving_sessions(id);

-- inventory: add channel-based stock
ALTER TABLE inventory ADD COLUMN quantity_allocated_b2b INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN quantity_allocated_b2c INTEGER DEFAULT 0;
```

### RLS Policies (All New Tables)

```sql
-- Standard pattern for all new tables:
-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Company-scoped access
CREATE POLICY "{table_name}_company_access" ON {table_name}
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM team_members WHERE user_id = auth.uid()
        )
    );

-- For pallet_items and return_items (no company_id, access via parent):
CREATE POLICY "pallet_items_access" ON pallet_items
    FOR ALL USING (
        pallet_id IN (
            SELECT id FROM pallets WHERE company_id IN (
                SELECT company_id FROM team_members WHERE user_id = auth.uid()
            )
        )
    );
```

### Indexes (All New Tables)

> Every new table must have at minimum a `company_id` index for RLS performance. Composite indexes below reflect expected query patterns.

```sql
-- ============================================================
-- PURCHASE GROUPS
-- ============================================================
CREATE INDEX idx_purchase_groups_company ON purchase_groups(company_id);
CREATE INDEX idx_purchase_groups_company_date ON purchase_groups(company_id, purchase_date DESC);
CREATE INDEX idx_purchase_groups_company_status ON purchase_groups(company_id, status);
CREATE INDEX idx_purchase_groups_supplier ON purchase_groups(supplier_id) WHERE supplier_id IS NOT NULL;

-- ============================================================
-- RECEIVING SESSIONS
-- ============================================================
CREATE INDEX idx_receiving_sessions_company ON receiving_sessions(company_id);
CREATE INDEX idx_receiving_sessions_company_status ON receiving_sessions(company_id, status);
CREATE INDEX idx_receiving_sessions_company_started ON receiving_sessions(company_id, started_at DESC);

-- ============================================================
-- SHIPMENTS
-- ============================================================
CREATE INDEX idx_shipments_company ON shipments(company_id);
CREATE INDEX idx_shipments_company_status ON shipments(company_id, status);
CREATE INDEX idx_shipments_company_type ON shipments(company_id, shipment_type);
CREATE INDEX idx_shipments_bol_id ON shipments(bol_shipment_id) WHERE bol_shipment_id IS NOT NULL;
CREATE INDEX idx_shipments_company_created ON shipments(company_id, created_at DESC);

-- ============================================================
-- PALLETS
-- ============================================================
CREATE INDEX idx_pallets_shipment ON pallets(shipment_id);
CREATE INDEX idx_pallets_company ON pallets(company_id);
CREATE INDEX idx_pallets_company_code ON pallets(company_id, pallet_code);

-- ============================================================
-- PALLET ITEMS
-- ============================================================
CREATE INDEX idx_pallet_items_pallet ON pallet_items(pallet_id);
CREATE INDEX idx_pallet_items_product ON pallet_items(product_id);
CREATE INDEX idx_pallet_items_ean ON pallet_items(ean) WHERE ean IS NOT NULL;

-- ============================================================
-- RETURNS
-- ============================================================
CREATE INDEX idx_returns_company ON returns(company_id);
CREATE INDEX idx_returns_company_status ON returns(company_id, status);
CREATE INDEX idx_returns_sales_order ON returns(sales_order_id) WHERE sales_order_id IS NOT NULL;
CREATE INDEX idx_returns_bol_return ON returns(bol_return_id) WHERE bol_return_id IS NOT NULL;

-- ============================================================
-- RETURN ITEMS
-- ============================================================
CREATE INDEX idx_return_items_return ON return_items(return_id);
CREATE INDEX idx_return_items_product ON return_items(product_id);

-- ============================================================
-- PRODUCT SALES CHANNELS
-- ============================================================
CREATE INDEX idx_product_sales_channels_company ON product_sales_channels(company_id);
CREATE INDEX idx_product_sales_channels_product ON product_sales_channels(product_id);
CREATE INDEX idx_product_sales_channels_active ON product_sales_channels(company_id, channel) WHERE is_active = true;
CREATE INDEX idx_product_sales_channels_product_active ON product_sales_channels(product_id, is_active) WHERE is_active = true;

-- ============================================================
-- CHANNEL AUDIT LOG
-- ============================================================
CREATE INDEX idx_channel_audit_company ON channel_audit_log(company_id);
CREATE INDEX idx_channel_audit_product ON channel_audit_log(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_channel_audit_company_changed ON channel_audit_log(company_id, changed_at DESC);

-- ============================================================
-- COLUMN ADDITIONS: Indexes on new FK columns
-- ============================================================
CREATE INDEX idx_stock_purchases_group ON stock_purchases(purchase_group_id) WHERE purchase_group_id IS NOT NULL;
CREATE INDEX idx_expected_deliveries_group ON expected_deliveries(purchase_group_id) WHERE purchase_group_id IS NOT NULL;
CREATE INDEX idx_receiving_log_session ON receiving_log(receiving_session_id) WHERE receiving_session_id IS NOT NULL;
```

---

## 8. FILE MAP - EXISTING FILES TO MODIFY

| File | Phase | Changes |
|------|-------|---------|
| `src/pages/StockPurchases.jsx` | P1 | Add manual purchase form, purchase groups, channel field |
| `src/pages/ProductsPhysical.jsx` | P1 | Add channel badges (from junction table), filter, multi-select edit |
| `src/pages/InventoryReceiving.jsx` | P2 | Add receiving sessions, notification trigger, export |
| `src/pages/InventoryShipping.jsx` | P3 | Link to shipments/pallets, update status flow |
| `src/pages/Layout.jsx` or router config | P1-P3 | Add new routes for PalletBuilder, ShipmentVerification, Returns |
| `src/pages/index.js` or route definitions | P1-P3 | Register new page routes |

---

## 9. NEW FILES TO CREATE

| File | Phase | Purpose |
|------|-------|---------|
| `supabase/migrations/20260211_blueprint_foundation.sql` | P0 | All database changes |
| `src/components/purchases/ManualPurchaseModal.jsx` | P1 | Manual purchase entry form |
| `src/components/purchases/PurchaseGroupView.jsx` | P1 | Purchase group display component |
| `src/pages/PalletBuilder.jsx` | P3 | Pallet building page |
| `src/pages/ShipmentVerification.jsx` | P3 | Verification dashboard page |
| `src/components/pallets/PalletCard.jsx` | P3 | Individual pallet display |
| `src/components/pallets/ShipmentSummary.jsx` | P3 | Shipment totals per EAN |
| `src/components/pallets/VerificationTable.jsx` | P3 | Purchased vs received vs packed comparison |
| `src/pages/Returns.jsx` | P5 | Returns processing page |
| `supabase/functions/bolcom-api/index.ts` | P4 | Unified bol.com Retailer API v10 client (auth, replenishments, offers, orders, returns, inventory) |
| `supabase/functions/bolcom-webhooks/index.ts` | P4 | bol.com's own webhook receiver (PROCESS_STATUS, SHIPMENT events) |
| `supabase/migrations/20260211_email_pool_system.sql` | EP | Email pool tables + columns + RLS |
| `supabase/functions/process-order-email/index.ts` | EP | AI email classification + order extraction |
| `src/pages/EmailPoolSettings.jsx` | EP | Pool management UI page |
| `src/components/email-pool/PoolAccountCard.jsx` | EP | Account card component |
| `src/components/email-pool/AddPoolAccountModal.jsx` | EP | Add account modal |
| `src/components/email-pool/PoolAccountSettingsModal.jsx` | EP | Per-account settings modal |
| `src/components/email-pool/SyncLogTable.jsx` | EP | Sync activity feed |
| `src/components/email-pool/SupplierPatternsManager.jsx` | EP | Manage supplier email patterns |
| `supabase/migrations/20260211_shopify_integration.sql` | SH | Shopify tables + column additions + RLS |
| `supabase/functions/shopify-api/index.ts` | SH | Unified Shopify API client (OAuth, products, inventory, orders, fulfillments, webhooks) |
| `supabase/functions/shopify-webhooks/index.ts` | SH | Webhook receiver with HMAC-SHA256 verification |
| `src/components/integrations/ShopifySettings.jsx` | SH | Shopify connection management panel |
| `src/components/integrations/ShopifyProductMapper.jsx` | SH | Manual product mapping UI for unmapped products |

---

## 10. BUILD PROGRESS TRACKER

### Phase 0: Database Foundation & Infrastructure
- [x] `P0-1` Create migration file with all new tables (incl. `product_sales_channels` junction table)
- [x] `P0-2` Add column additions to existing tables
- [x] `P0-3` Add RLS policies for all new tables
- [x] `P0-4` Add composite indexes for all new tables (see Section 7 index definitions)
- [x] `P0-5` Enable `pg_cron` extension via Supabase Management API
- [x] `P0-6` RLS audit: add missing policy for `sales_order_items`, verify all inventory tables use `company_id` via `get_user_company_id()`
- [x] `P0-7` Document tenant scoping convention: `company_id` for inventory/logistics, `organization_id` for talent
- [x] `P0-8` Test migration on local/staging

### Phase 1: Purchasing Overhaul
- [x] `P1-1` ManualPurchaseModal component
- [x] `P1-2` Purchase group management (create, list, filter)
- [x] `P1-3` Integrate manual entry into StockPurchases page
- [x] `P1-4` Add B2B/B2C channel field to purchase flow
- [x] `P1-5` Add channel badges to ProductsPhysical (from `product_sales_channels` junction table, multi-select edit)
- [x] `P1-6` Channel audit logging
- [x] `P1-7` Fix orphaned trigger: wire `create_expected_deliveries_on_insert()` to `stock_purchases` INSERT or consolidate with approval trigger
- [x] `P1-8` Test: create manual purchase with groups and channel

### Phase 2: Receiving Enhancements
- [x] `P2-1` Receiving session start/close flow
- [x] `P2-2` Link scans to active session
- [x] `P2-3` Session summary view
- [x] `P2-4` In-app notification on session close
- [x] `P2-5` CSV/PDF export of session data
- [x] `P2-6` Session history view
- [x] `P2-7` Test: full receiving session with notifications

### Phase 3: Pallet Management (sub-phased: 3a → 3b → 3c)

**Phase 3a: Core Pallet CRUD**
- [x] `P3-1` PalletBuilder page - shipment creation
- [x] `P3-2` PalletBuilder - pallet creation within shipment
- [x] `P3-3` PalletBuilder - add products to pallets (scan + manual)
- [x] `P3-4` PalletBuilder - running totals and stock checks
- [x] `P3-5` PalletBuilder - finalize shipment
- [x] `P3-6` Add routes to navigation

**Phase 3b: Shipment Linking + Verification**
- [x] `P3-7` ShipmentVerification page - comparison table
- [x] `P3-8` ShipmentVerification - discrepancy detection
- [x] `P3-9` ShipmentVerification - sign-off flow
- [x] `P3-10` Pallet label generation (barcode + print)
- [x] `P3-11` Scan-to-verify mode during packing

**Phase 3c: Weight/Dimensions + bol.com LVB**
- [x] `P3-12` Expose weight/dimensions per pallet in PalletBuilder UI (with aggregated shipment totals)
- [x] `P3-13` Wire weight/dimensions to bol.com LVB replenishment creation (prepareBolcomReplenishmentData bridge)
- [x] `P3-14` Test: full pallet build → verify → ship flow

### Phase 4: bol.com Retailer API Integration
- [x] `P4-1` Create `bolcom_credentials` table (with token caching columns: `access_token`, `token_expires_at`) + RLS
- [x] `P4-2` Create `bolcom_offer_mappings` table (product_id → bol.com offer_id + EAN) + RLS
- [x] `P4-3` Create `bolcom_pending_process_statuses` table (for async ProcessStatus polling) + RLS
- [x] `P4-4` Build `bolcom-api/index.ts` edge function (unified API client with all 22 actions)
- [x] `P4-5` Implement Client Credentials auth + DB-persisted token caching (cold-start safe) + pg_cron pre-refresh every 4 min
- [x] `P4-6` Implement ProcessStatus polling helper with `bolcom_pending_process_statuses` queue + pg_cron poll
- [x] `P4-7` Build FBB replenishment flow: product destinations → timeslots → create → labels
- [x] `P4-8` Add bol.com columns to `shipments` table (replenishment_id, state, labels, received quantities)
- [x] `P4-9` Wire PalletBuilder "Push to bol.com" button to replenishment creation
- [x] `P4-10` Implement replenishment status polling → update ShipmentVerification with received quantities
- [x] `P4-11` Build stock sync: pull FBB inventory, compare with our B2C stock, push stock updates to offers
- [x] `P4-12` Build offer management: create/update offers via `bolcom_offer_mappings` with economic operator ID
- [x] `P4-13` Create `bolcom-webhooks/index.ts` edge function for bol.com's own webhook notifications
- [x] `P4-14` Implement webhook signature verification (RSA-SHA256)
- [x] `P4-15` Build return sync: poll unhandled returns, create return records, handle via API
- [x] `P4-16` Build bol.com Settings UI: credentials, connection test, inventory comparison, replenishment history
- [x] `P4-17` Implement rate limit tracking + `Retry-After` respect
- [x] `P4-18` Test: store credentials → test connection → verify token caching works across cold starts
- [x] `P4-19` Test: create replenishment → poll ProcessStatus → verify labels
- [x] `P4-20` Test: stock sync → push stock update → verify on bol.com
- [x] `P4-21` Test: return polling → create return record → handle return via API

### Phase 5: Returns Workflow
- [x] `P5-1` Returns page with list and filters
- [x] `P5-2` Return processing (restock/dispose/inspect)
- [x] `P5-3` Inventory update on restock
- [x] `P5-4` Link to bol.com returns (from Phase 4)
- [x] `P5-5` Test: manual return + restock flow

### Email Pool Auto-Sync System
- [ ] `EP-1` Create `email_pool_accounts` table + RLS policies
- [ ] `EP-2` Create `email_pool_sync_log` table + RLS policies
- [ ] `EP-3` Create `supplier_email_patterns` table + seed data + RLS policies
- [ ] `EP-4` Add columns to `stock_purchases` (source_type, email_pool refs, order_url, order_number, country)
- [ ] `EP-5` Modify `composio-webhooks/index.ts`: pool account detection + routing
- [ ] `EP-6` Create `process-order-email/index.ts` edge function
- [ ] `EP-7` Create `EmailPoolSettings.jsx` page with full UI
- [ ] `EP-8` OAuth flow for pool accounts (Composio multi-account)
- [ ] `EP-9` Trigger subscription management for pool accounts (Gmail: `GMAIL_NEW_GMAIL_MESSAGE`, Outlook: `OUTLOOK_MESSAGE_TRIGGER`)
- [ ] `EP-10` Modify `StockPurchases.jsx`: email-pool source badge + filter
- [ ] `EP-11` Optional: notification ONLY to the pool admin (connected_by user) on errors/failed extractions
- [ ] `EP-12` Add route + navigation for EmailPoolSettings
- [ ] `EP-13` Add RBAC permission `email_pool.manage`
- [ ] `EP-14` Test: connect Gmail → mock order confirmation → verify purchase created
- [ ] `EP-15` Test: duplicate detection (same email doesn't create two purchases)
- [ ] `EP-16` Test: shipping update email → updates expected_delivery tracking

### Shopify Admin API Integration
- [ ] `SH-1` Create `shopify_credentials` table + RLS policies
- [ ] `SH-2` Create `shopify_product_mappings` table + RLS policies + indexes
- [ ] `SH-3` Add columns to `sales_orders` (source, shopify_order_id, shopify_order_number)
- [ ] `SH-4` Add columns to `inventory` (quantity_external_shopify) and `products` (shopify_listed)
- [ ] `SH-5` Build `shopify-api/index.ts` edge function (unified API client with all 17 actions)
- [ ] `SH-6` Implement OAuth Authorization Code flow (initiate → callback → store token)
- [ ] `SH-7` Implement product sync: pull all Shopify products, match by EAN, create mappings
- [ ] `SH-8` Implement push-to-Shopify: create product with EAN barcode + metafields
- [ ] `SH-9` Implement inventory pull: fetch Shopify stock levels for comparison
- [ ] `SH-10` Implement inventory push: set stock level on receiving/returns/adjustments
- [ ] `SH-11` Implement order import: webhook-driven + periodic poll backup
- [ ] `SH-12` Implement fulfillment push: tracking info sent to Shopify on ship
- [ ] `SH-13` Build `shopify-webhooks/index.ts` edge function with HMAC-SHA256 verification
- [ ] `SH-14` Handle all 8 webhook topics (orders, inventory, products, refunds, app/uninstalled)
- [ ] `SH-15` Build ShopifySettings UI: connection, product sync status, inventory comparison, order settings
- [ ] `SH-16` Build ShopifyProductMapper UI: unmapped products resolution
- [ ] `SH-17` Add channel badges to ProductsPhysical (bol.com/Shopify/Both)
- [ ] `SH-18` Add cross-channel stock display (Internal | bol.com FBB | Shopify)
- [ ] `SH-19` Modify InventoryShipping for auto-fulfill on Shopify orders
- [ ] `SH-20` Implement rate limit handling (leaky bucket 40/2)
- [ ] `SH-21` Implement disconnect flow (remove webhooks, mark disconnected)
- [ ] `SH-22` Test: connect store → sync products → verify mappings created
- [ ] `SH-23` Test: push stock update → verify in Shopify
- [ ] `SH-24` Test: Shopify order webhook → sales_order created with correct line items
- [ ] `SH-25` Test: ship order → fulfillment pushed → customer notified

---

## APPENDIX A: TERMINOLOGY MAPPING

| Dutch (Client) | English (Codebase) | Database Table |
|---|---|---|
| Inkoop | Purchase | `stock_purchases`, `purchase_groups` |
| Bestelling | Order | `stock_purchases` |
| Leverancier | Supplier/Vendor | `vendors` |
| Ontvangst | Receiving | `receiving_log`, `receiving_sessions` |
| Deellevering | Partial delivery | `expected_deliveries.status='partial'` |
| Voorraad | Inventory/Stock | `inventory` |
| Pallet | Pallet | `pallets` |
| Zending | Shipment | `shipments` |
| Inpakken | Packing | Pallet builder workflow |
| Verzending | Shipping | `shipping_tasks` |
| Retour | Return | `returns`, `return_items` |
| EAN | EAN/Barcode | `products.ean` |
| BTW | VAT | Tax fields on line items |
| LVB | Logistics via bol.com | `shipments.shipment_type='b2c_lvb'` |

## APPENDIX B: KEY PEOPLE & ROLES

| Person | Current Role | System Role Needed |
|---|---|---|
| Mink | Purchasing decisions, supplier contact, B2B/B2C decisions | Purchasing manager, channel decision authority |
| Diederik | Data verification, Excel management, quality control | Verification authority, receiving notification recipient |
| Warehouse staff | Unpack, scan with Barcodia, pack pallets | Receiving operator, pallet packer |

## APPENDIX C: BOL.COM RETAILER API v10 ENDPOINT REFERENCE

**Base URL**: `https://api.bol.com/retailer`
**Auth URL**: `https://login.bol.com/token?grant_type=client_credentials`
**Versioning**: Header `Accept: application/vnd.retailer.v10+json`
**Async model**: POST/PUT/DELETE return ProcessStatus → poll `GET /shared/process-status/{id}`

### Authentication
| Method | Endpoint | Purpose | Rate Limit |
|---|---|---|---|
| `POST` | `https://login.bol.com/token?grant_type=client_credentials` | Get JWT access token (5-min TTL) | STRICT (IP ban risk) |

### FBB Replenishments (LVB Inbound)
| Method | Endpoint | Purpose | Rate Limit | Async |
|---|---|---|---|---|
| `POST` | `/retailer/replenishments/product-destinations` | Which warehouse for which EANs (max 50) | 10/min | Yes |
| `GET` | `/retailer/replenishments/product-destinations/{id}` | Get destination result | 10/min | No |
| `POST` | `/retailer/replenishments/pickup-time-slots` | Get available pickup windows | 10/min | No |
| `GET` | `/retailer/replenishments/delivery-dates` | Get available self-delivery dates | 10/min | No |
| `POST` | `/retailer/replenishments` | Create replenishment (inbound shipment) | 10/min | Yes |
| `GET` | `/retailer/replenishments/{id}` | Get replenishment status + received quantities | 10/min | No |
| `GET` | `/retailer/replenishments?state=X` | List replenishments by state | 10/min | No |
| `PUT` | `/retailer/replenishments/{id}` | Update/cancel replenishment | 10/min | Yes |
| `GET` | `/retailer/replenishments/{id}/load-carrier-labels` | PDF: transport + warehouse labels | 10/min | No |
| `GET` | `/retailer/replenishments/{id}/pick-list` | PDF: packing verification list | 10/min | No |
| `POST` | `/retailer/replenishments/product-labels` | PDF: product labels (if self-labeling) | 10/min | No |

### Offers
| Method | Endpoint | Purpose | Rate Limit | Async |
|---|---|---|---|---|
| `POST` | `/retailer/offers` | Create product listing | 50/sec | Yes |
| `PUT` | `/retailer/offers/{offerId}` | Update offer metadata | 50/sec | Yes |
| `PUT` | `/retailer/offers/{offerId}/price` | Update price only | 50/sec | Yes |
| `PUT` | `/retailer/offers/{offerId}/stock` | Update stock only | 50/sec | Yes |
| `GET` | `/retailer/offers/{offerId}` | Get offer details | 50/sec | No |
| `DELETE` | `/retailer/offers/{offerId}` | Delete offer | 50/sec | Yes |
| `POST` | `/retailer/offers/export` | Bulk CSV export | 9/hr | Yes |
| `GET` | `/retailer/offers/export/{reportId}` | Download export CSV | 9/hr | No |

### Orders & Shipments
| Method | Endpoint | Purpose | Rate Limit | Async |
|---|---|---|---|---|
| `GET` | `/retailer/orders?fulfilment-method=FBB&status=OPEN` | List FBB orders | 25/min | No |
| `GET` | `/retailer/orders/{orderId}` | Get order detail | 25/sec | No |
| `PUT` | `/retailer/orders/cancellation` | Cancel order items | 25/min | Yes |
| `POST` | `/retailer/shipments` | Create shipment (FBR only) | 25/sec | Yes |
| `GET` | `/retailer/shipments?fulfilment-method=FBB` | List FBB shipments | 25/min | No |

### Returns
| Method | Endpoint | Purpose | Rate Limit | Async |
|---|---|---|---|---|
| `GET` | `/retailer/returns?handled=false&fulfilment-method=FBB` | Unhandled FBB returns | 20/min | No |
| `GET` | `/retailer/returns/{returnId}` | Return detail | 20/min | No |
| `PUT` | `/retailer/returns/{rmaId}` | Handle return item | 20/min | Yes |
| `POST` | `/retailer/returns` | Create return (retailer-initiated) | 20/min | Yes |

### Inventory
| Method | Endpoint | Purpose | Rate Limit | Async |
|---|---|---|---|---|
| `GET` | `/retailer/inventory` | FBB warehouse stock levels (ean, regularStock, gradedStock) | 20/min | No |

### Subscriptions (bol.com webhooks)
| Method | Endpoint | Purpose | Rate Limit | Async |
|---|---|---|---|---|
| `POST` | `/retailer/subscriptions` | Create webhook subscription | 10/sec | Yes |
| `GET` | `/retailer/subscriptions` | List subscriptions | 10/sec | No |
| `PUT` | `/retailer/subscriptions/{id}` | Update/re-enable subscription | 10/sec | Yes |
| `DELETE` | `/retailer/subscriptions/{id}` | Delete subscription | 10/sec | Yes |
| `POST` | `/retailer/subscriptions/{id}/test` | Send test notification | 10/sec | No |
| `GET` | `/retailer/subscriptions/signature-keys` | Get RSA public keys for verification | 10/sec | No |

### Process Status
| Method | Endpoint | Purpose | Rate Limit | Async |
|---|---|---|---|---|
| `GET` | `/shared/process-status/{processStatusId}` | Check async operation result | 100/sec | No |
| `POST` | `/shared/process-status` | Batch check multiple statuses | 2/sec | No |

### Economic Operators (EU DSA compliance)
| Method | Endpoint | Purpose | Rate Limit | Async |
|---|---|---|---|---|
| `POST` | `/retailer/economic-operator` | Create operator | 100/min | No |
| `GET` | `/retailer/economic-operators` | List all operators | 100/min | No |
| `GET` | `/retailer/economic-operator/{id}` | Get operator | 100/min | No |

### Key Constants
| Property | Value |
|---|---|
| Token TTL | 299 seconds (~5 minutes) |
| Token refresh at | 240 seconds (60s safety margin) |
| ProcessStatus retention | 24+ hours |
| Handled orders visibility | 48 hours |
| Shipment history | 3 months detailed, 2 years historical |
| Customer email retention | 61 days |
| Offer export cache | 15 minutes (same file returned) |
| Webhook timeout | 5 seconds (must acknowledge fast) |
| Webhook retries | 10 with exponential backoff |
| Max load carriers (pickup) | 20 |
| Max load carriers (self-delivery) | 66 |
| Max EANs per destination request | 50 |
| Return handling window | 90 days after shipping |

## APPENDIX D: SHOPIFY ADMIN API REST ENDPOINT REFERENCE

**Base URL**: `https://{shop}.myshopify.com/admin/api/2024-10`
**Auth Header**: `X-Shopify-Access-Token: {access_token}`
**API Version**: `2024-10` (stable)
**Rate Limit**: Leaky bucket — 40 requests max, 2 requests/second leak (Basic plan)

### Authentication (OAuth)
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `https://{shop}.myshopify.com/admin/oauth/authorize?client_id=...&scope=...&redirect_uri=...&state=...` | Redirect merchant to authorize |
| `POST` | `https://{shop}.myshopify.com/admin/oauth/access_token` | Exchange authorization code for permanent token |

### Shop
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/shop.json` | Get shop info (name, plan, currency, timezone) |

### Products
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/products.json?limit=250` | List products (paginated via Link header) |
| `GET` | `/products/{id}.json` | Get single product with variants |
| `POST` | `/products.json` | Create product with variants + metafields |
| `PUT` | `/products/{id}.json` | Update product |
| `DELETE` | `/products/{id}.json` | Delete product |
| `GET` | `/products/count.json` | Count products |

### Variants
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/products/{product_id}/variants.json` | List variants for product |
| `GET` | `/variants/{id}.json` | Get variant (includes barcode=EAN, sku, price) |
| `PUT` | `/variants/{id}.json` | Update variant (price, barcode, sku, inventory_policy) |

### Inventory
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/locations.json` | List warehouse locations |
| `GET` | `/locations/{id}.json` | Get single location |
| `GET` | `/inventory_levels.json?inventory_item_ids={ids}&location_ids={id}` | Get stock levels (max 50 items) |
| `POST` | `/inventory_levels/set.json` | Set absolute stock level: `{ location_id, inventory_item_id, available }` |
| `POST` | `/inventory_levels/adjust.json` | Adjust stock by delta: `{ location_id, inventory_item_id, available_adjustment }` |
| `POST` | `/inventory_levels/connect.json` | Connect item to location |
| `GET` | `/inventory_items.json?ids={ids}` | Get inventory items (cost, tracked, etc.) |
| `PUT` | `/inventory_items/{id}.json` | Update inventory item (cost, country_code_of_origin) |

### Orders
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/orders.json?status=any&fulfillment_status=unfulfilled&limit=50` | List unfulfilled orders |
| `GET` | `/orders/{id}.json` | Get order detail (line items, shipping, payment) |
| `GET` | `/orders/count.json` | Count orders |
| `PUT` | `/orders/{id}.json` | Update order (tags, note, email) |
| `POST` | `/orders/{id}/cancel.json` | Cancel order |
| `DELETE` | `/orders/{id}.json` | Delete order |

### Fulfillments
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/orders/{order_id}/fulfillment_orders.json` | Get fulfillment order IDs (needed before creating fulfillment) |
| `POST` | `/fulfillments.json` | Create fulfillment with tracking (line items + tracking_info + notify_customer) |
| `GET` | `/orders/{order_id}/fulfillments.json` | List fulfillments for order |
| `PUT` | `/fulfillments/{id}/update_tracking.json` | Update tracking info on existing fulfillment |
| `POST` | `/fulfillments/{id}/cancel.json` | Cancel fulfillment |

### Refunds
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/orders/{order_id}/refunds.json` | List refunds for order |
| `POST` | `/orders/{order_id}/refunds/calculate.json` | Calculate refund (preview amounts) |
| `POST` | `/orders/{order_id}/refunds.json` | Create refund (partial or full) |

### Webhooks
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/webhooks.json` | List registered webhooks |
| `GET` | `/webhooks/{id}.json` | Get webhook details |
| `POST` | `/webhooks.json` | Register webhook: `{ topic, address, format }` |
| `PUT` | `/webhooks/{id}.json` | Update webhook |
| `DELETE` | `/webhooks/{id}.json` | Delete webhook |
| `GET` | `/webhooks/count.json` | Count webhooks |

### Metafields
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/products/{id}/metafields.json` | List metafields for product |
| `POST` | `/products/{id}/metafields.json` | Create metafield: `{ namespace: "isyncso", key, value, type }` |
| `PUT` | `/metafields/{id}.json` | Update metafield value |
| `DELETE` | `/metafields/{id}.json` | Delete metafield |

### Key Headers
| Header | Purpose | Example |
|---|---|---|
| `X-Shopify-Access-Token` | Authentication | `shpat_xxxxx` |
| `X-Shopify-Shop-Api-Call-Limit` | Rate limit status (response) | `32/40` |
| `Retry-After` | Seconds to wait on 429 (response) | `2.0` |
| `X-Shopify-Hmac-Sha256` | Webhook HMAC signature (webhook) | `base64_encoded_hmac` |
| `X-Shopify-Topic` | Webhook event topic (webhook) | `orders/create` |
| `X-Shopify-Shop-Domain` | Source shop domain (webhook) | `my-store.myshopify.com` |
| `X-Shopify-API-Version` | API version used (webhook) | `2024-10` |

### Key Constants
| Property | Value |
|---|---|
| Token type | Permanent (no expiration, no refresh) |
| Rate limit (Basic) | 40 bucket / 2 per second leak |
| Rate limit (Shopify Plus) | 80 bucket / 4 per second leak |
| Products per page (max) | 250 |
| Inventory items per request (max) | 50 |
| Orders per page (max) | 250 |
| Webhook format | JSON |
| Webhook HMAC algorithm | HMAC-SHA256 with client secret |
| Webhook retry | Automatic (Shopify handles retries) |
| API version deprecation | ~12 months after release |
| Supported scopes (our app) | `read_products, write_products, read_inventory, write_inventory, read_orders, write_orders, read_fulfillments, write_fulfillments, read_shipping, write_shipping` |

### Webhook Topics Reference
| Topic | Fires when | Our handler action |
|---|---|---|
| `orders/create` | New order placed | Import to `sales_orders` |
| `orders/updated` | Order modified/payment captured | Update `sales_orders` status/payment |
| `orders/cancelled` | Order cancelled by merchant/customer | Cancel `sales_order`, restore inventory |
| `inventory_levels/update` | Stock changed (manual or external) | Update `shopify_product_mappings.shopify_stock_level` |
| `products/update` | Product edited in Shopify admin | Update mapping metadata (title, price) |
| `products/delete` | Product deleted from Shopify | Mark mapping `is_active = false` |
| `refunds/create` | Refund issued (partial or full) | Create `returns` record |
| `app/uninstalled` | Merchant removes our app | Mark credentials `disconnected`, disable sync |

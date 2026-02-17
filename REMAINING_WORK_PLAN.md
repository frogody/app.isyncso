# Remaining Work Plan — iSyncSO Blueprint

> Generated: 2026-02-11
> All implementation phases (0-5, EP, SH) are substantially complete.
> This document covers everything that still needs to be done.

---

## Overview

| Phase | Status | Remaining |
|-------|--------|-----------|
| Phase 0 — Database Foundation | **Complete** | — |
| Phase 1 — Purchasing Overhaul | **Complete** | QA validation only |
| Phase 2 — Receiving Enhancements | **Complete** | QA validation only |
| Phase 3 — Pallet Management | **Complete** | QA validation only |
| Phase 4 — bol.com Retailer API | **Complete** | QA validation only |
| Phase 5 — Returns Workflow | **Complete** | QA validation only |
| Phase EP — Email Pool Auto-Sync | **~92% Complete** | 1 optional feature + 3 tests |
| Phase SH — Shopify Admin API | **~88% Complete** | 2 UI features + 4 tests |
| Deployment — Edge Functions & Secrets | **Pending** | Deploy new functions, set secrets |
| Database — Migration Application | **Pending** | Apply Shopify migration to production |
| pg_cron — Scheduled Jobs | **Partial** | 2 Shopify jobs + 1 Email Pool job |

---

## PART 1: HIGH PRIORITY — Must Complete

### 1.1 Apply Shopify Database Migration

The migration file exists but hasn't been applied to production yet.

**File:** `supabase/migrations/20260213000000_shopify_integration.sql`

**Action:** Apply via one of:
```bash
# Option A: Push via CLI
SUPABASE_ACCESS_TOKEN="sbp_..." npx supabase db push --project-ref sfxpmzicgpaxfntqleig

# Option B: Git push to main (auto-deploys via GitHub integration)
git push origin main

# Option C: Management API
curl -s -X POST "https://api.supabase.com/v1/projects/sfxpmzicgpaxfntqleig/database/query" \
  -H "Authorization: Bearer sbp_..." \
  -H "Content-Type: application/json" \
  -d '{"query": "<contents of migration file>"}'
```

**Creates:**
- `shopify_credentials` table
- `shopify_product_mappings` table
- Columns on `sales_orders` (source, shopify_order_id, shopify_order_number)
- Column on `inventory` (quantity_external_shopify)
- Column on `products` (shopify_listed)
- Encryption helpers, RLS policies, indexes, RBAC permissions

---

### 1.2 Deploy Shopify Edge Functions

Two new edge functions need deployment:

```bash
# Deploy shopify-api
SUPABASE_ACCESS_TOKEN="sbp_..." npx supabase functions deploy shopify-api \
  --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt

# Deploy shopify-webhooks
SUPABASE_ACCESS_TOKEN="sbp_..." npx supabase functions deploy shopify-webhooks \
  --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

---

### 1.3 Set Shopify Edge Function Secrets

**Required secrets** (must be obtained from Shopify Partner Dashboard after creating a custom app):

```bash
SUPABASE_ACCESS_TOKEN="sbp_..." npx supabase secrets set \
  SHOPIFY_API_KEY="your-app-api-key" \
  SHOPIFY_API_SECRET="your-app-api-secret" \
  SHOPIFY_ENCRYPTION_KEY="a-strong-random-key-for-token-encryption" \
  --project-ref sfxpmzicgpaxfntqleig
```

| Secret | Source | Purpose |
|--------|--------|---------|
| `SHOPIFY_API_KEY` | Shopify Partner Dashboard → App → API credentials | OAuth client_id |
| `SHOPIFY_API_SECRET` | Shopify Partner Dashboard → App → API credentials | OAuth client_secret + HMAC verification |
| `SHOPIFY_ENCRYPTION_KEY` | Generate (e.g. `openssl rand -hex 32`) | Encrypt/decrypt access tokens in DB |

**Important:** After setting secrets, the edge functions must be redeployed to pick them up.

---

### 1.4 Push Frontend to Production

All frontend changes need to reach Vercel:

```bash
git add -A && git commit -m "feat: Shopify Admin API integration (SH-1 through SH-21)" && git push origin main
```

This auto-deploys to Vercel (frontend) and triggers Supabase migration (database).

---

## PART 2: REMAINING IMPLEMENTATION

### 2.1 SH-16: Shopify Product Mapper UI (HIGH PRIORITY)

**What:** When syncing Shopify products, some won't match by EAN or SKU. These "unmapped" products need a UI for manual resolution.

**Create:** `src/components/settings/ShopifyProductMapper.jsx`

**Design (from blueprint lines 2539-2542):**
- Side-by-side display: Shopify product info | Search local products
- Actions per unmapped product:
  - **"Map to product"** — manual link to existing local product
  - **"Create product"** — auto-create local product from Shopify data
  - **"Skip"** — ignore this product
- Accessible from ShopifySettings "Sync Products" flow
- Show after sync completes with unmapped results

**Integration:** Add to `ShopifySettings.jsx` — after `handleSyncProducts`, if `result.data.unmapped > 0`, show the mapper.

**Depends on:** Shopify migration applied + edge functions deployed

---

### 2.2 SH-18: Cross-Channel Stock Display (MEDIUM PRIORITY — Deferred)

**What:** On `ProductsPhysical.jsx`, show a stock breakdown row per product when listed on multiple channels.

**Display:**
```
Internal: 50 | bol.com FBB: 48 | Shopify: 47
```

**Data sources:**
- Internal: `inventory.quantity` (already shown)
- bol.com FBB: `inventory.quantity_external_bolcom` (already in schema)
- Shopify: `inventory.quantity_external_shopify` (added by Shopify migration)

**Where:** `ProductCard.jsx` — add a row below channel badges when product has 2+ channels.

**Priority:** Deferred — nice-to-have visibility, not blocking any workflow.

---

### 2.3 EP-11: Email Pool Error Notification (LOW PRIORITY — Optional)

**What:** Send in-app notification to the pool admin (`connected_by` user) when email extraction fails.

**Where:** The email processing pipeline in the edge function that handles email pool sync.

**Priority:** Optional monitoring feature. The system works without it — errors are logged and visible in the UI.

---

## PART 3: SCHEDULED JOBS (pg_cron)

Three cron jobs from the blueprint haven't been set up yet:

### 3.1 Shopify Order Backup Poll

**Job:** `shopify-order-backup-poll`
**Schedule:** Every 15 minutes
**Purpose:** Catch orders missed by webhooks

```sql
SELECT cron.schedule(
  'shopify-order-backup-poll',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/shopify-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action": "pollNewOrders"}'::jsonb
  );
  $$
);
```

**Note:** The `pollNewOrders` action in `shopify-api/index.ts` iterates all active `shopify_credentials` and fetches recent orders.

### 3.2 Shopify Inventory Sync

**Job:** `shopify-inventory-sync`
**Schedule:** Every 15 minutes
**Purpose:** Periodic inventory comparison between local and Shopify

```sql
SELECT cron.schedule(
  'shopify-inventory-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/shopify-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action": "batchInventoryUpdate"}'::jsonb
  );
  $$
);
```

### 3.3 Email Pool Health Check

**Job:** `email-pool-health-check`
**Schedule:** Every 10 minutes
**Purpose:** Check pool account connection health

**Note:** This depends on the email pool edge function having a health check action. Verify the function supports it before scheduling.

---

## PART 4: INTEGRATION TESTING

These tests require a live environment (Shopify test store, Gmail test account).

### 4.1 Shopify Integration Tests

| Test ID | Test | Steps | Expected Result |
|---------|------|-------|-----------------|
| SH-22 | Connect store + sync products | 1. Go to Settings → Shopify. 2. Enter test store domain. 3. Complete OAuth. 4. Click "Sync Products". | Credentials saved, webhooks registered, products matched by EAN, mappings created. |
| SH-23 | Push stock update | 1. Change inventory quantity in iSyncSO. 2. Verify Shopify admin shows updated stock. | `setInventoryLevel` API call succeeds, Shopify inventory matches. |
| SH-24 | Order webhook | 1. Place test order on Shopify store. 2. Check sales orders in iSyncSO. | Sales order created with source='shopify', line items mapped, inventory reserved. |
| SH-25 | Ship + fulfill | 1. Ship a Shopify order from iSyncSO. 2. Enter tracking number. 3. Check Shopify admin. | Fulfillment pushed to Shopify, customer notified, tracking visible. |

**Prerequisites:**
- Shopify test/development store created
- Shopify custom app created in Partner Dashboard
- SHOPIFY_API_KEY and SHOPIFY_API_SECRET set as edge function secrets
- Migration applied to production database

### 4.2 Email Pool Integration Tests

| Test ID | Test | Steps | Expected Result |
|---------|------|-------|-----------------|
| EP-14 | Gmail connection | 1. Connect test Gmail via Settings → Email Pool. 2. Send mock order confirmation to that Gmail. 3. Wait for sync cycle. | Purchase order auto-created from email extraction. |
| EP-15 | Duplicate detection | 1. Send same order confirmation email twice. 2. Wait for both to process. | Only one purchase created, second email skipped with dedup log. |
| EP-16 | Shipping update | 1. Send shipping notification email to pool. 2. Wait for processing. | Expected delivery tracking info updated on the corresponding purchase. |

---

## PART 5: QA VALIDATION CHECKLIST

All features below are implemented but their acceptance criteria haven't been formally validated. Run through each as a QA pass.

### Phase 1 — Purchasing

- [ ] User can add a purchase with 1-20 line items without uploading a PDF
- [ ] Each line item supports EAN, qty, price, URL, country, remarks
- [ ] Purchases can be grouped under a name/reference
- [ ] B2B/B2C channel can be set per purchase
- [ ] Expected deliveries are auto-created
- [ ] New EANs auto-create product records
- [ ] Expected deliveries created on both INSERT with status='approved' and UPDATE to status='approved'
- [ ] Purchases grouped visually by purchase moment
- [ ] Group-level summary (total items, total value, overall status)
- [ ] Filter and search across groups
- [ ] Every product shows its active sales channel(s)
- [ ] Products can be filtered by channel
- [ ] A product can have multiple channels simultaneously

### Phase 2 — Receiving

- [ ] User starts a session before scanning
- [ ] All scans in a session are grouped together
- [ ] Session summary shows totals and matched deliveries
- [ ] Session can be closed with a final summary
- [ ] Past sessions are viewable in history
- [ ] Designated users receive in-app notification when a session is closed
- [ ] Notification contains session summary details
- [ ] Export button available on session detail
- [ ] CSV export with all relevant fields

### Phase 3 — Pallet Management

- [ ] Create shipments with type (B2B/B2C)
- [ ] Add multiple pallets per shipment
- [ ] Scan or manually add products per pallet
- [ ] Running totals per EAN across all pallets
- [ ] Stock availability check per EAN
- [ ] Discrepancy warnings (packed > received or > purchased)
- [ ] Finalize shipment with locked state
- [ ] Side-by-side comparison: purchased vs received vs packed per EAN
- [ ] Automatic discrepancy detection with visual highlighting
- [ ] Verification sign-off by authorized user
- [ ] Unique pallet codes generated automatically
- [ ] Printable labels with barcode
- [ ] Toggle between manual count and scan-verify modes

### Phase 4 — bol.com

- [ ] Store encrypted client_id/client_secret
- [ ] Token auto-refresh with pg_cron
- [ ] All API actions routed correctly
- [ ] ProcessStatus polling works
- [ ] Rate limit handling (respect Retry-After)
- [ ] Connection test via Settings
- [ ] Request product destinations per EAN
- [ ] Create replenishment from finalized shipment
- [ ] Download label PDFs
- [ ] Pull FBB inventory from bol.com
- [ ] Compare with internal stock and show discrepancies
- [ ] Push stock updates to bol.com offers
- [ ] Webhook subscriptions active
- [ ] Process PROCESS_STATUS and SHIPMENT events
- [ ] Poll unhandled returns from bol.com
- [ ] Handle returns via API

### Phase 5 — Returns

- [ ] View all returns with status filtering
- [ ] Process returns: restock / dispose / inspect
- [ ] Inventory automatically updated on restock
- [ ] Return reason categorization and tracking

---

## PART 6: EXECUTION ORDER

```
Priority 1 (Deploy — blocking all Shopify testing):
  1. Commit + push all changes to main
  2. Apply migration (auto via GitHub integration)
  3. Deploy shopify-api + shopify-webhooks edge functions
  4. Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_ENCRYPTION_KEY secrets
  5. Redeploy edge functions after secrets are set

Priority 2 (Implementation):
  6. SH-16: Build ShopifyProductMapper UI
  7. Set up pg_cron jobs (3.1, 3.2, 3.3)

Priority 3 (Testing):
  8. SH-22 through SH-25: Shopify integration tests
  9. EP-14 through EP-16: Email Pool integration tests

Priority 4 (Polish):
  10. SH-18: Cross-channel stock display (deferred)
  11. EP-11: Email Pool error notification (optional)

Priority 5 (QA):
  12. Full QA pass through all acceptance criteria (Part 5)
```

---

## FILES SUMMARY

### Still Need to Create
| File | Task | Priority |
|------|------|----------|
| `src/components/settings/ShopifyProductMapper.jsx` | SH-16 | High |

### Already Created (This Session) — Need Deploy
| File | Purpose |
|------|---------|
| `supabase/migrations/20260213000000_shopify_integration.sql` | DB migration |
| `supabase/functions/shopify-api/index.ts` | 14-action API client |
| `supabase/functions/shopify-webhooks/index.ts` | HMAC-verified webhook handler |
| `src/lib/db/queries/shopify.ts` | Query layer |
| `src/components/settings/ShopifySettings.jsx` | Settings UI |
| `src/pages/ShopifyCallback.jsx` | OAuth callback page |

### Already Modified (This Session) — Need Deploy
| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Shopify interfaces |
| `src/lib/db/queries/index.ts` | Shopify export |
| `supabase/config.toml` | Function registration |
| `src/pages/Settings.jsx` | Shopify tab |
| `src/pages/index.jsx` | Callback route |
| `src/lib/services/inventory-service.ts` | Shopify service layer + auto-fulfill |
| `src/components/products/ProductCard.jsx` | Channel badges |
| `src/pages/ProductsPhysical.jsx` | Channel filter options |
| `BLUEPRINT_BUILD_PLAN.md` | SH tasks marked complete |
| `CLAUDE.md` | Phase status updated |

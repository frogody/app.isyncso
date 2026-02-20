# Finance Module Build Tracker

**Last Updated:** 2026-02-21
**Current Phase:** Phase 3 complete, starting Phase 4
**Overall Score:** ~7.0/10

---

## Completed Work (Pre-Plan)

| Item | Date | Commit | Notes |
|------|------|--------|-------|
| GL tables + COA migration applied | 2026-02-19 | prior session | `20260201_chart_of_accounts_general_ledger.sql` |
| Financial reports RPCs (7) applied | 2026-02-20 | prior session | `20260201_financial_reports.sql` |
| Vendors/Bills tables created | 2026-02-20 | b240c72 | With RLS policies |
| post_invoice fixed (AR=1100) | 2026-02-20 | b240c72 | Was using 1200 (Inventory) |
| post_expense mappings fixed | 2026-02-20 | b240c72 | Correct category-to-account codes |
| Invoice numbering fixed (LEGACY prefix) | 2026-02-20 | b240c72 | Old timestamp numbers prefixed |
| Entity wrappers registered | 2026-02-20 | ed73e19 | 10 bookkeeping entities in supabaseClient.js |

---

## Phase 1: Data Integrity (S)

**Goal:** Fix "two books" problem (SYNC vs GL) + separate platform billing invoices.

### 1A — SYNC getFinancialSummary → GL RPCs
- **Status:** DONE (code)
- **File:** `supabase/functions/sync/tools/finance.ts` (lines 389-451)
- **Action:** Replaced raw table queries with `get_profit_loss` RPC. Fallback to raw tables if COA not init.
- **Deploy:** SYNC edge function deploy BLOCKED (project INACTIVE — unpaid invoices)

### 1B — invoice_type column
- **Status:** DONE (code), DB MIGRATION PENDING
- **Migration:** `supabase/migrations/20260221000000_invoice_type_column.sql` created
- **Frontend:** `.eq('invoice_type', 'platform')` added to `useBilling.js`, `.eq('invoice_type', 'customer')` added to `FinanceInvoices.jsx`
- **BLOCKER:** Supabase project is INACTIVE (unpaid invoices). Migration cannot be applied until project is restored.

### Verification Checklist
- [ ] SYNC "show financial summary" matches Dashboard P&L — BLOCKED (project inactive)
- [ ] BillingSettings shows platform invoices only — BLOCKED (need DB migration)
- [ ] FinanceInvoices shows customer invoices only — BLOCKED (need DB migration)
- [ ] New invoices default to `invoice_type = 'customer'` — BLOCKED (need DB migration)
- [x] `npx vite build` passes

---

## Phase 2: Cash Flow Report + SYNC GL Actions (M)

### 2A — Cash Flow Report Page
- **Status:** DONE
- **File:** `src/pages/FinanceReportCashFlow.jsx` (NEW)
- **Changes:** Added to FinanceReports.jsx tabs (Wallet icon), registered in index.jsx (import, PAGES, Route)
- **Features:** Period selection, Operating/Investing/Financing sections, Net Change + Beginning/Ending Cash summary, CSV export, Print

### 2B — SYNC GL Actions
- **Status:** DONE (code), SYNC deploy BLOCKED (project inactive)
- **Actions added:** `create_vendor`, `create_bill`, `get_trial_balance`, `get_balance_sheet`
- **Files:** `finance.ts` (4 new functions + router cases), `index.ts` (FINANCE_ACTIONS array + system prompt examples)

---

## Phase 3: Invoice CRM Link + AR Aging Grouping (S)

### 3A — ContactSelector on Invoices
- **Status:** DONE
- **File:** `src/pages/FinanceInvoices.jsx`
- **Changes:** Import ContactSelector, add `contact_id` to formData, `handleContactSelect` auto-fills client_name/email
- **DB:** `contact_id UUID REFERENCES prospects(id)` column added to invoices

### 3B — AR Aging Per-Customer Grouping
- **Status:** DONE
- **DB:** Fixed `get_aged_receivables` (wrong column names: was using `i.notes`/`i.due_at`, now `i.client_name`/`i.due_date`). Created `get_aged_receivables_grouped` RPC.
- **File:** `src/pages/FinanceReportAging.jsx` — Added "Group by Customer" toggle, grouped expandable rows with individual invoice drill-down

### DB Migrations Applied (2026-02-21)
- `invoice_type` column added, index created
- `contact_id` column added to invoices
- `get_aged_receivables` fixed (correct column names + customer invoice filter)
- `get_aged_receivables_grouped` created
- SYNC deploy FAILED: "Max number of functions reached" — needs plan upgrade or function cleanup

---

## Phase 4: Architecture Foundation (M)

### 4A — React Query Setup
- **Status:** NOT STARTED

### 4B — Shared Finance Hooks
- **Status:** NOT STARTED

### 4C — Finance Error Boundaries
- **Status:** NOT STARTED

---

## Phase 5: Tax + Recurring + Credit Notes (L)

- **Status:** NOT STARTED

---

## Phase 6: Bank Reconciliation (L)

- **Status:** NOT STARTED

---

## Key References

| Key | Value |
|-----|-------|
| Supabase Project | sfxpmzicgpaxfntqleig |
| SYNC Deploy | `SUPABASE_ACCESS_TOKEN="sbp_..." npx supabase functions deploy sync --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt` |
| Management API | `POST https://api.supabase.com/v1/projects/sfxpmzicgpaxfntqleig/database/query` |
| COA Account Codes | 1000=Cash, 1100=AR, 1200=Inventory, 1500=Fixed Assets, 2000-2600=Liabilities, 3000-3200=Equity, 4000-4300=Revenue, 5000=COGS, 6000-6900=Expenses |

# Finance Module Build Tracker

**Last Updated:** 2026-02-22
**Current Phase:** Phase 5 complete, ready for Phase 6
**Overall Score:** ~8/10 (QuickBooks Essentials parity)

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

## Phase 1: Data Integrity (S) — DONE

**Goal:** Fix "two books" problem (SYNC vs GL) + separate platform billing invoices.

### 1A — SYNC getFinancialSummary → GL RPCs
- **Status:** DONE
- **File:** `supabase/functions/sync/tools/finance.ts` (lines 389-451)
- **Action:** Replaced raw table queries with `get_profit_loss` RPC. Fallback to raw tables if COA not init.
- **Deploy:** SYNC deployed 2026-02-22

### 1B — invoice_type column
- **Status:** DONE
- **Migration:** `supabase/migrations/20260221000000_invoice_type_column.sql` applied
- **Frontend:** `.eq('invoice_type', 'platform')` in `useBilling.js`, `.eq('invoice_type', 'customer')` in `FinanceInvoices.jsx`
- **Commit:** 0b0bf45

### Verification Checklist
- [x] `npx vite build` passes
- [x] DB migration applied (invoice_type column + index)
- [x] SYNC deployed with GL RPCs

---

## Phase 2: Cash Flow Report + SYNC GL Actions (M) — DONE

### 2A — Cash Flow Report Page
- **Status:** DONE
- **File:** `src/pages/FinanceReportCashFlow.jsx` (NEW)
- **Changes:** Added to FinanceReports.jsx tabs (Wallet icon), registered in index.jsx
- **Features:** Period selection, Operating/Investing/Financing sections, Net Change + Beginning/Ending Cash summary, CSV export, Print

### 2B — SYNC GL Actions
- **Status:** DONE (deployed 2026-02-22)
- **Actions added:** `create_vendor`, `create_bill`, `get_trial_balance`, `get_balance_sheet`
- **Files:** `finance.ts` (4 new functions + router cases), `index.ts` (FINANCE_ACTIONS array + system prompt examples)
- **Commit:** 8cf4a34

---

## Phase 3: Invoice CRM Link + AR Aging Grouping (S) — DONE

### 3A — ContactSelector on Invoices
- **Status:** DONE
- **File:** `src/pages/FinanceInvoices.jsx`
- **Changes:** Import ContactSelector, add `contact_id` to formData, `handleContactSelect` auto-fills client_name/email
- **DB:** `contact_id UUID REFERENCES prospects(id)` column added to invoices

### 3B — AR Aging Per-Customer Grouping
- **Status:** DONE
- **DB:** Fixed `get_aged_receivables` (correct column names). Created `get_aged_receivables_grouped` RPC.
- **File:** `src/pages/FinanceReportAging.jsx` — "Group by Customer" toggle, grouped expandable rows
- **Commit:** f003aa0

### DB Migrations Applied (2026-02-21)
- `invoice_type` column added, index created
- `contact_id` column added to invoices
- `get_aged_receivables` fixed (correct column names + customer invoice filter)
- `get_aged_receivables_grouped` created

---

## Phase 4: Architecture Foundation (M) — DONE

### 4A — React Query Setup
- **Status:** DONE
- **File:** `src/main.jsx`
- **Changes:** QueryClientProvider wrapping App, staleTime=30s, gcTime=5min, retry=1, refetchOnWindowFocus=false

### 4B — Shared Finance Hooks
- **Status:** DONE
- **Files:**
  - `src/hooks/useInvoices.js` — useInvoiceList, useCreateInvoice, useUpdateInvoice, useDeleteInvoice
  - `src/hooks/useExpenses.js` — useExpenseList, useCreateExpense, useUpdateExpense, useDeleteExpense
  - `src/hooks/useBills.js` — useBillList, useVendorList, useCreateBill, useUpdateBill, useDeleteBill, useRecordBillPayment
  - `src/hooks/useAccounts.js` — useAccountList, useCreateAccount, useUpdateAccount, useToggleAccountActive, useInitializeCOA

### 4C — Finance Error Boundaries
- **Status:** DONE
- **File:** `src/components/finance/FinanceErrorWrapper.jsx` (NEW)
- **Changes:** All 22 finance routes wrapped with FinanceErrorWrapper in `src/pages/index.jsx`
- **Features:** Retry button, Dashboard link, dev-mode error details

### Commit: d1ca0ec
### SYNC Deploy: Successful (2026-02-22) — pro plan restored

---

## Phase 5: Tax + Recurring + Credit Notes (L) — DONE

### 5A — Tax Management
- **Status:** DONE
- **Migration:** `supabase/migrations/20260222000000_tax_management.sql` applied
  - `tax_rates` table with RLS (name, rate, is_default, is_active)
  - `tax_periods` table with RLS (period tracking, status, totals)
  - Added `tax_rate_id` column to invoices and expenses
  - Added `tax_amount` column to expenses
  - `seed_default_tax_rates()` function (BTW 21%, 9%, 0%)
- **Page:** `src/pages/FinanceTaxRates.jsx` (NEW) — Two tabs: Tax Rates CRUD + Tax Periods CRUD, seed defaults button
- **Modified:** `src/pages/FinanceInvoices.jsx` — Dynamic tax rate dropdown from DB (fallback to hardcoded)
- **Modified:** `src/pages/FinanceExpenses.jsx` — Tax rate dropdown + tax_amount calculation on save

### 5B — Recurring Invoices
- **Status:** DONE
- **Migration:** `supabase/migrations/20260222000001_recurring_invoices.sql` applied
  - `recurring_invoices` table with RLS (template fields, frequency, next_generate_date, auto_send)
  - `generate_recurring_invoice()` RPC — creates invoice from template, calculates next date
- **Page:** `src/pages/FinanceRecurringInvoices.jsx` (NEW) — Template list, frequency badges, generate now, create/edit modal with items

### 5C — Credit Notes / Refunds
- **Status:** DONE
- **Migration:** `supabase/migrations/20260222000002_credit_notes.sql` applied
  - `credit_notes` table with RLS (status: draft/issued/applied/void)
  - `post_credit_note()` RPC — reverses invoice GL entry (Debit Revenue 4000, Debit Tax 2100 if applicable, Credit AR 1100)
- **Page:** `src/pages/FinanceCreditNotes.jsx` (NEW) — Create/issue/apply workflow, link to invoice, GL posting

### Routes
- All 3 pages registered in `src/pages/index.jsx` with `<FinanceErrorWrapper>` wrapping

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

## Commits Summary

| Phase | Commit | Description |
|-------|--------|-------------|
| P1 | 0b0bf45 | SYNC GL RPCs + invoice_type separation |
| P2 | 8cf4a34 | Cash Flow report page + SYNC GL actions |
| P3 | f003aa0 | CRM contact selector + AR aging customer grouping |
| P4 | d1ca0ec | React Query + shared hooks + error boundaries |
| P5 | TBD | Tax management + recurring invoices + credit notes |

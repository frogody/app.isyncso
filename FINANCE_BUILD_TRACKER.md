# Finance Module Build Tracker

**Last Updated:** 2026-02-20
**Current Phase:** Branded Invoice Customization complete
**Overall Score:** ~9/10 (QuickBooks Online+ with AI import + branded PDFs)

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

## Phase 6: Bank Reconciliation (L) — DONE

### 6A — Database Schema
- **Status:** DONE
- **Migration:** `supabase/migrations/20260223000000_bank_reconciliation.sql` applied
  - `bank_accounts` table with RLS (bank_name, account_name, IBAN, linked GL account)
  - `bank_transactions` table with RLS (amount, date, counterparty, match_status, import_batch_id)
  - `bank_reconciliations` table with RLS (statement_balance, book_balance, difference, status)
  - Fixed `journal_entries` source_type CHECK constraint (added `credit_note`, `bank_reconciliation`)
  - `auto_match_bank_transactions()` RPC — 3-tier matching: exact amount+date → amount±3 days → reference match
  - `complete_bank_reconciliation()` RPC — marks complete, updates bank account balance

### 6B — FinanceBankAccounts Page
- **Status:** DONE
- **Page:** `src/pages/FinanceBankAccounts.jsx` (NEW, 877 lines)
- **Features:** Bank account CRUD, GL cash account linking, CSV import with Dutch format support (semicolons, comma decimals, Dutch headers), preview before import, batch tracking

### 6C — FinanceBankReconciliation Page
- **Status:** DONE
- **Page:** `src/pages/FinanceBankReconciliation.jsx` (NEW, 1130 lines)
- **Features:** Split-screen matching UI (bank transactions left, GL entries right), auto-match button, manual click-to-pair matching, unmatch/exclude, reconciliation creation/completion workflow, summary bar with statement/book balance/difference

### Commit: 7cb4e31

---

## Phase 7: Smart Invoice Drop (L) — DONE

**Goal:** AI-powered "drop it and forget it" invoice import — extract, classify, match vendors, convert currency, detect recurring.

### 7A — Database Migration
- **Status:** DONE
- **Migration:** `supabase/migrations/20260220000000_smart_invoice_drop.sql` applied
  - `exchange_rates` table with RLS (ECB rate cache: currency_from, currency_to, rate, rate_date)
  - Added `original_amount`, `original_currency`, `exchange_rate`, `vendor_id` columns to `expenses`
  - Added `vat_number`, `website`, `iban` columns to `vendors`

### 7B — Edge Function: smart-import-invoice
- **Status:** DONE (deployed 2026-02-20)
- **File:** `supabase/functions/smart-import-invoice/index.ts` (NEW)
- **Features:**
  - Groq `llama-3.3-70b-versatile` LLM extraction (vendor, invoice, line items, classification, confidence)
  - Vendor matching: exact VAT → fuzzy name → create new
  - Tax classification: BTW 0/9/21%, reverse-charge detection for foreign invoices
  - ECB currency conversion: SDMX CSV API → daily XML fallback → exchange_rates cache
  - Recurring detection: frequency + next expected date calculation

### 7C — FinanceSmartImport Page
- **Status:** DONE
- **Page:** `src/pages/FinanceSmartImport.jsx` (NEW)
- **Features:**
  - Drag-and-drop zone (PDF, PNG, JPG)
  - Client-side PDF text extraction via pdf.js
  - Processing pipeline visualization (Uploading → Extracting → Analyzing → Done)
  - Review card with editable fields + confidence badges (green/yellow/red)
  - Vendor section with match indicator (new/matched by VAT/matched by name)
  - Invoice details, amounts, tax rate dropdown, category selector
  - Foreign currency section: original amount + ECB rate + EUR conversion
  - Reverse charge indicator
  - Line items table with editable rows
  - Recurring detection display with frequency selector
  - "Save & File" creates: expense + line items + GL entry + recurring template
  - File stored in `attachments` bucket

### Routes & Navigation
- Route registered in `src/pages/index.jsx` with `<FinanceErrorWrapper>`
- Sidebar navigation added in `src/pages/Layout.jsx` (Upload icon, "Smart Import")

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
| P5 | 1672b46 | Tax management + recurring invoices + credit notes |
| P6 | 7cb4e31 | Bank reconciliation — accounts, CSV import, split-screen matching |
| P7 | 3838507 | Smart Invoice Drop — AI extraction, ECB conversion, vendor matching |

---

## Phase 8: Branded Invoice Customization (M) — DONE

**Goal:** One-click branded invoice PDFs — pull brand assets from Create module, apply to PDF with logo, custom colors, company info, bank details, and 3 template styles.

### 8A — Database Migration
- **Status:** DONE
- **Migration:** `supabase/migrations/20260220100000_invoice_branding.sql`
  - Added `invoice_branding JSONB DEFAULT '{}'` column to `companies` table
  - Stores template, company details, bank info, logo preference, footer text

### 8B — Brand-Aware PDF Generator
- **Status:** DONE
- **File:** `src/utils/generateInvoicePDF.js` (rewritten ~640 lines)
- **Changes:**
  - Function signature: `async generateInvoicePDF(invoice, company, brandConfig)` (now async for logo fetch)
  - 3 template renderers: Modern (dark header + accent), Classic (white + colored line), Minimal (clean whitespace)
  - Logo embedding via `loadLogoAsBase64()` → `doc.addImage()` with in-memory cache
  - `hexToRgb()` converter for brand colors
  - Company FROM section with address, phone, email, VAT
  - Bank details footer (IBAN, BIC, bank name)
  - Payment terms section
  - Custom footer text
  - **Backward compatible** — null brandConfig renders original hardcoded layout

### 8C — InvoiceBrandingModal Component
- **Status:** DONE
- **File:** `src/components/finance/InvoiceBrandingModal.jsx` (NEW)
- **Features:**
  - Auto-fetches `BrandAssets` and existing `invoice_branding` on open
  - Template picker with mini visual previews (Modern/Classic/Minimal)
  - Logo selector from brand_assets logos (primary/secondary/icon)
  - Color swatches from brand assets with override option (native color picker)
  - Company details form (address, phone, email, VAT)
  - Bank & payment section (IBAN, BIC, bank name, payment terms, toggle)
  - Footer text customization
  - Saves to `companies.invoice_branding` JSONB via `updateCompany()`

### 8D — FinanceInvoices Integration
- **Status:** DONE
- **File:** `src/pages/FinanceInvoices.jsx`
- **Changes:**
  - Added "Customize Invoice" button (Palette icon) in PageHeader actions
  - `loadBrandConfig()` fetches brand assets + company branding on mount
  - Pre-loads logo as base64 for instant PDF generation
  - All 4 PDF call sites updated: dropdown View PDF, Download PDF, detail modal View/Download
  - `InvoiceBrandingModal` rendered with `onSave` callback to reload brand config

### Verification
- [x] `npx vite build` passes
- [x] Backward compatible — no brandConfig = original PDF layout

# Finance Module Implementation Plan

This plan transforms iSyncSO Finance into a competitive AI-powered bookkeeping solution. Each step is designed for autonomous execution using Claude Code for file and terminal operations, Claude in Chrome for browser-based testing, and Desktop Commander for any desktop interactions needed.

The workspace is located at `/Users/godyduinsbergen/app.isyncso`. All file paths in this document are relative to this root unless specified as absolute paths.

---

## Phase 1: Accounting Foundation

### Step 1.1: Create the Accounts Table Migration

Using Claude Code, create the file `supabase/migrations/20260116000001_create_accounts_table.sql` with this exact content:

```sql
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  subtype TEXT,
  parent_id UUID REFERENCES public.accounts(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE INDEX idx_accounts_company ON public.accounts(company_id);
CREATE INDEX idx_accounts_type ON public.accounts(type);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounts in their company" ON public.accounts
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "Users can manage accounts in their company" ON public.accounts
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());
```

After creating the file, run this command in the terminal:

```bash
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase db push --project-ref sfxpmzicgpaxfntqleig
```

Alternatively, execute the SQL directly via curl:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/sfxpmzicgpaxfntqleig/database/query" \
  -H "Authorization: Bearer sbp_b998952de7493074e84b50702e83f1db14be1479" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS public.accounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE, code TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')), subtype TEXT, parent_id UUID REFERENCES public.accounts(id), description TEXT, is_active BOOLEAN DEFAULT true, is_system BOOLEAN DEFAULT false, opening_balance DECIMAL(12,2) DEFAULT 0, currency TEXT DEFAULT 'USD', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(company_id, code));"}'
```

### Step 1.2: Create Journal Tables Migration

Create file `supabase/migrations/20260116000002_create_journal_tables.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  status TEXT DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'voided')),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  posted_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  UNIQUE(company_id, entry_number)
);

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  description TEXT,
  debit DECIMAL(12,2) DEFAULT 0,
  credit DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journal_entries_company ON public.journal_entries(company_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_lines_entry ON public.journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON public.journal_lines(account_id);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal entries in their company" ON public.journal_entries
  FOR SELECT TO authenticated USING (company_id = public.auth_company_id());

CREATE POLICY "Users can manage journal entries in their company" ON public.journal_entries
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "Users can view journal lines via entries" ON public.journal_lines
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.company_id = public.auth_company_id()));

CREATE POLICY "Users can manage journal lines via entries" ON public.journal_lines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.company_id = public.auth_company_id()));
```

Run the migration using the same method as Step 1.1.

### Step 1.3: Create Default Chart of Accounts Function

Create file `supabase/migrations/20260116000003_default_chart_of_accounts.sql`:

```sql
CREATE OR REPLACE FUNCTION public.create_default_chart_of_accounts(p_company_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.accounts (company_id, code, name, type, subtype, is_system) VALUES
    (p_company_id, '1000', 'Cash', 'asset', 'bank', true),
    (p_company_id, '1100', 'Accounts Receivable', 'asset', 'current', true),
    (p_company_id, '1200', 'Inventory', 'asset', 'current', true),
    (p_company_id, '1500', 'Fixed Assets', 'asset', 'fixed', true),
    (p_company_id, '2000', 'Accounts Payable', 'liability', 'current', true),
    (p_company_id, '2100', 'Credit Card', 'liability', 'current', true),
    (p_company_id, '2500', 'Loans Payable', 'liability', 'long_term', true),
    (p_company_id, '3000', 'Owner Equity', 'equity', null, true),
    (p_company_id, '3100', 'Retained Earnings', 'equity', null, true),
    (p_company_id, '4000', 'Sales Revenue', 'revenue', null, true),
    (p_company_id, '4100', 'Service Revenue', 'revenue', null, true),
    (p_company_id, '4900', 'Other Income', 'revenue', null, true),
    (p_company_id, '5000', 'Cost of Goods Sold', 'expense', null, true),
    (p_company_id, '6000', 'Salaries and Wages', 'expense', null, true),
    (p_company_id, '6100', 'Rent Expense', 'expense', null, true),
    (p_company_id, '6200', 'Utilities', 'expense', null, true),
    (p_company_id, '6300', 'Office Supplies', 'expense', null, true),
    (p_company_id, '6400', 'Professional Services', 'expense', null, true),
    (p_company_id, '6500', 'Marketing', 'expense', null, true),
    (p_company_id, '6900', 'Other Expenses', 'expense', null, true)
  ON CONFLICT (company_id, code) DO NOTHING;
END; $$;
```

### Step 1.4: Modify SYNC Finance Tools

Open `supabase/functions/sync/tools/finance.ts` using Claude Code. First read the current file to understand its structure, then add these new functions after the existing ones. The file exports functions like `createInvoice`, `listInvoices`, etc. Add the following at the end before any export statements:

```typescript
export async function listAccounts(
  ctx: ActionContext,
  data: { type?: string; active_only?: boolean }
): Promise<ActionResult> {
  let query = ctx.supabase
    .from('accounts')
    .select('*')
    .eq('company_id', ctx.companyId)
    .order('code');

  if (data.type) query = query.eq('type', data.type);
  if (data.active_only !== false) query = query.eq('is_active', true);

  const { data: accounts, error } = await query;
  if (error) return { success: false, message: `Failed to list accounts: ${error.message}` };

  return {
    success: true,
    message: `Found ${accounts.length} accounts in your chart of accounts.`,
    data: {
      assets: accounts.filter(a => a.type === 'asset'),
      liabilities: accounts.filter(a => a.type === 'liability'),
      equity: accounts.filter(a => a.type === 'equity'),
      revenue: accounts.filter(a => a.type === 'revenue'),
      expenses: accounts.filter(a => a.type === 'expense'),
    },
    navigateTo: '/finance/accounts'
  };
}

export async function getAccountBalance(
  ctx: ActionContext,
  data: { account_code?: string; account_name?: string }
): Promise<ActionResult> {
  const { data: account } = await ctx.supabase
    .from('accounts')
    .select('id, code, name, type, opening_balance')
    .eq('company_id', ctx.companyId)
    .or(`code.eq.${data.account_code},name.ilike.%${data.account_name}%`)
    .single();

  if (!account) return { success: false, message: 'Account not found.' };

  const { data: totals } = await ctx.supabase
    .from('journal_lines')
    .select('debit, credit')
    .eq('account_id', account.id);

  const totalDebits = totals?.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0) || 0;
  const totalCredits = totals?.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0) || 0;
  let balance = account.opening_balance || 0;
  balance += ['asset', 'expense'].includes(account.type) ? totalDebits - totalCredits : totalCredits - totalDebits;

  return {
    success: true,
    message: `${account.name} (${account.code}) balance: $${balance.toFixed(2)}`,
    data: { account, balance }
  };
}

export async function createJournalEntry(
  ctx: ActionContext,
  data: { date: string; description: string; lines: Array<{ account_code: string; debit?: number; credit?: number }> }
): Promise<ActionResult> {
  const totalDebits = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredits = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return { success: false, message: `Entry must balance. Debits: $${totalDebits}, Credits: $${totalCredits}` };
  }

  const { data: lastEntry } = await ctx.supabase
    .from('journal_entries')
    .select('entry_number')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const nextNumber = lastEntry ? `JE-${(parseInt(lastEntry.entry_number.split('-')[1] || '0') + 1).toString().padStart(5, '0')}` : 'JE-00001';

  const { data: accounts } = await ctx.supabase
    .from('accounts')
    .select('id, code')
    .eq('company_id', ctx.companyId)
    .in('code', data.lines.map(l => l.account_code));

  const accountMap = new Map(accounts?.map(a => [a.code, a.id]) || []);

  const { data: entry, error } = await ctx.supabase
    .from('journal_entries')
    .insert({ company_id: ctx.companyId, entry_number: nextNumber, entry_date: data.date, description: data.description, status: 'posted', posted_at: new Date().toISOString(), created_by: ctx.userId })
    .select()
    .single();

  if (error) return { success: false, message: `Failed: ${error.message}` };

  await ctx.supabase.from('journal_lines').insert(data.lines.map(l => ({
    journal_entry_id: entry.id,
    account_id: accountMap.get(l.account_code),
    debit: l.debit || 0,
    credit: l.credit || 0
  })));

  return { success: true, message: `Created ${nextNumber} for $${totalDebits.toFixed(2)}`, data: entry };
}

export async function getProfitLoss(
  ctx: ActionContext,
  data: { start_date?: string; end_date?: string; period?: string }
): Promise<ActionResult> {
  const today = new Date();
  let startDate = data.start_date || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  let endDate = data.end_date || today.toISOString().split('T')[0];

  if (data.period === 'last_month') {
    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
    endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
  } else if (data.period === 'this_year') {
    startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
  }

  const { data: report } = await ctx.supabase.rpc('get_profit_loss', { p_company_id: ctx.companyId, p_start_date: startDate, p_end_date: endDate });

  const revenue = report?.filter((r: any) => r.account_type === 'revenue') || [];
  const expenses = report?.filter((r: any) => r.account_type === 'expense') || [];
  const totalRevenue = revenue.reduce((s: number, r: any) => s + parseFloat(r.total), 0);
  const totalExpenses = expenses.reduce((s: number, r: any) => s + parseFloat(r.total), 0);

  return {
    success: true,
    message: `P&L ${startDate} to ${endDate}: Revenue $${totalRevenue.toFixed(2)}, Expenses $${totalExpenses.toFixed(2)}, Net $${(totalRevenue - totalExpenses).toFixed(2)}`,
    data: { revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses }
  };
}

export async function getBalanceSheet(
  ctx: ActionContext,
  data: { as_of_date?: string }
): Promise<ActionResult> {
  const asOfDate = data.as_of_date || new Date().toISOString().split('T')[0];
  const { data: report } = await ctx.supabase.rpc('get_balance_sheet', { p_company_id: ctx.companyId, p_as_of_date: asOfDate });

  const assets = report?.filter((r: any) => r.account_type === 'asset') || [];
  const liabilities = report?.filter((r: any) => r.account_type === 'liability') || [];
  const equity = report?.filter((r: any) => r.account_type === 'equity') || [];

  const totalAssets = assets.reduce((s: number, r: any) => s + parseFloat(r.balance), 0);
  const totalLiabilities = liabilities.reduce((s: number, r: any) => s + parseFloat(r.balance), 0);
  const totalEquity = equity.reduce((s: number, r: any) => s + parseFloat(r.balance), 0);

  return {
    success: true,
    message: `Balance Sheet as of ${asOfDate}: Assets $${totalAssets.toFixed(2)}, Liabilities $${totalLiabilities.toFixed(2)}, Equity $${totalEquity.toFixed(2)}`,
    data: { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity }
  };
}
```

Then find the `executeFinanceAction` function or the switch statement that routes actions, and add cases for these new actions: `list_accounts`, `get_account_balance`, `create_journal_entry`, `get_profit_loss`, `get_balance_sheet`.

### Step 1.5: Update SYNC System Prompt

Open `supabase/functions/sync/index.ts` and find the system prompt section where finance actions are documented. Add these examples after the existing finance action examples:

```
Accounting Actions:
- list_accounts: Show chart of accounts. [ACTION]{"action": "list_accounts", "data": {}}[/ACTION]
- get_account_balance: Get balance. [ACTION]{"action": "get_account_balance", "data": {"account_code": "1000"}}[/ACTION]
- create_journal_entry: Record transaction. [ACTION]{"action": "create_journal_entry", "data": {"date": "2026-01-15", "description": "Office supplies", "lines": [{"account_code": "6300", "debit": 150}, {"account_code": "1000", "credit": 150}]}}[/ACTION]
- get_profit_loss: P&L report. [ACTION]{"action": "get_profit_loss", "data": {"period": "this_month"}}[/ACTION]
- get_balance_sheet: Balance sheet. [ACTION]{"action": "get_balance_sheet", "data": {}}[/ACTION]
```

### Step 1.6: Create Report SQL Functions

Create file `supabase/migrations/20260116000004_report_functions.sql`:

```sql
CREATE OR REPLACE FUNCTION public.get_profit_loss(p_company_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (account_id UUID, account_code TEXT, account_name TEXT, account_type TEXT, total DECIMAL(12,2))
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.code, a.name, a.type,
    COALESCE(CASE WHEN a.type = 'revenue' THEN SUM(jl.credit) - SUM(jl.debit) WHEN a.type = 'expense' THEN SUM(jl.debit) - SUM(jl.credit) ELSE 0 END, 0)::DECIMAL(12,2)
  FROM accounts a
  LEFT JOIN journal_lines jl ON jl.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.entry_date BETWEEN p_start_date AND p_end_date AND je.status = 'posted'
  WHERE a.company_id = p_company_id AND a.type IN ('revenue', 'expense') AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type
  HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
  ORDER BY a.code;
END; $$;

CREATE OR REPLACE FUNCTION public.get_balance_sheet(p_company_id UUID, p_as_of_date DATE)
RETURNS TABLE (account_id UUID, account_code TEXT, account_name TEXT, account_type TEXT, balance DECIMAL(12,2))
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.code, a.name, a.type,
    (a.opening_balance + COALESCE(CASE WHEN a.type = 'asset' THEN SUM(jl.debit) - SUM(jl.credit) ELSE SUM(jl.credit) - SUM(jl.debit) END, 0))::DECIMAL(12,2)
  FROM accounts a
  LEFT JOIN journal_lines jl ON jl.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.entry_date <= p_as_of_date AND je.status = 'posted'
  WHERE a.company_id = p_company_id AND a.type IN ('asset', 'liability', 'equity') AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type, a.opening_balance
  ORDER BY a.code;
END; $$;
```

### Step 1.7: Create Chart of Accounts Page

Create file `src/pages/ChartOfAccounts.jsx` with a React component that fetches accounts from Supabase and displays them grouped by type (Assets, Liabilities, Equity, Revenue, Expenses). Use the existing UI patterns from `src/pages/Finance.jsx` for consistency. Include expand/collapse sections for each type, account codes, names, and opening balances.

### Step 1.8: Add Route

Open `src/App.jsx` and add the import and route:

```jsx
import ChartOfAccounts from '@/pages/ChartOfAccounts';
// Add inside Routes:
<Route path="/finance/accounts" element={<ChartOfAccounts />} />
```

### Step 1.9: Add Navigation Link

Open the navigation component (find by searching for "Finance" in `src/components/Layout.jsx` or similar) and add a link to Chart of Accounts under the Finance section with permission `finance.view`.

### Step 1.10: Deploy SYNC Function

Run in terminal:

```bash
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase functions deploy sync --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

### Step 1.11: Browser Verification

Using Claude in Chrome, navigate to `https://app.isyncso.com`, log in, and test:

1. Open SYNC chat and ask "show me my chart of accounts"
2. Verify SYNC returns a list of accounts or creates default accounts
3. Ask "what's the balance in my cash account"
4. Ask "create a journal entry for $100 rent expense paid from cash"
5. Verify the entry is created with debit to 6100 and credit to 1000

---

## Phase 2: Financial Reports

### Step 2.1: Update FinanceReports Page

Open `src/pages/FinanceReports.jsx` and enhance it to include two report tabs: Profit & Loss and Balance Sheet. Each tab should have date range selectors and display the report data by calling the Supabase RPC functions `get_profit_loss` and `get_balance_sheet`. Use the existing date picker patterns from the codebase.

### Step 2.2: Browser Verification

Using Claude in Chrome, navigate to `https://app.isyncso.com/financereports` and verify both reports render correctly. Also test SYNC with "show me my P&L this month" and "show me the balance sheet".

---

## Phase 3: Payment Collection

### Step 3.1: Add Invoice Payment Fields

Create migration `supabase/migrations/20260116000005_invoice_payments.sql`:

```sql
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
```

### Step 3.2: Create Payment Link Edge Function

Create file `supabase/functions/create-payment-link/index.ts` that accepts an invoice_id, fetches the invoice and items, creates a Stripe payment link using the Stripe SDK, updates the invoice with the payment link URL, and returns it. Reference the existing edge function patterns in `supabase/functions/send-invoice-email/index.ts`.

### Step 3.3: Create Stripe Webhook Handler

Create file `supabase/functions/stripe-webhooks/index.ts` to handle `checkout.session.completed` events. When payment completes, update the invoice status to 'paid', set `paid_at` timestamp, and create a journal entry debiting Cash (1000) and crediting Accounts Receivable (1100).

### Step 3.4: Configure Secrets

Run these commands to set Stripe secrets (replace with actual keys):

```bash
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase secrets set STRIPE_SECRET_KEY="sk_live_xxx" --project-ref sfxpmzicgpaxfntqleig
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_xxx" --project-ref sfxpmzicgpaxfntqleig
```

### Step 3.5: Update Config and Deploy

Add to `supabase/config.toml`:

```toml
[functions.create-payment-link]
verify_jwt = false

[functions.stripe-webhooks]
verify_jwt = false
```

Deploy the functions:

```bash
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase functions deploy create-payment-link --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase functions deploy stripe-webhooks --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

---

## Phase 4: Bank Integration

### Step 4.1: Create Bank Tables

Create migration `supabase/migrations/20260116000006_bank_integration.sql` with tables for `bank_connections` (stores Plaid access tokens), `bank_accounts` (individual accounts linked to chart of accounts), and `bank_transactions` (imported transactions with AI categorization fields).

### Step 4.2: Create Plaid Edge Functions

Create `supabase/functions/plaid-link/index.ts` for initiating Plaid Link and exchanging tokens, and `supabase/functions/plaid-sync/index.ts` for syncing transactions. Use the Plaid Node SDK patterns.

### Step 4.3: Create Bank Reconciliation Page

Create `src/pages/BankReconciliation.jsx` with a split-view interface: unreconciled bank transactions on the left, journal entries on the right. Allow matching transactions to entries or creating new entries from transactions.

### Step 4.4: AI Transaction Categorization

Extend the plaid-sync function to call the Together.ai API with the transaction descriptions and chart of accounts, asking it to suggest the appropriate expense/revenue account for each transaction. Store the suggested account ID and confidence score.

---

## Phase 5: Intelligence Features

### Step 5.1: Cash Flow Forecast

Create `supabase/functions/forecast-cash-flow/index.ts` that calculates current cash balance, projects inflows from unpaid invoices by due date, estimates outflows from historical patterns, and returns a 30-day daily forecast with warning flags for potential negative balances.

### Step 5.2: Add SYNC Proactive Insights

Update the SYNC system prompt to include proactive checks when users ask about finances. SYNC should query for overdue invoices, unreconciled transactions, and cash flow issues, mentioning them when relevant.

### Step 5.3: Add SYNC Actions

Add actions `forecast_cash_flow` and `get_overdue_invoices` to the finance tools, enabling natural language queries like "what does my cash flow look like" and "do I have any overdue invoices".

---

## Verification Protocol

After completing each phase, verify using Claude in Chrome:

Phase 1: Navigate to the app, open SYNC, and test "show me my accounts", "create a journal entry for $500 consulting income to cash", and verify the entry appears correctly.

Phase 2: Test "show me my P&L this month" and verify revenue/expense breakdown appears.

Phase 3: Create a test invoice, generate a payment link, and verify the link works in a new browser tab.

Phase 4: Connect a test bank account (use Plaid sandbox credentials) and verify transactions import and categorization works.

Phase 5: Test "what's my cash flow forecast" and verify projections appear.

---

## File Summary

Files to create:
- `supabase/migrations/20260116000001_create_accounts_table.sql`
- `supabase/migrations/20260116000002_create_journal_tables.sql`
- `supabase/migrations/20260116000003_default_chart_of_accounts.sql`
- `supabase/migrations/20260116000004_report_functions.sql`
- `supabase/migrations/20260116000005_invoice_payments.sql`
- `supabase/migrations/20260116000006_bank_integration.sql`
- `supabase/functions/create-payment-link/index.ts`
- `supabase/functions/stripe-webhooks/index.ts`
- `supabase/functions/plaid-link/index.ts`
- `supabase/functions/plaid-sync/index.ts`
- `supabase/functions/forecast-cash-flow/index.ts`
- `src/pages/ChartOfAccounts.jsx`
- `src/pages/BankReconciliation.jsx`

Files to modify:
- `supabase/functions/sync/tools/finance.ts` - Add new accounting actions
- `supabase/functions/sync/index.ts` - Update system prompt with new action examples
- `supabase/config.toml` - Add new function configurations
- `src/App.jsx` - Add new routes
- `src/components/Layout.jsx` - Add navigation links
- `src/pages/FinanceReports.jsx` - Add P&L and Balance Sheet tabs

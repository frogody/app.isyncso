# iSyncSO Finance - Current State Audit

## Executive Summary

iSyncSO Finance is currently a lightweight invoicing and expense management module with strong AI-powered invoice extraction. While it has foundational components, it lacks core accounting functionality that would make it competitive with market leaders.

---

## Architecture Overview

```
Frontend (React/Vite)
├── src/pages/
│   ├── Finance.jsx              # Main dashboard
│   ├── FinanceReports.jsx       # Basic reporting
│   ├── InventoryExpenses.jsx    # Expense management + AI processing
│   └── FinanceSettings.jsx      # Configuration
│
├── src/components/finance/
│   ├── InvoiceForm.jsx          # Invoice creation
│   ├── ProposalForm.jsx         # Proposal creation
│   ├── ExpenseForm.jsx          # Expense entry
│   └── FinancialSummary.jsx     # Dashboard widgets

Backend (Supabase)
├── supabase/functions/
│   ├── sync/tools/finance.ts    # 8 SYNC agent actions
│   ├── process-invoice/         # AI invoice extraction
│   ├── send-invoice-email/      # Email invoices via Resend
│   └── send-proposal-email/     # Email proposals via Resend
│
└── Database Tables (~10)
    ├── invoices
    ├── invoice_items
    ├── proposals
    ├── proposal_items
    ├── expenses
    ├── expense_line_items
    ├── stock_purchases
    ├── suppliers
    ├── customers
    └── email_accounts/messages
```

---

## SYNC Agent Finance Actions

The SYNC agent (`sync/tools/finance.ts`) provides 8 natural language actions:

| Action | Function | Description |
|--------|----------|-------------|
| `create_proposal` | `createProposal()` | Creates proposal with line items |
| `create_invoice` | `createInvoice()` | Creates invoice with line items |
| `list_invoices` | `listInvoices()` | Lists invoices with filters (status, client, date) |
| `update_invoice` | `updateInvoice()` | Updates invoice status |
| `create_expense` | `createExpense()` | Creates expense entry |
| `list_expenses` | `listExpenses()` | Lists expenses with filters |
| `get_financial_summary` | `getFinancialSummary()` | Calculates revenue/expense totals |
| `convert_proposal_to_invoice` | `convertProposalToInvoice()` | Converts accepted proposal |

### Example SYNC Commands

```
User: "Create an invoice for Acme Corp for $5000 consulting services"
SYNC: [ACTION]{"action": "create_invoice", "data": {
  "client_name": "Acme Corp",
  "items": [{"description": "Consulting services", "amount": 5000}]
}}[/ACTION]

User: "Show me unpaid invoices over $1000"
SYNC: [ACTION]{"action": "list_invoices", "data": {
  "status": "unpaid",
  "min_amount": 1000
}}[/ACTION]

User: "What's my revenue this month?"
SYNC: [ACTION]{"action": "get_financial_summary", "data": {
  "period": "this_month"
}}[/ACTION]
```

---

## Edge Functions Detail

### 1. process-invoice (AI Invoice Extraction)

**Location:** `supabase/functions/process-invoice/index.ts`

**Purpose:** Extracts structured data from uploaded invoice PDFs using AI.

**Tech Stack:**
- Primary: Groq LLM (`llama-3.3-70b-versatile`) for text extraction
- Fallback: Google Gemini for image-based extraction
- PDF text sent from client-side (pdf.js)

**Flow:**
```
1. Client uploads PDF → extracts text via pdf.js
2. Sends pdfText + metadata to edge function
3. Groq LLM extracts: supplier, date, items, totals, tax
4. Creates expense record with status 'pending'
5. Creates expense_line_items for each line
```

**Output Schema:**
```typescript
{
  supplier_name: string,
  invoice_number: string,
  invoice_date: string,
  due_date: string,
  subtotal: number,
  tax_amount: number,
  total_amount: number,
  currency: string,
  line_items: [{
    description: string,
    quantity: number,
    unit_price: number,
    total: number
  }]
}
```

**Status:** ✅ Working in production

---

### 2. send-invoice-email

**Location:** `supabase/functions/send-invoice-email/index.ts`

**Purpose:** Emails invoices to customers via Resend.

**Tech Stack:** Resend API

**Flow:**
```
1. Receives invoice_id
2. Fetches invoice + items from database
3. Generates HTML email with invoice details
4. Sends via Resend
5. Updates invoice with sent_at timestamp
```

**Status:** ✅ Working

---

### 3. send-proposal-email

**Location:** `supabase/functions/send-proposal-email/index.ts`

**Purpose:** Emails proposals to prospects via Resend.

**Tech Stack:** Resend API

**Flow:** Same as invoice email but for proposals

**Status:** ✅ Working

---

## Database Schema

### Core Tables

#### invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  invoice_number TEXT,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  issue_date DATE,
  due_date DATE,
  subtotal DECIMAL(12,2),
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  terms TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);
```

#### invoice_items
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2),
  amount DECIMAL(12,2),
  sort_order INT
);
```

#### proposals
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  proposal_number TEXT,
  status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected
  title TEXT,
  description TEXT,
  valid_until DATE,
  subtotal DECIMAL(12,2),
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### expenses
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  supplier_id UUID REFERENCES suppliers(id),
  category TEXT,
  expense_date DATE,
  description TEXT,
  amount DECIMAL(12,2),
  tax_amount DECIMAL(12,2),
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, paid
  payment_method TEXT,
  reference_number TEXT,
  receipt_url TEXT,
  notes TEXT,
  ai_extracted BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### expense_line_items
```sql
CREATE TABLE expense_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  description TEXT,
  quantity DECIMAL(10,2),
  unit_price DECIMAL(12,2),
  total DECIMAL(12,2),
  category TEXT
);
```

### Supporting Tables

#### customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB,
  tax_id TEXT,
  payment_terms INT DEFAULT 30,
  notes TEXT
);
```

#### suppliers
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB,
  tax_id TEXT,
  payment_terms INT,
  category TEXT,
  notes TEXT
);
```

### Related Tables (from other modules)

#### products (from Inventory module)
```sql
-- Used for invoice item suggestions
CREATE TABLE products (
  id UUID,
  company_id UUID,
  name TEXT,
  sku TEXT,
  price DECIMAL(12,2),
  cost DECIMAL(12,2),
  stock_quantity INT,
  ...
);
```

#### stock_purchases (from Inventory module)
```sql
-- Linked to expenses for inventory purchases
CREATE TABLE stock_purchases (
  id UUID,
  company_id UUID,
  supplier_id UUID,
  product_id UUID,
  quantity INT,
  unit_cost DECIMAL(12,2),
  total_cost DECIMAL(12,2),
  expense_id UUID REFERENCES expenses(id),
  ...
);
```

---

## Frontend Components

### Finance.jsx (Main Dashboard)

**Features:**
- Invoice list with status badges
- Create invoice button
- Quick stats (total revenue, outstanding, overdue)
- Recent activity feed

**Missing:**
- No P&L view
- No balance sheet
- No cash flow
- No bank integration

### InventoryExpenses.jsx (Expense Management)

**Features:**
- Expense list with filters
- Manual expense entry
- **AI invoice processing** (PDF upload → auto-extract)
- Supplier management

**AI Features:**
- PDF text extraction (client-side pdf.js)
- LLM-powered data extraction (Groq)
- Auto-creates expense + line items
- Confidence scoring

### FinanceReports.jsx

**Features:**
- Basic revenue/expense summary
- Date range filtering
- Simple charts

**Missing:**
- No P&L statement
- No balance sheet
- No cash flow statement
- No aged receivables
- No exportable reports

---

## Integration Points

### Currently Integrated

| System | Integration | Purpose |
|--------|-------------|---------|
| SYNC Agent | Native | Natural language finance commands |
| Resend | API | Invoice/proposal emails |
| Groq | API | Invoice AI extraction |
| Products | Database | Invoice item suggestions |
| Customers | Database | Invoice recipients |
| Suppliers | Database | Expense payees |

### Not Integrated

| System | Status | Impact |
|--------|--------|--------|
| Bank feeds | ❌ Missing | No auto-reconciliation |
| Payment processors | ❌ Missing | Can't collect payments |
| Tax engines | ❌ Missing | No tax compliance |
| Payroll | ❌ Missing | No salary tracking |

---

## RBAC Permissions

Finance module uses the following permissions:

```
finance.view     - View finance data
finance.create   - Create invoices/expenses
finance.edit     - Edit financial records
finance.delete   - Delete financial records
finance.manage   - Full finance admin
finance.export   - Export financial data
```

---

## Current Limitations

### 1. No Accounting Foundation
- ❌ No chart of accounts
- ❌ No journal entries
- ❌ No double-entry ledger
- ❌ No trial balance

### 2. No Bank Integration
- ❌ No bank connections
- ❌ No auto-import transactions
- ❌ No reconciliation

### 3. Limited Reporting
- ❌ No P&L statement
- ❌ No balance sheet
- ❌ No cash flow statement
- ❌ No aged receivables/payables
- ❌ No exportable reports

### 4. No Payment Collection
- ❌ Can't accept online payments
- ❌ No Stripe/PayPal integration
- ❌ No payment reminders automation

### 5. No Recurring Transactions
- ❌ No recurring invoices
- ❌ No recurring expenses
- ❌ No subscription billing

### 6. No Multi-Currency
- ❌ Single currency only
- ❌ No exchange rate handling

---

## Existing Strengths

### 1. SYNC Agent Integration
- ✅ Natural language finance commands
- ✅ 8 actions already implemented
- ✅ Contextual suggestions
- ✅ Can be extended easily

### 2. AI Invoice Processing
- ✅ PDF text extraction
- ✅ LLM-powered data extraction
- ✅ Automatic expense creation
- ✅ Line item parsing

### 3. Proposal → Invoice Workflow
- ✅ Full proposal lifecycle
- ✅ One-click conversion
- ✅ Email delivery

### 4. Solid Database Schema
- ✅ Well-structured tables
- ✅ Proper relationships
- ✅ RLS policies in place
- ✅ Company isolation

### 5. Unlimited Users
- ✅ No per-user pricing model
- ✅ Team collaboration built-in

---

## Technical Debt

1. **No tests** for finance edge functions
2. **Missing TypeScript types** in some components
3. **No error boundaries** in finance pages
4. **Inconsistent date handling** (some use ISO, some use locale)
5. **No audit trail** for financial changes

---

## Summary: Current vs Needed

| Capability | Current State | Needed for Competitive |
|------------|---------------|------------------------|
| Invoicing | ✅ Basic | ✅ Good |
| Proposals | ✅ Basic | ✅ Good |
| Expenses | ✅ AI-powered | ✅ Excellent |
| Accounting | ❌ None | ⚠️ Critical gap |
| Bank feeds | ❌ None | ⚠️ Critical gap |
| Reporting | ⚠️ Minimal | ⚠️ Major gap |
| Payments | ❌ None | ⚠️ Major gap |
| Tax | ❌ None | ⚠️ Moderate gap |
| Multi-currency | ❌ None | ⚠️ Moderate gap |

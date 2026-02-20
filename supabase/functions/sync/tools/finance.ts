/**
 * Finance Tool Functions for SYNC
 *
 * Actions:
 * - create_proposal
 * - create_invoice
 * - list_invoices
 * - update_invoice
 * - create_expense
 * - list_expenses
 * - get_financial_summary
 * - convert_proposal_to_invoice
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import {
  ActionResult,
  ActionContext,
  ProposalData,
  InvoiceData,
  InvoiceFilters,
  ExpenseData,
  ExpenseFilters,
} from './types.ts';
import {
  calculateLineItems,
  calculateTax,
  generateDocNumber,
  formatCurrency,
  formatDate,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// Default user ID for system-created records
const DEFAULT_USER_ID = 'de19d0ae-f414-4af8-b05e-556db650010b';

// ============================================================================
// Create Proposal
// ============================================================================

export async function createProposal(
  ctx: ActionContext,
  data: ProposalData
): Promise<ActionResult> {
  try {
    const { lineItems, subtotal, lookups } = await calculateLineItems(ctx.supabase, data.items);

    if (lineItems.length === 0) {
      return errorResult(
        'No items with valid prices. Please check product names match your inventory.',
        'No valid items'
      );
    }

    const taxPercent = data.tax_percent ?? 21;
    const { taxAmount, total } = calculateTax(subtotal, taxPercent);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const status = data.status || 'draft';
    const proposalRecord = {
      company_id: ctx.companyId,
      proposal_number: generateDocNumber('PROP'),
      title: data.title || `Proposal for ${data.client_name}`,
      status,
      client_name: data.client_name,
      client_email: data.client_email || null,
      client_company: data.client_company || null,
      client_address: {},
      introduction: data.notes || '',
      sections: [],
      line_items: lineItems,
      subtotal,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      total,
      currency: 'EUR',
      valid_until: validUntil.toISOString(),
      branding: {},
      signature_required: false,
    };

    const { data: proposal, error } = await ctx.supabase
      .from('proposals')
      .insert(proposalRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create proposal: ${error.message}`, error.message);
    }

    const titleLine = proposal.title ? `**${proposal.title}**\n` : '';
    const statusText = proposal.status === 'sent' ? 'Sent ✉️' : 'Draft';
    const followUp = proposal.status === 'sent'
      ? `\n\n✅ Proposal sent to ${proposal.client_email || 'the client'}!`
      : `\n\nWant me to send this to ${proposal.client_email || 'the client'}?`;
    return successResult(
      `✅ Proposal created successfully!\n\n${titleLine}- Client: ${proposal.client_name}\n- Total: ${formatCurrency(proposal.total)} (incl. BTW)\n- Status: ${statusText}\n- Valid until: ${formatDate(proposal.valid_until)}${followUp}`,
      proposal,
      '/financeproposals'
    );
  } catch (err) {
    return errorResult(`Exception creating proposal: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create Invoice
// ============================================================================

export async function createInvoice(
  ctx: ActionContext,
  data: InvoiceData
): Promise<ActionResult> {
  try {
    const { lineItems, subtotal, lookups } = await calculateLineItems(ctx.supabase, data.items);

    if (lineItems.length === 0) {
      return errorResult(
        'No items with valid prices. Please check product names match your inventory.',
        'No valid items'
      );
    }

    const taxPercent = data.tax_percent ?? 21;
    const { taxAmount, total } = calculateTax(subtotal, taxPercent);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (data.due_days || 30));

    const invoiceRecord = {
      company_id: ctx.companyId,
      user_id: ctx.userId || DEFAULT_USER_ID,
      invoice_number: generateDocNumber('INV'),
      status: 'draft',
      client_name: data.client_name,
      client_email: data.client_email || null,
      client_address: {},
      items: lineItems,
      total,
      due_date: dueDate.toISOString().split('T')[0],
      description: `Invoice for ${data.client_name}`,
      notes: `Subtotal: ${formatCurrency(subtotal)}\nBTW (${taxPercent}%): ${formatCurrency(taxAmount)}\nTotal: ${formatCurrency(total)}`,
    };

    const { data: invoice, error } = await ctx.supabase
      .from('invoices')
      .insert(invoiceRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create invoice: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Invoice created successfully!\n\n**${invoice.invoice_number}**\n- Client: ${invoice.client_name}\n- Total: ${formatCurrency(invoice.total)} (incl. BTW)\n- Due: ${formatDate(invoice.due_date)}\n- Status: Draft`,
      invoice,
      '/financeinvoices'
    );
  } catch (err) {
    return errorResult(`Exception creating invoice: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Invoices
// ============================================================================

export async function listInvoices(
  ctx: ActionContext,
  filters: InvoiceFilters = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('invoices')
      .select('id, invoice_number, client_name, client_email, total, status, due_date, created_at')
      .eq('company_id', ctx.companyId)
      .order('created_at', { ascending: false })
      .limit(filters.limit || 20);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.client) {
      query = query.ilike('client_name', `%${filters.client}%`);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data: invoices, error } = await query;

    if (error) {
      return errorResult(`Failed to list invoices: ${error.message}`, error.message);
    }

    if (!invoices || invoices.length === 0) {
      return successResult('No invoices found matching your criteria.', []);
    }

    // Brief summary only
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const unpaid = invoices.filter(inv => inv.status !== 'paid').length;
    const unpaidNote = unpaid > 0 ? ` ${unpaid} unpaid.` : '';

    return successResult(
      `${invoices.length} invoices. ${formatCurrency(totalAmount)} total.${unpaidNote}`,
      invoices,
      '/financeinvoices'
    );
  } catch (err) {
    return errorResult(`Exception listing invoices: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Update Invoice
// ============================================================================

export async function updateInvoice(
  ctx: ActionContext,
  data: { id?: string; invoice_number?: string; status: string }
): Promise<ActionResult> {
  try {
    // Find invoice by ID or number
    let query = ctx.supabase
      .from('invoices')
      .select('id, invoice_number, client_name, status')
      .eq('company_id', ctx.companyId);

    if (data.id) {
      query = query.eq('id', data.id);
    } else if (data.invoice_number) {
      query = query.eq('invoice_number', data.invoice_number);
    } else {
      return errorResult('Please provide an invoice ID or number', 'Missing identifier');
    }

    const { data: existing, error: findError } = await query.single();

    if (findError || !existing) {
      return errorResult('Invoice not found', 'Not found');
    }

    // Update the invoice
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(data.status)) {
      return errorResult(
        `Invalid status. Use one of: ${validStatuses.join(', ')}`,
        'Invalid status'
      );
    }

    const { data: updated, error: updateError } = await ctx.supabase
      .from('invoices')
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      return errorResult(`Failed to update invoice: ${updateError.message}`, updateError.message);
    }

    return successResult(
      `✅ Invoice updated!\n\n**${updated.invoice_number}**\n- Client: ${updated.client_name}\n- Status: ${existing.status} → **${updated.status}**`,
      updated,
      '/financeinvoices'
    );
  } catch (err) {
    return errorResult(`Exception updating invoice: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create Expense
// ============================================================================

export async function createExpense(
  ctx: ActionContext,
  data: ExpenseData
): Promise<ActionResult> {
  try {
    const expenseRecord = {
      company_id: ctx.companyId,
      user_id: ctx.userId || DEFAULT_USER_ID,
      description: data.description,
      amount: data.amount,
      category: data.category,
      vendor: data.vendor || null,
      date: data.date || new Date().toISOString().split('T')[0],
      receipt_url: data.receipt_url || null,
      notes: data.notes || null,
    };

    const { data: expense, error } = await ctx.supabase
      .from('expenses')
      .insert(expenseRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create expense: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Expense logged!\n\n- **${expense.description}**\n- Amount: ${formatCurrency(expense.amount)}\n- Category: ${expense.category}\n- Date: ${formatDate(expense.date)}${expense.vendor ? `\n- Vendor: ${expense.vendor}` : ''}`,
      expense,
      '/financeexpenses'
    );
  } catch (err) {
    return errorResult(`Exception creating expense: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Expenses
// ============================================================================

export async function listExpenses(
  ctx: ActionContext,
  filters: ExpenseFilters = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('expenses')
      .select('id, description, amount, category, vendor, date')
      .eq('company_id', ctx.companyId)
      .order('date', { ascending: false })
      .limit(filters.limit || 20);

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.vendor) {
      query = query.ilike('vendor', `%${filters.vendor}%`);
    }
    if (filters.date_from) {
      query = query.gte('date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date', filters.date_to);
    }
    if (filters.min_amount) {
      query = query.gte('amount', filters.min_amount);
    }
    if (filters.max_amount) {
      query = query.lte('amount', filters.max_amount);
    }

    const { data: expenses, error } = await query;

    if (error) {
      return errorResult(`Failed to list expenses: ${error.message}`, error.message);
    }

    if (!expenses || expenses.length === 0) {
      return successResult('No expenses found matching your criteria.', []);
    }

    const list = formatList(expenses, (exp) =>
      `- **${exp.description}** | ${formatCurrency(exp.amount)} | ${exp.category} | ${formatDate(exp.date)}`
    );

    const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    return successResult(
      `Found ${expenses.length} expense(s):\n\n${list}\n\n**Total: ${formatCurrency(totalAmount)}**`,
      expenses,
      '/financeexpenses'
    );
  } catch (err) {
    return errorResult(`Exception listing expenses: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get Financial Summary
// ============================================================================

export async function getFinancialSummary(
  ctx: ActionContext,
  data: { period?: 'month' | 'quarter' | 'year' } = {}
): Promise<ActionResult> {
  try {
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    switch (data.period || 'month') {
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const periodLabel = data.period === 'year' ? 'This Year' : data.period === 'quarter' ? 'This Quarter' : 'This Month';

    // Try GL-based P&L first (matches Dashboard numbers)
    const { data: plData, error: plError } = await ctx.supabase.rpc('get_profit_loss', {
      p_company_id: ctx.companyId,
      p_start_date: startDateStr,
      p_end_date: endDateStr,
    });

    if (!plError && plData && plData.length > 0) {
      // Parse GL P&L response — rows have: category, account_code, account_name, amount
      let totalRevenue = 0;
      let totalExpenses = 0;

      for (const row of plData) {
        const amt = parseFloat(row.amount) || 0;
        if (row.category === 'Revenue' && !row.account_code) {
          // Summary row for total revenue
          totalRevenue = amt;
        } else if (row.category === 'Revenue' && row.account_code) {
          totalRevenue += amt;
        }
        if (row.category === 'Expenses' && !row.account_code) {
          totalExpenses = amt;
        } else if (row.category === 'Expenses' && row.account_code) {
          totalExpenses += amt;
        }
      }

      // If we got summary rows, use those directly
      const revSummary = plData.find((r: any) => r.category === 'Revenue' && r.is_summary);
      const expSummary = plData.find((r: any) => r.category === 'Expenses' && r.is_summary);
      const netSummary = plData.find((r: any) => r.category === 'Net Income');

      if (revSummary) totalRevenue = parseFloat(revSummary.amount) || totalRevenue;
      if (expSummary) totalExpenses = parseFloat(expSummary.amount) || totalExpenses;
      const netIncome = netSummary ? (parseFloat(netSummary.amount) || 0) : (totalRevenue - totalExpenses);

      // Get pending invoices (not yet in GL)
      const { data: pendingInvoices } = await ctx.supabase
        .from('invoices')
        .select('total')
        .eq('company_id', ctx.companyId)
        .in('status', ['sent', 'draft', 'overdue'])
        .eq('invoice_type', 'customer')
        .gte('created_at', startDateStr);

      const pendingRevenue = pendingInvoices?.reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0;

      return successResult(
        `📊 **Financial Summary - ${periodLabel}** (from General Ledger)\n\n` +
        `**Revenue**: ${formatCurrency(totalRevenue)}\n` +
        (pendingRevenue > 0 ? `- Pending (not yet posted): ${formatCurrency(pendingRevenue)}\n` : '') +
        `\n**Expenses**: ${formatCurrency(totalExpenses)}\n\n` +
        `**Net Income**: ${formatCurrency(netIncome)} ${netIncome >= 0 ? '✅' : '⚠️'}`,
        {
          period: periodLabel,
          source: 'general_ledger',
          revenue: totalRevenue,
          pendingRevenue,
          expenses: totalExpenses,
          netIncome,
        },
        '/financeoverview'
      );
    }

    // Fallback: COA not initialized — use raw table queries
    const { data: invoices } = await ctx.supabase
      .from('invoices')
      .select('total, status')
      .eq('company_id', ctx.companyId)
      .gte('created_at', startDateStr);

    const { data: expenses } = await ctx.supabase
      .from('expenses')
      .select('amount')
      .eq('company_id', ctx.companyId)
      .gte('date', startDateStr);

    const totalRevenue = invoices?.filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0;
    const pendingRevenue = invoices?.filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    const netIncome = totalRevenue - totalExpenses;

    return successResult(
      `📊 **Financial Summary - ${periodLabel}**\n` +
      `⚠️ *GL not initialized — showing estimates from invoices/expenses*\n\n` +
      `**Revenue**\n` +
      `- Collected: ${formatCurrency(totalRevenue)}\n` +
      `- Pending: ${formatCurrency(pendingRevenue)}\n\n` +
      `**Expenses**: ${formatCurrency(totalExpenses)}\n\n` +
      `**Net Income**: ${formatCurrency(netIncome)} ${netIncome >= 0 ? '✅' : '⚠️'}`,
      {
        period: periodLabel,
        source: 'raw_tables',
        revenue: { collected: totalRevenue, pending: pendingRevenue },
        expenses: totalExpenses,
        netIncome,
      },
      '/financeoverview'
    );
  } catch (err) {
    return errorResult(`Exception getting financial summary: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Convert Proposal to Invoice
// ============================================================================

export async function convertProposalToInvoice(
  ctx: ActionContext,
  data: { proposal_id?: string; proposal_number?: string }
): Promise<ActionResult> {
  try {
    // Find the proposal
    let query = ctx.supabase
      .from('proposals')
      .select('*')
      .eq('company_id', ctx.companyId);

    if (data.proposal_id) {
      query = query.eq('id', data.proposal_id);
    } else if (data.proposal_number) {
      query = query.eq('proposal_number', data.proposal_number);
    } else {
      return errorResult('Please provide a proposal ID or number', 'Missing identifier');
    }

    const { data: proposal, error: findError } = await query.single();

    if (findError || !proposal) {
      return errorResult('Proposal not found', 'Not found');
    }

    if (proposal.converted_to_invoice_id) {
      return errorResult('This proposal has already been converted to an invoice', 'Already converted');
    }

    // Create invoice from proposal
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceRecord = {
      company_id: ctx.companyId,
      user_id: ctx.userId || DEFAULT_USER_ID,
      invoice_number: generateDocNumber('INV'),
      status: 'draft',
      client_name: proposal.client_name,
      client_email: proposal.client_email,
      client_address: proposal.client_address || {},
      items: proposal.line_items,
      total: proposal.total,
      due_date: dueDate.toISOString().split('T')[0],
      description: `Invoice from ${proposal.proposal_number}`,
      notes: `Converted from proposal: ${proposal.proposal_number}\n\nSubtotal: ${formatCurrency(proposal.subtotal)}\nBTW (${proposal.tax_percent}%): ${formatCurrency(proposal.tax_amount)}\nTotal: ${formatCurrency(proposal.total)}`,
      proposal_id: proposal.id,
    };

    const { data: invoice, error: createError } = await ctx.supabase
      .from('invoices')
      .insert(invoiceRecord)
      .select()
      .single();

    if (createError) {
      return errorResult(`Failed to create invoice: ${createError.message}`, createError.message);
    }

    // Update proposal with conversion info
    await ctx.supabase
      .from('proposals')
      .update({
        converted_to_invoice_id: invoice.id,
        converted_at: new Date().toISOString(),
        status: 'accepted',
      })
      .eq('id', proposal.id);

    return successResult(
      `✅ Proposal converted to invoice!\n\n**Proposal:** ${proposal.proposal_number}\n**New Invoice:** ${invoice.invoice_number}\n- Client: ${invoice.client_name}\n- Total: ${formatCurrency(invoice.total)}\n- Due: ${formatDate(invoice.due_date)}`,
      { proposal, invoice },
      '/financeinvoices'
    );
  } catch (err) {
    return errorResult(`Exception converting proposal: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create Vendor
// ============================================================================

export async function createVendor(
  ctx: ActionContext,
  data: { name: string; email?: string; phone?: string; vendor_code?: string; address?: string; notes?: string }
): Promise<ActionResult> {
  try {
    if (!data.name) return errorResult('Vendor name is required');

    const { data: vendor, error } = await ctx.supabase
      .from('vendors')
      .insert({
        company_id: ctx.companyId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        vendor_code: data.vendor_code || null,
        address: data.address || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) return errorResult(`Failed to create vendor: ${error.message}`, error.message);

    return successResult(
      `✅ **Vendor Created**\n\n` +
      `- **Name:** ${vendor.name}\n` +
      (vendor.email ? `- **Email:** ${vendor.email}\n` : '') +
      (vendor.phone ? `- **Phone:** ${vendor.phone}\n` : '') +
      (vendor.vendor_code ? `- **Code:** ${vendor.vendor_code}\n` : ''),
      vendor,
      '/financevendors'
    );
  } catch (err) {
    return errorResult(`Exception creating vendor: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Create Bill
// ============================================================================

export async function createBill(
  ctx: ActionContext,
  data: { vendor_name?: string; vendor_id?: string; amount: number; bill_number?: string; due_date?: string; notes?: string }
): Promise<ActionResult> {
  try {
    if (!data.amount) return errorResult('Bill amount is required');

    let vendorId = data.vendor_id;

    // Lookup vendor by name if no ID provided
    if (!vendorId && data.vendor_name) {
      const { data: vendors } = await ctx.supabase
        .from('vendors')
        .select('id, name')
        .eq('company_id', ctx.companyId)
        .ilike('name', `%${data.vendor_name}%`)
        .limit(1);

      if (vendors && vendors.length > 0) {
        vendorId = vendors[0].id;
      } else {
        // Auto-create vendor
        const { data: newVendor, error: vErr } = await ctx.supabase
          .from('vendors')
          .insert({ company_id: ctx.companyId, name: data.vendor_name })
          .select()
          .single();

        if (vErr) return errorResult(`Failed to create vendor: ${vErr.message}`);
        vendorId = newVendor.id;
      }
    }

    if (!vendorId) return errorResult('Vendor name or vendor_id is required');

    const dueDate = data.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: bill, error } = await ctx.supabase
      .from('bills')
      .insert({
        company_id: ctx.companyId,
        vendor_id: vendorId,
        bill_number: data.bill_number || null,
        amount: data.amount,
        balance_due: data.amount,
        status: 'pending',
        due_date: dueDate,
        notes: data.notes || null,
        issued_date: new Date().toISOString().slice(0, 10),
      })
      .select('*, vendors(name)')
      .single();

    if (error) return errorResult(`Failed to create bill: ${error.message}`, error.message);

    return successResult(
      `✅ **Bill Created**\n\n` +
      `- **Vendor:** ${bill.vendors?.name || 'Unknown'}\n` +
      `- **Amount:** ${formatCurrency(data.amount)}\n` +
      `- **Due Date:** ${formatDate(dueDate)}\n` +
      (bill.bill_number ? `- **Bill #:** ${bill.bill_number}\n` : ''),
      bill,
      '/financebills'
    );
  } catch (err) {
    return errorResult(`Exception creating bill: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get Trial Balance
// ============================================================================

export async function getTrialBalance(
  ctx: ActionContext,
  data: { as_of_date?: string } = {}
): Promise<ActionResult> {
  try {
    const asOfDate = data.as_of_date || new Date().toISOString().slice(0, 10);

    const { data: tbData, error } = await ctx.supabase.rpc('get_trial_balance', {
      p_company_id: ctx.companyId,
      p_as_of_date: asOfDate,
    });

    if (error) {
      if (error.code === 'PGRST202') return errorResult('Trial Balance report not available. Initialize Chart of Accounts first.');
      return errorResult(`Failed to get trial balance: ${error.message}`);
    }

    if (!tbData || tbData.length === 0) {
      return successResult(
        '📊 **Trial Balance** — No accounts found.\n\nInitialize your Chart of Accounts first.',
        { rows: [] },
        '/financeaccounts'
      );
    }

    // Format as readable table
    let output = `📊 **Trial Balance** (as of ${formatDate(asOfDate)})\n\n`;
    output += `| Code | Account | Debit | Credit |\n|------|---------|-------|--------|\n`;

    let totalDebit = 0;
    let totalCredit = 0;

    for (const row of tbData) {
      const debit = parseFloat(row.debit) || 0;
      const credit = parseFloat(row.credit) || 0;
      if (debit === 0 && credit === 0) continue;
      totalDebit += debit;
      totalCredit += credit;
      output += `| ${row.account_code} | ${row.account_name} | ${debit > 0 ? formatCurrency(debit) : '—'} | ${credit > 0 ? formatCurrency(credit) : '—'} |\n`;
    }

    output += `| | **Totals** | **${formatCurrency(totalDebit)}** | **${formatCurrency(totalCredit)}** |\n`;

    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
      output += `\n⚠️ **Out of balance by ${formatCurrency(diff)}**`;
    } else {
      output += `\n✅ **Balanced**`;
    }

    return successResult(output, { rows: tbData, totalDebit, totalCredit, balanced: diff <= 0.01 }, '/financereports#trial-balance');
  } catch (err) {
    return errorResult(`Exception getting trial balance: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get Balance Sheet
// ============================================================================

export async function getBalanceSheet(
  ctx: ActionContext,
  data: { as_of_date?: string } = {}
): Promise<ActionResult> {
  try {
    const asOfDate = data.as_of_date || new Date().toISOString().slice(0, 10);

    const { data: bsData, error } = await ctx.supabase.rpc('get_balance_sheet', {
      p_company_id: ctx.companyId,
      p_as_of_date: asOfDate,
    });

    if (error) {
      if (error.code === 'PGRST202') return errorResult('Balance Sheet report not available. Initialize Chart of Accounts first.');
      return errorResult(`Failed to get balance sheet: ${error.message}`);
    }

    if (!bsData || bsData.length === 0) {
      return successResult(
        '📊 **Balance Sheet** — No data found.\n\nInitialize your Chart of Accounts and post transactions first.',
        { rows: [] },
        '/financeaccounts'
      );
    }

    let output = `📊 **Balance Sheet** (as of ${formatDate(asOfDate)})\n\n`;

    // Group by category: Assets, Liabilities, Equity
    const groups: Record<string, any[]> = { Assets: [], Liabilities: [], Equity: [] };
    const totals: Record<string, number> = { Assets: 0, Liabilities: 0, Equity: 0 };

    for (const row of bsData) {
      const cat = row.category || row.section;
      const isSummary = row.is_summary === true || row.row_type === 'subtotal';
      const amt = parseFloat(row.amount) || 0;

      if (isSummary && groups[cat] !== undefined) {
        totals[cat] = amt;
      } else if (groups[cat] !== undefined) {
        groups[cat].push(row);
      }
    }

    for (const [section, rows] of Object.entries(groups)) {
      output += `**${section}**\n`;
      if (rows.length === 0) {
        output += `  No ${section.toLowerCase()} accounts\n`;
      } else {
        for (const r of rows) {
          output += `  ${r.account_code} ${r.account_name}: ${formatCurrency(r.amount)}\n`;
        }
      }
      output += `  **Total ${section}: ${formatCurrency(totals[section])}**\n\n`;
    }

    const equityCheck = totals.Assets - totals.Liabilities - totals.Equity;
    if (Math.abs(equityCheck) > 0.01) {
      output += `⚠️ Assets (${formatCurrency(totals.Assets)}) ≠ Liabilities + Equity (${formatCurrency(totals.Liabilities + totals.Equity)})`;
    } else {
      output += `✅ **A = L + E balanced**`;
    }

    return successResult(output, { rows: bsData, totals }, '/financereports#balance-sheet');
  } catch (err) {
    return errorResult(`Exception getting balance sheet: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Finance Action Router
// ============================================================================

export async function executeFinanceAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'create_proposal':
      return createProposal(ctx, data);
    case 'create_invoice':
      return createInvoice(ctx, data);
    case 'list_invoices':
      return listInvoices(ctx, data);
    case 'update_invoice':
      return updateInvoice(ctx, data);
    case 'create_expense':
      return createExpense(ctx, data);
    case 'list_expenses':
      return listExpenses(ctx, data);
    case 'get_financial_summary':
      return getFinancialSummary(ctx, data);
    case 'convert_proposal_to_invoice':
      return convertProposalToInvoice(ctx, data);
    case 'create_vendor':
      return createVendor(ctx, data);
    case 'create_bill':
      return createBill(ctx, data);
    case 'get_trial_balance':
      return getTrialBalance(ctx, data);
    case 'get_balance_sheet':
      return getBalanceSheet(ctx, data);
    default:
      return errorResult(`Unknown finance action: ${action}`, 'Unknown action');
  }
}

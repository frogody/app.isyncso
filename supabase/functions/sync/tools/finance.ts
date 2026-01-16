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

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
      .select('id, invoice_number, client_name, total, status, due_date, created_at')
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

    // Get invoice totals
    const { data: invoices } = await ctx.supabase
      .from('invoices')
      .select('total, status')
      .eq('company_id', ctx.companyId)
      .gte('created_at', startDateStr);

    // Get expense totals
    const { data: expenses } = await ctx.supabase
      .from('expenses')
      .select('amount')
      .eq('company_id', ctx.companyId)
      .gte('date', startDateStr);

    // Calculate metrics
    const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0) || 0;
    const pendingRevenue = invoices?.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.total || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const netIncome = totalRevenue - totalExpenses;

    const periodLabel = data.period === 'year' ? 'This Year' : data.period === 'quarter' ? 'This Quarter' : 'This Month';

    return successResult(
      `📊 **Financial Summary - ${periodLabel}**\n\n` +
      `**Revenue**\n` +
      `- Collected: ${formatCurrency(totalRevenue)}\n` +
      `- Pending: ${formatCurrency(pendingRevenue)}\n\n` +
      `**Expenses**: ${formatCurrency(totalExpenses)}\n\n` +
      `**Net Income**: ${formatCurrency(netIncome)} ${netIncome >= 0 ? '✅' : '⚠️'}`,
      {
        period: periodLabel,
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
    default:
      return errorResult(`Unknown finance action: ${action}`, 'Unknown action');
  }
}

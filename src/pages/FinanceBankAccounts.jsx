import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Building2, Landmark, Upload, Link2, Unlink, Globe, CreditCard, RefreshCw, ArrowUpDown, Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, MoreVertical, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/components/context/PermissionContext';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';
import RevolutConnectionSettings from '@/components/finance/RevolutConnectionSettings';

// ── CSV Parser ──────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  // Map common Dutch/English header names
  const dateCol = headers.findIndex(h => ['date', 'datum', 'booking date', 'boekdatum'].includes(h));
  const descCol = headers.findIndex(h => ['description', 'omschrijving', 'name / description'].includes(h));
  const amountCol = headers.findIndex(h => ['amount', 'bedrag', 'transaction amount'].includes(h));
  const refCol = headers.findIndex(h => ['reference', 'referentie', 'payment reference'].includes(h));
  const counterpartyCol = headers.findIndex(h => ['counterparty', 'tegenrekening', 'name', 'naam'].includes(h));

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    return {
      date: dateCol >= 0 ? cols[dateCol] : '',
      description: descCol >= 0 ? cols[descCol] : '',
      amount: amountCol >= 0 ? cols[amountCol] : '0',
      reference: refCol >= 0 ? cols[refCol] : '',
      counterparty: counterpartyCol >= 0 ? cols[counterpartyCol] : '',
    };
  });
}

// ── Date parser (handles DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD) ───────────
function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD-MM-YYYY or DD/MM/YYYY
  const match = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  // Fallback: try native parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return null;
}

// ── UUID generator ──────────────────────────────────────────────────────
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function FinanceBankAccounts({ embedded = false }) {
  const { ft } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id || user?.organization_id;

  // ── State ─────────────────────────────────────────────────────────────
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [glAccounts, setGLAccounts] = useState([]);
  const [search, setSearch] = useState('');

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({
    bank_name: '', account_name: '', account_number: '', iban: '', bic_swift: '',
    currency: 'EUR', opening_balance: '', account_id: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Import CSV modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importingAccount, setImportingAccount] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  // ── Data Loading ──────────────────────────────────────────────────────
  const loadBankAccounts = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*, accounts(code, name)')
        .eq('company_id', companyId)
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (err) {
      console.error('Error loading bank accounts:', err);
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadGLAccounts = async () => {
    if (!companyId) return;
    try {
      // Try specific cash account codes first
      let { data, error } = await supabase
        .from('accounts')
        .select('id, code, name')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('code', ['1000', '1010', '1020', '1030', '1040', '1050'])
        .order('code');

      if (error) throw error;

      // Fallback: if no matches, load all accounts with code starting with '1' (assets)
      if (!data || data.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('accounts')
          .select('id, code, name')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .like('code', '1%')
          .order('code');

        if (fallbackError) throw fallbackError;
        data = fallbackData;
      }

      setGLAccounts(data || []);
    } catch (err) {
      console.error('Error loading GL accounts:', err);
      toast.error('Failed to load GL accounts');
    }
  };

  useEffect(() => {
    if (companyId) {
      loadBankAccounts();
      loadGLAccounts();
    }
  }, [companyId]);

  // ── Filtered data ─────────────────────────────────────────────────────
  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return bankAccounts;
    const q = search.toLowerCase();
    return bankAccounts.filter(a =>
      a.bank_name?.toLowerCase().includes(q) ||
      a.account_name?.toLowerCase().includes(q) ||
      a.iban?.toLowerCase().includes(q) ||
      a.account_number?.toLowerCase().includes(q) ||
      a.currency?.toLowerCase().includes(q)
    );
  }, [bankAccounts, search]);

  // ── Stats ─────────────────────────────────────────────────────────────
  const totalAccounts = bankAccounts.length;
  const activeAccounts = useMemo(() => bankAccounts.filter(a => a.is_active).length, [bankAccounts]);
  const totalBalance = useMemo(() => bankAccounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0), [bankAccounts]);

  // ── Currency formatter ────────────────────────────────────────────────
  const formatCurrency = (num) => {
    if (num === null || num === undefined || num === '') return '€0.00';
    return `€${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ── Date formatter ────────────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  };

  // ── CRUD Operations ───────────────────────────────────────────────────
  const openCreateAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      bank_name: '', account_name: '', account_number: '', iban: '', bic_swift: '',
      currency: 'EUR', opening_balance: '', account_id: '', notes: '',
    });
    setModalOpen(true);
  };

  const openEditAccount = (account) => {
    setEditingAccount(account);
    setAccountForm({
      bank_name: account.bank_name || '',
      account_name: account.account_name || '',
      account_number: account.account_number || '',
      iban: account.iban || '',
      bic_swift: account.bic_swift || '',
      currency: account.currency || 'EUR',
      opening_balance: account.opening_balance !== null && account.opening_balance !== undefined ? String(account.opening_balance) : '',
      account_id: account.account_id || '',
      notes: account.notes || '',
    });
    setModalOpen(true);
  };

  const handleSaveAccount = async () => {
    if (!accountForm.bank_name.trim()) {
      toast.error('Bank name is required');
      return;
    }
    if (!accountForm.account_name.trim()) {
      toast.error('Account name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        bank_name: accountForm.bank_name.trim(),
        account_name: accountForm.account_name.trim(),
        account_number: accountForm.account_number.trim() || null,
        iban: accountForm.iban.trim() || null,
        bic_swift: accountForm.bic_swift.trim() || null,
        currency: accountForm.currency || 'EUR',
        opening_balance: accountForm.opening_balance !== '' ? Number(accountForm.opening_balance) : 0,
        account_id: accountForm.account_id || null,
        notes: accountForm.notes.trim() || null,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(payload)
          .eq('id', editingAccount.id);
        if (error) throw error;
        toast.success('Bank account updated');
      } else {
        // For new accounts, set current_balance = opening_balance
        payload.current_balance = payload.opening_balance;
        payload.is_active = true;
        const { error } = await supabase
          .from('bank_accounts')
          .insert(payload);
        if (error) throw error;
        toast.success('Bank account created');
      }

      setModalOpen(false);
      await loadBankAccounts();
    } catch (err) {
      console.error('Error saving bank account:', err);
      toast.error('Failed to save bank account');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountToDelete.id);
      if (error) throw error;
      toast.success('Bank account deleted');
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      await loadBankAccounts();
    } catch (err) {
      console.error('Error deleting bank account:', err);
      toast.error('Failed to delete bank account');
    }
  };

  const handleToggleActive = async (account) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id);
      if (error) throw error;
      toast.success(`Bank account ${account.is_active ? 'deactivated' : 'activated'}`);
      await loadBankAccounts();
    } catch (err) {
      console.error('Error toggling bank account:', err);
      toast.error('Failed to update bank account');
    }
  };

  const handleLinkGL = async (account, glAccountId) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ account_id: glAccountId || null })
        .eq('id', account.id);
      if (error) throw error;
      toast.success(glAccountId ? 'GL account linked' : 'GL account unlinked');
      await loadBankAccounts();
    } catch (err) {
      console.error('Error linking GL account:', err);
      toast.error('Failed to update GL link');
    }
  };

  // ── Import CSV ────────────────────────────────────────────────────────
  const openImportModal = (account) => {
    setImportingAccount(account);
    setImportFile(null);
    setParsedRows([]);
    setImportModalOpen(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const rows = parseCSV(text);
        setParsedRows(rows);
        if (rows.length === 0) {
          toast.error('No data rows found in CSV. Check the file format.');
        } else {
          toast.success(`Parsed ${rows.length} transaction(s) from CSV`);
        }
      } catch (err) {
        console.error('Error parsing CSV:', err);
        toast.error('Failed to parse CSV file');
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read CSV file');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importingAccount || parsedRows.length === 0) return;

    setImporting(true);
    try {
      const batchId = generateUUID();

      const transactions = parsedRows
        .map(row => {
          const transactionDate = parseDate(row.date);
          const amount = parseFloat((row.amount || '0').replace(',', '.'));

          if (!transactionDate || isNaN(amount)) return null;

          return {
            bank_account_id: importingAccount.id,
            company_id: companyId,
            transaction_date: transactionDate,
            description: row.description || null,
            amount: amount,
            reference: row.reference || null,
            counterparty_name: row.counterparty || null,
            import_batch_id: batchId,
            import_source: 'csv',
            raw_data: row,
          };
        })
        .filter(Boolean);

      if (transactions.length === 0) {
        toast.error('No valid transactions found. Check date and amount formats.');
        setImporting(false);
        return;
      }

      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(transactions);

      if (error) throw error;

      // Update bank account last_imported_at
      await supabase
        .from('bank_accounts')
        .update({ last_imported_at: new Date().toISOString() })
        .eq('id', importingAccount.id);

      toast.success(`Successfully imported ${transactions.length} transaction(s)`);
      setImportModalOpen(false);
      setParsedRows([]);
      setImportFile(null);
      setImportingAccount(null);
      await loadBankAccounts();
    } catch (err) {
      console.error('Error importing transactions:', err);
      toast.error('Failed to import transactions');
    } finally {
      setImporting(false);
    }
  };

  // ── Main Render ───────────────────────────────────────────────────────
  return (
    <FinancePageTransition>
      <div className="space-y-6">
        {!embedded && (
          <PageHeader
            title="Bank Accounts"
            subtitle="Manage bank accounts and import bank statements"
            icon={Landmark}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Total Accounts</p>
                  <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{totalAccounts}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Active Accounts</p>
                  <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{activeAccounts}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <CreditCard className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Total Balance</p>
                  <p className={`text-2xl font-bold mt-1 ${totalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  <Globe className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
            <Input
              placeholder="Search bank accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
            />
          </div>
          <Button onClick={openCreateAccount} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        </div>

        {/* Bank Accounts Table */}
        <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={ft('bg-slate-50 border-b border-slate-200', 'bg-white/[0.02] border-b border-white/[0.06]')}>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Bank / Account</th>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>IBAN / Account No.</th>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Linked GL Account</th>
                  <th className={`text-center text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Currency</th>
                  <th className={`text-right text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Balance</th>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Last Reconciled</th>
                  <th className={`text-center text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Status</th>
                  <th className={`text-right text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${ft('divide-slate-100', 'divide-white/[0.04]')}`}>
                {loading ? (
                  <tr>
                    <td colSpan={8} className={`px-5 py-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                      Loading bank accounts...
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`px-5 py-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                      <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No bank accounts found</p>
                      <p className="text-sm mt-1">Add a bank account to get started</p>
                    </td>
                  </tr>
                ) : filteredAccounts.map((account) => (
                  <tr key={account.id} className={`${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors`}>
                    {/* Bank Name + Account Name */}
                    <td className="px-5 py-3.5">
                      <div className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{account.bank_name}</div>
                      <div className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>{account.account_name}</div>
                    </td>

                    {/* IBAN / Account Number */}
                    <td className={`px-5 py-3.5 text-sm ${ft('text-slate-700', 'text-zinc-300')} font-mono`}>
                      {account.iban || account.account_number || <span className={ft('text-slate-400', 'text-zinc-600')}>—</span>}
                    </td>

                    {/* Linked GL Account */}
                    <td className="px-5 py-3.5">
                      {account.accounts ? (
                        <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10">
                          {account.accounts.code} — {account.accounts.name}
                        </Badge>
                      ) : (
                        <span className={`text-sm ${ft('text-slate-400', 'text-zinc-600')}`}>—</span>
                      )}
                    </td>

                    {/* Currency */}
                    <td className={`px-5 py-3.5 text-center text-sm font-medium ${ft('text-slate-700', 'text-zinc-300')}`}>
                      {account.currency || 'EUR'}
                    </td>

                    {/* Balance */}
                    <td className={`px-5 py-3.5 text-right font-medium ${(Number(account.current_balance) || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(account.current_balance)}
                    </td>

                    {/* Last Reconciled */}
                    <td className={`px-5 py-3.5 text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>
                      {formatDate(account.last_reconciled_at) || 'Never'}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-center">
                      {account.is_active ? (
                        <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-400 border-zinc-500/30 bg-zinc-500/10">Inactive</Badge>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={ft('hover:bg-slate-100', 'hover:bg-white/[0.06]')}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                          <DropdownMenuItem onClick={() => openEditAccount(account)} className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openImportModal(account)} className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Statement
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-700')} />
                          {account.account_id ? (
                            <DropdownMenuItem onClick={() => handleLinkGL(account, null)} className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}>
                              <Unlink className="w-4 h-4 mr-2" />
                              Unlink GL Account
                            </DropdownMenuItem>
                          ) : (
                            glAccounts.length > 0 && (
                              <DropdownMenuItem
                                onClick={() => {
                                  // Quick-link to first available GL account; for more control use Edit
                                  openEditAccount(account);
                                }}
                                className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}
                              >
                                <Link2 className="w-4 h-4 mr-2" />
                                Link GL Account
                              </DropdownMenuItem>
                            )
                          )}
                          <DropdownMenuItem onClick={() => handleToggleActive(account)} className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}>
                            {account.is_active ? (
                              <><ToggleLeft className="w-4 h-4 mr-2" />Deactivate</>
                            ) : (
                              <><ToggleRight className="w-4 h-4 mr-2" />Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-700')} />
                          <DropdownMenuItem
                            onClick={() => { setAccountToDelete(account); setDeleteDialogOpen(true); }}
                            className="text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Create/Edit Bank Account Modal ──────────────────────────────── */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} sm:max-w-lg`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>
                {editingAccount ? 'Edit Bank Account' : 'Create Bank Account'}
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editingAccount ? 'Update the bank account details below.' : 'Add a new bank account for your organization.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Bank Name *</Label>
                  <Input
                    placeholder="e.g. ING, ABN AMRO, Rabobank"
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Account Name *</Label>
                  <Input
                    placeholder="e.g. Main Business Account"
                    value={accountForm.account_name}
                    onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Account Number</Label>
                  <Input
                    placeholder="Account number"
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>IBAN</Label>
                  <Input
                    placeholder="e.g. NL91ABNA0417164300"
                    value={accountForm.iban}
                    onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })}
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>BIC / SWIFT</Label>
                  <Input
                    placeholder="e.g. ABNANL2A"
                    value={accountForm.bic_swift}
                    onChange={(e) => setAccountForm({ ...accountForm, bic_swift: e.target.value })}
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Currency</Label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                    className={`w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Opening Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={accountForm.opening_balance}
                  onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Linked GL Account</Label>
                <select
                  value={accountForm.account_id}
                  onChange={(e) => setAccountForm({ ...accountForm, account_id: e.target.value })}
                  className={`w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">— No linked GL account —</option>
                  {glAccounts.map(gl => (
                    <option key={gl.id} value={gl.id}>{gl.code} — {gl.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Notes</Label>
                <Textarea
                  placeholder="Optional notes about this account..."
                  value={accountForm.notes}
                  onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button onClick={handleSaveAccount} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : editingAccount ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Import CSV Modal ────────────────────────────────────────────── */}
        <Dialog open={importModalOpen} onOpenChange={(open) => { if (!open) { setImportModalOpen(false); setParsedRows([]); setImportFile(null); } else { setImportModalOpen(true); } }}>
          <DialogContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} sm:max-w-2xl`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>
                Import Bank Statement
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Import transactions from a CSV file into <span className="font-medium">{importingAccount?.bank_name} — {importingAccount?.account_name}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* File Upload */}
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>CSV File</Label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${ft('border-slate-300 bg-slate-50', 'border-zinc-700 bg-zinc-800/50')}`}>
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${ft('text-slate-400', 'text-zinc-500')}`} />
                  <input
                    type="file"
                    accept=".csv,.CSV"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {importFile ? importFile.name : 'Click to select a CSV file'}
                  </label>
                  <p className={`text-xs mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                    Supported columns: Date/Datum, Description/Omschrijving, Amount/Bedrag, Reference/Referentie
                  </p>
                </div>
              </div>

              {/* Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>
                    Preview ({parsedRows.length} transaction{parsedRows.length !== 1 ? 's' : ''} found)
                  </Label>
                  <div className={`rounded-lg border overflow-hidden ${ft('border-slate-200', 'border-zinc-700')}`}>
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={ft('bg-slate-100', 'bg-zinc-800')}>
                            <th className={`text-left px-3 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Date</th>
                            <th className={`text-left px-3 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Description</th>
                            <th className={`text-right px-3 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Amount</th>
                            <th className={`text-left px-3 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Reference</th>
                            <th className={`text-left px-3 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Counterparty</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${ft('divide-slate-100', 'divide-zinc-700')}`}>
                          {parsedRows.slice(0, 5).map((row, i) => (
                            <tr key={i} className={ft('', 'text-zinc-300')}>
                              <td className={`px-3 py-2 ${ft('text-slate-700', 'text-zinc-300')}`}>{row.date || '—'}</td>
                              <td className={`px-3 py-2 max-w-[200px] truncate ${ft('text-slate-700', 'text-zinc-300')}`}>{row.description || '—'}</td>
                              <td className={`px-3 py-2 text-right font-mono ${ft('text-slate-700', 'text-zinc-300')}`}>{row.amount || '0'}</td>
                              <td className={`px-3 py-2 ${ft('text-slate-500', 'text-zinc-400')}`}>{row.reference || '—'}</td>
                              <td className={`px-3 py-2 ${ft('text-slate-500', 'text-zinc-400')}`}>{row.counterparty || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedRows.length > 5 && (
                      <div className={`px-3 py-2 text-xs text-center ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800')}`}>
                        ... and {parsedRows.length - 5} more row{parsedRows.length - 5 !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setImportModalOpen(false); setParsedRows([]); setImportFile(null); }} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || parsedRows.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importing ? 'Importing...' : `Import ${parsedRows.length} Transaction${parsedRows.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation ─────────────────────────────────────────── */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} sm:max-w-sm`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>Delete Bank Account</DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Are you sure you want to delete <span className="font-medium text-white">"{accountToDelete?.bank_name} — {accountToDelete?.account_name}"</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revolut Business Sync */}
        <RevolutConnectionSettings />
      </div>
    </FinancePageTransition>
  );
}

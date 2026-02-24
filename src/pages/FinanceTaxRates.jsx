import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Percent, Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Calendar, FileText, MoreVertical, AlertCircle, Calculator } from 'lucide-react';
import FinanceBTWAangifte from './FinanceBTWAangifte';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

export default function FinanceTaxRates({ embedded = false }) {
  const { ft } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id || user?.organization_id;

  // Tab state
  const [activeTab, setActiveTab] = useState('rates');

  // Tax Rates state
  const [taxRates, setTaxRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [rateSearch, setRateSearch] = useState('');
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [rateForm, setRateForm] = useState({ name: '', rate: '', description: '', is_default: false, is_active: true });
  const [savingRate, setSavingRate] = useState(false);
  const [seedingDefaults, setSeedingDefaults] = useState(false);
  const [deleteRateDialogOpen, setDeleteRateDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState(null);

  // Tax Periods state (read-only overview from BTW Aangifte)
  const [taxPeriods, setTaxPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [periodSearch, setPeriodSearch] = useState('');
  const [deletePeriodDialogOpen, setDeletePeriodDialogOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);

  // ── Load Tax Rates ──────────────────────────────────────────────────
  const loadTaxRates = async () => {
    if (!companyId) return;
    setLoadingRates(true);
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('company_id', companyId)
        .order('rate', { ascending: true });

      if (error) throw error;
      setTaxRates(data || []);
    } catch (err) {
      console.error('Error loading tax rates:', err);
      toast.error('Failed to load tax rates');
    } finally {
      setLoadingRates(false);
    }
  };

  // ── Load Tax Periods (with BTW calculation for each) ────────────────
  const loadTaxPeriods = async () => {
    if (!companyId) return;
    setLoadingPeriods(true);
    try {
      const { data, error } = await supabase
        .from('tax_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Compute BTW for each period to get tax_collected (5a) and tax_paid (5b)
      const enriched = await Promise.all((data || []).map(async (period) => {
        try {
          const { data: btwData } = await supabase.rpc('compute_btw_aangifte', {
            p_company_id: companyId,
            p_start_date: period.start_date,
            p_end_date: period.end_date,
          });
          const btw5a = btwData?.['5a']?.btw || 0;
          const btw5b = btwData?.['5b']?.btw || 0;
          const btw5c = btw5a - btw5b;
          return { ...period, tax_collected: btw5a, tax_paid: btw5b, net_tax: btw5c };
        } catch {
          return { ...period, tax_collected: 0, tax_paid: 0, net_tax: 0 };
        }
      }));

      setTaxPeriods(enriched);
    } catch (err) {
      console.error('Error loading tax periods:', err);
      toast.error('Failed to load tax periods');
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadTaxRates();
      loadTaxPeriods();
    }
  }, [companyId]);

  // ── Filtered data ───────────────────────────────────────────────────
  const filteredRates = useMemo(() => {
    if (!rateSearch.trim()) return taxRates;
    const q = rateSearch.toLowerCase();
    return taxRates.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      String(r.rate).includes(q)
    );
  }, [taxRates, rateSearch]);

  const filteredPeriods = useMemo(() => {
    if (!periodSearch.trim()) return taxPeriods;
    const q = periodSearch.toLowerCase();
    return taxPeriods.filter(p =>
      p.period_name?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q)
    );
  }, [taxPeriods, periodSearch]);

  // ── Stats ───────────────────────────────────────────────────────────
  const activeRatesCount = useMemo(() => taxRates.filter(r => r.is_active).length, [taxRates]);
  const defaultRate = useMemo(() => taxRates.find(r => r.is_default), [taxRates]);

  // ── Currency formatter ──────────────────────────────────────────────
  const formatCurrency = (num) => {
    if (num === null || num === undefined || num === '') return '€0.00';
    return `€${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ── Seed Defaults ───────────────────────────────────────────────────
  const handleSeedDefaults = async () => {
    if (!companyId) return;
    setSeedingDefaults(true);
    try {
      const { error } = await supabase.rpc('seed_default_tax_rates', { p_company_id: companyId });
      if (error) throw error;
      toast.success('Default tax rates seeded successfully');
      await loadTaxRates();
    } catch (err) {
      console.error('Error seeding defaults:', err);
      toast.error('Failed to seed default tax rates');
    } finally {
      setSeedingDefaults(false);
    }
  };

  // ── Tax Rate CRUD ───────────────────────────────────────────────────
  const openCreateRate = () => {
    setEditingRate(null);
    setRateForm({ name: '', rate: '', description: '', is_default: false, is_active: true });
    setRateModalOpen(true);
  };

  const openEditRate = (rate) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name || '',
      rate: rate.rate !== null && rate.rate !== undefined ? String(rate.rate) : '',
      description: rate.description || '',
      is_default: rate.is_default || false,
      is_active: rate.is_active !== false,
    });
    setRateModalOpen(true);
  };

  const handleSaveRate = async () => {
    if (!rateForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (rateForm.rate === '' || isNaN(Number(rateForm.rate))) {
      toast.error('A valid rate is required');
      return;
    }

    setSavingRate(true);
    try {
      // If setting as default, clear other defaults first
      if (rateForm.is_default) {
        const { error: clearErr } = await supabase
          .from('tax_rates')
          .update({ is_default: false })
          .eq('company_id', companyId);
        if (clearErr) throw clearErr;
      }

      const payload = {
        company_id: companyId,
        name: rateForm.name.trim(),
        rate: Number(rateForm.rate),
        description: rateForm.description.trim() || null,
        is_default: rateForm.is_default,
        is_active: rateForm.is_active,
      };

      if (editingRate) {
        const { error } = await supabase
          .from('tax_rates')
          .update(payload)
          .eq('id', editingRate.id);
        if (error) throw error;
        toast.success('Tax rate updated');
      } else {
        const { error } = await supabase
          .from('tax_rates')
          .insert(payload);
        if (error) throw error;
        toast.success('Tax rate created');
      }

      setRateModalOpen(false);
      await loadTaxRates();
    } catch (err) {
      console.error('Error saving tax rate:', err);
      toast.error('Failed to save tax rate');
    } finally {
      setSavingRate(false);
    }
  };

  const handleDeleteRate = async () => {
    if (!rateToDelete) return;
    try {
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', rateToDelete.id);
      if (error) throw error;
      toast.success('Tax rate deleted');
      setDeleteRateDialogOpen(false);
      setRateToDelete(null);
      await loadTaxRates();
    } catch (err) {
      console.error('Error deleting tax rate:', err);
      toast.error('Failed to delete tax rate');
    }
  };

  const handleToggleActive = async (rate) => {
    try {
      const { error } = await supabase
        .from('tax_rates')
        .update({ is_active: !rate.is_active })
        .eq('id', rate.id);
      if (error) throw error;
      toast.success(`Tax rate ${rate.is_active ? 'deactivated' : 'activated'}`);
      await loadTaxRates();
    } catch (err) {
      console.error('Error toggling tax rate:', err);
      toast.error('Failed to update tax rate');
    }
  };

  // ── Tax Period Actions (read-only, managed from BTW Aangifte) ───────
  const handleDeletePeriod = async () => {
    if (!periodToDelete) return;
    try {
      const { error } = await supabase
        .from('tax_periods')
        .delete()
        .eq('id', periodToDelete.id);
      if (error) throw error;
      toast.success('Tax period deleted');
      setDeletePeriodDialogOpen(false);
      setPeriodToDelete(null);
      await loadTaxPeriods();
    } catch (err) {
      console.error('Error deleting tax period:', err);
      toast.error('Failed to delete tax period');
    }
  };

  const handleFilePeriod = async (period) => {
    try {
      const { error } = await supabase
        .from('tax_periods')
        .update({ status: 'filed', filed_at: new Date().toISOString() })
        .eq('id', period.id);
      if (error) throw error;
      toast.success('Tax period marked as filed');
      await loadTaxPeriods();
    } catch (err) {
      console.error('Error filing tax period:', err);
      toast.error('Failed to file tax period');
    }
  };

  // ── Status badge helper ─────────────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10">Open</Badge>;
      case 'filed':
        return <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">Filed</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-zinc-400 border-zinc-500/30 bg-zinc-500/10">Closed</Badge>;
      default:
        return <Badge variant="outline" className="text-zinc-400 border-zinc-500/30 bg-zinc-500/10">{status}</Badge>;
    }
  };

  // ── Net tax calculator ──────────────────────────────────────────────
  const calcNetTax = (collected, paid) => {
    const c = Number(collected) || 0;
    const p = Number(paid) || 0;
    return c - p;
  };

  // ── Render: Tax Rates Tab ───────────────────────────────────────────
  const renderTaxRatesTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Total Active Rates</p>
                <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{activeRatesCount}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Percent className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Default Rate</p>
                <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>
                  {defaultRate ? `${defaultRate.name} (${defaultRate.rate}%)` : 'None set'}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
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
            placeholder="Search tax rates..."
            value={rateSearch}
            onChange={(e) => setRateSearch(e.target.value)}
            className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedDefaults}
            disabled={seedingDefaults}
            className={ft('border-slate-200 text-slate-700 hover:bg-slate-50', 'border-zinc-700 text-zinc-300 hover:bg-white/[0.03]')}
          >
            {seedingDefaults ? 'Seeding...' : 'Seed Defaults'}
          </Button>
          <Button onClick={openCreateRate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Tax Rate
          </Button>
        </div>
      </div>

      {/* Tax Rates Table */}
      <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={ft('bg-slate-50 border-b border-slate-200', 'bg-white/[0.02] border-b border-white/[0.06]')}>
                <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Name</th>
                <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Rate %</th>
                <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Description</th>
                <th className={`text-center text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Default</th>
                <th className={`text-center text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Active</th>
                <th className={`text-right text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${ft('divide-slate-100', 'divide-white/[0.04]')}`}>
              {loadingRates ? (
                <tr>
                  <td colSpan={6} className={`px-5 py-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                    Loading tax rates...
                  </td>
                </tr>
              ) : filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-5 py-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                    <Percent className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No tax rates found</p>
                    <p className="text-sm mt-1">Add a tax rate or seed defaults to get started</p>
                  </td>
                </tr>
              ) : filteredRates.map((rate) => (
                <tr key={rate.id} className={`${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors`}>
                  <td className={`px-5 py-3.5 ${ft('text-slate-900', 'text-white')} font-medium`}>{rate.name}</td>
                  <td className={`px-5 py-3.5 ${ft('text-slate-900', 'text-white')}`}>{rate.rate}%</td>
                  <td className={`px-5 py-3.5 ${ft('text-slate-500', 'text-zinc-400')} text-sm max-w-xs truncate`}>{rate.description || '—'}</td>
                  <td className="px-5 py-3.5 text-center">
                    {rate.is_default ? (
                      <span className="text-yellow-400 text-lg">★</span>
                    ) : (
                      <span className={ft('text-slate-300', 'text-zinc-600')}>☆</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => handleToggleActive(rate)} className="inline-flex items-center">
                      {rate.is_active ? (
                        <ToggleRight className="w-6 h-6 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-zinc-500" />
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={ft('hover:bg-slate-100', 'hover:bg-white/[0.06]')}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                        <DropdownMenuItem onClick={() => openEditRate(rate)} className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-700')} />
                        <DropdownMenuItem
                          onClick={() => { setRateToDelete(rate); setDeleteRateDialogOpen(true); }}
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
    </div>
  );

  // ── Render: Tax Periods Tab (read-only overview from BTW Aangifte) ──
  const renderTaxPeriodsTab = () => (
    <div className="space-y-6">
      {/* Info banner */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${ft('bg-blue-50 border border-blue-200', 'bg-blue-500/10 border border-blue-500/20')}`}>
        <Calculator className="w-5 h-5 text-blue-400 shrink-0" />
        <p className={`text-sm ${ft('text-blue-700', 'text-blue-300')}`}>
          Tax periods are automatically created when you select a quarter in the <button onClick={() => setActiveTab('btw')} className="underline font-medium hover:opacity-80">BTW Aangifte</button> tab. Tax Collected = BTW verschuldigd (5a), Tax Paid = Voorbelasting (5b).
        </p>
      </div>

      {/* Search */}
      {taxPeriods.length > 4 && (
        <div className="relative w-full sm:w-72">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
          <Input
            placeholder="Search tax periods..."
            value={periodSearch}
            onChange={(e) => setPeriodSearch(e.target.value)}
            className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
          />
        </div>
      )}

      {/* Tax Periods Table */}
      <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={ft('bg-slate-50 border-b border-slate-200', 'bg-white/[0.02] border-b border-white/[0.06]')}>
                <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Period</th>
                <th className={`text-left text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Date Range</th>
                <th className={`text-center text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Status</th>
                <th className={`text-right text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>BTW Verschuldigd (5a)</th>
                <th className={`text-right text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Voorbelasting (5b)</th>
                <th className={`text-right text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Te betalen / ontvangen</th>
                <th className={`text-right text-xs font-medium uppercase tracking-wider px-5 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${ft('divide-slate-100', 'divide-white/[0.04]')}`}>
              {loadingPeriods ? (
                <tr>
                  <td colSpan={7} className={`px-5 py-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                    Loading tax periods...
                  </td>
                </tr>
              ) : filteredPeriods.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-5 py-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No tax periods yet</p>
                    <p className="text-sm mt-1">Go to the <button onClick={() => setActiveTab('btw')} className="text-blue-400 underline hover:opacity-80">BTW Aangifte</button> tab and select a quarter to create your first period.</p>
                  </td>
                </tr>
              ) : filteredPeriods.map((period) => {
                const netTax = period.net_tax ?? calcNetTax(period.tax_collected, period.tax_paid);
                return (
                  <tr key={period.id} className={`${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors cursor-pointer`} onClick={() => { setActiveTab('btw'); }}>
                    <td className={`px-5 py-3.5 ${ft('text-slate-900', 'text-white')} font-medium`}>{period.period_name}</td>
                    <td className={`px-5 py-3.5 ${ft('text-slate-500', 'text-zinc-400')} text-sm`}>{period.start_date} &rarr; {period.end_date}</td>
                    <td className="px-5 py-3.5 text-center">{getStatusBadge(period.status)}</td>
                    <td className={`px-5 py-3.5 text-right ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(period.tax_collected)}</td>
                    <td className={`px-5 py-3.5 text-right ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(period.tax_paid)}</td>
                    <td className={`px-5 py-3.5 text-right font-medium ${netTax >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {netTax >= 0 ? formatCurrency(netTax) : `${formatCurrency(Math.abs(netTax))} terug`}
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={ft('hover:bg-slate-100', 'hover:bg-white/[0.06]')}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                          <DropdownMenuItem onClick={() => setActiveTab('btw')} className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}>
                            <Calculator className="w-4 h-4 mr-2" />
                            View BTW Aangifte
                          </DropdownMenuItem>
                          {period.status === 'open' && (
                            <DropdownMenuItem onClick={() => handleFilePeriod(period)} className="text-green-400 hover:bg-green-500/10">
                              <FileText className="w-4 h-4 mr-2" />
                              Mark as Filed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-700')} />
                          <DropdownMenuItem
                            onClick={() => { setPeriodToDelete(period); setDeletePeriodDialogOpen(true); }}
                            className="text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // ── Main Render ─────────────────────────────────────────────────────
  return (
    <FinancePageTransition>
      <div className="space-y-6">
        {!embedded && (
          <PageHeader
            title="Tax Management"
            subtitle="Manage tax rates and track tax filing periods"
            icon={Percent}
          />
        )}

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] w-fit">
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rates'
                ? 'bg-blue-600 text-white'
                : ft('text-slate-500 hover:text-slate-700 hover:bg-slate-100', 'text-zinc-400 hover:text-white hover:bg-white/[0.06]')
            }`}
          >
            <Percent className="w-4 h-4 inline-block mr-2 -mt-0.5" />
            Tax Rates
          </button>
          <button
            onClick={() => setActiveTab('periods')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'periods'
                ? 'bg-blue-600 text-white'
                : ft('text-slate-500 hover:text-slate-700 hover:bg-slate-100', 'text-zinc-400 hover:text-white hover:bg-white/[0.06]')
            }`}
          >
            <Calendar className="w-4 h-4 inline-block mr-2 -mt-0.5" />
            Tax Periods
          </button>
          <button
            onClick={() => setActiveTab('btw')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'btw'
                ? 'bg-blue-600 text-white'
                : ft('text-slate-500 hover:text-slate-700 hover:bg-slate-100', 'text-zinc-400 hover:text-white hover:bg-white/[0.06]')
            }`}
          >
            <Calculator className="w-4 h-4 inline-block mr-2 -mt-0.5" />
            BTW Aangifte
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'rates' && renderTaxRatesTab()}
        {activeTab === 'periods' && renderTaxPeriodsTab()}
        {activeTab === 'btw' && <FinanceBTWAangifte embedded />}

        {/* ── Tax Rate Modal ──────────────────────────────────────────── */}
        <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
          <DialogContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} sm:max-w-md`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>
                {editingRate ? 'Edit Tax Rate' : 'Create Tax Rate'}
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editingRate ? 'Update the tax rate details below.' : 'Add a new tax rate for your organization.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Name</Label>
                <Input
                  placeholder="e.g. Standard VAT"
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 21"
                  value={rateForm.rate}
                  onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  value={rateForm.description}
                  onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rateForm.is_default}
                    onChange={(e) => setRateForm({ ...rateForm, is_default: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>Default rate</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rateForm.is_active}
                    onChange={(e) => setRateForm({ ...rateForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>Active</span>
                </label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRateModalOpen(false)} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button onClick={handleSaveRate} disabled={savingRate} className="bg-blue-600 hover:bg-blue-700">
                {savingRate ? 'Saving...' : editingRate ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Rate Confirmation ────────────────────────────────── */}
        <Dialog open={deleteRateDialogOpen} onOpenChange={setDeleteRateDialogOpen}>
          <DialogContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} sm:max-w-sm`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>Delete Tax Rate</DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Are you sure you want to delete <span className="font-medium text-white">"{rateToDelete?.name}"</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteRateDialogOpen(false)} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button onClick={handleDeleteRate} className="bg-red-600 hover:bg-red-700 text-white">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Period Confirmation ───────────────────────────────── */}
        <Dialog open={deletePeriodDialogOpen} onOpenChange={setDeletePeriodDialogOpen}>
          <DialogContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} sm:max-w-sm`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>Delete Tax Period</DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Are you sure you want to delete <span className="font-medium text-white">"{periodToDelete?.period_name}"</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeletePeriodDialogOpen(false)} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button onClick={handleDeletePeriod} className="bg-red-600 hover:bg-red-700 text-white">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FinancePageTransition>
  );
}
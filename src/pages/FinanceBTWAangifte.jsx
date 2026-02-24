import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';
import {
  FileText, Calculator, Calendar, Save, CheckCircle2, Loader2,
  ChevronDown, ArrowRight, Euro
} from 'lucide-react';
import { BTW_RUBRIC_LABELS, getRubricColor } from '@/lib/btwRules';

const RUBRIC_SECTIONS = [
  {
    id: 'section1',
    title: '1. Prestaties binnenland',
    description: 'Leveringen en diensten in Nederland',
    rubrics: ['1a', '1b', '1c', '1d', '1e'],
    showOmzet: true,
    showBTW: true,
  },
  {
    id: 'section2',
    title: '2. Verleggingsregelingen binnenland',
    description: 'Verlegde BTW binnen Nederland',
    rubrics: ['2a'],
    showOmzet: true,
    showBTW: true,
  },
  {
    id: 'section3',
    title: '3. Prestaties naar/in het buitenland',
    description: 'Leveringen naar EU en buiten EU',
    rubrics: ['3a', '3b', '3c'],
    showOmzet: true,
    showBTW: false,
  },
  {
    id: 'section4',
    title: '4. Prestaties vanuit het buitenland aan u verricht',
    description: 'Aankopen uit EU en buiten EU (verlegde BTW)',
    rubrics: ['4a', '4b'],
    showOmzet: true,
    showBTW: true,
  },
  {
    id: 'section5',
    title: '5. Berekening',
    description: 'Verschuldigde en terug te vragen BTW',
    rubrics: ['5a', '5b', '5c', '5d'],
    showOmzet: false,
    showBTW: true,
    isTotal: true,
  },
];

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '€ 0,00';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function FinanceBTWAangifte({ embedded = false }) {
  const { user, company } = useUser();
  const { ft } = useTheme();
  const companyId = company?.id || user?.company_id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aangifte, setAangifte] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // Load tax periods
  useEffect(() => {
    if (!companyId) return;
    loadPeriods();
  }, [companyId]);

  async function loadPeriods() {
    const { data } = await supabase
      .from('tax_periods')
      .select('*')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false });
    setPeriods(data || []);
  }

  async function loadAangifte(startDate, endDate) {
    if (!companyId || !startDate || !endDate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('compute_btw_aangifte', {
        p_company_id: companyId,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
      setAangifte(data);
    } catch (err) {
      console.error('Error loading BTW aangifte:', err);
      toast.error('Kon BTW aangifte niet laden');
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodSelect(periodId) {
    setSelectedPeriodId(periodId);
    const period = periods.find(p => p.id === periodId);
    if (period) {
      setCustomRange({ start: period.start_date, end: period.end_date });
      loadAangifte(period.start_date, period.end_date);
    }
  }

  function handleCustomRangeLoad() {
    if (customRange.start && customRange.end) {
      setSelectedPeriodId(null);
      loadAangifte(customRange.start, customRange.end);
    }
  }

  async function handleSave() {
    if (!selectedPeriodId || !aangifte) {
      toast.error('Selecteer een periode en bereken eerst de aangifte');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tax_periods')
        .update({ btw_rubric_data: aangifte, updated_at: new Date().toISOString() })
        .eq('id', selectedPeriodId);
      if (error) throw error;
      toast.success('BTW aangifte opgeslagen');
    } catch (err) {
      console.error('Error saving:', err);
      toast.error('Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkFiled() {
    if (!selectedPeriodId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tax_periods')
        .update({
          status: 'filed',
          filed_at: new Date().toISOString(),
          btw_rubric_data: aangifte,
          tax_collected: aangifte?.['5a']?.btw || 0,
          tax_paid: aangifte?.['5b']?.btw || 0,
          net_tax: aangifte?.['5c']?.btw || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPeriodId);
      if (error) throw error;
      toast.success('BTW aangifte gemarkeerd als ingediend');
      loadPeriods();
    } catch (err) {
      console.error('Error filing:', err);
      toast.error('Markeren mislukt');
    } finally {
      setSaving(false);
    }
  }

  // ── Quarter definitions (NL BTW standard) ──────────────────────────────
  const QUARTER_MONTHS = [
    { q: 1, startMonth: 0, endMonth: 2, label: '1 jan – 31 mrt', deadline: '30 apr' },
    { q: 2, startMonth: 3, endMonth: 5, label: '1 apr – 30 jun', deadline: '31 jul' },
    { q: 3, startMonth: 6, endMonth: 8, label: '1 jul – 30 sep', deadline: '31 okt' },
    { q: 4, startMonth: 9, endMonth: 11, label: '1 okt – 31 dec', deadlineLabel: '31 jan volgend jaar' },
  ];

  const quarterOptions = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const years = [thisYear, thisYear - 1];
    const options = [];
    for (const year of years) {
      for (const qm of QUARTER_MONTHS) {
        const startDate = `${year}-${String(qm.startMonth + 1).padStart(2, '0')}-01`;
        const endDate = new Date(year, qm.endMonth + 1, 0); // last day of end month
        const endStr = endDate.toISOString().split('T')[0];
        const name = `Q${qm.q} ${year}`;
        const deadlineStr = qm.q === 4
          ? `31 jan ${year + 1}`
          : qm.deadline + ` ${year}`;
        // Check if this quarter is the current one
        const isCurrent = year === thisYear && Math.floor(now.getMonth() / 3) + 1 === qm.q;
        // Check if already exists in periods
        const existing = periods.find(p => p.period_name === name);
        options.push({
          value: name,
          label: `Q${qm.q} ${year} (${qm.label})`,
          deadline: deadlineStr,
          startDate,
          endDate: endStr,
          isCurrent,
          existing,
        });
      }
    }
    return options;
  }, [periods]);

  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Auto-select and load current quarter on mount
  useEffect(() => {
    if (quarterOptions.length > 0 && !autoLoaded && companyId) {
      const current = quarterOptions.find(q => q.isCurrent);
      if (current) {
        setAutoLoaded(true);
        handleQuarterSelect(current.value);
      }
    }
  }, [quarterOptions, companyId, autoLoaded]);

  async function handleQuarterSelect(quarterValue) {
    setSelectedQuarter(quarterValue);
    const quarter = quarterOptions.find(q => q.value === quarterValue);
    if (!quarter || !companyId) return;

    // Check if tax_period exists, create if not
    let period = periods.find(p => p.period_name === quarter.value);
    if (!period) {
      try {
        const { data, error } = await supabase
          .from('tax_periods')
          .insert({
            company_id: companyId,
            period_name: quarter.value,
            start_date: quarter.startDate,
            end_date: quarter.endDate,
            status: 'open',
          })
          .select()
          .single();
        if (error && error.message?.includes('duplicate')) {
          // Already exists, reload and find it
          await loadPeriods();
          period = (await supabase.from('tax_periods').select('*').eq('company_id', companyId).eq('period_name', quarter.value).single()).data;
        } else if (error) {
          throw error;
        } else {
          period = data;
          await loadPeriods();
        }
      } catch (err) {
        toast.error('Kon periode niet aanmaken');
        return;
      }
    }

    if (period) {
      setSelectedPeriodId(period.id);
      setCustomRange({ start: quarter.startDate, end: quarter.endDate });
      loadAangifte(quarter.startDate, quarter.endDate);
    }
  }

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
  const activeQuarterOption = quarterOptions.find(q => q.value === selectedQuarter);

  function getRubricValue(rubric, field) {
    if (!aangifte || !aangifte[rubric]) return 0;
    return parseFloat(aangifte[rubric][field]) || 0;
  }

  const content = (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Quarter Dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className={`text-sm font-medium ${ft('text-slate-700', 'text-zinc-300')}`}>
                  Periode
                </span>
              </div>
              <select
                value={selectedQuarter}
                onChange={(e) => handleQuarterSelect(e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border min-w-[280px] ${
                  ft('bg-white border-slate-200 text-slate-800', 'bg-zinc-800 border-zinc-700 text-white')
                }`}
              >
                <option value="">Selecteer kwartaal...</option>
                {quarterOptions.map(q => (
                  <option key={q.value} value={q.value}>
                    {q.label}{q.existing?.status === 'filed' ? ' ✓' : ''}{q.isCurrent ? ' (huidig)' : ''}
                  </option>
                ))}
              </select>
              {activeQuarterOption && (
                <span className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>
                  Deadline: {activeQuarterOption.deadline}
                </span>
              )}
              {selectedPeriod?.status === 'filed' && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ingediend
                </Badge>
              )}
            </div>

            {/* Custom date range */}
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => { setCustomRange(prev => ({ ...prev, start: e.target.value })); setSelectedQuarter(''); }}
                className={`px-2 py-1 rounded text-xs ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')} border`}
              />
              <ArrowRight className="w-3 h-3 text-zinc-500" />
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => { setCustomRange(prev => ({ ...prev, end: e.target.value })); setSelectedQuarter(''); }}
                className={`px-2 py-1 rounded text-xs ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')} border`}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCustomRangeLoad}
                disabled={!customRange.start || !customRange.end}
                className="text-xs"
              >
                <Calculator className="w-3 h-3 mr-1" />
                Bereken
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="ml-2 text-sm text-zinc-400">BTW aangifte berekenen...</span>
        </div>
      )}

      {/* Aangifte Content */}
      {!loading && aangifte && (
        <div className="space-y-4">
          {RUBRIC_SECTIONS.map(section => (
            <RubricSection
              key={section.id}
              section={section}
              aangifte={aangifte}
              ft={ft}
            />
          ))}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            {selectedPeriod && (
              <>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Opslaan
                </Button>
                {selectedPeriod.status !== 'filed' && (
                  <Button
                    onClick={handleMarkFiled}
                    disabled={saving}
                    variant="outline"
                    className={ft('border-green-300 text-green-700 hover:bg-green-50', 'border-green-600/50 text-green-400 hover:bg-green-500/10')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Markeer als ingediend
                  </Button>
                )}
                {selectedPeriod.status === 'filed' && (
                  <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ingediend op {new Date(selectedPeriod.filed_at).toLocaleDateString('nl-NL')}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !aangifte && (
        <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <h3 className={`text-lg font-medium ${ft('text-slate-700', 'text-zinc-300')} mb-2`}>
              Selecteer een periode
            </h3>
            <p className={`text-sm ${ft('text-slate-500', 'text-zinc-500')}`}>
              Kies een belastingperiode hierboven of maak een nieuw kwartaal aan om je BTW aangifte te berekenen.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <PageHeader
            title="BTW Aangifte"
            description="Overzicht BTW-aangifte per periode (rubrieken Belastingdienst)"
          />
          {content}
        </div>
      </div>
    </FinancePageTransition>
  );
}

function RubricSection({ section, aangifte, ft }) {
  return (
    <Card className={`${ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')} overflow-hidden`}>
      <CardHeader className={`pb-2 ${section.isTotal ? ft('bg-blue-50', 'bg-blue-500/5') : ''}`}>
        <CardTitle className={`text-sm flex items-center gap-2 ${ft('text-slate-800', 'text-zinc-200')}`}>
          {section.title}
        </CardTitle>
        <p className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>{section.description}</p>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className={ft('bg-slate-50 border-b border-slate-200', 'bg-white/[0.02] border-b border-zinc-800')}>
              <th className={`text-left px-4 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-500')}`}>
                Rubriek
              </th>
              <th className={`text-left px-4 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-500')}`}>
                Omschrijving
              </th>
              {section.showOmzet && (
                <th className={`text-right px-4 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-500')}`}>
                  Omzet
                </th>
              )}
              {section.showBTW && (
                <th className={`text-right px-4 py-2 text-xs font-medium ${ft('text-slate-500', 'text-zinc-500')}`}>
                  BTW
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {section.rubrics.map(rubric => {
              const label = BTW_RUBRIC_LABELS[rubric];
              const color = getRubricColor(rubric);
              const omzet = aangifte?.[rubric]?.omzet || 0;
              const btw = aangifte?.[rubric]?.btw || 0;
              const is5c = rubric === '5c';
              const isNegative = is5c && btw < 0;

              return (
                <tr
                  key={rubric}
                  className={`${ft('border-b border-slate-100 hover:bg-slate-50', 'border-b border-zinc-800/50 hover:bg-white/[0.02]')} ${
                    section.isTotal && rubric === '5c'
                      ? ft('bg-blue-50/50', 'bg-blue-500/5')
                      : ''
                  }`}
                >
                  <td className="px-4 py-2.5">
                    {color && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${color.bg} ${color.text} ${color.border} border`}>
                        {rubric}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>
                    {label?.label || rubric}
                    {label?.rate && (
                      <span className={`ml-2 text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                        ({label.rate})
                      </span>
                    )}
                  </td>
                  {section.showOmzet && (
                    <td className={`px-4 py-2.5 text-sm text-right font-mono ${ft('text-slate-600', 'text-zinc-400')}`}>
                      {formatCurrency(omzet)}
                    </td>
                  )}
                  {section.showBTW && (
                    <td className={`px-4 py-2.5 text-sm text-right font-mono font-medium ${
                      isNegative
                        ? 'text-green-500'
                        : section.isTotal
                          ? ft('text-blue-600', 'text-blue-400')
                          : ft('text-slate-700', 'text-zinc-300')
                    }`}>
                      {formatCurrency(btw)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

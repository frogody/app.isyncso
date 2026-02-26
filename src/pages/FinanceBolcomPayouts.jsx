import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  Globe, DollarSign, TrendingDown, Wallet, Receipt, ChevronDown, ChevronRight,
  Search, Calendar, Package, Truck, Box, ArrowUpDown, Loader2, FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

export default function FinanceBolcomPayouts({ embedded = false }) {
  const { ft } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id || user?.organization_id;

  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPayout, setExpandedPayout] = useState(null);
  const [payoutLines, setPayoutLines] = useState({});
  const [loadingLines, setLoadingLines] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('period_start');
  const [sortDir, setSortDir] = useState('desc');

  const fmt = (num) => {
    if (num === null || num === undefined || num === '') return '\u20AC0.00';
    return `\u20AC${Number(num).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtDate = (d) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Fetch payouts
  useEffect(() => {
    if (!companyId) return;
    const fetchPayouts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bolcom_payouts')
        .select('*')
        .eq('company_id', companyId)
        .order('period_start', { ascending: false });

      if (!error) setPayouts(data || []);
      setLoading(false);
    };
    fetchPayouts();
  }, [companyId]);

  // Fetch payout lines when expanding
  const togglePayout = async (payoutId) => {
    if (expandedPayout === payoutId) {
      setExpandedPayout(null);
      return;
    }
    setExpandedPayout(payoutId);

    if (payoutLines[payoutId]) return; // already loaded

    setLoadingLines(prev => ({ ...prev, [payoutId]: true }));
    const { data, error } = await supabase
      .from('bolcom_payout_lines')
      .select('*')
      .eq('payout_id', payoutId)
      .order('line_type', { ascending: true })
      .range(0, 49999);

    if (!error) {
      setPayoutLines(prev => ({ ...prev, [payoutId]: data || [] }));
    }
    setLoadingLines(prev => ({ ...prev, [payoutId]: false }));
  };

  // Summary totals
  const totals = useMemo(() => {
    const sum = (field) => payouts.reduce((s, p) => s + (parseFloat(String(p[field])) || 0), 0);
    const gross = sum('gross_sales');
    const comm = sum('commissions');
    const ship = sum('shipping_costs');
    const pick = sum('pickpack_costs');
    const store = sum('storage_costs');
    const net = sum('net_payout');
    return { gross, comm, ship, pick, store, net, commPct: gross > 0 ? ((comm / gross) * 100).toFixed(1) : '0' };
  }, [payouts]);

  // Group payout lines by type
  const groupLines = (lines) => {
    const groups = {};
    (lines || []).forEach(line => {
      const type = line.line_type || 'other';
      if (!groups[type]) groups[type] = { lines: [], total: 0, count: 0 };
      groups[type].lines.push(line);
      groups[type].total += parseFloat(String(line.amount)) || 0;
      groups[type].count += 1;
    });
    return groups;
  };

  const lineTypeConfig = {
    sale: { label: 'Sales', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    commission: { label: 'Commissions', icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    shipping: { label: 'Shipping', icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    pickpack: { label: 'Pick & Pack', icon: Box, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    storage: { label: 'Storage', icon: Box, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    correction: { label: 'Corrections', icon: ArrowUpDown, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    other: { label: 'Other', icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  };

  // Filter payouts by search
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return payouts;
    const q = searchTerm.toLowerCase();
    return payouts.filter(p =>
      (p.invoice_number || '').toLowerCase().includes(q) ||
      (p.period_start || '').includes(q) ||
      (p.period_end || '').includes(q)
    );
  }, [payouts, searchTerm]);

  const content = (
    <FinancePageTransition>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/60 border-zinc-800/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Gross Sales</span>
              </div>
              <p className="text-xl font-semibold text-white">{fmt(totals.gross)}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/60 border-zinc-800/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Commissions</span>
              </div>
              <p className="text-xl font-semibold text-white">{fmt(totals.comm)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{totals.commPct}% of gross</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/60 border-zinc-800/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Costs</span>
              </div>
              <p className="text-xl font-semibold text-white">{fmt(totals.ship + totals.pick + totals.store)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Ship + Pick + Storage</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/60 border-zinc-800/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Net Payout</span>
              </div>
              <p className="text-xl font-semibold text-white">{fmt(totals.net)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by invoice number or period..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-900/60 border-zinc-800/60 text-white placeholder:text-zinc-600"
            />
          </div>
          <span className="text-sm text-zinc-500">{filtered.length} payout{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Payouts Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-zinc-900/60 border-zinc-800/60">
            <CardContent className="p-12 text-center">
              <Globe className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">No bol.com payouts found</p>
              <p className="text-zinc-600 text-xs mt-1">Import payouts from bol.com Settings to see them here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-zinc-500 uppercase tracking-wider">
              <div className="col-span-1"></div>
              <div className="col-span-2">Invoice</div>
              <div className="col-span-2">Period</div>
              <div className="col-span-2 text-right">Gross</div>
              <div className="col-span-2 text-right">Commissions</div>
              <div className="col-span-1 text-right">Costs</div>
              <div className="col-span-2 text-right">Net Payout</div>
            </div>

            {filtered.map((payout) => {
              const isExpanded = expandedPayout === payout.id;
              const gross = parseFloat(String(payout.gross_sales)) || 0;
              const comm = parseFloat(String(payout.commissions)) || 0;
              const costs = (parseFloat(String(payout.shipping_costs)) || 0)
                + (parseFloat(String(payout.pickpack_costs)) || 0)
                + (parseFloat(String(payout.storage_costs)) || 0);
              const net = parseFloat(String(payout.net_payout)) || 0;

              return (
                <div key={payout.id}>
                  <Card
                    className={`bg-zinc-900/60 border-zinc-800/60 cursor-pointer transition-colors hover:bg-zinc-900/80 ${isExpanded ? 'border-cyan-500/30' : ''}`}
                    onClick={() => togglePayout(payout.id)}
                  >
                    <CardContent className="p-0">
                      <div className="grid grid-cols-12 gap-2 items-center px-4 py-3">
                        <div className="col-span-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-white">{payout.invoice_number || '\u2014'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-zinc-300">
                            {fmtDate(payout.period_start)} \u2013 {fmtDate(payout.period_end)}
                          </p>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm text-emerald-400 font-medium">{fmt(gross)}</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm text-red-400">{fmt(comm)}</span>
                          {gross > 0 && (
                            <span className="text-xs text-zinc-600 ml-1">({((comm / gross) * 100).toFixed(1)}%)</span>
                          )}
                        </div>
                        <div className="col-span-1 text-right">
                          <span className="text-sm text-zinc-400">{fmt(costs)}</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm text-cyan-400 font-semibold">{fmt(net)}</span>
                        </div>
                      </div>

                      {/* Cost breakdown row */}
                      <div className="px-4 pb-2 flex gap-4 text-xs text-zinc-500">
                        <span>Shipping: {fmt(payout.shipping_costs)}</span>
                        <span>Pick&Pack: {fmt(payout.pickpack_costs)}</span>
                        <span>Storage: {fmt(payout.storage_costs)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expanded: Payout Lines */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 mb-3">
                      {loadingLines[payout.id] ? (
                        <div className="flex items-center gap-2 py-6 justify-center">
                          <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                          <span className="text-sm text-zinc-500">Loading line items...</span>
                        </div>
                      ) : (
                        (() => {
                          const lines = payoutLines[payout.id] || [];
                          const groups = groupLines(lines);
                          const sortedTypes = Object.keys(groups).sort((a, b) => {
                            const order = ['sale', 'commission', 'shipping', 'pickpack', 'storage', 'correction', 'other'];
                            return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
                          });

                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">{lines.length.toLocaleString()} line items</span>
                              </div>

                              {sortedTypes.map(type => {
                                const group = groups[type];
                                const cfg = lineTypeConfig[type] || lineTypeConfig.other;
                                const Icon = cfg.icon;

                                return (
                                  <Card key={type} className="bg-zinc-950/60 border-zinc-800/40">
                                    <CardContent className="p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                                            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                          </div>
                                          <span className="text-sm font-medium text-white">{cfg.label}</span>
                                          <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
                                            {group.count.toLocaleString()}
                                          </Badge>
                                        </div>
                                        <span className={`text-sm font-medium ${group.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {fmt(group.total)}
                                        </span>
                                      </div>

                                      {/* Show first 10 lines, collapse rest */}
                                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                        {group.lines.slice(0, 50).map((line, idx) => (
                                          <div key={line.id || idx} className="grid grid-cols-12 gap-1 text-xs py-0.5 text-zinc-400 hover:text-zinc-300">
                                            <div className="col-span-3 truncate">{line.order_id || '\u2014'}</div>
                                            <div className="col-span-3 truncate">{line.ean || '\u2014'}</div>
                                            <div className="col-span-3 truncate">{line.description || line.line_type || '\u2014'}</div>
                                            <div className="col-span-1 text-right">{line.quantity || ''}</div>
                                            <div className="col-span-2 text-right font-medium">
                                              {fmt(line.amount)}
                                            </div>
                                          </div>
                                        ))}
                                        {group.lines.length > 50 && (
                                          <p className="text-xs text-zinc-600 pt-1">
                                            ... and {(group.lines.length - 50).toLocaleString()} more
                                          </p>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FinancePageTransition>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-black p-6">
      <PageHeader
        title="bol.com Payouts"
        subtitle="View payout invoices, commissions, and cost breakdowns from bol.com"
        icon={Globe}
      />
      <div className="mt-6">{content}</div>
    </div>
  );
}

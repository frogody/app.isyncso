import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@/api/supabaseClient';
import { Proposal, Prospect, Invoice, Subscription } from '@/api/entities';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileText, Plus, Search, Filter, Download, Send, Check, Clock, AlertCircle,
  MoreVertical, Eye, Edit2, Trash2, Copy, ArrowRight, X, ChevronDown,
  ArrowUpDown, Calendar, Euro, Building2, User, Mail, CheckCircle2,
  XCircle, FileCheck, Loader2, RefreshCw, Sun, Moon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GlassCard, StatCard } from '@/components/ui/GlassCard';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/components/context/PermissionContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

const getStatusConfig = (ft) => ({
  draft: { label: 'Draft', color: ft('bg-slate-200/50 text-slate-500 border-slate-300', 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'), icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Eye },
  accepted: { label: 'Accepted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  expired: { label: 'Expired', color: ft('bg-slate-200/50 text-slate-500 border-slate-300', 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'), icon: Clock }
});

export default function FinanceProposals() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { theme, toggleTheme, ft } = useTheme();

  const STATUS_CONFIG = useMemo(() => getStatusConfig(ft), [ft]);

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [proposalData, prospectData] = await Promise.all([
        Proposal.list?.({ limit: 200 }).catch(() => []) || [],
        Prospect.list?.({ limit: 200 }).catch(() => []) || []
      ]);
      setProposals(proposalData);
      setProspects(prospectData);
    } catch (error) {
      console.error('Error loading proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort proposals
  const filteredProposals = useMemo(() => {
    let result = [...proposals];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.title || '').toLowerCase().includes(query) ||
        (p.proposal_number || '').toLowerCase().includes(query) ||
        (p.client_name || '').toLowerCase().includes(query) ||
        (p.client_company || '').toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.created_at || 0) - new Date(a.created_at || 0);
          break;
        case 'amount':
          comparison = (b.total || 0) - (a.total || 0);
          break;
        case 'client':
          comparison = (a.client_name || '').localeCompare(b.client_name || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [proposals, searchQuery, statusFilter, sortBy, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = proposals.length;
    const totalValue = proposals.reduce((sum, p) => sum + (p.total || 0), 0);
    const accepted = proposals.filter(p => p.status === 'accepted');
    const acceptedValue = accepted.reduce((sum, p) => sum + (p.total || 0), 0);
    const pending = proposals.filter(p => ['draft', 'sent', 'viewed'].includes(p.status));
    const pendingValue = pending.reduce((sum, p) => sum + (p.total || 0), 0);
    const conversionRate = total > 0 ? ((accepted.length / total) * 100).toFixed(1) : 0;

    return { total, totalValue, accepted: accepted.length, acceptedValue, pending: pending.length, pendingValue, conversionRate };
  }, [proposals]);

  const handleCreateProposal = () => {
    navigate(createPageUrl('FinanceProposalBuilder'));
  };

  const handleEditProposal = (proposal) => {
    navigate(createPageUrl(`FinanceProposalBuilder?id=${proposal.id}`));
  };

  const handleDuplicateProposal = async (proposal) => {
    try {
      const { id, created_at, updated_at, proposal_number, status, sent_at, viewed_at, signed_at, ...rest } = proposal;
      const newProposal = await Proposal.create({
        ...rest,
        title: `${proposal.title || 'Proposal'} (Copy)`,
        status: 'draft'
      });
      setProposals(prev => [newProposal, ...prev]);
      toast.success('Proposal duplicated');
    } catch (error) {
      console.error('Error duplicating proposal:', error);
      toast.error('Failed to duplicate proposal');
    }
  };

  const handleDeleteProposal = (proposal) => {
    setDeleteTarget(proposal);
  };

  const confirmDeleteProposal = async () => {
    if (!deleteTarget) return;
    try {
      await Proposal.delete(deleteTarget.id);
      setProposals(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast.success('Proposal deleted');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Failed to delete proposal');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSendProposal = async (proposal) => {
    if (!proposal.client_email) {
      toast.error('Client email is required to send the proposal');
      return;
    }

    try {
      // Get current user info for sender details
      const me = await db.auth.me();

      // Send the email via edge function
      const emailResponse = await fetch(
        `https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/send-proposal-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await db.auth.getSession())?.access_token || ''}`
          },
          body: JSON.stringify({
            to: proposal.client_email,
            clientName: proposal.client_name,
            proposalTitle: proposal.title,
            proposalId: proposal.id,
            senderName: me?.full_name,
            senderCompany: me?.company_name || 'iSyncSO',
            total: proposal.total,
            currency: proposal.currency || 'EUR',
            validUntil: proposal.valid_until,
            introduction: proposal.introduction
          })
        }
      );

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        throw new Error(emailResult.error || 'Failed to send email');
      }

      // Update proposal status
      await Proposal.update(proposal.id, {
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      setProposals(prev => prev.map(p =>
        p.id === proposal.id ? { ...p, status: 'sent', sent_at: new Date().toISOString() } : p
      ));

      toast.success('Proposal sent successfully');
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast.error(error.message || 'Failed to send proposal');
    }
  };

  const handleConvertToInvoice = async (proposal) => {
    setConverting(true);
    try {
      const me = await db.auth.me();

      // Create invoice from proposal
      const invoiceData = {
        user_id: me?.id,
        company_id: me?.company_id,
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        client_name: proposal.client_name,
        client_email: proposal.client_email,
        client_address: proposal.client_address || {},
        total: proposal.total || 0,
        status: 'draft',
        description: proposal.title,
        items: proposal.line_items || [],
        proposal_id: proposal.id,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      };

      const newInvoice = await Invoice.create(invoiceData);

      // Auto-create subscriptions for subscription line items
      const subscriptionItems = (proposal.line_items || []).filter(item => item.is_subscription);
      for (const item of subscriptionItems) {
        try {
          await Subscription.create({
            company_id: me?.company_id,
            product_id: item.product_id,
            plan_id: item.plan_id,
            plan_name: item.plan_name,
            billing_cycle: item.billing_cycle || 'monthly',
            amount: item.unit_price,
            status: 'active',
            invoice_id: newInvoice?.id,
            client_name: proposal.client_name,
            client_email: proposal.client_email,
            start_date: new Date().toISOString()
          });
        } catch (subErr) {
          console.warn('Could not create subscription:', subErr);
        }
      }

      // Update proposal with conversion info
      await Proposal.update(proposal.id, {
        converted_to_invoice_id: newInvoice.id,
        converted_at: new Date().toISOString(),
        status: 'accepted'
      });

      setProposals(prev => prev.map(p =>
        p.id === proposal.id ? {
          ...p,
          converted_to_invoice_id: newInvoice.id,
          converted_at: new Date().toISOString(),
          status: 'accepted'
        } : p
      ));

      toast.success(`Invoice created${subscriptionItems.length > 0 ? ` with ${subscriptionItems.length} subscription(s)` : ''}`);
      setShowDetailModal(false);

      // Optionally navigate to invoice
      // navigate(createPageUrl('FinanceInvoices'));
    } catch (error) {
      console.error('Error converting to invoice:', error);
      toast.error('Failed to convert to invoice');
    } finally {
      setConverting(false);
    }
  };

  const getProspectName = (prospectId) => {
    const prospect = prospects.find(p => p.id === prospectId);
    return prospect?.company_name || prospect?.contact_name || null;
  };

  if (loading || permLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className={`h-10 w-48 ${ft('bg-slate-200', 'bg-zinc-800')}`} />
          <Skeleton className={`h-10 w-32 ${ft('bg-slate-200', 'bg-zinc-800')}`} />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className={`h-24 ${ft('bg-slate-200', 'bg-zinc-800')}`} />
          ))}
        </div>
        <Skeleton className={`h-[400px] ${ft('bg-slate-200', 'bg-zinc-800')}`} />
      </div>
    );
  }

  return (
    <FinancePageTransition>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Proposals"
            subtitle="Create and manage sales proposals"
            icon={FileText}
            color="blue"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className={ft('text-slate-500 hover:text-slate-700 hover:bg-slate-100', 'text-zinc-400 hover:text-white hover:bg-zinc-800')}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={handleCreateProposal}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Proposal
                </Button>
              </div>
            }
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Proposals"
            value={stats.total}
            icon={FileText}
            color="blue"
          />
          <StatCard
            label="Total Value"
            value={`€${stats.totalValue.toLocaleString()}`}
            icon={Euro}
            color="blue"
          />
          <StatCard
            label="Accepted"
            value={`${stats.accepted} (€${stats.acceptedValue.toLocaleString()})`}
            icon={CheckCircle2}
            color="blue"
          />
          <StatCard
            label="Conversion Rate"
            value={`${stats.conversionRate}%`}
            icon={ArrowRight}
            color="blue"
          />
        </div>

        {/* Filters & Search */}
        <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
          <CardContent className="p-3">
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                  <Input
                    placeholder="Search proposals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${ft('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status Filter Tabs */}
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList className={ft('bg-slate-100', 'bg-zinc-800')}>
                    <TabsTrigger value="all" className="data-[state=active]:bg-blue-500">All</TabsTrigger>
                    <TabsTrigger value="draft" className={`data-[state=active]:${ft('bg-slate-300', 'bg-zinc-600')}`}>Draft</TabsTrigger>
                    <TabsTrigger value="sent" className="data-[state=active]:bg-blue-500">Sent</TabsTrigger>
                    <TabsTrigger value="accepted" className="data-[state=active]:bg-blue-500">Accepted</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Sort Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('desc'); }} className={ft('text-slate-600', 'text-zinc-300')}>
                      Newest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('asc'); }} className={ft('text-slate-600', 'text-zinc-300')}>
                      Oldest First
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                    <DropdownMenuItem onClick={() => { setSortBy('amount'); setSortOrder('desc'); }} className={ft('text-slate-600', 'text-zinc-300')}>
                      Highest Value
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('client'); setSortOrder('asc'); }} className={ft('text-slate-600', 'text-zinc-300')}>
                      Client Name A-Z
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposals List */}
        <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg ${ft('text-slate-900', 'text-white')}`}>
              {filteredProposals.length} {filteredProposals.length === 1 ? 'Proposal' : 'Proposals'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProposals.length === 0 ? (
              <div className="text-center py-12">
                <FileText className={`w-12 h-12 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>No proposals found</h3>
                <p className={`${ft('text-slate-500', 'text-zinc-400')} mb-4`}>
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first proposal to get started'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={handleCreateProposal} className="bg-blue-500 hover:bg-blue-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Proposal
                  </Button>
                )}
              </div>
            ) : (
              <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                {filteredProposals.map((proposal, idx) => {
                  const StatusIcon = STATUS_CONFIG[proposal.status]?.icon || FileText;
                  const statusConfig = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;

                  return (
                    <div
                      key={proposal.id}
                      className={`group flex items-center gap-2 px-3 py-2 ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-all cursor-pointer`}
                      onClick={() => { setSelectedProposal(proposal); setShowDetailModal(true); }}
                    >
                      {/* Icon */}
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>
                            {proposal.proposal_number || 'DRAFT'}
                          </span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-px ${statusConfig.color}`}>
                            <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                            {statusConfig.label}
                          </Badge>
                          {proposal.converted_to_invoice_id && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-px bg-blue-500/20 text-blue-400 border-blue-500/30">
                              <FileCheck className="w-2.5 h-2.5 mr-0.5" />
                              Converted
                            </Badge>
                          )}
                        </div>
                        <h4 className={`text-sm font-medium ${ft('text-slate-900', 'text-white')} truncate`}>
                          {proposal.title || 'Untitled Proposal'}
                        </h4>
                        <div className={`flex items-center gap-3 text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {proposal.client_company || proposal.client_name || 'No client'}
                          </span>
                          {proposal.valid_until && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Valid until {new Date(proposal.valid_until).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${ft('text-slate-900', 'text-white')}`}>
                          €{(proposal.total || 0).toLocaleString()}
                        </p>
                        <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>
                          {new Date(proposal.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={ft('text-slate-400 hover:text-slate-700', 'text-zinc-400 hover:text-white')}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} align="end">
                            <DropdownMenuItem
                              onClick={() => { setSelectedProposal(proposal); setShowDetailModal(true); }}
                              className={ft('text-slate-600 hover:bg-slate-50', 'text-zinc-300 hover:bg-zinc-800')}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditProposal(proposal)}
                              className={ft('text-slate-600 hover:bg-slate-50', 'text-zinc-300 hover:bg-zinc-800')}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateProposal(proposal)}
                              className={ft('text-slate-600 hover:bg-slate-50', 'text-zinc-300 hover:bg-zinc-800')}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            {proposal.status === 'draft' && proposal.client_email && (
                              <DropdownMenuItem
                                onClick={() => handleSendProposal(proposal)}
                                className={`text-blue-400 ${ft('hover:bg-slate-50', 'hover:bg-zinc-800')}`}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Send Proposal
                              </DropdownMenuItem>
                            )}
                            {!proposal.converted_to_invoice_id && ['accepted', 'viewed', 'sent'].includes(proposal.status) && (
                              <DropdownMenuItem
                                onClick={() => { setSelectedProposal(proposal); handleConvertToInvoice(proposal); }}
                                className={`text-blue-400 ${ft('hover:bg-slate-50', 'hover:bg-zinc-800')}`}
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Convert to Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                            <DropdownMenuItem
                              onClick={() => handleDeleteProposal(proposal)}
                              className={`text-red-400 ${ft('hover:bg-slate-50', 'hover:bg-zinc-800')}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proposal Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                {selectedProposal?.proposal_number || 'Proposal Details'}
              </DialogTitle>
            </DialogHeader>

            {selectedProposal && (
              <div className="space-y-6">
                {/* Status & Value */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`${STATUS_CONFIG[selectedProposal.status]?.color || ''}`}>
                    {STATUS_CONFIG[selectedProposal.status]?.label || selectedProposal.status}
                  </Badge>
                  <p className={`text-3xl font-bold ${ft('text-slate-900', 'text-white')}`}>
                    €{(selectedProposal.total || 0).toLocaleString()}
                  </p>
                </div>

                {/* Title */}
                <div>
                  <h3 className={`text-xl font-semibold ${ft('text-slate-900', 'text-white')}`}>
                    {selectedProposal.title || 'Untitled Proposal'}
                  </h3>
                  {selectedProposal.introduction && (
                    <p className={`${ft('text-slate-500', 'text-zinc-400')} mt-2 text-sm`}>{selectedProposal.introduction}</p>
                  )}
                </div>

                {/* Client Info */}
                <div className={`space-y-3 ${ft('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-4`}>
                  <h4 className={`text-sm font-medium ${ft('text-slate-500', 'text-zinc-400')} mb-3`}>Client Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className={`${ft('text-slate-400', 'text-zinc-500')} text-xs`}>Company</span>
                      <p className={ft('text-slate-900', 'text-white')}>{selectedProposal.client_company || '-'}</p>
                    </div>
                    <div>
                      <span className={`${ft('text-slate-400', 'text-zinc-500')} text-xs`}>Contact</span>
                      <p className={ft('text-slate-900', 'text-white')}>{selectedProposal.client_name || '-'}</p>
                    </div>
                    <div>
                      <span className={`${ft('text-slate-400', 'text-zinc-500')} text-xs`}>Email</span>
                      <p className={ft('text-slate-900', 'text-white')}>{selectedProposal.client_email || '-'}</p>
                    </div>
                    <div>
                      <span className={`${ft('text-slate-400', 'text-zinc-500')} text-xs`}>Valid Until</span>
                      <p className={ft('text-slate-900', 'text-white')}>
                        {selectedProposal.valid_until
                          ? new Date(selectedProposal.valid_until).toLocaleDateString()
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                {selectedProposal.line_items?.length > 0 && (
                  <div className={`space-y-3 ${ft('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-4`}>
                    <h4 className={`text-sm font-medium ${ft('text-slate-500', 'text-zinc-400')} mb-3`}>Line Items</h4>
                    <div className="space-y-2">
                      {selectedProposal.line_items.map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between py-2 border-b ${ft('border-slate-200/50', 'border-zinc-700/50')} last:border-0`}>
                          <div className="flex items-center gap-3">
                            {item.is_subscription ? (
                              <RefreshCw className="w-4 h-4 text-blue-400" />
                            ) : (
                              <FileText className={`w-4 h-4 ${ft('text-slate-400', 'text-zinc-400')}`} />
                            )}
                            <div>
                              <p className={`${ft('text-slate-900', 'text-white')} text-sm`}>{item.name || item.description}</p>
                              {item.is_subscription && (
                                <p className="text-xs text-blue-400">{item.billing_cycle}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`${ft('text-slate-900', 'text-white')} font-medium`}>
                              €{((item.quantity || 1) * (item.unit_price || 0)).toLocaleString()}
                            </p>
                            {item.quantity > 1 && (
                              <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>{item.quantity} x €{item.unit_price}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className={`pt-3 border-t ${ft('border-slate-200', 'border-zinc-700')} space-y-2`}>
                      <div className="flex justify-between text-sm">
                        <span className={ft('text-slate-500', 'text-zinc-400')}>Subtotal</span>
                        <span className={ft('text-slate-900', 'text-white')}>€{(selectedProposal.subtotal || selectedProposal.total || 0).toLocaleString()}</span>
                      </div>
                      {selectedProposal.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className={ft('text-slate-500', 'text-zinc-400')}>Discount</span>
                          <span className="text-blue-400">-€{selectedProposal.discount_amount.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedProposal.tax_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className={ft('text-slate-500', 'text-zinc-400')}>Tax ({selectedProposal.tax_percent}%)</span>
                          <span className={ft('text-slate-900', 'text-white')}>€{selectedProposal.tax_amount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className={`flex justify-between text-lg font-bold pt-2 border-t ${ft('border-slate-300', 'border-zinc-600')}`}>
                        <span className={ft('text-slate-900', 'text-white')}>Total</span>
                        <span className="text-blue-400">€{(selectedProposal.total || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tracking Info */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className={`${ft('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-3`}>
                    <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>Created</p>
                    <p className={`text-sm ${ft('text-slate-900', 'text-white')}`}>
                      {new Date(selectedProposal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedProposal.sent_at && (
                    <div className={`${ft('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-3`}>
                      <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>Sent</p>
                      <p className={`text-sm ${ft('text-slate-900', 'text-white')}`}>
                        {new Date(selectedProposal.sent_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedProposal.view_count > 0 && (
                    <div className={`${ft('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-3`}>
                      <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>Views</p>
                      <p className={`text-sm ${ft('text-slate-900', 'text-white')}`}>{selectedProposal.view_count}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className={`flex-1 ${ft('border-slate-200', 'border-zinc-700')}`}
                    onClick={() => handleEditProposal(selectedProposal)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {selectedProposal.status === 'draft' && (
                    <Button
                      className="flex-1 bg-blue-500 hover:bg-blue-600"
                      onClick={() => { handleSendProposal(selectedProposal); setShowDetailModal(false); }}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  )}
                  {!selectedProposal.converted_to_invoice_id && ['accepted', 'viewed', 'sent'].includes(selectedProposal.status) && (
                    <Button
                      className="flex-1 bg-blue-500 hover:bg-blue-600"
                      onClick={() => handleConvertToInvoice(selectedProposal)}
                      disabled={converting}
                    >
                      {converting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      Convert to Invoice
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Proposal"
        description={`Are you sure you want to delete this proposal? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteProposal}
      />
    </FinancePageTransition>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Proposal, Prospect, Invoice, Subscription } from '@/api/entities';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileText, Plus, Search, Filter, Download, Send, Check, Clock, AlertCircle,
  MoreVertical, Eye, Edit2, Trash2, Copy, ArrowRight, X, ChevronDown,
  ArrowUpDown, Calendar, DollarSign, Building2, User, Mail, CheckCircle2,
  XCircle, FileCheck, Loader2, RefreshCw
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
import { useUser } from '@/components/context/UserContext';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Eye },
  accepted: { label: 'Accepted', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock }
};

export default function FinanceProposals() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { hasPermission, isLoading: permLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

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
        Proposal.list?.({ limit: 500 }).catch(() => []) || [],
        Prospect.list?.({ limit: 500 }).catch(() => []) || []
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

  const handleDeleteProposal = async (proposal) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    try {
      await Proposal.delete(proposal.id);
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      toast.success('Proposal deleted');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Failed to delete proposal');
    }
  };

  const handleSendProposal = async (proposal) => {
    try {
      await Proposal.update(proposal.id, {
        status: 'sent',
        sent_at: new Date().toISOString()
      });
      setProposals(prev => prev.map(p =>
        p.id === proposal.id ? { ...p, status: 'sent', sent_at: new Date().toISOString() } : p
      ));
      toast.success('Proposal marked as sent');
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast.error('Failed to update proposal');
    }
  };

  const handleConvertToInvoice = async (proposal) => {
    setConverting(true);
    try {
      const me = await base44.auth.me();

      // Create invoice from proposal
      const invoiceData = {
        user_id: me?.id,
        company_id: me?.company_id,
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        client_name: proposal.client_name,
        client_email: proposal.client_email,
        client_address: JSON.stringify(proposal.client_address || {}),
        total: proposal.total || 0,
        status: 'draft',
        description: proposal.title,
        items: proposal.line_items || [],
        proposal_id: proposal.id
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
          <Skeleton className="h-10 w-48 bg-zinc-800" />
          <Skeleton className="h-10 w-32 bg-zinc-800" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 bg-zinc-800" />
          ))}
        </div>
        <Skeleton className="h-[400px] bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Proposals"
        subtitle="Create and manage sales proposals"
        icon={FileText}
        color="amber"
        actions={
          <Button
            onClick={handleCreateProposal}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Proposal
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Proposals"
          value={stats.total}
          icon={FileText}
          color="cyan"
        />
        <StatCard
          label="Total Value"
          value={`€${stats.totalValue.toLocaleString()}`}
          icon={DollarSign}
          color="sage"
        />
        <StatCard
          label="Accepted"
          value={`${stats.accepted} (€${stats.acceptedValue.toLocaleString()})`}
          icon={CheckCircle2}
          color="sage"
        />
        <StatCard
          label="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={ArrowRight}
          color="indigo"
        />
      </div>

      {/* Filters & Search */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter Tabs */}
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="bg-zinc-800">
                  <TabsTrigger value="all" className="data-[state=active]:bg-amber-500">All</TabsTrigger>
                  <TabsTrigger value="draft" className="data-[state=active]:bg-zinc-600">Draft</TabsTrigger>
                  <TabsTrigger value="sent" className="data-[state=active]:bg-blue-500">Sent</TabsTrigger>
                  <TabsTrigger value="accepted" className="data-[state=active]:bg-emerald-500">Accepted</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Sort Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                  <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('desc'); }} className="text-zinc-300">
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder('asc'); }} className="text-zinc-300">
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  <DropdownMenuItem onClick={() => { setSortBy('amount'); setSortOrder('desc'); }} className="text-zinc-300">
                    Highest Value
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy('client'); setSortOrder('asc'); }} className="text-zinc-300">
                    Client Name A-Z
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposals List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white">
            {filteredProposals.length} {filteredProposals.length === 1 ? 'Proposal' : 'Proposals'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProposals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No proposals found</h3>
              <p className="text-zinc-400 mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first proposal to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={handleCreateProposal} className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Proposal
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProposals.map((proposal, idx) => {
                const StatusIcon = STATUS_CONFIG[proposal.status]?.icon || FileText;
                const statusConfig = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;

                return (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group flex items-center gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-amber-500/30 transition-all cursor-pointer"
                    onClick={() => { setSelectedProposal(proposal); setShowDetailModal(true); }}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-amber-400" />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-zinc-500">
                          {proposal.proposal_number || 'DRAFT'}
                        </span>
                        <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {proposal.converted_to_invoice_id && (
                          <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <FileCheck className="w-3 h-3 mr-1" />
                            Converted
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-white truncate">
                        {proposal.title || 'Untitled Proposal'}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
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
                      <p className="text-lg font-bold text-white">
                        €{(proposal.total || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(proposal.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-900 border-zinc-700" align="end">
                          <DropdownMenuItem
                            onClick={() => { setSelectedProposal(proposal); setShowDetailModal(true); }}
                            className="text-zinc-300 hover:bg-zinc-800"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditProposal(proposal)}
                            className="text-zinc-300 hover:bg-zinc-800"
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicateProposal(proposal)}
                            className="text-zinc-300 hover:bg-zinc-800"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {proposal.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleSendProposal(proposal)}
                              className="text-blue-400 hover:bg-zinc-800"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {!proposal.converted_to_invoice_id && ['accepted', 'viewed', 'sent'].includes(proposal.status) && (
                            <DropdownMenuItem
                              onClick={() => { setSelectedProposal(proposal); handleConvertToInvoice(proposal); }}
                              className="text-emerald-400 hover:bg-zinc-800"
                            >
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Convert to Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-zinc-700" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteProposal(proposal)}
                            className="text-red-400 hover:bg-zinc-800"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposal Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
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
                <p className="text-3xl font-bold text-white">
                  €{(selectedProposal.total || 0).toLocaleString()}
                </p>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {selectedProposal.title || 'Untitled Proposal'}
                </h3>
                {selectedProposal.introduction && (
                  <p className="text-zinc-400 mt-2 text-sm">{selectedProposal.introduction}</p>
                )}
              </div>

              {/* Client Info */}
              <div className="space-y-3 bg-zinc-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Client Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-zinc-500 text-xs">Company</span>
                    <p className="text-white">{selectedProposal.client_company || '-'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs">Contact</span>
                    <p className="text-white">{selectedProposal.client_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs">Email</span>
                    <p className="text-white">{selectedProposal.client_email || '-'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs">Valid Until</span>
                    <p className="text-white">
                      {selectedProposal.valid_until
                        ? new Date(selectedProposal.valid_until).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {selectedProposal.line_items?.length > 0 && (
                <div className="space-y-3 bg-zinc-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">Line Items</h4>
                  <div className="space-y-2">
                    {selectedProposal.line_items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
                        <div className="flex items-center gap-3">
                          {item.is_subscription ? (
                            <RefreshCw className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-zinc-400" />
                          )}
                          <div>
                            <p className="text-white text-sm">{item.name || item.description}</p>
                            {item.is_subscription && (
                              <p className="text-xs text-cyan-400">{item.billing_cycle}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">
                            €{((item.quantity || 1) * (item.unit_price || 0)).toLocaleString()}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-zinc-500">{item.quantity} x €{item.unit_price}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="pt-3 border-t border-zinc-700 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Subtotal</span>
                      <span className="text-white">€{(selectedProposal.subtotal || selectedProposal.total || 0).toLocaleString()}</span>
                    </div>
                    {selectedProposal.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Discount</span>
                        <span className="text-emerald-400">-€{selectedProposal.discount_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedProposal.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Tax ({selectedProposal.tax_percent}%)</span>
                        <span className="text-white">€{selectedProposal.tax_amount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-600">
                      <span className="text-white">Total</span>
                      <span className="text-amber-400">€{(selectedProposal.total || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking Info */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Created</p>
                  <p className="text-sm text-white">
                    {new Date(selectedProposal.created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedProposal.sent_at && (
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Sent</p>
                    <p className="text-sm text-white">
                      {new Date(selectedProposal.sent_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedProposal.view_count > 0 && (
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">Views</p>
                    <p className="text-sm text-white">{selectedProposal.view_count}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700"
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
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
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
  );
}

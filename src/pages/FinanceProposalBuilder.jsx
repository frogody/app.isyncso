import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { Proposal, Prospect, Product, DigitalProduct, PhysicalProduct } from '@/api/entities';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileText, Save, Eye, Send, X, Plus, Trash2, ArrowLeft, ChevronDown,
  Building2, User, Mail, Calendar, DollarSign, Percent, Package,
  FileCheck, GripVertical, Settings, Sparkles, RefreshCw, Copy,
  Loader2, CheckCircle2, Type, Image, List, PenTool, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { ProductSelector } from '@/components/finance';
import { usePermissions } from '@/components/context/PermissionContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useUser } from '@/components/context/UserContext';
import ContactSelector from '@/components/shared/ContactSelector';

const SECTION_TYPES = [
  { id: 'text', label: 'Text Block', icon: Type, description: 'Rich text content' },
  { id: 'features', label: 'Features List', icon: List, description: 'Bullet points' },
  { id: 'timeline', label: 'Timeline', icon: Calendar, description: 'Project milestones' },
];

export default function FinanceProposalBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const { hasPermission, isLoading: permLoading } = usePermissions();

  const proposalId = searchParams.get('id');
  const prospectIdParam = searchParams.get('prospect');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prospects, setProspects] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [proposal, setProposal] = useState({
    title: '',
    status: 'draft',
    client_name: '',
    client_email: '',
    client_company: '',
    client_address: {},
    prospect_id: prospectIdParam || null,
    valid_until: '',
    introduction: '',
    sections: [],
    line_items: [],
    terms_and_conditions: '',
    discount_type: 'percent',
    discount_value: 0,
    tax_percent: 0,
    currency: 'EUR',
    signature_required: false,
    branding: {}
  });

  useEffect(() => {
    loadData();
  }, [proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load prospects for dropdown
      const prospectData = await Prospect.list?.({ limit: 500 }).catch(() => []) || [];
      setProspects(prospectData);

      // Load existing proposal if editing
      if (proposalId) {
        const existingProposal = await Proposal.get(proposalId);
        if (existingProposal) {
          setProposal({
            ...existingProposal,
            sections: existingProposal.sections || [],
            line_items: existingProposal.line_items || [],
            client_address: existingProposal.client_address || {},
            branding: existingProposal.branding || {}
          });
        }
      } else if (prospectIdParam) {
        // Pre-fill from prospect
        const prospect = prospectData.find(p => p.id === prospectIdParam);
        if (prospect) {
          setProposal(prev => ({
            ...prev,
            client_name: prospect.contact_name || '',
            client_email: prospect.contact_email || prospect.email || '',
            client_company: prospect.company_name || '',
            prospect_id: prospectIdParam
          }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate pricing
  const pricing = useMemo(() => {
    const subtotal = proposal.line_items.reduce((sum, item) => {
      return sum + ((item.quantity || 1) * (parseFloat(item.unit_price) || 0));
    }, 0);

    let discountAmount = 0;
    if (proposal.discount_type === 'percent') {
      discountAmount = subtotal * ((proposal.discount_value || 0) / 100);
    } else {
      discountAmount = parseFloat(proposal.discount_value) || 0;
    }

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * ((proposal.tax_percent || 0) / 100);
    const total = afterDiscount + taxAmount;

    return { subtotal, discountAmount, taxAmount, total };
  }, [proposal.line_items, proposal.discount_type, proposal.discount_value, proposal.tax_percent]);

  const handleSave = async (sendAfterSave = false) => {
    if (!proposal.title) {
      toast.error('Please enter a proposal title');
      return;
    }

    setSaving(true);
    try {
      const me = await db.auth.me();

      // Verify user is authenticated and has a company
      if (!me) {
        toast.error('Please log in to save proposals');
        return;
      }

      if (!me.company_id) {
        toast.error('Your account is not associated with a company. Please contact support.');
        return;
      }

      // Only include valid database columns to avoid errors
      const proposalData = {
        company_id: me.company_id,
        prospect_id: proposal.prospect_id || null,
        title: proposal.title,
        status: sendAfterSave ? 'sent' : (proposal.status || 'draft'),
        client_name: proposal.client_name || null,
        client_email: proposal.client_email || null,
        client_company: proposal.client_company || null,
        client_address: proposal.client_address || {},
        introduction: proposal.introduction || null,
        sections: proposal.sections || [],
        line_items: proposal.line_items || [],
        terms_and_conditions: proposal.terms_and_conditions || null,
        subtotal: pricing.subtotal,
        discount_type: proposal.discount_type || null,
        discount_value: proposal.discount_value || 0,
        discount_amount: pricing.discountAmount,
        tax_percent: proposal.tax_percent || 0,
        tax_amount: pricing.taxAmount,
        total: pricing.total,
        currency: proposal.currency || 'EUR',
        valid_until: proposal.valid_until || null,
        branding: proposal.branding || {},
        signature_required: proposal.signature_required || false,
        sent_at: sendAfterSave ? new Date().toISOString() : (proposal.sent_at || null)
      };

      console.log('[Proposal Save] Attempting to save:', { proposalId, hasCompanyId: !!me.company_id });

      if (proposalId) {
        await Proposal.update(proposalId, proposalData);
        toast.success('Proposal updated');
      } else {
        const newProposal = await Proposal.create(proposalData);
        toast.success('Proposal created');
        navigate(createPageUrl(`FinanceProposalBuilder?id=${newProposal.id}`), { replace: true });
      }

      if (sendAfterSave) {
        toast.success('Proposal sent');
        navigate(createPageUrl('FinanceProposals'));
      }
    } catch (error) {
      console.error('[Proposal Save] Error:', error);

      // Extract detailed error message
      let errorMessage = 'Failed to save proposal';
      if (error?.message) {
        errorMessage = error.message;
      }
      if (error?.details) {
        errorMessage = error.details;
      }
      if (error?.code === 'PGRST301' || error?.message?.includes('RLS')) {
        errorMessage = 'Permission denied. Please check your account settings.';
      }
      if (error?.code === '42501') {
        errorMessage = 'You do not have permission to save proposals.';
      }

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleProspectChange = (prospectId) => {
    const prospect = prospects.find(p => p.id === prospectId);
    setProposal(prev => ({
      ...prev,
      prospect_id: prospectId,
      client_name: prospect?.contact_name || prev.client_name,
      client_email: prospect?.contact_email || prospect?.email || prev.client_email,
      client_company: prospect?.company_name || prev.client_company
    }));
  };

  // Handle contact selection from ContactSelector
  const handleContactSelect = (contact) => {
    if (!contact) {
      setProposal(prev => ({
        ...prev,
        prospect_id: null,
        client_name: '',
        client_email: '',
        client_company: ''
      }));
      return;
    }
    setProposal(prev => ({
      ...prev,
      prospect_id: contact.id,
      client_name: contact.name || '',
      client_email: contact.email || '',
      client_company: contact.company_name || ''
    }));
  };

  const handleAddProduct = (lineItem) => {
    setProposal(prev => ({
      ...prev,
      line_items: [...prev.line_items, lineItem]
    }));
    setShowProductSelector(false);
  };

  const handleRemoveLineItem = (index) => {
    setProposal(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const handleAddSection = (type) => {
    const newSection = {
      id: `section_${Date.now()}`,
      type,
      title: '',
      content: '',
      order: proposal.sections.length
    };
    setProposal(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const handleUpdateSection = (index, updates) => {
    setProposal(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === index ? { ...s, ...updates } : s)
    }));
  };

  const handleRemoveSection = (index) => {
    setProposal(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  if (loading || permLoading) {
    return (
      <div className="p-4 lg:p-6 py-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 bg-zinc-800" />
          <Skeleton className="h-10 w-32 bg-zinc-800" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-[600px] col-span-2 bg-zinc-800" />
          <Skeleton className="h-[600px] bg-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('FinanceProposals'))}
            className="text-zinc-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-400" />
              {proposalId ? 'Edit Proposal' : 'New Proposal'}
            </h1>
            {proposal.proposal_number && (
              <p className="text-sm text-zinc-500 font-mono">{proposal.proposal_number}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="border-zinc-700 text-zinc-300"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="border-zinc-700 text-zinc-300"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Send className="w-4 h-4 mr-2" />
            Save & Send
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Main Editor */}
        <div className="col-span-2 space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-800 mb-4">
                  <TabsTrigger value="details" className="data-[state=active]:bg-amber-500">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="content" className="data-[state=active]:bg-amber-500">
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="data-[state=active]:bg-amber-500">
                    Products & Pricing
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-amber-500">
                    Settings
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4">
                  {/* Title */}
                  <div>
                    <Label className="text-zinc-300">Proposal Title *</Label>
                    <Input
                      value={proposal.title}
                      onChange={(e) => setProposal(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      placeholder="e.g., Enterprise Software Solution Proposal"
                    />
                  </div>

                  {/* Link to CRM Contact */}
                  <div>
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400" />
                      Select from CRM Contacts
                    </Label>
                    <p className="text-xs text-zinc-500 mb-2 mt-1">
                      Select an existing contact to auto-fill information
                    </p>
                    <ContactSelector
                      value={proposal.prospect_id}
                      onSelect={handleContactSelect}
                      placeholder="Search CRM contacts..."
                      className="mt-1"
                    />
                  </div>

                  {/* Client Info */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="col-span-2 flex items-center gap-2 text-zinc-400 text-sm mb-2">
                      <Building2 className="w-4 h-4" />
                      Client Information
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Company Name</Label>
                      <Input
                        value={proposal.client_company}
                        onChange={(e) => setProposal(prev => ({ ...prev, client_company: e.target.value }))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Contact Name</Label>
                      <Input
                        value={proposal.client_name}
                        onChange={(e) => setProposal(prev => ({ ...prev, client_name: e.target.value }))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1"
                        placeholder="Contact person"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Email</Label>
                      <Input
                        type="email"
                        value={proposal.client_email}
                        onChange={(e) => setProposal(prev => ({ ...prev, client_email: e.target.value }))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1"
                        placeholder="client@company.com"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Valid Until</Label>
                      <Input
                        type="date"
                        value={proposal.valid_until}
                        onChange={(e) => setProposal(prev => ({ ...prev, valid_until: e.target.value }))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4">
                  {/* Introduction */}
                  <div>
                    <Label className="text-zinc-300">Introduction</Label>
                    <Textarea
                      value={proposal.introduction}
                      onChange={(e) => setProposal(prev => ({ ...prev, introduction: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1 min-h-[120px]"
                      placeholder="Introduce your proposal and its value to the client..."
                    />
                  </div>

                  {/* Custom Sections */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-zinc-300">Content Sections</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Section
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                          {SECTION_TYPES.map(type => (
                            <DropdownMenuItem
                              key={type.id}
                              onClick={() => handleAddSection(type.id)}
                              className="text-zinc-300 hover:bg-zinc-800"
                            >
                              <type.icon className="w-4 h-4 mr-2" />
                              {type.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {proposal.sections.length === 0 ? (
                      <div className="text-center py-8 rounded-lg border border-dashed border-zinc-700">
                        <List className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">No sections added</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          Add sections to build your proposal content
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {proposal.sections.map((section, idx) => (
                          <Collapsible key={section.id} defaultOpen>
                            <div className="border border-zinc-700 rounded-lg overflow-hidden">
                              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                                <div className="flex items-center gap-3">
                                  <GripVertical className="w-4 h-4 text-zinc-600" />
                                  <Badge variant="outline" className="bg-zinc-700/50 text-zinc-400 border-zinc-600 text-xs">
                                    {SECTION_TYPES.find(t => t.id === section.type)?.label || section.type}
                                  </Badge>
                                  <span className="text-white text-sm">
                                    {section.title || 'Untitled Section'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveSection(idx); }}
                                    className="text-zinc-400 hover:text-red-400 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="p-3 space-y-3 bg-zinc-900/50">
                                  <Input
                                    value={section.title}
                                    onChange={(e) => handleUpdateSection(idx, { title: e.target.value })}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    placeholder="Section title"
                                  />
                                  <Textarea
                                    value={section.content}
                                    onChange={(e) => handleUpdateSection(idx, { content: e.target.value })}
                                    className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                                    placeholder="Section content..."
                                  />
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Terms */}
                  <div>
                    <Label className="text-zinc-300">Terms & Conditions</Label>
                    <Textarea
                      value={proposal.terms_and_conditions}
                      onChange={(e) => setProposal(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-white mt-1 min-h-[100px]"
                      placeholder="Payment terms, delivery conditions, etc..."
                    />
                  </div>
                </TabsContent>

                {/* Pricing Tab */}
                <TabsContent value="pricing" className="space-y-4">
                  {/* Line Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-zinc-300 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Products & Services
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowProductSelector(true)}
                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </div>

                    {proposal.line_items.length === 0 ? (
                      <div className="text-center py-8 rounded-lg border border-dashed border-zinc-700">
                        <Package className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">No products added</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          Click "Add Product" to select from your catalog
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {proposal.line_items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/50 border border-white/5"
                          >
                            <div className="w-8 h-8 rounded flex items-center justify-center bg-zinc-700/50">
                              {item.is_subscription ? (
                                <RefreshCw className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <Package className="w-4 h-4 text-zinc-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-sm truncate">
                                {item.name || item.description}
                              </p>
                              {item.is_subscription && (
                                <p className="text-xs text-cyan-400">
                                  {item.plan_name} ({item.billing_cycle})
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-white">
                                €{((item.quantity || 1) * (parseFloat(item.unit_price) || 0)).toLocaleString()}
                              </p>
                              {item.quantity > 1 && (
                                <p className="text-xs text-zinc-500">
                                  {item.quantity} x €{parseFloat(item.unit_price || 0).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="text-zinc-400 hover:text-red-400 h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Discount & Tax */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <Label className="text-zinc-400 text-sm">Discount</Label>
                      <div className="flex gap-2 mt-1">
                        <Select
                          value={proposal.discount_type}
                          onValueChange={(v) => setProposal(prev => ({ ...prev, discount_type: v }))}
                        >
                          <SelectTrigger className="w-24 bg-zinc-800 border-zinc-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            <SelectItem value="percent">%</SelectItem>
                            <SelectItem value="fixed">€</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={proposal.discount_value}
                          onChange={(e) => setProposal(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                          className="bg-zinc-800 border-zinc-700 text-white"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-sm">Tax Rate (%)</Label>
                      <Input
                        type="number"
                        value={proposal.tax_percent}
                        onChange={(e) => setProposal(prev => ({ ...prev, tax_percent: parseFloat(e.target.value) || 0 }))}
                        className="bg-zinc-800 border-zinc-700 text-white mt-1"
                        placeholder="21"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Require Signature</p>
                      <p className="text-sm text-zinc-400">Client must sign to accept the proposal</p>
                    </div>
                    <Switch
                      checked={proposal.signature_required}
                      onCheckedChange={(v) => setProposal(prev => ({ ...prev, signature_required: v }))}
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-300">Currency</Label>
                    <Select
                      value={proposal.currency}
                      onValueChange={(v) => setProposal(prev => ({ ...prev, currency: v }))}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Pricing Summary */}
        <div className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800 sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Pricing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Items count */}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Items</span>
                <span className="text-white">{proposal.line_items.length}</span>
              </div>

              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Subtotal</span>
                <span className="text-white">€{pricing.subtotal.toLocaleString()}</span>
              </div>

              {/* Discount */}
              {pricing.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">
                    Discount {proposal.discount_type === 'percent' ? `(${proposal.discount_value}%)` : ''}
                  </span>
                  <span className="text-emerald-400">-€{pricing.discountAmount.toLocaleString()}</span>
                </div>
              )}

              {/* Tax */}
              {pricing.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Tax ({proposal.tax_percent}%)</span>
                  <span className="text-white">€{pricing.taxAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t border-zinc-700 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">Total</span>
                  <span className="text-lg font-bold text-amber-400">
                    €{pricing.total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Subscription indicator */}
              {proposal.line_items.some(i => i.is_subscription) && (
                <div className="flex items-center gap-2 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-cyan-400">
                    Includes recurring subscriptions
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-zinc-700 text-zinc-300 justify-start"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Proposal
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-zinc-700 text-zinc-300 justify-start"
                onClick={() => {}}
                disabled
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Selector Modal */}
      <ProductSelector
        open={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        onSelect={handleAddProduct}
        currency={proposal.currency}
      />

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-400" />
              Proposal Preview
            </DialogTitle>
          </DialogHeader>

          <div className="bg-white text-zinc-900 rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="border-b border-zinc-200 pb-4">
              <h1 className="text-2xl font-bold">{proposal.title || 'Untitled Proposal'}</h1>
              {proposal.proposal_number && (
                <p className="text-sm text-zinc-500 font-mono mt-1">{proposal.proposal_number}</p>
              )}
            </div>

            {/* Client Info */}
            <div className="bg-zinc-50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Prepared For</p>
              <p className="font-semibold">{proposal.client_company || 'Client Company'}</p>
              <p className="text-sm text-zinc-600">{proposal.client_name}</p>
              <p className="text-sm text-zinc-600">{proposal.client_email}</p>
            </div>

            {/* Introduction */}
            {proposal.introduction && (
              <div>
                <p className="text-zinc-700 whitespace-pre-wrap">{proposal.introduction}</p>
              </div>
            )}

            {/* Sections */}
            {proposal.sections.map((section, idx) => (
              <div key={idx} className="border-t border-zinc-200 pt-3">
                <h3 className="font-semibold text-lg mb-2">{section.title || 'Section'}</h3>
                <p className="text-zinc-700 whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}

            {/* Line Items */}
            {proposal.line_items.length > 0 && (
              <div className="border-t border-zinc-200 pt-3">
                <h3 className="font-semibold text-lg mb-4">Pricing</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-2">Item</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.line_items.map((item, idx) => (
                      <tr key={idx} className="border-b border-zinc-100">
                        <td className="py-2">
                          {item.name || item.description}
                          {item.is_subscription && (
                            <span className="text-xs text-cyan-600 ml-2">({item.billing_cycle})</span>
                          )}
                        </td>
                        <td className="text-right py-2">{item.quantity || 1}</td>
                        <td className="text-right py-2">€{parseFloat(item.unit_price || 0).toLocaleString()}</td>
                        <td className="text-right py-2">€{((item.quantity || 1) * parseFloat(item.unit_price || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-3 space-y-2 text-right">
                  <div className="flex justify-end gap-4">
                    <span className="text-zinc-500">Subtotal:</span>
                    <span className="w-24">€{pricing.subtotal.toLocaleString()}</span>
                  </div>
                  {pricing.discountAmount > 0 && (
                    <div className="flex justify-end gap-4 text-emerald-600">
                      <span>Discount:</span>
                      <span className="w-24">-€{pricing.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {pricing.taxAmount > 0 && (
                    <div className="flex justify-end gap-4">
                      <span className="text-zinc-500">Tax ({proposal.tax_percent}%):</span>
                      <span className="w-24">€{pricing.taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-4 text-base font-bold border-t border-zinc-200 pt-2">
                    <span>Total:</span>
                    <span className="w-24 text-amber-600">€{pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Terms */}
            {proposal.terms_and_conditions && (
              <div className="border-t border-zinc-200 pt-3 text-sm">
                <h3 className="font-semibold mb-2">Terms & Conditions</h3>
                <p className="text-zinc-600 whitespace-pre-wrap">{proposal.terms_and_conditions}</p>
              </div>
            )}

            {/* Valid until */}
            {proposal.valid_until && (
              <div className="text-center pt-3 text-xs text-zinc-500">
                Valid until: {new Date(proposal.valid_until).toLocaleDateString()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} className="border-zinc-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import {
  Plus, Send, Linkedin, Mail, Phone, Zap, Users, ChevronDown, ChevronUp, Play, Pause,
  MoreHorizontal, Trash2, Edit, Calendar, Target, TrendingUp, MessageSquare, Eye,
  BarChart3, Clock, CheckCircle2, Settings, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import CampaignSequenceEditor from "@/components/campaigns/CampaignSequenceEditor";
import CampaignMetricsPanel from "@/components/campaigns/CampaignMetricsPanel";

const CAMPAIGN_TYPES = [
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'from-indigo-500/70 to-indigo-600/70' },
  { id: 'email', label: 'Email', icon: Mail, color: 'from-indigo-500/60 to-indigo-600/60' },
  { id: 'cold_call', label: 'Cold Call', icon: Phone, color: 'from-indigo-500/50 to-indigo-600/50' },
  { id: 'clay', label: 'Clay Automation', icon: Zap, color: 'from-indigo-500/80 to-indigo-600/80' },
  { id: 'multi_channel', label: 'Multi-Channel', icon: MessageSquare, color: 'from-indigo-500/65 to-indigo-600/65' }
];

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50', icon: Edit },
  active: { label: 'Active', color: 'bg-indigo-500/20 text-indigo-400/80 border-indigo-500/30', icon: Play },
  paused: { label: 'Paused', color: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/40', icon: Pause },
  completed: { label: 'Completed', color: 'bg-indigo-500/15 text-indigo-400/70 border-indigo-500/25', icon: CheckCircle2 }
};

const emptyForm = { 
  name: '', campaign_type: 'email', status: 'draft', target_audience: '', 
  start_date: '', end_date: '', total_contacts: '', daily_limit: '50', sequence_steps: []
};

function CampaignCard({ campaign, onEdit, onDelete, onStatusChange, onViewDetails }) {
  const typeConfig = CAMPAIGN_TYPES.find(t => t.id === campaign.campaign_type) || CAMPAIGN_TYPES[1];
  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const Icon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const progress = campaign.total_contacts > 0 
    ? Math.round((campaign.contacted / campaign.total_contacts) * 100) : 0;
  const responseRate = campaign.contacted > 0 
    ? Math.round((campaign.responded / campaign.contacted) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group"
      >
      <div className="bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800/60 hover:border-zinc-700/60 transition-all overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${typeConfig.color}`} />
        
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeConfig.color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{campaign.name}</h3>
                  <p className="text-zinc-500 text-sm">{typeConfig.label} • {campaign.sequence_steps?.length || 0} steps</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={`${statusConfig.color} border flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                      <DropdownMenuItem onClick={() => onViewDetails(campaign)} className="text-zinc-300">
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(campaign)} className="text-zinc-300">
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      {campaign.status === 'active' ? (
                        <DropdownMenuItem onClick={() => onStatusChange(campaign.id, 'paused')} className="text-amber-400">
                          <Pause className="w-4 h-4 mr-2" /> Pause
                        </DropdownMenuItem>
                      ) : campaign.status !== 'completed' && (
                        <DropdownMenuItem onClick={() => onStatusChange(campaign.id, 'active')} className="text-emerald-400">
                          <Play className="w-4 h-4 mr-2" /> Start
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem onClick={() => onDelete(campaign.id)} className="text-red-400">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span className="text-white font-medium">{campaign.contacted || 0}</span>
                  <span className="text-zinc-500 text-sm">/ {campaign.total_contacts || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-zinc-500" />
                  <span className="text-white font-medium">{responseRate}%</span>
                  <span className="text-zinc-500 text-sm">response</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-white font-medium">{campaign.meetings_booked || 0}</span>
                  <span className="text-zinc-500 text-sm">meetings</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function GrowthCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [activeFilter, setActiveFilter] = useState('all');
  const [modalTab, setModalTab] = useState('details');
  const [detailCampaign, setDetailCampaign] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadCampaigns = async () => {
      try {
        const camps = await base44.entities.GrowthCampaign.list({ limit: 100 }).catch(() => []);
        if (isMounted) setCampaigns(camps || []);
      } catch (error) {
        console.error('Failed to load:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCampaigns();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Campaign name is required');
      return;
    }
    try {
      const data = {
        ...formData,
        total_contacts: formData.total_contacts ? parseInt(formData.total_contacts) : 0,
        daily_limit: formData.daily_limit ? parseInt(formData.daily_limit) : 50
      };

      if (selectedCampaign) {
        await base44.entities.GrowthCampaign.update(selectedCampaign.id, data);
        toast.success('Campaign updated');
      } else {
        await base44.entities.GrowthCampaign.create(data);
        toast.success('Campaign created');
      }
      
      setShowModal(false);
      setSelectedCampaign(null);
      setFormData(emptyForm);
      loadCampaigns();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save campaign');
    }
  };

  const handleEdit = (campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name || '',
      campaign_type: campaign.campaign_type || 'email',
      status: campaign.status || 'draft',
      target_audience: campaign.target_audience || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      total_contacts: campaign.total_contacts?.toString() || '',
      daily_limit: campaign.daily_limit?.toString() || '50',
      sequence_steps: campaign.sequence_steps || []
    });
    setModalTab('details');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await base44.entities.GrowthCampaign.delete(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success('Campaign deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await base44.entities.GrowthCampaign.update(id, { status });
      setCampaigns(camps => camps.map(c => c.id === id ? { ...c, status } : c));
      toast.success(`Campaign ${status === 'active' ? 'started' : status === 'paused' ? 'paused' : 'updated'}`);
    } catch (error) {
      toast.error('Failed to update campaign');
    }
  };

  const openNewModal = () => {
    setSelectedCampaign(null);
    setFormData(emptyForm);
    setModalTab('details');
    setShowModal(true);
  };

  const handleViewDetails = (campaign) => {
    setDetailCampaign(campaign);
  };

  const stats = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'active').length;
    const totalContacted = campaigns.reduce((sum, c) => sum + (c.contacted || 0), 0);
    const totalResponded = campaigns.reduce((sum, c) => sum + (c.responded || 0), 0);
    const totalMeetings = campaigns.reduce((sum, c) => sum + (c.meetings_booked || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue_attributed || 0), 0);
    const avgResponseRate = totalContacted > 0 ? Math.round((totalResponded / totalContacted) * 100) : 0;
    return { active, totalContacted, totalResponded, totalMeetings, totalRevenue, avgResponseRate };
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (activeFilter === 'all') return campaigns;
    return campaigns.filter(c => c.status === activeFilter);
  }, [campaigns, activeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="space-y-6">
          <Skeleton className="h-28 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          icon={Send}
          title="Campaigns"
          subtitle={`${stats.active} active · ${stats.totalContacted.toLocaleString()} contacts reached`}
          color="indigo"
          actions={
            <Button onClick={openNewModal} className="bg-indigo-500 hover:bg-indigo-400 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Active</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Play className="w-6 h-6 text-indigo-400/70" />
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Contacted</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalContacted.toLocaleString()}</p>
                <p className="text-xs text-indigo-400/80">{stats.avgResponseRate}% response</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-400/70" />
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Meetings</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalMeetings}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-indigo-400/60" />
              </div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">€{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-400/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1 rounded-xl">
            <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-indigo-300/90 rounded-lg px-4 text-zinc-500">
              All ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-indigo-300/90 rounded-lg px-4 text-zinc-500">
              Active ({campaigns.filter(c => c.status === 'active').length})
            </TabsTrigger>
            <TabsTrigger value="paused" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-indigo-300/90 rounded-lg px-4 text-zinc-500">
              Paused ({campaigns.filter(c => c.status === 'paused').length})
            </TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-indigo-300/90 rounded-lg px-4 text-zinc-500">
              Draft ({campaigns.filter(c => c.status === 'draft').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Campaigns List */}
        {filteredCampaigns.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
              <Send className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {activeFilter === 'all' ? 'Create Your First Campaign' : `No ${activeFilter} Campaigns`}
            </h3>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Build multi-step outreach sequences to engage prospects at scale.
            </p>
            <Button onClick={openNewModal} className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium px-6">
              <Plus className="w-4 h-4 mr-2" /> Create Campaign
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl p-0 max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
            <DialogTitle className="text-lg font-semibold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Send className="w-5 h-5 text-indigo-400" />
              </div>
              {selectedCampaign ? 'Edit Campaign' : 'New Campaign'}
            </DialogTitle>
          </div>

          <Tabs value={modalTab} onValueChange={setModalTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="bg-zinc-800/50 mx-6 mt-4 p-1 rounded-lg">
              <TabsTrigger value="details" className="data-[state=active]:bg-zinc-700 rounded">Details</TabsTrigger>
              <TabsTrigger value="sequence" className="data-[state=active]:bg-zinc-700 rounded">Sequence</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-700 rounded">Settings</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="details" className="mt-0 space-y-4">
                <div>
                  <label className="text-zinc-400 text-sm mb-1.5 block">Campaign Name *</label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="bg-zinc-800/50 border-zinc-700 text-white" 
                    placeholder="Q1 LinkedIn Outreach" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Type</label>
                    <Select value={formData.campaign_type} onValueChange={(v) => setFormData({ ...formData, campaign_type: v })}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {CAMPAIGN_TYPES.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            <span className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" /> {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Total Contacts</label>
                    <Input 
                      type="number" 
                      value={formData.total_contacts} 
                      onChange={(e) => setFormData({ ...formData, total_contacts: e.target.value })} 
                      className="bg-zinc-800/50 border-zinc-700 text-white" 
                      placeholder="500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1.5 block">Target Audience</label>
                  <Textarea 
                    value={formData.target_audience} 
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })} 
                    className="bg-zinc-800/50 border-zinc-700 text-white resize-none" 
                    rows={2} 
                    placeholder="Compliance managers at fintech companies"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Start Date</label>
                    <Input 
                      type="date" 
                      value={formData.start_date} 
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} 
                      className="bg-zinc-800/50 border-zinc-700 text-white" 
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">End Date</label>
                    <Input 
                      type="date" 
                      value={formData.end_date} 
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} 
                      className="bg-zinc-800/50 border-zinc-700 text-white" 
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sequence" className="mt-0">
                <CampaignSequenceEditor
                  steps={formData.sequence_steps}
                  onChange={(steps) => setFormData({ ...formData, sequence_steps: steps })}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-0 space-y-4">
                <div>
                  <label className="text-zinc-400 text-sm mb-1.5 block">Daily Contact Limit</label>
                  <Input 
                    type="number" 
                    value={formData.daily_limit} 
                    onChange={(e) => setFormData({ ...formData, daily_limit: e.target.value })} 
                    className="bg-zinc-800/50 border-zinc-700 text-white w-32" 
                    min={1}
                    max={200}
                  />
                  <p className="text-xs text-zinc-600 mt-1">Max contacts to reach per day</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700 text-zinc-400">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name} className="bg-indigo-500 hover:bg-indigo-400 text-white">
              {selectedCampaign ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Drawer */}
      <AnimatePresence>
        {detailCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setDetailCampaign(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-full max-w-lg bg-zinc-950 border-l border-zinc-800 overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">{detailCampaign.name}</h2>
                  <Button variant="ghost" size="icon" onClick={() => setDetailCampaign(null)}>
                    <ArrowRight className="w-5 h-5 text-zinc-400" />
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <CampaignMetricsPanel
                  campaign={detailCampaign}
                  onUpdate={(updated) => {
                    setDetailCampaign(updated);
                    setCampaigns(camps => camps.map(c => c.id === updated.id ? updated : c));
                  }}
                />

                {detailCampaign.sequence_steps?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-white font-medium">Sequence Steps</h3>
                    {detailCampaign.sequence_steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 font-medium">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm capitalize">{step.type?.replace('_', ' ')}</p>
                          {step.delay_days > 0 && (
                            <p className="text-xs text-zinc-500">+{step.delay_days} day{step.delay_days > 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button 
                    onClick={() => { handleEdit(detailCampaign); setDetailCampaign(null); }}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" /> Edit Campaign
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
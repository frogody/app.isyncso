import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Rocket, Plus, Search, Target, DollarSign, Calendar,
  Users, TrendingUp, MoreHorizontal, Clock, CheckCircle,
  AlertCircle, Play, Pause, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function RaiseCampaigns() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    target_amount: '',
    round_type: 'seed',
    status: 'planning',
    start_date: '',
    target_close_date: ''
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await db.entities.RaiseCampaign?.list() || [];
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCampaign = async () => {
    try {
      await db.entities.RaiseCampaign.create({
        ...newCampaign,
        target_amount: parseFloat(newCampaign.target_amount) || 0,
        raised_amount: 0
      });
      toast.success('Campaign created successfully');
      setIsAddDialogOpen(false);
      setNewCampaign({ name: '', description: '', target_amount: '', round_type: 'seed', status: 'planning', start_date: '', target_close_date: '' });
      loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      planning: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      closed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return styles[status] || styles.planning;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    !searchTerm || campaign.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Raise Campaigns"
          subtitle="Manage your fundraising rounds"
          icon={Rocket}
          color="orange"
          actions={
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Fundraising Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-zinc-400">Campaign Name</Label>
                    <Input
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                      placeholder="Series A Round"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-400">Round Type</Label>
                      <Select value={newCampaign.round_type} onValueChange={(v) => setNewCampaign({...newCampaign, round_type: v})}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pre_seed">Pre-Seed</SelectItem>
                          <SelectItem value="seed">Seed</SelectItem>
                          <SelectItem value="series_a">Series A</SelectItem>
                          <SelectItem value="series_b">Series B</SelectItem>
                          <SelectItem value="series_c">Series C+</SelectItem>
                          <SelectItem value="bridge">Bridge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-zinc-400">Target Amount</Label>
                      <Input
                        type="number"
                        value={newCampaign.target_amount}
                        onChange={(e) => setNewCampaign({...newCampaign, target_amount: e.target.value})}
                        className="bg-zinc-800 border-zinc-700"
                        placeholder="5000000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-400">Start Date</Label>
                      <Input
                        type="date"
                        value={newCampaign.start_date}
                        onChange={(e) => setNewCampaign({...newCampaign, start_date: e.target.value})}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400">Target Close Date</Label>
                      <Input
                        type="date"
                        value={newCampaign.target_close_date}
                        onChange={(e) => setNewCampaign({...newCampaign, target_close_date: e.target.value})}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Description</Label>
                    <Textarea
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                      placeholder="Describe your fundraising goals..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddCampaign} className="bg-orange-600 hover:bg-orange-700">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800"
          />
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2].map(i => (
              <div key={i} className="h-64 bg-zinc-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Rocket className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No campaigns yet</h3>
            <p className="text-zinc-500 mb-4">Start your first fundraising campaign</p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCampaigns.map((campaign) => {
              const progress = campaign.target_amount > 0
                ? Math.round((campaign.raised_amount || 0) / campaign.target_amount * 100)
                : 0;

              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-6 hover:border-orange-500/30 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{campaign.name || 'Untitled Campaign'}</h3>
                        <p className="text-sm text-zinc-400 capitalize">{campaign.round_type?.replace('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusBadge(campaign.status)} border`}>
                          {campaign.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-zinc-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>{campaign.status === 'active' ? 'Pause' : 'Activate'}</DropdownMenuItem>
                            <DropdownMenuItem>View Analytics</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">Progress</span>
                        <span className="text-orange-400 font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-zinc-800" />
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-zinc-500">{formatCurrency(campaign.raised_amount)} raised</span>
                        <span className="text-zinc-400">{formatCurrency(campaign.target_amount)} target</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">{campaign.investor_count || 0}</div>
                        <div className="text-xs text-zinc-500">Investors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">{campaign.meetings_scheduled || 0}</div>
                        <div className="text-xs text-zinc-500">Meetings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">{campaign.term_sheets || 0}</div>
                        <div className="text-xs text-zinc-500">Term Sheets</div>
                      </div>
                    </div>

                    {/* Timeline */}
                    {(campaign.start_date || campaign.target_close_date) && (
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'TBD'}
                        </span>
                        <span className="text-zinc-600">to</span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {campaign.target_close_date ? new Date(campaign.target_close_date).toLocaleDateString() : 'TBD'}
                        </span>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

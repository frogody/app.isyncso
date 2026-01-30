import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Rocket, Plus, Search, Target, Euro, Calendar,
  Users, TrendingUp, MoreHorizontal, Clock, CheckCircle,
  AlertCircle, Play, Pause, BarChart3, Edit2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/PageHeader';
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
      paused: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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

  // Calculate stats
  const stats = useMemo(() => {
    const totalTarget = campaigns.reduce((sum, c) => sum + (c.target_amount || 0), 0);
    const totalRaised = campaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0);
    return {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      totalTarget,
      totalRaised
    };
  }, [campaigns]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          title="Raise Campaigns"
          subtitle="Manage your fundraising rounds"
          icon={Rocket}
          color="blue"
          actions={
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Campaigns', value: stats.total, icon: Rocket },
            { label: 'Active', value: stats.active, icon: Play },
            { label: 'Total Target', value: formatCurrency(stats.totalTarget), icon: Target },
            { label: 'Total Raised', value: formatCurrency(stats.totalRaised), icon: Euro }
          ].map((stat, idx) => (
            <Card key={idx} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <stat.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-zinc-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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

        {/* Campaigns */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Fundraising Campaigns</CardTitle>
            <CardDescription>Track your funding rounds and progress</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <Rocket className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No campaigns yet</h3>
                <p className="text-zinc-500 mb-4">Start your first fundraising campaign</p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
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
                      <div className="p-6 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-white text-lg">{campaign.name || 'Untitled Campaign'}</h3>
                            <p className="text-sm text-zinc-400 capitalize">{campaign.round_type?.replace('_', ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${getStatusBadge(campaign.status)} border`}>
                              {campaign.status}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem className="text-zinc-300">Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-zinc-300">
                                  {campaign.status === 'active' ? 'Pause' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-zinc-300">View Analytics</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-zinc-400">Progress</span>
                            <span className="text-blue-400 font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2 bg-zinc-700" />
                          <div className="flex justify-between text-sm mt-2">
                            <span className="text-zinc-500">{formatCurrency(campaign.raised_amount)} raised</span>
                            <span className="text-zinc-400">{formatCurrency(campaign.target_amount)} target</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-700">
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
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-700 text-sm text-zinc-500">
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
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-zinc-700">
                Cancel
              </Button>
              <Button onClick={handleAddCampaign} className="bg-blue-500 hover:bg-blue-600">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

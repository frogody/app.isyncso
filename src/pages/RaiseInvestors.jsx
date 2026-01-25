import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Building2, Plus, Search, Filter, Mail, Phone, Globe,
  DollarSign, CheckCircle2, Clock, AlertCircle, MessageSquare,
  Linkedin, ArrowUpRight, MoreHorizontal, UserPlus, Users,
  Target, TrendingUp, Calendar, ExternalLink, Edit2, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

export default function RaiseInvestors() {
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInvestor, setNewInvestor] = useState({
    name: '',
    firm: '',
    email: '',
    phone: '',
    linkedin_url: '',
    website: '',
    investment_focus: '',
    typical_check_size: '',
    status: 'prospecting',
    notes: ''
  });

  useEffect(() => {
    loadInvestors();
  }, []);

  const loadInvestors = async () => {
    try {
      setLoading(true);
      const data = await db.entities.RaiseInvestor?.list() || [];
      setInvestors(data);
    } catch (error) {
      console.error('Error loading investors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvestor = async () => {
    try {
      await db.entities.RaiseInvestor.create(newInvestor);
      toast.success('Investor added successfully');
      setIsAddDialogOpen(false);
      setNewInvestor({
        name: '', firm: '', email: '', phone: '', linkedin_url: '',
        website: '', investment_focus: '', typical_check_size: '',
        status: 'prospecting', notes: ''
      });
      loadInvestors();
    } catch (error) {
      console.error('Error adding investor:', error);
      toast.error('Failed to add investor');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      prospecting: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      contacted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      interested: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      in_discussions: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      due_diligence: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      committed: 'bg-green-500/20 text-green-400 border-green-500/30',
      passed: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return styles[status] || styles.prospecting;
  };

  const filteredInvestors = useMemo(() => {
    return investors.filter(inv => {
      const matchesSearch = !searchTerm ||
        inv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.firm?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [investors, searchTerm, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: investors.length,
    interested: investors.filter(i => ['interested', 'in_discussions'].includes(i.status)).length,
    committed: investors.filter(i => i.status === 'committed').length,
    inDD: investors.filter(i => i.status === 'due_diligence').length
  }), [investors]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-amber-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          title="Investor Pipeline"
          subtitle="Track and manage investor relationships"
          icon={Building2}
          color="amber"
          actions={
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Investor
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Investors', value: stats.total, icon: Users },
            { label: 'Interested', value: stats.interested, icon: Target },
            { label: 'In Due Diligence', value: stats.inDD, icon: Clock },
            { label: 'Committed', value: stats.committed, icon: CheckCircle2 }
          ].map((stat, idx) => (
            <Card key={idx} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <stat.icon className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                    <p className="text-[10px] text-zinc-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search investors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-800"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="prospecting">Prospecting</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="in_discussions">In Discussions</SelectItem>
              <SelectItem value="due_diligence">Due Diligence</SelectItem>
              <SelectItem value="committed">Committed</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Investors List */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Investors</CardTitle>
            <CardDescription>{filteredInvestors.length} investors in pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInvestors.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No investors yet</h3>
                <p className="text-zinc-500 mb-4">Start building your investor pipeline</p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Investor
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInvestors.map((investor) => (
                  <motion.div
                    key={investor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{investor.name || 'Unknown'}</p>
                        <p className="text-xs text-zinc-500">{investor.firm || 'Investment Firm'}</p>
                        {investor.investment_focus && (
                          <p className="text-[10px] text-zinc-600 mt-1">{investor.investment_focus}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {investor.typical_check_size && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {investor.typical_check_size}
                        </span>
                      )}
                      <Badge variant="outline" className={`${getStatusBadge(investor.status)} border text-xs`}>
                        {investor.status?.replace('_', ' ')}
                      </Badge>
                      <div className="flex gap-1">
                        {investor.email && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" asChild>
                            <a href={`mailto:${investor.email}`}>
                              <Mail className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        {investor.linkedin_url && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" asChild>
                            <a href={investor.linkedin_url} target="_blank" rel="noopener noreferrer">
                              <Linkedin className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem className="text-zinc-300">Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-zinc-300">Log Activity</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Investor Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Investor</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400">Contact Name</Label>
                  <Input
                    value={newInvestor.name}
                    onChange={(e) => setNewInvestor({...newInvestor, name: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">Firm</Label>
                  <Input
                    value={newInvestor.firm}
                    onChange={(e) => setNewInvestor({...newInvestor, firm: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="Acme Ventures"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400">Email</Label>
                  <Input
                    type="email"
                    value={newInvestor.email}
                    onChange={(e) => setNewInvestor({...newInvestor, email: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="john@acme.vc"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">Phone</Label>
                  <Input
                    value={newInvestor.phone}
                    onChange={(e) => setNewInvestor({...newInvestor, phone: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-400">Investment Focus</Label>
                <Input
                  value={newInvestor.investment_focus}
                  onChange={(e) => setNewInvestor({...newInvestor, investment_focus: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="B2B SaaS, AI/ML"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400">Typical Check Size</Label>
                  <Input
                    value={newInvestor.typical_check_size}
                    onChange={(e) => setNewInvestor({...newInvestor, typical_check_size: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="$500K - $2M"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">Status</Label>
                  <Select value={newInvestor.status} onValueChange={(v) => setNewInvestor({...newInvestor, status: v})}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospecting">Prospecting</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="in_discussions">In Discussions</SelectItem>
                      <SelectItem value="due_diligence">Due Diligence</SelectItem>
                      <SelectItem value="committed">Committed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-zinc-400">Notes</Label>
                <Textarea
                  value={newInvestor.notes}
                  onChange={(e) => setNewInvestor({...newInvestor, notes: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="Add notes about this investor..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-zinc-700">
                Cancel
              </Button>
              <Button onClick={handleAddInvestor} className="bg-amber-500 hover:bg-amber-600">
                Add Investor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

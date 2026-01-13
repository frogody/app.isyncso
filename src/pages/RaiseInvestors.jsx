import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Building2, Plus, Search, Filter, Mail, Phone, Globe,
  DollarSign, CheckCircle2, Clock, AlertCircle, MessageSquare,
  Linkedin, ArrowUpRight, MoreHorizontal, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
      in_discussions: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      due_diligence: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      committed: 'bg-green-500/20 text-green-400 border-green-500/30',
      passed: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return styles[status] || styles.prospecting;
  };

  const filteredInvestors = investors.filter(inv => {
    const matchesSearch = !searchTerm ||
      inv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.firm?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Investor Pipeline"
          subtitle="Track and manage investor relationships"
          icon={Building2}
          color="orange"
          actions={
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Investor
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Investor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddInvestor} className="bg-orange-600 hover:bg-orange-700">Add Investor</Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
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

        {/* Investor Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-zinc-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredInvestors.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No investors yet</h3>
            <p className="text-zinc-500 mb-4">Start building your investor pipeline</p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Add First Investor
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvestors.map((investor) => (
              <motion.div
                key={investor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="p-5 hover:border-orange-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{investor.name || 'Unknown'}</h3>
                      <p className="text-sm text-zinc-400">{investor.firm}</p>
                    </div>
                    <Badge className={`${getStatusBadge(investor.status)} border`}>
                      {investor.status?.replace('_', ' ')}
                    </Badge>
                  </div>

                  {investor.investment_focus && (
                    <p className="text-sm text-zinc-500 mb-3">{investor.investment_focus}</p>
                  )}

                  {investor.typical_check_size && (
                    <div className="flex items-center gap-2 text-sm text-orange-400 mb-3">
                      <DollarSign className="w-4 h-4" />
                      <span>{investor.typical_check_size}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                    {investor.email && (
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" asChild>
                        <a href={`mailto:${investor.email}`}>
                          <Mail className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {investor.linkedin_url && (
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" asChild>
                        <a href={investor.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <div className="flex-1" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-zinc-400">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Log Activity</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

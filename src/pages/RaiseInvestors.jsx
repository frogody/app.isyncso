import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Plus, Search, Filter, Mail, Phone, Globe,
  Euro, CheckCircle2, Clock, AlertCircle, MessageSquare,
  Linkedin, ArrowUpRight, MoreHorizontal, UserPlus, Users,
  Target, TrendingUp, Calendar, ExternalLink, Edit2, Trash2,
  Sun, Moon
} from 'lucide-react';
import { RaiseCard as Card, RaiseCardContent as CardContent, RaiseCardHeader as CardHeader, RaiseCardTitle as CardTitle, RaiseCardDescription as CardDescription } from '@/components/raise/RaiseCard';
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
import { RaisePageTransition } from '@/components/raise/RaisePageTransition';
import { useRaiseTheme } from '@/contexts/RaiseThemeContext';

export default function RaiseInvestors() {
  const { theme, toggleTheme, rt } = useRaiseTheme();
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
      contacted: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      interested: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      in_discussions: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      due_diligence: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
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
      <div className={`min-h-screen ${rt('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500`} />
      </div>
    );
  }

  return (
    <RaisePageTransition>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          title="Investor Pipeline"
          subtitle="Track and manage investor relationships"
          icon={Building2}
          color="orange"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={toggleTheme} className={rt('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Investor
              </Button>
            </div>
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
            <Card key={idx} className={rt('bg-white border-slate-200 shadow-sm', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${rt('bg-orange-50', 'bg-orange-500/10')} border ${rt('border-orange-200', 'border-orange-500/20')}`}>
                    <stat.icon className={`w-4 h-4 ${rt('text-orange-600', 'text-orange-400')}`} />
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${rt('text-slate-900', 'text-white')}`}>{stat.value}</p>
                    <p className={`text-[10px] ${rt('text-slate-400', 'text-zinc-500')}`}>{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${rt('text-slate-400', 'text-zinc-500')}`} />
            <Input
              placeholder="Search investors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${rt('bg-white border-slate-200 shadow-sm', 'bg-zinc-900/50 border-zinc-800')}`}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={`w-[180px] ${rt('bg-white border-slate-200 shadow-sm', 'bg-zinc-900/50 border-zinc-800')}`}>
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
        <Card className={rt('bg-white border-slate-200 shadow-sm', 'bg-zinc-900/50 border-zinc-800')}>
          <CardHeader>
            <CardTitle className={rt('text-slate-900', 'text-white')}>Investors</CardTitle>
            <CardDescription>{filteredInvestors.length} investors in pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInvestors.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className={`w-12 h-12 ${rt('text-slate-400', 'text-zinc-600')} mx-auto mb-4`} />
                <h3 className={`text-lg font-medium ${rt('text-slate-900', 'text-white')} mb-2`}>No investors yet</h3>
                <p className={`${rt('text-slate-400', 'text-zinc-500')} mb-4`}>Start building your investor pipeline</p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Investor
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredInvestors.map((investor, index) => (
                    <motion.div
                      key={investor.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex items-center justify-between p-3 ${rt('bg-slate-50', 'bg-zinc-800/50')} rounded-lg hover:${rt('bg-slate-100', 'bg-zinc-800')} transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${rt('bg-orange-50', 'bg-orange-500/10')} rounded-lg border ${rt('border-orange-200', 'border-orange-500/20')}`}>
                          <Building2 className={`w-4 h-4 ${rt('text-orange-600', 'text-orange-400')}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${rt('text-slate-900', 'text-white')} text-sm`}>{investor.name || 'Unknown'}</p>
                          <p className={`text-xs ${rt('text-slate-400', 'text-zinc-500')}`}>{investor.firm || 'Investment Firm'}</p>
                          {investor.investment_focus && (
                            <p className={`text-[10px] ${rt('text-slate-400', 'text-zinc-600')} mt-1`}>{investor.investment_focus}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {investor.typical_check_size && (
                          <span className={`text-xs ${rt('text-orange-600', 'text-orange-400')} flex items-center gap-1`}>
                            <Euro className="w-3 h-3" />
                            {investor.typical_check_size}
                          </span>
                        )}
                        <Badge variant="outline" className={`${getStatusBadge(investor.status)} border text-xs`}>
                          {investor.status?.replace('_', ' ')}
                        </Badge>
                        <div className="flex gap-1">
                          {investor.email && (
                            <Button size="icon" variant="ghost" className={`h-8 w-8 ${rt('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')}`} asChild>
                              <a href={`mailto:${investor.email}`}>
                                <Mail className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {investor.linkedin_url && (
                            <Button size="icon" variant="ghost" className={`h-8 w-8 ${rt('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')}`} asChild>
                              <a href={investor.linkedin_url} target="_blank" rel="noopener noreferrer">
                                <Linkedin className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className={`h-8 w-8 ${rt('text-slate-500', 'text-zinc-400')}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className={rt('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')}>
                              <DropdownMenuItem className={rt('text-slate-600', 'text-zinc-300')}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className={rt('text-slate-600', 'text-zinc-300')}>Log Activity</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Investor Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className={`${rt('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')} max-w-lg`}>
            <DialogHeader>
              <DialogTitle className={rt('text-slate-900', 'text-white')}>Add New Investor</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={rt('text-slate-500', 'text-zinc-400')}>Contact Name</Label>
                  <Input
                    value={newInvestor.name}
                    onChange={(e) => setNewInvestor({...newInvestor, name: e.target.value})}
                    className={rt('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label className={rt('text-slate-500', 'text-zinc-400')}>Firm</Label>
                  <Input
                    value={newInvestor.firm}
                    onChange={(e) => setNewInvestor({...newInvestor, firm: e.target.value})}
                    className={rt('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                    placeholder="Acme Ventures"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={rt('text-slate-500', 'text-zinc-400')}>Email</Label>
                  <Input
                    type="email"
                    value={newInvestor.email}
                    onChange={(e) => setNewInvestor({...newInvestor, email: e.target.value})}
                    className={rt('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                    placeholder="john@acme.vc"
                  />
                </div>
                <div>
                  <Label className={rt('text-slate-500', 'text-zinc-400')}>Phone</Label>
                  <Input
                    value={newInvestor.phone}
                    onChange={(e) => setNewInvestor({...newInvestor, phone: e.target.value})}
                    className={rt('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
              <div>
                <Label className={rt('text-slate-500', 'text-zinc-400')}>Investment Focus</Label>
                <Input
                  value={newInvestor.investment_focus}
                  onChange={(e) => setNewInvestor({...newInvestor, investment_focus: e.target.value})}
                  className={rt('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                  placeholder="B2B SaaS, AI/ML"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={rt('text-slate-500', 'text-zinc-400')}>Typical Check Size</Label>
                  <Input
                    value={newInvestor.typical_check_size}
                    onChange={(e) => setNewInvestor({...newInvestor, typical_check_size: e.target.value})}
                    className={rt('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                    placeholder="€500K - €2M"
                  />
                </div>
                <div>
                  <Label className={rt('text-slate-500', 'text-zinc-400')}>Status</Label>
                  <Select value={newInvestor.status} onValueChange={(v) => setNewInvestor({...newInvestor, status: v})}>
                    <SelectTrigger className={rt('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}>
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
                <Label className={rt('text-slate-500', 'text-zinc-400')}>Notes</Label>
                <Textarea
                  value={newInvestor.notes}
                  onChange={(e) => setNewInvestor({...newInvestor, notes: e.target.value})}
                  className={rt('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                  placeholder="Add notes about this investor..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className={rt('border-slate-200', 'border-zinc-700')}>
                Cancel
              </Button>
              <Button onClick={handleAddInvestor} className="bg-orange-500 hover:bg-orange-600">
                Add Investor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RaisePageTransition>
  );
}

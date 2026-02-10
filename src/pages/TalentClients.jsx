import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import anime from '@/lib/anime-wrapper';
const animate = anime;
import { prefersReducedMotion } from '@/lib/animations';
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { createPageUrl } from "@/utils";
import {
  Plus, Building2, User, Euro, Mail, Phone, ExternalLink, Trash2,
  Search, Edit2, Eye, Loader2, MoreHorizontal, MapPin, Globe, Briefcase,
  Users, TrendingUp, Calendar, Filter, X, Grid3X3, List, ArrowUpDown, Sparkles,
  ShieldAlert, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { QuickAddClientModal } from '@/components/talent';

// Client Pipeline Stages - all red shades
const CLIENT_STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-zinc-500', textColor: 'text-zinc-400' },
  { id: 'prospect', label: 'Prospect', color: 'bg-red-400', textColor: 'text-red-300' },
  { id: 'active', label: 'Active', color: 'bg-red-500', textColor: 'text-red-400' },
  { id: 'retained', label: 'Retained', color: 'bg-red-600', textColor: 'text-red-400' },
  { id: 'dormant', label: 'Dormant', color: 'bg-red-800', textColor: 'text-red-500' },
];

const emptyForm = {
  company: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  job_title: '',
  location: '',
  website: '',
  industry: '',
  company_size: '',
  stage: 'lead',
  recruitment_fee_percentage: '20',
  recruitment_fee_flat: '',
  notes: '',
  exclude_candidates: false,
  company_aliases: [],
  aliasInput: '',
};

function ClientCard({ client, onEdit, onDelete, onView }) {
  const stage = CLIENT_STAGES.find(s => s.id === client.stage) || CLIENT_STAGES[0];
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800/60 hover:border-zinc-700/60 transition-all duration-200 overflow-hidden"
    >
      {/* Top gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${stage.color} opacity-60`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0" onClick={() => onView(client)}>
            <h4 className="font-semibold text-white truncate cursor-pointer hover:text-red-400/80 transition-colors">
              {client.company || 'Unnamed Company'}
            </h4>
            {fullName && (
              <p className="text-zinc-500 text-sm flex items-center gap-1.5 mt-1">
                <User className="w-3 h-3" />
                <span className="truncate">{fullName}</span>
                {client.job_title && <span className="text-zinc-600">· {client.job_title}</span>}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4 text-zinc-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={() => onView(client)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                <Eye className="w-4 h-4 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(client)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                <Edit2 className="w-4 h-4 mr-2" /> Edit Client
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-red-400 focus:text-red-300 focus:bg-red-950/30">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact info */}
        <div className="mt-3 space-y-1">
          {client.email && (
            <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-red-400 transition-colors">
              <Mail className="w-3 h-3" />
              <span className="truncate">{client.email}</span>
            </a>
          )}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-red-400 transition-colors">
              <Phone className="w-3 h-3" />
              <span>{client.phone}</span>
            </a>
          )}
          {client.location && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <MapPin className="w-3 h-3" />
              <span>{client.location}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between">
          <Badge className={`text-[10px] px-2 py-0.5 h-5 ${stage.color}/20 ${stage.textColor} border-0`}>
            {stage.label}
          </Badge>
          {client.recruitment_fee_percentage && (
            <span className="text-xs text-zinc-500">
              Fee: {client.recruitment_fee_percentage}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ClientTableRow({ client, onEdit, onDelete, onView, reducedMotion }) {
  const stage = CLIENT_STAGES.find(s => s.id === client.stage) || CLIENT_STAGES[0];
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ');

  return (
    <TableRow
      className="border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
      style={{ opacity: reducedMotion ? 1 : undefined }}
    >
      <TableCell className="font-medium text-white">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${stage.color}`} />
          <div>
            <span className="cursor-pointer hover:text-red-400 transition-colors" onClick={() => onView(client)}>
              {client.company || 'Unnamed Company'}
            </span>
            {client.industry && (
              <p className="text-xs text-zinc-500 mt-0.5">{client.industry}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-zinc-400">
        {fullName && (
          <div>
            <span>{fullName}</span>
            {client.job_title && (
              <p className="text-xs text-zinc-500 mt-0.5">{client.job_title}</p>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-zinc-400">
        {client.email && (
          <a href={`mailto:${client.email}`} className="hover:text-red-400 transition-colors">
            {client.email}
          </a>
        )}
      </TableCell>
      <TableCell>
        <Badge className={`text-[10px] px-2 py-0.5 ${stage.color}/20 ${stage.textColor} border-0`}>
          {stage.label}
        </Badge>
      </TableCell>
      <TableCell className="text-zinc-400">
        {client.recruitment_fee_percentage ? `${client.recruitment_fee_percentage}%` : '-'}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={() => onView(client)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
              <Eye className="w-4 h-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(client)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
              <Edit2 className="w-4 h-4 mr-2" /> Edit Client
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-red-400 focus:text-red-300 focus:bg-red-950/30">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function TalentClients() {
  const { user } = useUser();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [reducedMotion] = useState(() => prefersReducedMotion());

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const statsGridRef = useRef(null);

  useEffect(() => {
    if (user?.organization_id) {
      loadData();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.organization_id) {
      console.log('No organization_id found, user:', user);
      setLoading(false);
      return;
    }

    console.log('Loading clients for organization:', user.organization_id);

    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('contact_type', 'recruitment_client')
        .order('created_date', { ascending: false });

      console.log('Query result:', JSON.stringify({ data, error }, null, 2));

      if (error) {
        console.error('Supabase error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      setClients(data || []);
      console.log('Loaded', data?.length || 0, 'clients');
    } catch (error) {
      console.error('Failed to load clients:', error?.message || error);
      toast.error(error?.message || 'Failed to load recruitment clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.company && !formData.first_name && !formData.last_name) {
      toast.error('Please enter a company name or contact name');
      return;
    }

    setSaving(true);
    try {
      const clientData = {
        organization_id: user.organization_id,
        contact_type: 'recruitment_client',
        company: formData.company || null,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        job_title: formData.job_title || null,
        location: formData.location || null,
        website: formData.website || null,
        industry: formData.industry || null,
        company_size: formData.company_size || null,
        stage: formData.stage || 'lead',
        recruitment_fee_percentage: formData.recruitment_fee_percentage ? parseFloat(formData.recruitment_fee_percentage) : null,
        recruitment_fee_flat: formData.recruitment_fee_flat ? parseFloat(formData.recruitment_fee_flat) : null,
        notes: formData.notes || null,
        is_recruitment_client: true,
        exclude_candidates: formData.exclude_candidates || false,
        company_aliases: formData.company_aliases || [],
      };

      console.log('Submitting client:', JSON.stringify(clientData, null, 2));

      let savedClient;
      if (selectedClient) {
        const { data, error } = await supabase
          .from('prospects')
          .update(clientData)
          .eq('id', selectedClient.id)
          .select()
          .single();

        if (error) throw error;
        savedClient = data;
        toast.success('Client updated successfully');
      } else {
        const { data, error } = await supabase
          .from('prospects')
          .insert(clientData)
          .select()
          .single();

        if (error) throw error;
        savedClient = data;
        toast.success('Client created successfully');
      }

      // Retroactive exclusion: if exclude_candidates was just turned on, mark matching candidates
      if (savedClient?.exclude_candidates && savedClient?.id) {
        const wasExcluding = selectedClient?.exclude_candidates || false;
        if (!wasExcluding || !selectedClient) {
          try {
            const { data: countResult } = await supabase.rpc('exclude_candidates_for_client', {
              p_client_id: savedClient.id,
              p_organization_id: user.organization_id,
            });
            if (countResult && countResult > 0) {
              toast.info(`${countResult} candidate${countResult > 1 ? 's' : ''} from ${savedClient.company} ruled out`);
            }
          } catch (err) {
            console.error('Retroactive exclusion failed:', err);
          }
        }
      }

      // If exclusion was turned OFF, recover candidates
      if (selectedClient?.exclude_candidates && !formData.exclude_candidates) {
        try {
          const { error: recoverError } = await supabase
            .from('candidates')
            .update({ excluded_reason: null, excluded_client_id: null, excluded_at: null })
            .eq('excluded_client_id', selectedClient.id)
            .eq('organization_id', user.organization_id);
          if (!recoverError) {
            toast.info(`Candidates from ${savedClient.company} recovered`);
          }
        } catch (err) {
          console.error('Recovery failed:', err);
        }
      }

      setShowModal(false);
      setSelectedClient(null);
      setFormData(emptyForm);
      loadData();
    } catch (error) {
      console.error('Failed to save:', error?.message || error);
      toast.error(error?.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client? This action cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Client deleted');
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete client');
    }
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    setFormData({
      company: client.company || '',
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      email: client.email || '',
      phone: client.phone || '',
      job_title: client.job_title || '',
      location: client.location || '',
      website: client.website || '',
      industry: client.industry || '',
      company_size: client.company_size || '',
      stage: client.stage || 'lead',
      recruitment_fee_percentage: client.recruitment_fee_percentage?.toString() || '20',
      recruitment_fee_flat: client.recruitment_fee_flat?.toString() || '',
      notes: client.notes || '',
      exclude_candidates: client.exclude_candidates || false,
      company_aliases: client.company_aliases || [],
      aliasInput: '',
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setSelectedClient(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openViewModal = (client) => {
    openEditModal(client);
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return (clients || []).filter(client => {
      const matchesSearch = searchQuery === '' ||
        (client.company?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (client.first_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (client.last_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (client.email?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStage = stageFilter === 'all' || client.stage === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [clients, searchQuery, stageFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = clients.length;
    const byStage = CLIENT_STAGES.reduce((acc, stage) => {
      acc[stage.id] = clients.filter(c => c.stage === stage.id).length;
      return acc;
    }, {});
    const activeClients = clients.filter(c => c.stage === 'active' || c.stage === 'retained').length;

    return { total, byStage, activeClients };
  }, [clients]);

  // Animate header on mount
  useEffect(() => {
    if (loading || !headerRef.current || reducedMotion) return;

    animate({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, [loading, reducedMotion]);

  // Animate stats grid
  useEffect(() => {
    if (loading || !statsGridRef.current || reducedMotion) return;

    const cards = statsGridRef.current.querySelectorAll('.stat-card');
    if (cards.length === 0) return;

    Array.from(cards).forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
    });

    animate({
      targets: cards,
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(60, { start: 100 }),
      duration: 450,
      easing: 'easeOutQuart',
    });
  }, [loading, stats, reducedMotion]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 bg-zinc-800 rounded-lg" />)}
          </div>
          <Skeleton className="h-[300px] w-full bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        <div ref={headerRef} style={{ opacity: reducedMotion ? 1 : 0 }}>
          <PageHeader
            icon={Building2}
            title="Recruitment Clients"
            subtitle={`${stats.total} clients · ${stats.activeClients} active`}
            color="red"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowQuickAddModal(true)}
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Quick Add
                </Button>
                <Button
                  onClick={openNewModal}
                  size="sm"
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </div>
            }
          />
        </div>

        {/* Stats Row */}
        <div ref={statsGridRef} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="stat-card p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-[10px]">Total Clients</p>
                <p className="text-lg font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-red-400/70" />
              </div>
            </div>
          </div>

          {CLIENT_STAGES.slice(0, 4).map(stage => (
            <div key={stage.id} className="stat-card p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-[10px]">{stage.label}</p>
                  <p className="text-lg font-bold text-white">{stats.byStage[stage.id] || 0}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg ${stage.color}/20 flex items-center justify-center`}>
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-red-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40 bg-zinc-900/50 border-zinc-800 text-white">
                <Filter className="w-4 h-4 mr-2 text-zinc-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Stages</SelectItem>
                {CLIENT_STAGES.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                      {stage.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400 hover:text-white'}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400 hover:text-white'}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {clients.length === 0 ? 'Add Your First Client' : 'No Clients Found'}
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
              {clients.length === 0
                ? 'Track your recruitment clients and their fee agreements. Add your first client to get started.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {clients.length === 0 && (
              <Button onClick={openNewModal} className="bg-red-600/80 hover:bg-red-600 text-white font-medium px-6">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Company</TableHead>
                  <TableHead className="text-zinc-400">Contact</TableHead>
                  <TableHead className="text-zinc-400">Email</TableHead>
                  <TableHead className="text-zinc-400">Stage</TableHead>
                  <TableHead className="text-zinc-400">Fee</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredClients.map((client) => (
                    <ClientTableRow
                      key={client.id}
                      client={client}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                      onView={openViewModal}
                      reducedMotion={reducedMotion}
                    />
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence>
              {filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onView={openViewModal}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-red-500/10 to-red-600/10">
              <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-red-400" />
                </div>
                {selectedClient ? 'Edit Client' : 'New Recruitment Client'}
              </DialogTitle>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Company Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                  <Building2 className="w-3 h-3" />
                  Company Information
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-zinc-400 text-sm mb-1.5 block">Company Name</label>
                    <Input
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                      placeholder="e.g. TechCorp Inc."
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Industry</label>
                    <Input
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                      placeholder="e.g. Technology"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Company Size</label>
                    <Select value={formData.company_size} onValueChange={(v) => setFormData({ ...formData, company_size: v })}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-zinc-400 text-sm mb-1.5 block">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                  <User className="w-3 h-3" />
                  Contact Person
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">First Name</label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Last Name</label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Job Title</label>
                    <Input
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                      placeholder="HR Manager"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Stage</label>
                    <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {CLIENT_STAGES.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${s.color}`} />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                  <MapPin className="w-3 h-3" />
                  Location
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1.5 block">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="pl-10 bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500"
                      placeholder="Amsterdam, Netherlands"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Structure */}
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                  <Euro className="w-3 h-3" />
                  Default Fee Structure
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Fee Percentage</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.recruitment_fee_percentage}
                        onChange={(e) => setFormData({ ...formData, recruitment_fee_percentage: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 text-white pr-7"
                        placeholder="20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Or Flat Fee</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">€</span>
                      <Input
                        type="number"
                        value={formData.recruitment_fee_flat}
                        onChange={(e) => setFormData({ ...formData, recruitment_fee_flat: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 text-white pl-7"
                        placeholder="5000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-zinc-400 text-sm mb-1.5 block">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-red-500 resize-none"
                  rows={3}
                  placeholder="Add any relevant notes about this client..."
                />
              </div>

              {/* Candidate Exclusion */}
              <div className={`p-3 rounded-lg border space-y-3 ${formData.exclude_candidates ? 'bg-red-500/5 border-red-500/30' : 'bg-zinc-800/30 border-zinc-700/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-4 h-4 ${formData.exclude_candidates ? 'text-red-400' : 'text-zinc-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-white">Exclude Candidates</p>
                      <p className="text-xs text-zinc-500">Never contact candidates from this company</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, exclude_candidates: !formData.exclude_candidates })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.exclude_candidates ? 'bg-red-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.exclude_candidates ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {formData.exclude_candidates && (
                  <div className="pt-2 border-t border-red-500/20 space-y-2">
                    <label className="text-zinc-400 text-xs block">Company Aliases (also known as)</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(formData.company_aliases || []).map((alias, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md text-xs border border-red-500/20">
                          {alias}
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              company_aliases: formData.company_aliases.filter((_, j) => j !== i),
                            })}
                            className="hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={formData.aliasInput || ''}
                        onChange={(e) => setFormData({ ...formData, aliasInput: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && formData.aliasInput?.trim()) {
                            e.preventDefault();
                            setFormData({
                              ...formData,
                              company_aliases: [...(formData.company_aliases || []), formData.aliasInput.trim()],
                              aliasInput: '',
                            });
                          }
                        }}
                        className="bg-zinc-800/50 border-zinc-700 text-white text-xs h-8"
                        placeholder="e.g. Deloitte Nederland B.V."
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-zinc-700 text-zinc-400 hover:text-white"
                        onClick={() => {
                          if (formData.aliasInput?.trim()) {
                            setFormData({
                              ...formData,
                              company_aliases: [...(formData.company_aliases || []), formData.aliasInput.trim()],
                              aliasInput: '',
                            });
                          }
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-zinc-600">Press Enter to add. Include all known variations of the company name.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={(!formData.company && !formData.first_name && !formData.last_name) || saving}
                className="bg-red-500 hover:bg-red-400 text-white min-w-[100px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {selectedClient ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  selectedClient ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Add Modal */}
        <QuickAddClientModal
          isOpen={showQuickAddModal}
          onClose={() => setShowQuickAddModal(false)}
          onSuccess={loadData}
        />
      </div>
    </div>
  );
}

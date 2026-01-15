import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Search,
  Filter,
  Grid3X3,
  List,
  MapPin,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Clock,
  ArrowRight,
  ExternalLink,
  MoreHorizontal,
  Star,
  StarOff,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Briefcase,
  Users,
  Globe,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Client Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-red-500/20 text-red-400 border-red-500/30",
    prospect: "bg-red-500/20 text-red-400 border-red-500/30",
    inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    churned: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.prospect}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Prospect'}
    </span>
  );
};

// Client Avatar
const ClientAvatar = ({ name, logo, size = "md" }) => {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";

  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className={`${sizes[size]} rounded-lg object-cover ring-2 ring-white/10`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center font-medium text-white ring-2 ring-white/10`}
    >
      {initials}
    </div>
  );
};

// Empty form for new client
const emptyForm = {
  name: '',
  company_name: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  location: '',
  status: 'prospect',
  notes: '',
  contact_person: '',
  contact_title: '',
};

export default function TalentClients() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [deals, setDeals] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Load clients and deals
  useEffect(() => {
    if (user?.company_id) {
      loadData();
    }
  }, [user?.company_id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load clients (contacts with type='client')
      const { data: clientsData, error: clientsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('contact_type', 'client')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Load deals to calculate client metrics
      const { data: dealsData, error: dealsError } = await supabase
        .from('talent_deals')
        .select('*')
        .eq('company_id', user.company_id);

      if (dealsError && dealsError.code !== 'PGRST116') {
        console.warn('Error loading deals:', dealsError);
      }

      setClients(clientsData || []);
      setDeals(dealsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active').length;
    const totalRevenue = deals
      .filter(d => d.stage === 'confirmed')
      .reduce((sum, d) => sum + (d.deal_value || 0), 0);
    const activeDeals = deals.filter(d => !['confirmed', 'lost'].includes(d.stage)).length;

    return {
      total: clients.length,
      active: activeClients,
      revenue: totalRevenue,
      deals: activeDeals,
    };
  }, [clients, deals]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = !searchQuery ||
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  // Get deals for a client
  const getClientDeals = (clientId) => {
    return deals.filter(d => d.client_id === clientId);
  };

  // Get client revenue
  const getClientRevenue = (clientId) => {
    return deals
      .filter(d => d.client_id === clientId && d.stage === 'confirmed')
      .reduce((sum, d) => sum + (d.deal_value || 0), 0);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name && !formData.company_name) {
      toast.error('Please enter a name or company name');
      return;
    }

    setSaving(true);
    try {
      const clientData = {
        ...formData,
        name: formData.name || formData.company_name,
        company_id: user.company_id,
        contact_type: 'client',
        updated_at: new Date().toISOString(),
      };

      if (editingClient) {
        const { error } = await supabase
          .from('contacts')
          .update(clientData)
          .eq('id', editingClient.id);
        if (error) throw error;
        toast.success('Client updated successfully');
      } else {
        clientData.created_at = new Date().toISOString();
        const { error } = await supabase
          .from('contacts')
          .insert([clientData]);
        if (error) throw error;
        toast.success('Client added successfully');
      }

      setIsModalOpen(false);
      setEditingClient(null);
      setFormData(emptyForm);
      loadData();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (clientId) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', clientId);
      if (error) throw error;
      toast.success('Client deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  // Open edit modal
  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone || '',
      website: client.website || '',
      industry: client.industry || '',
      location: client.location || client.city || '',
      status: client.status || 'prospect',
      notes: client.notes || '',
      contact_person: client.contact_person || '',
      contact_title: client.contact_title || '',
    });
    setIsModalOpen(true);
  };

  // Open add modal
  const openAddModal = () => {
    setEditingClient(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 bg-zinc-800 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-96 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={Building2}
          title="Recruitment Clients"
          subtitle="Manage your hiring clients and track relationships"
          color="red"
          actions={
            <Button
              onClick={openAddModal}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Total Clients" value={stats.total} color="red" />
          <StatCard icon={CheckCircle2} label="Active Clients" value={stats.active} color="red" />
          <StatCard icon={Briefcase} label="Active Deals" value={stats.deals} color="red" />
          <StatCard icon={DollarSign} label="Total Revenue" value={`€${stats.revenue.toLocaleString()}`} color="red" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-zinc-900/50 border-zinc-800 text-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-zinc-800 text-white" : "text-zinc-400"}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-zinc-800 text-white" : "text-zinc-400"}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Clients Grid/List */}
        {filteredClients.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Building2 className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No clients yet</h3>
            <p className="text-zinc-400 mb-6">Start building your client relationships</p>
            <Button onClick={openAddModal} className="bg-red-600 hover:bg-red-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Client
            </Button>
          </GlassCard>
        ) : viewMode === "grid" ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredClients.map((client) => {
              const clientDeals = getClientDeals(client.id);
              const clientRevenue = getClientRevenue(client.id);

              return (
                <motion.div key={client.id} variants={itemVariants}>
                  <GlassCard className="p-5 hover:border-red-500/30 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <ClientAvatar name={client.name || client.company_name} logo={client.logo} />
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors">
                            {client.name || client.company_name}
                          </h3>
                          {client.industry && (
                            <p className="text-xs text-zinc-500">{client.industry}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                          <DropdownMenuItem onClick={() => openEditModal(client)} className="text-zinc-300">
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="text-zinc-300">
                            <Link to={createPageUrl('TalentDeals')}>
                              <Briefcase className="w-4 h-4 mr-2" /> View Deals
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 space-y-2">
                      {client.location && (
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{client.location}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.contact_person && (
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Users className="w-3.5 h-3.5" />
                          <span className="truncate">{client.contact_person}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-white">{clientDeals.length}</p>
                          <p className="text-xs text-zinc-500">Deals</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-red-400">€{clientRevenue.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">Revenue</p>
                        </div>
                      </div>
                      <StatusBadge status={client.status} />
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <GlassCard className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-4 text-zinc-400 font-medium text-sm">Client</th>
                  <th className="text-left p-4 text-zinc-400 font-medium text-sm">Contact</th>
                  <th className="text-left p-4 text-zinc-400 font-medium text-sm">Location</th>
                  <th className="text-center p-4 text-zinc-400 font-medium text-sm">Deals</th>
                  <th className="text-right p-4 text-zinc-400 font-medium text-sm">Revenue</th>
                  <th className="text-center p-4 text-zinc-400 font-medium text-sm">Status</th>
                  <th className="text-right p-4 text-zinc-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const clientDeals = getClientDeals(client.id);
                  const clientRevenue = getClientRevenue(client.id);

                  return (
                    <tr key={client.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <ClientAvatar name={client.name || client.company_name} logo={client.logo} size="sm" />
                          <div>
                            <p className="font-medium text-white">{client.name || client.company_name}</p>
                            {client.industry && (
                              <p className="text-xs text-zinc-500">{client.industry}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {client.email && (
                            <p className="text-sm text-zinc-400">{client.email}</p>
                          )}
                          {client.phone && (
                            <p className="text-sm text-zinc-500">{client.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400">{client.location || '-'}</td>
                      <td className="p-4 text-center text-white">{clientDeals.length}</td>
                      <td className="p-4 text-right text-red-400 font-medium">
                        €{clientRevenue.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem onClick={() => openEditModal(client)} className="text-zinc-300">
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-400">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </GlassCard>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Company Name</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Corp"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Industry</label>
                <Input
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Technology"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Contact Person</label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="John Smith"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Title</label>
                <Input
                  value={formData.contact_title}
                  onChange={(e) => setFormData({ ...formData, contact_title: e.target.value })}
                  placeholder="HR Director"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Website</label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://company.com"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Amsterdam, Netherlands"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Status</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this client..."
                className="bg-zinc-800 border-zinc-700 text-white h-20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="border-zinc-700 text-zinc-300">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-500">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingClient ? 'Update Client' : 'Add Client'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

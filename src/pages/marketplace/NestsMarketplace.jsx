/**
 * Nests Marketplace Page
 * Users can browse and purchase data nests for Talent, Growth, and Raise
 * Enhanced with smart filtering, preview, and better discovery
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  Users,
  Briefcase,
  Building2,
  Search,
  Filter,
  ShoppingCart,
  Eye,
  CheckCircle,
  Check,
  Loader2,
  TrendingUp,
  DollarSign,
  MapPin,
  Sparkles,
  X,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/components/context/UserContext";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import Layout from "@/pages/Layout";

// Nest type config
const NEST_TYPE_CONFIG = {
  candidates: {
    icon: Users,
    label: 'Candidate Nests',
    description: 'Curated lists for recruitment',
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  },
  prospects: {
    icon: Briefcase,
    label: 'Prospect Nests',
    description: 'Quality leads for sales',
    color: 'text-green-400 bg-green-500/20 border-green-500/30',
  },
  investors: {
    icon: Building2,
    label: 'Investor Nests',
    description: 'Investor contacts for fundraising',
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  },
};

// Filter options
const industries = ['Technology', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'Engineering', 'Design', 'Operations'];
const locations = ['United States', 'Europe', 'Asia Pacific', 'Remote', 'Netherlands', 'United Kingdom', 'Germany'];
const priceRanges = [
  { value: 'all', label: 'All Prices' },
  { value: 'free', label: 'Free' },
  { value: 'under50', label: 'Under $50' },
  { value: 'under100', label: 'Under $100' },
  { value: 'premium', label: 'Premium ($100+)' },
];
const sizeRanges = [
  { value: 'all', label: 'All Sizes' },
  { value: 'small', label: 'Small (<50)' },
  { value: 'medium', label: 'Medium (50-200)' },
  { value: 'large', label: 'Large (>200)' },
];

// Format currency
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Glass Card component
const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Enhanced Nest Card
function NestCard({ nest, isPurchased, onPreview, onViewDetails }) {
  const config = NEST_TYPE_CONFIG[nest.nest_type] || NEST_TYPE_CONFIG.candidates;
  const Icon = config.icon;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <GlassCard className="p-4 h-full flex flex-col hover:border-red-500/30 transition-all">
        {/* Header with Category Badge */}
        <div className="flex items-start justify-between mb-3">
          <Badge className="bg-zinc-800 text-zinc-300 text-xs">
            {nest.category || nest.nest_type || 'General'}
          </Badge>
          {isPurchased && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <Check className="w-3 h-3 mr-1" />
              Owned
            </Badge>
          )}
        </div>

        {/* Thumbnail or Icon */}
        <div className="w-full h-20 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center mb-3 overflow-hidden">
          {nest.thumbnail_url ? (
            <img
              src={nest.thumbnail_url}
              alt={nest.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className={`w-8 h-8 ${config.color.split(' ')[0]}`} />
          )}
        </div>

        {/* Title and Description */}
        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-red-400 transition-colors">
          {nest.name}
        </h3>
        <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
          {nest.description || 'No description available'}
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded bg-zinc-800/50">
            <p className="text-lg font-bold text-white">{nest.item_count || 0}</p>
            <p className="text-[10px] text-zinc-500">Candidates</p>
          </div>
          <div className="text-center p-2 rounded bg-zinc-800/50">
            <p className="text-lg font-bold text-cyan-400">{nest.avg_intel_score || '--'}</p>
            <p className="text-[10px] text-zinc-500">Avg Intel</p>
          </div>
          <div className="text-center p-2 rounded bg-zinc-800/50">
            <p className="text-lg font-bold text-green-400">{nest.purchase_count || 0}</p>
            <p className="text-[10px] text-zinc-500">Purchased</p>
          </div>
        </div>

        {/* Tags */}
        {nest.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {nest.tags.slice(0, 4).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                {tag}
              </Badge>
            ))}
            {nest.tags.length > 4 && (
              <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                +{nest.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Location indicator */}
        {nest.location && (
          <div className="flex items-center gap-1 text-xs text-zinc-500 mb-3">
            <MapPin className="w-3 h-3" />
            {nest.location}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price and Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div>
            {nest.price === 0 ? (
              <span className="text-green-400 font-medium">Free</span>
            ) : (
              <span className="text-white font-medium">{formatCurrency(nest.price, nest.currency)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(nest);
              }}
              className="border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(nest);
              }}
              className={isPurchased ? "bg-zinc-700 hover:bg-zinc-600" : "bg-red-500 hover:bg-red-600"}
            >
              {isPurchased ? 'View' : 'Details'}
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Nest Preview Modal
function NestPreviewModal({ nest, open, onOpenChange }) {
  const [previewCandidates, setPreviewCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && nest?.id) {
      fetchPreview();
    }
  }, [open, nest?.id]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      // Try to get preview candidates from nest_items with is_preview flag
      const { data } = await supabase
        .from('nest_items')
        .select('preview_data, candidate_id')
        .eq('nest_id', nest.id)
        .eq('is_preview', true)
        .limit(5);

      if (data?.length > 0) {
        setPreviewCandidates(data.map(d => d.preview_data).filter(Boolean));
      } else {
        // Fallback: get sample from candidates linked to this nest
        const { data: candidateData } = await supabase
          .from('candidates')
          .select('id, full_name, title, company, location, skills')
          .eq('import_source', `nest:${nest.id}`)
          .limit(5);

        if (candidateData?.length > 0) {
          setPreviewCandidates(candidateData.map(c => ({
            name: c.full_name,
            title: c.title,
            company: c.company,
            location: c.location,
            skills: c.skills || [],
          })));
        } else {
          // Generate mock preview data for demo
          setPreviewCandidates([
            { name: 'Sample Candidate', title: 'Senior Engineer', location: 'Remote', skills: ['React', 'Node.js'] },
            { name: 'Another Candidate', title: 'Product Manager', location: 'New York', skills: ['Agile', 'Strategy'] },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch preview:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">{nest?.name}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Preview of sample candidates in this nest
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : previewCandidates.length > 0 ? (
            previewCandidates.map((candidate, i) => (
              <div key={i} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {candidate.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{candidate.name || 'Anonymous'}</p>
                    <p className="text-sm text-zinc-400 truncate">{candidate.title || 'Professional'}</p>
                    {candidate.company && (
                      <p className="text-xs text-zinc-500 truncate">at {candidate.company}</p>
                    )}
                  </div>
                  {candidate.location && (
                    <Badge className="bg-zinc-700 text-zinc-300 text-xs shrink-0">
                      {candidate.location}
                    </Badge>
                  )}
                </div>
                {candidate.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {candidate.skills.slice(0, 4).map((skill, j) => (
                      <Badge key={j} className="bg-cyan-500/20 text-cyan-400 text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                    {candidate.skills.length > 4 && (
                      <Badge className="bg-zinc-700 text-zinc-400 text-[10px]">
                        +{candidate.skills.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-zinc-500 py-4">No preview available</p>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t border-zinc-800">
          <p className="text-sm text-zinc-400">
            {nest?.item_count || 0} total candidates
          </p>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate(`/marketplace/nests/${nest?.id}`);
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            View Full Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Filter Sidebar Component
function FilterSidebar({ filters, setFilters, activeFiltersCount }) {
  return (
    <div className="w-64 shrink-0 space-y-4">
      <GlassCard className="p-4">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </span>
          {activeFiltersCount > 0 && (
            <Badge className="bg-red-500/20 text-red-400 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </h3>

        {/* Industry */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Industry</Label>
          <Select
            value={filters.industry}
            onValueChange={(v) => setFilters(f => ({ ...f, industry: v }))}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="" className="text-white">All Industries</SelectItem>
              {industries.map(i => (
                <SelectItem key={i} value={i.toLowerCase()} className="text-white">{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-2 mt-3">
          <Label className="text-xs text-zinc-400">Location</Label>
          <Select
            value={filters.location}
            onValueChange={(v) => setFilters(f => ({ ...f, location: v }))}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="" className="text-white">All Locations</SelectItem>
              {locations.map(l => (
                <SelectItem key={l} value={l.toLowerCase()} className="text-white">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-2 mt-3">
          <Label className="text-xs text-zinc-400">Nest Size</Label>
          <div className="space-y-1">
            {sizeRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setFilters(f => ({ ...f, size: range.value }))}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  filters.size === range.value
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-2 mt-3">
          <Label className="text-xs text-zinc-400">Price</Label>
          <div className="space-y-1">
            {priceRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setFilters(f => ({ ...f, priceRange: range.value }))}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  filters.priceRange === range.value
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({ industry: '', location: '', skills: [], priceRange: 'all', size: 'all' })}
          className="w-full mt-4 text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      </GlassCard>

      {/* Quick Tips */}
      <GlassCard className="p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Tips
        </h3>
        <ul className="space-y-2 text-xs text-zinc-400">
          <li className="flex items-start gap-2">
            <Star className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />
            <span>Higher intel scores mean better candidate data</span>
          </li>
          <li className="flex items-start gap-2">
            <Eye className="w-3 h-3 mt-0.5 text-cyan-400 shrink-0" />
            <span>Preview candidates before purchasing</span>
          </li>
          <li className="flex items-start gap-2">
            <TrendingUp className="w-3 h-3 mt-0.5 text-green-400 shrink-0" />
            <span>Popular nests are purchased frequently</span>
          </li>
        </ul>
      </GlassCard>
    </div>
  );
}

export default function NestsMarketplace() {
  const { user, company } = useUser();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState('all');
  const [nests, setNests] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewNest, setPreviewNest] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    industry: '',
    location: '',
    skills: [],
    priceRange: 'all',
    size: 'all',
  });

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.industry) count++;
    if (filters.location) count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.size !== 'all') count++;
    if (filters.skills.length > 0) count++;
    return count;
  }, [filters]);

  // Fetch nests and purchases
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch active nests
      let query = supabase
        .from('nests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('nest_type', activeTab);
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data: nestsData, error: nestsError } = await query;
      if (nestsError) throw nestsError;

      setNests(nestsData || []);

      // Fetch user's purchases
      if (company?.id) {
        const { data: purchasesData } = await supabase
          .from('nest_purchases')
          .select('nest_id')
          .eq('organization_id', company.id)
          .eq('status', 'completed');

        const purchasedSet = new Set((purchasesData || []).map(p => p.nest_id));
        setPurchasedIds(purchasedSet);
      }
    } catch (err) {
      console.error('Failed to fetch nests:', err);
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, company?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply client-side filters
  const filteredNests = useMemo(() => {
    return nests.filter(nest => {
      // Industry filter
      if (filters.industry && nest.category?.toLowerCase() !== filters.industry) {
        return false;
      }

      // Location filter
      if (filters.location && !nest.location?.toLowerCase().includes(filters.location)) {
        return false;
      }

      // Price filter
      if (filters.priceRange !== 'all') {
        const price = nest.price || 0;
        if (filters.priceRange === 'free' && price > 0) return false;
        if (filters.priceRange === 'under50' && (price === 0 || price >= 50)) return false;
        if (filters.priceRange === 'under100' && (price === 0 || price >= 100)) return false;
        if (filters.priceRange === 'premium' && price < 100) return false;
      }

      // Size filter
      if (filters.size !== 'all') {
        const count = nest.item_count || 0;
        if (filters.size === 'small' && count >= 50) return false;
        if (filters.size === 'medium' && (count < 50 || count > 200)) return false;
        if (filters.size === 'large' && count <= 200) return false;
      }

      return true;
    });
  }, [nests, filters]);

  // Navigate to detail page
  const handleViewDetails = (nest) => {
    navigate(`/marketplace/nests/${nest.id}`);
  };

  // Open preview modal
  const handlePreview = (nest) => {
    setPreviewNest(nest);
    setShowPreview(true);
  };

  // Stats
  const stats = {
    total: nests.length,
    purchased: purchasedIds.size,
    candidates: nests.filter(n => n.nest_type === 'candidates').length,
    prospects: nests.filter(n => n.nest_type === 'prospects').length,
    investors: nests.filter(n => n.nest_type === 'investors').length,
  };

  return (
    <Layout>
      <div className="min-h-screen bg-black px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Data Nests Marketplace</h1>
            <p className="text-zinc-400 mt-1">
              Purchase curated datasets for recruitment, sales, and fundraising
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace/nests/purchased')}
              className="border-white/10 bg-white/5 hover:bg-white/10"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              My Purchases ({purchasedIds.size})
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900/50 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-zinc-500">Available Nests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{stats.candidates}</p>
                  <p className="text-xs text-zinc-500">Candidate Nests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Briefcase className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{stats.prospects}</p>
                  <p className="text-xs text-zinc-500">Prospect Nests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Building2 className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{stats.investors}</p>
                  <p className="text-xs text-zinc-500">Investor Nests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900/50 border border-white/5">
              <TabsTrigger value="all" className="data-[state=active]:bg-white/10">
                All
              </TabsTrigger>
              <TabsTrigger value="candidates" className="data-[state=active]:bg-white/10">
                <Users className="w-4 h-4 mr-2" />
                Candidates
              </TabsTrigger>
              <TabsTrigger value="prospects" className="data-[state=active]:bg-white/10">
                <Briefcase className="w-4 h-4 mr-2" />
                Prospects
              </TabsTrigger>
              <TabsTrigger value="investors" className="data-[state=active]:bg-white/10">
                <Building2 className="w-4 h-4 mr-2" />
                Investors
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search nests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-white/10"
            />
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            activeFiltersCount={activeFiltersCount}
          />

          {/* Nests Grid */}
          <div className="flex-1">
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-400">
                Showing {filteredNests.length} of {nests.length} nests
                {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied)`}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : filteredNests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <Package className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">No nests match your filters</p>
                <p className="text-sm text-zinc-500 mt-1">Try adjusting your filters or search query</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ industry: '', location: '', skills: [], priceRange: 'all', size: 'all' });
                    setSearchQuery('');
                  }}
                  className="mt-4 border-zinc-700"
                >
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredNests.map((nest) => (
                  <NestCard
                    key={nest.id}
                    nest={nest}
                    isPurchased={purchasedIds.has(nest.id)}
                    onPreview={handlePreview}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        <NestPreviewModal
          nest={previewNest}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      </div>
    </Layout>
  );
}

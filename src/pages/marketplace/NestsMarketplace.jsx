/**
 * Nests Marketplace Page
 * Users can browse and purchase data nests for Talent, Growth, and Raise
 */

import React, { useState, useEffect, useCallback } from "react";
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
  Loader2,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/components/context/UserContext";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import Layout from "@/pages/Layout";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Format currency
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function NestCard({ nest, isPurchased, onViewDetails }) {
  const config = NEST_TYPE_CONFIG[nest.nest_type] || NEST_TYPE_CONFIG.candidates;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer"
      onClick={() => onViewDetails(nest)}
    >
      {/* Thumbnail or Icon */}
      <div className="w-full h-24 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center mb-3 overflow-hidden">
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

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors text-sm">
            {nest.name}
          </h3>
          {isPurchased && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
              <CheckCircle className="w-3 h-3 mr-1" />
              Owned
            </Badge>
          )}
        </div>

        <p className="text-xs text-zinc-500 line-clamp-2">
          {nest.description || 'No description available'}
        </p>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              <Icon className="w-3 h-3 mr-1" />
              {nest.item_count || 0} items
            </Badge>
          </div>
          <span className="font-semibold text-white text-sm">
            {nest.price > 0 ? formatCurrency(nest.price, nest.currency) : 'Free'}
          </span>
        </div>
      </div>
    </motion.div>
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

  // Navigate to detail page
  const handleViewDetails = (nest) => {
    navigate(`/marketplace/nests/${nest.id}`);
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

        {/* Nests Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : nests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Package className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">No nests available</p>
            <p className="text-sm text-zinc-500 mt-1">Check back later for new datasets</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {nests.map((nest) => (
              <NestCard
                key={nest.id}
                nest={nest}
                isPurchased={purchasedIds.has(nest.id)}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

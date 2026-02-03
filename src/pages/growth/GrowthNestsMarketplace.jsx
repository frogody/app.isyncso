/**
 * Growth Nests Marketplace Page
 * Browse and purchase curated lead datasets for the Growth module
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  ShoppingCart,
  Eye,
  CheckCircle,
  Check,
  Loader2,
  Star,
  Sparkles,
  Tag,
  Mail,
  Phone,
  Linkedin,
  Building2,
  MapPin,
  Briefcase,
  Users,
  X,
  CreditCard,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { GrowthPageTransition } from '@/components/growth/ui';
import { PageHeader } from '@/components/ui/PageHeader';

// Badge configuration
const BADGE_CONFIG = {
  popular: { icon: Star, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  new: { icon: Sparkles, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  best_value: { icon: Tag, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

// Field icons
const FIELD_ICONS = {
  email: Mail,
  phone: Phone,
  linkedin_url: Linkedin,
  linkedin: Linkedin,
  company: Building2,
  location: MapPin,
  title: Briefcase,
};

// Format currency
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

// Glass card component
const GlassCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Nest Card Component
function NestCard({ nest, isPurchased, onPreview, onPurchase }) {
  const badgeConfig = nest.badge ? BADGE_CONFIG[nest.badge] : null;
  const BadgeIcon = badgeConfig?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <GlassCard className="p-4 h-full flex flex-col hover:border-indigo-500/30 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <Badge className="bg-zinc-800 text-zinc-300 text-xs">
            {nest.industry || 'General'}
          </Badge>
          <div className="flex items-center gap-2">
            {nest.badge && badgeConfig && (
              <Badge className={badgeConfig.color}>
                {BadgeIcon && <BadgeIcon className="w-3 h-3 mr-1" />}
                {nest.badge}
              </Badge>
            )}
            {isPurchased && (
              <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                <Check className="w-3 h-3 mr-1" />
                Owned
              </Badge>
            )}
          </div>
        </div>

        {/* Icon */}
        <div className="w-full h-20 rounded-lg bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
          <Package className="w-8 h-8 text-indigo-400" />
        </div>

        {/* Title and Description */}
        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
          {nest.name}
        </h3>
        <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
          {nest.short_description || nest.description || 'Curated lead dataset'}
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="text-center p-2 rounded bg-zinc-800/50">
            <p className="text-lg font-bold text-white">{(nest.lead_count || 0).toLocaleString()}</p>
            <p className="text-[10px] text-zinc-500">Leads</p>
          </div>
          <div className="text-center p-2 rounded bg-zinc-800/50">
            <p className="text-lg font-bold text-indigo-400">{nest.price_credits}</p>
            <p className="text-[10px] text-zinc-500">Credits</p>
          </div>
        </div>

        {/* Included Fields */}
        {nest.included_fields?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {nest.included_fields.slice(0, 5).map((field, i) => {
              const Icon = FIELD_ICONS[field] || Briefcase;
              return (
                <Badge key={i} variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                  <Icon className="w-3 h-3 mr-1" />
                  {field}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Region */}
        {nest.region && (
          <div className="flex items-center gap-1 text-xs text-zinc-500 mb-3">
            <MapPin className="w-3 h-3" />
            {nest.region}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(nest)}
            className="flex-1 border-zinc-700 hover:border-indigo-500/50"
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          {isPurchased ? (
            <Button
              size="sm"
              className="flex-1 bg-zinc-700 text-zinc-300"
              disabled
            >
              <Check className="w-4 h-4 mr-1" />
              Owned
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onPurchase(nest)}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-black"
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Buy
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Preview Modal Component
function PreviewModal({ nest, open, onClose }) {
  if (!nest) return null;

  const previewData = nest.preview_data || [];
  const columns = previewData[0] ? Object.keys(previewData[0]) : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            Preview: {nest.name}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-zinc-400 mb-4">
            Sample of {previewData.length} leads from this dataset (data masked for preview)
          </p>

          {previewData.length > 0 ? (
            <div className="overflow-x-auto border border-zinc-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800/50">
                  <tr>
                    {columns.map((col, i) => (
                      <th key={i} className="px-3 py-2 text-left text-zinc-400 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-zinc-800">
                      {columns.map((col, colIndex) => (
                        <td key={colIndex} className="px-3 py-2 text-zinc-300">
                          {row[col] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Preview data not available</p>
            </div>
          )}

          <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <p className="text-indigo-400 text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Purchase to unlock the full dataset of {(nest.lead_count || 0).toLocaleString()} leads
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} className="border-zinc-700">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Purchase Modal Component
function PurchaseModal({ nest, open, onClose, onConfirm, userCredits, loading }) {
  if (!nest) return null;

  const hasEnoughCredits = (userCredits || 0) >= (nest.price_credits || 99);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            Purchase Nest
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <h3 className="font-semibold text-white mb-1">{nest.name}</h3>
            <p className="text-sm text-zinc-400">{nest.short_description}</p>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <span className="text-2xl font-bold text-indigo-400">{nest.price_credits}</span>
                <span className="text-zinc-500 ml-1">credits</span>
              </div>
              <span className="text-zinc-600">or</span>
              <div>
                <span className="text-xl font-medium text-white">{formatCurrency(nest.price_usd)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
            <span className="text-zinc-400">Your balance:</span>
            <span className={`font-semibold ${hasEnoughCredits ? 'text-green-400' : 'text-red-400'}`}>
              {(userCredits || 0).toLocaleString()} credits
            </span>
          </div>

          {!hasEnoughCredits && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">
                Insufficient credits. You need {nest.price_credits - (userCredits || 0)} more credits.
              </p>
            </div>
          )}

          <div className="text-sm text-zinc-400">
            <p>After purchase:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>A new workspace will be created with all {(nest.lead_count || 0).toLocaleString()} leads</li>
              <li>You can enrich leads with additional data</li>
              <li>Credits will be deducted immediately</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} className="border-zinc-700">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!hasEnoughCredits || loading}
            className="bg-indigo-500 hover:bg-indigo-600 text-black"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Coins className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Processing...' : `Purchase for ${nest.price_credits} credits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function GrowthNestsMarketplace() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [nests, setNests] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [userCredits, setUserCredits] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');

  // Modals
  const [previewNest, setPreviewNest] = useState(null);
  const [purchaseNest, setPurchaseNest] = useState(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch nests
      const { data: nestsData, error: nestsError } = await supabase
        .from('growth_nests')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (nestsError) throw nestsError;
      setNests(nestsData || []);

      // Fetch user's purchases
      const { data: purchasesData } = await supabase
        .from('growth_nest_purchases')
        .select('nest_id, workspace_id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setPurchases(purchasesData || []);

      // Fetch user credits
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      setUserCredits(userData?.credits || 0);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if nest is purchased
  const isPurchased = useCallback(
    (nestId) => purchases.some((p) => p.nest_id === nestId),
    [purchases]
  );

  // Handle purchase
  const handlePurchase = async () => {
    if (!purchaseNest || !user?.id) return;

    setPurchasing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/purchase-growth-nest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            nest_id: purchaseNest.id,
            payment_method: 'credits',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Purchase failed');
      }

      toast.success(result.message || 'Purchase successful!');
      setPurchaseNest(null);
      fetchData();

      // Navigate to the new workspace
      if (result.workspace_id) {
        navigate(`/GrowthEnrich?workspace=${result.workspace_id}`);
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      toast.error(err.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  // Filter nests
  const filteredNests = useMemo(() => {
    return nests.filter((nest) => {
      if (searchQuery && !nest.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (industryFilter !== 'all' && nest.industry !== industryFilter) {
        return false;
      }
      if (regionFilter !== 'all' && nest.region !== regionFilter) {
        return false;
      }
      return true;
    });
  }, [nests, searchQuery, industryFilter, regionFilter]);

  // Get unique industries and regions for filters
  const industries = useMemo(
    () => [...new Set(nests.map((n) => n.industry).filter(Boolean))],
    [nests]
  );
  const regions = useMemo(
    () => [...new Set(nests.map((n) => n.region).filter(Boolean))],
    [nests]
  );

  // Featured nests
  const featuredNests = useMemo(
    () => filteredNests.filter((n) => n.is_featured),
    [filteredNests]
  );
  const regularNests = useMemo(
    () => filteredNests.filter((n) => !n.is_featured),
    [filteredNests]
  );

  return (
    <GrowthPageTransition>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="w-full">
          {/* Header */}
          <PageHeader
            title="Data Nests"
            subtitle="Purchase curated lead datasets to power your growth campaigns"
            icon={Package}
          />

          {/* Filters */}
          <GlassCard className="p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Search nests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              </div>
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[150px] bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[150px] bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map((reg) => (
                    <SelectItem key={reg} value={reg}>
                      {reg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <Coins className="w-4 h-4 text-indigo-400" />
                <span className="text-white font-medium">{userCredits.toLocaleString()}</span>
                <span className="text-zinc-500">credits</span>
              </div>
            </div>
          </GlassCard>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              {/* Featured Section */}
              {featuredNests.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    Featured
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredNests.map((nest) => (
                      <NestCard
                        key={nest.id}
                        nest={nest}
                        isPurchased={isPurchased(nest.id)}
                        onPreview={setPreviewNest}
                        onPurchase={setPurchaseNest}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Nests */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  All Data Nests
                </h2>
                {regularNests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {regularNests.map((nest) => (
                      <NestCard
                        key={nest.id}
                        nest={nest}
                        isPurchased={isPurchased(nest.id)}
                        onPreview={setPreviewNest}
                        onPurchase={setPurchaseNest}
                      />
                    ))}
                  </div>
                ) : (
                  <GlassCard className="p-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No nests found</h3>
                    <p className="text-zinc-500">Try adjusting your filters</p>
                  </GlassCard>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        <PreviewModal
          nest={previewNest}
          open={!!previewNest}
          onClose={() => setPreviewNest(null)}
        />
        <PurchaseModal
          nest={purchaseNest}
          open={!!purchaseNest}
          onClose={() => setPurchaseNest(null)}
          onConfirm={handlePurchase}
          userCredits={userCredits}
          loading={purchasing}
        />
      </div>
    </GrowthPageTransition>
  );
}

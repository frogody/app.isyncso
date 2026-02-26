/**
 * Nest Detail Page
 * View nest details, preview items, and purchase
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  Package,
  Users,
  Briefcase,
  Building2,
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  Eye,
  Lock,
  Loader2,
  ExternalLink,
  Mail,
  MapPin,
  Linkedin,
  Euro,
  Rocket,
  Factory,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from "@/components/context/UserContext";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

import { LinkNestToRoleModal } from "@/components/talent";

// Nest type config
const NEST_TYPE_CONFIG = {
  candidates: {
    icon: Users,
    label: 'Candidates',
    color: 'text-red-400 bg-red-500/20 border-red-500/30',
    destination: '/talent/candidates',
  },
  prospects: {
    icon: Briefcase,
    label: 'Prospects',
    color: 'text-red-400 bg-red-500/20 border-red-500/30',
    destination: '/growth/prospects',
  },
  investors: {
    icon: Building2,
    label: 'Investors',
    color: 'text-red-400 bg-red-500/20 border-red-500/30',
    destination: '/raise/investors',
  },
  companies: {
    icon: Factory,
    label: 'Companies',
    color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
    destination: '/RaiseEnrich',
  },
};

// Format currency
function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Get item display info based on type
function getItemDisplayInfo(item, nestType) {
  if (nestType === 'candidates' && item.candidates) {
    const c = item.candidates;
    return {
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
      subtitle: c.job_title || c.company_name || 'No title',
      email: c.email,
      location: c.person_home_location,
      linkedin: c.linkedin_profile,
    };
  }
  if (nestType === 'prospects' && item.prospects) {
    const p = item.prospects;
    return {
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
      subtitle: p.company || p.job_title || 'No company',
      email: p.email,
      location: p.location,
      linkedin: p.linkedin_url,
    };
  }
  if (nestType === 'investors' && item.raise_investors) {
    const i = item.raise_investors;
    return {
      name: i.profile?.name || 'Unknown Investor',
      subtitle: i.profile?.firm || i.investor_type || 'Investor',
      email: i.profile?.email,
      location: null,
      linkedin: i.profile?.linkedin,
    };
  }
  if (nestType === 'companies' && item.crm_companies) {
    const c = item.crm_companies;
    return {
      name: c.name || 'Unknown Company',
      subtitle: [c.industry, c.hq_location].filter(Boolean).join(' · ') || 'Company',
      email: c.domain,
      location: c.hq_location,
      linkedin: c.linkedin_url,
    };
  }
  return { name: 'Unknown', subtitle: '', email: '', location: '', linkedin: '' };
}

export default function NestDetail() {
  const { nestId } = useParams();
  const { user, company } = useUser();
  const navigate = useNavigate();

  // State
  const [nest, setNest] = useState(null);
  const [items, setItems] = useState([]);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkModalMode, setLinkModalMode] = useState('link'); // 'link' or 'quickstart'

  // Fetch nest and items
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch nest
      const { data: nestData, error: nestError } = await supabase
        .from('nests')
        .select('*')
        .eq('id', nestId)
        .single();

      if (nestError) throw nestError;
      if (!nestData) {
        toast.error('Nest not found');
        navigate('/marketplace/nests');
        return;
      }

      setNest(nestData);

      // Check if purchased
      if (company?.id) {
        const { data: purchaseData } = await supabase
          .from('nest_purchases')
          .select('id')
          .eq('nest_id', nestId)
          .eq('organization_id', company.id)
          .eq('status', 'completed')
          .single();

        setIsPurchased(!!purchaseData);
      }

      // Fetch items (RLS will filter based on preview/purchased status)
      let itemsQuery;
      if (nestData.nest_type === 'companies') {
        itemsQuery = supabase
          .from('nest_items')
          .select('*, crm_companies(*)')
          .not('company_id', 'is', null)
          .eq('nest_id', nestId)
          .order('item_order', { ascending: true });
      } else {
        itemsQuery = supabase
          .from('nest_items')
          .select(`
            *,
            candidates(*),
            prospects(*),
            raise_investors(*)
          `)
          .eq('nest_id', nestId)
          .order('item_order', { ascending: true });
      }
      const { data: itemsData, error: itemsError } = await itemsQuery;

      if (!itemsError) {
        setItems(itemsData || []);
      }
    } catch (err) {
      console.error('Failed to fetch nest:', err);
      toast.error('Failed to load nest details');
    } finally {
      setLoading(false);
    }
  }, [nestId, company?.id, navigate]);

  useEffect(() => {
    if (nestId) {
      fetchData();
    }
  }, [nestId, fetchData]);

  // Handle purchase
  const handlePurchase = async () => {
    if (!user || !company) {
      toast.error('Please log in to purchase');
      return;
    }

    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/purchase-nest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          nest_id: nestId,
          organization_id: company.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Purchase failed');
      }

      // If Stripe URL is returned, redirect
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }

      // If free or already processed
      toast.success('Purchase successful! Data has been added to your account.');
      setIsPurchased(true);
      fetchData();

      // Show modal to link nest to a role (for candidate nests)
      if (nest?.nest_type === 'candidates') {
        setLinkModalMode('link');
        setShowLinkModal(true);
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      toast.error(err.message || 'Failed to complete purchase');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
        </div>
    );
  }

  if (!nest) {
    return (
      <div className="w-full p-6">
          <div className="text-center py-20 text-zinc-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nest not found</p>
          </div>
        </div>
    );
  }

  const config = NEST_TYPE_CONFIG[nest.nest_type] || NEST_TYPE_CONFIG.candidates;
  const Icon = config.icon;
  const previewItems = items.filter(i => i.is_preview);
  const nonPreviewCount = (nest.item_count || 0) - previewItems.length;

  return (
    <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/marketplace/nests')}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Thumbnail */}
          <div className="w-full md:w-48 h-32 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden">
            {nest.thumbnail_url ? (
              <img
                src={nest.thumbnail_url}
                alt={nest.name}
                className="w-full h-full object-cover"
               loading="lazy" decoding="async" />
            ) : (
              <Icon className={`w-8 h-8 ${config.color.split(' ')[0]}`} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={config.color}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                  {isPurchased && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Purchased
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white">{nest.name}</h1>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{nest.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <Users className="w-3 h-3" />
                <span>{nest.item_count || 0} items</span>
              </div>
            </div>

            {/* Price & Purchase */}
            <div className="flex items-center gap-3 pt-2">
              <div className="text-xl font-bold text-white">
                {nest.price > 0 ? formatCurrency(nest.price, nest.currency) : 'Free'}
              </div>

              {isPurchased ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => navigate(config.destination)}
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in {config.label}
                  </Button>
                  {nest?.nest_type === 'candidates' && (
                    <Button
                      onClick={() => {
                        setLinkModalMode('quickstart');
                        setShowLinkModal(true);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Quick Start Campaign
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {purchasing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 mr-2" />
                  )}
                  {nest.price > 0 ? 'Purchase Now' : 'Get for Free'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Items */}
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-red-400" />
              Preview Items
              <Badge variant="outline" className="ml-2 text-zinc-400 border-zinc-600">
                {previewItems.length} of {nest.item_count || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {previewItems.length === 0 ? (
              <div className="text-center py-6 text-zinc-500">
                <Lock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No preview items available</p>
                <p className="text-[10px] mt-1 text-zinc-600">Purchase to access all items</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    {nest.nest_type === 'companies' ? (
                      <>
                        <TableHead className="text-zinc-400">Company Name</TableHead>
                        <TableHead className="text-zinc-400">Industry / Location</TableHead>
                        <TableHead className="text-zinc-400">Domain</TableHead>
                        <TableHead className="text-zinc-400">LinkedIn</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-zinc-400">Name</TableHead>
                        <TableHead className="text-zinc-400">Title / Company</TableHead>
                        <TableHead className="text-zinc-400">Contact</TableHead>
                        <TableHead className="text-zinc-400">Links</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewItems.map((item) => {
                    const info = getItemDisplayInfo(item, nest.nest_type);
                    return (
                      <TableRow key={item.id} className="border-white/10">
                        <TableCell className="font-medium text-white">
                          {info.name}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {info.subtitle}
                        </TableCell>
                        <TableCell>
                          {nest.nest_type === 'companies' ? (
                            info.email && (
                              <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <Globe className="w-3 h-3" />
                                {info.email}
                              </div>
                            )
                          ) : (
                            <div className="space-y-1">
                              {info.email && (
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                  <Mail className="w-3 h-3" />
                                  {info.email}
                                </div>
                              )}
                              {info.location && (
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                  <MapPin className="w-3 h-3" />
                                  {info.location}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {info.linkedin && (
                            <a
                              href={info.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* Locked Items */}
            {nonPreviewCount > 0 && !isPurchased && (
              <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      +{nonPreviewCount} more items
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      Purchase to unlock all items
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  {purchasing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 mr-2" />
                  )}
                  Unlock All
                </Button>
              </div>
            )}

            {/* All Items (if purchased) */}
            {isPurchased && items.length > previewItems.length && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <h4 className="text-xs font-semibold text-zinc-400 mb-2">All Items</h4>
                <Table>
                  <TableBody>
                    {items.filter(i => !i.is_preview).map((item) => {
                      const info = getItemDisplayInfo(item, nest.nest_type);
                      return (
                        <TableRow key={item.id} className="border-white/10">
                          <TableCell className="font-medium text-white">
                            {info.name}
                          </TableCell>
                          <TableCell className="text-zinc-400">
                            {info.subtitle}
                          </TableCell>
                          <TableCell>
                            {info.email && (
                              <span className="text-xs text-zinc-500">{info.email}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {info.linkedin && (
                              <a
                                href={info.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-400 hover:text-red-300"
                              >
                                <Linkedin className="w-4 h-4" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Link Nest to Role Modal */}
      <LinkNestToRoleModal
        isOpen={showLinkModal}
        onClose={(linked, campaignId, autoMatch) => {
          setShowLinkModal(false);
          if (linked && campaignId) {
            const url = autoMatch
              ? `/TalentCampaignDetail?id=${campaignId}&autoMatch=true`
              : `/TalentCampaignDetail?id=${campaignId}`;
            navigate(url);
          }
        }}
        nestId={nestId}
        nestName={nest?.name}
        organizationId={company?.id}
        mode={linkModalMode}
        candidateCount={nest?.item_count || 0}
      />
    </div>
  );
}

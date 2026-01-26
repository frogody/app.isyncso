/**
 * Purchased Nests Page
 * View all nests the user has purchased
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Users,
  Briefcase,
  Building2,
  ArrowLeft,
  ExternalLink,
  Calendar,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import Layout from "@/pages/Layout";

// Nest type config
const NEST_TYPE_CONFIG = {
  candidates: {
    icon: Users,
    label: 'Candidates',
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    destination: '/talent/candidates',
  },
  prospects: {
    icon: Briefcase,
    label: 'Prospects',
    color: 'text-green-400 bg-green-500/20 border-green-500/30',
    destination: '/growth/prospects',
  },
  investors: {
    icon: Building2,
    label: 'Investors',
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    destination: '/raise/investors',
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

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PurchasedNests() {
  const { user, company } = useUser();
  const navigate = useNavigate();

  // State
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch purchases
  const fetchPurchases = useCallback(async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nest_purchases')
        .select(`
          *,
          nests(*)
        `)
        .eq('organization_id', company.id)
        .eq('status', 'completed')
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Stats
  const totalSpent = purchases.reduce((sum, p) => sum + parseFloat(p.price_paid || 0), 0);
  const totalItems = purchases.reduce((sum, p) => sum + (p.nests?.item_count || 0), 0);

  return (
    <Layout>
      <div className="min-h-screen bg-black px-4 lg:px-6 py-4 space-y-4">
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
        <div>
          <h1 className="text-2xl font-semibold text-white">My Purchased Nests</h1>
          <p className="text-zinc-400 mt-1">
            View and access your purchased data nests
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="bg-zinc-900/50 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{purchases.length}</p>
                  <p className="text-xs text-zinc-500">Nests Owned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Users className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{totalItems}</p>
                  <p className="text-xs text-zinc-500">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{formatCurrency(totalSpent)}</p>
                  <p className="text-xs text-zinc-500">Total Invested</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchases Table */}
        <Card className="bg-zinc-900/50 border-white/5">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <Package className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">No purchases yet</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Browse the marketplace to find data nests
                </p>
                <Button
                  onClick={() => navigate('/marketplace/nests')}
                  className="mt-4 bg-cyan-600 hover:bg-cyan-700"
                >
                  Browse Marketplace
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Nest</TableHead>
                    <TableHead className="text-zinc-400">Type</TableHead>
                    <TableHead className="text-zinc-400 text-center">Items</TableHead>
                    <TableHead className="text-zinc-400">Price Paid</TableHead>
                    <TableHead className="text-zinc-400">Purchased</TableHead>
                    <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => {
                    const nest = purchase.nests;
                    if (!nest) return null;

                    const config = NEST_TYPE_CONFIG[nest.nest_type] || NEST_TYPE_CONFIG.candidates;
                    const Icon = config.icon;

                    return (
                      <TableRow key={purchase.id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{nest.name}</p>
                              <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                                {nest.description || 'No description'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-white/10">
                            {nest.item_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {formatCurrency(purchase.price_paid, purchase.currency)}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(purchase.purchased_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/marketplace/nests/${nest.id}`)}
                              className="text-zinc-400 hover:text-white"
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(config.destination)}
                              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Open
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

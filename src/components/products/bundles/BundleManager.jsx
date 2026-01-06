import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Edit2, Trash2, Copy, MoreHorizontal,
  Layers, DollarSign, Tag, ChevronRight, Search,
  Filter, ArrowUpDown, CheckCircle, Clock, Archive,
  Percent, ShoppingCart, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/30', icon: CheckCircle },
  draft: { label: 'Draft', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock },
  archived: { label: 'Archived', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', icon: Archive },
};

const BUNDLE_TYPE_CONFIG = {
  fixed: { label: 'Fixed Bundle', description: 'All items included at set price' },
  configurable: { label: 'Configurable', description: 'Customer can customize items' },
};

const PRICING_STRATEGY_CONFIG = {
  sum: { label: 'Sum of Items', icon: Plus },
  fixed: { label: 'Fixed Price', icon: DollarSign },
  discount: { label: 'Discounted Total', icon: Percent },
};

function BundleCard({ bundle, currency, onEdit, onDuplicate, onArchive, onDelete }) {
  const status = STATUS_CONFIG[bundle.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const bundleType = BUNDLE_TYPE_CONFIG[bundle.bundle_type] || BUNDLE_TYPE_CONFIG.fixed;
  const pricingStrategy = PRICING_STRATEGY_CONFIG[bundle.pricing_strategy] || PRICING_STRATEGY_CONFIG.sum;
  const PricingIcon = pricingStrategy.icon;

  const itemCount = bundle.items?.length || 0;

  // Calculate display price based on strategy
  let displayPrice = 0;
  if (bundle.pricing_strategy === 'fixed') {
    displayPrice = bundle.fixed_price || 0;
  } else if (bundle.pricing_strategy === 'discount') {
    const sumPrice = bundle.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0;
    displayPrice = sumPrice * (1 - (bundle.discount_percent || 0) / 100);
  } else {
    displayPrice = bundle.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0;
  }

  return (
    <GlassCard className="p-4 hover:border-cyan-500/30 transition-all group">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <Layers className="w-6 h-6 text-cyan-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white truncate">{bundle.name}</h3>
            <Badge variant="outline" className={cn("text-xs", status.color)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          {bundle.description && (
            <p className="text-sm text-zinc-500 line-clamp-1 mb-2">{bundle.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              {bundleType.label}
            </span>
            <span className="flex items-center gap-1">
              <PricingIcon className="w-3.5 h-3.5" />
              {pricingStrategy.label}
              {bundle.pricing_strategy === 'discount' && bundle.discount_percent > 0 && (
                <span className="text-green-400">(-{bundle.discount_percent}%)</span>
              )}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-semibold text-white">
            {formatPrice(displayPrice, currency)}
          </div>
          {bundle.pricing_strategy === 'discount' && bundle.discount_percent > 0 && (
            <div className="text-xs text-zinc-500 line-through">
              {formatPrice(bundle.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0, currency)}
            </div>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(bundle)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Bundle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(bundle)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onArchive(bundle)}>
              <Archive className="w-4 h-4 mr-2" />
              {bundle.status === 'archived' ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(bundle)}
              className="text-red-400 focus:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </GlassCard>
  );
}

export default function BundleManager({
  bundles = [],
  currency = 'EUR',
  onCreateBundle,
  onEditBundle,
  onDuplicateBundle,
  onArchiveBundle,
  onDeleteBundle,
  loading = false,
  className
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');

  // Filter and sort bundles
  const filteredBundles = bundles
    .filter(bundle => {
      const matchesSearch = !searchQuery ||
        bundle.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bundle.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || bundle.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'price':
          return (b.fixed_price || 0) - (a.fixed_price || 0);
        case 'items':
          return (b.items?.length || 0) - (a.items?.length || 0);
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

  // Stats
  const activeCount = bundles.filter(b => b.status === 'active').length;
  const draftCount = bundles.filter(b => b.status === 'draft').length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Product Bundles
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            Create bundles to offer products together at special pricing
          </p>
        </div>
        <Button onClick={onCreateBundle} className="bg-cyan-500 hover:bg-cyan-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      {/* Stats */}
      {bundles.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
            <div className="text-2xl font-bold text-white">{bundles.length}</div>
            <div className="text-sm text-zinc-500">Total Bundles</div>
          </div>
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
            <div className="text-2xl font-bold text-green-400">{activeCount}</div>
            <div className="text-sm text-zinc-500">Active</div>
          </div>
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
            <div className="text-2xl font-bold text-amber-400">{draftCount}</div>
            <div className="text-sm text-zinc-500">Drafts</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {bundles.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bundles..."
              className="pl-9 bg-zinc-900/50 border-white/10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-zinc-900/50 border-white/10">
              <Filter className="w-4 h-4 mr-2 text-zinc-500" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 bg-zinc-900/50 border-white/10">
              <ArrowUpDown className="w-4 h-4 mr-2 text-zinc-500" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest First</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="items">Item Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bundle List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : filteredBundles.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-white/10">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-cyan-400" />
          </div>
          <h4 className="text-lg font-medium text-white mb-2">
            {bundles.length === 0 ? 'No bundles yet' : 'No matching bundles'}
          </h4>
          <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
            {bundles.length === 0
              ? 'Create your first bundle to offer products together at special pricing'
              : 'Try adjusting your search or filters'}
          </p>
          {bundles.length === 0 && (
            <Button onClick={onCreateBundle} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Bundle
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBundles.map(bundle => (
            <BundleCard
              key={bundle.id}
              bundle={bundle}
              currency={currency}
              onEdit={onEditBundle}
              onDuplicate={onDuplicateBundle}
              onArchive={onArchiveBundle}
              onDelete={onDeleteBundle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

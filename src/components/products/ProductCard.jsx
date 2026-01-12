import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Cloud, Package, MoreHorizontal, Eye, Edit2, Copy, Archive, Trash2,
  Play, Tag, Clock, Check, Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  published: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'Published' },
  draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

const PRICING_MODELS = {
  free: { label: 'Free', color: 'text-green-400' },
  one_time: { label: 'One-time', color: 'text-cyan-400' },
  subscription: { label: 'Subscription', color: 'text-purple-400' },
  usage_based: { label: 'Usage-based', color: 'text-amber-400' },
  freemium: { label: 'Freemium', color: 'text-indigo-400' },
};

export function ProductGridCard({
  product,
  productType = 'digital',
  details,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  index = 0,
}) {
  const status = STATUS_COLORS[product.status] || STATUS_COLORS.draft;
  const isDigital = productType === 'digital';
  const themeColor = isDigital ? 'cyan' : 'amber';
  const Icon = isDigital ? Cloud : Package;

  const pricingModel = isDigital && details?.pricing_model
    ? PRICING_MODELS[details.pricing_model] || { label: 'Custom', color: 'text-zinc-400' }
    : null;

  const pricing = !isDigital && details?.pricing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={createPageUrl(`ProductDetail?type=${productType}&slug=${product.slug}`)}>
        <div className={cn(
          "group rounded-xl bg-zinc-900/50 border border-white/5 transition-all overflow-hidden",
          isDigital ? "hover:border-cyan-500/30" : "hover:border-amber-500/30"
        )}>
          {/* Image/Preview */}
          <div className={cn(
            "aspect-video relative overflow-hidden",
            isDigital
              ? "bg-gradient-to-br from-cyan-900/20 to-cyan-950/20"
              : "bg-gradient-to-br from-amber-900/20 to-amber-950/20"
          )}>
            {product.featured_image?.url ? (
              <img
                src={product.featured_image.url}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon className={cn(
                  "w-12 h-12",
                  isDigital ? "text-cyan-500/30" : "text-amber-500/30"
                )} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className={cn(
              "font-medium text-white truncate transition-colors",
              isDigital ? "group-hover:text-cyan-400" : "group-hover:text-amber-400"
            )}>
              {product.name}
            </h3>
            <p className="text-sm text-zinc-500 mt-1 line-clamp-2 min-h-[2.5rem]">
              {product.tagline || product.short_description || 'No description'}
            </p>

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-3">
              <Badge className={`${status.bg} ${status.text} ${status.border} text-xs`}>
                {status.label}
              </Badge>

              {/* Physical: Stock badge */}
              {!isDigital && details?.inventory && (
                details.inventory.quantity > 0 ? (
                  <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
                    <Check className="w-3 h-3 mr-1" /> In Stock
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                    Out of Stock
                  </Badge>
                )
              )}

              {/* Digital: Trial badge */}
              {isDigital && details?.trial_available && (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
                  {details.trial_days}d Trial
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                {isDigital && pricingModel && (
                  <>
                    <span className={`text-xs ${pricingModel.color}`}>
                      {pricingModel.label}
                    </span>
                    {product.category && (
                      <>
                        <span className="text-zinc-600">|</span>
                        <span className="text-xs text-zinc-500">{product.category}</span>
                      </>
                    )}
                  </>
                )}
                {!isDigital && pricing?.base_price && (
                  <>
                    <span className="text-sm font-medium text-white">
                      €{parseFloat(pricing.base_price).toFixed(2)}
                    </span>
                    {pricing.compare_at_price && (
                      <span className="text-xs text-zinc-500 line-through">
                        €{parseFloat(pricing.compare_at_price).toFixed(2)}
                      </span>
                    )}
                  </>
                )}
                {!isDigital && product.ean && (
                  <span className="text-xs text-zinc-500">EAN: {product.ean}</span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-500 hover:text-white">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem className="text-zinc-300 hover:text-white">
                    <Eye className="w-4 h-4 mr-2" /> View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-zinc-300 hover:text-white"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(product); }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-zinc-300 hover:text-white"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDuplicate?.(product); }}
                  >
                    <Copy className="w-4 h-4 mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-amber-400 hover:text-amber-300"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive?.(product); }}
                  >
                    <Archive className="w-4 h-4 mr-2" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400 hover:text-red-300"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(product); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ProductListRow({
  product,
  productType = 'digital',
  details,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  index = 0,
}) {
  const status = STATUS_COLORS[product.status] || STATUS_COLORS.draft;
  const isDigital = productType === 'digital';
  const themeColor = isDigital ? 'cyan' : 'amber';
  const Icon = isDigital ? Cloud : Package;

  const pricingModel = isDigital && details?.pricing_model
    ? PRICING_MODELS[details.pricing_model] || { label: 'Custom', color: 'text-zinc-400' }
    : null;

  const pricing = !isDigital && details?.pricing;
  const packages = isDigital ? details?.packages || [] : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={createPageUrl(`ProductDetail?type=${productType}&slug=${product.slug}`)}>
        <div className={cn(
          "group flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5 transition-all",
          isDigital ? "hover:border-cyan-500/30" : "hover:border-amber-500/30"
        )}>
          {/* Thumbnail */}
          <div className={cn(
            "w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
            isDigital
              ? "bg-cyan-500/10 border border-cyan-500/20"
              : "bg-amber-500/10 border border-amber-500/20"
          )}>
            {product.featured_image?.url ? (
              <img
                src={product.featured_image.url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon className={cn(
                "w-7 h-7",
                isDigital ? "text-cyan-400" : "text-amber-400"
              )} />
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "font-medium text-white truncate transition-colors",
                isDigital ? "group-hover:text-cyan-400" : "group-hover:text-amber-400"
              )}>
                {product.name}
              </h3>
              <Badge className={`${status.bg} ${status.text} ${status.border} text-xs`}>
                {status.label}
              </Badge>

              {/* Physical: Stock badge */}
              {!isDigital && details?.inventory && (
                details.inventory.quantity > 0 ? (
                  <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
                    <Check className="w-3 h-3 mr-1" /> In Stock
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                    Out of Stock
                  </Badge>
                )
              )}

              {/* Digital: Trial badge */}
              {isDigital && details?.trial_available && (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
                  {details.trial_days}d Trial
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5 truncate">
              {product.tagline || product.short_description || 'No description'}
            </p>
          </div>

          {/* Pricing / Info */}
          <div className="text-right flex-shrink-0 w-32">
            {isDigital && pricingModel && (
              <>
                <span className={`text-sm font-medium ${pricingModel.color}`}>
                  {pricingModel.label}
                </span>
                {packages.length > 0 && (
                  <p className="text-xs text-zinc-500">{packages.length} packages</p>
                )}
              </>
            )}
            {!isDigital && pricing?.base_price && (
              <>
                <span className="text-sm font-medium text-white">
                  €{parseFloat(pricing.base_price).toFixed(2)}
                </span>
                {details?.inventory?.quantity > 0 && (
                  <p className="text-xs text-zinc-500">
                    {details.inventory.quantity} units
                  </p>
                )}
              </>
            )}
          </div>

          {/* Category / EAN */}
          <div className="text-right flex-shrink-0 w-32 hidden lg:block">
            <span className="text-sm text-zinc-400">
              {isDigital
                ? product.category || 'Uncategorized'
                : product.ean || 'No EAN'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDigital && details?.demo_url && (
              <Button variant="ghost" size="sm" className={cn(
                "h-8 text-zinc-400",
                isDigital ? "hover:text-cyan-400" : "hover:text-amber-400"
              )}>
                <Play className="w-4 h-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem className="text-zinc-300 hover:text-white">
                  <Eye className="w-4 h-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-zinc-300 hover:text-white"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(product); }}
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-zinc-300 hover:text-white"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDuplicate?.(product); }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-amber-400 hover:text-amber-300"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive?.(product); }}
                >
                  <Archive className="w-4 h-4 mr-2" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400 hover:text-red-300"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(product); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default { ProductGridCard, ProductListRow };

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Cloud, Package, Briefcase, MoreHorizontal, Eye, Edit2, Copy, Archive, Trash2,
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
import { useTheme } from '@/contexts/GlobalThemeContext';

const STATUS_COLORS = {
  published: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Published' },
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

const PRICING_MODELS = {
  free: { label: 'Free', color: 'text-cyan-400' },
  one_time: { label: 'One-time', color: 'text-cyan-400' },
  subscription: { label: 'Subscription', color: 'text-blue-400' },
  usage_based: { label: 'Usage-based', color: 'text-cyan-300' },
  freemium: { label: 'Freemium', color: 'text-blue-300' },
  // Service pricing models
  hourly: { label: 'Hourly', color: 'text-cyan-400' },
  retainer: { label: 'Retainer', color: 'text-blue-400' },
  project: { label: 'Project', color: 'text-cyan-300' },
  milestone: { label: 'Milestone', color: 'text-blue-300' },
  success_fee: { label: 'Success Fee', color: 'text-cyan-400' },
  hybrid: { label: 'Hybrid', color: 'text-blue-400' },
};

const TYPE_ICONS = {
  digital: Cloud,
  physical: Package,
  service: Briefcase,
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
  const { t } = useTheme();
  const status = STATUS_COLORS[product.status] || STATUS_COLORS.draft;
  const isDigital = productType === 'digital';
  const isService = productType === 'service';
  const isPhysical = productType === 'physical';
  const Icon = TYPE_ICONS[productType] || Package;

  const pricingModel = (isDigital || isService) && details?.pricing_model
    ? PRICING_MODELS[details.pricing_model] || { label: 'Custom', color: 'text-zinc-400' }
    : null;

  const pricing = isPhysical && details?.pricing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={createPageUrl(`ProductDetail?type=${productType}&slug=${product.slug}`)}>
        <div className={cn(
          `group rounded-xl ${t('bg-white shadow-sm', 'bg-zinc-900/50')} border ${t('border-slate-200', 'border-white/5')} transition-all overflow-hidden`,
          "hover:border-cyan-500/30"
        )}>
          {/* Image/Preview */}
          <div className={cn(
            "aspect-video relative overflow-hidden",
            "bg-gradient-to-br from-cyan-900/20 to-cyan-950/20"
          )}>
            {product.featured_image?.url ? (
              <>
                <img
                  src={product.featured_image.url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/25" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon className="w-12 h-12 text-cyan-500/30" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className={`font-medium ${t('text-slate-900', 'text-white')} truncate transition-colors group-hover:text-cyan-400`}>
              {product.name}
            </h3>
            <p className={`text-sm ${t('text-slate-500', 'text-zinc-500')} mt-1 line-clamp-2 min-h-[2.5rem]`}>
              {product.tagline || product.short_description || 'No description'}
            </p>

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-3">
              <Badge className={`${status.bg} ${status.text} ${status.border} text-xs`}>
                {status.label}
              </Badge>

              {/* Physical: Stock badge */}
              {isPhysical && details?.inventory && (
                details.inventory.quantity > 0 ? (
                  <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
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
                <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
                  {details.trial_days}d Trial
                </Badge>
              )}

              {/* Service: SLA badge */}
              {isService && details?.sla?.response_time && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
                  <Clock className="w-3 h-3 mr-1" /> {details.sla.response_time}
                </Badge>
              )}
            </div>

            <div className={`flex items-center justify-between mt-4 pt-3 border-t ${t('border-slate-200', 'border-white/5')}`}>
              <div className="flex items-center gap-2">
                {(isDigital || isService) && pricingModel && (
                  <>
                    <span className={`text-xs ${pricingModel.color}`}>
                      {pricingModel.label}
                    </span>
                    {product.category && (
                      <>
                        <span className={t('text-slate-300', 'text-zinc-600')}>|</span>
                        <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>{product.category}</span>
                      </>
                    )}
                  </>
                )}
                {isPhysical && pricing?.base_price && (
                  <>
                    <span className={`text-sm font-medium ${t('text-slate-900', 'text-white')}`}>
                      €{parseFloat(pricing.base_price).toFixed(2)}
                    </span>
                    {pricing.compare_at_price && (
                      <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')} line-through`}>
                        €{parseFloat(pricing.compare_at_price).toFixed(2)}
                      </span>
                    )}
                  </>
                )}
                {isPhysical && product.ean && (
                  <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>EAN: {product.ean}</span>
                )}
                {isService && details?.service_type && (
                  <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>{details.service_type}</span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${t('text-slate-500', 'text-zinc-500')} ${t('hover:text-slate-900', 'hover:text-white')}`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={`${t('bg-white', 'bg-zinc-900')} ${t('border-slate-200', 'border-white/10')}`} onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem className={`${t('text-slate-700', 'text-zinc-300')} ${t('hover:text-slate-900', 'hover:text-white')}`}>
                    <Eye className="w-4 h-4 mr-2" /> View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={`${t('text-slate-700', 'text-zinc-300')} ${t('hover:text-slate-900', 'hover:text-white')}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(product); }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={`${t('text-slate-700', 'text-zinc-300')} ${t('hover:text-slate-900', 'hover:text-white')}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDuplicate?.(product); }}
                  >
                    <Copy className="w-4 h-4 mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={`${t('text-slate-500', 'text-zinc-400')} ${t('hover:text-slate-700', 'hover:text-zinc-300')}`}
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
  const { t } = useTheme();
  const status = STATUS_COLORS[product.status] || STATUS_COLORS.draft;
  const isDigital = productType === 'digital';
  const isService = productType === 'service';
  const isPhysical = productType === 'physical';
  const Icon = TYPE_ICONS[productType] || Package;

  const pricingModel = (isDigital || isService) && details?.pricing_model
    ? PRICING_MODELS[details.pricing_model] || { label: 'Custom', color: 'text-zinc-400' }
    : null;

  const pricing = isPhysical && details?.pricing;
  const packages = isDigital ? details?.packages || [] : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={createPageUrl(`ProductDetail?type=${productType}&slug=${product.slug}`)}>
        <div className={cn(
          `group flex items-center gap-4 p-4 rounded-xl ${t('bg-white shadow-sm', 'bg-zinc-900/50')} border ${t('border-slate-200', 'border-white/5')} transition-all`,
          "hover:border-cyan-500/30"
        )}>
          {/* Thumbnail */}
          <div className={cn(
            "w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
            "bg-cyan-500/10 border border-cyan-500/20"
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
                "text-cyan-400"
              )} />
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                `font-medium ${t('text-slate-900', 'text-white')} truncate transition-colors`,
                "group-hover:text-cyan-400"
              )}>
                {product.name}
              </h3>
              <Badge className={`${status.bg} ${status.text} ${status.border} text-xs`}>
                {status.label}
              </Badge>

              {/* Physical: Stock badge */}
              {isPhysical && details?.inventory && (
                details.inventory.quantity > 0 ? (
                  <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
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
                <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
                  {details.trial_days}d Trial
                </Badge>
              )}

              {/* Service: SLA badge */}
              {isService && details?.sla?.response_time && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
                  <Clock className="w-3 h-3 mr-1" /> {details.sla.response_time}
                </Badge>
              )}
            </div>
            <p className={`text-sm ${t('text-slate-500', 'text-zinc-500')} mt-0.5 truncate`}>
              {product.tagline || product.short_description || 'No description'}
            </p>
          </div>

          {/* Pricing / Info */}
          <div className="text-right flex-shrink-0 w-32">
            {(isDigital || isService) && pricingModel && (
              <>
                <span className={`text-sm font-medium ${pricingModel.color}`}>
                  {pricingModel.label}
                </span>
                {isDigital && packages.length > 0 && (
                  <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>{packages.length} packages</p>
                )}
                {isService && details?.service_type && (
                  <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>{details.service_type}</p>
                )}
              </>
            )}
            {isPhysical && pricing?.base_price && (
              <>
                <span className={`text-sm font-medium ${t('text-slate-900', 'text-white')}`}>
                  €{parseFloat(pricing.base_price).toFixed(2)}
                </span>
                {details?.inventory?.quantity > 0 && (
                  <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>
                    {details.inventory.quantity} units
                  </p>
                )}
              </>
            )}
          </div>

          {/* Category / EAN / Service Type */}
          <div className="text-right flex-shrink-0 w-32 hidden lg:block">
            <span className={`text-sm ${t('text-slate-500', 'text-zinc-400')}`}>
              {isDigital
                ? product.category || 'Uncategorized'
                : isService
                  ? product.category || 'Uncategorized'
                  : product.ean || 'No EAN'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDigital && details?.demo_url && (
              <Button variant="ghost" size="sm" className={cn(
                `h-8 ${t('text-slate-500', 'text-zinc-400')}`,
                "hover:text-cyan-400"
              )}>
                <Play className="w-4 h-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${t('text-slate-500', 'text-zinc-500')} ${t('hover:text-slate-900', 'hover:text-white')}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={`${t('bg-white', 'bg-zinc-900')} ${t('border-slate-200', 'border-white/10')}`} onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem className={`${t('text-slate-700', 'text-zinc-300')} ${t('hover:text-slate-900', 'hover:text-white')}`}>
                  <Eye className="w-4 h-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`${t('text-slate-700', 'text-zinc-300')} ${t('hover:text-slate-900', 'hover:text-white')}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(product); }}
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`${t('text-slate-700', 'text-zinc-300')} ${t('hover:text-slate-900', 'hover:text-white')}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDuplicate?.(product); }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`${t('text-slate-500', 'text-zinc-400')} ${t('hover:text-slate-700', 'hover:text-zinc-300')}`}
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

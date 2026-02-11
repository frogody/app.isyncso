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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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

const CHANNEL_COLORS = {
  b2b: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'B2B' },
  b2c: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'B2C' },
};

export function ProductGridCard({
  product,
  productType = 'digital',
  details,
  salesChannels,
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
            <div className="flex items-center gap-2 mt-3 flex-wrap">
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

              {/* Physical: Channel badges */}
              {isPhysical && salesChannels?.length > 0 && salesChannels.map(ch => {
                const style = CHANNEL_COLORS[ch];
                return style ? (
                  <Badge key={ch} className={`${style.bg} ${style.text} border ${style.border} text-xs`}>
                    {style.label}
                  </Badge>
                ) : null;
              })}

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
  salesChannels,
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

              {/* Physical: Channel badges */}
              {isPhysical && salesChannels?.length > 0 && salesChannels.map(ch => {
                const style = CHANNEL_COLORS[ch];
                return style ? (
                  <Badge key={ch} className={`${style.bg} ${style.text} border ${style.border} text-xs`}>
                    {style.label}
                  </Badge>
                ) : null;
              })}

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

function EditCell({ value, onChange, type = 'text', placeholder, className: extraClass }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(type === 'number' ? e.target.value : e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full bg-zinc-800/80 border border-zinc-700 rounded px-2 py-1 text-[13px] text-white",
        "focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30",
        "placeholder:text-zinc-600",
        extraClass
      )}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function ProductTableView({
  products,
  productType = 'digital',
  detailsMap = {},
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  editMode = false,
  pendingEdits = {},
  onFieldChange,
}) {
  const isDigital = productType === 'digital';
  const Icon = isDigital ? Cloud : Package;
  const allSelected = selectedIds && products.length > 0 && products.every(p => selectedIds.has(p.id));

  const getEditValue = (productId, field, fallback) => {
    const edits = pendingEdits[productId];
    if (edits && field in edits) return edits[field];
    return fallback;
  };

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] bg-zinc-900/80 hover:bg-zinc-900/80">
            <TableHead className="w-[40px] pl-4 pr-0">
              {onToggleAll ? (
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="w-3.5 h-3.5 rounded border-zinc-600 bg-transparent accent-cyan-500 cursor-pointer"
                />
              ) : <div className="w-3.5" />}
            </TableHead>
            <TableHead className="text-zinc-500 text-xs font-medium pl-0" colSpan={2}>Product</TableHead>
            {isDigital ? (
              <>
                <TableHead className="text-zinc-500 text-xs font-medium w-[120px]">Pricing</TableHead>
                <TableHead className="text-zinc-500 text-xs font-medium w-[100px] text-center">Trial</TableHead>
                <TableHead className="text-zinc-500 text-xs font-medium w-[130px] hidden lg:table-cell">Category</TableHead>
                <TableHead className="text-zinc-500 text-xs font-medium w-[80px] text-center hidden xl:table-cell">Packages</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-zinc-500 text-xs font-medium w-[120px]">SKU</TableHead>
                <TableHead className="text-zinc-500 text-xs font-medium w-[100px] text-center">Price</TableHead>
                <TableHead className="text-zinc-500 text-xs font-medium w-[100px] text-center">Stock</TableHead>
                <TableHead className="text-zinc-500 text-xs font-medium w-[100px] text-center hidden lg:table-cell">Status</TableHead>
                <TableHead className="text-zinc-500 text-xs font-medium w-[130px] hidden xl:table-cell">Category</TableHead>
              </>
            )}
            <TableHead className="w-[40px] pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const details = detailsMap[product.id];
            const status = STATUS_COLORS[product.status] || STATUS_COLORS.draft;
            const pricingModel = isDigital && details?.pricing_model
              ? PRICING_MODELS[details.pricing_model] || { label: 'Custom', color: 'text-zinc-400' }
              : null;
            const pricing = !isDigital && details?.pricing;
            const packages = isDigital ? (details?.packages || []) : [];
            const isSelected = selectedIds?.has(product.id);
            const inventory = !isDigital ? details?.inventory : null;
            const qty = inventory?.quantity ?? null;
            const low = inventory?.low_stock_threshold || 10;
            const hasEdits = !!pendingEdits[product.id];

            return (
              <TableRow
                key={product.id}
                className={cn(
                  "border-white/[0.06] hover:bg-white/[0.02] group",
                  isSelected && "bg-cyan-500/[0.04]",
                  hasEdits && "bg-cyan-500/[0.06]"
                )}
              >
                {/* Checkbox */}
                <TableCell className="py-2 pl-4 pr-0">
                  {onToggleSelect ? (
                    <input
                      type="checkbox"
                      checked={isSelected || false}
                      onChange={() => onToggleSelect(product.id)}
                      className="w-3.5 h-3.5 rounded border-zinc-600 bg-transparent accent-cyan-500 cursor-pointer"
                    />
                  ) : <div className="w-3.5" />}
                </TableCell>

                {/* Image */}
                <TableCell className="py-2 pr-3 w-[44px]">
                  <Link to={createPageUrl(`ProductDetail?type=${productType}&slug=${product.slug}`)}>
                    <div className="w-9 h-9 rounded bg-zinc-800 border border-white/[0.06] flex items-center justify-center overflow-hidden">
                      {product.featured_image?.url ? (
                        <img src={product.featured_image.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Icon className={cn("w-4 h-4", isDigital ? "text-cyan-500/40" : "text-amber-500/40")} />
                      )}
                    </div>
                  </Link>
                </TableCell>

                {/* Name + variant/subtitle */}
                <TableCell className="py-2 pl-0">
                  {editMode ? (
                    <EditCell
                      value={getEditValue(product.id, 'name', product.name)}
                      onChange={(v) => onFieldChange?.(product.id, 'name', v)}
                      placeholder="Product name"
                    />
                  ) : (
                    <Link to={createPageUrl(`ProductDetail?type=${productType}&slug=${product.slug}`)} className="block">
                      <span className="text-[13px] font-semibold text-white leading-tight">
                        {product.name}
                      </span>
                      {(product.tagline || product.short_description) && (
                        <p className="text-[11px] text-zinc-500 leading-tight mt-0.5 truncate max-w-[260px]">
                          {product.tagline || product.short_description}
                        </p>
                      )}
                    </Link>
                  )}
                </TableCell>

                {isDigital ? (
                  <>
                    {/* Pricing */}
                    <TableCell className="py-2">
                      {pricingModel ? (
                        <span className={`text-[13px] ${pricingModel.color}`}>{pricingModel.label}</span>
                      ) : (
                        <span className="text-[13px] text-zinc-600">—</span>
                      )}
                    </TableCell>
                    {/* Trial */}
                    <TableCell className="py-2 text-center">
                      {details?.trial_available ? (
                        <span className="text-[13px] text-zinc-300">{details.trial_days}d</span>
                      ) : (
                        <span className="text-[13px] text-zinc-600">—</span>
                      )}
                    </TableCell>
                    {/* Category */}
                    <TableCell className="py-2 hidden lg:table-cell">
                      <span className="text-[13px] text-zinc-400">{product.category || '—'}</span>
                    </TableCell>
                    {/* Packages */}
                    <TableCell className="py-2 text-center hidden xl:table-cell">
                      <span className="text-[13px] text-zinc-400">{packages.length || '0'}</span>
                    </TableCell>
                  </>
                ) : (
                  <>
                    {/* SKU */}
                    <TableCell className="py-2">
                      {editMode ? (
                        <EditCell
                          value={getEditValue(product.id, 'sku', details?.sku || '')}
                          onChange={(v) => onFieldChange?.(product.id, 'sku', v)}
                          placeholder="SKU"
                        />
                      ) : (
                        <span className="text-[13px] text-zinc-400">{details?.sku || '—'}</span>
                      )}
                    </TableCell>
                    {/* Price */}
                    <TableCell className="py-2 text-center">
                      {editMode ? (
                        <EditCell
                          value={getEditValue(product.id, 'price', pricing?.base_price || '')}
                          onChange={(v) => onFieldChange?.(product.id, 'price', v)}
                          type="number"
                          placeholder="0.00"
                          className="text-center"
                        />
                      ) : pricing?.base_price ? (
                        <span className="text-[13px] text-zinc-300">
                          €{parseFloat(pricing.base_price).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[13px] text-zinc-600">—</span>
                      )}
                    </TableCell>
                    {/* Stock qty */}
                    <TableCell className="py-2 text-center">
                      {editMode ? (
                        <EditCell
                          value={getEditValue(product.id, 'stock', qty ?? '')}
                          onChange={(v) => onFieldChange?.(product.id, 'stock', v)}
                          type="number"
                          placeholder="0"
                          className="text-center"
                        />
                      ) : qty != null ? (
                        <span className={cn(
                          "text-[13px] font-medium tabular-nums",
                          qty <= 0 ? "text-red-400" :
                          qty <= low ? "text-amber-400" :
                          "text-zinc-300"
                        )}>
                          {qty}
                        </span>
                      ) : (
                        <span className="text-[13px] text-zinc-600">—</span>
                      )}
                    </TableCell>
                    {/* Status */}
                    <TableCell className="py-2 text-center hidden lg:table-cell">
                      {editMode ? (
                        <select
                          value={getEditValue(product.id, 'status', product.status)}
                          onChange={(e) => onFieldChange?.(product.id, 'status', e.target.value)}
                          className="bg-zinc-800/80 border border-zinc-700 rounded px-1.5 py-1 text-[12px] text-white focus:outline-none focus:border-cyan-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="archived">Archived</option>
                        </select>
                      ) : (
                        <span className={`text-[11px] ${status.text}`}>
                          {status.label}
                        </span>
                      )}
                    </TableCell>
                    {/* Category */}
                    <TableCell className="py-2 hidden xl:table-cell">
                      <span className="text-[13px] text-zinc-400">{product.category || '—'}</span>
                    </TableCell>
                  </>
                )}

                {/* Actions */}
                <TableCell className="py-2 pr-4">
                  {!editMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                        <DropdownMenuItem asChild className="text-zinc-300 hover:text-white">
                          <Link to={createPageUrl(`ProductDetail?type=${productType}&slug=${product.slug}`)}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-zinc-300 hover:text-white" onClick={() => onEdit?.(product)}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-zinc-300 hover:text-white" onClick={() => onDuplicate?.(product)}>
                          <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-amber-400 hover:text-amber-300" onClick={() => onArchive?.(product)}>
                          <Archive className="w-4 h-4 mr-2" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:text-red-300" onClick={() => onDelete?.(product)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default { ProductGridCard, ProductListRow, ProductTableView };

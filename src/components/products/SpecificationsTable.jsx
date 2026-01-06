import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ChevronDown, ChevronUp, Search, Package, Ruler, Weight, Box,
  Barcode, Tag, Globe, FileText, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SPEC_ICONS = {
  dimensions: Ruler,
  weight: Weight,
  material: Box,
  sku: Barcode,
  origin: Globe,
  default: Tag,
};

export default function SpecificationsTable({
  specifications = [],
  attributes = [],
  productInfo = {},
  className,
}) {
  const [expandedGroups, setExpandedGroups] = useState(new Set(['general']));
  const [searchQuery, setSearchQuery] = useState('');

  // Group specifications by category
  const groupedSpecs = specifications.reduce((acc, spec) => {
    const group = spec.group || spec.category || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(spec);
    return acc;
  }, {});

  // Add product info to general group
  const generalInfo = [];
  if (productInfo.sku) generalInfo.push({ name: 'SKU', value: productInfo.sku, icon: 'sku' });
  if (productInfo.barcode) generalInfo.push({ name: 'Barcode', value: productInfo.barcode, icon: 'sku' });
  if (productInfo.mpn) generalInfo.push({ name: 'MPN', value: productInfo.mpn });
  if (productInfo.country_of_origin) generalInfo.push({ name: 'Country of Origin', value: productInfo.country_of_origin, icon: 'origin' });

  if (generalInfo.length > 0) {
    groupedSpecs['Product Info'] = generalInfo;
  }

  // Filter specifications based on search
  const filterSpecs = (specs) => {
    if (!searchQuery.trim()) return specs;
    const query = searchQuery.toLowerCase();
    return specs.filter(spec =>
      spec.name?.toLowerCase().includes(query) ||
      spec.value?.toString().toLowerCase().includes(query)
    );
  };

  const toggleGroup = (group) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const allGroups = Object.keys(groupedSpecs);

  if (allGroups.length === 0 && attributes.length === 0) {
    return (
      <div className={cn("rounded-2xl bg-zinc-900/50 border border-white/5 p-8 text-center", className)}>
        <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-zinc-600" />
        </div>
        <p className="text-zinc-500">No specifications available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      {(specifications.length > 5 || attributes.length > 3) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search specifications..."
            className="pl-9 bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-500"
          />
        </div>
      )}

      {/* Attributes as Tags */}
      {attributes.length > 0 && (
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
          <h4 className="text-sm font-medium text-zinc-400 mb-3">Attributes</h4>
          <div className="flex flex-wrap gap-2">
            {attributes.map((attr, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                {typeof attr === 'string' ? attr : `${attr.name}: ${attr.value}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Specification Groups */}
      <div className="rounded-xl bg-zinc-900/50 border border-white/5 overflow-hidden divide-y divide-white/5">
        {allGroups.map((group, groupIndex) => {
          const specs = filterSpecs(groupedSpecs[group]);
          if (specs.length === 0) return null;

          const isExpanded = expandedGroups.has(group);
          const GroupIcon = group.toLowerCase().includes('dimension') ? Ruler
            : group.toLowerCase().includes('weight') ? Weight
            : group.toLowerCase().includes('material') ? Box
            : Package;

          return (
            <div key={group}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <GroupIcon className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="font-medium text-white capitalize">{group}</span>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                    {specs.length}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-500" />
                )}
              </button>

              {/* Specification Rows */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="divide-y divide-white/5">
                    {specs.map((spec, i) => {
                      const Icon = SPEC_ICONS[spec.icon] || SPEC_ICONS.default;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-3 bg-zinc-900/30"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-zinc-500" />
                            <span className="text-zinc-400">{spec.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white font-medium">
                              {spec.value}
                            </span>
                            {spec.unit && (
                              <span className="text-zinc-500 ml-1">{spec.unit}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Download Spec Sheet */}
      {productInfo.spec_sheet_url && (
        <Button
          variant="outline"
          className="w-full border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
          asChild
        >
          <a href={productInfo.spec_sheet_url} download>
            <Download className="w-4 h-4 mr-2" /> Download Specification Sheet
          </a>
        </Button>
      )}
    </div>
  );
}

export function ShippingInfo({ shipping = {} }) {
  if (!shipping || Object.keys(shipping).length === 0) return null;

  const { weight, weight_unit, dimensions, requires_shipping } = shipping;
  const { length, width, height } = dimensions || {};

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-white/5 p-4">
      <h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
        <Package className="w-4 h-4" /> Shipping Information
      </h4>
      <div className="grid grid-cols-2 gap-4">
        {weight && (
          <div>
            <span className="text-xs text-zinc-500">Weight</span>
            <p className="text-white font-medium">{weight} {weight_unit || 'kg'}</p>
          </div>
        )}
        {(length || width || height) && (
          <div>
            <span className="text-xs text-zinc-500">Dimensions (L x W x H)</span>
            <p className="text-white font-medium">
              {length || '-'} x {width || '-'} x {height || '-'} cm
            </p>
          </div>
        )}
        <div>
          <span className="text-xs text-zinc-500">Requires Shipping</span>
          <p className="text-white font-medium">
            {requires_shipping !== false ? 'Yes' : 'No (Digital Delivery)'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function InventoryStatus({ inventory = {} }) {
  const { quantity = 0, track_quantity = true, low_stock_threshold = 5 } = inventory;

  if (!track_quantity) {
    return (
      <Badge className="bg-zinc-800 text-zinc-400 border border-white/10">
        Inventory not tracked
      </Badge>
    );
  }

  if (quantity <= 0) {
    return (
      <Badge className="bg-red-500/10 text-red-400 border border-red-500/30">
        Out of Stock
      </Badge>
    );
  }

  if (quantity <= low_stock_threshold) {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30">
        Low Stock ({quantity} left)
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">
      In Stock ({quantity} available)
    </Badge>
  );
}

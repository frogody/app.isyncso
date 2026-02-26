import React, { useCallback } from 'react';
import {
  Instagram,
  Facebook,
  Linkedin,
  Music2,
  Globe,
  Search,
  Youtube,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { PLATFORMS, PLATFORM_GROUPS } from '@/lib/reach-constants';

const ICON_MAP = {
  Instagram,
  Facebook,
  Linkedin,
  Music2,
  Globe,
  Search,
  Youtube,
};

const GROUP_COLORS = {
  instagram: 'border-pink-500/20 hover:border-pink-500/40',
  facebook: 'border-blue-500/20 hover:border-blue-500/40',
  linkedin: 'border-sky-500/20 hover:border-sky-500/40',
  tiktok: 'border-zinc-500/20 hover:border-zinc-400/40',
  google: 'border-amber-500/20 hover:border-amber-500/40',
  youtube: 'border-red-500/20 hover:border-red-500/40',
};

const GROUP_ICON_COLORS = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  linkedin: 'text-sky-400',
  tiktok: 'text-zinc-300',
  google: 'text-amber-400',
  youtube: 'text-red-400',
};

export default function PlatformSelector({ selected = [], onChange, disabled = false, className }) {
  const togglePlacement = useCallback(
    (placementKey) => {
      if (disabled) return;
      const next = selected.includes(placementKey)
        ? selected.filter((k) => k !== placementKey)
        : [...selected, placementKey];
      onChange(next);
    },
    [selected, onChange, disabled]
  );

  const toggleGroup = useCallback(
    (groupKey) => {
      if (disabled) return;
      const group = PLATFORM_GROUPS[groupKey];
      if (!group) return;
      const allSelected = group.placements.every((p) => selected.includes(p));
      const next = allSelected
        ? selected.filter((k) => !group.placements.includes(k))
        : [...new Set([...selected, ...group.placements])];
      onChange(next);
    },
    [selected, onChange, disabled]
  );

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3', className)}>
      {Object.entries(PLATFORM_GROUPS).map(([groupKey, group]) => {
        const allSelected = group.placements.every((p) => selected.includes(p));
        const someSelected = group.placements.some((p) => selected.includes(p));
        const firstPlacement = PLATFORMS[group.placements[0]];
        const GroupIcon = firstPlacement ? ICON_MAP[firstPlacement.icon] : null;

        return (
          <div
            key={groupKey}
            className={cn(
              'rounded-xl border bg-zinc-900/50 p-3 transition-colors',
              GROUP_COLORS[groupKey] || 'border-zinc-800',
              disabled && 'opacity-50 pointer-events-none'
            )}
          >
            <div className="flex items-center gap-2 mb-2.5">
              {GroupIcon && (
                <GroupIcon
                  className={cn('w-4 h-4', GROUP_ICON_COLORS[groupKey] || 'text-zinc-400')}
                />
              )}
              <span className="text-sm font-medium text-white flex-1">{group.label}</span>
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => toggleGroup(groupKey)}
                className={cn(
                  'h-3.5 w-3.5',
                  someSelected && !allSelected && 'opacity-60'
                )}
              />
            </div>

            <div className="space-y-1.5">
              {group.placements.map((placementKey) => {
                const placement = PLATFORMS[placementKey];
                if (!placement) return null;
                const isSelected = selected.includes(placementKey);

                return (
                  <label
                    key={placementKey}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors',
                      isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePlacement(placementKey)}
                      className="h-3.5 w-3.5"
                    />
                    <span className={cn('text-xs flex-1', isSelected ? 'text-zinc-200' : 'text-zinc-400')}>
                      {placement.name}
                    </span>
                    {isSelected && placement.width && placement.height && (
                      <span className="text-[10px] text-zinc-500 tabular-nums">
                        {placement.width}x{placement.height}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React, { memo, useMemo } from 'react';

// Category definitions
export const CHANNEL_CATEGORIES = [
  { id: 'all', label: 'All', color: 'bg-zinc-500', textColor: 'text-zinc-300', dotColor: 'bg-zinc-400' },
  { id: 'general', label: 'General', color: 'bg-zinc-500', textColor: 'text-zinc-300', dotColor: 'bg-zinc-400' },
  { id: 'project', label: 'Project', color: 'bg-cyan-500', textColor: 'text-cyan-300', dotColor: 'bg-cyan-400' },
  { id: 'client', label: 'Client', color: 'bg-blue-500', textColor: 'text-blue-300', dotColor: 'bg-blue-400' },
  { id: 'department', label: 'Dept', color: 'bg-indigo-500', textColor: 'text-indigo-300', dotColor: 'bg-indigo-400' },
  { id: 'support', label: 'Support', color: 'bg-amber-500', textColor: 'text-amber-300', dotColor: 'bg-amber-400' },
  { id: 'auto', label: 'Sync', color: 'bg-purple-500', textColor: 'text-purple-300', dotColor: 'bg-purple-400' },
];

// Map for quick lookup
export const CATEGORY_MAP = Object.fromEntries(
  CHANNEL_CATEGORIES.map(c => [c.id, c])
);

// Get the dot color class for a given category
export function getCategoryDotColor(category) {
  return CATEGORY_MAP[category]?.dotColor || CATEGORY_MAP.general.dotColor;
}

// Filter channels by category
export function filterChannelsByCategory(channels, selectedCategory) {
  if (!selectedCategory || selectedCategory === 'all') return channels;
  return channels.filter(c => (c.category || 'general') === selectedCategory);
}

// Category Filter Pills
const ChannelCategoryManager = memo(function ChannelCategoryManager({
  selectedCategory = 'all',
  onSelectCategory,
  channels = [],
}) {
  // Count channels per category
  const categoryCounts = useMemo(() => {
    const counts = { all: channels.length };
    for (const ch of channels) {
      const cat = ch.category || 'general';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [channels]);

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
      {CHANNEL_CATEGORIES.map((cat) => {
        const count = categoryCounts[cat.id] || 0;
        // Hide categories with 0 channels (except "all")
        if (cat.id !== 'all' && count === 0) return null;

        const isActive = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              isActive
                ? `${cat.color}/20 ${cat.textColor} ring-1 ring-inset ${cat.color.replace('bg-', 'ring-')}/40`
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {cat.id !== 'all' && (
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? cat.dotColor : 'bg-zinc-600'}`} />
            )}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
});

// Category Dot indicator for channel items
export const CategoryDot = memo(function CategoryDot({ category }) {
  if (!category || category === 'general') return null;
  const cat = CATEGORY_MAP[category];
  if (!cat) return null;

  return (
    <span
      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.dotColor}`}
      title={cat.label}
    />
  );
});

export default ChannelCategoryManager;

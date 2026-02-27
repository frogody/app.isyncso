import { useMemo } from 'react';
import { useTeamAccess } from '@/components/context/UserContext';
import { APP_COLORS } from '@/lib/appColors';

// App display metadata (name + icon)
const APP_META = {
  learn:    { name: 'Learn',    icon: '📚' },
  growth:   { name: 'Growth',   icon: '📈' },
  sentinel: { name: 'Sentinel', icon: '🛡️' },
  finance:  { name: 'Finance',  icon: '💰' },
  raise:    { name: 'Raise',    icon: '🚀' },
  talent:   { name: 'Talent',   icon: '👤' },
  create:   { name: 'Create',   icon: '🎨' },
  reach:    { name: 'Reach',    icon: '📣' },
  products: { name: 'Products', icon: '📦' },
  inbox:    { name: 'Inbox',    icon: '📬' },
};

const GAP = 0.02; // 2% gap between segments

/**
 * Computes dynamic ring segments from the user's effective apps.
 * Only shows apps that are enabled + licensed AND have a color in APP_COLORS.
 * Segments are evenly distributed around the circle with small gaps.
 */
export function useActiveAppSegments() {
  const { effectiveApps, isLoading } = useTeamAccess();

  const segments = useMemo(() => {
    if (!effectiveApps || effectiveApps.length === 0) return [];

    // Filter to apps that have a color entry
    const activeApps = effectiveApps.filter(id => APP_COLORS[id]);
    const count = activeApps.length;
    if (count === 0) return [];

    const totalGap = GAP * count;
    const segmentSize = (1 - totalGap) / count;

    return activeApps.map((id, i) => {
      const from = i * (segmentSize + GAP) + GAP / 2;
      const to = from + segmentSize;
      const meta = APP_META[id] || { name: id, icon: '⚡' };
      return {
        id,
        name: meta.name,
        color: APP_COLORS[id],
        from,
        to,
        icon: meta.icon,
      };
    });
  }, [effectiveApps]);

  return { segments, isLoading };
}

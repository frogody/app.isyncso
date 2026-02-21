// ---------------------------------------------------------------------------
// Shared constants for all B2B admin components.
// Single source of truth for status badge colors, ensuring consistency.
// ---------------------------------------------------------------------------

// Order workflow statuses
export const ORDER_STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// Inquiry statuses
export const INQUIRY_STATUS_COLORS = {
  open: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  replied: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  closed: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30',
};

// Generic active/inactive
export const ACTIVE_STATUS_COLORS = {
  active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  inactive: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30',
};

// Fallback for unknown statuses
export const DEFAULT_STATUS_COLOR = 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30';

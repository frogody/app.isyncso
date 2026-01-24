/**
 * Admin Panel Theme Constants
 * Centralized styling definitions for consistent admin UI
 */

// =============================================================================
// STATUS COLORS - For badges and status indicators
// =============================================================================

export const STATUS_COLORS = {
  // Active/Success states
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
  enabled: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  connected: 'bg-green-500/20 text-green-400 border-green-500/30',
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
  succeeded: 'bg-green-500/20 text-green-400 border-green-500/30',

  // Pending/Draft states
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  awaiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  degraded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  trialing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',

  // Inactive/Disabled states
  inactive: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  disabled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  paused: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  unknown: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',

  // Error/Rejected states
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  deactivated: 'bg-red-500/20 text-red-400 border-red-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  revoked: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
  down: 'bg-red-500/20 text-red-400 border-red-500/30',
  past_due: 'bg-red-500/20 text-red-400 border-red-500/30',
  canceled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',

  // Warning states
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  expiring: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  expired: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  limited: 'bg-orange-500/20 text-orange-400 border-orange-500/30',

  // Special states
  beta: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  new: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  premium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  core: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  running: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  refunded: 'bg-purple-500/20 text-purple-400 border-purple-500/30',

  // Admin/Platform states
  platform_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  platformadmin: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// =============================================================================
// ROLE COLORS - For user role badges
// =============================================================================

export const ROLE_COLORS = {
  super_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  admin: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  manager: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  user: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  learner: 'bg-green-500/20 text-green-400 border-green-500/30',
  viewer: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  // Aliases
  superadmin: 'bg-red-500/20 text-red-400 border-red-500/30',
  support: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  analyst: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

// =============================================================================
// ICON COLORS - For stat cards and icon containers
// =============================================================================

export const ICON_COLORS = {
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    combined: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    combined: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    combined: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    combined: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    combined: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    combined: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    combined: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  pink: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    combined: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  },
};

// =============================================================================
// CATEGORY COLORS - For tags, integrations, marketplace categories
// =============================================================================

export const CATEGORY_COLORS = {
  blue: 'bg-blue-500/20 text-blue-400',
  green: 'bg-green-500/20 text-green-400',
  purple: 'bg-purple-500/20 text-purple-400',
  orange: 'bg-orange-500/20 text-orange-400',
  pink: 'bg-pink-500/20 text-pink-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  amber: 'bg-amber-500/20 text-amber-400',
  indigo: 'bg-indigo-500/20 text-indigo-400',
  red: 'bg-red-500/20 text-red-400',
  teal: 'bg-teal-500/20 text-teal-400',
};

// Category name to color mapping for common categories
export const CATEGORY_COLOR_MAP = {
  // Integration categories
  crm: 'blue',
  productivity: 'green',
  communication: 'purple',
  storage: 'orange',
  analytics: 'cyan',
  marketing: 'pink',
  finance: 'amber',
  development: 'indigo',
  // Marketplace categories
  data: 'blue',
  tools: 'green',
  templates: 'purple',
  integrations: 'orange',
  ai: 'pink',
  automation: 'cyan',
};

// =============================================================================
// BUTTON STYLES
// =============================================================================

export const BUTTON_STYLES = {
  primary: 'bg-red-500 hover:bg-red-600 text-white',
  secondary: 'bg-zinc-700 hover:bg-zinc-600 text-white',
  outline: 'border border-zinc-700 hover:bg-zinc-800 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  warning: 'bg-orange-600 hover:bg-orange-700 text-white',
  ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-white',
  link: 'text-red-400 hover:text-red-300 underline-offset-4 hover:underline',
};

// =============================================================================
// CARD STYLES
// =============================================================================

export const CARD_STYLES = {
  card: 'bg-zinc-900/50 border border-zinc-800 rounded-lg',
  cardHover: 'bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors',
  cardActive: 'bg-zinc-900/50 border border-red-500/50 rounded-lg',
  modal: 'bg-zinc-900 border-zinc-800',
  dropdown: 'bg-zinc-900 border-zinc-800',
  popover: 'bg-zinc-900 border-zinc-800',
  tooltip: 'bg-zinc-800 border-zinc-700',
};

// =============================================================================
// TEXT COLORS
// =============================================================================

export const TEXT_COLORS = {
  primary: 'text-white',
  secondary: 'text-zinc-400',
  muted: 'text-zinc-500',
  disabled: 'text-zinc-600',
  error: 'text-red-400',
  success: 'text-green-400',
  warning: 'text-orange-400',
  info: 'text-blue-400',
  link: 'text-red-400 hover:text-red-300',
};

// =============================================================================
// INPUT STYLES
// =============================================================================

export const INPUT_STYLES = {
  default: 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-red-500 focus:ring-red-500/20',
  error: 'bg-zinc-800 border-red-500 text-white placeholder-zinc-500 focus:border-red-500 focus:ring-red-500/20',
  disabled: 'bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed',
};

// =============================================================================
// TABLE STYLES
// =============================================================================

export const TABLE_STYLES = {
  header: 'bg-zinc-900/80 text-zinc-400 text-sm font-medium',
  headerCell: 'p-4 text-left',
  row: 'border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors',
  cell: 'p-4 text-zinc-300',
  cellMuted: 'p-4 text-zinc-400',
};

// =============================================================================
// TAB STYLES
// =============================================================================

export const TAB_STYLES = {
  list: 'bg-zinc-900 border border-zinc-800',
  trigger: 'data-[state=active]:bg-red-600 data-[state=active]:text-white text-zinc-400',
  content: 'mt-6',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get status color classes for a given status string
 * @param {string} status - The status to get colors for
 * @returns {string} Tailwind classes for the status
 */
export function getStatusColor(status) {
  if (!status) return STATUS_COLORS.unknown;
  const normalized = status.toLowerCase().replace(/[^a-z]/g, '_');
  return STATUS_COLORS[normalized] || STATUS_COLORS.unknown;
}

/**
 * Get role color classes for a given role string
 * @param {string} role - The role to get colors for
 * @returns {string} Tailwind classes for the role
 */
export function getRoleColor(role) {
  if (!role) return ROLE_COLORS.viewer;
  const normalized = role.toLowerCase().replace(/[^a-z]/g, '_');
  return ROLE_COLORS[normalized] || ROLE_COLORS.viewer;
}

/**
 * Get icon color classes for a given color name
 * @param {string} colorName - The color name (red, blue, green, etc.)
 * @returns {string} Combined Tailwind classes for the icon
 */
export function getIconColor(colorName) {
  if (!colorName) return ICON_COLORS.blue.combined;
  const normalized = colorName.toLowerCase();
  const colorObj = ICON_COLORS[normalized] || ICON_COLORS.blue;
  return colorObj.combined;
}

/**
 * Get category color classes for a given category
 * @param {string} category - The category name
 * @returns {string} Tailwind classes for the category
 */
export function getCategoryColor(category) {
  if (!category) return CATEGORY_COLORS.blue;
  const normalized = category.toLowerCase();
  const colorName = CATEGORY_COLOR_MAP[normalized] || 'blue';
  return CATEGORY_COLORS[colorName];
}

/**
 * Get button style classes for a given variant
 * @param {string} variant - The button variant (primary, secondary, etc.)
 * @returns {string} Tailwind classes for the button
 */
export function getButtonStyle(variant) {
  return BUTTON_STYLES[variant] || BUTTON_STYLES.primary;
}

/**
 * Determine change type from a percentage string
 * @param {string} changeStr - The change string (e.g., "+12%", "-5%")
 * @returns {'increase' | 'decrease'} The change type
 */
export function getChangeType(changeStr) {
  if (!changeStr) return 'increase';
  return changeStr.startsWith('-') ? 'decrease' : 'increase';
}

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Format a number with locale-specific separators
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  return (num || 0).toLocaleString();
}

/**
 * Centralized Date/Time Formatting Utilities
 * Replace duplicate formatTime, formatDate, formatTimeAgo functions across the app
 */

/**
 * Format a timestamp as relative time (e.g., "Just now", "5m ago", "2h ago")
 * Use this for activity feeds, messages, notifications
 */
export function formatTimeAgo(timestamp: Date | string | number | null | undefined): string {
  if (!timestamp) return 'never';

  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();

  // Handle invalid dates
  if (isNaN(diff)) return 'Invalid date';

  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  // For older dates, show the date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a timestamp with more detail for tooltips or expanded views
 * Use this when you need to show date AND time
 */
export function formatTimestamp(timestamp: Date | string | number | null | undefined): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);

  // Handle invalid dates
  if (isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format a full date for display (e.g., "Monday, January 5")
 * Use this for calendar views, date dividers
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';

  const d = new Date(date);

  // Handle invalid dates
  if (isNaN(d.getTime())) return 'Invalid date';

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a duration in minutes as human-readable (e.g., "45m", "2h 30m")
 * Use this for learning time, session durations
 */
export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0m';

  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format a duration in seconds as human-readable (e.g., "45s", "2m 30s")
 * Use this for action durations, loading times
 */
export function formatSeconds(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0s';

  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

/**
 * Format a date for message/activity dividers (Today, Yesterday, or full date)
 */
export function formatDateDivider(date: Date | string | number | null | undefined): string {
  if (!date) return '';

  const d = new Date(date);

  // Handle invalid dates
  if (isNaN(d.getTime())) return 'Invalid date';

  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get a short date string (e.g., "Jan 5")
 */
export function formatShortDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';

  const d = new Date(date);

  // Handle invalid dates
  if (isNaN(d.getTime())) return 'Invalid date';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

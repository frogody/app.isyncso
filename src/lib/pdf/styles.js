import { StyleSheet } from '@react-pdf/renderer';

// Color palette matching the portal theme
export const colors = {
  primary: '#06b6d4',      // cyan-500
  accent: '#10b981',       // emerald-500
  success: '#22c55e',      // green-500
  warning: '#f59e0b',      // amber-500
  danger: '#ef4444',       // red-500
  purple: '#a855f7',       // purple-500

  text: {
    primary: '#18181b',    // zinc-900
    secondary: '#52525b',  // zinc-600
    muted: '#a1a1aa',      // zinc-400
  },

  bg: {
    primary: '#ffffff',
    secondary: '#f4f4f5',  // zinc-100
    muted: '#e4e4e7',      // zinc-200
  },

  border: '#e4e4e7',       // zinc-200
};

// Common styles used across all reports
export const commonStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: colors.bg.primary,
    padding: 40,
    fontFamily: 'Helvetica',
  },

  // Headers
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Sections
  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Content
  text: {
    fontSize: 10,
    color: colors.text.secondary,
    marginBottom: 5,
    lineHeight: 1.5,
  },

  textBold: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.primary,
  },

  textSmall: {
    fontSize: 8,
    color: colors.text.muted,
  },

  // Tables
  table: {
    display: 'table',
    width: 'auto',
    marginBottom: 10,
  },

  tableRow: {
    flexDirection: 'row',
  },

  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
  },

  tableCell: {
    padding: 8,
    fontSize: 9,
    color: colors.text.secondary,
  },

  tableCellHeader: {
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text.primary,
  },

  // Cards
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 8,
    color: colors.text.muted,
    textTransform: 'uppercase',
  },

  // Progress bar
  progressContainer: {
    height: 8,
    backgroundColor: colors.bg.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBar: {
    height: 8,
    borderRadius: 4,
  },

  // Status badges
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    fontSize: 8,
  },

  badgeActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },

  badgeCompleted: {
    backgroundColor: '#f3e8ff',
    color: '#7c3aed',
  },

  badgePending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },

  badgeOverdue: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },

  footerText: {
    fontSize: 8,
    color: colors.text.muted,
  },

  // Utilities
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  col: {
    flexDirection: 'column',
  },

  spaceBetween: {
    justifyContent: 'space-between',
  },

  mb5: { marginBottom: 5 },
  mb10: { marginBottom: 10 },
  mb15: { marginBottom: 15 },
  mb20: { marginBottom: 20 },

  mt5: { marginTop: 5 },
  mt10: { marginTop: 10 },

  flex1: { flex: 1 },
  flex2: { flex: 2 },
  flex3: { flex: 3 },
});

// Helper function to get status color
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'in_progress':
      return colors.accent;
    case 'completed':
    case 'done':
      return colors.purple;
    case 'pending':
    case 'on_hold':
      return colors.warning;
    case 'overdue':
    case 'cancelled':
      return colors.danger;
    default:
      return colors.text.muted;
  }
};

// Helper function to format dates
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper function to format datetime
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default commonStyles;

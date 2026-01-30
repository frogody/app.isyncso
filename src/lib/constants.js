/**
 * Application Constants
 * Centralized configuration for iSyncSO
 */

// Sentinel AI Compliance Constants
export const SENTINEL = {
  HIGH_RISK_TASK_MULTIPLIER: 3,
  COMPLIANCE_THRESHOLD: 80,
  RISK_LEVELS: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    MINIMAL: 'minimal'
  }
};

// Theme Colors for different app modules
export const THEME_COLORS = {
  sentinel: {
    // Sage green (#86EFAC)
    text: 'text-[#86EFAC]',
    bg: 'bg-[#86EFAC]/10',
    border: 'border-[#86EFAC]/20',
    solid: 'bg-[#86EFAC]',
    glow: 'shadow-[0_0_10px_rgba(134,239,172,0.5)]'
  },
  growth: {
    // Indigo
    text: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    solid: 'bg-indigo-500',
    glow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]'
  },
  learn: {
    // Teal
    text: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    solid: 'bg-teal-500',
    glow: 'shadow-[0_0_10px_rgba(20,184,166,0.5)]'
  },
  sync: {
    // Purple
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    solid: 'bg-purple-500',
    glow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]'
  },
  finance: {
    // Amber
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    solid: 'bg-amber-500',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]'
  },
  raise: {
    // Orange
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    solid: 'bg-orange-500',
    glow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]'
  },
  create: {
    // Rose/Pink
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    solid: 'bg-rose-500',
    glow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]'
  },
  talent: {
    // Red
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    solid: 'bg-red-500',
    glow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]'
  },
  default: {
    // Cyan (matches primary brand)
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    solid: 'bg-cyan-500',
    glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]'
  }
};

// UI Constants
export const UI = {
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 80,
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768,
  ANIMATION_DURATION: 200
};

// Feature Flags
export const FEATURES = {
  // Core navigation + default-enabled engine apps (sync is now core, not an engine app)
  DEFAULT_ENABLED_APPS: ['dashboard', 'crm', 'projects', 'tasks', 'inbox', 'learn', 'growth', 'sentinel', 'create', 'talent'],
  ALL_APPS: ['dashboard', 'crm', 'projects', 'tasks', 'inbox', 'growth', 'learn', 'sentinel', 'finance', 'raise', 'create', 'talent'],
  BETA_FEATURES: ['vision', 'voice', 'mcp'],
  ENTERPRISE_ONLY: ['sso', 'audit-log', 'custom-branding']
};

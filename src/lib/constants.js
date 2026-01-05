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
    text: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    solid: 'border-red-500',
    glow: 'shadow-red-500/20'
  },
  growth: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    solid: 'border-emerald-500',
    glow: 'shadow-emerald-500/20'
  },
  learn: {
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    solid: 'border-blue-500',
    glow: 'shadow-blue-500/20'
  },
  sync: {
    text: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    solid: 'border-purple-500',
    glow: 'shadow-purple-500/20'
  },
  default: {
    text: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    solid: 'border-amber-500',
    glow: 'shadow-amber-500/20'
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
  DEFAULT_ENABLED_APPS: ['dashboard', 'crm', 'projects', 'tasks', 'inbox', 'actions', 'activity', 'ai-assistant'],
  ALL_APPS: ['dashboard', 'crm', 'projects', 'tasks', 'inbox', 'actions', 'activity', 'ai-assistant', 'growth', 'learn', 'sentinel', 'sync'],
  BETA_FEATURES: ['vision', 'voice', 'mcp'],
  ENTERPRISE_ONLY: ['sso', 'audit-log', 'custom-branding']
};

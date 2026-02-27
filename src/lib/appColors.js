// Single source of truth: app ID → hex color
// These match the platform's app branding colors

export const APP_COLORS = {
  learn:    '#06b6d4', // cyan-500
  growth:   '#6366f1', // indigo-500
  sentinel: '#86EFAC', // sage/mint
  finance:  '#3b82f6', // blue-500
  raise:    '#3b82f6', // blue-500
  talent:   '#ef4444', // red-500
  create:   '#06b6d4', // cyan-500
  reach:    '#8b5cf6', // violet-500
  products: '#10b981', // emerald-500
  inbox:    '#14b8a6', // teal-500
};

// Non-app agents used for message delegation display
export const AGENT_COLORS = {
  orchestrator: '#ec4899', // pink
  sync:         '#a855f7', // purple
  tasks:        '#f97316', // orange
  research:     '#3b82f6', // blue
  team:         '#8b5cf6', // violet
  composio:     '#22c55e', // green
};

// Look up any agent/app ID → hex color
export function getAgentColor(id) {
  return APP_COLORS[id] || AGENT_COLORS[id] || '#a855f7';
}

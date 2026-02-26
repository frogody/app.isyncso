// Widget metadata arrays — separated from rendering components to avoid
// pulling heavy dependencies (recharts, etc.) into the initial bundle.
// AppsManagerModal imports from here; actual widget components stay in
// their own files (FinanceWidgets.jsx, GrowthWidgets.jsx, etc.).

export const FINANCE_WIDGETS = [
  { id: 'finance_overview', name: 'Financial Overview', description: 'Revenue vs expenses summary', size: 'large' },
  { id: 'finance_revenue', name: 'Total Revenue', description: 'Revenue from paid invoices', size: 'small' },
  { id: 'finance_expenses', name: 'Total Expenses', description: 'Sum of all expenses', size: 'small' },
  { id: 'finance_pending', name: 'Pending Invoices', description: 'Outstanding invoice amounts', size: 'small' },
  { id: 'finance_mrr', name: 'Monthly Recurring', description: 'Active subscription revenue', size: 'small' }
];

export const GROWTH_WIDGETS = [
  { id: 'growth_pipeline', name: 'Pipeline Overview', description: 'Active deals and opportunities', size: 'large' },
  { id: 'growth_stats', name: 'Pipeline Value', description: 'Total pipeline value', size: 'small' },
  { id: 'growth_deals', name: 'Active Deals', description: 'Number of active deals', size: 'small' },
  { id: 'growth_winrate', name: 'Win Rate', description: 'Deal conversion percentage', size: 'small' },
  { id: 'growth_signals', name: 'Buying Signals', description: 'New opportunities detected', size: 'medium' },
  { id: 'growth_campaigns', name: 'Active Campaigns', description: 'Running outreach campaigns', size: 'medium' }
];

export const LEARN_WIDGETS = [
  { id: 'learn_progress', name: 'Continue Learning', description: 'Shows courses in progress', size: 'large' },
  { id: 'learn_stats', name: 'Learning Stats', description: 'Hours learned and skills tracked', size: 'small' },
  { id: 'learn_streak', name: 'Daily Streak', description: 'Your current learning streak', size: 'small' },
  { id: 'learn_xp', name: 'XP & Level', description: 'Your level and XP progress', size: 'small' },
  { id: 'learn_skills', name: 'Top Skills', description: 'Your strongest skills', size: 'medium' },
  { id: 'learn_certificates', name: 'Certificates', description: 'Earned certificates', size: 'small' }
];

export const SENTINEL_WIDGETS = [
  { id: 'sentinel_compliance', name: 'Compliance Status', description: 'Overall compliance progress', size: 'medium' },
  { id: 'sentinel_systems', name: 'AI Systems', description: 'Number of tracked systems', size: 'small' },
  { id: 'sentinel_risk', name: 'Risk Overview', description: 'Systems by risk level', size: 'medium' },
  { id: 'sentinel_tasks', name: 'Pending Tasks', description: 'Outstanding compliance tasks', size: 'small' },
  { id: 'sentinel_docs', name: 'Documentation', description: 'Generated documents', size: 'small' }
];

export const CORE_WIDGETS = [
  { id: 'actions_recent', name: 'Recent Actions', description: 'Latest automation activity', size: 'medium' },
  { id: 'quick_actions', name: 'Quick Actions', description: 'Fast navigation shortcuts', size: 'medium' }
];

export const RAISE_WIDGETS = [
  { id: 'raise_campaign', name: 'Active Campaign', description: 'Current fundraising progress', size: 'large' },
  { id: 'raise_target', name: 'Raise Target', description: 'Fundraising goal', size: 'small' },
  { id: 'raise_committed', name: 'Committed', description: 'Total committed amount', size: 'small' },
  { id: 'raise_investors', name: 'Investors', description: 'Investor pipeline count', size: 'small' },
  { id: 'raise_meetings', name: 'Meetings', description: 'Scheduled investor meetings', size: 'small' }
];

export const COMMERCE_WIDGETS = [
  { id: 'commerce_b2b_overview', name: 'B2B Sales Overview', description: 'B2B order revenue and status', size: 'large' },
  { id: 'commerce_orders', name: 'B2B Orders', description: 'Active order count', size: 'small' },
  { id: 'commerce_revenue', name: 'B2B Revenue', description: 'Total B2B sales', size: 'small' },
  { id: 'commerce_products', name: 'Product Catalog', description: 'Published product count', size: 'small' },
  { id: 'commerce_outstanding', name: 'Outstanding', description: 'Unpaid order amounts', size: 'small' }
];

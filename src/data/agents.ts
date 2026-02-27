import { GraduationCap, TrendingUp, Shield, Euro, Palette, Rocket } from 'lucide-react';

export const AGENTS_DATA = [
  {
    id: 'learn',
    name: 'Learn Agent',
    shortName: 'Learn',
    description: 'Your AI learning companion that personalizes course recommendations, tracks skill development, and provides intelligent tutoring support.',
    icon: GraduationCap,
    color: 'cyan',
    status: 'active',
    category: 'Productivity',
    capabilities: ['List & browse available courses', 'Track learning progress', 'Course enrollment via AI', 'AI-powered course recommendations', 'Skill gap analysis', 'Team learning coordination'],
    actions: 4,
    appLink: '/Learn'
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    shortName: 'Growth',
    description: 'Accelerate your sales pipeline with AI-powered prospect management, campaign automation, and intelligent pipeline tracking.',
    icon: TrendingUp,
    color: 'indigo',
    status: 'active',
    category: 'Sales',
    capabilities: ['Create & manage prospects', 'Pipeline stage management', 'Campaign creation & tracking', 'Prospect search & filtering', 'Pipeline statistics & analytics', 'Deal value forecasting'],
    actions: 9,
    appLink: '/Growth'
  },
  {
    id: 'sentinel',
    name: 'Sentinel Agent',
    shortName: 'Sentinel',
    description: 'Your AI compliance guardian for EU AI Act. Register AI systems, assess risks, and monitor compliance status automatically.',
    icon: Shield,
    color: 'sage',
    status: 'active',
    category: 'Compliance',
    capabilities: ['Register AI systems', 'Risk level classification', 'EU AI Act compliance tracking', 'Compliance status overview', 'AI governance reporting', 'Risk assessment automation'],
    actions: 3,
    appLink: '/Sentinel'
  },
  {
    id: 'finance',
    name: 'Finance Agent',
    shortName: 'Finance',
    description: 'Streamline financial operations with AI-powered invoice creation, expense tracking, and financial summaries.',
    icon: Euro,
    color: 'blue',
    status: 'active',
    category: 'Finance',
    capabilities: ['Create invoices with auto-pricing', 'Create & manage proposals', 'Expense logging & categorization', 'Financial summaries & reports', 'Invoice status management', 'Proposal to invoice conversion'],
    actions: 8,
    appLink: '/Finance'
  },
  {
    id: 'create',
    name: 'Create Agent',
    shortName: 'Create',
    description: 'Generate stunning AI images for products, marketing, and creative projects. Powered by FLUX models.',
    icon: Palette,
    color: 'cyan',
    status: 'active',
    category: 'Creative',
    capabilities: ['AI image generation (FLUX)', 'Product photography creation', 'Marketing creative generation', 'Brand-aware image styling', 'Generated content library', 'Multiple image styles'],
    actions: 2,
    appLink: '/CreateImages'
  },
  {
    id: 'raise',
    name: 'Raise Agent',
    shortName: 'Raise',
    description: 'Navigate fundraising with AI assistance for investor research, pitch preparation, and deal pipeline management.',
    icon: Rocket,
    color: 'blue',
    status: 'coming_soon',
    category: 'Fundraising',
    capabilities: ['Investor matching', 'Pitch deck analysis', 'Due diligence preparation', 'Deal flow tracking', 'Valuation insights', 'Term sheet analysis'],
    actions: 0,
    appLink: '/Raise'
  }
];

export const AGENT_COLOR_STYLES = {
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500' },
  sage: { bg: 'bg-[#86EFAC]/10', border: 'border-[#86EFAC]/30', text: 'text-[#86EFAC]', solid: 'bg-[#86EFAC]' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', solid: 'bg-amber-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', solid: 'bg-rose-500' },
};

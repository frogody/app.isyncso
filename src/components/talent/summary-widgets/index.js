// Summary Tab Widgets
export { default as WidgetWrapper } from './WidgetWrapper';
export { default as IntelligenceWidget } from './IntelligenceWidget';
export { default as TimingSignalsWidget } from './TimingSignalsWidget';
export { default as OutreachWidget } from './OutreachWidget';
export { default as ContactInfoWidget } from './ContactInfoWidget';
export { default as SkillsWidget } from './SkillsWidget';
export { default as ExperienceWidget } from './ExperienceWidget';
export { default as KeyInsightsWidget } from './KeyInsightsWidget';
export { default as QuickStatsWidget } from './QuickStatsWidget';
export { default as JobSatisfactionWidget } from './JobSatisfactionWidget';
export { default as WorkHistoryWidget } from './WorkHistoryWidget';
export { default as TechStackWidget } from './TechStackWidget';
export { default as CompanyOverviewWidget } from './CompanyOverviewWidget';
export { default as PainPointsWidget } from './PainPointsWidget';
export { default as EducationWidget } from './EducationWidget';

// Widget registry for dynamic rendering
export const WIDGET_REGISTRY = {
  IntelligenceWidget: {
    component: 'IntelligenceWidget',
    title: 'Intelligence',
    description: 'Flight risk score, level, and approach recommendation',
    icon: 'Sparkles',
    category: 'core'
  },
  TimingSignalsWidget: {
    component: 'TimingSignalsWidget',
    title: 'Timing Signals',
    description: 'Urgency indicators and timing-based opportunities',
    icon: 'Clock',
    category: 'core'
  },
  OutreachWidget: {
    component: 'OutreachWidget',
    title: 'Outreach Strategy',
    description: 'Best outreach angle and conversation starters',
    icon: 'Target',
    category: 'core'
  },
  ContactInfoWidget: {
    component: 'ContactInfoWidget',
    title: 'Contact Info',
    description: 'Email, phone, LinkedIn, and location',
    icon: 'User',
    category: 'contact'
  },
  SkillsWidget: {
    component: 'SkillsWidget',
    title: 'Skills',
    description: 'Listed and AI-inferred skills',
    icon: 'Award',
    category: 'professional'
  },
  ExperienceWidget: {
    component: 'ExperienceWidget',
    title: 'Experience',
    description: 'Career trajectory and work history stats',
    icon: 'Briefcase',
    category: 'professional'
  },
  WorkHistoryWidget: {
    component: 'WorkHistoryWidget',
    title: 'Recent Roles',
    description: 'Latest 3 positions from work history',
    icon: 'Briefcase',
    category: 'professional'
  },
  EducationWidget: {
    component: 'EducationWidget',
    title: 'Education',
    description: 'Degrees, schools, and graduation years',
    icon: 'GraduationCap',
    category: 'professional'
  },
  KeyInsightsWidget: {
    component: 'KeyInsightsWidget',
    title: 'AI Insights',
    description: 'Key insights, pain points, and opportunities',
    icon: 'Lightbulb',
    category: 'insights'
  },
  JobSatisfactionWidget: {
    component: 'JobSatisfactionWidget',
    title: 'Job Satisfaction',
    description: 'Company stability, sentiment, and switching likelihood',
    icon: 'Building2',
    category: 'insights'
  },
  PainPointsWidget: {
    component: 'PainPointsWidget',
    title: 'Pain Points & Opps',
    description: 'Company pain points and competitor opportunities',
    icon: 'Target',
    category: 'insights'
  },
  TechStackWidget: {
    component: 'TechStackWidget',
    title: 'Tech Stack',
    description: 'Technologies used at current company',
    icon: 'Cpu',
    category: 'company'
  },
  CompanyOverviewWidget: {
    component: 'CompanyOverviewWidget',
    title: 'Company Overview',
    description: 'Current employer stats and info',
    icon: 'Building2',
    category: 'company'
  },
  QuickStatsWidget: {
    component: 'QuickStatsWidget',
    title: 'Quick Stats',
    description: 'Compact overview of key metrics',
    icon: 'BarChart3',
    category: 'overview'
  }
};

// Default widget configuration
export const DEFAULT_WIDGETS = [
  { id: 'intelligence', type: 'IntelligenceWidget', order: 0, enabled: true },
  { id: 'timing', type: 'TimingSignalsWidget', order: 1, enabled: true },
  { id: 'outreach', type: 'OutreachWidget', order: 2, enabled: true },
  { id: 'contact', type: 'ContactInfoWidget', order: 3, enabled: true },
  { id: 'skills', type: 'SkillsWidget', order: 4, enabled: true },
  { id: 'experience', type: 'ExperienceWidget', order: 5, enabled: false },
  { id: 'insights', type: 'KeyInsightsWidget', order: 6, enabled: false },
  { id: 'quickstats', type: 'QuickStatsWidget', order: 7, enabled: false },
  { id: 'jobsatisfaction', type: 'JobSatisfactionWidget', order: 8, enabled: false },
  { id: 'workhistory', type: 'WorkHistoryWidget', order: 9, enabled: false },
  { id: 'education', type: 'EducationWidget', order: 10, enabled: false },
  { id: 'techstack', type: 'TechStackWidget', order: 11, enabled: false },
  { id: 'companyoverview', type: 'CompanyOverviewWidget', order: 12, enabled: false },
  { id: 'painpoints', type: 'PainPointsWidget', order: 13, enabled: false }
];

// Widget categories for the add modal
export const WIDGET_CATEGORIES = {
  core: { label: 'Core Intelligence', order: 0 },
  contact: { label: 'Contact & Location', order: 1 },
  professional: { label: 'Professional', order: 2 },
  insights: { label: 'AI Insights', order: 3 },
  company: { label: 'Company Intel', order: 4 },
  overview: { label: 'Overview', order: 5 }
};

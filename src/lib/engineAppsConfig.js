import { createPageUrl } from "@/utils";
import {
  Euro,
  Rocket,
  GraduationCap,
  UserPlus,
  Shield,
  TrendingUp,
  Palette,
  Signal,
} from "lucide-react";

// Engine apps with permission requirements
// Extracted from Layout.jsx so both the sidebar and AppLicenseGate can share it
export const ENGINE_ITEMS_CONFIG = {
  finance: {
    title: "Finance",
    url: createPageUrl("FinanceDashboard"),
    icon: Euro,
    id: 'finance',
    permission: "finance.view",
    matchPatterns: ["/finance", "/proposal"],
  },
  growth: {
    title: "Growth",
    url: "/growth/dashboard",
    icon: Rocket,
    id: 'growth',
    permission: "analytics.view",
    matchPatterns: ["/growth", "/Growth", "/sequences", "/deals", "/leads", "/insights", "/prospect", "/research", "/pipeline"],
  },
  learn: {
    title: "Learn",
    url: createPageUrl("LearnDashboard"),
    icon: GraduationCap,
    id: 'learn',
    permission: "courses.view",
    matchPatterns: ["/learn", "/course", "/lesson", "/certificate", "/skill", "/leaderboard", "/practice", "/teamlearn", "/managecourses"],
  },
  talent: {
    title: "Talent",
    url: createPageUrl("TalentDashboard"),
    icon: UserPlus,
    id: 'talent',
    permission: "talent.view",
    matchPatterns: ["/talent"],
  },
  sentinel: {
    title: "Sentinel",
    url: createPageUrl("SentinelDashboard"),
    icon: Shield,
    id: 'sentinel',
    permission: "admin.access",
    matchPatterns: ["/sentinel", "/aisystem", "/compliance", "/document", "/riskassessment"],
  },
  raise: {
    title: "Raise",
    url: createPageUrl("Raise"),
    icon: TrendingUp,
    id: 'raise',
    permission: "finance.view",
    matchPatterns: ["/raise"],
  },
  create: {
    title: "Create",
    url: createPageUrl("Create"),
    icon: Palette,
    id: 'create',
    permission: null,
    matchPatterns: ["/create", "/studio", "/syncstudio", "/contentcalendar"],
  },
  reach: {
    title: "Reach",
    url: createPageUrl("ReachDashboard"),
    icon: Signal,
    id: 'reach',
    permission: null,
    matchPatterns: ["/reach"],
  },
};

// Descriptions shown on the license gate screen
export const ENGINE_APP_DESCRIPTIONS = {
  finance:  'Invoicing, expenses, proposals, and financial reporting.',
  growth:   'Prospect research, outreach campaigns, and pipeline management.',
  learn:    'Courses, certifications, skills tracking, and team learning.',
  talent:   'Candidate sourcing, smart matching, and recruiting campaigns.',
  sentinel: 'EU AI Act compliance, AI system registry, and risk assessment.',
  raise:    'Investor CRM, pitch decks, data room, and fundraising tracking.',
  create:   'AI image and video generation, brand assets, and creative studio.',
  reach:    'Multi-channel marketing campaigns, SEO, and content calendar.',
};

// Match a URL pathname to an engine app config entry
export function getEngineAppForPath(pathname) {
  const lowerPath = pathname.toLowerCase();
  for (const [, config] of Object.entries(ENGINE_ITEMS_CONFIG)) {
    if (config.matchPatterns?.some(pattern => lowerPath.startsWith(pattern.toLowerCase()))) {
      return config;
    }
  }
  return null;
}

/**
 * DemoExperience — Public demo entry point (no auth required)
 *
 * Parses token from URL, loads demo data, orchestrates the full
 * voice-guided demo experience with mock pages and Sync narration.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, AlertCircle, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import DemoLayout from '@/components/demo/DemoLayout';
import DemoOverlay from '@/components/demo/DemoOverlay';
import DemoControls from '@/components/demo/DemoControls';
import DemoVoicePanel from '@/components/demo/DemoVoicePanel';

// Main module pages
import DemoDashboard from '@/components/demo/pages/DemoDashboard';
import DemoGrowth from '@/components/demo/pages/DemoGrowth';
import DemoCRM from '@/components/demo/pages/DemoCRM';
import DemoTalent from '@/components/demo/pages/DemoTalent';
import DemoFinance from '@/components/demo/pages/DemoFinance';
import DemoLearn from '@/components/demo/pages/DemoLearn';
import DemoCreate from '@/components/demo/pages/DemoCreate';
import DemoProducts from '@/components/demo/pages/DemoProducts';
import DemoRaise from '@/components/demo/pages/DemoRaise';
import DemoSentinel from '@/components/demo/pages/DemoSentinel';
import DemoInbox from '@/components/demo/pages/DemoInbox';
import DemoTasks from '@/components/demo/pages/DemoTasks';
import DemoIntegrations from '@/components/demo/pages/DemoIntegrations';
import DemoSync from '@/components/demo/pages/DemoSync';

// Finance sub-pages
import { DemoFinanceInvoices, DemoFinanceProposals, DemoFinanceExpenses, DemoFinanceLedger, DemoFinancePayables, DemoFinanceReports } from '@/components/demo/pages/DemoFinanceSub';
// Growth sub-pages
import { DemoGrowthPipeline, DemoGrowthCampaigns, DemoGrowthSignals, DemoGrowthOpportunities } from '@/components/demo/pages/DemoGrowthSub';
// CRM sub-pages
import { DemoCRMLeads, DemoCRMProspects, DemoCRMCustomers, DemoCRMCompanies } from '@/components/demo/pages/DemoCRMSub';
// Talent sub-pages
import { DemoTalentCandidates, DemoTalentProjects, DemoTalentCampaigns, DemoTalentNests, DemoTalentOutreach } from '@/components/demo/pages/DemoTalentSub';
// Learn sub-pages
import { DemoLearnCourses, DemoLearnSkills, DemoLearnBuilder, DemoLearnCertifications } from '@/components/demo/pages/DemoLearnSub';
// Create sub-pages
import { DemoCreateBranding, DemoCreateImages, DemoCreateVideos, DemoCreateLibrary } from '@/components/demo/pages/DemoCreateSub';
// Products sub-pages
import { DemoProductsDigital, DemoProductsPhysical, DemoProductsShipping, DemoProductsReceiving, DemoProductsInventory } from '@/components/demo/pages/DemoProductsSub';
// Raise sub-pages
import { DemoRaiseInvestors, DemoRaisePitchDecks, DemoRaiseDataRoom, DemoRaiseCampaigns } from '@/components/demo/pages/DemoRaiseSub';
// Sentinel sub-pages
import { DemoSentinelSystems, DemoSentinelRoadmap, DemoSentinelDocuments } from '@/components/demo/pages/DemoSentinelSub';
// Sync sub-pages
import { DemoSyncAgent, DemoSyncActivity } from '@/components/demo/pages/DemoSyncSub';

import useDemoOrchestrator from '@/hooks/useDemoOrchestrator';
import useDemoVoice from '@/hooks/useDemoVoice';

// Map page keys to mock page components — includes all module dashboards + sub-pages
const PAGE_COMPONENTS = {
  // Main module dashboards
  dashboard: DemoDashboard,
  growth: DemoGrowth,
  crm: DemoCRM,
  talent: DemoTalent,
  finance: DemoFinance,
  learn: DemoLearn,
  create: DemoCreate,
  products: DemoProducts,
  raise: DemoRaise,
  sentinel: DemoSentinel,
  inbox: DemoInbox,
  tasks: DemoTasks,
  integrations: DemoIntegrations,
  'sync-showcase': DemoSync,
  sync: DemoSync,
  // Finance sub-pages
  'finance-invoices': DemoFinanceInvoices,
  'finance-proposals': DemoFinanceProposals,
  'finance-expenses': DemoFinanceExpenses,
  'finance-ledger': DemoFinanceLedger,
  'finance-payables': DemoFinancePayables,
  'finance-reports': DemoFinanceReports,
  // Growth sub-pages
  'growth-pipeline': DemoGrowthPipeline,
  'growth-campaigns': DemoGrowthCampaigns,
  'growth-signals': DemoGrowthSignals,
  'growth-opportunities': DemoGrowthOpportunities,
  // CRM sub-pages
  'crm-leads': DemoCRMLeads,
  'crm-prospects': DemoCRMProspects,
  'crm-customers': DemoCRMCustomers,
  'crm-companies': DemoCRMCompanies,
  // Talent sub-pages
  'talent-candidates': DemoTalentCandidates,
  'talent-projects': DemoTalentProjects,
  'talent-campaigns': DemoTalentCampaigns,
  'talent-nests': DemoTalentNests,
  'talent-outreach': DemoTalentOutreach,
  // Learn sub-pages
  'learn-courses': DemoLearnCourses,
  'learn-skills': DemoLearnSkills,
  'learn-builder': DemoLearnBuilder,
  'learn-certifications': DemoLearnCertifications,
  // Create sub-pages
  'create-branding': DemoCreateBranding,
  'create-images': DemoCreateImages,
  'create-videos': DemoCreateVideos,
  'create-library': DemoCreateLibrary,
  // Products sub-pages
  'products-digital': DemoProductsDigital,
  'products-physical': DemoProductsPhysical,
  'products-shipping': DemoProductsShipping,
  'products-receiving': DemoProductsReceiving,
  'products-inventory': DemoProductsInventory,
  // Raise sub-pages
  'raise-investors': DemoRaiseInvestors,
  'raise-pitchdecks': DemoRaisePitchDecks,
  'raise-dataroom': DemoRaiseDataRoom,
  'raise-campaigns': DemoRaiseCampaigns,
  // Sentinel sub-pages
  'sentinel-systems': DemoSentinelSystems,
  'sentinel-roadmap': DemoSentinelRoadmap,
  'sentinel-documents': DemoSentinelDocuments,
  // Sync sub-pages
  'sync-agent': DemoSyncAgent,
  'sync-activity': DemoSyncActivity,
};

// Resolve fuzzy page keys from LLM output to exact PAGE_COMPONENTS keys
// The 8B model often adds extra words like "growth page", "the finance module", etc.
const VALID_PAGE_KEYS = Object.keys(PAGE_COMPONENTS);
const PAGE_KEY_ALIASES = {
  // Module-level aliases
  'growth pipeline': 'growth', pipeline: 'growth-pipeline', sales: 'growth', deals: 'growth',
  'crm contacts': 'crm', contacts: 'crm', 'contact management': 'crm',
  'talent acquisition': 'talent', recruiting: 'talent', talent_acquisition: 'talent',
  'finance hub': 'finance', billing: 'finance', accounting: 'finance',
  'learning academy': 'learn', learning: 'learn', training: 'learn',
  'content studio': 'create', 'ai content': 'create', 'create studio': 'create', content: 'create',
  'product catalog': 'products', product: 'products', catalog: 'products',
  fundraising: 'raise', 'fundraise': 'raise',
  'ai compliance': 'sentinel', compliance: 'sentinel',
  'unified inbox': 'inbox', messages: 'inbox', messaging: 'inbox',
  'task management': 'tasks', task: 'tasks',
  'integration': 'integrations', apps: 'integrations',
  'sync showcase': 'sync-showcase', 'meet sync': 'sync-showcase',
  // Finance sub-page aliases
  invoices: 'finance-invoices', 'invoice list': 'finance-invoices', 'invoice management': 'finance-invoices',
  proposals: 'finance-proposals', 'proposal list': 'finance-proposals',
  expenses: 'finance-expenses', 'expense tracking': 'finance-expenses', 'expense list': 'finance-expenses',
  ledger: 'finance-ledger', 'general ledger': 'finance-ledger', 'chart of accounts': 'finance-ledger',
  payables: 'finance-payables', 'accounts payable': 'finance-payables', 'ap aging': 'finance-payables',
  'financial reports': 'finance-reports', 'finance reports': 'finance-reports',
  // Growth sub-page aliases
  campaigns: 'growth-campaigns', 'outbound campaigns': 'growth-campaigns', 'campaign management': 'growth-campaigns',
  signals: 'growth-signals', 'customer signals': 'growth-signals', 'buying signals': 'growth-signals', 'growth signals': 'growth-signals',
  opportunities: 'growth-opportunities', 'opportunity tracking': 'growth-opportunities',
  // CRM sub-page aliases
  leads: 'crm-leads', 'lead management': 'crm-leads', 'lead scoring': 'crm-leads',
  prospects: 'crm-prospects', 'prospect list': 'crm-prospects',
  customers: 'crm-customers', 'customer management': 'crm-customers', 'customer health': 'crm-customers',
  companies: 'crm-companies', 'company profiles': 'crm-companies', 'company intel': 'crm-companies',
  // Talent sub-page aliases
  candidates: 'talent-candidates', 'candidate database': 'talent-candidates', 'candidate list': 'talent-candidates',
  'talent projects': 'talent-projects', 'recruitment projects': 'talent-projects', 'open roles': 'talent-projects',
  'talent campaigns': 'talent-campaigns', 'outreach campaigns': 'talent-campaigns',
  nests: 'talent-nests', 'candidate pools': 'talent-nests', 'talent nests': 'talent-nests', 'nest marketplace': 'talent-nests',
  outreach: 'talent-outreach', 'sms outreach': 'talent-outreach', 'email outreach': 'talent-outreach',
  // Learn sub-page aliases
  courses: 'learn-courses', 'course catalog': 'learn-courses', 'course list': 'learn-courses',
  skills: 'learn-skills', 'skill matrix': 'learn-skills', 'skill tracking': 'learn-skills',
  'course builder': 'learn-builder', 'learning builder': 'learn-builder',
  certifications: 'learn-certifications', certificates: 'learn-certifications',
  // Create sub-page aliases
  branding: 'create-branding', 'brand kit': 'create-branding', 'brand assets': 'create-branding',
  images: 'create-images', 'image generation': 'create-images', 'ai images': 'create-images',
  videos: 'create-videos', 'video generation': 'create-videos', 'ai videos': 'create-videos',
  library: 'create-library', 'asset library': 'create-library', 'content library': 'create-library',
  // Products sub-page aliases
  'digital products': 'products-digital', 'digital': 'products-digital',
  'physical products': 'products-physical', 'physical': 'products-physical',
  shipping: 'products-shipping', 'shipping management': 'products-shipping',
  receiving: 'products-receiving', 'receiving log': 'products-receiving',
  inventory: 'products-inventory', 'inventory management': 'products-inventory', 'stock levels': 'products-inventory',
  // Raise sub-page aliases
  investors: 'raise-investors', 'investor pipeline': 'raise-investors', 'investor database': 'raise-investors',
  'pitch decks': 'raise-pitchdecks', 'pitch deck': 'raise-pitchdecks', pitchdecks: 'raise-pitchdecks',
  'data room': 'raise-dataroom', dataroom: 'raise-dataroom',
  'raise campaigns': 'raise-campaigns', 'investor outreach': 'raise-campaigns',
  // Sentinel sub-page aliases
  'ai systems': 'sentinel-systems', 'system inventory': 'sentinel-systems', 'ai inventory': 'sentinel-systems',
  roadmap: 'sentinel-roadmap', 'compliance roadmap': 'sentinel-roadmap',
  'sentinel documents': 'sentinel-documents', 'compliance documents': 'sentinel-documents', 'document generator': 'sentinel-documents',
  // Sync sub-page aliases
  'sync agent': 'sync-agent', agent: 'sync-agent',
  'sync activity': 'sync-activity', 'activity log': 'sync-activity',
};

function resolvePageKey(raw) {
  const cleaned = raw.replace(/\b(page|module|the|a|an|view|screen|section|tab|environment)\b/gi, '').trim().toLowerCase().replace(/\s+/g, ' ');
  // Exact match first
  if (VALID_PAGE_KEYS.includes(cleaned)) return cleaned;
  // Alias match
  if (PAGE_KEY_ALIASES[cleaned]) return PAGE_KEY_ALIASES[cleaned];
  // Substring match — check if any valid key is contained in the input
  for (const key of VALID_PAGE_KEYS) {
    if (cleaned.includes(key)) return key;
  }
  // Reverse: check if input is contained in any alias
  for (const [alias, key] of Object.entries(PAGE_KEY_ALIASES)) {
    if (cleaned.includes(alias) || alias.includes(cleaned)) return key;
  }
  // Last resort: return raw (will show fallback)
  console.warn(`[DemoExperience] Could not resolve page key: "${raw}" → cleaned: "${cleaned}"`);
  return cleaned;
}

// Default highlight config per page
const PAGE_HIGHLIGHTS = {
  // Main module dashboards
  dashboard: [{ selector: 'stats', tooltip: 'Real-time KPIs across your entire business' }],
  growth: [{ selector: 'pipeline', tooltip: 'AI-powered pipeline with deal intelligence' }],
  crm: [{ selector: 'contacts', tooltip: 'Every contact enriched with AI intelligence' }],
  talent: [{ selector: 'candidates', tooltip: 'Smart matching with flight risk scoring' }],
  finance: [{ selector: 'invoices', tooltip: 'Invoicing, proposals, and expense tracking' }],
  learn: [{ selector: 'courses', tooltip: 'AI-curated learning paths for your team' }],
  create: [{ selector: 'gallery', tooltip: 'AI-powered content creation studio' }],
  products: [{ selector: 'products', tooltip: 'Full product catalog management' }],
  raise: [{ selector: 'investors', tooltip: 'Investor pipeline and data room' }],
  sentinel: [{ selector: 'compliance', tooltip: 'EU AI Act compliance tracking' }],
  inbox: [{ selector: 'conversations', tooltip: 'Unified inbox across all channels' }],
  tasks: [{ selector: 'task-board', tooltip: 'AI-prioritized task management' }],
  integrations: [{ selector: 'integrations', tooltip: '30+ third-party integrations' }],
  // Finance sub-pages
  'finance-invoices': [{ selector: 'invoices-list', tooltip: 'All invoices with status tracking' }],
  'finance-proposals': [{ selector: 'proposals-list', tooltip: 'Create and track proposals' }],
  'finance-expenses': [{ selector: 'expenses-list', tooltip: 'Expense tracking against budget' }],
  'finance-ledger': [{ selector: 'ledger', tooltip: 'Full chart of accounts' }],
  'finance-payables': [{ selector: 'payables-list', tooltip: 'Vendor payment tracking' }],
  'finance-reports': [{ selector: 'reports-grid', tooltip: 'Financial reports and analytics' }],
  // Growth sub-pages
  'growth-pipeline': [{ selector: 'pipeline-board', tooltip: 'Deal pipeline board view' }],
  'growth-campaigns': [{ selector: 'campaigns-list', tooltip: 'Outbound campaign management' }],
  'growth-signals': [{ selector: 'signals-feed', tooltip: 'AI-detected buying signals' }],
  'growth-opportunities': [{ selector: 'opportunities-table', tooltip: 'Opportunity tracking and forecast' }],
  // CRM sub-pages
  'crm-leads': [{ selector: 'leads-table', tooltip: 'Lead scoring and management' }],
  'crm-prospects': [{ selector: 'prospects-grid', tooltip: 'Prospect enrichment pipeline' }],
  'crm-customers': [{ selector: 'customers-table', tooltip: 'Customer health monitoring' }],
  'crm-companies': [{ selector: 'companies-grid', tooltip: 'Company intelligence profiles' }],
  // Talent sub-pages
  'talent-candidates': [{ selector: 'candidates-table', tooltip: 'AI-matched candidate database' }],
  'talent-projects': [{ selector: 'projects-grid', tooltip: 'Recruitment project tracking' }],
  'talent-campaigns': [{ selector: 'talent-campaigns', tooltip: 'Outreach campaign analytics' }],
  'talent-nests': [{ selector: 'nests-marketplace', tooltip: 'Candidate pool marketplace' }],
  'talent-outreach': [{ selector: 'outreach-messages', tooltip: 'Multi-channel outreach tracking' }],
  // Learn sub-pages
  'learn-courses': [{ selector: 'course-catalog', tooltip: 'Browse and enroll in courses' }],
  'learn-skills': [{ selector: 'skills-matrix', tooltip: 'Team skill competency overview' }],
  'learn-builder': [{ selector: 'course-builder', tooltip: 'Create custom training content' }],
  'learn-certifications': [{ selector: 'certifications-grid', tooltip: 'Verified certifications tracking' }],
  // Create sub-pages
  'create-branding': [{ selector: 'brand-kit', tooltip: 'Brand colors, fonts, and guidelines' }],
  'create-images': [{ selector: 'image-generator', tooltip: 'AI image generation with prompts' }],
  'create-videos': [{ selector: 'video-generator', tooltip: 'AI video creation studio' }],
  'create-library': [{ selector: 'asset-library', tooltip: 'All generated assets organized' }],
  // Products sub-pages
  'products-digital': [{ selector: 'digital-products', tooltip: 'SaaS and digital product management' }],
  'products-physical': [{ selector: 'physical-products', tooltip: 'Physical goods and SKU tracking' }],
  'products-shipping': [{ selector: 'shipping-table', tooltip: 'Shipment tracking and carriers' }],
  'products-receiving': [{ selector: 'receiving-log', tooltip: 'Supplier receiving and QC' }],
  'products-inventory': [{ selector: 'inventory-table', tooltip: 'Stock levels and reorder alerts' }],
  // Raise sub-pages
  'raise-investors': [{ selector: 'investor-pipeline', tooltip: 'Investor relationship tracking' }],
  'raise-pitchdecks': [{ selector: 'pitch-decks', tooltip: 'Deck analytics and viewer tracking' }],
  'raise-dataroom': [{ selector: 'data-room', tooltip: 'Encrypted document sharing' }],
  'raise-campaigns': [{ selector: 'raise-campaigns', tooltip: 'Investor outreach campaigns' }],
  // Sentinel sub-pages
  'sentinel-systems': [{ selector: 'ai-systems', tooltip: 'Register and classify AI systems' }],
  'sentinel-roadmap': [{ selector: 'compliance-roadmap', tooltip: 'Regulatory deadline tracking' }],
  'sentinel-documents': [{ selector: 'sentinel-documents', tooltip: 'Generate compliance documentation' }],
  // Sync sub-pages
  'sync-agent': [{ selector: 'sync-agent', tooltip: 'SYNC AI assistant interface' }],
  'sync-activity': [{ selector: 'sync-activity', tooltip: 'SYNC action history and stats' }],
};

export default function DemoExperience() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const orchestrator = useDemoOrchestrator();
  const [demoStarted, setDemoStarted] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const greetingSpoken = useRef(false);
  const stepSpeechRef = useRef(-1);
  const prevStepRef = useRef(-1);

  const autoAdvanceTimer = useRef(null);
  const pendingDiscoveryStartRef = useRef(false);
  const discoveryMessageRef = useRef('');
  const guidedActiveRef = useRef(false);

  // Handle demo actions from voice LLM
  const handleDemoAction = useCallback((action) => {
    const a = action.trim();
    if (a === 'navigate_next') {
      orchestrator.advanceStep();
    } else if (a === 'schedule_call') {
      setShowEndScreen(true);
    } else if (a.startsWith('navigate_to ') || a.startsWith('navigate_to_')) {
      const raw = a.replace(/^navigate_to[_ ]/, '').trim().toLowerCase();
      const pageKey = resolvePageKey(raw);
      orchestrator.goToPage(pageKey);
    } else if (a.startsWith('highlight ')) {
      const selector = a.replace('highlight ', '').trim();
      orchestrator.executeHighlights([{ selector, tooltip: '' }]);
    } else if (a.startsWith('prioritize ')) {
      const modules = a.replace('prioritize ', '').split(',').map(m => m.trim()).filter(Boolean);
      orchestrator.reorderSteps(modules);
      orchestrator.saveDiscoveryContext(discoveryMessageRef.current, modules);
      pendingDiscoveryStartRef.current = true;
    }
  }, [orchestrator]);

  // Auto-advance after scripted dialogue finishes playing — dynamic timing
  const handleDialogueEnd = useCallback(() => {
    // Clear guided walkthrough lock so step speech effect can fire for next step
    guidedActiveRef.current = false;

    // Don't auto-advance if in conversation mode
    if (orchestrator.conversationMode) return;

    // Don't auto-advance on wait_for_user steps (sync-showcase, closing)
    const step = orchestrator.currentStep;
    if (step?.wait_for_user) return;

    // Priority modules: enter conversation mode so the prospect can explore and ask questions
    // SYNC already ended its walkthrough with "want me to dig deeper or move on?"
    if (step && orchestrator.isPriorityModule(step.page_key)) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = setTimeout(() => {
        if (!orchestrator.conversationMode) {
          orchestrator.enterConversationMode();
        }
      }, 1500);
      return;
    }

    // Clear any pending timer
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);

    // Dynamic pause based on dialogue length
    const dialogue = orchestrator.currentDialogue || '';
    const wordCount = dialogue.split(/\s+/).length;
    let pauseMs = 4000; // default medium
    if (wordCount < 15) pauseMs = 3000;      // short messages
    else if (wordCount > 50) pauseMs = 6000;  // long messages

    autoAdvanceTimer.current = setTimeout(() => {
      if (!orchestrator.conversationMode) {
        orchestrator.advanceStep();
      }
    }, pauseMs);
  }, [orchestrator]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  // When user speaks, enter conversation mode and cancel auto-advance
  const handleUserSpoke = useCallback((text) => {
    // Capture what the user said during discovery for context
    if (orchestrator.discoveryPhase && text) {
      discoveryMessageRef.current = text;
    }
    if (!orchestrator.conversationMode) {
      orchestrator.enterConversationMode();
    }
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, [orchestrator]);

  // Sidebar click navigation — enter conversation mode and navigate
  const handleSidebarNavigate = useCallback((pageKey) => {
    if (pageKey === orchestrator.currentPage) return;
    if (!orchestrator.conversationMode) {
      orchestrator.enterConversationMode();
    }
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    orchestrator.goToPage(pageKey);
  }, [orchestrator]);

  const voice = useDemoVoice({
    demoToken: token,
    onDemoAction: handleDemoAction,
    onDialogueEnd: handleDialogueEnd,
    onUserSpoke: handleUserSpoke,
  });

  // Load demo on mount
  useEffect(() => {
    if (!token) return;
    orchestrator.loadDemo(token);
  }, [token]);

  // Start demo flow after loading
  useEffect(() => {
    if (!orchestrator.isLoaded || demoStarted) return;
    setDemoStarted(true);

    const startDemo = async () => {
      // Activate voice
      await voice.activate();

      // Small delay for UX
      await new Promise(r => setTimeout(r, 800));

      if (orchestrator.discoveryPhase) {
        // Discovery: enter conversation mode first to prevent scripted dialogue
        orchestrator.enterConversationMode();
        // Show dashboard
        orchestrator.goToStep(0);
        // Wait for page to render
        await new Promise(r => setTimeout(r, 1200));
        // Speak discovery greeting
        const name = orchestrator.demoLink?.recipient_name || 'there';
        const company = orchestrator.demoLink?.company_name || 'your company';
        const greeting = `Hey ${name}! Before I walk you through iSyncso, I'd love to know — what's most important for ${company} right now? Are you looking to grow revenue, hire talent, streamline finances, or something else entirely?`;
        voice.speakDialogue(greeting);
      } else {
        // No discovery — start scripted demo directly
        orchestrator.goToStep(0);
      }
    };

    startDemo();
  }, [orchestrator.isLoaded, demoStarted]);

  // Keep step context in sync with current page (for freestyle navigation)
  useEffect(() => {
    if (orchestrator.isTransitioning) return;
    voice.setStepContext({
      title: orchestrator.currentStep?.title || orchestrator.currentPage,
      page_key: orchestrator.currentPage,
      dialogue: orchestrator.conversationMode ? null : orchestrator.currentDialogue,
      discoveryMode: orchestrator.discoveryPhase,
      discoveryContext: orchestrator.discoveryContext,
    });
  }, [orchestrator.currentPage, orchestrator.isTransitioning, orchestrator.discoveryPhase, orchestrator.discoveryContext]);

  // Auto-start scripted demo after discovery response finishes playing
  useEffect(() => {
    if (pendingDiscoveryStartRef.current && voice.voiceState === 'listening') {
      pendingDiscoveryStartRef.current = false;
      orchestrator.finishDiscovery();
      // Brief pause before transitioning to first priority module
      setTimeout(() => {
        orchestrator.startFromStep(1);
      }, 600);
    }
  }, [voice.voiceState]);

  // Speak dialogue when step changes (and page has rendered)
  useEffect(() => {
    if (orchestrator.currentStepIndex < 0) return;
    if (stepSpeechRef.current === orchestrator.currentStepIndex) return;
    if (orchestrator.isTransitioning) return;
    if (orchestrator.conversationMode) return;
    if (orchestrator.discoveryPhase) return;
    if (guidedActiveRef.current) return; // Don't interrupt an active guided walkthrough

    stepSpeechRef.current = orchestrator.currentStepIndex;
    const step = orchestrator.currentStep;
    if (!step) return;

    const timer = setTimeout(() => {
      // Priority modules get LLM-generated tailored walkthroughs
      if (orchestrator.isPriorityModule(step.page_key)) {
        guidedActiveRef.current = true;
        const interests = orchestrator.discoveryContext?.userInterests || '';
        const company = orchestrator.demoLink?.company_name || 'your company';
        const guidedPrompt = `[GUIDED_WALKTHROUGH] You just navigated to the ${step.page_key} page for ${company}. The prospect told you during discovery: "${interests}". Give a tailored walkthrough that directly connects this module to what they care about. Go deep — highlight specific features, give a concrete ${company} scenario, and navigate to the most relevant sub-page.`;
        voice.generateGuidedWalkthrough(guidedPrompt);
      } else {
        voice.speakDialogue(orchestrator.currentDialogue);
      }

      // Pre-cache audio for upcoming non-priority steps
      const upcomingTexts = [];
      for (let i = 1; i <= 2; i++) {
        const futureStep = orchestrator.steps[orchestrator.currentStepIndex + i];
        if (futureStep?.sync_dialogue && !orchestrator.isPriorityModule(futureStep.page_key)) {
          upcomingTexts.push(orchestrator.interpolateDialogue(futureStep.sync_dialogue));
        }
      }
      if (upcomingTexts.length) voice.preCacheAudio(upcomingTexts);

      // Show highlights after speech starts (only for non-priority — priority modules handle their own)
      if (!orchestrator.isPriorityModule(step.page_key)) {
        const pageHighlights = step.highlights?.length
          ? step.highlights
          : PAGE_HIGHLIGHTS[step.page_key] || [];
        if (pageHighlights.length) {
          setTimeout(() => orchestrator.executeHighlights(pageHighlights), 1500);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [orchestrator.currentStepIndex, orchestrator.isTransitioning, orchestrator.conversationMode]);

  // Error state
  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">No Demo Token</h1>
          <p className="text-zinc-400">Please use a valid demo link to access this experience.</p>
        </div>
      </div>
    );
  }

  if (orchestrator.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Demo Unavailable</h1>
          <p className="text-zinc-400">{orchestrator.error}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!orchestrator.isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Preparing your demo...</h1>
          <p className="text-zinc-400">
            {orchestrator.demoLink?.recipient_name
              ? `Welcome, ${orchestrator.demoLink.recipient_name}`
              : 'Setting up your personalized experience'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Completed state
  if (orchestrator.currentPage === 'completed' || showEndScreen) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-lg text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Thanks for exploring iSyncso{orchestrator.demoLink?.recipient_name ? `, ${orchestrator.demoLink.recipient_name}` : ''}!
          </h1>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            We've built iSyncso to be the operating system for modern businesses.
            {orchestrator.demoLink?.company_name ? ` We'd love to show ${orchestrator.demoLink.company_name} how it all works together.` : ''}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://isyncso.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black font-semibold rounded-xl hover:bg-cyan-400 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Schedule a Call
            </a>
            <button
              onClick={() => {
                setShowEndScreen(false);
                orchestrator.goToStep(0);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              <ArrowRight className="w-5 h-5" />
              Replay Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Closing special page
  if (orchestrator.currentPage === 'closing') {
    return (
      <DemoLayout
        currentPage={orchestrator.currentPage}
        onNavigate={handleSidebarNavigate}
        voicePanel={
          <DemoVoicePanel
            voiceState={voice.voiceState}
            transcript={voice.transcript}
            isMuted={voice.isMuted}
            onToggleMute={voice.toggleMute}
            recipientName={orchestrator.demoLink?.recipient_name}
            onTextSubmit={voice.submitText}
            currentPage={orchestrator.currentPage}
            discoveryPhase={orchestrator.discoveryPhase}
          />
        }
      >
        <div className="flex items-center justify-center h-full min-h-[70vh]">
          <div className="text-center max-w-lg">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 border-emerald-500/30 border flex items-center justify-center mx-auto mb-8">
              <Sparkles className={`w-12 h-12 text-emerald-400 ${voice.isSpeaking ? 'animate-pulse' : ''}`} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Ready to Get Started?</h2>
            <p className="text-zinc-400 leading-relaxed">
              {`That was a quick tour of iSyncso for ${orchestrator.demoLink?.company_name || 'your team'}. Speak or type to ask any final questions.`}
            </p>
          </div>
        </div>

        <DemoOverlay highlights={orchestrator.highlights} />
        <DemoControls
          currentStep={orchestrator.currentStepIndex}
          totalSteps={orchestrator.steps.length}
          onNext={() => orchestrator.advanceStep()}
          onAskQuestion={() => orchestrator.enterConversationMode()}
          onEndDemo={() => orchestrator.completeDemo()}
          conversationMode={orchestrator.conversationMode}
          canGoBack={!!orchestrator.previousPage}
          onBack={() => orchestrator.goBack()}
          onResumeScript={() => {
            const nextIndex = orchestrator.resumeScript();
            if (nextIndex >= 0) {
              orchestrator.goToStep(nextIndex);
            } else {
              orchestrator.advanceStep();
            }
          }}
        />
      </DemoLayout>
    );
  }

  // Main demo view — render mock page
  const PageComponent = PAGE_COMPONENTS[orchestrator.currentPage];

  return (
    <DemoLayout
      currentPage={orchestrator.currentPage}
      onNavigate={handleSidebarNavigate}
      voicePanel={
        <DemoVoicePanel
          voiceState={voice.voiceState}
          transcript={voice.transcript}
          isMuted={voice.isMuted}
          onToggleMute={voice.toggleMute}
          recipientName={orchestrator.demoLink?.recipient_name}
          onTextSubmit={voice.submitText}
          currentPage={orchestrator.currentPage}
          discoveryPhase={orchestrator.discoveryPhase}
        />
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={orchestrator.currentPage}
          initial={{ opacity: 0, x: orchestrator.currentStepIndex >= prevStepRef.current ? 24 : -24, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: orchestrator.currentStepIndex >= prevStepRef.current ? -24 : 24, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          onAnimationComplete={() => { prevStepRef.current = orchestrator.currentStepIndex; }}
        >
          {PageComponent ? (
            <PageComponent
              companyName={orchestrator.demoLink?.company_name || 'Acme Corp'}
              recipientName={orchestrator.demoLink?.recipient_name || 'there'}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-zinc-500">Loading page...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <DemoOverlay highlights={orchestrator.highlights} />
      <DemoControls
        currentStep={orchestrator.currentStepIndex}
        totalSteps={orchestrator.steps.length}
        onNext={() => orchestrator.advanceStep()}
        onAskQuestion={() => orchestrator.enterConversationMode()}
        onEndDemo={() => orchestrator.completeDemo()}
        conversationMode={orchestrator.conversationMode}
        canGoBack={!!orchestrator.previousPage}
        onBack={() => orchestrator.goBack()}
        onResumeScript={() => {
            const nextIndex = orchestrator.resumeScript();
            if (nextIndex >= 0) {
              orchestrator.goToStep(nextIndex);
            } else {
              orchestrator.advanceStep();
            }
          }}
      />
    </DemoLayout>
  );
}

/**
 * DemoExperience — Public demo entry point (no auth required)
 *
 * Parses token from URL, loads demo data, orchestrates the full
 * voice-guided demo experience with mock pages and Sync narration.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, AlertCircle, CheckCircle, Calendar, ArrowRight } from 'lucide-react';

import DemoLayout from '@/components/demo/DemoLayout';
import DemoOverlay from '@/components/demo/DemoOverlay';
import DemoControls from '@/components/demo/DemoControls';
import DemoVoicePanel from '@/components/demo/DemoVoicePanel';

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

import useDemoOrchestrator from '@/hooks/useDemoOrchestrator';
import useDemoVoice from '@/hooks/useDemoVoice';

// Map page keys to mock page components
const PAGE_COMPONENTS = {
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
};

// Resolve fuzzy page keys from LLM output to exact PAGE_COMPONENTS keys
// The 8B model often adds extra words like "growth page", "the finance module", etc.
const VALID_PAGE_KEYS = Object.keys(PAGE_COMPONENTS);
const PAGE_KEY_ALIASES = {
  // Common LLM variations
  'growth pipeline': 'growth', pipeline: 'growth', sales: 'growth', deals: 'growth',
  'crm contacts': 'crm', contacts: 'crm', 'contact management': 'crm',
  'talent acquisition': 'talent', recruiting: 'talent', candidates: 'talent', talent_acquisition: 'talent',
  'finance hub': 'finance', invoices: 'finance', billing: 'finance', accounting: 'finance',
  'learning academy': 'learn', learning: 'learn', courses: 'learn', training: 'learn',
  'content studio': 'create', 'ai content': 'create', 'create studio': 'create', content: 'create',
  'product catalog': 'products', product: 'products', catalog: 'products', inventory: 'products',
  fundraising: 'raise', investors: 'raise', 'fundraise': 'raise',
  'ai compliance': 'sentinel', compliance: 'sentinel',
  'unified inbox': 'inbox', messages: 'inbox', messaging: 'inbox',
  'task management': 'tasks', task: 'tasks',
  'integration': 'integrations', apps: 'integrations',
  'sync showcase': 'sync-showcase', 'meet sync': 'sync-showcase',
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
};

export default function DemoExperience() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const orchestrator = useDemoOrchestrator();
  const [demoStarted, setDemoStarted] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const greetingSpoken = useRef(false);
  const stepSpeechRef = useRef(-1);

  const autoAdvanceTimer = useRef(null);

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
    }
  }, [orchestrator]);

  // Auto-advance after scripted dialogue finishes playing
  const handleDialogueEnd = useCallback(() => {
    // Don't auto-advance if in conversation mode
    if (orchestrator.conversationMode) return;

    // Don't auto-advance on wait_for_user steps (sync-showcase, closing)
    const step = orchestrator.currentStep;
    if (step?.wait_for_user) return;

    // Clear any pending timer
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);

    // Wait 5s after speech ends so prospect can absorb the visuals
    autoAdvanceTimer.current = setTimeout(() => {
      if (!orchestrator.conversationMode) {
        orchestrator.advanceStep();
      }
    }, 5000);
  }, [orchestrator]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  // When user speaks, enter conversation mode and cancel auto-advance
  const handleUserSpoke = useCallback(() => {
    if (!orchestrator.conversationMode) {
      orchestrator.enterConversationMode();
    }
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
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

      // Go to first step
      orchestrator.goToStep(0);
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
    });
  }, [orchestrator.currentPage, orchestrator.isTransitioning]);

  // Speak dialogue when step changes (and page has rendered)
  useEffect(() => {
    if (orchestrator.currentStepIndex < 0) return;
    if (stepSpeechRef.current === orchestrator.currentStepIndex) return;
    if (orchestrator.isTransitioning) return;
    if (orchestrator.conversationMode) return;

    stepSpeechRef.current = orchestrator.currentStepIndex;
    const step = orchestrator.currentStep;
    if (!step) return;

    const timer = setTimeout(() => {
      voice.speakDialogue(orchestrator.currentDialogue);

      // Show highlights after speech starts
      const pageHighlights = step.highlights?.length
        ? step.highlights
        : PAGE_HIGHLIGHTS[step.page_key] || [];
      if (pageHighlights.length) {
        setTimeout(() => orchestrator.executeHighlights(pageHighlights), 1500);
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
        voicePanel={
          <DemoVoicePanel
            voiceState={voice.voiceState}
            transcript={voice.transcript}
            isMuted={voice.isMuted}
            onToggleMute={voice.toggleMute}
            recipientName={orchestrator.demoLink?.recipient_name}
            onTextSubmit={voice.submitText}
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
          onResumeScript={() => {
            orchestrator.resumeScript();
            orchestrator.advanceStep();
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
      voicePanel={
        <DemoVoicePanel
          voiceState={voice.voiceState}
          transcript={voice.transcript}
          isMuted={voice.isMuted}
          onToggleMute={voice.toggleMute}
          recipientName={orchestrator.demoLink?.recipient_name}
          onTextSubmit={voice.submitText}
        />
      }
    >
      <div
        className="transition-opacity duration-300"
        style={{ opacity: orchestrator.isTransitioning ? 0 : 1 }}
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
      </div>

      <DemoOverlay highlights={orchestrator.highlights} />
      <DemoControls
        currentStep={orchestrator.currentStepIndex}
        totalSteps={orchestrator.steps.length}
        onNext={() => orchestrator.advanceStep()}
        onAskQuestion={() => orchestrator.enterConversationMode()}
        onEndDemo={() => orchestrator.completeDemo()}
        conversationMode={orchestrator.conversationMode}
        onResumeScript={() => {
          orchestrator.resumeScript();
          orchestrator.advanceStep();
        }}
      />
    </DemoLayout>
  );
}

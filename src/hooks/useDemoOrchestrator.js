import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function useDemoOrchestrator() {
  const [demoLink, setDemoLink] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [currentPage, setCurrentPage] = useState('loading');
  const [highlights, setHighlights] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);
  const [discoveryPhase, setDiscoveryPhase] = useState(true);
  const [discoveryContext, setDiscoveryContextState] = useState(null);
  const visitedPagesRef = useRef(new Set());

  const startTimeRef = useRef(null);
  const stepStartRef = useRef(null);

  // Load demo data from database by token
  const loadDemo = useCallback(async (token) => {
    try {
      // Fetch demo link
      const { data: link, error: linkError } = await supabase
        .from('demo_links')
        .select('*')
        .eq('token', token)
        .single();

      if (linkError || !link) {
        setError('Demo not found or has expired.');
        return null;
      }

      // Check expiry
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        await supabase.from('demo_links').update({ status: 'expired' }).eq('id', link.id);
        setError('This demo link has expired.');
        return null;
      }

      // Fetch steps with 1 retry
      let scriptSteps = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error: stepsError } = await supabase
          .from('demo_script_steps')
          .select('*')
          .eq('demo_link_id', link.id)
          .order('step_order', { ascending: true });

        if (!stepsError && data?.length) {
          scriptSteps = data;
          break;
        }

        if (attempt === 0) {
          console.warn('[DemoOrchestrator] Steps fetch failed, retrying in 2s...');
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.error('[DemoOrchestrator] Steps fetch failed after retry');
          setError('Failed to load demo steps. Please refresh the page.');
          return null;
        }
      }

      // Mark as viewed if first time
      if (link.status === 'created') {
        await supabase
          .from('demo_links')
          .update({ status: 'viewed', first_viewed_at: new Date().toISOString() })
          .eq('id', link.id);
        link.status = 'viewed';
        link.first_viewed_at = new Date().toISOString();
      }

      setDemoLink(link);
      setSteps(scriptSteps || []);
      setIsLoaded(true);
      startTimeRef.current = Date.now();

      return link;
    } catch (e) {
      console.error('[DemoOrchestrator] Load error:', e);
      setError('Failed to load demo.');
      return null;
    }
  }, []);

  // Interpolate template variables in dialogue
  const interpolateDialogue = useCallback((text) => {
    if (!text || !demoLink) return text;
    return text
      .replace(/\{recipientName\}/g, demoLink.recipient_name)
      .replace(/\{companyName\}/g, demoLink.company_name);
  }, [demoLink]);

  const transitioningRef = useRef(false);
  const transitionTimeoutRef = useRef(null);

  // Go to a specific step
  const goToStep = useCallback(async (index) => {
    if (index < 0 || index >= steps.length) return;

    // Guard: reject concurrent transitions (prevents double-click issues)
    if (transitioningRef.current) return;
    transitioningRef.current = true;

    const step = steps[index];

    // Page transition animation
    setIsTransitioning(true);
    setHighlights([]);

    // Track previous page for back button
    setPreviousPage(currentPage !== 'loading' ? currentPage : null);

    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Small delay for fade out
    await new Promise(r => setTimeout(r, 300));

    // Switch page and mark as visited
    setCurrentPage(step.page_key);
    setCurrentStepIndex(index);
    visitedPagesRef.current.add(step.page_key);
    stepStartRef.current = Date.now();

    // Fade in
    await new Promise(r => setTimeout(r, 100));
    setIsTransitioning(false);
    transitioningRef.current = false;

    // Update status to in_progress
    if (demoLink && demoLink.status !== 'in_progress' && demoLink.status !== 'completed') {
      supabase
        .from('demo_links')
        .update({ status: 'in_progress' })
        .eq('id', demoLink.id)
        .then(() => {});
    }

    // Track page visit
    if (demoLink) {
      supabase
        .from('demo_links')
        .update({
          pages_visited: [...new Set([...(demoLink.pages_visited || []), step.page_key])],
        })
        .eq('id', demoLink.id)
        .then(() => {});
    }

    return step;
  }, [steps, demoLink]);

  // Jump to a specific page by key (for freestyle navigation)
  const goToPage = useCallback((pageKey) => {
    // Guard: reject concurrent transitions
    if (transitioningRef.current) return;

    // Find the first step that matches this page_key
    const stepIndex = steps.findIndex(s => s.page_key === pageKey);
    if (stepIndex >= 0) {
      goToStep(stepIndex);
    } else {
      // Page exists but no scripted step — just switch the page directly
      transitioningRef.current = true;
      setPreviousPage(currentPage !== 'loading' ? currentPage : null);
      setIsTransitioning(true);
      setHighlights([]);
      setTimeout(() => {
        setCurrentPage(pageKey);
        visitedPagesRef.current.add(pageKey);
        setTimeout(() => {
          setIsTransitioning(false);
          transitioningRef.current = false;
        }, 100);
      }, 300);
    }
  }, [steps, goToStep]);

  // Advance to next step
  const advanceStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      goToStep(nextIndex);
    } else {
      // Demo complete
      completeDemo();
    }
  }, [currentStepIndex, steps, goToStep]);

  // Reorder steps based on priority modules (called after discovery)
  const reorderSteps = useCallback((priorityModuleKeys) => {
    if (!steps.length || !priorityModuleKeys.length) return;

    // Fixed steps that always keep their position
    const dashboardStep = steps.find(s => s.page_key === 'dashboard');
    const syncStep = steps.find(s => s.page_key === 'sync-showcase');
    const closingStep = steps.find(s => s.page_key === 'closing');
    const fixedKeys = new Set(['dashboard', 'closing', 'sync-showcase']);

    // All middle steps (everything except dashboard, sync-showcase, closing)
    const middleSteps = steps.filter(s => !fixedKeys.has(s.page_key));

    // Separate priority and remaining
    const prioritySteps = [];
    const remainingSteps = [];

    priorityModuleKeys.forEach(key => {
      const step = middleSteps.find(s => s.page_key === key);
      if (step) prioritySteps.push(step);
    });

    middleSteps.forEach(step => {
      if (!priorityModuleKeys.includes(step.page_key)) {
        remainingSteps.push(step);
      }
    });

    const reordered = [
      dashboardStep,
      ...prioritySteps,
      ...remainingSteps,
      syncStep,
      closingStep,
    ].filter(Boolean);

    // Re-number step_order
    reordered.forEach((step, i) => { step.step_order = i + 1; });

    setSteps(reordered);
  }, [steps]);

  // Save what the prospect said during discovery + their priority modules
  const saveDiscoveryContext = useCallback((userInterests, priorityModules) => {
    setDiscoveryContextState({ userInterests, priorityModules });
  }, []);

  // Check if a page is one of the prospect's priority modules
  const isPriorityModule = useCallback((pageKey) => {
    return discoveryContext?.priorityModules?.includes(pageKey) || false;
  }, [discoveryContext]);

  // Finish discovery phase and start the scripted demo
  const finishDiscovery = useCallback(() => {
    setDiscoveryPhase(false);
    setConversationMode(false);
  }, []);

  // Start scripted demo from a given step (used after discovery)
  const startFromStep = useCallback((index) => {
    setConversationMode(false);
    setDiscoveryPhase(false);
    goToStep(index);
  }, [goToStep]);

  // Execute highlights for current step (called after speech starts)
  const executeHighlights = useCallback((stepHighlights) => {
    if (!stepHighlights || !stepHighlights.length) return;
    setHighlights(stepHighlights);
  }, []);

  // Clear highlights
  const clearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  // Enter conversation mode (pause script for Q&A)
  const enterConversationMode = useCallback(() => {
    setConversationMode(true);
    setHighlights([]);
  }, []);

  // Resume scripted demo — find first unvisited step
  const resumeScript = useCallback(() => {
    setConversationMode(false);
    // Find next unvisited step
    const nextUnvisited = steps.findIndex(
      (s, i) => i > currentStepIndex && !visitedPagesRef.current.has(s.page_key)
    );
    if (nextUnvisited >= 0) {
      return nextUnvisited;
    }
    // All visited — just advance from current
    return currentStepIndex + 1 < steps.length ? currentStepIndex + 1 : -1;
  }, [steps, currentStepIndex]);

  // Go back to previous page (conversation mode only)
  const goBack = useCallback(() => {
    if (previousPage) goToPage(previousPage);
  }, [previousPage, goToPage]);

  // Complete the demo
  const completeDemo = useCallback(async () => {
    if (!demoLink) return;

    const duration = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    await supabase
      .from('demo_links')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_duration_seconds: duration,
      })
      .eq('id', demoLink.id);

    setCurrentPage('completed');
  }, [demoLink]);

  // Track analytics — update duration periodically
  useEffect(() => {
    if (!demoLink || !startTimeRef.current) return;

    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      supabase
        .from('demo_links')
        .update({ total_duration_seconds: duration })
        .eq('id', demoLink.id)
        .then(() => {});
    }, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [demoLink]);

  // Cleanup transition state on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitioningRef.current = false;
    };
  }, []);

  // Get current step data
  const currentStep = steps[currentStepIndex] || null;
  const currentDialogue = currentStep ? interpolateDialogue(currentStep.sync_dialogue) : '';
  const isLastStep = currentStepIndex >= steps.length - 1;

  return {
    // State
    demoLink,
    steps,
    currentStepIndex,
    currentStep,
    currentPage,
    currentDialogue,
    highlights,
    isTransitioning,
    conversationMode,
    isLoaded,
    isLastStep,
    error,
    previousPage,
    discoveryPhase,
    discoveryContext,
    visitedPages: [...visitedPagesRef.current],

    // Methods
    loadDemo,
    goToStep,
    goToPage,
    goBack,
    advanceStep,
    reorderSteps,
    saveDiscoveryContext,
    isPriorityModule,
    finishDiscovery,
    startFromStep,
    executeHighlights,
    clearHighlights,
    enterConversationMode,
    resumeScript,
    completeDemo,
    interpolateDialogue,
  };
}

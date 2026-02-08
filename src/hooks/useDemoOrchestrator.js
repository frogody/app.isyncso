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

      // Fetch steps
      const { data: scriptSteps } = await supabase
        .from('demo_script_steps')
        .select('*')
        .eq('demo_link_id', link.id)
        .order('step_order', { ascending: true });

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

  // Go to a specific step
  const goToStep = useCallback(async (index) => {
    if (index < 0 || index >= steps.length) return;

    const step = steps[index];

    // Page transition animation
    setIsTransitioning(true);
    setHighlights([]);

    // Track previous page for back button
    setPreviousPage(currentPage !== 'loading' ? currentPage : null);

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
    // Find the first step that matches this page_key
    const stepIndex = steps.findIndex(s => s.page_key === pageKey);
    if (stepIndex >= 0) {
      goToStep(stepIndex);
    } else {
      // Page exists but no scripted step — just switch the page directly
      setPreviousPage(currentPage !== 'loading' ? currentPage : null);
      setIsTransitioning(true);
      setHighlights([]);
      setTimeout(() => {
        setCurrentPage(pageKey);
        visitedPagesRef.current.add(pageKey);
        setTimeout(() => setIsTransitioning(false), 100);
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

    // Methods
    loadDemo,
    goToStep,
    goToPage,
    goBack,
    advanceStep,
    executeHighlights,
    clearHighlights,
    enterConversationMode,
    resumeScript,
    completeDemo,
    interpolateDialogue,
  };
}

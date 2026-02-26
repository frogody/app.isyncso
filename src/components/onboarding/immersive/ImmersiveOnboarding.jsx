import React, { useState, useCallback } from 'react';
import useOnboardingState from './useOnboardingState';
import PageTransition from './PageTransition';
import ProgressDots from './ProgressDots';

// Pages
import WelcomePage from './pages/WelcomePage';
import MeetTheRingPage from './pages/MeetTheRingPage';
import AboutYouPage from './pages/AboutYouPage';
import ToolsAndGoalsPage from './pages/ToolsAndGoalsPage';
import ActivityTrackerPage from './pages/ActivityTrackerPage';
import ContextManagerPage from './pages/ContextManagerPage';
import PersonalizedAgentPage from './pages/PersonalizedAgentPage';
import ChatAssistantPage from './pages/ChatAssistantPage';
import InteractionGuidePage from './pages/InteractionGuidePage';
import ReadyPage from './pages/ReadyPage';

/**
 * ImmersiveOnboarding — 10-page story-driven onboarding experience.
 *
 * @param {Function} onComplete - Called with formData when user clicks "Launch SYNC"
 * @param {boolean} isSubmitting - Whether the enrichment pipeline is running
 */
export default function ImmersiveOnboarding({ onComplete, isSubmitting }) {
  const {
    formData,
    updateFormData,
    isInvitedUser,
    existingCompany,
    initialCheckDone,
  } = useOnboardingState();

  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const goTo = useCallback((page) => {
    setDirection(page > currentPage ? 1 : -1);
    setCurrentPage(page);
  }, [currentPage]);

  const next = useCallback(() => {
    setDirection(1);
    setCurrentPage(p => Math.min(p + 1, 10));
  }, []);

  const back = useCallback(() => {
    setDirection(-1);
    setCurrentPage(p => Math.max(p - 1, 1));
  }, []);

  // Skip intro jumps from pages 1-2 to page 3
  const skipIntro = useCallback(() => {
    setDirection(1);
    setCurrentPage(3);
  }, []);

  // Launch SYNC — hand data back to Onboarding.jsx
  const handleLaunch = useCallback(() => {
    if (onComplete) {
      onComplete(formData);
    }
  }, [onComplete, formData]);

  // Show loading while checking invited status
  if (!initialCheckDone) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 1:
        return <WelcomePage onNext={next} onSkipIntro={skipIntro} />;
      case 2:
        return <MeetTheRingPage onNext={next} onBack={back} onSkipIntro={skipIntro} />;
      case 3:
        return (
          <AboutYouPage
            formData={formData}
            updateFormData={updateFormData}
            isInvitedUser={isInvitedUser}
            onNext={next}
            onBack={back}
          />
        );
      case 4:
        return (
          <ToolsAndGoalsPage
            formData={formData}
            updateFormData={updateFormData}
            onNext={next}
            onBack={back}
          />
        );
      case 5:
        return (
          <ActivityTrackerPage
            formData={formData}
            onNext={next}
            onBack={back}
          />
        );
      case 6:
        return (
          <ContextManagerPage
            formData={formData}
            onNext={next}
            onBack={back}
          />
        );
      case 7:
        return (
          <PersonalizedAgentPage
            formData={formData}
            onNext={next}
            onBack={back}
          />
        );
      case 8:
        return (
          <ChatAssistantPage
            formData={formData}
            onNext={next}
            onBack={back}
          />
        );
      case 9:
        return (
          <InteractionGuidePage
            formData={formData}
            onNext={next}
            onBack={back}
          />
        );
      case 10:
        return (
          <ReadyPage
            formData={formData}
            onLaunch={handleLaunch}
            onBack={back}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Progress dots */}
      <div className="relative z-10">
        <ProgressDots currentPage={currentPage} totalPages={10} />
      </div>

      {/* Page content */}
      <div className="flex-1 relative z-10 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto">
          <PageTransition pageKey={currentPage} direction={direction}>
            {renderPage()}
          </PageTransition>
        </div>
      </div>
    </div>
  );
}

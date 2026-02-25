import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WizardTopBar from './WizardTopBar';
import WizardSidebar from './WizardSidebar';
import WizardNavigation from './WizardNavigation';
import BrandDNAStage from './stages/BrandDNAStage';
import ColorSystemStage from './stages/ColorSystemStage';
import TypographySystemStage from './stages/TypographySystemStage';
import LogoSystemStage from './stages/LogoSystemStage';
import VerbalIdentityStage from './stages/VerbalIdentityStage';
import VisualLanguageStage from './stages/VisualLanguageStage';
import ApplicationsStage from './stages/ApplicationsStage';
import BrandBookStage from './stages/BrandBookStage';

const STAGE_MAP = {
  1: BrandDNAStage,
  2: ColorSystemStage,
  3: TypographySystemStage,
  4: LogoSystemStage,
  5: VerbalIdentityStage,
  6: VisualLanguageStage,
  7: ApplicationsStage,
  8: BrandBookStage,
};

/**
 * Isolated host for stage functions.
 * Each stage uses React hooks internally — wrapping them here with a `key`
 * prop ensures React unmounts/remounts when the stage changes, keeping
 * the hook call order stable (fixes React Error #311).
 */
function StageHost({ stageFn, project, updateStageData, onNext, onNavChange }) {
  const result = stageFn({ project, updateStageData, onNext });
  const resultRef = useRef(result);
  resultRef.current = result;

  // Sync navigation-relevant state to parent.
  // Functions are wrapped in ref-based closures so the parent always
  // invokes the latest version without needing them as effect deps.
  useEffect(() => {
    onNavChange({
      subStep: result.subStep,
      subStepCount: result.subStepCount,
      canProceed: result.canProceed,
      nextLabel: result.nextLabel,
      skipLabel: result.skipLabel,
      goSubNext: (...args) => resultRef.current.goSubNext(...args),
      goSubBack: (...args) => resultRef.current.goSubBack(...args),
      onSkip: result.onSkip ? (...args) => resultRef.current.onSkip?.(...args) : null,
    });
  }, [result.subStep, result.subStepCount, result.canProceed, result.nextLabel, result.skipLabel, onNavChange]);

  return result.content || null;
}

export default function WizardShell({
  project,
  currentStage,
  stages,
  completedStages,
  saveStatus,
  onStageClick,
  onNext,
  onBack,
  onNameChange,
  updateStageData,
}) {
  const [navState, setNavState] = useState(null);

  // Reset nav state when stage changes so stale data doesn't flash
  useEffect(() => {
    setNavState(null);
  }, [currentStage]);

  const handleNavChange = useCallback((state) => {
    setNavState(state);
  }, []);

  const stageFn = STAGE_MAP[currentStage];

  // Determine navigation props from the stage's reported state
  const navProps = navState
    ? {
        currentStage,
        onBack: navState.subStep > 1 ? navState.goSubBack : onBack,
        onNext: navState.goSubNext,
        isLastStage: false,
        nextLabel: navState.nextLabel,
        nextDisabled: !navState.canProceed,
        backDisabled: navState.subStep <= 1 && currentStage <= 1,
        subStep: navState.subStep,
        subStepCount: navState.subStepCount,
        skipLabel: navState.skipLabel,
        onSkip: navState.onSkip,
      }
    : {
        currentStage,
        onBack,
        onNext,
        isLastStage: currentStage === 8,
      };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <WizardTopBar
        projectName={project?.name}
        saveStatus={saveStatus}
        onNameChange={onNameChange}
      />

      <div className="flex flex-1 min-h-0">
        <WizardSidebar
          stages={stages}
          currentStage={currentStage}
          completedStages={completedStages}
          onStageClick={onStageClick}
        />

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="p-8 max-w-4xl mx-auto"
            >
              {stageFn ? (
                <StageHost
                  key={currentStage}
                  stageFn={stageFn}
                  project={project}
                  updateStageData={updateStageData}
                  onNext={onNext}
                  onNavChange={handleNavChange}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <WizardNavigation {...navProps} />
    </div>
  );
}

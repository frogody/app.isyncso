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

const STAGE_PLACEHOLDERS = {};

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
  // Stages return render objects with sub-step navigation
  const stageResult =
    currentStage === 1 ? BrandDNAStage({ project, updateStageData, onNext })
    : currentStage === 2 ? ColorSystemStage({ project, updateStageData, onNext })
    : currentStage === 3 ? TypographySystemStage({ project, updateStageData, onNext })
    : currentStage === 4 ? LogoSystemStage({ project, updateStageData, onNext })
    : currentStage === 5 ? VerbalIdentityStage({ project, updateStageData, onNext })
    : currentStage === 6 ? VisualLanguageStage({ project, updateStageData, onNext })
    : currentStage === 7 ? ApplicationsStage({ project, updateStageData, onNext })
    : currentStage === 8 ? BrandBookStage({ project, updateStageData, onNext })
    : null;

  const placeholder = STAGE_PLACEHOLDERS[currentStage];

  // Determine navigation props
  const navProps = stageResult
    ? {
        currentStage,
        onBack: stageResult.subStep > 1 ? stageResult.goSubBack : onBack,
        onNext: stageResult.goSubNext,
        isLastStage: false,
        nextLabel: stageResult.nextLabel,
        nextDisabled: !stageResult.canProceed,
        backDisabled: stageResult.subStep <= 1 && currentStage <= 1,
        subStep: stageResult.subStep,
        subStepCount: stageResult.subStepCount,
        skipLabel: stageResult.skipLabel,
        onSkip: stageResult.onSkip,
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
              {stageResult ? (
                stageResult.content
              ) : placeholder ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] rounded-[20px] bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-12">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-6">
                    <span className="text-2xl font-bold text-yellow-400">{currentStage}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{placeholder.title}</h2>
                  <p className="text-sm text-zinc-400 text-center max-w-md">{placeholder.description}</p>
                  <div className="mt-8 px-4 py-2 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-xs text-zinc-500">
                    Coming soon
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <WizardNavigation {...navProps} />
    </div>
  );
}

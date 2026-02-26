import { ChevronLeft, ChevronRight, BookOpen, SkipForward } from 'lucide-react';
import SubStepIndicator from './stages/brand-dna/SubStepIndicator';

export default function WizardNavigation({
  currentStage,
  onBack,
  onNext,
  isLastStage,
  nextLabel,
  nextDisabled,
  backDisabled,
  subStep,
  subStepCount,
  skipLabel,
  onSkip,
}) {
  const isBackDisabled = backDisabled ?? currentStage <= 1;
  const isNextDisabled = nextDisabled ?? false;
  const label = nextLabel ?? (isLastStage ? 'Generate Brand Book' : 'Continue');
  const icon = isLastStage ? <BookOpen className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />;

  return (
    <div className="h-16 shrink-0 bg-zinc-900/60 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-6">
      <button
        onClick={onBack}
        disabled={isBackDisabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${isBackDisabled
            ? 'text-zinc-600 cursor-not-allowed'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }
        `}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {subStep && subStepCount && (
        <SubStepIndicator current={subStep} total={subStepCount} />
      )}

      <div className="flex items-center gap-2">
        {skipLabel && onSkip && (
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <SkipForward className="w-4 h-4" />
            {skipLabel}
          </button>
        )}

        <button
          onClick={onNext}
          disabled={isNextDisabled}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]
            ${isNextDisabled
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-yellow-400 text-black hover:bg-yellow-300'
            }
          `}
        >
          {label}
          {!isLastStage && !nextLabel && icon}
        </button>
      </div>
    </div>
  );
}

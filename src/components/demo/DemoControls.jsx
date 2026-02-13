import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, MessageCircle, X, Play } from 'lucide-react';
import { t } from '@/constants/demoTranslations';
export default function DemoControls({
  currentStep = 0,
  totalSteps = 7,
  onNext,
  onAskQuestion,
  onEndDemo,
  conversationMode = false,
  onResumeScript,
  onBack,
  canGoBack = false,
  language = 'en',
}) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const confirmTimer = useRef(null);

  // Auto-reset confirmation after 3s
  useEffect(() => {
    if (confirmEnd) {
      confirmTimer.current = setTimeout(() => setConfirmEnd(false), 3000);
      return () => clearTimeout(confirmTimer.current);
    }
  }, [confirmEnd]);

  const handleEndDemo = () => {
    if (confirmEnd) {
      setConfirmEnd(false);
      onEndDemo();
    } else {
      setConfirmEnd(true);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 z-40 md:ml-[-160px]">
      <div className="flex items-center gap-2 md:gap-3 bg-black/95 backdrop-blur-xl border-t md:border border-white/10 md:rounded-2xl px-3 md:px-5 py-2.5 md:py-3 shadow-2xl justify-center">
        {/* Progress dots — hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-1.5 mr-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${
                i < currentStep ? 'bg-cyan-400' :
                i === currentStep ? 'bg-cyan-400 scale-125' :
                'bg-zinc-600'
              }`}
            />
          ))}
        </div>

        <div className="hidden sm:block w-px h-6 bg-zinc-700" />

        {/* Step indicator */}
        <span className="text-zinc-400 text-xs md:text-sm whitespace-nowrap">
          {t('controls.step', language, { current: currentStep + 1, total: totalSteps })}
        </span>

        <div className="w-px h-6 bg-zinc-700" />

        {/* Back button — only in conversation mode with history */}
        {conversationMode && canGoBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 justify-center"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden md:inline">{t('controls.back', language)}</span>
          </button>
        )}

        {/* Actions */}
        {conversationMode ? (
          <button
            onClick={onResumeScript}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-medium min-h-[44px] md:min-h-0"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">{t('controls.continueDemo', language)}</span>
            <span className="sm:hidden">Continue</span>
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-medium min-h-[44px] md:min-h-0"
          >
            {t('controls.next', language)}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onAskQuestion}
          className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 justify-center"
          title="Ask a question"
        >
          <MessageCircle className="w-4 h-4" />
        </button>

        <button
          onClick={handleEndDemo}
          className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg transition-colors text-sm min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 justify-center ${
            confirmEnd
              ? 'bg-red-500/20 text-red-400'
              : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
          }`}
          title={confirmEnd ? 'Click again to confirm' : 'End demo'}
        >
          <X className="w-4 h-4" />
          {confirmEnd && <span className="hidden md:inline text-xs">Sure?</span>}
        </button>
      </div>
    </div>
  );
}

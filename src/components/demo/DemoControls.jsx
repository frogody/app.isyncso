import React from 'react';
import { ChevronRight, ChevronLeft, MessageCircle, X, Play } from 'lucide-react';

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
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40" style={{ marginLeft: '-160px' }}>
      <div className="flex items-center gap-3 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shadow-2xl">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mr-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i < currentStep ? 'bg-cyan-400' :
                i === currentStep ? 'bg-cyan-400 scale-125' :
                'bg-zinc-600'
              }`}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-zinc-700" />

        {/* Step indicator */}
        <span className="text-zinc-400 text-sm whitespace-nowrap">
          Step {currentStep + 1} of {totalSteps}
        </span>

        <div className="w-px h-6 bg-zinc-700" />

        {/* Back button — only in conversation mode with history */}
        {conversationMode && canGoBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Actions */}
        {conversationMode ? (
          <button
            onClick={onResumeScript}
            className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Continue Demo
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-medium"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onAskQuestion}
          className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm"
          title="Ask a question"
        >
          <MessageCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onEndDemo}
          className="flex items-center gap-2 px-3 py-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
          title="End demo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

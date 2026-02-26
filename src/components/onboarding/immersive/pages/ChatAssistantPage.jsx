import React from 'react';
import ChatBubbleExpand from '../animations/ChatBubbleExpand';

export default function ChatAssistantPage({ formData, onNext, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Animation component */}
      <div className="mb-8">
        <ChatBubbleExpand />
      </div>
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Chat Assistant</h1>
      {/* Subtitle */}
      <p className="text-zinc-400 text-sm sm:text-base max-w-md mb-10">
        Ask anything in natural language — SYNC understands context.
      </p>
      {/* Buttons */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-full transition-colors text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

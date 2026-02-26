import React from 'react';
import RingAssembly from '../animations/RingAssembly';

export default function WelcomePage({ onNext, onSkipIntro }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Animation component */}
      <div className="mb-8">
        <RingAssembly />
      </div>
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Welcome to SYNC</h1>
      {/* Subtitle */}
      <p className="text-zinc-400 text-sm sm:text-base max-w-md mb-10">
        Your AI-powered workspace is about to come alive.
      </p>
      {/* Buttons */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onNext}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-full transition-colors text-sm"
        >
          Begin
        </button>
        {onSkipIntro && (
          <button
            onClick={onSkipIntro}
            className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotFound.jsx -- Standalone 404 page rendered outside the main Layout.
// No sidebar, no navigation -- just a clean branded 404 experience.
// ---------------------------------------------------------------------------

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/[0.04] blur-[120px]" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-md">
        {/* Large 404 number */}
        <div className="text-[140px] leading-none font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-zinc-400 to-zinc-700 select-none">
          404
        </div>

        {/* Message */}
        <h1 className="text-xl font-semibold text-zinc-200 mt-2 mb-2">
          Page not found
        </h1>
        <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700/80 hover:border-zinc-600 transition-all cursor-pointer"
          >
            Go back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 transition-all cursor-pointer"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Branding */}
      <div className="absolute bottom-6 text-xs text-zinc-700">
        iSyncSO
      </div>
    </div>
  );
}

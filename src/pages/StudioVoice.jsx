import React from 'react';
import { StudioNav } from '@/components/studio';
import { AudioLines, Sparkles, Upload, Wand2 } from 'lucide-react';

const FEATURES = [
  { icon: Upload, label: 'Upload Samples', desc: 'Record or upload 30+ seconds of voice to clone' },
  { icon: Wand2, label: 'Instant Clone', desc: 'AI creates a natural-sounding replica of any voice' },
  { icon: AudioLines, label: 'Use Everywhere', desc: 'Apply cloned voices to videos, podcasts & explainers' },
];

export default function StudioVoice() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-8 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>

      <div className="w-full px-4 lg:px-8 py-16 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-xs font-medium text-pink-300">Coming Soon</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-zinc-800/40 flex items-center justify-center mb-6">
          <AudioLines className="w-8 h-8 text-pink-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Voice Clone</h1>
        <p className="text-zinc-500 text-sm max-w-md text-center mb-10">
          Clone your voice or any speaker for use in videos, podcasts, and explainer content.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 text-center">
                <Icon className="w-6 h-6 text-pink-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1">{f.label}</h3>
                <p className="text-xs text-zinc-500">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { StudioNav } from '@/components/studio';
import { Mic, Sparkles, Users, Clock } from 'lucide-react';

const FEATURES = [
  { icon: Users, label: 'Multiple Speakers', desc: 'Create conversations with AI-generated voices' },
  { icon: Mic, label: 'Voice Cloning', desc: 'Use your own voice or clone any speaker' },
  { icon: Clock, label: 'Any Length', desc: 'Generate 1-minute clips to full episodes' },
];

export default function StudioPodcast() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-8 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>

      <div className="w-full px-4 lg:px-8 py-16 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-medium text-orange-300">Coming Soon</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-zinc-800/40 flex items-center justify-center mb-6">
          <Mic className="w-8 h-8 text-orange-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">AI Podcast Studio</h1>
        <p className="text-zinc-500 text-sm max-w-md text-center mb-10">
          Create AI-powered podcasts with multiple speakers, voice clones, and natural conversations about your products.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 text-center">
                <Icon className="w-6 h-6 text-orange-400 mx-auto mb-3" />
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

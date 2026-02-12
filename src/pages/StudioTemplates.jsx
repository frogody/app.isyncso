import React from 'react';
import { StudioNav } from '@/components/studio';
import CreateVideos from './CreateVideos';

export default function StudioTemplates() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-8 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>
      <CreateVideos embedded defaultMode="templates" />
    </div>
  );
}

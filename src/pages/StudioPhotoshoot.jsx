import React from 'react';
import { StudioNav } from '@/components/studio';
import SyncStudioFlow from '@/components/sync-studio/flow/SyncStudioFlow';

export default function StudioPhotoshoot() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="sticky top-0 z-30 bg-[#09090b]">
        <div className="w-full px-4 lg:px-8 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>
      <SyncStudioFlow />
    </div>
  );
}

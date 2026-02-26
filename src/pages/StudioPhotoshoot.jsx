import React from 'react';
import SyncStudioFlow from '@/components/sync-studio/flow/SyncStudioFlow';
import { useTheme } from '@/contexts/GlobalThemeContext';

export default function StudioPhotoshoot() {
  const { ct } = useTheme();
  return (
    <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')}`}>
      <SyncStudioFlow />
    </div>
  );
}

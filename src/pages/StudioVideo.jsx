import React from 'react';
import CreateVideos from './CreateVideos';
import { useTheme } from '@/contexts/GlobalThemeContext';

export default function StudioVideo() {
  const { ct } = useTheme();
  return (
    <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')}`}>
      <CreateVideos embedded />
    </div>
  );
}

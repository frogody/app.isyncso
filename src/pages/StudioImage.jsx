import React from 'react';
import CreateImages from './CreateImages';
import { useTheme } from '@/contexts/GlobalThemeContext';

export default function StudioImage() {
  const { ct } = useTheme();
  return (
    <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')}`}>
      <CreateImages embedded />
    </div>
  );
}

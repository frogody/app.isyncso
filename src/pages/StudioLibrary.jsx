import React from 'react';
import CreateLibrary from './CreateLibrary';
import { useTheme } from '@/contexts/GlobalThemeContext';

export default function StudioLibrary() {
  const { ct } = useTheme();
  return (
    <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')}`}>
      <CreateLibrary embedded />
    </div>
  );
}

import React from 'react';
import FashionBooth from './FashionBooth';
import { useTheme } from '@/contexts/GlobalThemeContext';

export default function StudioFashionBooth() {
  const { ct } = useTheme();
  return (
    <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')}`}>
      <FashionBooth embedded />
    </div>
  );
}

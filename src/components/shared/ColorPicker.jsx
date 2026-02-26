import React from 'react';
import { Check } from 'lucide-react';
import { PRESET_COLORS } from '@/hooks/useTeamMembers';

export default function ColorPicker({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-6 gap-3">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-white/30"
          style={{ backgroundColor: color }}
        >
          {selected === color && (
            <Check className="w-4 h-4 text-white drop-shadow-md" />
          )}
        </button>
      ))}
    </div>
  );
}

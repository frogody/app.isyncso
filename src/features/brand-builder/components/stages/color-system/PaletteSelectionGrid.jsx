/**
 * Sub-step 1: Grid of 6 palette cards + optional custom primary hex input.
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Palette } from 'lucide-react';
import PaletteCard from './PaletteCard';

const HEX_REGEX = /^#?([0-9A-Fa-f]{6})$/;

export default function PaletteSelectionGrid({ variants, selectedIndex, onSelect, onCustomPrimary }) {
  const [customHex, setCustomHex] = useState('');
  const [hexError, setHexError] = useState(false);

  const handleCustomSubmit = () => {
    const match = customHex.trim().match(HEX_REGEX);
    if (!match) {
      setHexError(true);
      return;
    }
    setHexError(false);
    onCustomPrimary(`#${match[1]}`);
    setCustomHex('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Choose Your Palette</h2>
        <p className="text-sm text-zinc-400">
          We generated 6 palettes from your brand DNA. Select the one that feels right — you can fine-tune it next.
        </p>
      </div>

      {/* 2×3 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {variants.map((v, i) => (
          <PaletteCard
            key={i}
            variant={v}
            selected={selectedIndex === i}
            onSelect={() => onSelect(i)}
          />
        ))}
      </div>

      {/* Custom primary */}
      <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">Have a specific color in mind?</h3>
        </div>
        <div className="flex gap-2">
          <Input
            value={customHex}
            onChange={(e) => { setCustomHex(e.target.value); setHexError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            placeholder="#FF6B35"
            maxLength={7}
            className={`bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl text-sm font-mono max-w-[140px] ${
              hexError ? 'border-red-500/60' : ''
            }`}
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Generate
          </button>
        </div>
        {hexError && <p className="text-xs text-red-400">Enter a valid 6-digit hex color (e.g. #FF6B35)</p>}
      </div>
    </div>
  );
}

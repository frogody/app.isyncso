/**
 * Editable color swatch: circle + hex input + expandable HSL sliders.
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { hexToHsl, hslToHex } from '../../../lib/color-engine/color-utils.js';

const HEX_RE = /^#?([0-9A-Fa-f]{6})$/;

export default function ColorSwatch({ color, label, originalColor, onChange, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const [hexInput, setHexInput] = useState(color);

  const hsl = hexToHsl(color);

  const commitHex = (val) => {
    const m = val.trim().match(HEX_RE);
    if (m) {
      const hex = `#${m[1]}`;
      onChange(hex);
      setHexInput(hex);
    } else {
      setHexInput(color); // revert
    }
  };

  const handleHSL = (prop, value) => {
    const next = { ...hsl, [prop]: value };
    const hex = hslToHex(next.h, next.s, next.l);
    onChange(hex);
    setHexInput(hex);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Color circle — click to expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-10 h-10 rounded-full border-2 border-white/10 shrink-0 transition-shadow hover:shadow-lg"
          style={{ background: color }}
          title="Click for HSL sliders"
        />

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">{label}</span>
            {originalColor && color !== originalColor && (
              <button
                type="button"
                onClick={() => {
                  onReset?.();
                  setHexInput(originalColor);
                }}
                className="text-[10px] text-zinc-600 hover:text-yellow-400 flex items-center gap-0.5 transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={(e) => commitHex(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitHex(e.target.value)}
              maxLength={7}
              className="bg-zinc-800/50 border-zinc-700/60 text-white font-mono text-xs rounded-lg h-7 w-[85px] px-2"
            />
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* HSL Sliders */}
      {expanded && (
        <div className="pl-[52px] space-y-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-zinc-600">Hue</span>
              <span className="text-[10px] text-zinc-500 font-mono">{hsl.h}°</span>
            </div>
            <Slider
              value={[hsl.h]}
              onValueChange={([v]) => handleHSL('h', v)}
              min={0} max={360} step={1}
              className="[&_[data-radix-slider-track]]:bg-gradient-to-r [&_[data-radix-slider-track]]:from-red-500 [&_[data-radix-slider-track]]:via-green-500 [&_[data-radix-slider-track]]:to-blue-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-zinc-600">Saturation</span>
              <span className="text-[10px] text-zinc-500 font-mono">{hsl.s}%</span>
            </div>
            <Slider
              value={[hsl.s]}
              onValueChange={([v]) => handleHSL('s', v)}
              min={0} max={100} step={1}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-zinc-600">Lightness</span>
              <span className="text-[10px] text-zinc-500 font-mono">{hsl.l}%</span>
            </div>
            <Slider
              value={[hsl.l]}
              onValueChange={([v]) => handleHSL('l', v)}
              min={5} max={95} step={1}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 3-column CVD simulation: Protanopia, Deuteranopia, Tritanopia.
 * Shows 5 brand colors under each deficiency type.
 */
import { useMemo } from 'react';
import { simulateCVD } from '../../../lib/color-engine/index.js';
import { AlertTriangle } from 'lucide-react';

const CVD_TYPES = [
  { type: 'protanopia', label: 'Protanopia', description: 'Red-blind' },
  { type: 'deuteranopia', label: 'Deuteranopia', description: 'Green-blind' },
  { type: 'tritanopia', label: 'Tritanopia', description: 'Blue-blind' },
];

export default function ColorBlindPreview({ palette, cvdResults }) {
  const brandColors = useMemo(() => [
    { label: 'Primary', hex: palette.primary?.base },
    { label: 'Secondary', hex: palette.secondary?.base },
    { label: 'Accent', hex: palette.accent?.base },
    { label: 'Dark', hex: palette.neutrals?.near_black },
    { label: 'Light', hex: palette.neutrals?.light_gray },
  ].filter(c => c.hex), [palette]);

  const simulations = useMemo(() =>
    CVD_TYPES.map(cvd => ({
      ...cvd,
      colors: brandColors.map(c => ({
        ...c,
        simulated: simulateCVD(c.hex, cvd.type),
      })),
    })),
    [brandColors]
  );

  const hasFlaggedPairs = cvdResults?.flaggedPairs?.length > 0;

  return (
    <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Color Blind Preview</h3>
        {hasFlaggedPairs && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            {cvdResults.flaggedPairs.length} pair{cvdResults.flaggedPairs.length > 1 ? 's' : ''} hard to distinguish
          </span>
        )}
        {cvdResults?.safe && (
          <span className="text-[10px] text-green-400">All pairs distinguishable ✓</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {simulations.map(sim => (
          <div key={sim.type} className="space-y-2">
            <div>
              <p className="text-xs font-medium text-zinc-300">{sim.label}</p>
              <p className="text-[10px] text-zinc-600">{sim.description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sim.colors.map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border border-white/10"
                  style={{ background: c.simulated }}
                  title={`${c.label}: ${c.hex} → ${c.simulated}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Real-time WCAG contrast panel for key color pairs.
 */
import { useMemo } from 'react';
import { checkContrastPair } from '../../../lib/color-engine/index.js';
import AccessibilityBadge from './AccessibilityBadge';

const KEY_PAIRS = [
  { fg: 'near_black', bg: 'white', label: 'Text on White' },
  { fg: 'white', bg: 'primary', label: 'White on Primary' },
  { fg: 'white', bg: 'accent', label: 'White on Accent' },
  { fg: 'near_black', bg: 'light_gray', label: 'Text on Light Gray' },
  { fg: 'primary', bg: 'white', label: 'Primary on White' },
  { fg: 'accent', bg: 'white', label: 'Accent on White' },
];

export default function ContrastChecker({ palette }) {
  const colors = useMemo(() => ({
    primary:    palette.primary?.base || '#000',
    secondary:  palette.secondary?.base || '#666',
    accent:     palette.accent?.base || '#f00',
    near_black: palette.neutrals?.near_black || '#111',
    white:      palette.neutrals?.white || '#fff',
    light_gray: palette.neutrals?.light_gray || '#f5f5f5',
  }), [palette]);

  const results = useMemo(() =>
    KEY_PAIRS.map(pair => ({
      ...pair,
      fgHex: colors[pair.fg],
      bgHex: colors[pair.bg],
      check: checkContrastPair(colors[pair.fg], colors[pair.bg]),
    })),
    [colors]
  );

  return (
    <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">Contrast Checker</h3>
      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            {/* Fg swatch */}
            <div className="w-5 h-5 rounded-full border border-white/10 shrink-0" style={{ background: r.fgHex }} />
            {/* Bg swatch */}
            <div className="w-5 h-5 rounded-full border border-white/10 shrink-0" style={{ background: r.bgHex }} />
            {/* Label */}
            <span className="text-xs text-zinc-400 flex-1 min-w-0">{r.label}</span>
            {/* Ratio */}
            <span className="text-xs font-mono text-zinc-500 w-10 text-right">{r.check.ratio}:1</span>
            {/* Badges */}
            <AccessibilityBadge level="aa" passing={r.check.aa} />
            <AccessibilityBadge level="aaa" passing={r.check.aaa} />
          </div>
        ))}
      </div>
    </div>
  );
}

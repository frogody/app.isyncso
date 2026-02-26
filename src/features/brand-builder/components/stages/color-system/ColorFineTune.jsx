/**
 * Sub-step 2: Fine-tune selected palette.
 * Editable primary/secondary/accent + live mockup + contrast checker + CVD preview.
 */
import { useState, useMemo, useCallback } from 'react';
import ColorSwatch from './ColorSwatch';
import MiniMockup from './MiniMockup';
import ContrastChecker from './ContrastChecker';
import ColorBlindPreview from './ColorBlindPreview';
import { checkCVDSafety, checkCompetitorDiff, generateColorRamp, generateNeutralRamp, generateSemanticColors, generateDarkMode } from '../../../lib/color-engine/index.js';
import { Moon, Sun, AlertTriangle } from 'lucide-react';

export default function ColorFineTune({ colorSystem, onChange, competitors = [], originalPalette }) {
  const [darkPreview, setDarkPreview] = useState(false);
  const palette = colorSystem?.palette;
  if (!palette) return null;

  // CVD check
  const cvdResults = useMemo(() => checkCVDSafety({
    primary: palette.primary.base,
    secondary: palette.secondary.base,
    accent: palette.accent.base,
  }), [palette.primary.base, palette.secondary.base, palette.accent.base]);

  // Competitor check
  const competitorFlags = useMemo(
    () => checkCompetitorDiff(palette.primary.base, competitors),
    [palette.primary.base, competitors]
  );

  // When a color changes, rebuild that color's ramp + neutrals + dark mode
  const handleColorChange = useCallback((role, newHex) => {
    const newPalette = { ...palette };

    const ramp = generateColorRamp(newHex);
    newPalette[role] = { base: newHex, light: ramp[200], dark: ramp[800], ramp };

    // Rebuild neutrals from primary
    if (role === 'primary') {
      newPalette.neutrals = generateNeutralRamp(newHex);
      newPalette.semantic = generateSemanticColors(newHex);
    }

    // Rebuild dark mode
    newPalette.dark_mode = generateDarkMode(newPalette);

    // Rebuild gradients
    newPalette.extended = {
      gradients: [
        {
          name: 'Primary to Secondary',
          from: newPalette.primary.base,
          to: newPalette.secondary.base,
          angle: 135,
          css: `linear-gradient(135deg, ${newPalette.primary.base}, ${newPalette.secondary.base})`,
        },
        {
          name: 'Primary to Accent',
          from: newPalette.primary.base,
          to: newPalette.accent.base,
          angle: 135,
          css: `linear-gradient(135deg, ${newPalette.primary.base}, ${newPalette.accent.base})`,
        },
      ],
    };

    onChange({ ...colorSystem, palette: newPalette });
  }, [palette, colorSystem, onChange]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Fine-Tune Your Colors</h2>
        <p className="text-sm text-zinc-400">
          Adjust primary, secondary, and accent colors. Everything updates live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: swatches */}
        <div className="lg:col-span-3 space-y-5">
          <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">Brand Colors</h3>
            <ColorSwatch
              label="Primary"
              color={palette.primary.base}
              originalColor={originalPalette?.primary?.base}
              onChange={(hex) => handleColorChange('primary', hex)}
              onReset={() => originalPalette?.primary?.base && handleColorChange('primary', originalPalette.primary.base)}
            />
            <ColorSwatch
              label="Secondary"
              color={palette.secondary.base}
              originalColor={originalPalette?.secondary?.base}
              onChange={(hex) => handleColorChange('secondary', hex)}
              onReset={() => originalPalette?.secondary?.base && handleColorChange('secondary', originalPalette.secondary.base)}
            />
            <ColorSwatch
              label="Accent"
              color={palette.accent.base}
              originalColor={originalPalette?.accent?.base}
              onChange={(hex) => handleColorChange('accent', hex)}
              onReset={() => originalPalette?.accent?.base && handleColorChange('accent', originalPalette.accent.base)}
            />
          </div>

          {/* Read-only neutrals */}
          <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-2">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Neutrals (auto-derived)</h3>
            <div className="flex gap-1.5">
              {[palette.neutrals.white, palette.neutrals.light_gray, palette.neutrals.mid_gray, palette.neutrals.dark_gray, palette.neutrals.near_black].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-lg border border-white/10" style={{ background: c }} title={c} />
              ))}
            </div>
          </div>

          {/* Semantic */}
          <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-2">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Semantic (auto-derived)</h3>
            <div className="flex gap-3">
              {Object.entries(palette.semantic).map(([name, hex]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: hex }} />
                  <span className="text-[10px] text-zinc-500 capitalize">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Preview</h3>
              <button
                type="button"
                onClick={() => setDarkPreview(!darkPreview)}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-yellow-400 transition-colors"
              >
                {darkPreview ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                {darkPreview ? 'Light' : 'Dark'}
              </button>
            </div>
            <MiniMockup palette={darkPreview ? _toDarkMockupPalette(palette) : palette} />
          </div>

          {/* Competitor warnings */}
          {competitorFlags.tooSimilar && (
            <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/20 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Similar to known brands</span>
              </div>
              {competitorFlags.flags.map((f, i) => (
                <div key={i} className="flex items-center gap-2 pl-5">
                  <div className="w-3 h-3 rounded-full" style={{ background: f.color }} />
                  <span className="text-[10px] text-zinc-400">{f.brand}</span>
                  <span className="text-[10px] text-zinc-600">dist: {f.distance}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contrast checker */}
      <ContrastChecker palette={palette} />

      {/* Color blind preview */}
      <ColorBlindPreview palette={palette} cvdResults={cvdResults} />
    </div>
  );
}

/** Convert palette to dark-mode version for the mockup */
function _toDarkMockupPalette(palette) {
  const dm = palette.dark_mode || {};
  return {
    primary: { base: dm.primary || palette.primary.base },
    secondary: { base: dm.secondary || palette.secondary.base },
    accent: palette.accent,
    neutrals: {
      white: dm.text_primary || '#f0f0f0',
      light_gray: dm.surface || '#1e1e1e',
      mid_gray: dm.text_secondary || '#888',
      dark_gray: dm.text_primary || '#eee',
      near_black: dm.background || '#0a0a0a',
    },
  };
}

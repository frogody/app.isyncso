/**
 * Sub-step 3: Fine-tune typography — font swap dropdowns, base size slider, live preview + spec.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { loadGoogleFonts, getAlternativeFonts, buildTypographySystem, getFontByFamily } from '../../../lib/type-engine/index.js';
import TypePreview from './TypePreview';
import TypeSpecTable from './TypeSpecTable';

export default function TypographyFineTune({
  typographySystem,
  onChange,
  personalityVector,
  colorTemperature,
  directionFontSet,
  palette,
  brandName,
}) {
  const [baseSize, setBaseSize] = useState(typographySystem?.base_size || 16);

  // Get current fonts from the system
  const headingFont = useMemo(
    () => getFontByFamily(typographySystem?.primary_font?.family),
    [typographySystem?.primary_font?.family]
  );
  const bodyFont = useMemo(
    () => getFontByFamily(typographySystem?.secondary_font?.family),
    [typographySystem?.secondary_font?.family]
  );

  // Alternative fonts for dropdowns
  const headingAlternatives = useMemo(() => {
    if (!headingFont) return [];
    return getAlternativeFonts(headingFont, 'heading', personalityVector, colorTemperature, directionFontSet);
  }, [headingFont, personalityVector, colorTemperature, directionFontSet]);

  const bodyAlternatives = useMemo(() => {
    if (!bodyFont) return [];
    return getAlternativeFonts(bodyFont, 'body', personalityVector, colorTemperature, directionFontSet);
  }, [bodyFont, personalityVector, colorTemperature, directionFontSet]);

  // Preload alternative fonts
  useEffect(() => {
    const families = new Set();
    for (const f of headingAlternatives) families.add(f.family);
    for (const f of bodyAlternatives) families.add(f.family);
    if (families.size > 0) loadGoogleFonts([...families]);
  }, [headingAlternatives, bodyAlternatives]);

  const density = personalityVector?.[4] || 50;

  // Rebuild system on font or size change
  const rebuild = useCallback((newHeading, newBody, newSize) => {
    const hFont = newHeading || headingFont;
    const bFont = newBody || bodyFont;
    const accentFont = getFontByFamily('JetBrains Mono');
    if (!hFont || !bFont) return;

    const system = buildTypographySystem(hFont, bFont, accentFont, density, newSize);
    onChange(system);
  }, [headingFont, bodyFont, density, onChange]);

  const handleHeadingChange = useCallback((family) => {
    const font = getFontByFamily(family);
    if (font) rebuild(font, null, baseSize);
  }, [rebuild, baseSize]);

  const handleBodyChange = useCallback((family) => {
    const font = getFontByFamily(family);
    if (font) rebuild(null, font, baseSize);
  }, [rebuild, baseSize]);

  const handleBaseSizeChange = useCallback(([val]) => {
    setBaseSize(val);
    rebuild(null, null, val);
  }, [rebuild]);

  if (!typographySystem) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Fine-Tune Typography</h2>
        <p className="text-sm text-zinc-400">
          Swap fonts, adjust base size. Everything updates live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: controls */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-4">
            {/* Heading font select */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Heading Font</label>
              <select
                value={typographySystem.primary_font.family}
                onChange={(e) => handleHeadingChange(e.target.value)}
                className="w-full bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/40"
              >
                {headingFont && (
                  <option value={headingFont.family}>{headingFont.family} (current)</option>
                )}
                {headingAlternatives.map(f => (
                  <option key={f.family} value={f.family}>{f.family}</option>
                ))}
              </select>
            </div>

            {/* Body font select */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Body Font</label>
              <select
                value={typographySystem.secondary_font.family}
                onChange={(e) => handleBodyChange(e.target.value)}
                className="w-full bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/40"
              >
                {bodyFont && (
                  <option value={bodyFont.family}>{bodyFont.family} (current)</option>
                )}
                {bodyAlternatives.map(f => (
                  <option key={f.family} value={f.family}>{f.family}</option>
                ))}
              </select>
            </div>

            {/* Base size slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-400">Base Size</label>
                <span className="text-xs text-zinc-500">{baseSize}px</span>
              </div>
              <Slider
                value={[baseSize]}
                onValueChange={handleBaseSizeChange}
                min={14}
                max={20}
                step={1}
              />
            </div>

            {/* Scale ratio (read-only) */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Scale Ratio</span>
              <span className="text-xs text-zinc-300 font-mono">{typographySystem.scale_ratio}</span>
            </div>
          </div>

          {/* Pairing rationale */}
          <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Pairing Rationale</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{typographySystem.pairing_rationale}</p>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-2">
          <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">Live Preview</h3>
            <TypePreview scale={typographySystem.scale} palette={palette} />
          </div>
        </div>
      </div>

      {/* Spec table */}
      <TypeSpecTable scale={typographySystem.scale} />
    </div>
  );
}

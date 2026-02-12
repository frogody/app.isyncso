import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Sun,
  Aperture,
  Lightbulb,
  Sparkles,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Palette,
  Eye,
  Minus,
  Plus,
  Layers,
  Shuffle,
} from 'lucide-react';
import VibeSelector, { VIBES } from './VibeSelector';

// --- Background presets ---
const BACKGROUNDS = [
  { key: 'auto', label: 'Auto', color: null },
  { key: 'pure_white', label: 'White', color: '#ffffff' },
  { key: 'marble', label: 'Marble', color: '#e8e4df' },
  { key: 'wood', label: 'Wood', color: '#8B6F47' },
  { key: 'concrete', label: 'Concrete', color: '#9CA3AF' },
  { key: 'dark', label: 'Dark', color: '#1c1c1e' },
  { key: 'gradient', label: 'Gradient', color: null },
];

// --- Lighting presets ---
const LIGHTING = [
  { key: 'auto', label: 'Auto' },
  { key: 'natural', label: 'Natural' },
  { key: 'softbox', label: 'Softbox' },
  { key: 'dramatic', label: 'Dramatic' },
  { key: 'ring_light', label: 'Ring Light' },
  { key: 'golden_hour', label: 'Golden Hour' },
];

const LIGHTING_PROMPTS = {
  auto: null,
  natural: 'Soft natural daylight, gentle shadows',
  softbox: 'Even studio softbox lighting, minimal harsh shadows',
  dramatic: 'Dramatic side lighting, deep shadows, high contrast',
  ring_light: 'Even ring light illumination, catch lights in reflections',
  golden_hour: 'Warm golden hour light, long soft shadows, golden tones',
};

// --- Aspect ratios ---
const ASPECT_RATIOS = [
  { key: '1:1', label: '1:1', width: 1024, height: 1024, icon: Square },
  { key: '4:3', label: '4:3', width: 1024, height: 768, icon: RectangleHorizontal },
  { key: '16:9', label: '16:9', width: 1024, height: 576, icon: RectangleHorizontal },
  { key: '3:4', label: '3:4', width: 768, height: 1024, icon: RectangleVertical },
];

// --- Batch size presets ---
const BATCH_SIZES = [1, 2, 3, 4, 5];

// --- Variety / coherence modes ---
const VARIETY_MODES = [
  {
    key: 'consistent',
    label: 'Consistent',
    description: 'All shots share the same style, colors, and mood for a cohesive catalog look',
    prompt_suffix: 'Maintain consistent lighting, color palette, and styling across all shots.',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    description: 'Moderate variation between shots while keeping the product recognizable',
    prompt_suffix: '',
  },
  {
    key: 'creative',
    label: 'Creative',
    description: 'Each shot explores a different angle, setting, or mood for maximum variety',
    prompt_suffix: 'Explore creative and varied compositions, settings, and lighting styles.',
  },
];

const BG_PROMPTS = {
  auto: null,
  pure_white: 'Pure white seamless background',
  marble: 'Elegant marble surface background',
  wood: 'Warm natural wood surface',
  concrete: 'Industrial concrete texture background',
  dark: 'Dark matte black background',
  gradient: 'Smooth gradient background',
};

// Build a sample prompt for preview
function buildPreviewPrompt(settings, sampleShot, sampleProduct) {
  const parts = [];
  const vibe = settings.vibe ? VIBES[settings.vibe] : null;

  if (sampleShot?.description) parts.push(sampleShot.description);

  const bg =
    settings.background !== 'auto'
      ? BG_PROMPTS[settings.background]
      : vibe?.background_hint || sampleShot?.background;
  if (bg) parts.push(`Background: ${bg}`);

  const mood = vibe?.mood_hint || sampleShot?.mood;
  if (mood) parts.push(`Mood: ${mood}`);

  const lighting =
    settings.lighting !== 'auto'
      ? LIGHTING_PROMPTS[settings.lighting]
      : vibe?.lighting_hint;
  if (lighting) parts.push(`Lighting: ${lighting}`);

  if (vibe?.composition_hint) parts.push(`Composition: ${vibe.composition_hint}`);
  if (sampleShot?.focus) parts.push(`Focus: ${sampleShot.focus}`);
  if (sampleProduct?.title) parts.push(`Product: ${sampleProduct.title}`);

  return parts.filter(Boolean).join('. ') + '.';
}

export default function ShootConfigurator({
  settings,
  onSettingsChange,
  sampleShot,
  sampleProduct,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const update = (key, value) => {
    const next = { ...settings, [key]: value };
    // sync dimensions from aspect ratio
    if (key === 'aspect_ratio') {
      const ar = ASPECT_RATIOS.find((a) => a.key === value);
      if (ar) {
        next.width = ar.width;
        next.height = ar.height;
      }
    }
    onSettingsChange(next);
  };

  const vibeLabel = settings.vibe ? VIBES[settings.vibe]?.name : null;
  const arLabel = ASPECT_RATIOS.find((a) => a.key === settings.aspect_ratio)?.label || '1:1';

  const previewPrompt = useMemo(
    () => buildPreviewPrompt(settings, sampleShot, sampleProduct),
    [settings, sampleShot, sampleProduct],
  );

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl overflow-hidden">
      {/* Collapsed summary / toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Palette className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Shoot Style</p>
            <p className="text-xs text-zinc-500">
              {vibeLabel || 'No vibe'} &middot; {arLabel} &middot;{' '}
              {settings.lighting !== 'auto'
                ? LIGHTING.find((l) => l.key === settings.lighting)?.label
                : 'Auto lighting'}
              {' '}&middot; {settings.batch_size || 3} shots &middot;{' '}
              {VARIETY_MODES.find((m) => m.key === (settings.variety_mode || 'balanced'))?.label || 'Balanced'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-zinc-800/50 pt-4">
              {/* Vibe selector */}
              <div>
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">
                  Vibe
                </label>
                <VibeSelector
                  selectedVibe={settings.vibe}
                  onSelect={(v) => update('vibe', v)}
                />
              </div>

              {/* Background */}
              <div>
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">
                  Background
                </label>
                <div className="flex flex-wrap gap-2">
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.key}
                      onClick={() => update('background', bg.key)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        settings.background === bg.key
                          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                          : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:border-zinc-600'
                      }`}
                    >
                      {bg.color && (
                        <span
                          className="w-3 h-3 rounded-full border border-zinc-600/50 shrink-0"
                          style={{ backgroundColor: bg.color }}
                        />
                      )}
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lighting */}
              <div>
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">
                  Lighting
                </label>
                <div className="flex flex-wrap gap-2">
                  {LIGHTING.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => update('lighting', l.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        settings.lighting === l.key
                          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                          : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:border-zinc-600'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect ratio */}
              <div>
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">
                  Aspect Ratio
                </label>
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ar) => {
                    const Icon = ar.icon;
                    return (
                      <button
                        key={ar.key}
                        onClick={() => update('aspect_ratio', ar.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          settings.aspect_ratio === ar.key
                            ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                            : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:border-zinc-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {ar.label}
                        <span className="text-zinc-600 text-[10px]">
                          {ar.width}x{ar.height}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Batch size */}
              <div>
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">
                  Images per Product
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => update('batch_size', Math.max(1, (settings.batch_size || 3) - 1))}
                    className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {BATCH_SIZES.map((n) => (
                      <button
                        key={n}
                        onClick={() => update('batch_size', n)}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                          (settings.batch_size || 3) === n
                            ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                            : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:border-zinc-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => update('batch_size', Math.min(5, (settings.batch_size || 3) + 1))}
                    className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-zinc-500 ml-1">
                    shots each
                  </span>
                </div>
              </div>

              {/* Variety mode */}
              <div>
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">
                  Shot Variety
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {VARIETY_MODES.map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => update('variety_mode', mode.key)}
                      className={`text-left rounded-xl p-3 transition-all ${
                        (settings.variety_mode || 'balanced') === mode.key
                          ? 'bg-yellow-500/10 border border-yellow-500/30 ring-1 ring-yellow-500/20'
                          : 'bg-zinc-800/40 border border-zinc-700/30 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {mode.key === 'consistent' && <Layers className="w-3.5 h-3.5 text-zinc-400" />}
                        {mode.key === 'balanced' && <Sparkles className="w-3.5 h-3.5 text-zinc-400" />}
                        {mode.key === 'creative' && <Shuffle className="w-3.5 h-3.5 text-zinc-400" />}
                        <span className={`text-xs font-semibold ${
                          (settings.variety_mode || 'balanced') === mode.key ? 'text-yellow-300' : 'text-zinc-300'
                        }`}>
                          {mode.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-tight">
                        {mode.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt preview */}
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-300 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Prompt Preview
                  {showPreview ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-3"
                  >
                    <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                      {previewPrompt || 'Select a vibe or approve a shot plan to see a preview.'}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-2">
                      This is a sample of what the AI will receive for the first shot.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export helpers for edge function
export { LIGHTING_PROMPTS, BG_PROMPTS, BACKGROUNDS, LIGHTING, ASPECT_RATIOS, BATCH_SIZES, VARIETY_MODES };

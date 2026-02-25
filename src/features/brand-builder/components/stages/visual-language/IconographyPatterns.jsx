/**
 * Sub-step 3: Iconography & Patterns.
 * Shows algorithmically generated icon set, SVG patterns, and graphic devices.
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const ICON_STYLE_OPTIONS = ['outlined', 'filled', 'duotone'];

export default function IconographyPatterns({
  iconography,
  patterns,
  onChangeIconography,
  onChangePatterns,
  onRegenerateIcons,
  onRegeneratePatterns,
  isRegenerating,
}) {
  const [hiddenIcons, setHiddenIcons] = useState(new Set());

  const toggleIconVisibility = useCallback((idx) => {
    setHiddenIcons(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // When icons are hidden, filter them from iconography
  const updateIconVisibility = useCallback((idx) => {
    toggleIconVisibility(idx);
    // We don't remove them from data — just visually toggle.
    // The final save can filter hidden icons if needed.
  }, [toggleIconVisibility]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Iconography & Patterns</h2>
        <p className="text-sm text-zinc-400">
          Your icon set, pattern tiles, and graphic devices — all generated from your brand identity.
        </p>
      </div>

      {/* Iconography System */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Icon Set</h3>
          <button
            onClick={onRegenerateIcons}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate
          </button>
        </div>

        {/* Icon style toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Style:</span>
          <div className="flex gap-1">
            {ICON_STYLE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onChangeIconography({ ...iconography, style: s })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  iconography?.style === s
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                    : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06] hover:border-white/20'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Icon properties */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Stroke Weight</label>
            <Slider
              value={[iconography?.stroke_weight || 2]}
              onValueChange={([v]) => onChangeIconography({ ...iconography, stroke_weight: v })}
              min={0.5}
              max={4}
              step={0.5}
            />
            <span className="text-[10px] text-zinc-600 font-mono mt-0.5 block">{iconography?.stroke_weight || 2}px</span>
          </div>
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Grid Size</label>
            <div className="flex gap-1">
              {[24, 32].map((size) => (
                <button
                  key={size}
                  onClick={() => onChangeIconography({ ...iconography, grid_size: size })}
                  className={`px-3 py-1 rounded-lg text-xs ${
                    iconography?.grid_size === size
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-zinc-800/40 text-zinc-500 border border-white/[0.06]'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Corner Radius</label>
            <Slider
              value={[iconography?.corner_radius || 0]}
              onValueChange={([v]) => onChangeIconography({ ...iconography, corner_radius: v })}
              min={0}
              max={8}
              step={1}
            />
            <span className="text-[10px] text-zinc-600 font-mono mt-0.5 block">{iconography?.corner_radius || 0}px</span>
          </div>
        </div>

        {/* Color rules */}
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Color Rules</label>
          <textarea
            value={iconography?.color_rules || ''}
            onChange={(e) => onChangeIconography({ ...iconography, color_rules: e.target.value })}
            rows={2}
            className="w-full text-xs text-zinc-300 bg-transparent border border-white/[0.06] hover:border-white/15 focus:border-yellow-400/30 rounded-lg p-2 resize-none focus:outline-none"
          />
        </div>

        {/* Icon grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(iconography?.base_set || []).map((icon, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: hiddenIcons.has(idx) ? 0.3 : 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              className={`relative rounded-[16px] border p-3 text-center group ${
                hiddenIcons.has(idx)
                  ? 'bg-zinc-900/30 border-white/[0.04]'
                  : 'bg-white/[0.03] border-white/10'
              }`}
            >
              {/* Toggle visibility */}
              <button
                onClick={() => updateIconVisibility(idx)}
                className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 text-zinc-500 transition-all"
              >
                {hiddenIcons.has(idx) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>

              {/* SVG preview */}
              <div
                className="w-12 h-12 mx-auto mb-2"
                dangerouslySetInnerHTML={{ __html: (icon.svg || '').replace(/width="[^"]*"/, 'width="48"').replace(/height="[^"]*"/, 'height="48"') }}
              />
              <p className="text-[10px] text-zinc-400 truncate">{icon.name}</p>
              <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                {(icon.keywords || []).slice(0, 2).map((kw, ki) => (
                  <span key={ki} className="text-[8px] text-zinc-600 bg-zinc-800/60 px-1 py-0.5 rounded">
                    {kw}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pattern Tiles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Pattern Tiles</h3>
          <button
            onClick={onRegeneratePatterns}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(patterns?.patterns || []).map((pattern, idx) => (
            <PatternCard
              key={idx}
              pattern={pattern}
              index={idx}
              onChange={(updated) => {
                const ps = [...(patterns?.patterns || [])];
                ps[idx] = updated;
                onChangePatterns({ ...patterns, patterns: ps });
              }}
            />
          ))}
        </div>
      </section>

      {/* Graphic Devices */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Graphic Devices</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(patterns?.graphic_devices || []).map((device, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-[16px] bg-white/[0.03] border border-white/10 p-4"
            >
              {/* SVG preview */}
              <div
                className="w-full h-16 flex items-center justify-center mb-3 bg-zinc-900/40 rounded-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: device.svg || '' }}
              />
              <input
                value={device.name || ''}
                onChange={(e) => {
                  const ds = [...(patterns?.graphic_devices || [])];
                  ds[idx] = { ...ds[idx], name: e.target.value };
                  onChangePatterns({ ...patterns, graphic_devices: ds });
                }}
                className="text-xs font-semibold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-yellow-400/30 focus:outline-none w-full mb-1"
              />
              <textarea
                value={device.usage || ''}
                onChange={(e) => {
                  const ds = [...(patterns?.graphic_devices || [])];
                  ds[idx] = { ...ds[idx], usage: e.target.value };
                  onChangePatterns({ ...patterns, graphic_devices: ds });
                }}
                rows={2}
                className="w-full text-[10px] text-zinc-400 bg-transparent border border-transparent hover:border-white/[0.06] focus:border-white/15 rounded p-1 resize-none focus:outline-none"
              />
              <p className="text-[8px] text-zinc-600 mt-1">Derived from: {device.derived_from}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Pattern Card ────────────────────────────────────────────────────────

function PatternCard({ pattern, index, onChange }) {
  const [activeVariant, setActiveVariant] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-[20px] bg-white/[0.03] border border-white/10 p-5 space-y-3"
    >
      {/* Tile preview — repeating */}
      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/[0.06]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: pattern.svg_tile
              ? `url("data:image/svg+xml,${encodeURIComponent(pattern.svg_tile)}")`
              : 'none',
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
          }}
        />
      </div>

      {/* Name */}
      <input
        value={pattern.name || ''}
        onChange={(e) => onChange({ ...pattern, name: e.target.value })}
        className="text-sm font-semibold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-yellow-400/30 focus:outline-none w-full"
      />

      {/* Usage */}
      <textarea
        value={pattern.usage || ''}
        onChange={(e) => onChange({ ...pattern, usage: e.target.value })}
        rows={1}
        className="w-full text-xs text-zinc-400 bg-transparent border border-transparent hover:border-white/[0.06] focus:border-white/15 rounded p-1 resize-none focus:outline-none"
      />

      {/* Color variants */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-600">Variants:</span>
        {(pattern.color_variants || []).map((variant, vi) => (
          <button
            key={vi}
            onClick={() => setActiveVariant(vi)}
            className={`w-6 h-6 rounded-md border ${activeVariant === vi ? 'border-yellow-400/40' : 'border-white/10'}`}
            style={{ background: `linear-gradient(135deg, ${variant.foreground} 50%, ${variant.background} 50%)` }}
          />
        ))}
      </div>

      {/* Scale range */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-zinc-600">Scale:</span>
        <span className="text-[10px] text-zinc-500 font-mono">
          {pattern.scale_range?.min || 0.5}x — {pattern.scale_range?.max || 2}x
        </span>
      </div>
    </motion.div>
  );
}

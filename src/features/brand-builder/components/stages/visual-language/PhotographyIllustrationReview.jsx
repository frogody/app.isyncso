/**
 * Sub-step 2: Photography & Illustration Review.
 * Shows LLM-generated photography direction + illustration style. All editable.
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, Plus, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const ILLUSTRATION_OPTIONS = {
  style: ['flat', 'line-art', 'geometric', 'hand-drawn', '3d-isometric'],
  line_weight: ['thin', 'medium', 'bold'],
  corner_radius: ['sharp', 'slightly-rounded', 'rounded'],
  color_usage: ['monochrome', 'limited-palette', 'full-palette'],
  complexity: ['minimal', 'moderate', 'detailed'],
  stroke_style: ['solid', 'dashed', 'none'],
  fill_style: ['solid', 'gradient', 'pattern', 'none'],
};

export default function PhotographyIllustrationReview({
  photography,
  illustration,
  onChangePhotography,
  onChangeIllustration,
  onRegenerate,
  isRegenerating,
}) {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Visual Direction</h2>
        <p className="text-sm text-zinc-400">
          Review and edit your photography direction and illustration style.
        </p>
      </div>

      {/* Photography Direction */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Photography Direction</h3>
          <button
            onClick={() => onRegenerate('photography')}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate
          </button>
        </div>

        <div className="rounded-[20px] bg-white/[0.03] border border-white/10 p-6 space-y-5">
          {/* Text fields */}
          {['mood', 'lighting', 'composition', 'color_treatment', 'subjects'].map((field) => (
            <div key={field}>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">
                {field.replace(/_/g, ' ')}
              </label>
              <textarea
                value={photography?.[field] || ''}
                onChange={(e) => onChangePhotography({ ...photography, [field]: e.target.value })}
                rows={2}
                className="w-full text-sm text-zinc-300 bg-transparent border border-white/[0.06] hover:border-white/15 focus:border-yellow-400/30 rounded-lg p-2 resize-none focus:outline-none"
              />
            </div>
          ))}

          {/* On-brand descriptors */}
          <TagList
            label="On-Brand Descriptors"
            items={photography?.on_brand_descriptors || []}
            onChange={(items) => onChangePhotography({ ...photography, on_brand_descriptors: items })}
            color="green"
          />

          {/* Off-brand descriptors */}
          <TagList
            label="Off-Brand Descriptors"
            items={photography?.off_brand_descriptors || []}
            onChange={(items) => onChangePhotography({ ...photography, off_brand_descriptors: items })}
            color="red"
          />

          {/* Overlay rules */}
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-2">
              Overlay Rules
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photography?.overlay_rules?.allowed_overlays?.map((overlay, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-white/10 shrink-0"
                    style={{ backgroundColor: overlay.color, opacity: overlay.opacity }}
                  />
                  <div className="flex-1">
                    <span className="text-[10px] text-zinc-600">Opacity</span>
                    <Slider
                      value={[Math.round((overlay.opacity || 0.6) * 100)]}
                      onValueChange={([v]) => {
                        const overlays = [...(photography?.overlay_rules?.allowed_overlays || [])];
                        overlays[idx] = { ...overlays[idx], opacity: v / 100 };
                        onChangePhotography({
                          ...photography,
                          overlay_rules: { ...photography.overlay_rules, allowed_overlays: overlays },
                        });
                      }}
                      min={10}
                      max={90}
                      step={5}
                    />
                  </div>
                </div>
              ))}
              <div>
                <span className="text-[10px] text-zinc-600 block mb-1">Text on Photo</span>
                <input
                  value={photography?.overlay_rules?.text_on_photo?.treatment || ''}
                  onChange={(e) => onChangePhotography({
                    ...photography,
                    overlay_rules: {
                      ...photography?.overlay_rules,
                      text_on_photo: { ...photography?.overlay_rules?.text_on_photo, treatment: e.target.value },
                    },
                  })}
                  className="w-full text-xs text-zinc-300 bg-transparent border border-white/[0.06] hover:border-white/15 focus:border-yellow-400/30 rounded-lg px-2 py-1.5 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Illustration Style */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Illustration Style</h3>
          <button
            onClick={() => onRegenerate('illustration')}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
          >
            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate
          </button>
        </div>

        <div className="rounded-[20px] bg-white/[0.03] border border-white/10 p-6 space-y-5">
          {/* Select fields */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {['style', 'line_weight', 'corner_radius', 'color_usage', 'complexity'].map((field) => (
              <div key={field}>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">
                  {field.replace(/_/g, ' ')}
                </label>
                <select
                  value={illustration?.[field] || ''}
                  onChange={(e) => onChangeIllustration({ ...illustration, [field]: e.target.value })}
                  className="w-full text-xs text-zinc-300 bg-zinc-900 border border-white/[0.06] rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400/30"
                >
                  {(ILLUSTRATION_OPTIONS[field] || []).map((opt) => (
                    <option key={opt} value={opt}>{opt.replace(/-/g, ' ')}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Geometric properties */}
          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-2">
              Geometric Properties
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TagList
                label="Primary Shapes"
                items={illustration?.geometric_properties?.primary_shapes || []}
                onChange={(items) => onChangeIllustration({
                  ...illustration,
                  geometric_properties: { ...illustration?.geometric_properties, primary_shapes: items },
                })}
                color="blue"
                compact
              />
              <div>
                <span className="text-[10px] text-zinc-600 block mb-1">Stroke Style</span>
                <select
                  value={illustration?.geometric_properties?.stroke_style || 'solid'}
                  onChange={(e) => onChangeIllustration({
                    ...illustration,
                    geometric_properties: { ...illustration?.geometric_properties, stroke_style: e.target.value },
                  })}
                  className="w-full text-xs text-zinc-300 bg-zinc-900 border border-white/[0.06] rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400/30"
                >
                  {ILLUSTRATION_OPTIONS.stroke_style.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[10px] text-zinc-600 block mb-1">Fill Style</span>
                <select
                  value={illustration?.geometric_properties?.fill_style || 'solid'}
                  onChange={(e) => onChangeIllustration({
                    ...illustration,
                    geometric_properties: { ...illustration?.geometric_properties, fill_style: e.target.value },
                  })}
                  className="w-full text-xs text-zinc-300 bg-zinc-900 border border-white/[0.06] rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400/30"
                >
                  {ILLUSTRATION_OPTIONS.fill_style.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Tag List Component ──────────────────────────────────────────────────

function TagList({ label, items, onChange, color = 'green', compact = false }) {
  const [newItem, setNewItem] = useState('');

  const colorClasses = {
    green: { bg: 'bg-green-400/10', border: 'border-green-400/20', text: 'text-green-400' },
    red: { bg: 'bg-red-400/10', border: 'border-red-400/20', text: 'text-red-400' },
    blue: { bg: 'bg-blue-400/10', border: 'border-blue-400/20', text: 'text-blue-400' },
  };
  const c = colorClasses[color] || colorClasses.green;

  const addItem = useCallback(() => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem('');
  }, [newItem, items, onChange]);

  const removeItem = useCallback((idx) => {
    onChange(items.filter((_, i) => i !== idx));
  }, [items, onChange]);

  return (
    <div>
      {!compact && (
        <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-2">{label}</label>
      )}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, idx) => (
          <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${c.bg} ${c.border} border ${c.text}`}>
            {item}
            <button onClick={() => removeItem(idx)} className="hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Add..."
          className="flex-1 text-xs text-zinc-300 bg-transparent border border-white/[0.06] rounded-lg px-2 py-1 focus:outline-none focus:border-white/20"
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="p-1 rounded-lg bg-white/[0.05] border border-white/[0.06] text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

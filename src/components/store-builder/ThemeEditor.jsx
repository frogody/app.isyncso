import React from 'react';
import { Sun, Moon, Paintbrush, Type, Maximize, MousePointerClick, LayoutGrid, Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const labelClasses = 'block text-xs font-medium text-zinc-400 mb-1';
const inputClasses =
  'bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none w-full transition-colors';

function SectionHeading({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-cyan-400" />
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{label}</h3>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-zinc-800/60" />;
}

function ColorPickerRow({ label, value, onChange }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5 shrink-0"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className={inputClasses}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <select
        className={`${inputClasses} appearance-none cursor-pointer`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => {
          const v = typeof opt === 'string' ? opt : opt.value;
          const l = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={v} value={v}>{l}</option>
          );
        })}
      </select>
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-cyan-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  );
}

function SliderRow({ label, value, onChange, min = 0, max = 24, unit = 'px' }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={labelClasses}>{label}</label>
        <span className="text-xs text-zinc-500">{value ?? min}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-cyan-500 cursor-pointer"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset color swatches
// ---------------------------------------------------------------------------

const COLOR_PRESETS = [
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Purple', value: '#8b5cf6' },
];

function ColorPresets({ currentValue, onChange }) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      {COLOR_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          title={preset.label}
          onClick={() => onChange(preset.value)}
          className={`w-6 h-6 rounded-full border-2 transition-all ${
            currentValue === preset.value
              ? 'border-white scale-110'
              : 'border-zinc-700 hover:border-zinc-500'
          }`}
          style={{ backgroundColor: preset.value }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Font options
// ---------------------------------------------------------------------------

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Poppins', label: 'Poppins' },
];

const BUTTON_STYLES = [
  { value: 'filled', label: 'Filled' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'pill', label: 'Pill' },
];

const CARD_STYLES = [
  { value: 'flat', label: 'Flat' },
  { value: 'raised', label: 'Raised' },
  { value: 'bordered', label: 'Bordered' },
  { value: 'glass', label: 'Glass' },
];

const SPACING_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'spacious', label: 'Spacious' },
];

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function ThemeEditor({ theme, onUpdate }) {
  const t = theme || {};

  function update(key, value) {
    onUpdate({ [key]: value });
  }

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Mode toggle */}
      <div>
        <SectionHeading icon={Paintbrush} label="Mode" />
        <div className="flex gap-2">
          {['dark', 'light'].map((mode) => {
            const active = t.mode === mode;
            const Icon = mode === 'dark' ? Moon : Sun;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => update('mode', mode)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* Primary color */}
      <div>
        <SectionHeading icon={Paintbrush} label="Colors" />
        <div className="space-y-3">
          <ColorPickerRow label="Primary Color" value={t.primaryColor} onChange={(v) => update('primaryColor', v)} />
          <ColorPresets currentValue={t.primaryColor} onChange={(v) => update('primaryColor', v)} />
          <ColorPickerRow label="Background Color" value={t.backgroundColor} onChange={(v) => update('backgroundColor', v)} />
          <ColorPickerRow label="Surface Color" value={t.surfaceColor} onChange={(v) => update('surfaceColor', v)} />
          <ColorPickerRow label="Text Color" value={t.textColor} onChange={(v) => update('textColor', v)} />
          <ColorPickerRow label="Muted Text Color" value={t.mutedTextColor} onChange={(v) => update('mutedTextColor', v)} />
        </div>
      </div>

      <Divider />

      {/* Typography */}
      <div>
        <SectionHeading icon={Type} label="Typography" />
        <div className="space-y-3">
          <SelectRow label="Font Family" value={t.fontFamily} onChange={(v) => update('fontFamily', v)} options={FONT_OPTIONS} />
          <SelectRow label="Heading Font" value={t.headingFontFamily} onChange={(v) => update('headingFontFamily', v)} options={FONT_OPTIONS} />
        </div>
      </div>

      <Divider />

      {/* Appearance */}
      <div>
        <SectionHeading icon={Maximize} label="Appearance" />
        <div className="space-y-3">
          <SliderRow label="Border Radius" value={t.borderRadius} onChange={(v) => update('borderRadius', v)} min={0} max={24} />
          <SelectRow label="Button Style" value={t.buttonStyle} onChange={(v) => update('buttonStyle', v)} options={BUTTON_STYLES} />
          <SelectRow label="Card Style" value={t.cardStyle} onChange={(v) => update('cardStyle', v)} options={CARD_STYLES} />
          <SelectRow label="Spacing" value={t.spacing} onChange={(v) => update('spacing', v)} options={SPACING_OPTIONS} />
        </div>
      </div>

      <Divider />

      {/* Animations */}
      <div>
        <SectionHeading icon={Sparkles} label="Behavior" />
        <ToggleSwitch
          label="Animations"
          checked={t.animations !== false}
          onChange={(v) => update('animations', v)}
        />
      </div>
    </div>
  );
}

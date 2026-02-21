import React from 'react';
import { Info, Tag, AlertTriangle, Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const labelClasses = 'block text-xs font-medium text-zinc-400 mb-1';
const inputClasses =
  'bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none w-full transition-colors';

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <input
        type="text"
        className={inputClasses}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectInput({ label, value, onChange, options }) {
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
          return <option key={v} value={v}>{l}</option>;
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

// ---------------------------------------------------------------------------
// Icon selector
// ---------------------------------------------------------------------------

const ICON_OPTIONS = [
  { value: 'info', label: 'Info', Icon: Info },
  { value: 'tag', label: 'Tag / Promo', Icon: Tag },
  { value: 'warning', label: 'Warning', Icon: AlertTriangle },
  { value: 'sparkles', label: 'Sparkles', Icon: Sparkles },
];

function IconSelector({ value, onChange }) {
  return (
    <div>
      <label className={labelClasses}>Icon</label>
      <div className="flex gap-2">
        {ICON_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={() => onChange(opt.value)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <opt.Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function BannerEditor({ section, onUpdate }) {
  const p = section?.props || {};

  function update(key, value) {
    onUpdate({ ...p, [key]: value });
  }

  return (
    <div className="space-y-4 p-4">
      <TextInput
        label="Text"
        value={p.text}
        onChange={(v) => update('text', v)}
        placeholder="Free shipping on orders over $100!"
      />
      <TextInput
        label="Link URL"
        value={p.link}
        onChange={(v) => update('link', v)}
        placeholder="https://..."
      />
      <IconSelector
        value={p.icon}
        onChange={(v) => update('icon', v)}
      />
      <SelectInput
        label="Style"
        value={p.style ?? 'info'}
        onChange={(v) => update('style', v)}
        options={[
          { value: 'info', label: 'Info' },
          { value: 'promo', label: 'Promo' },
          { value: 'warning', label: 'Warning' },
          { value: 'accent', label: 'Accent' },
        ]}
      />
      <ToggleSwitch
        label="Dismissible"
        checked={!!p.dismissible}
        onChange={(v) => update('dismissible', v)}
      />
    </div>
  );
}

import React from 'react';

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

function TextArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <textarea
        className={`${inputClasses} resize-none`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
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

function SliderRow({ label, value, onChange, min = 0, max = 100, unit = '%' }) {
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
// Main export
// ---------------------------------------------------------------------------

export default function HeroEditor({ section, onUpdate }) {
  const p = section?.props || {};

  function update(key, value) {
    onUpdate({ ...p, [key]: value });
  }

  return (
    <div className="space-y-4 p-4">
      <TextInput
        label="Headline"
        value={p.headline}
        onChange={(v) => update('headline', v)}
        placeholder="Your bold headline here"
      />
      <TextArea
        label="Subheadline"
        value={p.subheadline}
        onChange={(v) => update('subheadline', v)}
        rows={2}
        placeholder="Supporting text below the headline"
      />
      <TextInput
        label="CTA Button Text"
        value={p.ctaText}
        onChange={(v) => update('ctaText', v)}
        placeholder="Get Started"
      />
      <TextInput
        label="CTA Button URL"
        value={p.ctaLink}
        onChange={(v) => update('ctaLink', v)}
        placeholder="/products"
      />
      <SelectInput
        label="Alignment"
        value={p.alignment}
        onChange={(v) => update('alignment', v)}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
      />
      <SelectInput
        label="Size"
        value={p.size}
        onChange={(v) => update('size', v)}
        options={[
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ]}
      />
      <TextInput
        label="Background Image URL"
        value={p.backgroundImage}
        onChange={(v) => update('backgroundImage', v)}
        placeholder="https://images.unsplash.com/..."
      />
      <SliderRow
        label="Overlay Opacity"
        value={p.overlayOpacity != null ? Math.round(p.overlayOpacity) : 50}
        onChange={(v) => update('overlayOpacity', v)}
        min={0}
        max={100}
        unit="%"
      />
    </div>
  );
}

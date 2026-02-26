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

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CTAEditor({ section, onUpdate }) {
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
        placeholder="Ready to get started?"
      />
      <TextInput
        label="Subheadline"
        value={p.subheadline}
        onChange={(v) => update('subheadline', v)}
        placeholder="Join thousands of businesses already using our platform."
      />
      <TextInput
        label="CTA Button Text"
        value={p.ctaText}
        onChange={(v) => update('ctaText', v)}
        placeholder="Start Free Trial"
      />
      <TextInput
        label="CTA Button URL"
        value={p.ctaLink}
        onChange={(v) => update('ctaLink', v)}
        placeholder="/register"
      />
      <SelectInput
        label="Style"
        value={p.style ?? 'banner'}
        onChange={(v) => update('style', v)}
        options={[
          { value: 'banner', label: 'Banner' },
          { value: 'card', label: 'Card' },
          { value: 'minimal', label: 'Minimal' },
        ]}
      />
    </div>
  );
}

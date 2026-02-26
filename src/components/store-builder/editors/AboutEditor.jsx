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

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function AboutEditor({ section, onUpdate }) {
  const p = section?.props || {};

  function update(key, value) {
    onUpdate({ ...p, [key]: value });
  }

  return (
    <div className="space-y-4 p-4">
      <TextInput
        label="Title"
        value={p.title}
        onChange={(v) => update('title', v)}
        placeholder="About Us"
      />
      <TextArea
        label="Body"
        value={p.body}
        onChange={(v) => update('body', v)}
        rows={6}
        placeholder="Tell your company story... (supports markdown)"
      />
      <TextInput
        label="Image URL"
        value={p.image}
        onChange={(v) => update('image', v)}
        placeholder="https://images.unsplash.com/..."
      />
      <SelectInput
        label="Image Position"
        value={p.imagePosition ?? 'right'}
        onChange={(v) => update('imagePosition', v)}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ]}
      />
      <TextInput
        label="CTA Button Text"
        value={p.ctaText}
        onChange={(v) => update('ctaText', v)}
        placeholder="Learn More"
      />
      <TextInput
        label="CTA Button URL"
        value={p.ctaLink}
        onChange={(v) => update('ctaLink', v)}
        placeholder="/about"
      />
    </div>
  );
}

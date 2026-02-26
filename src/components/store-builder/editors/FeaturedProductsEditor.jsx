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

function NumberInput({ label, value, onChange, min, max }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <input
        type="number"
        className={inputClasses}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        min={min}
        max={max}
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
// Main export
// ---------------------------------------------------------------------------

export default function FeaturedProductsEditor({ section, onUpdate }) {
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
        placeholder="Featured Products"
      />
      <NumberInput
        label="Max Products"
        value={p.maxProducts}
        onChange={(v) => update('maxProducts', v)}
        min={4}
        max={12}
      />
      <SelectInput
        label="Columns"
        value={String(p.columns ?? 4)}
        onChange={(v) => update('columns', Number(v))}
        options={[
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ]}
      />
      <ToggleSwitch
        label="Show Pricing"
        checked={p.showPricing !== false}
        onChange={(v) => update('showPricing', v)}
      />
      <ToggleSwitch
        label='Show "Add to Cart" Button'
        checked={p.showAddToCart !== false}
        onChange={(v) => update('showAddToCart', v)}
      />
      <SelectInput
        label="Selection Mode"
        value={p.selectionMode ?? 'auto'}
        onChange={(v) => update('selectionMode', v)}
        options={[
          { value: 'auto', label: 'Auto (latest/popular)' },
          { value: 'manual', label: 'Manual Selection' },
        ]}
      />
    </div>
  );
}

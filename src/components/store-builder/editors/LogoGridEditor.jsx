import React, { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

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
// Logo item card
// ---------------------------------------------------------------------------

function LogoItemCard({ item, index, onChange, onRemove }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-zinc-500">#{index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <TextInput
        label="Image URL"
        value={item.url}
        onChange={(v) => onChange(index, 'url', v)}
        placeholder="https://example.com/logo.svg"
      />
      <TextInput
        label="Alt Text"
        value={item.alt}
        onChange={(v) => onChange(index, 'alt', v)}
        placeholder="Company Name"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function LogoGridEditor({ section, onUpdate }) {
  const p = section?.props || {};
  const logos = Array.isArray(p.logos) ? p.logos : [];

  function update(key, value) {
    onUpdate({ ...p, [key]: value });
  }

  const handleLogoChange = useCallback(
    (index, field, value) => {
      const next = logos.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      update('logos', next);
    },
    [logos, p],
  );

  const handleRemoveLogo = useCallback(
    (index) => {
      update('logos', logos.filter((_, i) => i !== index));
    },
    [logos, p],
  );

  const handleAddLogo = useCallback(() => {
    update('logos', [...logos, { url: '', alt: '' }]);
  }, [logos, p]);

  return (
    <div className="space-y-4 p-4">
      <TextInput
        label="Title"
        value={p.title}
        onChange={(v) => update('title', v)}
        placeholder="Trusted By"
      />
      <SelectInput
        label="Style"
        value={p.style ?? 'grid'}
        onChange={(v) => update('style', v)}
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
        ]}
      />
      <ToggleSwitch
        label="Grayscale"
        checked={!!p.grayscale}
        onChange={(v) => update('grayscale', v)}
      />

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Logo items */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">Logos</h4>
        <div className="space-y-2">
          {logos.map((item, index) => (
            <LogoItemCard
              key={index}
              item={item}
              index={index}
              onChange={handleLogoChange}
              onRemove={handleRemoveLogo}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddLogo}
          className="mt-3 flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors w-full justify-center py-2 border border-dashed border-zinc-800 rounded-lg hover:border-cyan-500/40"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Logo
        </button>
      </div>
    </div>
  );
}

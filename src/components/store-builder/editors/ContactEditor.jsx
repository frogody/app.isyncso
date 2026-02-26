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

function ToggleSwitch({ label, checked, onChange, description }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="text-sm text-zinc-300">{label}</span>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-0.5 ${
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

export default function ContactEditor({ section, onUpdate }) {
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
        placeholder="Get in Touch"
      />
      <TextInput
        label="Email"
        value={p.email}
        onChange={(v) => update('email', v)}
        placeholder="sales@example.com"
      />
      <TextInput
        label="Phone"
        value={p.phone}
        onChange={(v) => update('phone', v)}
        placeholder="+1 (555) 000-0000"
      />
      <TextArea
        label="Address"
        value={p.address}
        onChange={(v) => update('address', v)}
        rows={2}
        placeholder="123 Business St, Suite 100&#10;Amsterdam, Netherlands"
      />

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      <ToggleSwitch
        label="Show Contact Form"
        checked={p.showForm !== false}
        onChange={(v) => update('showForm', v)}
        description="Display an embedded contact form"
      />
      <ToggleSwitch
        label="Show Map"
        checked={!!p.showMap}
        onChange={(v) => update('showMap', v)}
        description="Display a location map embed"
      />
    </div>
  );
}

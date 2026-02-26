import React from 'react';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const labelClasses = 'block text-xs font-medium text-zinc-400 mb-1';
const inputClasses =
  'bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none w-full transition-colors';

function TextArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <textarea
        className={`${inputClasses} resize-none font-mono text-xs leading-relaxed`}
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

export default function RichTextEditor({ section, onUpdate }) {
  const p = section?.props || {};

  function update(key, value) {
    onUpdate({ ...p, [key]: value });
  }

  return (
    <div className="space-y-4 p-4">
      <TextArea
        label="Content"
        value={p.content}
        onChange={(v) => update('content', v)}
        rows={12}
        placeholder="Enter your content here... Supports markdown and HTML."
      />
      <SelectInput
        label="Max Width"
        value={p.maxWidth ?? '800'}
        onChange={(v) => update('maxWidth', v)}
        options={[
          { value: '600', label: 'Narrow (600px)' },
          { value: '800', label: 'Medium (800px)' },
          { value: '1000', label: 'Wide (1000px)' },
          { value: 'full', label: 'Full Width' },
        ]}
      />
      <p className="text-xs text-zinc-500 leading-relaxed">
        Tip: You can use markdown syntax for headings, bold, italic, lists, and links.
        HTML tags are also supported for advanced formatting.
      </p>
    </div>
  );
}

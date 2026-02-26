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

// ---------------------------------------------------------------------------
// Stat item card
// ---------------------------------------------------------------------------

function StatItemCard({ item, index, onChange, onRemove }) {
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
        label="Value"
        value={item.value}
        onChange={(v) => onChange(index, 'value', v)}
        placeholder="99%"
      />
      <TextInput
        label="Label"
        value={item.label}
        onChange={(v) => onChange(index, 'label', v)}
        placeholder="Customer Satisfaction"
      />
      <TextInput
        label="Icon (optional)"
        value={item.icon}
        onChange={(v) => onChange(index, 'icon', v)}
        placeholder="e.g. zap, shield, users"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function StatsEditor({ section, onUpdate }) {
  const p = section?.props || {};
  const items = Array.isArray(p.items) ? p.items : [];

  function update(key, value) {
    onUpdate({ ...p, [key]: value });
  }

  const handleItemChange = useCallback(
    (index, field, value) => {
      const next = items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      update('items', next);
    },
    [items, p],
  );

  const handleRemoveItem = useCallback(
    (index) => {
      update('items', items.filter((_, i) => i !== index));
    },
    [items, p],
  );

  const handleAddItem = useCallback(() => {
    update('items', [...items, { value: '', label: '', icon: '' }]);
  }, [items, p]);

  return (
    <div className="space-y-4 p-4">
      <TextInput
        label="Title"
        value={p.title}
        onChange={(v) => update('title', v)}
        placeholder="Our Numbers"
      />
      <SelectInput
        label="Style"
        value={p.style ?? 'cards'}
        onChange={(v) => update('style', v)}
        options={[
          { value: 'cards', label: 'Cards' },
          { value: 'inline', label: 'Inline' },
          { value: 'large', label: 'Large' },
        ]}
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

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Stat items */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">Statistics</h4>
        <div className="space-y-2">
          {items.map((item, index) => (
            <StatItemCard
              key={index}
              item={item}
              index={index}
              onChange={handleItemChange}
              onRemove={handleRemoveItem}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="mt-3 flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors w-full justify-center py-2 border border-dashed border-zinc-800 rounded-lg hover:border-cyan-500/40"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Stat
        </button>
      </div>
    </div>
  );
}

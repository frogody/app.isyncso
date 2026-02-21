import React, { useCallback } from 'react';
import { Navigation, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const labelClasses = 'block text-xs font-medium text-zinc-400 mb-1';
const inputClasses =
  'bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none w-full transition-colors';

function SectionHeading({ label }) {
  return (
    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">{label}</h3>
  );
}

function Divider() {
  return <div className="border-t border-zinc-800/60" />;
}

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
// Nav item row
// ---------------------------------------------------------------------------

function NavItemRow({ item, index, total, onChange, onRemove, onMoveUp, onMoveDown }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-xs font-medium text-zinc-500">Item {index + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMoveUp(index)}
            className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMoveDown(index)}
            className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <input
        type="text"
        className={inputClasses}
        value={item.label ?? ''}
        onChange={(e) => onChange(index, 'label', e.target.value)}
        placeholder="Label"
      />
      <input
        type="text"
        className={inputClasses}
        value={item.href ?? ''}
        onChange={(e) => onChange(index, 'href', e.target.value)}
        placeholder="/page-url"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function NavigationEditor({ navigation, onUpdate }) {
  const nav = navigation || {};
  const items = Array.isArray(nav.items) ? nav.items : [];

  const update = useCallback(
    (key, value) => onUpdate({ [key]: value }),
    [onUpdate],
  );

  const handleItemChange = useCallback(
    (index, field, value) => {
      const next = items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      update('items', next);
    },
    [items, update],
  );

  const handleRemoveItem = useCallback(
    (index) => {
      update('items', items.filter((_, i) => i !== index));
    },
    [items, update],
  );

  const handleAddItem = useCallback(() => {
    update('items', [...items, { label: '', href: '/' }]);
  }, [items, update]);

  const handleMoveUp = useCallback(
    (index) => {
      if (index === 0) return;
      const next = [...items];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      update('items', next);
    },
    [items, update],
  );

  const handleMoveDown = useCallback(
    (index) => {
      if (index >= items.length - 1) return;
      const next = [...items];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      update('items', next);
    },
    [items, update],
  );

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Style */}
      <div>
        <SectionHeading label="Navigation Style" />
        <SelectInput
          label="Style"
          value={nav.style}
          onChange={(v) => update('style', v)}
          options={[
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'sidebar', label: 'Sidebar' },
            { value: 'minimal', label: 'Minimal' },
          ]}
        />
      </div>

      {/* Logo */}
      <TextInput
        label="Logo URL"
        value={nav.logoUrl}
        onChange={(v) => update('logoUrl', v)}
        placeholder="https://example.com/logo.svg"
      />

      {/* Toggles */}
      <div className="space-y-3">
        <ToggleSwitch label="Sticky Navigation" checked={nav.sticky !== false} onChange={(v) => update('sticky', v)} />
        <ToggleSwitch label="Transparent Background" checked={!!nav.transparent} onChange={(v) => update('transparent', v)} />
      </div>

      <Divider />

      {/* Nav items */}
      <div>
        <SectionHeading label="Navigation Items" />
        <div className="space-y-2">
          {items.map((item, index) => (
            <NavItemRow
              key={index}
              item={item}
              index={index}
              total={items.length}
              onChange={handleItemChange}
              onRemove={handleRemoveItem}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="mt-3 flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors w-full justify-center py-2 border border-dashed border-zinc-800 rounded-lg hover:border-cyan-500/40"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Nav Item
        </button>
      </div>
    </div>
  );
}

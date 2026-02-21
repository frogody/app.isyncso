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
// FAQ item card
// ---------------------------------------------------------------------------

function FAQItemCard({ item, index, onChange, onRemove }) {
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
        label="Question"
        value={item.question}
        onChange={(v) => onChange(index, 'question', v)}
        placeholder="How does it work?"
      />
      <TextArea
        label="Answer"
        value={item.answer}
        onChange={(v) => onChange(index, 'answer', v)}
        rows={3}
        placeholder="Explain the answer here..."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function FAQEditor({ section, onUpdate }) {
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
    update('items', [...items, { question: '', answer: '' }]);
  }, [items, p]);

  return (
    <div className="space-y-4 p-4">
      <TextInput
        label="Title"
        value={p.title}
        onChange={(v) => update('title', v)}
        placeholder="Frequently Asked Questions"
      />
      <SelectInput
        label="Style"
        value={p.style ?? 'accordion'}
        onChange={(v) => update('style', v)}
        options={[
          { value: 'accordion', label: 'Accordion' },
          { value: 'two_column', label: 'Two Column' },
          { value: 'cards', label: 'Cards' },
        ]}
      />

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* FAQ items */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">Questions</h4>
        <div className="space-y-2">
          {items.map((item, index) => (
            <FAQItemCard
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
          Add FAQ
        </button>
      </div>
    </div>
  );
}
